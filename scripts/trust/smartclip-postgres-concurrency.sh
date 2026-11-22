#!/usr/bin/env bash
# Isolated two-backend PostgreSQL race test. No network, ports, external database or provider secrets.
set -euo pipefail
cd "$(dirname "$0")/../.."
image='postgres:17.12-alpine@sha256:f9cf3e1f0066f0eb0c48707d864f0ac5941e9ff454a072077d97a4d278d07d73'
sql='docs/platform/smartclip-sandbox-sql-candidate-20261122.sql'
[ -r "$sql" ] && command -v docker >/dev/null
tmp="$(mktemp -d)"
container=''
cleanup() {
  if [ -n "$container" ]; then docker rm -f "$container" >/dev/null 2>&1 || true; fi
  rm -rf "$tmp"
}
trap cleanup EXIT
container="$(docker run --detach --rm --network none -e POSTGRES_HOST_AUTH_METHOD=trust "$image")"
[ "$(docker inspect --format '{{.HostConfig.NetworkMode}}' "$container")" = none ]
for _ in $(seq 1 100); do
  docker exec "$container" pg_isready -U postgres -d postgres >/dev/null 2>&1 && break
  sleep 0.2
done
docker exec "$container" pg_isready -U postgres -d postgres >/dev/null
docker exec "$container" createdb -U postgres smartclip_p0
pg() { docker exec -i "$container" psql -X -qAt -v ON_ERROR_STOP=1 -U postgres -d smartclip_p0 "$@"; }
q() { docker exec "$container" psql -X -qAt -v ON_ERROR_STOP=1 -U postgres -d smartclip_p0 -c "$1"; }
case "$(q 'SHOW server_version')" in 17.*) : ;; *) echo 'BLOCKED: version'; exit 1;; esac

pg <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
SQL
pg < "$sql"
[ "$(q "SELECT NOT has_function_privilege('anon','public.capital_ai_smartclip_sandbox(text,uuid,text,text,text,text)','EXECUTE') AND NOT has_function_privilege('authenticated','public.capital_ai_smartclip_sandbox(text,uuid,text,text,text,text)','EXECUTE') AND has_function_privilege('service_role','public.capital_ai_smartclip_sandbox(text,uuid,text,text,text,text)','EXECUTE');")" = t ]

