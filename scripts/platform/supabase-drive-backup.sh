#!/usr/bin/env bash
# CAPITAL-AI encrypted offsite backup. Never uploads plaintext or private key.
set -Eeuo pipefail
umask 077

fail() { printf 'BACKUP_BLOCKED: %s\n' "$1" >&2; exit 1; }

[[ "${GITHUB_REPOSITORY:-}" == 'SvenKulessa/Capital-AI' ]] || fail 'unexpected repository'
[[ "${GITHUB_REF:-}" == 'refs/heads/main' ]] || fail 'backups run only from main'
[[ -n "${SUPABASE_DB_URL:-}" ]] || fail 'SUPABASE_DB_URL missing'
[[ "$SUPABASE_DB_URL" == postgresql://* || "$SUPABASE_DB_URL" == postgres://* ]] || fail 'invalid database URL protocol'
[[ -n "${CAPITAL_BACKUP_AGE_RECIPIENT:-}" ]] || fail 'public age recipient missing'
[[ -n "${RCLONE_CONFIG_BACKUPDRIVE_TOKEN:-}" ]] || fail 'Google Drive OAuth token missing'
[[ -n "${RCLONE_CONFIG_BACKUPDRIVE_CLIENT_ID:-}" ]] || fail 'Google OAuth client ID missing'
[[ -n "${RCLONE_CONFIG_BACKUPDRIVE_CLIENT_SECRET:-}" ]] || fail 'Google OAuth client secret missing'
[[ -n "${RCLONE_CONFIG_BACKUPDRIVE_ROOT_FOLDER_ID:-}" ]] || fail 'target Drive folder ID missing'
[[ "${RCLONE_CONFIG_BACKUPDRIVE_TYPE:-}" == drive ]] || fail 'rclone remote is not Google Drive'
[[ "${RCLONE_CONFIG_BACKUPDRIVE_SCOPE:-}" == drive ]] || fail 'Drive OAuth scope must be explicitly configured'
for executable in supabase age rclone tar sha256sum cmp; do
  command -v "$executable" >/dev/null 2>&1 || fail "required executable missing: $executable"
done
[[ -f scripts/platform/drive-encrypt.sh ]] || fail 'verified encryption script missing'

work="$(mktemp -d "${RUNNER_TEMP:-/tmp}/capital-ai-supabase-backup-XXXXXXXX")"
trap 'rm -rf -- "$work"' EXIT

# Plaintext exports stay local to the ephemeral, owner-authorized Actions runner.
for mode in roles schema data; do
  case "$mode" in
    roles) supabase db dump --db-url "$SUPABASE_DB_URL" -f "$work/roles.sql" --role-only ;;
    schema) supabase db dump --db-url "$SUPABASE_DB_URL" -f "$work/schema.sql" ;;
    data) supabase db dump --db-url "$SUPABASE_DB_URL" -f "$work/data.sql" --data-only --use-copy ;;
  esac
  [[ -s "$work/$mode.sql" && ! -L "$work/$mode.sql" ]] || fail "export failed: $mode"
done

(
  cd "$work"
  sha256sum roles.sql schema.sql data.sql > MANIFEST.sha256
  tar -cf supabase.tar roles.sql schema.sql data.sql MANIFEST.sha256
)
archive="capital-ai-supabase-$(date -u +%Y%m%dT%H%M%SZ)-run${GITHUB_RUN_ID:-manual}-attempt${GITHUB_RUN_ATTEMPT:-1}.tar.age"
bash scripts/platform/drive-encrypt.sh "$work/supabase.tar" "$work/$archive" >/dev/null
[[ -s "$work/$archive" ]] || fail 'ciphertext missing'

# Only .age bytes cross the Drive API; remote object is immutable.
rclone copyto --immutable --transfers 1 --checkers 1 "$work/$archive" "backupdrive:$archive"
rclone copyto --transfers 1 --checkers 1 "backupdrive:$archive" "$work/readback.age"
cmp "$work/$archive" "$work/readback.age" >/dev/null || fail 'ciphertext readback mismatch'
printf 'BACKUP_CIPHERTEXT_TRANSFER_VERIFIED archive=%s sha256=%s\n' "$archive" "$(sha256sum "$work/$archive" | cut -d ' ' -f 1)"
