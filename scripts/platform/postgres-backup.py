#!/usr/bin/env python3
"""One immutable age-encrypted PostgreSQL archive per backup, with an offline restore drill."""

import argparse
import base64
from datetime import datetime, timedelta, timezone
import hashlib
import json
import os
import pwd
from pathlib import Path
import re
import resource
import secrets
import socket
import subprocess
import sys
import tempfile
import time
import uuid

CONTRACT = "CAPITAL_AI_POSTGRES_BACKUP@1"
ENCRYPTION = "age-v1-x25519"
MAX_BYTES = 4 * 1024**3  # Single S3 PutObject, with headroom below its limit.
PG_TIMEOUT = 900
BIN_ENV = {"PATH": "/usr/local/bin:/usr/bin:/bin", "LANG": "C", "HOME": "/nonexistent"}
SQL_ENV = {**BIN_ENV, "PGCONNECT_TIMEOUT": "10"}


class BackupError(Exception):
    pass


def require(condition, code):
    if not condition:
        raise BackupError(code)


def command(args, code, *, env=BIN_ENV, capture=False, timeout=PG_TIMEOUT):
    result = subprocess.run(
        args, env=env, stdin=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        stdout=subprocess.PIPE if capture else subprocess.DEVNULL,
        timeout=timeout, check=False,
    )
    require(result.returncode == 0, code)
    return result.stdout.decode("ascii").strip() if capture else None


def config(name, pattern):
    value = os.environ.get(name, "")
    require(re.fullmatch(pattern, value) is not None, "INVALID_" + name)
    return value


def private_file(path):
    require(path.is_absolute() and path.is_file(), "PRIVATE_FILE_REQUIRED")
    stat = path.stat()
    require(stat.st_uid == os.getuid() and not stat.st_mode & 0o077, "PRIVATE_FILE_PERMISSIONS")
    return str(path)


def no_swap():
    require(len(Path("/proc/swaps").read_text().splitlines()) == 1, "SWAP_ENABLED")


def production_connection():
    host = config("CAPITAL_BACKUP_DB_HOST",
                  r"(?:db\.[a-z0-9]{20}\.supabase\.co|aws-[0-9]+-eu-west-1\.pooler\.supabase\.com)")
    return {
        **SQL_ENV,
        "PGHOST": host,
        "PGPORT": "5432",
        "PGDATABASE": config("CAPITAL_BACKUP_DB_NAME", r"[a-z][a-z0-9_]{0,62}"),
        "PGUSER": config("CAPITAL_BACKUP_DB_USER", r"capital_ai_backup(?:\.[a-z0-9]{20})?"),
        "PGAPPNAME": "capital-ai-backup",
        "PGSSLMODE": "verify-full",
        "PGSSLROOTCERT": config("CAPITAL_BACKUP_DB_CA", r"/[^\r\n]+"),
        "PGGSSENCMODE": "disable",
        "PGPASSFILE": private_file(Path(os.environ.get("CAPITAL_BACKUP_PGPASSFILE", ""))),
        "PGOPTIONS": "-c default_transaction_read_only=on",
    }


def pg_binary(bindir, name):
    return str(bindir / name)


def db_query(bindir, env, sql):
    return command([pg_binary(bindir, "psql"), "-XwAt", "-v", "ON_ERROR_STOP=1", "-c", sql],
                   "DATABASE_QUERY_FAILED", env=env, capture=True, timeout=30)


def tool_major(bindir, name):
    version = command([pg_binary(bindir, name), "--version"], "PG_VERSION_FAILED", capture=True)
    match = re.search(r"\(PostgreSQL\) (\d+)\.", version)
    require(match is not None, "PG_VERSION_INVALID")
    return int(match[1])


def utc_timestamp(value):
    return value.isoformat(timespec="seconds").replace("+00:00", "Z")


def utc_now():
    return utc_timestamp(datetime.now(timezone.utc))


def digest(path):
    with path.open("rb") as file:
        return hashlib.file_digest(file, "sha256")


