#!/usr/bin/env python3
"""Synthetic tests. PostgreSQL only listens on loopback, with fixture data in /dev/shm."""

import base64
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("backup", Path(__file__).with_name("postgres-backup.py"))
backup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backup)

BINDIR = Path(os.environ.get("TEST_PG_BIN", "/usr/lib/postgresql/16/bin"))
# An extracted distro package can be used in an unprivileged test workspace.
backup.BIN_ENV["PATH"] = os.environ.get("TEST_TOOL_PATH", os.defpath)

ROLES = """
CREATE ROLE ca_backup_reader LOGIN BYPASSRLS;
GRANT pg_read_all_data TO ca_backup_reader;
CREATE ROLE ca_tenant_a NOLOGIN;
CREATE ROLE ca_tenant_b NOLOGIN;
CREATE ROLE ca_outsider NOLOGIN;
"""

FIXTURE = """
CREATE TABLE public.notes (tenant name PRIMARY KEY, rev int NOT NULL CHECK (rev >= 0));
INSERT INTO public.notes VALUES ('ca_tenant_a', 3), ('ca_tenant_b', 7);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_only ON public.notes USING (tenant = current_user);
REVOKE ALL ON public.notes FROM PUBLIC;
GRANT SELECT, UPDATE (rev) ON public.notes TO ca_tenant_a, ca_tenant_b;
"""

VALIDATE = """
DO $test$ BEGIN
  IF (SELECT array_agg(rev ORDER BY tenant) FROM public.notes) <> ARRAY[3,7]
     OR (SELECT count(*) FROM public.notes) <> 2
     OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.notes'::regclass)
     OR (SELECT tableowner FROM pg_tables WHERE schemaname='public' AND tablename='notes') <> current_user
     OR has_table_privilege('ca_outsider', 'public.notes', 'SELECT') THEN
    RAISE EXCEPTION 'schema, ACL, owner or data mismatch';
  END IF;
END $test$;
SET ROLE ca_outsider;
DO $test$ BEGIN
  BEGIN
    PERFORM * FROM public.notes;
    RAISE EXCEPTION 'unauthorized access succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $test$;
RESET ROLE;
SET ROLE ca_tenant_a;
DO $test$ BEGIN
  IF (SELECT count(*) FROM public.notes) <> 1 OR
     EXISTS (SELECT 1 FROM public.notes WHERE tenant = 'ca_tenant_b') THEN
    RAISE EXCEPTION 'tenant read isolation failed';
  END IF;
  UPDATE public.notes SET rev = rev + 1 WHERE tenant = 'ca_tenant_b' AND rev = 7;
  IF FOUND THEN RAISE EXCEPTION 'cross-tenant CAS succeeded'; END IF;
  UPDATE public.notes SET rev = rev + 1 WHERE tenant = 'ca_tenant_a' AND rev = 3;
  IF NOT FOUND THEN RAISE EXCEPTION 'CAS failed'; END IF;
  UPDATE public.notes SET rev = rev + 1 WHERE tenant = 'ca_tenant_a' AND rev = 3;
  IF FOUND THEN RAISE EXCEPTION 'stale CAS succeeded'; END IF;
END $test$;
"""


