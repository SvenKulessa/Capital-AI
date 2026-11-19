-- CAPITAL-AI Agent Operations Pilot: server-only, durable synthetic usage/evidence.
-- No production execution or provider binding is authorized by this migration.
-- Apply ONLY in an approved isolated environment with restore evidence.
-- This single-RPC transaction serializes all writes for one verified user.
create table if not exists public.agent_operations_pilot_runs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  day_utc date not null,
  tier text not null check (tier in ('starter','pro','enterprise')),
  workflow_id text not null check (workflow_id in ('ci-evidence','credential-expiry','media-rights')),
  idempotency_key text not null check (idempotency_key ~ '^[A-Za-z0-9_-]{12,64}$'),
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  receipt jsonb not null check (pg_catalog.jsonb_typeof(receipt) = 'object'),
  receipt_sha256 text not null check (receipt_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  production_eligible boolean not null default false check (production_eligible = false),
  unique (user_id, idempotency_key)
);
create index if not exists agent_operations_pilot_user_day_idx
  on public.agent_operations_pilot_runs (user_id, day_utc, created_at desc);

alter table public.agent_operations_pilot_runs enable row level security;
revoke all on table public.agent_operations_pilot_runs from public, anon, authenticated, service_role;
-- Explicit deny for API roles, on top of revoked direct table grants.
create policy agent_operations_pilot_explicit_deny
  on public.agent_operations_pilot_runs
  for all to anon, authenticated using (false) with check (false);

create or replace function public.capital_ai_create_agent_pilot_run(
  _run_id uuid,
  _user_id uuid,
  _tier text,
  _workflow_id text,
  _idempotency_key text,
  _request_hash text,
  _receipt jsonb,
  _receipt_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_day date;
  v_limit integer;
  v_used integer;
  v_existing record;
begin
  if _run_id is null or _user_id is null
     or _tier is null or _tier not in ('starter','pro','enterprise')
     or _workflow_id is null or _workflow_id not in ('ci-evidence','credential-expiry','media-rights')
     or _idempotency_key is null or _idempotency_key !~ '^[A-Za-z0-9_-]{12,64}$'
     or _request_hash is null or _request_hash !~ '^[0-9a-f]{64}$'
     or _receipt_hash is null or _receipt_hash !~ '^[0-9a-f]{64}$'
     or _receipt is null or pg_catalog.jsonb_typeof(_receipt) <> 'object'
     or _receipt->>'id' is distinct from _run_id::text
     or _receipt->>'workflowId' is distinct from _workflow_id
     or _receipt->>'receiptSha256' is distinct from _receipt_hash
     or _receipt->>'executionStatus' is distinct from 'SYNTHETIC_LOCAL_COMPLETED'
     or _receipt->>'modelCalls' is distinct from '0'
     or _receipt->>'externalApiCalls' is distinct from '0'
     or _receipt ? 'userId'
     or _receipt ? 'tenantId'
     or pg_catalog.octet_length(_receipt::text) > 16384
  then
    raise exception using errcode='22023', message='INVALID_AGENT_PILOT_RECORD';
  end if;

  -- A lock by user (rather than by process or day) handles concurrent
  -- instances, retries and even UTC midnight rollovers in one DB transaction.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(_user_id::text, 0));

  select request_hash, receipt, receipt_sha256
    into v_existing
    from public.agent_operations_pilot_runs
   where user_id = _user_id and idempotency_key = _idempotency_key;
  if found then
    if v_existing.request_hash <> _request_hash then
      return pg_catalog.jsonb_build_object('state', 'conflict');
    end if;
    return pg_catalog.jsonb_build_object(
      'state', 'replayed', 'receipt', v_existing.receipt,
      'receiptSha256', v_existing.receipt_sha256
    );
  end if;

  v_day := pg_catalog.timezone('UTC', pg_catalog.clock_timestamp())::date;
  v_limit := case _tier when 'starter' then 2 when 'pro' then 10 else 30 end;
  select pg_catalog.count(*)::integer into v_used
    from public.agent_operations_pilot_runs
   where user_id = _user_id and day_utc = v_day;

  if v_used >= v_limit then
    return pg_catalog.jsonb_build_object(
      'state', 'quota_exceeded', 'used', v_used, 'dailyLimit', v_limit
    );
  end if;

  insert into public.agent_operations_pilot_runs (
    id, user_id, day_utc, tier, workflow_id, idempotency_key, request_hash,
    receipt, receipt_sha256
  ) values (
    _run_id, _user_id, v_day, _tier, _workflow_id, _idempotency_key,
    _request_hash, _receipt, _receipt_hash
  );
  return pg_catalog.jsonb_build_object(
    'state', 'created', 'receipt', _receipt, 'receiptSha256', _receipt_hash,
    'used', v_used + 1, 'dailyLimit', v_limit
  );
end;
$function$;

create or replace function public.capital_ai_get_agent_pilot_run(
  _user_id uuid, _run_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select pg_catalog.jsonb_build_object(
    'receipt', r.receipt, 'receiptSha256', r.receipt_sha256
  )
  from public.agent_operations_pilot_runs r
  where r.user_id = _user_id and r.id = _run_id;
$function$;

-- PostgreSQL defaults function EXECUTE to PUBLIC. Remove all API caller grants,
-- including Supabase's additional direct default ACLs, before granting service_role.
revoke all on function public.capital_ai_create_agent_pilot_run(
  uuid,uuid,text,text,text,text,jsonb,text
) from public, anon, authenticated, service_role;
revoke all on function public.capital_ai_get_agent_pilot_run(
  uuid,uuid
) from public, anon, authenticated, service_role;
grant execute on function public.capital_ai_create_agent_pilot_run(
  uuid,uuid,text,text,text,text,jsonb,text
) to service_role;
grant execute on function public.capital_ai_get_agent_pilot_run(
  uuid,uuid
) to service_role;
