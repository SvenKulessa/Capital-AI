#!/usr/bin/env bash
# Mock integration: no database, Google credentials, or network access.
set -Eeuo pipefail
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/bin" "$work/drive" "$work/run" "$work/repo/scripts/platform"
cp "$repo/scripts/platform/supabase-drive-backup.sh" "$work/repo/scripts/platform/"
cp "$repo/scripts/platform/drive-encrypt.sh" "$work/repo/scripts/platform/"
cat > "$work/bin/supabase" <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail
[[ "${1:-}" == db && "${2:-}" == dump ]] || exit 91
while [[ $# -gt 0 ]]; do
  if [[ "$1" == -f ]]; then printf 'synthetic SQL only\n' > "$2"; exit 0; fi
  shift
done
exit 92
EOF
cat > "$work/bin/age" <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail
[[ "$1" == --encrypt && "$2" == -r && "$4" == -o ]] || exit 93
# Fake ciphertext fixture -- never use outside tests.
printf 'age-encryption.org/v1\nsynthetic-test-only\n' > "$5"
cat "$6" >> "$5"
EOF
cat > "$work/bin/rclone" <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail
[[ "$1" == copyto ]] || exit 95
shift
while [[ "${1:-}" == --* ]]; do
  case "$1" in
    --immutable) shift ;;
    --transfers|--checkers) shift 2 ;;
    *) exit 96 ;;
  esac
done
source="$1"; dest="$2"
if [[ "$source" == backupdrive:* ]]; then
  cp "${FAKE_DRIVE_DIR}/${source#backupdrive:}" "$dest"
else
  [[ "$source" == *.age && "$dest" == backupdrive:*.age ]] || exit 97
  cp "$source" "${FAKE_DRIVE_DIR}/${dest#backupdrive:}"
fi
EOF
chmod +x "$work/bin"/*
export PATH="$work/bin:$PATH"
export GITHUB_REPOSITORY='SvenKulessa/Capital-AI' GITHUB_REF='refs/heads/main'
export SUPABASE_DB_URL='postgresql://test:synthetic@localhost/postgres'
export CAPITAL_BACKUP_AGE_RECIPIENT='age1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq'
export RCLONE_CONFIG_BACKUPDRIVE_TOKEN='synthetic-token-only'
# rclone's built-in OAuth client is valid with both optional fields absent.
unset RCLONE_CONFIG_BACKUPDRIVE_CLIENT_ID RCLONE_CONFIG_BACKUPDRIVE_CLIENT_SECRET
export RCLONE_CONFIG_BACKUPDRIVE_ROOT_FOLDER_ID='synthetic-folder-only'
export RCLONE_CONFIG_BACKUPDRIVE_TYPE='drive' RCLONE_CONFIG_BACKUPDRIVE_SCOPE='drive'
export RUNNER_TEMP="$work/run" FAKE_DRIVE_DIR="$work/drive" GITHUB_RUN_ID=42 GITHUB_RUN_ATTEMPT=1
cd "$work/repo"
bash scripts/platform/supabase-drive-backup.sh > "$work/success.out"
grep -q 'BACKUP_CIPHERTEXT_TRANSFER_VERIFIED' "$work/success.out"
[[ "$(find "$work/drive" -type f | wc -l)" -eq 1 ]]
rm -f "$work/drive"/*
unset RCLONE_CONFIG_BACKUPDRIVE_TOKEN
if bash scripts/platform/supabase-drive-backup.sh > /dev/null 2> "$work/failure.err"; then
  echo 'FAIL_CLOSED_TEST_ACCEPTED_MISSING_OAUTH' >&2; exit 1
fi
[[ "$(find "$work/drive" -type f | wc -l)" -eq 0 ]]
grep -q 'Google Drive OAuth token missing' "$work/failure.err"
echo 'SUPABASE_DRIVE_BACKUP_MOCK_TEST_PASS'
