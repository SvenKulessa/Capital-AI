#!/usr/bin/env bash
# CAPITAL_AI_SUPABASE_RECOVERY_SLICES@1 · synthetic PG17-only regression.
# NEVER connects to Supabase, GCS, Auth APIs or real Vault keys.
set -Eeuo pipefail
umask 077
fail() { printf 'FAIL %s\n' "$*" >&2; exit 1; }
[[ $(id -u) != 0 ]] || fail 'unprivileged OS user required'
(( $# == 0 )) || fail 'this test accepts no connection arguments'
pg_bin="$(realpath -- "$(pg_config --bindir)")"
for binary in initdb pg_ctl psql pg_dump postgres; do
  [[ -x "$pg_bin/$binary" ]] || fail "missing $binary"
  [[ $("$pg_bin/$binary" --version) =~ [[:space:]]17\. ]] || fail 'PostgreSQL 17 required'
done
scratch="$(mktemp -d /tmp/capital-recovery.XXXXXXXX)"
src_dir="$scratch/source"
dst_dir="$scratch/target"
fixture_admin=fixture_admin
cleanup() {
  for cluster in "$src_dir" "$dst_dir"; do
    if [[ -f "$cluster/data/postmaster.pid" ]]; then
      pg pg_ctl -D "$cluster/data" -m immediate -w stop >/dev/null 2>&1 || true
    fi
  done
  rm -rf -- "$scratch"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
pg() {
  local binary=$1
  shift
  env -i HOME="$scratch" PATH="$PATH" LC_ALL=C "$pg_bin/$binary" "$@"
}
port() {
  python3 - <<'PY'
import socket
with socket.socket() as sock:
    sock.bind(("127.0.0.1", 0))
    print(sock.getsockname()[1])
PY
}
start_cluster() {
  local dir=$1 port_number=$2
  mkdir -m 700 "$dir"
  pg initdb -D "$dir/data" -U "$fixture_admin" -A trust --no-locale -E UTF8 >/dev/null
  cat >> "$dir/data/postgresql.conf" <<CONF
listen_addresses = '127.0.0.1'
unix_socket_directories = ''
port = $port_number
CONF
  pg pg_ctl -D "$dir/data" -l "$dir/postgres.log" -w start >/dev/null || {
    sed -n '1,100p' "$dir/postgres.log" >&2
    fail 'isolated database startup'
  }
}
sql() {
  local port_number=$1 role=$2
  shift 2
  pg psql -X -w -h 127.0.0.1 -p "$port_number" -U "$role" -d postgres -v ON_ERROR_STOP=1 "$@"
}
source_admin() { sql "$source_port" "$fixture_admin" "$@"; }
target_admin() { sql "$target_port" "$fixture_admin" "$@"; }
assert_eq() { [[ "$1" == "$2" ]] || fail "$3"; }
expect_sqlstate() {
  local port_number=$1 role=$2 state=$3 label=$4 statement=$5 output
  if output="$(sql "$port_number" "$role" -v VERBOSITY=verbose -Atqc "$statement" 2>&1)"; then
    fail "$label unexpectedly succeeded"
  fi
  [[ "$output" == *"$state"* ]] || fail "$label produced wrong SQLSTATE"
  printf 'PASS denied %s (%s)\n' "$label" "$state"
}
check_counts() {
  local port_number=$1
  assert_eq "$(sql "$port_number" "$fixture_admin" -Atqc 'SELECT count(*) FROM auth.users')" 2 'auth.users row count'
  assert_eq "$(sql "$port_number" "$fixture_admin" -Atqc 'SELECT count(*) FROM auth.identities')" 2 'auth.identities row count'
  assert_eq "$(sql "$port_number" "$fixture_admin" -Atqc 'SELECT count(*) FROM auth.sessions')" 2 'auth.sessions row count'
  assert_eq "$(sql "$port_number" "$fixture_admin" -Atqc 'SELECT count(*) FROM storage.buckets WHERE public = false')" 2 'private buckets'
  assert_eq "$(sql "$port_number" "$fixture_admin" -Atqc 'SELECT count(*) FROM storage.objects')" 2 'object metadata count'
  assert_eq "$(sql "$port_number" "$fixture_admin" -Atqc "SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname IN ('auth','storage') AND c.contype='f'")" 4 'four synthetic FK constraints'
  assert_eq "$(sql "$port_number" "$fixture_admin" -Atqc "SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects'")" 2 'storage tenant policies'
  assert_eq "$(sql "$port_number" "$fixture_admin" -Atqc "SELECT relrowsecurity FROM pg_class WHERE oid='storage.objects'::regclass")" t 'storage RLS enabled'
  assert_eq "$(sql "$port_number" "$fixture_admin" -Atqc "SELECT pgp_sym_decrypt(ciphertext,'synthetic-fixture-key-not-provider-vault') FROM vault.secrets WHERE id=1")" synthetic-only-secret 'synthetic vault decryptability'
  printf 'PASS synthetic Auth FK, private Storage metadata/RLS and pgcrypto probe\n'
}
check_acl() {
  local port_number=$1
  assert_eq "$(sql "$port_number" tenant_a -Atqc 'SELECT count(*) FROM storage.objects')" 1 'tenant-a RLS row count'
  assert_eq "$(sql "$port_number" tenant_b -Atqc 'SELECT count(*) FROM storage.objects')" 1 'tenant-b RLS row count'
  expect_sqlstate "$port_number" tenant_a 42501 'auth data remains private' 'SELECT count(*) FROM auth.users'
  expect_sqlstate "$port_number" tenant_a 42501 'vault table remains private' 'SELECT count(*) FROM vault.secrets'
  expect_sqlstate "$port_number" recovery_reader 42501 'reader cannot modify storage metadata' "INSERT INTO storage.buckets(id,public) VALUES('bad',false)"
  expect_sqlstate "$port_number" recovery_reader 42501 'reader cannot read Vault ciphertext' 'SELECT count(*) FROM vault.secrets'
  assert_eq "$(sql "$port_number" "$fixture_admin" -Atqc "SELECT pg_has_role('recovery_reader','pg_read_all_data','MEMBER')")" f 'reader cannot inherit pg_read_all_data'
  printf 'PASS provider-style ACL denials and tenant RLS\n'
}
check_fk_negative() {
  local port_number=$1
  expect_sqlstate "$port_number" "$fixture_admin" 23503 'orphan session' "INSERT INTO auth.sessions(id,user_id) VALUES('orphan','00000000-0000-0000-0000-000000000099')"
  expect_sqlstate "$port_number" "$fixture_admin" 23503 'orphan storage owner' "INSERT INTO storage.objects(bucket_id,name,owner_id,sha256) VALUES('alpha','missing.bin','00000000-0000-0000-0000-000000000099',repeat('a',64))"
  expect_sqlstate "$port_number" "$fixture_admin" 23514 'public bucket forbidden' "INSERT INTO storage.buckets(id,public) VALUES('public-leak',true)"
  printf 'PASS synthetic Auth/Storage FK and private-bucket negative invariants\n'
}
check_storage_bytes() {
  local port_number=$1 root=$2 bucket object checksum file actual
  while read -r bucket object checksum; do
    [[ "$bucket" =~ ^[a-z0-9_-]+$ && "$object" =~ ^[a-z0-9_.-]+$ && "$checksum" =~ ^[a-f0-9]{64}$ ]] || return 1
    file="$root/$bucket/$object"
    [[ -f "$file" && ! -L "$file" ]] || return 1
    actual="$(sha256sum -- "$file" | cut -d ' ' -f 1)"
    [[ "$checksum" == "$actual" ]] || return 1
  done < <(sql "$port_number" "$fixture_admin" -Atqc 'SELECT bucket_id || chr(32) || name || chr(32) || sha256 FROM storage.objects ORDER BY bucket_id,name')
}

source_port="$(port)"
target_port="$(port)"
[[ "$source_port" != "$target_port" ]] || target_port="$(port)"
start_cluster "$src_dir" "$source_port"
source_admin -q <<'SQL'
REVOKE CONNECT ON DATABASE postgres FROM PUBLIC;
CREATE ROLE tenant_a LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE ROLE tenant_b LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE ROLE recovery_reader LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE postgres TO tenant_a, tenant_b, recovery_reader;
CREATE EXTENSION pgcrypto;
CREATE SCHEMA auth;
CREATE SCHEMA storage;
CREATE SCHEMA vault;
REVOKE ALL ON SCHEMA auth,storage,vault FROM PUBLIC;
CREATE TABLE auth.users(id uuid PRIMARY KEY,tenant text NOT NULL);
CREATE TABLE auth.identities(id text PRIMARY KEY,user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT);
CREATE TABLE auth.sessions(id text PRIMARY KEY,user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT);
CREATE TABLE storage.buckets(id text PRIMARY KEY,public boolean NOT NULL DEFAULT false CHECK (public = false));
CREATE TABLE storage.objects(bucket_id text NOT NULL REFERENCES storage.buckets(id) ON DELETE RESTRICT,
  name text NOT NULL,owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'), PRIMARY KEY(bucket_id,name));
CREATE TABLE vault.secrets(id integer PRIMARY KEY,ciphertext bytea NOT NULL);
INSERT INTO auth.users VALUES
 ('00000000-0000-0000-0000-000000000001','a'),
 ('00000000-0000-0000-0000-000000000002','b');
INSERT INTO auth.identities VALUES ('identity-a','00000000-0000-0000-0000-000000000001'),
  ('identity-b','00000000-0000-0000-0000-000000000002');
INSERT INTO auth.sessions VALUES ('session-a','00000000-0000-0000-0000-000000000001'),
  ('session-b','00000000-0000-0000-0000-000000000002');
INSERT INTO storage.buckets(id,public) VALUES ('alpha',false),('beta',false);
INSERT INTO vault.secrets VALUES (1,pgp_sym_encrypt('synthetic-only-secret','synthetic-fixture-key-not-provider-vault'));
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_a_storage ON storage.objects FOR SELECT TO tenant_a
  USING (owner_id='00000000-0000-0000-0000-000000000001');
CREATE POLICY tenant_b_storage ON storage.objects FOR SELECT TO tenant_b
  USING (owner_id='00000000-0000-0000-0000-000000000002');
GRANT USAGE ON SCHEMA storage TO tenant_a,tenant_b,recovery_reader;
GRANT SELECT ON storage.objects TO tenant_a,tenant_b;
GRANT SELECT ON storage.buckets TO recovery_reader;
SQL

mkdir -p "$scratch/objects/source/alpha" "$scratch/objects/source/beta"
printf 'CAPITAL_AI_SYNTHETIC_ALPHA\000non-production\n' > "$scratch/objects/source/alpha/a.bin"
printf 'CAPITAL_AI_SYNTHETIC_BETA\001non-production\n' > "$scratch/objects/source/beta/b.bin"
a_sha="$(sha256sum "$scratch/objects/source/alpha/a.bin" | cut -d ' ' -f 1)"
b_sha="$(sha256sum "$scratch/objects/source/beta/b.bin" | cut -d ' ' -f 1)"
source_admin -q -v a_sha="$a_sha" -v b_sha="$b_sha" <<'SQL'
INSERT INTO storage.objects VALUES
 ('alpha','a.bin','00000000-0000-0000-0000-000000000001',:'a_sha'),
 ('beta','b.bin','00000000-0000-0000-0000-000000000002',:'b_sha');
SQL
check_counts "$source_port"
check_acl "$source_port"
check_fk_negative "$source_port"
check_storage_bytes "$source_port" "$scratch/objects/source" || fail 'source object bytes mismatch'

# The SQL archive preserves metadata and ciphertext, NOT Storage object bytes,
# provider-managed master keys, Auth provider settings or external config.
pg pg_dump -w -h 127.0.0.1 -p "$source_port" -U "$fixture_admin" -d postgres \
  --format=plain --no-owner --no-privileges \
  --schema=auth --schema=storage --schema=vault > "$scratch/slices.sql"
dump_sha="$(sha256sum "$scratch/slices.sql" | cut -d ' ' -f 1)"
start_cluster "$dst_dir" "$target_port"
target_admin -q <<'SQL'
REVOKE CONNECT ON DATABASE postgres FROM PUBLIC;
CREATE ROLE tenant_a LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE ROLE tenant_b LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE ROLE recovery_reader LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE postgres TO tenant_a,tenant_b,recovery_reader;
CREATE EXTENSION pgcrypto;
SQL
target_admin -q --single-transaction -f "$scratch/slices.sql" >/dev/null
check_counts "$target_port"
check_fk_negative "$target_port"
expect_sqlstate "$target_port" tenant_a 42501 'ACL excluded by no-privileges dump' 'SELECT count(*) FROM storage.objects'
target_admin -q <<'SQL'
GRANT USAGE ON SCHEMA storage TO tenant_a,tenant_b,recovery_reader;
GRANT SELECT ON storage.objects TO tenant_a,tenant_b;
GRANT SELECT ON storage.buckets TO recovery_reader;
SQL
check_acl "$target_port"

# Metadata-only dump is inadequate. Missing or altered bytes MUST be rejected.
mkdir -p "$scratch/objects/target/alpha" "$scratch/objects/target/beta"
if check_storage_bytes "$target_port" "$scratch/objects/target"; then
  fail 'metadata-only storage restore unexpectedly accepted'
fi
printf 'PASS missing Storage byte payload fails closed\n'
cp -- "$scratch/objects/source/alpha/a.bin" "$scratch/objects/target/alpha/a.bin"
cp -- "$scratch/objects/source/beta/b.bin" "$scratch/objects/target/beta/b.bin"
check_storage_bytes "$target_port" "$scratch/objects/target" || fail 'Storage byte roundtrip'
printf 'altered' >> "$scratch/objects/target/beta/b.bin"
if check_storage_bytes "$target_port" "$scratch/objects/target"; then
  fail 'altered Storage byte payload unexpectedly accepted'
fi
printf 'PASS altered Storage bytes fail SHA-256 readback\n'
cp -- "$scratch/objects/source/beta/b.bin" "$scratch/objects/target/beta/b.bin"
check_storage_bytes "$target_port" "$scratch/objects/target" || fail 'Storage byte re-copy mismatch'
if target_admin -Atqc "SELECT pgp_sym_decrypt(ciphertext,'wrong-synthetic-key') FROM vault.secrets" >/dev/null 2>&1; then
  fail 'wrong Vault-simulation key unexpectedly decrypted'
fi
printf 'PASS synthetic pgcrypto wrong-key negative (NOT Supabase Vault proof)\n'

fingerprint() {
  local port_number=$1
  sql "$port_number" "$fixture_admin" -Atqc "
  SELECT (
    (SELECT string_agg(id::text || ':' || tenant, ',' ORDER BY id) FROM auth.users) || '|' ||
    (SELECT string_agg(id || ':' || user_id::text, ',' ORDER BY id) FROM auth.identities) || '|' ||
    (SELECT string_agg(id || ':' || user_id::text, ',' ORDER BY id) FROM auth.sessions) || '|' ||
    (SELECT string_agg(id || ':' || public::text, ',' ORDER BY id) FROM storage.buckets) || '|' ||
    (SELECT string_agg(bucket_id || ':' || name || ':' || owner_id::text || ':' || sha256, ',' ORDER BY bucket_id,name) FROM storage.objects) || '|' ||
    (SELECT string_agg(encode(ciphertext,'hex'), ',' ORDER BY id) FROM vault.secrets)
  )" | sha256sum | cut -d ' ' -f 1
}
src_fp="$(fingerprint "$source_port")"
dst_fp="$(fingerprint "$target_port")"
assert_eq "$src_fp" "$dst_fp" 'source/restore relational+encrypted-data fingerprint'
printf 'Scoped synthetic SQL dump SHA-256 %s\n' "$dump_sha"
printf 'Source/target relational fingerprint SHA-256 %s\n' "$src_fp"
printf 'PASS synthetic PG17 Auth/Storage/Vault/ACL recovery slices (provider restore NOT_PROVEN)\n'
