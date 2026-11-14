#!/usr/bin/env bash
# Disposable PostgreSQL / age integration; neither Supabase nor cloud storage.
set -Eeuo pipefail
umask 077
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
for tool in sudo psql pg_dump createdb dropdb age age-keygen node python3; do
  command -v "$tool" >/dev/null 2>&1 || { echo "BACKUP_STREAM_TEST_BLOCKED: missing $tool" >&2; exit 2; }
done
if [[ -n "${PGHOST:-}${PGHOSTADDR:-}${PGPORT:-}${PGDATABASE:-}${PGSERVICE:-}${PGUSER:-}${PGPASSWORD:-}${PGPASSFILE:-}${PGSERVICEFILE:-}" ]]; then
  echo 'BACKUP_STREAM_TEST_BLOCKED: inherited database connection settings' >&2; exit 2
fi
source_db="capital_ai_fixture_src_$$"
target_db="capital_ai_fixture_dst_$$"
scratch="$(mktemp -d "${RUNNER_TEMP:-/tmp}/capital-ai-stream-test-XXXXXXXX")"
cipher_dir=''
cleanup() {
  sudo -u postgres dropdb --host=/var/run/postgresql --port=5432 --if-exists "$target_db" >/dev/null 2>&1 || true
  sudo -u postgres dropdb --host=/var/run/postgresql --port=5432 --if-exists "$source_db" >/dev/null 2>&1 || true
  if [[ -n "$cipher_dir" ]]; then sudo rm -rf -- "$cipher_dir"; fi
  rm -rf -- "$scratch"
}
trap cleanup EXIT
sudo -u postgres createdb --host=/var/run/postgresql --port=5432 "$source_db"
sudo -u postgres createdb --host=/var/run/postgresql --port=5432 "$target_db"
sudo -u postgres psql --host=/var/run/postgresql --port=5432 --dbname="$source_db" --set ON_ERROR_STOP=1 >/dev/null <<'SQL'
CREATE TABLE synthetic_backup_probe (
  tenant text NOT NULL,
  seq integer NOT NULL,
  payload text NOT NULL,
  PRIMARY KEY (tenant, seq)
);
INSERT INTO synthetic_backup_probe (tenant,seq,payload) VALUES
  ('tenant_a',1,'CAPITAL_AI_SYNTHETIC_A'),
  ('tenant_b',1,'CAPITAL_AI_SYNTHETIC_B');
ALTER TABLE synthetic_backup_probe ENABLE ROW LEVEL SECURITY;
CREATE POLICY isolate_synthetic_tenant ON synthetic_backup_probe
  FOR SELECT USING (tenant = current_setting('app.tenant_id', true));
SQL
age-keygen -o "$scratch/identity.txt" 2>/dev/null
recipient="$(age-keygen -y "$scratch/identity.txt")"
cipher_dir="$(sudo -u postgres mktemp -d '/tmp/capital-ai-stream-XXXXXXXX')"
# The postgres Unix-socket identity cannot traverse the runner's checked-out
# workspace. Copy only this public, pinned test script into a private fixture dir.
sudo install -o postgres -g postgres -m 0500 "$root/scripts/platform/backup-stream-encrypt.sh" "$cipher_dir/exporter.sh"
result="$(sudo -u postgres env -i PATH="$PATH" HOME=/var/lib/postgresql \
  CAPITAL_BACKUP_MODE=synthetic CAPITAL_BACKUP_AGE_RECIPIENT="$recipient" \
  PGHOST=/var/run/postgresql PGPORT=5432 PGUSER=postgres \
  bash "$cipher_dir/exporter.sh" "$source_db" "$cipher_dir")"
