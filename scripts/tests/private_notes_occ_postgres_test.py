"""Isolated PostgreSQL OCC v2 integration regression suite. NEVER use production DSNs.
Run only after creating two EMPTY local test databases in a temporary PostgreSQL instance.
Requires psycopg 3 and psql, OCC_ISOLATED_TEST=YES, OCC_MAIN_DSN and
OCC_ROLLBACK_DSN; run: python -m unittest discover -s scripts/tests
-p 'private_notes_occ_postgres_test.py' -v
"""
import os
import re
import subprocess
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlsplit, unquote
from uuid import uuid4

import psycopg

BASE = Path("supabase/migrations/20261011162435_private_dashboard_notes.sql")
MIGRATION = Path("supabase/migrations/20261031030000_private_notes_occ_v2.sql")


def test_dsn(key):
    if os.environ.get("OCC_ISOLATED_TEST") != "YES":
        raise RuntimeError("ISOLATED_TEST_FLAG_REQUIRED")
    raw = os.environ[key]
    url = urlsplit(raw)
    if url.scheme not in ("postgres", "postgresql") or url.hostname not in ("localhost", "127.0.0.1", "::1"):
        raise RuntimeError("REMOTE_POSTGRES_FORBIDDEN")
    if not unquote(url.path.lstrip("/")).startswith("capital_ai_occ_") or url.query or url.fragment:
        raise RuntimeError("ISOLATED_TEST_DB_NAME_REQUIRED")
    return raw


def run_script(sql, dsn, success=True):
    url = urlsplit(dsn)
    env = {**os.environ,
           "PGHOST": url.hostname,
           "PGPORT": str(url.port or 5432),
           "PGDATABASE": unquote(url.path.lstrip("/")),
           "PGUSER": unquote(url.username or "postgres"),
           "PGPASSWORD": unquote(url.password or ""),
           "PGCONNECT_TIMEOUT": "5"}
    result = subprocess.run(["psql", "-X", "-q", "-v", "ON_ERROR_STOP=1"],
                            input=sql, text=True, capture_output=True,
                            env=env, timeout=45, check=False)
    if success and result.returncode:
        raise AssertionError("ISOLATED_SQL_FAILED")
    return result.returncode


def connect(dsn, autocommit=True):
    return psycopg.connect(dsn, autocommit=autocommit, connect_timeout=5)


def rpc(conn, uid, action="GET", notes=None, revision=None):
    return conn.execute(
        "SELECT public.capital_ai_private_notes_v2(%s::uuid,%s::text,%s::text,%s::text)",
        (uid, action, notes, revision)
    ).fetchone()[0]


def bootstrap(dsn):
    with connect(dsn) as db:
        if db.execute("SELECT to_regclass('private.dashboard_notes')").fetchone()[0]:
            raise RuntimeError("NONEMPTY_TEST_DATABASE")
        for role in ("service_role", "anon", "authenticated"):
            if not db.execute("SELECT 1 FROM pg_roles WHERE rolname=%s", (role,)).fetchone():
                db.execute("CREATE ROLE " + role + " NOLOGIN")
        db.execute("CREATE SCHEMA auth")
        db.execute("CREATE SCHEMA private")
        db.execute("CREATE TABLE auth.users (id uuid PRIMARY KEY)")
    run_script(BASE.read_text(encoding="utf-8"), dsn)


