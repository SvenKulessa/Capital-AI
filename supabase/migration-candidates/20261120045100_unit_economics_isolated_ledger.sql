-- CAPITAL-AI Unit Economics: isolated PostgreSQL 17 source-only ledger CANDIDATE.
-- NOT part of production supabase/migrations. No automatic deploy or promotion.
-- The caller is a verified server-side service role; SQL tenant IDs MUST derive from auth.verify, never the browser.
-- All values are synthetic/reconciled-but-unattested: never use as recognized accounting revenue.
begin;

create schema if not exists capital_ai_ue;
revoke all on schema capital_ai_ue from public, anon, authenticated, service_role;
grant usage on schema capital_ai_ue to service_role;

create table capital_ai_ue.snapshots (
  snapshot_id uuid primary key,
  tenant_id uuid not null references auth.users(id) on update restrict on delete restrict,
  idempotency_key text not null check (idempotency_key ~ '^[A-Za-z0-9_-]{12,64}$'),
  request_sha256 text not null check (request_sha256 ~ '^[a-f0-9]{64}$'),
  source_snapshot_sha256 text not null check (source_snapshot_sha256 ~ '^[a-f0-9]{64}$'),
  product text not null check (product ~ '^[a-z][a-z0-9_-]{1,63}$'),
  period_start timestamptz not null,
  period_end timestamptz not null,
  currency text not null default 'EUR' check (currency='EUR'),
  net_cash_minor bigint not null check (net_cash_minor between -9007199254740991 and 9007199254740991),
  stripe_fees_minor bigint not null check (stripe_fees_minor between 0 and 9007199254740991),
  inference_minor bigint not null check (inference_minor between 0 and 9007199254740991),
  tools_minor bigint not null check (tools_minor between 0 and 9007199254740991),
  successful_runs integer not null check (successful_runs >= 0),
  failed_runs integer not null check (failed_runs >= 0),
  provenance text not null default 'SYNTHETIC_ISOLATED' check (provenance = 'SYNTHETIC_ISOLATED'),
  accounting_eligible boolean not null default false check (accounting_eligible = false),
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  constraint ue_period check (period_start < period_end),
  constraint ue_tenant_key unique (tenant_id,idempotency_key),
  constraint ue_tenant_source unique (tenant_id,source_snapshot_sha256),
  constraint ue_tenant_snapshot unique (tenant_id,snapshot_id)
);
create table capital_ai_ue.run_allocations (
  tenant_id uuid not null,
  snapshot_id uuid not null,
  run_id uuid not null,
  execution_status text not null check (execution_status in ('SUCCEEDED','FAILED')),
  inference_minor bigint not null check (inference_minor between 0 and 9007199254740991),
  tools_minor bigint not null check (tools_minor between 0 and 9007199254740991),
  evidence_sha256 text not null check (evidence_sha256 ~ '^[a-f0-9]{64}$'),
  constraint ue_run_pk primary key (tenant_id,run_id),
  constraint ue_run_evidence_unique unique (tenant_id,evidence_sha256),
  constraint ue_run_parent foreign key (tenant_id,snapshot_id)
    references capital_ai_ue.snapshots(tenant_id,snapshot_id) on update restrict on delete restrict
);
create table capital_ai_ue.reversals (
  tenant_id uuid not null,
  snapshot_id uuid not null,
  reversal_key text not null check (reversal_key ~ '^[A-Za-z0-9_-]{12,64}$'),
  reason_sha256 text not null check (reason_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  constraint ue_reversal_pk primary key (tenant_id,snapshot_id),
  constraint ue_reversal_key_unique unique (tenant_id,reversal_key),
  constraint ue_reversal_parent foreign key (tenant_id,snapshot_id)
    references capital_ai_ue.snapshots(tenant_id,snapshot_id) on update restrict on delete restrict
);

alter table capital_ai_ue.snapshots enable row level security;
alter table capital_ai_ue.run_allocations enable row level security;
alter table capital_ai_ue.reversals enable row level security;
-- Explicit denial even if a later operator accidentally grants direct table SELECT.
create policy ue_deny_snapshots on capital_ai_ue.snapshots for all to anon,authenticated,service_role
  using (false) with check (false);
create policy ue_deny_runs on capital_ai_ue.run_allocations for all to anon,authenticated,service_role
  using (false) with check (false);
create policy ue_deny_reversals on capital_ai_ue.reversals for all to anon,authenticated,service_role
  using (false) with check (false);
revoke all on all tables in schema capital_ai_ue from public, anon, authenticated, service_role;

-- Security definer is necessary because direct table privileges are denied.
-- Empty search_path, qualified objects, service_role-only EXECUTE and no exposed public RPC.
create function capital_ai_ue.record_snapshot(
  _snapshot_id uuid, _tenant_id uuid, _key text, _request_sha text,
  _source_sha text, _product text, _start timestamptz, _end timestamptz,
  _cash bigint, _fees bigint, _inference bigint, _tools bigint,
  _success integer, _failed integer, _runs jsonb
) returns jsonb language plpgsql security definer set search_path = ''
as $fn$
declare
  v_row capital_ai_ue.snapshots%rowtype;
  v_item jsonb;
  v_run uuid;
  v_inference bigint := 0;
  v_tools bigint := 0;
  v_success integer := 0;
  v_failed integer := 0;
  v_count integer;
  v_i bigint;
  v_t bigint;
begin
  if _snapshot_id is null or _tenant_id is null
     or _key is null or _key !~ '^[A-Za-z0-9_-]{12,64}$'
     or _request_sha is null or _request_sha !~ '^[a-f0-9]{64}$'
     or _source_sha is null or _source_sha !~ '^[a-f0-9]{64}$'
     or _product is null or _product !~ '^[a-z][a-z0-9_-]{1,63}$'
     or _start is null or _end is null or _start >= _end
     or _cash is null or _cash not between -9007199254740991 and 9007199254740991
     or _fees is null or _fees not between 0 and 9007199254740991
     or _inference is null or _inference not between 0 and 9007199254740991
     or _tools is null or _tools not between 0 and 9007199254740991
     or _success is null or _success < 0 or _failed is null or _failed < 0
     or _runs is null or pg_catalog.jsonb_typeof(_runs) <> 'array'
     or pg_catalog.octet_length(_runs::text) > 32768
  then
    raise exception using errcode='22023',message='UE_INVALID_INPUT';
  end if;
  v_count := pg_catalog.jsonb_array_length(_runs);
  if v_count > 100 or v_count <> _success + _failed then
    raise exception using errcode='22023',message='UE_INVALID_RUN_COUNT';
  end if;
  for v_item in select value from pg_catalog.jsonb_array_elements(_runs) as a(value) loop
    if pg_catalog.jsonb_typeof(v_item) <> 'object'
       or (select count(*) from pg_catalog.jsonb_object_keys(v_item)) <> 5
       or not (v_item ? 'runId' and v_item ? 'status'
               and v_item ? 'inferenceMinor' and v_item ? 'toolsMinor' and v_item ? 'evidenceHash')
       or coalesce(v_item->>'runId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or coalesce(v_item->>'status','') not in ('SUCCEEDED','FAILED')
       or pg_catalog.jsonb_typeof(v_item->'inferenceMinor') <> 'number'
       or pg_catalog.jsonb_typeof(v_item->'toolsMinor') <> 'number'
       or coalesce(v_item->>'inferenceMinor','') !~ '^[0-9]{1,16}$'
       or coalesce(v_item->>'toolsMinor','') !~ '^[0-9]{1,16}$'
       or coalesce(v_item->>'evidenceHash','') !~ '^[a-f0-9]{64}$'
    then
      raise exception using errcode='22023',message='UE_INVALID_RUN';
    end if;
    v_run := (v_item->>'runId')::uuid;
    v_i := (v_item->>'inferenceMinor')::bigint;
    v_t := (v_item->>'toolsMinor')::bigint;
    if v_i > 9007199254740991 or v_t > 9007199254740991 then
      raise exception using errcode='22023',message='UE_INVALID_CENTS';
    end if;
    v_inference := v_inference + v_i;
    v_tools := v_tools + v_t;
    if v_item->>'status'='SUCCEEDED' then v_success := v_success + 1;
    else v_failed := v_failed + 1; end if;
  end loop;
  if v_inference <> _inference or v_tools <> _tools or v_success <> _success or v_failed <> _failed then
    raise exception using errcode='22023',message='UE_COST_TOTAL_MISMATCH';
  end if;

  -- All idempotency and reversal writes for one tenant serialize within one
  -- PostgreSQL transaction; retries after commit are deterministic.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(_tenant_id::text, 551));
  select * into v_row from capital_ai_ue.snapshots
    where tenant_id=_tenant_id and idempotency_key=_key;
  if found then
    if v_row.request_sha256 <> _request_sha or v_row.source_snapshot_sha256 <> _source_sha
       or v_row.product <> _product or v_row.period_start <> _start or v_row.period_end <> _end
       or v_row.net_cash_minor <> _cash or v_row.stripe_fees_minor <> _fees
       or v_row.inference_minor <> _inference or v_row.tools_minor <> _tools
       or v_row.successful_runs <> _success or v_row.failed_runs <> _failed
    then
      return pg_catalog.jsonb_build_object('state','conflict');
    end if;
    if exists(select 1 from capital_ai_ue.reversals
      where tenant_id=_tenant_id and snapshot_id=v_row.snapshot_id) then
      return pg_catalog.jsonb_build_object('state','reversed','snapshotId',v_row.snapshot_id);
    end if;
    return pg_catalog.jsonb_build_object('state','replayed','snapshotId',v_row.snapshot_id);
  end if;
  select * into v_row from capital_ai_ue.snapshots
    where tenant_id=_tenant_id and source_snapshot_sha256=_source_sha;
  if found then
    if v_row.request_sha256 <> _request_sha then
      return pg_catalog.jsonb_build_object('state','conflict');
    end if;
    return pg_catalog.jsonb_build_object('state','duplicate_source','snapshotId',v_row.snapshot_id);
  end if;

  insert into capital_ai_ue.snapshots(
    snapshot_id,tenant_id,idempotency_key,request_sha256,source_snapshot_sha256,
    product,period_start,period_end,net_cash_minor,stripe_fees_minor,inference_minor,
    tools_minor,successful_runs,failed_runs
  ) values (
    _snapshot_id,_tenant_id,_key,_request_sha,_source_sha,_product,_start,_end,
    _cash,_fees,_inference,_tools,_success,_failed
  );
  for v_item in select value from pg_catalog.jsonb_array_elements(_runs) as a(value) loop
    insert into capital_ai_ue.run_allocations (
      tenant_id,snapshot_id,run_id,execution_status,inference_minor,tools_minor,evidence_sha256
    ) values (
      _tenant_id,_snapshot_id,(v_item->>'runId')::uuid,v_item->>'status',
      (v_item->>'inferenceMinor')::bigint,(v_item->>'toolsMinor')::bigint,
      v_item->>'evidenceHash'
    );
  end loop;
  return pg_catalog.jsonb_build_object('state','created','snapshotId',_snapshot_id);
end;
$fn$;

create function capital_ai_ue.reverse_snapshot(
  _tenant_id uuid, _snapshot_id uuid, _key text, _reason_sha text
) returns jsonb language plpgsql security definer set search_path = ''
as $fn$
declare v_row capital_ai_ue.reversals%rowtype;
begin
  if _tenant_id is null or _snapshot_id is null
     or _key is null or _key !~ '^[A-Za-z0-9_-]{12,64}$'
     or _reason_sha is null or _reason_sha !~ '^[a-f0-9]{64}$'
  then raise exception using errcode='22023',message='UE_INVALID_REVERSAL'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(_tenant_id::text, 551));
  if not exists(select 1 from capital_ai_ue.snapshots
    where tenant_id=_tenant_id and snapshot_id=_snapshot_id) then
    return pg_catalog.jsonb_build_object('state','not_found');
  end if;
  select * into v_row from capital_ai_ue.reversals
    where tenant_id=_tenant_id and snapshot_id=_snapshot_id;
  if found then
    if v_row.reversal_key=_key and v_row.reason_sha256=_reason_sha then
      return pg_catalog.jsonb_build_object('state','replayed');
    end if;
    return pg_catalog.jsonb_build_object('state','conflict');
  end if;
  if exists(select 1 from capital_ai_ue.reversals
    where tenant_id=_tenant_id and reversal_key=_key) then
    return pg_catalog.jsonb_build_object('state','conflict');
  end if;
  insert into capital_ai_ue.reversals(tenant_id,snapshot_id,reversal_key,reason_sha256)
    values (_tenant_id,_snapshot_id,_key,_reason_sha);
  return pg_catalog.jsonb_build_object('state','reversed');
