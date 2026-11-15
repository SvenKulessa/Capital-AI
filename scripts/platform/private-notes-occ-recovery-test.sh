#!/usr/bin/env bash
# CI-only disposable local PostgreSQL fixtures. No hosted DSNs, backups or keys.
set -Eeuo pipefail
umask 077
[[ "${GITHUB_ACTIONS:-}" == true ]] || { echo 'OCC_RECOVERY_BLOCKED: isolated CI runner required' >&2; exit 2; }
for name in PGHOST PGHOSTADDR PGPORT PGDATABASE PGSERVICE PGUSER PGPASSWORD PGPASSFILE PGSERVICEFILE PGOPTIONS; do
  [[ -z "${!name:-}" ]] || { echo 'OCC_RECOVERY_BLOCKED: inherited PostgreSQL override' >&2; exit 2; }
done
for cmd in sudo psql pg_dump pg_restore age age-keygen /usr/bin/python3; do
  command -v "$cmd" >/dev/null || { echo "OCC_RECOVERY_BLOCKED: missing $cmd" >&2; exit 2; }
done
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$root"
role="capital_ai_occ_runner_$$"
databases=("capital_ai_occ_main_$$" "capital_ai_occ_abort_$$" "capital_ai_occ_pre_$$" "capital_ai_occ_post_$$")
cleanup() {
  for database in "${databases[@]}"; do
    sudo -u postgres dropdb --host=/var/run/postgresql --port=5432 --if-exists "$database" >/dev/null 2>&1 || true
  done
  sudo -u postgres dropuser --host=/var/run/postgresql --port=5432 --if-exists "$role" >/dev/null 2>&1 || true
}
trap cleanup EXIT
password="$(/usr/bin/python3 -c 'import secrets; print(secrets.token_hex(24))')"
# Fixed local socket only; this superuser is restricted to the disposable CI cluster.
printf "CREATE ROLE %s LOGIN SUPERUSER PASSWORD '%s';\n" "$role" "$password" |
  sudo -u postgres psql --host=/var/run/postgresql --port=5432 --dbname=postgres -X -q -v ON_ERROR_STOP=1 >/dev/null
for database in "${databases[@]}"; do
  sudo -u postgres createdb --host=/var/run/postgresql --port=5432 --owner="$role" "$database"
done
export OCC_ISOLATED_TEST=YES
export OCC_MAIN_DSN="postgresql://$role:$password@127.0.0.1:5432/${databases[0]}"
export OCC_ROLLBACK_DSN="postgresql://$role:$password@127.0.0.1:5432/${databases[1]}"
export OCC_RESTORE_PRE_DSN="postgresql://$role:$password@127.0.0.1:5432/${databases[2]}"
export OCC_RESTORE_POST_DSN="postgresql://$role:$password@127.0.0.1:5432/${databases[3]}"
/usr/bin/python3 -m unittest discover -s scripts/tests -p 'private_notes_occ_postgres_test.py' -v
echo 'OCC_RECOVERY_PASS: parallel CAS, atomic migration, encrypted pre/post-cutover restore, data/ACL/RLS/RPC identity, legacy PUT denial'
