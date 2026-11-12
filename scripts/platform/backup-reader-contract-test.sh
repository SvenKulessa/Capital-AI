#!/usr/bin/env bash
# CAPITAL_AI_BACKUP_READER_CONTRACT@1 · PostgreSQL 17 · synthetic only.
set -Eeuo pipefail
umask 077

fail() { printf 'FAIL %s\n' "$*" >&2; exit 1; }

[[ $(id -u) != 0 ]] || fail 'run as an unprivileged OS user'
(( $# == 0 )) || fail 'this test takes no connection arguments'
pg_bin="$(realpath -- "${PG17_BINDIR:-$(pg_config --bindir)}")"
for tool in postgres initdb pg_ctl psql pg_dump; do
  [[ -x "$pg_bin/$tool" ]] || fail "missing PostgreSQL binary: $tool"
  [[ $("$pg_bin/$tool" --version) =~ [[:space:]]17\. ]] || fail "expected PostgreSQL 17: $tool"
done

scratch="$(mktemp -d /tmp/ca-reader.XXXXXXXX)"
source_cluster="$scratch/source"
restore_cluster="$scratch/restore"
admin=fixture_admin
reader=capital_ai_backup_reader
cleanup() {
  local cluster failed=0
  for cluster in "$source_cluster" "$restore_cluster"; do
    if [[ -f "$cluster/data/postmaster.pid" ]]; then
      pg pg_ctl -D "$cluster/data" -m immediate -w stop >/dev/null 2>&1 || failed=1
    fi
  done
  (( failed == 0 )) || fail "cluster cleanup failed: $scratch"
  rm -rf -- "$scratch"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Clear inherited libpq settings, credentials and proxies.
pg() {
  local binary=$1
  shift
  env -i PATH="$PATH" HOME="$scratch" LC_ALL=C "$pg_bin/$binary" "$@"
}

# The runner must be disposable and single-user. PostgreSQL listens only on loopback.
free_loopback_port() {
  python3 - <<'PYTHON'
import socket
with socket.socket() as listener:
    listener.bind(("127.0.0.1", 0))
    print(listener.getsockname()[1])
PYTHON
}

start_cluster() {
  local cluster=$1 port=$2
  mkdir -m 700 "$cluster"
  pg initdb -D "$cluster/data" -U "$admin" -A trust --no-locale -E UTF8 >/dev/null
  cat >> "$cluster/data/postgresql.conf" <<CONF
listen_addresses = '127.0.0.1'
port = $port
unix_socket_directories = ''
shared_preload_libraries = 'pg_net,pg_cron'
pg_net.database_name = 'postgres'
cron.database_name = 'postgres'
cron.launch_active_jobs = off
CONF
  pg pg_ctl -D "$cluster/data" -l "$cluster/postgres.log" -w start >/dev/null || {
    cat "$cluster/postgres.log" >&2
    fail 'cluster startup'
  }
}

sql() {
  local port=$1 role=$2
  shift 2
  pg psql -X -w -h 127.0.0.1 -p "$port" -U "$role" -d postgres -v ON_ERROR_STOP=1 "$@"
}
source_admin() { sql "$source_port" "$admin" "$@"; }
source_reader() { sql "$source_port" "$reader" "$@"; }

expect_denied() {
  local name=$1 statement=$2 output
  # Explicitly override the role's default. A read-only-transaction error is a test failure.
  if output="$(source_reader -v VERBOSITY=verbose -qc \
      "BEGIN READ WRITE; $statement; ROLLBACK;" 2>&1)"; then
    fail "$name unexpectedly succeeded"
  fi
  [[ $output =~ ERROR:[[:space:]]+42501: ]] || fail "$name wrong SQLSTATE: $output"
  printf 'PASS %s (42501)\n' "$name"
}

assert_query() {
  local expected=$1 role=$2 statement=$3 port=${4:-$source_port} actual
  actual="$(sql "$port" "$role" -Atqc "$statement")"
  [[ $actual == "$expected" ]] || fail "unexpected query result for $role: $statement"
}

dump_as_reader() {
  pg pg_dump -w -h 127.0.0.1 -p "$source_port" -U "$reader" -d postgres --format=plain \
    --no-owner --no-privileges --lock-wait-timeout=15s "$@"
}

source_port="$(free_loopback_port)"
start_cluster "$source_cluster" "$source_port"
source_admin -q <<'SQL'
CREATE SCHEMA extensions;
CREATE EXTENSION pg_net WITH SCHEMA extensions VERSION '0.20.4';
CREATE EXTENSION pg_cron;
CREATE ROLE capital_ai_backup_reader LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 1;
ALTER ROLE capital_ai_backup_reader SET default_transaction_read_only = on;
CREATE ROLE fixture_tenant LOGIN;
CREATE ROLE fixture_net_worker LOGIN;
GRANT CONNECT ON DATABASE postgres TO capital_ai_backup_reader;

CREATE SCHEMA app;
CREATE SCHEMA unrelated;
CREATE TABLE unrelated.outside_scope (id integer);
CREATE TABLE app.notes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant text NOT NULL,
  revision integer NOT NULL CHECK (revision > 0)
);
INSERT INTO app.notes (tenant, revision) VALUES ('fixture_tenant', 1), ('another_tenant', 2);
ALTER TABLE app.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.notes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_select ON app.notes FOR SELECT TO fixture_tenant USING (tenant = current_user);
GRANT USAGE ON SCHEMA app TO fixture_tenant, capital_ai_backup_reader;
GRANT SELECT ON app.notes TO fixture_tenant, capital_ai_backup_reader;
GRANT SELECT ON SEQUENCE app.notes_id_seq TO capital_ai_backup_reader;

-- Reproduce the production catalog findings on upstream extension objects.
GRANT USAGE ON SCHEMA net TO PUBLIC, fixture_net_worker;
GRANT ALL ON TABLE net.http_request_queue, net._http_response TO PUBLIC;
GRANT ALL ON SEQUENCE net.http_request_queue_id_seq TO PUBLIC;
ALTER FUNCTION net.http_get(text,jsonb,jsonb,integer) SECURITY DEFINER SET search_path = pg_catalog;
ALTER FUNCTION net.http_post(text,jsonb,jsonb,jsonb,integer) SECURITY DEFINER SET search_path = pg_catalog;
REVOKE EXECUTE ON FUNCTION net.http_get(text,jsonb,jsonb,integer),
  net.http_post(text,jsonb,jsonb,jsonb,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION net.http_delete(text,jsonb,jsonb,integer,jsonb) TO PUBLIC;
REVOKE USAGE ON SCHEMA cron FROM PUBLIC;
GRANT SELECT ON cron.job, cron.job_run_details TO PUBLIC;
GRANT DELETE ON cron.job_run_details TO PUBLIC;
REVOKE ALL ON SEQUENCE cron.jobid_seq, cron.runid_seq FROM PUBLIC;

CREATE FUNCTION app.write_note() RETURNS void LANGUAGE sql SECURITY DEFINER
  SET search_path = pg_catalog AS 'INSERT INTO app.notes(tenant, revision) VALUES (''synthetic'', 1)';
SQL

printf 'Server %s; ' "$(source_admin -Atqc 'SHOW server_version')"
source_admin -Atqc "SELECT string_agg(extname || '=' || extversion, ', ' ORDER BY extname)
  FROM pg_extension WHERE extname IN ('pg_net','pg_cron')"
assert_query t "$reader" "SELECT session_user = current_user AND current_user = '$reader'
  AND current_setting('transaction_read_only') = 'on'"
assert_query 0 "$reader" 'SELECT count(*) FROM app.notes'
if dump_as_reader --schema=app > /dev/null 2>"$scratch/rls.err"; then
  fail 'dump without BYPASSRLS unexpectedly succeeded'
fi
rg -q 'would be affected by row-level security' "$scratch/rls.err" || {
  cat "$scratch/rls.err" >&2
  fail 'expected RLS dump error'
}
printf 'PASS full app dump fails under RLS without BYPASSRLS\n'

source_admin -q <<'SQL'
ALTER ROLE capital_ai_backup_reader BYPASSRLS;
REVOKE ALL ON SCHEMA net FROM capital_ai_backup_reader;
REVOKE ALL ON TABLE net.http_request_queue FROM capital_ai_backup_reader;
SQL

assert_query 2 "$reader" 'SELECT count(*) FROM app.notes'
assert_query 1 fixture_tenant 'SELECT count(*) FROM app.notes'
# Every successful counterexample is rolled back in the same connection.
# pg_net processes committed queue entries only. Use only the literal loopback endpoint.
net_url='http://127.0.0.1:1/backup-contract'
assert_query t "$reader" "BEGIN READ WRITE;
  SELECT net.http_delete('$net_url') > 0;
  ROLLBACK;"
assert_query t "$reader" "BEGIN READ WRITE;
  INSERT INTO net.http_request_queue(method, url, timeout_milliseconds) VALUES ('GET', '$net_url', 1000) RETURNING id > 0;
  ROLLBACK;"
assert_query 0 "$admin" 'SELECT count(*) FROM net.http_request_queue'
printf 'PASS PUBLIC permits pg_net enqueue after per-role REVOKE (rolled back)\n'
expect_denied 'managed-style net GET' "SELECT net.http_get('$net_url')"
expect_denied 'managed-style net POST' "SELECT net.http_post('$net_url')"

assert_query t "$reader" "BEGIN READ WRITE; CREATE TEMP TABLE temp_probe (id integer);
  SELECT to_regclass('temp_probe') IS NOT NULL; ROLLBACK;"
assert_query t "$reader" 'BEGIN READ WRITE; SELECT lo_create(0) > 0; ROLLBACK;'
assert_query 0 "$admin" 'SELECT count(*) FROM pg_largeobject_metadata'
printf 'PASS PUBLIC permits temporary DDL and large object creation (rolled back)\n'

expect_denied 'cron schedule with scoped grants' "SELECT cron.schedule('0 0 1 1 *','SELECT 1')"
source_admin -qc "GRANT pg_read_all_data TO $reader WITH INHERIT TRUE"
assert_query t "$reader" "SELECT has_schema_privilege(current_user,'cron','USAGE')"
assert_query t "$reader" "BEGIN READ WRITE;
  SELECT cron.schedule('0 0 1 1 *','SELECT 1') > 0; ROLLBACK;"
assert_query 0 "$admin" 'SELECT count(*) FROM cron.job'
printf 'PASS pg_read_all_data opens the pg_cron scheduling path (rolled back)\n'

# Counterfactual hardening for the disposable cluster. These are shared ACLs.
source_admin -q <<'SQL'
REVOKE pg_read_all_data FROM capital_ai_backup_reader;
REVOKE USAGE ON SCHEMA net FROM PUBLIC;
REVOKE TEMP ON DATABASE postgres FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION pg_catalog.lo_create(oid), pg_catalog.lo_creat(integer),
  pg_catalog.lo_from_bytea(oid,bytea) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION app.write_note() FROM PUBLIC;
SQL

assert_query t "$reader" "SELECT NOT (rolsuper OR rolcreatedb OR rolcreaterole OR rolinherit OR rolreplication)
  AND rolcanlogin AND rolbypassrls AND rolconnlimit = 1
  AND NOT EXISTS (SELECT FROM pg_auth_members WHERE member = pg_roles.oid)
  FROM pg_roles WHERE rolname = current_user"

expect_denied 'insert' "INSERT INTO app.notes(tenant, revision) VALUES ('fixture_tenant', 3)"
expect_denied 'update' 'UPDATE app.notes SET revision = 3'
expect_denied 'delete' 'DELETE FROM app.notes'
expect_denied 'truncate' 'TRUNCATE app.notes'
expect_denied 'row locking' 'SELECT * FROM app.notes FOR UPDATE'
expect_denied 'sequence write' "SELECT nextval('app.notes_id_seq')"
expect_denied 'table DDL' 'ALTER TABLE app.notes ADD COLUMN leak text'
expect_denied 'public schema DDL' 'CREATE TABLE public.probe (id integer)'
expect_denied 'temporary DDL' 'CREATE TEMP TABLE probe (id integer)'
expect_denied 'database schema creation' 'CREATE SCHEMA probe'
expect_denied 'role creation' 'CREATE ROLE probe'
expect_denied 'role escalation' "SET ROLE $admin"
assert_query f "$reader" "SELECT has_table_privilege(current_user,'app.notes','SELECT WITH GRANT OPTION')"
printf 'PASS reader has no SELECT grant option\n'
expect_denied 'security definer application function' 'SELECT app.write_note()'
expect_denied 'unrelated schema' 'SELECT * FROM unrelated.outside_scope'
expect_denied 'net queue DML' "INSERT INTO net.http_request_queue(method,url,timeout_milliseconds) VALUES ('GET','$net_url',1000)"
expect_denied 'net response DML' 'DELETE FROM net._http_response'
expect_denied 'net GET' "SELECT net.http_get('$net_url')"
expect_denied 'net POST' "SELECT net.http_post('$net_url')"
expect_denied 'net DELETE' "SELECT net.http_delete('$net_url')"
expect_denied 'net worker restart' 'SELECT net.worker_restart()'
expect_denied 'cron schedule' "SELECT cron.schedule('0 0 1 1 *','SELECT 1')"
expect_denied 'cron unschedule' 'SELECT cron.unschedule(1::bigint)'
expect_denied 'cron alter' "SELECT cron.alter_job(1::bigint, active := false)"
expect_denied 'cron job data' 'SELECT * FROM cron.job'
expect_denied 'cron run log DML' 'DELETE FROM cron.job_run_details'
expect_denied 'large object create' 'SELECT lo_create(0)'
expect_denied 'large object legacy create' 'SELECT lo_creat(0)'
expect_denied 'large object bytea create' "SELECT lo_from_bytea(0, '\\x01')"
lo_oid="$(source_admin -Atqc "SELECT lo_from_bytea(0, '\\x01')")"
[[ $lo_oid =~ ^[0-9]+$ ]] || fail 'invalid fixture large object ID'
expect_denied 'large object read' "SELECT lo_get($lo_oid)"
expect_denied 'large object unlink' "SELECT lo_unlink($lo_oid)"
source_admin -qc "SELECT lo_unlink($lo_oid)" >/dev/null
assert_query t fixture_net_worker "BEGIN READ WRITE; SELECT net.http_delete('$net_url') > 0; ROLLBACK;"
printf 'PASS explicitly authorized net worker retains queue access\n'

if dump_as_reader > /dev/null 2>"$scratch/full.err"; then
  fail 'unscoped dump unexpectedly succeeded under scoped grants'
fi
if ! rg -q 'permission denied for (schema|table|sequence)' "$scratch/full.err"; then
  cat "$scratch/full.err" >&2
  fail 'expected unscoped dump privilege failure'
fi
printf 'PASS unscoped exporter-equivalent dump fails closed\n'

pg pg_dump -w -h 127.0.0.1 -p "$source_port" -U "$admin" -d postgres --data-only \
  --no-owner --no-privileges > "$scratch/admin-data.sql"
for table in job job_run_details; do
  rg -q "^COPY cron\.$table " "$scratch/admin-data.sql" || fail "cron.$table missing from full dump"
done
for sequence in jobid_seq runid_seq; do
  rg -q "setval\('cron\.$sequence'," "$scratch/admin-data.sql" || fail "cron.$sequence missing from full dump"
done
printf 'PASS unscoped dump includes pg_cron config tables and sequences\n'


dump_as_reader --schema=app > "$scratch/app.sql"
restore_port="$(free_loopback_port)"
start_cluster "$restore_cluster" "$restore_port"
restore_admin() { sql "$restore_port" "$admin" "$@"; }
restore_admin -qc 'CREATE ROLE fixture_tenant LOGIN;
  ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC'
restore_admin -q --single-transaction -f "$scratch/app.sql" >/dev/null
assert_query f "$admin" "SELECT has_schema_privilege('fixture_tenant','app','USAGE')" "$restore_port"
assert_query f "$admin" "SELECT has_function_privilege('fixture_tenant','app.write_note()','EXECUTE')" "$restore_port"
restore_admin -qc 'GRANT USAGE ON SCHEMA app TO fixture_tenant; GRANT SELECT ON app.notes TO fixture_tenant'
assert_query 1 fixture_tenant 'SELECT count(*) FROM app.notes' "$restore_port"

fingerprint() {
  sql "$1" "$admin" -Atq <<'SQL' | sha256sum | cut -d ' ' -f 1
SELECT id, tenant, revision FROM app.notes ORDER BY id;
SELECT last_value, is_called FROM app.notes_id_seq;
SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid = 'app.notes'::regclass;
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'app' AND tablename = 'notes' ORDER BY policyname;
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'app.notes'::regclass ORDER BY conname;
SQL
}
source_hash="$(fingerprint "$source_port")"
restore_hash="$(fingerprint "$restore_port")"
[[ $source_hash == "$restore_hash" ]] || fail 'restore fingerprint mismatch'
printf 'Scoped archive SHA-256 %s\n' "$(sha256sum "$scratch/app.sql" | cut -d ' ' -f 1)"
printf 'Source/restore fingerprint SHA-256 %s\n' "$source_hash"
printf 'PASS scoped dump, separate-cluster restore, ACL recreation and tenant isolation\n'
