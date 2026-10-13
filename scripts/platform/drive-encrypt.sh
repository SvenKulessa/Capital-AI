#!/usr/bin/env bash
# Encrypt an existing database export BEFORE it is sent to Google Drive.
# This command never makes network requests, never uploads plaintext and never reads private keys.
set -Eeuo pipefail
umask 077

fail() { printf 'DRIVE_ENCRYPT_ERROR: %s\n' "$1" >&2; exit 1; }
[[ $# -eq 2 ]] || fail 'usage: drive-encrypt.sh INPUT OUTPUT.age'
command -v age >/dev/null 2>&1 || fail 'age CLI missing'
command -v sha256sum >/dev/null 2>&1 || fail 'sha256sum missing'
[[ "${CAPITAL_BACKUP_AGE_RECIPIENT:-}" =~ ^age1[023456789acdefghjklmnpqrstuvwxyz]{20,}$ ]] || fail 'valid age recipient required'
input="$1"
output="$2"
[[ -f "$input" && ! -L "$input" && -s "$input" ]] || fail 'input must be a non-empty regular file'
[[ "$output" == *.age ]] || fail 'encrypted output must have .age suffix'
[[ ! -e "$output" && ! -L "$output" ]] || fail 'refusing to overwrite existing output'
[[ -d "$(dirname -- "$output")" ]] || fail 'output directory missing'
[[ ! -L "$(dirname -- "$output")" ]] || fail 'output directory may not be symlink'

# Temporary data is CIPHERTEXT ONLY; plaintext input remains controlled by the caller.
tmp="$(mktemp "$(dirname -- "$output")/.drive-encrypt.XXXXXXXX.age")"
trap 'rm -f -- "$tmp"' EXIT
age --encrypt -r "$CAPITAL_BACKUP_AGE_RECIPIENT" -o "$tmp" "$input"
[[ -s "$tmp" ]] || fail 'age produced empty ciphertext'
# A predictable signature check, not a substitute for authenticated decryption.
[[ "$(head -c 21 "$tmp")" == 'age-encryption.org/v1' ]] || fail 'unexpected ciphertext format'
chmod 600 "$tmp"
ln -- "$tmp" "$output"  # atomic no-clobber publish on the same filesystem
rm -f -- "$tmp"
[[ -s "$output" ]] || fail 'ciphertext was not published'
# Print ONLY metadata about the encrypted file.
printf 'DRIVE_ENCRYPT_OK file=%s sha256=%s bytes=%s\n' "$(basename -- "$output")" "$(sha256sum "$output" | cut -d ' ' -f1)" "$(stat -c%s "$output")"