class BackupTests(unittest.TestCase):
    def test_postgres_roundtrip_and_rejections(self):
        os.umask(0o077)
        with tempfile.TemporaryDirectory(prefix="ca-fixture-", dir="/dev/shm") as temp:
            root = Path(temp)
            env, password_file = backup.local_cluster(root)
            data = root / "source"
            self.pg("initdb", "--auth-local=reject", "--auth-host=scram-sha-256",
                    "--pwfile", str(password_file), "--encoding=UTF8", "--no-sync", "-D", str(data))
            try:
                self.pg("pg_ctl", "-D", str(data), "-l", str(root / "source.log"), "-w", "start",
                        "-o", backup.start_options(env))
                self.pg("psql", "-Xw", "-v", "ON_ERROR_STOP=1", "-c", ROLES + FIXTURE, env=env)
                self.pg("psql", "-Xw", "-v", "ON_ERROR_STOP=1", "-c",
                        "ALTER ROLE ca_backup_reader PASSWORD 'synthetic-only'", env=env)
                with Path(env["PGPASSFILE"]).open("a") as pgpass:
                    pgpass.write(f"127.0.0.1:{env['PGPORT']}:*:ca_backup_reader:synthetic-only\n")
                with self.assertRaisesRegex(backup.BackupError, "DATABASE_QUERY_FAILED"):
                    backup.db_query(BINDIR, {**env, "PGPASSFILE": str(root / "missing")},
                                    "SELECT 1")
                reader = {**env, "PGUSER": "ca_backup_reader",
                          "PGOPTIONS": "-c default_transaction_read_only=on"}
                identity = root / "identity"
                wrong = root / "wrong"
                for path in (identity, wrong):
                    backup.command(["age-keygen", "-o", str(path)], "KEYGEN_FAILED")
                recipient = backup.command(["age-keygen", "-y", str(identity)], "KEYGEN_FAILED",
                                           capture=True)
                encrypted = root / "backup.dump.age"
                start = time.monotonic()
                manifest = backup.create_archive(BINDIR, reader, recipient, encrypted, 16 * 1024**2)
                self.assertEqual(manifest["encryption"], backup.ENCRYPTION)
                self.assertEqual(manifest["sha256"], backup.digest(encrypted).hexdigest())
                self.assertEqual(manifest["ciphertext_bytes"], encrypted.stat().st_size)
                with self.assertRaisesRegex(backup.BackupError, "BACKUP_ROLE_UNSAFE"):
                    backup.create_archive(BINDIR, env, recipient, root / "denied", 4096)

                # A valid age envelope from pg_dump that exits nonzero must never be published.
                self.pg("psql", "-Xw", "-v", "ON_ERROR_STOP=1", "-c",
                        "ALTER ROLE ca_backup_reader NOBYPASSRLS", env=env)
                with self.assertRaisesRegex(backup.BackupError, "DUMP_FAILED"):
                    backup.create_archive(BINDIR, reader, recipient, root / "failed.age", 4096)
                bootstrap = root / "bootstrap.sql"
                verify = root / "verify.sql"
                bootstrap.write_text(ROLES)
                verify.write_text(VALIDATE)

                def drill(archive, key, sha):
                    with tempfile.TemporaryDirectory(prefix="drill-", dir=root) as work:
                        backup.restore(BINDIR, Path(work), archive, key, sha,
                                       manifest["postgres_version_num"], bootstrap, verify)

                restore_start = time.monotonic()
                drill(encrypted, identity, manifest["sha256"])
                print(json.dumps({
                    **manifest, "environment": "synthetic-local-loopback",
                    "restore_validation_seconds": round(time.monotonic() - restore_start, 3),
                    "backup_and_restore_seconds": round(time.monotonic() - start, 3),
                }, sort_keys=True), flush=True)

                with self.assertRaisesRegex(backup.BackupError, "DECRYPTION_FAILED"):
                    drill(encrypted, wrong, manifest["sha256"])
                damaged = root / "damaged"
                data_bytes = encrypted.read_bytes()
                damaged.write_bytes(data_bytes[:-1] + bytes([data_bytes[-1] ^ 1]))
                with self.assertRaisesRegex(backup.BackupError, "CIPHERTEXT_CHECKSUM_MISMATCH"):
                    drill(damaged, identity, manifest["sha256"])
                with self.assertRaisesRegex(backup.BackupError, "DECRYPTION_FAILED"):
                    drill(damaged, identity, backup.digest(damaged).hexdigest())
                damaged.write_bytes(data_bytes[:-17])
                with self.assertRaisesRegex(backup.BackupError, "DECRYPTION_FAILED"):
                    drill(damaged, identity, backup.digest(damaged).hexdigest())

                garbage = root / "garbage"
                subprocess.run(["age", "-r", recipient, "-o", str(garbage)], input=b"invalid archive",
                               env=backup.BIN_ENV, check=True)
                with self.assertRaisesRegex(backup.BackupError, "DUMP_TOC_INVALID"):
                    drill(garbage, identity, backup.digest(garbage).hexdigest())
                clear = subprocess.check_output(["age", "-d", "-i", str(identity), str(encrypted)],
                                                env=backup.BIN_ENV)
                incomplete = root / "incomplete.age"
                subprocess.run(["age", "-r", recipient, "-o", str(incomplete)], input=clear[:-48],
                               env=backup.BIN_ENV, check=True)
                with self.assertRaisesRegex(backup.BackupError, "DUMP_TOC_INVALID|RECOVERY_RESTORE_FAILED"):
                    drill(incomplete, identity, backup.digest(incomplete).hexdigest())
                identity.chmod(0o644)
                with self.assertRaisesRegex(backup.BackupError, "PRIVATE_FILE_PERMISSIONS"):
                    drill(encrypted, identity, manifest["sha256"])
            finally:
                if (data / "postmaster.pid").exists():
                    self.pg("pg_ctl", "-D", str(data), "-m", "immediate", "-w", "stop")

    def pg(self, name, *args, env=backup.BIN_ENV):
        backup.command([str(BINDIR / name), *args], "FIXTURE_" + name.upper(), env=env)

    def test_versioned_conditional_upload_contract(self):
        sha = "4a" * 32
        manifest = {"backup_id": "a" * 32, "sha256": sha, "contract": backup.CONTRACT}
        checksum = base64.b64encode(bytes.fromhex(sha)).decode()
        settings = {"CAPITAL_BACKUP_BUCKET": "fixture-bucket",
                    "CAPITAL_BACKUP_BUCKET_OWNER": "123456789012",
                    "CAPITAL_BACKUP_BUCKET_REGION": "eu-west-1", "CAPITAL_BACKUP_RETENTION_DAYS": "30"}
        with patch.dict(os.environ, settings), patch.object(backup, "command") as cmd:
            cmd.return_value = json.dumps({"VersionId": "version-fixture", "ChecksumSHA256": checksum})
            target = backup.storage_target()
            receipt = backup.publish(Path("fixture.dump.age"), manifest, target)
            args = cmd.call_args.args[0]
            self.assertEqual(args[args.index("--if-none-match") + 1], "*")
            self.assertEqual(args[args.index("--checksum-sha256") + 1], checksum)
            self.assertEqual(args[args.index("--object-lock-mode") + 1], "COMPLIANCE")
            self.assertEqual(args[args.index("--object-lock-retain-until-date") + 1],
                             receipt["retain_until_utc"])
            self.assertEqual(receipt["object_version"], "version-fixture")
            self.assertEqual(cmd.call_args.kwargs["env"]["AWS_MAX_ATTEMPTS"], "3")
            for bad in ({}, {"VersionId": "null", "ChecksumSHA256": checksum},
                        {"VersionId": "version-fixture", "ChecksumSHA256": "bad"}):
                cmd.return_value = json.dumps(bad)
                with self.assertRaisesRegex(backup.BackupError, "UPLOAD_RECEIPT_UNCONFIRMED"):
                    backup.publish(Path("fixture.dump.age"), manifest, target)

    def test_production_connection_is_pinned_to_tls_and_a_dedicated_role(self):
        with tempfile.TemporaryDirectory() as tmp:
            pgpass = Path(tmp) / "pgpass"
            pgpass.touch(mode=0o600)
            values = {"CAPITAL_BACKUP_DB_HOST": "db." + "a" * 20 + ".supabase.co",
                      "CAPITAL_BACKUP_DB_NAME": "postgres",
                      "CAPITAL_BACKUP_DB_USER": "capital_ai_backup",
                      "CAPITAL_BACKUP_DB_CA": "/etc/capital-ai/backup/db-ca.crt",
                      "CAPITAL_BACKUP_PGPASSFILE": str(pgpass),
                      "PGPASSWORD": "not-used", "PGSSLMODE": "disable", "PGSERVICE": "not-used"}
            with patch.dict(os.environ, values):
                config = backup.production_connection()
                self.assertEqual(config["PGSSLMODE"], "verify-full")
                self.assertEqual(config["PGPORT"], "5432")
                self.assertEqual(config["PGOPTIONS"], "-c default_transaction_read_only=on")
                self.assertNotIn("PGPASSWORD", config)
                self.assertNotIn("PGSERVICE", config)
            with patch.dict(os.environ, {**values, "CAPITAL_BACKUP_DB_USER": "postgres"}):
                with self.assertRaisesRegex(backup.BackupError, "INVALID_CAPITAL_BACKUP_DB_USER"):
                    backup.production_connection()

    def test_disabled_backup_and_networked_recovery_fail_closed(self):
        script = str(Path(__file__).with_name("postgres-backup.py"))
        result = subprocess.run([sys.executable, script, "backup"], capture_output=True,
                                env=backup.BIN_ENV, check=False)
        self.assertEqual(result.returncode, 1)
        self.assertEqual(result.stderr.strip(), b"PRODUCTION_BACKUP_DISABLED")
        if not backup.recovery_network_isolated():
            result = subprocess.run(
                [sys.executable, script, "restore-drill", "unused", "--identity", "unused",
                 "--sha256", "unused", "--source-version", "170011", "--bootstrap", "unused",
                 "--verify", "unused"], capture_output=True, env=backup.BIN_ENV, check=False)
            self.assertEqual(result.returncode, 1)
            self.assertEqual(result.stderr.strip(), b"OFFLINE_RECOVERY_NAMESPACE_REQUIRED")


if __name__ == "__main__":
    unittest.main()
