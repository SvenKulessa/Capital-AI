#!/usr/bin/env bash
# Cryptographic round-trip with disposable test key material. No provider credentials.
set -Eeuo pipefail
umask 077
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
command -v age >/dev/null || { echo 'TEST_BLOCKED: age missing' >&2; exit 2; }
command -v age-keygen >/dev/null || { echo 'TEST_BLOCKED: age-keygen missing' >&2; exit 2; }
work="$(mktemp -d)"
trap 'rm -rf -- "$work"' EXIT
age-keygen -o "$work/test-only-identity.txt" 2>/dev/null
export CAPITAL_BACKUP_AGE_RECIPIENT="$(age-keygen -y "$work/test-only-identity.txt")"
printf 'CAPITAL-AI-NONCONFIDENTIAL-ENCRYPTION-TEST\n' > "$work/sample.sql"
bash "$ROOT/scripts/platform/drive-encrypt.sh" "$work/sample.sql" "$work/sample.sql.age" > "$work/metadata.txt"
[[ -s "$work/sample.sql.age" ]]
! cmp -s "$work/sample.sql" "$work/sample.sql.age"
age --decrypt -i "$work/test-only-identity.txt" -o "$work/recovered.sql" "$work/sample.sql.age"
cmp "$work/sample.sql" "$work/recovered.sql"
# A wrong key must fail authentication.
age-keygen -o "$work/wrong-key.txt" 2>/dev/null
if age --decrypt -i "$work/wrong-key.txt" -o "$work/untrusted.sql" "$work/sample.sql.age" >/dev/null 2>&1; then echo 'WRONG_KEY_ACCEPTED' >&2; exit 1; fi
# Bit corruption must never be accepted as authentic.
cp "$work/sample.sql.age" "$work/corrupted.age"
python3 - "$work/corrupted.age" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); b=bytearray(p.read_bytes()); b[-1]^=1; p.write_bytes(b)
PY
if age --decrypt -i "$work/test-only-identity.txt" -o "$work/corrupted.sql" "$work/corrupted.age" >/dev/null 2>&1; then echo 'TAMPER_ACCEPTED' >&2; exit 1; fi
# Non-overwrite safeguard.
if bash "$ROOT/scripts/platform/drive-encrypt.sh" "$work/sample.sql" "$work/sample.sql.age" >/dev/null 2>&1; then echo 'OVERWRITE_ACCEPTED' >&2; exit 1; fi
[[ "$(find "$work" -maxdepth 1 -name '.drive-encrypt.*' | wc -l)" -eq 0 ]]
echo 'DRIVE_ENCRYPTION_TEST_PASS: round-trip, wrong-key, tamper, no-overwrite, no plaintext upload'
