#!/usr/bin/env bash
# Disposable PostgreSQL 17 fixture only; no provider or production connections.
set -Eeuo pipefail
umask 077
[[ $(id -u) != 0 && $# == 0 ]] || exit 2
bin="$(realpath -- "$(pg_config --bindir)")"
[[ $("$bin/postgres" --version) =~ [[:space:]]17\. ]] || exit 2
scratch="$(mktemp -d /tmp/cai-drive-lock.XXXXXXXX)"
pg(){ local tool=$1; shift; env -i PATH="$PATH" HOME="$scratch" LC_ALL=C "$bin/$tool" "$@"; }
cleanup(){
  if [[ -f "$scratch/data/postmaster.pid" ]]; then
    pg pg_ctl -D "$scratch/data" -m immediate -w stop >/dev/null
  fi
  rm -rf -- "$scratch"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
pg initdb -D "$scratch/data" -U fixture_admin -A trust --no-locale -E UTF8 >/dev/null
start(){ pg pg_ctl -D "$scratch/data" -l "$scratch/postgres.log" -o "-c listen_addresses='' -k $scratch" -w start >/dev/null; }
start
sql(){ pg psql -X -w -h "$scratch" -U fixture_admin -d postgres -v ON_ERROR_STOP=1 "$@"; }
sql -q <<'SQL'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
SQL
sql -q -f scripts/platform/drive-create-lease.sql
a=00000000-0000-4000-8000-000000000001
b=00000000-0000-4000-8000-000000000002
rpc(){
  local args="'$2'::uuid"
  if [[ $1 == mark_write ]]; then args+=",'1FixtureFolderABC','fixture.py',repeat('a',64)"; fi
  sql -Atq -c "set role service_role; select public.capital_ai_drive_lock_$1($args);"
}
# Two independent transactions compete for one singleton.
rpc acquire "$a" > "$scratch/a" & pa=$!
rpc acquire "$b" > "$scratch/b" & pb=$!
wait "$pa"; wait "$pb"
ra=$(cat "$scratch/a"); rb=$(cat "$scratch/b")
if [[ $ra == t && $rb == f ]]; then owner=$a; other=$b
elif [[ $ra == f && $rb == t ]]; then owner=$b; other=$a
else echo 'FAIL concurrent acquisition'; exit 1; fi
[[ $(rpc mark_write "$other") == f ]]
[[ $(rpc release "$other") == f ]]
[[ $(rpc mark_write "$owner") == t ]]
[[ $(rpc mark_write "$owner") == f ]]
# Simulate worker loss and server restart; the durable row is still held.
pg pg_ctl -D "$scratch/data" -m fast -w stop >/dev/null
start
[[ $(rpc acquire "$other") == f ]]
[[ $(sql -Atq -c "select target_folder_id || ':' || target_filename || ':' || target_sha256 from capital_ai_drive_lock.exclusive_create") == "1FixtureFolderABC:fixture.py:$(printf '%064d' 0 | tr 0 a)" ]]
for role in anon authenticated; do
  for fn in acquire mark_write release; do
    args="'$owner'::uuid"
    if [[ $fn == mark_write ]]; then args+=",'1FixtureFolderABC','fixture.py',repeat('a',64)"; fi
    if sql -q -c "set role $role; select public.capital_ai_drive_lock_$fn($args);" >/dev/null 2>&1; then
      echo 'FAIL unauthorized RPC'; exit 1
    fi
  done
  if sql -q -c "set role $role; select * from capital_ai_drive_lock.exclusive_create;" >/dev/null 2>&1; then
    echo 'FAIL unauthorized table read'; exit 1
  fi
done
[[ $(rpc release "$owner") == t ]]
[[ $(rpc acquire "$other") == t ]]
[[ $(rpc release "$owner") == f ]]
[[ $(rpc release "$other") == t ]]
[[ $(sql -Atq -c 'select count(*) from capital_ai_drive_lock.exclusive_create') == 0 ]]
echo 'DRIVE_CREATE_LEASE_PG17=PASS'
