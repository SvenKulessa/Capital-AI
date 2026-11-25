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
pg -f /work/supabase/migrations/20261112160000_instagram_carousel_group_cas.sql
pg -f /work/supabase/migrations/20261013035202_capital_social_owner_token_refresh.sql
pg -f /work/supabase/migrations/20261013030655_youtube_private_upload_jobs.sql
pg -f /work/supabase/migrations/20261013105500_youtube_private_deleted_receipt_recovery.sql
pg -f /work/supabase/migrations/20261013110247_youtube_private_deleted_receipt_recovery.sql
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
pg -f /work/scripts/social-carousel-db-data.sql
pg -f /work/scripts/social-carousel-db-before.sql

# Two parallel independent connections compete for the *same* immutable group CAS.
carousel_claim="SET ROLE service_role; SELECT id FROM public.capital_social_claim_carousel_group(
'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101'::uuid,
'e683ecba-1fab-45f7-8c6a-a35418750771'::uuid,
'ig-camp','ig-content',repeat('b',40),
array['etf-1','etf-2','etf-3'],
array[repeat('1',64),repeat('2',64),repeat('3',64)],
array['carousel-a1','carousel-a2','carousel-a3'],repeat('f',64),
'ig-camp:ig-content:INSTAGRAM:CAROUSEL:'||repeat('f',64));"
carousel_one="$(mktemp)"; carousel_two="$(mktemp)"
trap 'rm -f "$one" "$two" "$carousel_one" "$carousel_two"' EXIT
pg -At -c "$carousel_claim" > "$carousel_one" 2>&1 &
carousel_pid_one=$!
pg -At -c "$carousel_claim" > "$carousel_two" 2>&1 &
carousel_pid_two=$!
carousel_ok_one=0; carousel_ok_two=0
if wait "$carousel_pid_one"; then carousel_ok_one=1; fi
if wait "$carousel_pid_two"; then carousel_ok_two=1; fi
if [[ "$((carousel_ok_one + carousel_ok_two))" -ne 1 ]]; then
  echo 'CAROUSEL_PARALLEL_CLAIM_BROKEN: expected exactly one winner' >&2
  cat "$carousel_one" "$carousel_two" >&2; exit 1
fi
if ! grep -q 'SOCIAL_CAROUSEL_GROUP_ALREADY_RESERVED' "$carousel_one" "$carousel_two"; then
  echo 'CAROUSEL_DUPLICATE_CLAIM_NOT_DENIED' >&2; exit 1
fi
pg -f /work/scripts/social-carousel-db-after.sql
pg -f /work/scripts/social-token-refresh-db.sql
pg -f /work/scripts/youtube-private-receipt-recovery-db.sql
pg -f /work/supabase/migrations/20261014205919_youtube_owner_revocation_cleanup.sql
pg -f /work/scripts/youtube-privacy-revocation-db.sql

# CAI-X-GROWTH@1 — isolated account-wide budget contract, no real provider calls.
pg -f /work/scripts/social-provider-db-x-budget.sql
pg -f /work/scripts/social-provider-db-x-budget-data.sql
budget_claim() {
  pg -At -c "SET ROLE service_role; SELECT public.capital_x_growth_reserve('d0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101','991',repeat('$1',64));"
}
# Distinct content digests compete for the final EUR of an account-wide budget.
budget_claim c > "$one" 2>&1 &
budget_pid_one=$!
budget_claim d > "$two" 2>&1 &
budget_pid_two=$!
budget_ok_one=0; budget_ok_two=0
if wait "$budget_pid_one"; then budget_ok_one=1; fi
if wait "$budget_pid_two"; then budget_ok_two=1; fi
if [[ "$((budget_ok_one + budget_ok_two))" -ne 1 ]]; then
  echo 'X_BUDGET_PARALLEL_CAP_BROKEN' >&2
  cat "$one" "$two" >&2; exit 1
fi
grep -q 'X_BUDGET_EXHAUSTED' "$one" "$two"
# New independent connection, no receipt and no process state: a simulated
# lost response retains the durable reservation; a duplicate cannot re-claim.
if [[ "$budget_ok_one" -eq 1 ]]; then winner=c; else winner=d; fi
budget_claim "$winner" > "$one"
grep -q '"claimed": false' "$one"
pg -f /work/scripts/social-provider-db-x-budget-after.sql

# Isolated campaign consent fixture; no real provider or user records.
pg -f /work/scripts/social-provider-db-x-consent.sql
pg -f /work/scripts/social-provider-db-x-consent-test.sql

# Restart only the exact ephemeral CI service, never a user-supplied remote DB.
container="${SOCIAL_DB_TEST_CONTAINER:-}"
if [[ "${GITHUB_ACTIONS:-}" != "true" || ! "$container" =~ ^[a-f0-9]{64}$ ]]; then
  echo 'X_BUDGET_RESTART_REQUIRES_CI_SERVICE' >&2; exit 1
fi
if [[ "$(docker inspect --format '{{.Config.Image}}' "$container")" != "$image" ]]; then
  echo 'X_BUDGET_RESTART_WRONG_IMAGE' >&2; exit 1
fi
before="$(pg -At -c 'SELECT pg_postmaster_start_time()')"
docker restart --time 10 "$container" >/dev/null
ready=0
for attempt in {1..30}; do
  if pg -At -c 'SELECT 1' >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
[[ "$ready" -eq 1 ]]
after="$(pg -At -c 'SELECT pg_postmaster_start_time()')"
[[ "$before" != "$after" ]]
# Same receipt-free content remains claimed after the real server restart;
# a different digest cannot spend the exhausted budget.
budget_claim "$winner" > "$one"
grep -q '"claimed": false' "$one"
if budget_claim e > "$two" 2>&1; then
  echo 'X_BUDGET_RESTART_CAP_BROKEN' >&2; exit 1
fi
grep -q 'X_BUDGET_EXHAUSTED' "$two"
pg -f /work/scripts/social-provider-db-x-budget-after.sql
echo 'PASS: X budget persisted after real PostgreSQL service restart'
echo "PASS: Disposable PG17 migration, legacy preservation, OAuth CAS, RLS, owner isolation, parallel unique claim, single terminal log."

# Verify durable consent withdrawal and terminal invoice reversal after the same real restart.
[[ "$(pg -At -c "SELECT count(*) FROM capital_growth_private.x_consent WHERE revoked_at IS NOT NULL")" == 1 ]]
[[ "$(pg -At -c "SELECT count(*) FROM capital_growth_private.x_initial_payment WHERE reversed")" == 1 ]]
echo 'PASS: isolated consent and invoice reversal persisted after PostgreSQL restart'

[[ "$(pg -At -c 'SELECT count(*) FROM capital_growth_private.smartcopy_consent WHERE revoked_at IS NOT NULL')" == 1 ]]
echo 'PASS: isolated Smartcopy consent withdrawal persisted after PostgreSQL restart'
