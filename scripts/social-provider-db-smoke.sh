#!/usr/bin/env bash
set -euo pipefail
# Disposable GitHub Actions PostgreSQL instance ONLY. Never use real provider DB URL.
if [[ "${SOCIAL_DB_TEST_MODE:-}" != "DISPOSABLE_CI_ONLY" ]]; then
  echo "Refusing to run database test without disposable CI acknowledgment" >&2
  exit 2
fi
if [[ "${PGHOST:-}" != "127.0.0.1" || "${PGUSER:-}" != "postgres" ]]; then
  echo "Database test only accepts local ephemeral Postgres" >&2
  exit 2
fi
image='postgres:17.11-alpine'
pg() {
  docker run --rm --network host -e "PGPASSWORD=${PGPASSWORD:?}" \
    -v "${PWD}:/work:ro" "${image}" \
    psql -h 127.0.0.1 -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"
}
pg -f /work/scripts/social-provider-db-fixture.sql
pg -f /work/supabase/migrations/20260801150000_social_media_publishing.sql
pg -f /work/supabase/migrations/20260815140000_social_media_content_approvals.sql
pg -f /work/supabase/migrations/20261008113000_social_provider_store.sql
pg -f /work/scripts/social-provider-db-data.sql
pg -f /work/scripts/social-provider-db-before.sql

claim="SET ROLE service_role; SELECT id FROM public.capital_social_claim_delivery(
'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101'::uuid,
'f683ecba-1fab-45f7-8c6a-a35418750771'::uuid,
'approval-1','campaign','content',repeat('b',40),'asset',repeat('a',64),
'youtube','campaign:content:asset:YOUTUBE');"
one="$(mktemp)"; two="$(mktemp)"
trap 'rm -f "$one" "$two"' EXIT
pg -At -c "$claim" > "$one" 2>&1 &
pid_one=$!
pg -At -c "$claim" > "$two" 2>&1 &
pid_two=$!
ok_one=0; ok_two=0
if wait "$pid_one"; then ok_one=1; fi
if wait "$pid_two"; then ok_two=1; fi
if [[ "$((ok_one + ok_two))" -ne 1 ]]; then
  echo "Expected exactly one atomic claim under parallel workers" >&2
  cat "$one" "$two" >&2
  exit 1
fi
if ! grep -q 'SOCIAL_DELIVERY_ALREADY_RESERVED' "$one" "$two"; then
  echo "Losing claim must fail with duplicate reservation" >&2
  exit 1
fi
pg -f /work/scripts/social-provider-db-after.sql
echo "PASS: Disposable PG17 migration, legacy preservation, OAuth CAS, RLS, owner isolation, parallel unique claim, single terminal log."
