#!/usr/bin/env bash
# CAPITAL_AI_STREAM_ENCRYPTED_BACKUP@1
# pg_dump stdout -> age ciphertext. Never write a plaintext SQL dump to disk.
set +x
set -Eeuo pipefail
umask 077

fail() { printf 'BACKUP_STREAM_BLOCKED: %s\n' "$1" >&2; exit 1; }
[[ $# == 2 ]] || fail 'usage: backup-stream-encrypt.sh DATABASE_NAME ABSOLUTE_OUTPUT_DIR'
database="$1"
output_dir="$2"
mode="${CAPITAL_BACKUP_MODE:-}"
recipient="${CAPITAL_BACKUP_AGE_RECIPIENT:-}"

for executable in pg_dump age sha256sum realpath node stat; do
  command -v "$executable" >/dev/null 2>&1 || fail "missing tool: $executable"
done
[[ "$database" =~ ^[A-Za-z_][A-Za-z0-9_]{0,62}$ ]] || fail 'database must be a plain identifier, not a connection string'
[[ "$output_dir" == /* && -d "$output_dir" && ! -L "$output_dir" && -w "$output_dir" ]] || fail 'output directory must exist and be an absolute writable real directory'
[[ "$(realpath -e -- "$output_dir")" == "$output_dir" ]] || fail 'output directory must be canonical and contain no symlinks'
[[ "$recipient" =~ ^age1[023456789acdefghjklmnpqrstuvwxyz]{20,}$ ]] || fail 'public age recipient missing or malformed'

case "$mode" in
  synthetic)
    [[ "$database" =~ ^capital_ai_fixture_src_[0-9]+$ ]] || fail 'synthetic mode requires disposable fixture database'
    [[ "${PGHOST:-}" == '/var/run/postgresql' && "${PGPORT:-}" == '5432' && "${PGUSER:-}" == 'postgres' ]] || fail 'synthetic mode requires local PostgreSQL Unix socket'
    [[ -z "${PGPASSWORD:-}${PGPASSFILE:-}${PGSERVICE:-}${PGSERVICEFILE:-}${PGHOSTADDR:-}" ]] || fail 'synthetic mode forbids external credentials and host overrides'
    ;;
  production)
    [[ "${CAPITAL_BACKUP_PRODUCTION_APPROVED:-}" == 'OWNER_APPROVED_READONLY_EXPORT' ]] || fail 'production requires explicit owner authorization'
    [[ "$database" == 'postgres' ]] || fail 'unexpected production database name'
    [[ "${CAPITAL_BACKUP_PROJECT_REF:-}" == 'ryzywoktpmyhwzxmstyu' ]] || fail 'unexpected Supabase project identity'
    # Use only project-bound direct or shared session-pooler identities.
    # Transaction pooling (6543) is not suitable for a pg_dump session.
    [[ "${PGPORT:-5432}" == '5432' ]] || fail 'production requires direct or session pooler port 5432'
    direct_host="db.${CAPITAL_BACKUP_PROJECT_REF}.supabase.co"
    if [[ "${PGHOST:-}" == "$direct_host" ]]; then
      [[ "${PGUSER:-}" == 'postgres' || "${PGUSER:-}" == 'capital_ai_backup_reader' ]] || fail 'unexpected direct database user'
    elif [[ "${PGHOST:-}" == *.pooler.supabase.com ]]; then
      [[ "${PGUSER:-}" == "postgres.${CAPITAL_BACKUP_PROJECT_REF}" ||
         "${PGUSER:-}" == "capital_ai_backup_reader.${CAPITAL_BACKUP_PROJECT_REF}" ]] || fail 'unexpected session pooler database user'
    else
      fail 'database host is not bound to expected Supabase project'
    fi
    [[ -z "${PGPASSWORD:-}${PGHOSTADDR:-}${PGSERVICE:-}${PGSERVICEFILE:-}${PGOPTIONS:-}${PGDATABASE:-}" ]] || fail 'production forbids inline passwords, service, host-address, option, and database overrides'
    [[ "${PGSSLMODE:-}" == 'verify-full' && -f "${PGSSLROOTCERT:-}" && ! -L "${PGSSLROOTCERT:-}" ]] || fail 'production requires verified TLS and trusted CA bundle'
    [[ -f "${PGPASSFILE:-}" && ! -L "${PGPASSFILE:-}" && "$(stat -c %a -- "${PGPASSFILE:-/dev/null}")" == '600' ]] || fail 'production requires mode-0600 password file'
    ;;
  *) fail 'CAPITAL_BACKUP_MODE must be synthetic or production (no implicit production mode)' ;;
esac

observed_at="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
archive_stamp="$(date -u '+%Y%m%dT%H%M%SZ')"
client_version="$(pg_dump --version)"
cipher_tmp="$(mktemp "$output_dir/.capital-ai-cipher-XXXXXXXX.age")"
manifest_tmp="$(mktemp "$output_dir/.capital-ai-manifest-XXXXXXXX.json")"
archive_path=''
manifest_path=''
archive_published=false
manifest_published=false
cleanup() {
  rm -f -- "$cipher_tmp" "$manifest_tmp"
  if [[ "$manifest_published" != true && "$archive_published" == true ]]; then rm -f -- "$archive_path"; fi
}
trap cleanup EXIT

# pg_dump obtains its consistent database snapshot; pipefail prevents a truncated
# stream from being published as successful ciphertext. No shell tracing or URL args.
pg_dump --no-password --format=plain --no-owner --no-privileges \
  --lock-wait-timeout=15s --dbname="$database" |
  age --encrypt -r "$recipient" -o "$cipher_tmp"
[[ -s "$cipher_tmp" && "$(head -c 21 "$cipher_tmp")" == 'age-encryption.org/v1' ]] || fail 'empty or invalid ciphertext'
cipher_sha="$(sha256sum "$cipher_tmp" | cut -d ' ' -f1)"
cipher_bytes="$(stat -c %s -- "$cipher_tmp")"
archive_name="capital-ai-supabase-${archive_stamp}-${cipher_sha}.sql.age"
manifest_name="backup-manifest-${archive_stamp}-${cipher_sha}.json"
archive_path="$output_dir/$archive_name"
manifest_path="$output_dir/$manifest_name"
[[ ! -e "$archive_path" && ! -L "$archive_path" && ! -e "$manifest_path" && ! -L "$manifest_path" ]] || fail 'refusing overwrite'

BACKUP_EVIDENCE_TIMESTAMP="$observed_at" BACKUP_EVIDENCE_MODE="$mode" \
BACKUP_EVIDENCE_ARCHIVE="$archive_name" BACKUP_EVIDENCE_SHA="$cipher_sha" \
BACKUP_EVIDENCE_BYTES="$cipher_bytes" BACKUP_EVIDENCE_CLIENT="$client_version" \
node - "$manifest_tmp" <<'NODE'
const fs = require('node:fs');
const e = process.env;
const data = {
  schema: 'CAPITAL_AI_ENCRYPTED_BACKUP_MANIFEST@1',
  observedAt: e.BACKUP_EVIDENCE_TIMESTAMP,
  scope: 'logical-postgresql-export-no-storage-objects',
  environment: e.BACKUP_EVIDENCE_MODE === 'synthetic' ? 'SYNTHETIC_ONLY' : 'PRODUCTION_EXPORT',
  encryption: 'age-x25519-client-side',
  archive: e.BACKUP_EVIDENCE_ARCHIVE,
  ciphertextSha256: e.BACKUP_EVIDENCE_SHA,
  ciphertextBytes: Number(e.BACKUP_EVIDENCE_BYTES),
  pgDumpVersion: e.BACKUP_EVIDENCE_CLIENT,
  storageUpload: 'NOT_CONFIGURED',
  isolatedProductionRestore: 'NOT_PROVEN',
  recoveryRtoRpo: 'NOT_MEASURED',
};
fs.writeFileSync(process.argv[2], JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
NODE

# No-clobber hard-link publishing; both files stay on one filesystem.
ln -- "$cipher_tmp" "$archive_path"
archive_published=true
ln -- "$manifest_tmp" "$manifest_path"
manifest_published=true
printf 'BACKUP_STREAM_ENCRYPTED mode=%s sha256=%s bytes=%s archive=%s manifest=%s\n' \
  "$mode" "$cipher_sha" "$cipher_bytes" "$archive_name" "$manifest_name"