def create_archive(bindir, env, recipient, encrypted, max_bytes):
    # A conservative lower bound for the pg_dump snapshot time.
    started_at = utc_now()
    start = time.monotonic()
    version, read_only, privileged_role = db_query(
        bindir, env, "SELECT current_setting('server_version_num'), "
        "current_setting('transaction_read_only'), "
        "(rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication) "
        "FROM pg_roles WHERE rolname = current_user"
    ).split("|")
    require(read_only == "on" and privileged_role == "f", "BACKUP_ROLE_UNSAFE")
    require(tool_major(bindir, "pg_dump") == int(version) // 10000, "DUMP_MAJOR_MISMATCH")

    # The only plaintext archive copy is inside the pipe. Check both exits before upload.
    with subprocess.Popen(
        [pg_binary(bindir, "pg_dump"), "-w", "-Fc", "--lock-wait-timeout=10s"],
        env=env, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
    ) as dump:
        try:
            with encrypted.open("xb") as output:
                age = subprocess.run(
                    ["age", "--encrypt", "-r", recipient], env=BIN_ENV, stdin=dump.stdout,
                    stdout=output, stderr=subprocess.DEVNULL, timeout=PG_TIMEOUT, check=False,
                )
            dump.stdout.close()
            require(age.returncode == 0, "ENCRYPTION_FAILED")
            require(dump.wait(timeout=10) == 0, "DUMP_FAILED")
        finally:
            if dump.poll() is None:
                dump.kill()

    size = encrypted.stat().st_size
    require(0 < size <= max_bytes, "ARCHIVE_SIZE_LIMIT")
    checksum = digest(encrypted)
    return {
        "contract": CONTRACT, "backup_id": uuid.uuid4().hex, "snapshot_lower_bound_utc": started_at,
        "encrypted_at_utc": utc_now(), "postgres_version_num": int(version),
        "encryption": ENCRYPTION, "recipient_sha256": hashlib.sha256(recipient.encode()).hexdigest(),
        "sha256": checksum.hexdigest(), "ciphertext_bytes": size,
        "dump_encrypt_seconds": round(time.monotonic() - start, 3),
    }


def storage_target():
    bucket = config("CAPITAL_BACKUP_BUCKET", r"[a-z0-9][a-z0-9-]{1,61}[a-z0-9]")
    owner = config("CAPITAL_BACKUP_BUCKET_OWNER", r"[0-9]{12}")
    region = config("CAPITAL_BACKUP_BUCKET_REGION", r"eu-(?:west-[123]|central-[12]|north-1|south-[12])")
    days = int(config("CAPITAL_BACKUP_RETENTION_DAYS", r"[0-9]{1,2}"))
    require(7 <= days <= 90, "INVALID_CAPITAL_BACKUP_RETENTION_DAYS")
    return bucket, owner, region, days


def publish(encrypted, manifest, target):
    bucket, owner, region, days = target
    retain_until = utc_timestamp(datetime.now(timezone.utc) + timedelta(days=days))
    manifest = {**manifest, "retain_until_utc": retain_until}
    key = "postgres/v1/" + manifest["backup_id"] + ".dump.age"
    checksum = base64.b64encode(bytes.fromhex(manifest["sha256"])).decode()
    # Endpoint and TLS verification stay fixed. Credentials come from the service identity.
    aws_env = {k: v for k, v in os.environ.items() if k.startswith("AWS_")}
    aws_env.update(BIN_ENV, AWS_RETRY_MODE="standard", AWS_MAX_ATTEMPTS="3",
                   AWS_PAGER="", AWS_CLI_AUTO_PROMPT="off", AWS_IGNORE_CONFIGURED_ENDPOINT_URLS="true")
    # Use a fixed, approved trust store independently of AWS profile and host environment.
    result = command([
        "aws", "--no-cli-pager", "--output", "json", "--region", region,
        "--endpoint-url", f"https://s3.{region}.amazonaws.com",
        "--ca-bundle", "/etc/ssl/certs/ca-certificates.crt",
        "--cli-connect-timeout", "10", "--cli-read-timeout", "60",
        "s3api", "put-object", "--bucket", bucket, "--expected-bucket-owner", owner,
        "--key", key, "--body", str(encrypted), "--if-none-match", "*",
        "--checksum-algorithm", "SHA256", "--checksum-sha256", checksum,
        "--server-side-encryption", "AES256", "--content-type", "application/octet-stream",
        "--object-lock-mode", "COMPLIANCE", "--object-lock-retain-until-date", retain_until,
        "--metadata", json.dumps({k.replace("_", "-"): str(v) for k, v in manifest.items()}),
    ], "UPLOAD_UNCONFIRMED", env=aws_env, capture=True, timeout=600)
    receipt = json.loads(result)
    version = receipt.get("VersionId")
    require(receipt.get("ChecksumSHA256") == checksum and isinstance(version, str)
            and version not in ("", "null"), "UPLOAD_RECEIPT_UNCONFIRMED")
    return {**manifest, "object_key": key, "object_version": version, "uploaded_at_utc": utc_now()}


def recovery_network_isolated():
    interfaces = Path("/proc/self/net/dev").read_text().splitlines()[2:]
    return {line.split(":", 1)[0].strip() for line in interfaces} == {"lo"}


def local_cluster(root):
    # A random SCRAM credential also protects the temporary cluster from local peers.
    with socket.socket() as port_probe:
        port_probe.bind(("127.0.0.1", 0))
        port = str(port_probe.getsockname()[1])
    user = pwd.getpwuid(os.getuid()).pw_name
    password = secrets.token_hex(32)
    password_file = root / "init-password"
    password_file.write_text(password + "\n")
    pgpass = root / "pgpass"
    pgpass.write_text(f"127.0.0.1:{port}:*:{user}:{password}\n")
    env = {**SQL_ENV, "PGHOST": "127.0.0.1", "PGPORT": port, "PGDATABASE": "postgres",
           "PGUSER": user, "PGPASSFILE": str(pgpass), "PGSSLMODE": "disable"}
    return env, password_file


def start_options(env):
    return f"-c listen_addresses=127.0.0.1 -c unix_socket_directories='' -p {env['PGPORT']}"


def restore(bindir, root, encrypted, identity, expected_sha, source_version, bootstrap, verify):
    require(re.fullmatch(r"[0-9a-f]{64}", expected_sha), "INVALID_EXPECTED_SHA256")
    require(digest(encrypted).hexdigest() == expected_sha, "CIPHERTEXT_CHECKSUM_MISMATCH")
    require(all(tool_major(bindir, name) == source_version // 10000
                for name in ("pg_restore", "postgres")), "RESTORE_MAJOR_MISMATCH")
    archive = root / "archive.dump"
    command(["age", "--decrypt", "-i", private_file(identity), "-o", str(archive), str(encrypted)],
            "DECRYPTION_FAILED")
    command([pg_binary(bindir, "pg_restore"), "--list", str(archive)], "DUMP_TOC_INVALID")
    data = root / "data"
    env, password_file = local_cluster(root)
    ctl = [pg_binary(bindir, "pg_ctl"), "-D", str(data)]
    command([pg_binary(bindir, "initdb"), "--auth-local=reject", "--auth-host=scram-sha-256",
             "--pwfile", str(password_file), "--encoding=UTF8", "--no-sync", "-D", str(data)],
            "RECOVERY_INIT_FAILED")
    password_file.unlink()
    try:
        command([*ctl, "-l", str(root / "postgres.log"), "-w", "start", "-o",
                 start_options(env)],
                "RECOVERY_START_FAILED", timeout=75)
        psql = [pg_binary(bindir, "psql"), "-Xw", "-v", "ON_ERROR_STOP=1"]
        command([pg_binary(bindir, "createdb"), "-w", "-T", "template0", "capital_ai_recovery"],
                "RECOVERY_CREATE_FAILED", env=env)
        env["PGDATABASE"] = "capital_ai_recovery"
        command([*psql, "-f", str(bootstrap)], "ROLE_EXTENSION_BOOTSTRAP_FAILED", env=env)
        command([pg_binary(bindir, "pg_restore"), "-w", "--exit-on-error", "--single-transaction",
                 "--dbname=capital_ai_recovery", str(archive)], "RECOVERY_RESTORE_FAILED", env=env)
        command([*psql, "--single-transaction", "-f", str(verify)], "RECOVERY_VALIDATION_FAILED",
                env=env)
    finally:
        if (data / "postmaster.pid").exists():
            command([*ctl, "-m", "immediate", "-w", "stop"], "RECOVERY_STOP_FAILED", timeout=75)


def run():
    os.umask(0o077)
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pg-bin", type=Path, default=Path("/usr/lib/postgresql/17/bin"))
    modes = parser.add_subparsers(dest="mode", required=True)
    backup = modes.add_parser("backup")
    backup.add_argument("--max-bytes", type=int, default=1024**3)
    recovery = modes.add_parser("restore-drill")
    recovery.add_argument("archive", type=Path)
    recovery.add_argument("--identity", type=Path, required=True)
    recovery.add_argument("--sha256", required=True)
    recovery.add_argument("--source-version", type=int, required=True)
    recovery.add_argument("--bootstrap", type=Path, required=True)
    recovery.add_argument("--verify", type=Path, required=True)
    args = parser.parse_args()
    require(os.getuid() != 0 and args.pg_bin.is_absolute(), "DEDICATED_UNPRIVILEGED_RUNTIME_REQUIRED")
    no_swap()

    if args.mode == "backup":
        require(os.environ.get("CAPITAL_BACKUP_ENABLE") == "approved", "PRODUCTION_BACKUP_DISABLED")
        require(0 < args.max_bytes <= MAX_BYTES, "INVALID_MAX_BYTES")
        # Also limit ciphertext growth during encryption, not only before upload.
        resource.setrlimit(resource.RLIMIT_FSIZE, (args.max_bytes, args.max_bytes))
        recipient = config("CAPITAL_BACKUP_AGE_RECIPIENT", r"age1[023456789acdefghjklmnpqrstuvwxyz]{58}")
        target = storage_target()
        with tempfile.TemporaryDirectory(prefix="capital-ai-backup-") as tmp:
            encrypted = Path(tmp) / "backup.dump.age"
            manifest = create_archive(args.pg_bin, production_connection(), recipient, encrypted,
                                      args.max_bytes)
            # Emit a safe correlation ID even when the PUT outcome is ambiguous.
            print("BACKUP_UPLOAD_ATTEMPT " + manifest["backup_id"], file=sys.stderr, flush=True)
            print(json.dumps(publish(encrypted, manifest, target), sort_keys=True))
    else:
        require(command(["stat", "-f", "-c", "%T", "/dev/shm"], "TMPFS_REQUIRED", capture=True)
                == "tmpfs", "TMPFS_REQUIRED")
        require(recovery_network_isolated(),
                "OFFLINE_RECOVERY_NAMESPACE_REQUIRED")
        require(args.archive.is_file() and args.archive.stat().st_size <= MAX_BYTES,
                "INVALID_CIPHERTEXT")
        start = time.monotonic()
        with tempfile.TemporaryDirectory(prefix="ca-recovery-", dir="/dev/shm") as tmp:
            restore(args.pg_bin, Path(tmp), args.archive, args.identity, args.sha256,
                    args.source_version, args.bootstrap, args.verify)
        print(json.dumps({"contract": CONTRACT, "sha256": args.sha256,
                          "restore_validation_seconds": round(time.monotonic() - start, 3),
                          "result": "RESTORE_DRILL_PASS"}, sort_keys=True))


if __name__ == "__main__":
    try:
        run()
    except BackupError as error:
        print(error, file=sys.stderr)
        sys.exit(1)
    except subprocess.TimeoutExpired:
        print("BACKUP_OR_RESTORE_TIMEOUT", file=sys.stderr)
        sys.exit(1)
    except (OSError, ValueError, AttributeError):
        print("BACKUP_OR_RESTORE_RUNTIME_ERROR", file=sys.stderr)
        sys.exit(1)
