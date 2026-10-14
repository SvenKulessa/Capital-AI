#!/usr/bin/env bash
# Non-production recovery regression: two disposable PostgreSQL databases only.
# Never connects to Supabase and never uploads plaintext or ciphertext.
set -Eeuo pipefail
umask 077

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
for cmd in sudo psql pg_dump age age-keygen sha256sum; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "SYNTHETIC_RESTORE_BLOCKED: missing $cmd" >&2; exit 2; }
done

scratch="$(mktemp -d "${RUNNER_TEMP:-/tmp}/capital-ai-restore-XXXXXXXX")"
source_db="capital_ai_fixture_src_$$"
restore_db="capital_ai_fixture_dst_$$"
cleanup() {
  sudo -u postgres dropdb --if-exists "$restore_db" >/dev/null 2>&1 || true
  sudo -u postgres dropdb --if-exists "$source_db" >/dev/null 2>&1 || true
  rm -rf -- "$scratch"
}
trap cleanup EXIT

# This local test must not accept production connection strings or reuse user databases.
if [[ -n "${PGHOST:-}${PGPORT:-}${PGDATABASE:-}${PGSERVICE:-}" ]]; then
  echo 'SYNTHETIC_RESTORE_BLOCKED: inherited PostgreSQL connection overrides' >&2
  exit 2
fi
sudo -u postgres createdb "$source_db"
sudo -u postgres createdb "$restore_db"
sudo -u postgres psql --dbname "$source_db" --set ON_ERROR_STOP=1 <<'SQL' >/dev/null
CREATE TABLE synthetic_restore_probe (
  tenant text NOT NULL,
  seq integer NOT NULL,
  payload text NOT NULL,
  PRIMARY KEY (tenant, seq)
);
INSERT INTO synthetic_restore_probe (tenant,seq,payload) VALUES
  ('tenant_a',1,'CAPITAL_AI_TEST_ONLY_A'),
  ('tenant_b',1,'CAPITAL_AI_TEST_ONLY_B'),
  ('tenant_b',2,'CAPITAL_AI_TEST_ONLY_C');
SQL

# pg_dump exits non-zero on an incomplete dump. The source is synthetic, never customer data.
sudo -u postgres pg_dump --no-owner --no-privileges --format=plain --dbname "$source_db" > "$scratch/fixture.sql"
test -s "$scratch/fixture.sql"
age-keygen -o "$scratch/identity.txt" 2>/dev/null
export CAPITAL_BACKUP_AGE_RECIPIENT="$(age-keygen -y "$scratch/identity.txt")"
bash "$root/scripts/platform/drive-encrypt.sh" "$scratch/fixture.sql" "$scratch/fixture.sql.age" > "$scratch/encryption-metadata.txt"
test -s "$scratch/fixture.sql.age"
expected_sha="$(sha256sum "$scratch/fixture.sql" | cut -d ' ' -f1)"
rm -f -- "$scratch/fixture.sql"
age --decrypt -i "$scratch/identity.txt" -o "$scratch/restore.sql" "$scratch/fixture.sql.age"
[[ "$expected_sha" == "$(sha256sum "$scratch/restore.sql" | cut -d ' ' -f1)" ]] || {
  echo 'SYNTHETIC_RESTORE_FAIL: decrypted SQL checksum mismatch' >&2; exit 1;
}
sudo -u postgres psql --dbname "$restore_db" --set ON_ERROR_STOP=1 < "$scratch/restore.sql" >/dev/null
query="SELECT tenant || ':' || count(*) || ':' || min(payload) FROM synthetic_restore_probe GROUP BY tenant ORDER BY tenant;"
source_rows="$(sudo -u postgres psql -At --dbname "$source_db" --command "$query")"
restore_rows="$(sudo -u postgres psql -At --dbname "$restore_db" --command "$query")"
[[ "$source_rows" == "$restore_rows" ]] || { echo 'SYNTHETIC_RESTORE_FAIL: row mismatch' >&2; exit 1; }
[[ "$restore_rows" == $'tenant_a:1:CAPITAL_AI_TEST_ONLY_A\ntenant_b:2:CAPITAL_AI_TEST_ONLY_B' ]] || {
  echo 'SYNTHETIC_RESTORE_FAIL: unexpected fixture' >&2; exit 1;
}
# Never publish plaintext, database output or test-key material in CI evidence.
echo 'SYNTHETIC_POSTGRES_RESTORE_PASS: isolated destination, age roundtrip, hash and tenant fixture verified'