class PrivateNotesOccSql(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.main, cls.rollback = test_dsn("OCC_MAIN_DSN"), test_dsn("OCC_ROLLBACK_DSN")
        if urlsplit(cls.main).path == urlsplit(cls.rollback).path:
            raise RuntimeError("DISTINCT_TEST_DATABASES_REQUIRED")
        bootstrap(cls.main)
        bootstrap(cls.rollback)
        cls.original_user = str(uuid4())
        for dsn in (cls.main, cls.rollback):
            with connect(dsn) as db:
                db.execute("INSERT INTO auth.users(id) VALUES (%s)", (cls.original_user,))
                db.execute("INSERT INTO private.dashboard_notes(user_id,notes,updated_at) "
                           "VALUES (%s,'original','2026-01-02T03:04:05+00'::timestamptz)", (cls.original_user,))

        migration = MIGRATION.read_text(encoding="utf-8")
        if not re.search(r"(?i)COMMIT;\s*\Z", migration):
            raise RuntimeError("MIGRATION_MUST_BE_ATOMIC")
        run_script(migration, cls.main)
        broken = re.sub(r"(?i)COMMIT;\s*\Z", "SELECT 1/0;\nCOMMIT;", migration)
        if run_script(broken, cls.rollback, success=False) == 0:
            raise AssertionError("ROLLBACK_FAULT_NOT_TRIGGERED")

    def new_user(self):
        uid = str(uuid4())
        with connect(self.main) as db:
            db.execute("INSERT INTO auth.users(id) VALUES (%s)", (uid,))
        return uid

    def row(self, uid):
        with connect(self.main) as db:
            return db.execute("SELECT notes,revision FROM private.dashboard_notes "
                              "WHERE user_id=%s", (uid,)).fetchone()

    def test_existing_document_preserved(self):
        with connect(self.main) as db:
            notes, rev, updated = db.execute(
                "SELECT notes,revision,updated_at FROM private.dashboard_notes WHERE user_id=%s",
                (self.original_user,)).fetchone()
        self.assertEqual((notes, rev, updated.isoformat()),
                         ("original", 1, "2026-01-02T03:04:05+00:00"))

    def test_empty_document_revision_zero(self):
        uid = self.new_user()
        with connect(self.main) as db:
            self.assertEqual(rpc(db, uid), {"status":"ok","notes":"","revision":"0"})
        self.assertIsNone(self.row(uid))

    def test_legacy_get_but_never_put(self):
        with connect(self.main) as db:
            old = db.execute(
                "SELECT public.capital_ai_private_notes(%s::uuid,NULL,'GET')",
                (self.original_user,)).fetchone()[0]
            self.assertEqual(old, "original")
            with self.assertRaises(psycopg.Error) as err:
                db.execute("SELECT public.capital_ai_private_notes(%s::uuid,'bad','PUT')",
                           (self.original_user,))
            self.assertEqual(err.exception.sqlstate, "P0001")
        self.assertEqual(self.row(self.original_user), ("original", 1))

    def test_input_bounds(self):
        uid = self.new_user()
        with connect(self.main) as db:
            for text, rev in [(None,"0"),("a","-1"),("a","01"),("a",None),
                              ("a","9223372036854775807"),("x"*10001,"0")]:
                with self.assertRaises(psycopg.Error):
                    rpc(db, uid, "PUT", text, rev)
            saved = rpc(db, uid, "PUT", "x"*10000, "0")
        self.assertEqual(saved["revision"], "1")
        self.assertEqual(self.row(uid), ("x"*10000, 1))

    def test_service_role_only(self):
        signature = "public.capital_ai_private_notes_v2(uuid,text,text,text)"
        with connect(self.main) as db:
            self.assertTrue(db.execute("SELECT relrowsecurity FROM pg_class "
                "WHERE oid='private.dashboard_notes'::regclass").fetchone()[0])
            for role in ("anon", "authenticated"):
                self.assertFalse(db.execute(
                    "SELECT has_function_privilege(%s,%s,'EXECUTE')",
                    (role,signature)).fetchone()[0])
                db.execute("SET ROLE " + role)
                with self.assertRaises(psycopg.Error) as err:
                    rpc(db, self.original_user)
                self.assertEqual(err.exception.sqlstate,"42501")
                db.execute("RESET ROLE")
            db.execute("SET ROLE service_role")
            self.assertEqual(rpc(db,self.original_user)["status"],"ok")

    def test_separate_users(self):
        one, two = self.new_user(), self.new_user()
        with connect(self.main) as db:
            rpc(db, one, "PUT", "one", "0")
            rpc(db, two, "PUT", "two", "0")
            self.assertEqual(rpc(db,one)["notes"],"one")
            self.assertEqual(rpc(db,two)["notes"],"two")

    def race(self, existing, commit_first, timeout=False):
        uid = self.new_user()
        expected = "0"
        if existing:
            with connect(self.main) as db:
                rpc(db,uid,"PUT","base","0")
            expected = "1"
        with connect(self.main, autocommit=False) as first, connect(self.main) as second, connect(self.main) as observer:
            first_result = rpc(first, uid,"PUT","first",expected)
            pid = second.execute("SELECT pg_backend_pid()").fetchone()[0]
            if timeout:
                second.execute("SET lock_timeout='150ms'")
            with ThreadPoolExecutor(max_workers=1) as pool:
                pending = pool.submit(rpc,second,uid,"PUT","second",expected)
                if timeout:
                    with self.assertRaises(psycopg.Error) as err:
                        pending.result(timeout=8)
                    self.assertEqual(err.exception.sqlstate, "55P03")
                    first.commit()
                    return first_result,None,self.row(uid)
                blocked = False
                deadline = time.monotonic() + 8
                while time.monotonic() < deadline:
                    state = observer.execute(
                        "SELECT wait_event_type FROM pg_stat_activity WHERE pid=%s",
                        (pid,)).fetchone()
                    if state and state[0] == "Lock":
                        blocked = True
                        break
                    time.sleep(.03)
                if not blocked:
                    first.rollback()
                    self.fail("SECOND_SESSION_DID_NOT_BLOCK")
                if commit_first:
                    first.commit()
                else:
                    first.rollback()
                second_result = pending.result(timeout=8)
        return first_result,second_result,self.row(uid)

    def test_concurrent_initial_insert(self):
        a,b,row=self.race(False,True)
        self.assertEqual((a["status"],b["status"],row),("saved","conflict",("first",1)))

    def test_concurrent_update(self):
        a,b,row=self.race(True,True)
        self.assertEqual((a["status"],b["status"],row),("saved","conflict",("first",2)))

    def test_rollback_releases_insert(self):
        a,b,row=self.race(False,False)
        self.assertEqual((a["status"],b["status"],row),("saved","saved",("second",1)))

    def test_rollback_releases_update(self):
        a,b,row=self.race(True,False)
        self.assertEqual((a["status"],b["status"],row),("saved","saved",("second",2)))

    def test_lock_timeout_is_fail_closed(self):
        _,_,row=self.race(True,True,timeout=True)
        self.assertEqual(row,("first",2))

    def test_aborted_migration_reverts_entire_ddl(self):
        with connect(self.rollback) as db:
            self.assertIsNone(db.execute("SELECT to_regprocedure("
                "'public.capital_ai_private_notes_v2(uuid,text,text,text)')").fetchone()[0])
            self.assertIsNone(db.execute(
                "SELECT 1 FROM information_schema.columns WHERE table_schema='private' "
                "AND table_name='dashboard_notes' AND column_name='revision'").fetchone())
            # Old write function exists ONLY in deliberately rolled-back test DB.
            value = db.execute(
                "SELECT public.capital_ai_private_notes(%s::uuid,'rollback','PUT')",
                (self.original_user,)).fetchone()[0]
            self.assertEqual(value,"rollback")

    def test_post_cutover_legacy_write_remains_blocked(self):
        self.test_legacy_get_but_never_put()
        with connect(self.main) as db:
            self.assertEqual(rpc(db,self.original_user)["revision"],"1")


if __name__ == "__main__":
    unittest.main(verbosity=2)