sha='8c2683d641f28bf466026dff1f4adb0c073bc81564bc0afd4b758a33d7b76512'
buyer='00000000-0000-4000-8000-000000000001'
check_json() {
  grep -Eq "\"$2\"[[:space:]]*:[[:space:]]*$3([,}])" "$1" || { echo "BLOCKED: $2 != $3"; tail -n 8 "$1" >&2; exit 1; }
}
# Two physically distinct backend PIDs, with observed relation-lock waiting.
# A holds ACCESS EXCLUSIVE while executing the first real RPC; B calls the second.
run_case() {
  local label="$1" intent="$2" session="$3" first="$4" second="$5" first_field="$6" second_field="$7" second_expected="$8" final="$9"
  local a_sql b_sql a_pid b_pid waited=0 a_log="$tmp/$1.a" b_log="$tmp/$1.b" count a_backend b_backend
  local grant="SELECT public.capital_ai_smartclip_sandbox('grant','$buyer'::uuid,'$session','$intent','$sha',NULL);"
  local revoke="SELECT public.capital_ai_smartclip_sandbox('revoke',NULL,NULL,'$intent','$sha','refunded');"
  if [ "$first" = grant ]; then a_sql="$grant"; else a_sql="$revoke"; fi
  if [ "$second" = grant ]; then b_sql="$grant"; else b_sql="$revoke"; fi
  {
    printf "BEGIN;\nLOCK TABLE private.smartclip_sandbox_entitlements IN ACCESS EXCLUSIVE MODE;\nSELECT 'A_PID=' || pg_backend_pid();\n%s\nSELECT pg_sleep(4);\nCOMMIT;\n" "$a_sql" |
    docker exec -i "$container" psql -X -qAt -v ON_ERROR_STOP=1 -U postgres -d smartclip_p0
  } > "$a_log" 2>&1 &
  a_pid=$!
  local ready=0
  for _ in $(seq 1 100); do
    count="$(q "SELECT count(*) FROM pg_locks WHERE relation='private.smartclip_sandbox_entitlements'::regclass AND mode='AccessExclusiveLock' AND granted;" 2>/dev/null || echo 0)"
    if [ "$count" -ge 1 ] 2>/dev/null; then ready=1; break; fi
    sleep 0.05
  done
  [ "$ready" = 1 ] || { echo "BLOCKED: $label no first lock"; wait "$a_pid" || true; exit 1; }
  {
    printf "SELECT 'B_PID=' || pg_backend_pid();\n%s\n" "$b_sql" |
    docker exec -i "$container" psql -X -qAt -v ON_ERROR_STOP=1 -U postgres -d smartclip_p0
  } > "$b_log" 2>&1 &
  b_pid=$!
  for _ in $(seq 1 100); do
    count="$(q "SELECT count(*) FROM pg_locks WHERE relation='private.smartclip_sandbox_entitlements'::regclass AND NOT granted;" 2>/dev/null || echo 0)"
    if [ "$count" -ge 1 ] 2>/dev/null; then waited=1; break; fi
    sleep 0.05
  done
  [ "$waited" = 1 ] || { echo "BLOCKED: $label no second lock wait"; wait "$a_pid" || true; wait "$b_pid" || true; exit 1; }
  wait "$a_pid" || { echo "BLOCKED: $label backend A"; tail -n 8 "$a_log"; exit 1; }
  wait "$b_pid" || { echo "BLOCKED: $label backend B"; tail -n 8 "$b_log"; exit 1; }
  a_backend="$(sed -n 's/^A_PID=//p' "$a_log" | head -n1)"
  b_backend="$(sed -n 's/^B_PID=//p' "$b_log" | head -n1)"
  [ -n "$a_backend" ] && [ -n "$b_backend" ] && [ "$a_backend" != "$b_backend" ]
  check_json "$a_log" "$first_field" true
  check_json "$b_log" "$second_field" "$second_expected"
  [ "$(q "SELECT status FROM private.smartclip_sandbox_entitlements WHERE stripe_payment_intent_id='$intent';")" = "$final" ]
  [ "$(q "SELECT count(*) FROM private.smartclip_sandbox_entitlements WHERE stripe_payment_intent_id='$intent';")" = 1 ]
  echo "SMARTCLIP_P0=$label VERIFIED distinct_backend_pids=true relation_lock_wait=true state=$final"
}
run_case duplicate             pi_p0_concurrent000001 cs_test_p0_concurrent000001 grant  grant  granted granted true  paid
run_case refund_before_grant  pi_p0_concurrent000002 cs_test_p0_concurrent000002 revoke grant  revoked granted false revoked
run_case grant_before_refund  pi_p0_concurrent000003 cs_test_p0_concurrent000003 grant  revoke granted revoked true  revoked

for n in 000002 000003; do
  result="$(q "SELECT public.capital_ai_smartclip_sandbox('grant','$buyer'::uuid,'cs_test_p0_concurrent$n','pi_p0_concurrent$n','$sha',NULL);")"
  case "$result" in *'"granted": false'*) :;; *) echo "BLOCKED: late_grant_$n"; exit 1;; esac
done
result="$(q "SELECT public.capital_ai_smartclip_sandbox('access','$buyer'::uuid,NULL,NULL,NULL,NULL);")"
case "$result" in *'"entitled": true'*) :;; *) echo 'BLOCKED: valid_access'; exit 1;; esac
q "SELECT public.capital_ai_smartclip_sandbox('revoke',NULL,NULL,'pi_p0_concurrent000001','$sha','refunded');" >/dev/null
result="$(q "SELECT public.capital_ai_smartclip_sandbox('access','$buyer'::uuid,NULL,NULL,NULL,NULL);")"
case "$result" in *'"entitled": false'*) :;; *) echo 'BLOCKED: revoked_access'; exit 1;; esac

pg <<SQL > "$tmp/rollback"
BEGIN;
SELECT public.capital_ai_smartclip_sandbox('grant','$buyer'::uuid,'cs_test_p0_rollback000001','pi_p0_rollback000001','$sha',NULL);
ROLLBACK;
SELECT count(*) FROM private.smartclip_sandbox_entitlements WHERE stripe_payment_intent_id='pi_p0_rollback000001';
SQL
[ "$(tail -n 1 "$tmp/rollback")" = 0 ] || { echo 'BLOCKED: explicit_rollback'; exit 1; }
# Container teardown is a separate readback, not implied by test success.
docker rm -f "$container" >/dev/null
if docker inspect "$container" >/dev/null 2>&1; then
  echo 'SMARTCLIP_P0=BLOCKED container_cleanup_not_verified'
  exit 1
fi
container=''
echo 'SMARTCLIP_P0=VERIFIED postgres_two_connection_races_and_sql_rollback isolated_network=none container_cleanup_verified=true'