[[ "$result" == BACKUP_STREAM_ENCRYPTED* ]] || { echo 'NO_ENCRYPTED_RESULT' >&2; exit 1; }
mapfile -t archives < <(sudo find "$cipher_dir" -maxdepth 1 -type f -name '*.sql.age')
mapfile -t manifests < <(sudo find "$cipher_dir" -maxdepth 1 -type f -name 'backup-manifest-*.json')
[[ "${#archives[@]}" -eq 1 && "${#manifests[@]}" -eq 1 ]] || { echo 'ARCHIVE_OR_MANIFEST_COUNT_INVALID' >&2; exit 1; }
[[ "$(sudo find "$cipher_dir" -maxdepth 1 -type f -name '*.sql' | wc -l)" == 0 ]] || { echo 'PLAINTEXT_DUMP_LEFT_ON_DISK' >&2; exit 1; }
archive="${archives[0]}"
manifest="${manifests[0]}"
sudo cat "$manifest" > "$scratch/manifest.json"
node - "$scratch/manifest.json" "$archive" <<'NODE'
const fs = require('node:fs');
const assert = require('node:assert/strict');
const metadata = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
assert.equal(metadata.schema, 'CAPITAL_AI_ENCRYPTED_BACKUP_MANIFEST@1');
assert.equal(metadata.environment, 'SYNTHETIC_ONLY');
assert.equal(metadata.isolatedProductionRestore, 'NOT_PROVEN');
assert.equal(metadata.storageUpload, 'NOT_CONFIGURED');
assert.match(metadata.ciphertextSha256, /^[a-f0-9]{64}$/);
assert.equal(metadata.archive, process.argv[3].split('/').at(-1));
NODE
expected_hash="$(sudo sha256sum "$archive" | cut -d ' ' -f1)"
[[ "$(node -p "JSON.parse(require('node:fs').readFileSync('$scratch/manifest.json')).ciphertextSha256")" == "$expected_hash" ]] || {
  echo 'ENCRYPTED_ARCHIVE_CHECKSUM_MISMATCH' >&2; exit 1;
}
# Simulate independent offsite retrieval using a separate local fixture directory.
# This is deliberately NOT evidence of Google Drive/GCS upload or provider restore.
mkdir -m 700 "$scratch/retrieved"
sudo cat "$archive" > "$scratch/retrieved/backup.sql.age"
retrieved_hash="$(sha256sum "$scratch/retrieved/backup.sql.age" | cut -d ' ' -f1)"
[[ "$retrieved_hash" == "$expected_hash" ]] || {
  echo 'INDEPENDENT_COPY_SHA256_MISMATCH' >&2; exit 1;
}
# Tamper with the retrieved copy: the manifest hash must reject it before decryption.
cp -- "$scratch/retrieved/backup.sql.age" "$scratch/retrieved/tampered.sql.age"
python3 - "$scratch/retrieved/tampered.sql.age" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
data = bytearray(p.read_bytes())
data[-1] ^= 1
p.write_bytes(data)
PY
[[ "$(sha256sum "$scratch/retrieved/tampered.sql.age" | cut -d ' ' -f1)" != "$expected_hash" ]] || {
  echo 'TAMPERED_RETRIEVAL_HASH_ACCEPTED' >&2; exit 1;
}
# Restore only from the independently copied, hash-verified synthetic archive.
archive="$scratch/retrieved/backup.sql.age"
echo 'PASS synthetic independent archive copy, SHA-256 and tamper rejection (no cloud provider)'

# Decrypted SQL exists only in the pipe to the disposable target database.
sudo cat "$archive" | age --decrypt -i "$scratch/identity.txt" | \
  sudo -u postgres psql --host=/var/run/postgresql --port=5432 --dbname="$target_db" --set ON_ERROR_STOP=1 >/dev/null
query='SELECT tenant || chr(58) || seq || chr(58) || payload FROM synthetic_backup_probe ORDER BY tenant,seq;'
source_rows="$(sudo -u postgres psql --host=/var/run/postgresql --port=5432 -At --dbname="$source_db" --command "$query")"
target_rows="$(sudo -u postgres psql --host=/var/run/postgresql --port=5432 -At --dbname="$target_db" --command "$query")"
[[ "$source_rows" == "$target_rows" ]] || { echo 'SYNTHETIC_RESTORE_ROWS_MISMATCH' >&2; exit 1; }
policy_count="$(sudo -u postgres psql --host=/var/run/postgresql --port=5432 -At --dbname="$target_db" --command "SELECT count(*) FROM pg_policies WHERE tablename = 'synthetic_backup_probe' AND policyname = 'isolate_synthetic_tenant';")"
[[ "$policy_count" == 1 ]] || { echo 'SYNTHETIC_RLS_POLICY_MISSING' >&2; exit 1; }
# Wrong identity and ciphertext bit-flip must fail authentic decryption.
age-keygen -o "$scratch/wrong-identity.txt" 2>/dev/null
if sudo cat "$archive" | age --decrypt -i "$scratch/wrong-identity.txt" >/dev/null 2>&1; then echo 'WRONG_IDENTITY_ACCEPTED' >&2; exit 1; fi
sudo cat "$archive" > "$scratch/corrupted.age"
python3 - "$scratch/corrupted.age" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1]); b = bytearray(p.read_bytes()); b[-1] ^= 1; p.write_bytes(b)
PY
if age --decrypt -i "$scratch/identity.txt" "$scratch/corrupted.age" >/dev/null 2>&1; then echo 'CORRUPTION_ACCEPTED' >&2; exit 1; fi
# Production is never implicitly authorized, even if no connection is attempted.
if CAPITAL_BACKUP_MODE=production CAPITAL_BACKUP_AGE_RECIPIENT="$recipient" \
  bash "$root/scripts/platform/backup-stream-encrypt.sh" postgres "$scratch" >/dev/null 2>&1; then
  echo 'PRODUCTION_WITHOUT_APPROVAL_ACCEPTED' >&2; exit 1
fi
# A failed pg_dump must not publish even a partial encrypted output.
if sudo -u postgres env -i PATH="$PATH" HOME=/var/lib/postgresql \
  CAPITAL_BACKUP_MODE=synthetic CAPITAL_BACKUP_AGE_RECIPIENT="$recipient" \
  PGHOST=/var/run/postgresql PGPORT=5432 PGUSER=postgres \
  bash "$cipher_dir/exporter.sh" "capital_ai_fixture_src_999999999" "$cipher_dir" >/dev/null 2>&1; then
  echo 'NONEXISTENT_DATABASE_ACCEPTED' >&2; exit 1
fi
[[ "$(sudo find "$cipher_dir" -maxdepth 1 -type f -name '*.sql.age' | wc -l)" == 1 ]] || { echo 'FAILED_EXPORT_PUBLISHED_ARCHIVE' >&2; exit 1; }
echo 'BACKUP_STREAM_SYNTHETIC_PASS: encrypted PostgreSQL pipe, manifest hash, restore, RLS, negative cases; production untouched'