end;
$fn$;

create function capital_ai_ue.read_snapshot(_tenant_id uuid,_snapshot_id uuid)
returns jsonb language sql stable security definer set search_path = ''
as $fn$
  select pg_catalog.jsonb_build_object(
    'snapshotId',s.snapshot_id,
    'product',s.product,'periodStart',s.period_start,'periodEnd',s.period_end,
    'netCashMinor',s.net_cash_minor,'stripeFeesMinor',s.stripe_fees_minor,
    'inferenceMinor',s.inference_minor,'toolsMinor',s.tools_minor,
    'successfulRuns',s.successful_runs,'failedRuns',s.failed_runs,
    'sourceSnapshotSha256',s.source_snapshot_sha256,
    'accountingEligible',s.accounting_eligible,
    'state',case when r.snapshot_id is null then 'active' else 'reversed' end
  )
  from capital_ai_ue.snapshots s
  left join capital_ai_ue.reversals r on r.tenant_id=s.tenant_id and r.snapshot_id=s.snapshot_id
  where s.tenant_id=_tenant_id and s.snapshot_id=_snapshot_id;
$fn$;

revoke all on function capital_ai_ue.record_snapshot(uuid,uuid,text,text,text,text,timestamptz,timestamptz,bigint,bigint,bigint,bigint,integer,integer,jsonb) from public,anon,authenticated,service_role;
revoke all on function capital_ai_ue.reverse_snapshot(uuid,uuid,text,text) from public,anon,authenticated,service_role;
revoke all on function capital_ai_ue.read_snapshot(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function capital_ai_ue.record_snapshot(uuid,uuid,text,text,text,text,timestamptz,timestamptz,bigint,bigint,bigint,bigint,integer,integer,jsonb) to service_role;
grant execute on function capital_ai_ue.reverse_snapshot(uuid,uuid,text,text) to service_role;
grant execute on function capital_ai_ue.read_snapshot(uuid,uuid) to service_role;

commit;
