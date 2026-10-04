-- FT-6A / ADR-0099 -- deterministic OrderIntent decision binding + typed reconciliation.
--
-- Source input: FinTech Enterprise Orchestration Modell (Google Drive, 2026-08-20).
-- This migration prepares private persistence only. It does NOT add exchange/custody execution,
-- browser access, a second queue, a second scoring authority or a policy authority.
-- GUARDED_LIVE/PRODUCTION remain blocked by application contracts.

begin;

alter table fintech_core.order_intents
  add column if not exists binding_version text,
  add column if not exists client_order_id text,
  add column if not exists risk_decision_id text,
  add column if not exists risk_decision_output_hash text,
  add column if not exists compliance_decision_id text,
  add column if not exists compliance_decision_output_hash text;

comment on column fintech_core.order_intents.binding_version is
  'FT-6 decision-to-intent binding contract version. NULL identifies legacy FT-3 scaffold rows.';
comment on column fintech_core.order_intents.client_order_id is
  'Deterministic client-side order identity. No venue execution authority is implied.';
comment on column fintech_core.order_intents.risk_decision_id is
  'Referenced append-only PRE_TRADE_RISK_GATE decision used to derive APPROVED.';
comment on column fintech_core.order_intents.risk_decision_output_hash is
  'Expected output hash of the referenced FT-5 risk decision, bound into intent_hash.';
comment on column fintech_core.order_intents.compliance_decision_id is
  'Referenced append-only PRE_TRADE_COMPLIANCE_GATE decision used to derive APPROVED.';
comment on column fintech_core.order_intents.compliance_decision_output_hash is
  'Expected output hash of the referenced FT-5 compliance decision, bound into intent_hash.';

create unique index if not exists order_intents_client_order_id_unique_idx
  on fintech_core.order_intents (client_order_id)
  where client_order_id is not null;

create index if not exists order_intents_risk_decision_idx
  on fintech_core.order_intents (risk_decision_id)
  where risk_decision_id is not null;
create index if not exists order_intents_compliance_decision_idx
  on fintech_core.order_intents (compliance_decision_id)
  where compliance_decision_id is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'order_intents_risk_decision_fkey'
      and conrelid = 'fintech_core.order_intents'::regclass
  ) then
    alter table fintech_core.order_intents
      add constraint order_intents_risk_decision_fkey
      foreign key (risk_decision_id)
      references fintech_core.decision_records (decision_id)
      on update restrict on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'order_intents_compliance_decision_fkey'
      and conrelid = 'fintech_core.order_intents'::regclass
  ) then
    alter table fintech_core.order_intents
      add constraint order_intents_compliance_decision_fkey
      foreign key (compliance_decision_id)
      references fintech_core.decision_records (decision_id)
      on update restrict on delete restrict;
  end if;
end;
$$;

create or replace function public.fintech_core_append_bound_order_intent_v1(
  p_order_intent_id text,
  p_contract_version text,
  p_binding_version text,
  p_run_id text,
  p_trace_id text,
  p_correlation_id text,
  p_client_order_id text,
  p_idempotency_key text,
  p_asset_id text,
  p_side text,
  p_quantity numeric,
  p_order_type text,
  p_limit_price numeric,
  p_max_slippage_bps numeric,
  p_strategy_id text,
  p_portfolio_id text,
  p_decision_version text,
  p_risk_decision_id text,
  p_risk_decision_output_hash text,
  p_compliance_decision_id text,
  p_compliance_decision_output_hash text,
  p_created_at timestamptz,
  p_expires_at timestamptz,
  p_intent_hash text,
  p_effect_class text,
  p_evidence_refs jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_run fintech_core.workflow_runs%rowtype;
  v_risk fintech_core.decision_records%rowtype;
  v_compliance fintech_core.decision_records%rowtype;
  v_inserted integer;
  v_collision_count bigint;
  v_all_match boolean;
begin
  if btrim(coalesce(p_binding_version, '')) = ''
     or btrim(coalesce(p_client_order_id, '')) = ''
     or btrim(coalesce(p_idempotency_key, '')) = ''
     or btrim(coalesce(p_intent_hash, '')) = '' then
    raise exception 'FT-6 bound OrderIntent requires binding/client/idempotency/hash identity';
  end if;

  if p_effect_class <> 'SIDE_EFFECTING' then
    raise exception 'FT-6 bound OrderIntent effect_class must remain SIDE_EFFECTING';
  end if;
  if p_quantity <= 0 or p_max_slippage_bps < 0 or p_max_slippage_bps > 10000 then
    raise exception 'FT-6 bound OrderIntent quantity/slippage bounds invalid';
  end if;
  if p_limit_price is not null and p_limit_price <= 0 then
    raise exception 'FT-6 bound OrderIntent limit_price must be positive when present';
  end if;
  if p_order_type in ('LIMIT', 'POST_ONLY') and p_limit_price is null then
    raise exception 'FT-6 LIMIT/POST_ONLY OrderIntent requires limit_price';
  end if;
  if p_expires_at <= p_created_at then
    raise exception 'FT-6 bound OrderIntent expires_at must be after created_at';
  end if;

  select * into v_run
    from fintech_core.workflow_runs
   where run_id = p_run_id;
  if not found then
    raise exception 'FT-6 workflow run not found: %', p_run_id;
  end if;
  if v_run.operating_mode <> 'PAPER' then
    raise exception 'FT-6A OrderIntent persistence is PAPER-only; run % is %', p_run_id, v_run.operating_mode;
  end if;
  if v_run.trace_id <> p_trace_id
     or v_run.correlation_id <> p_correlation_id
     or v_run.asset_id <> p_asset_id
     or v_run.decision_version <> p_decision_version
     or v_run.strategy_id is distinct from p_strategy_id
     or v_run.portfolio_id is distinct from p_portfolio_id then
    raise exception 'FT-6 OrderIntent workflow identity mismatch for run %', p_run_id;
  end if;

  select * into v_risk
    from fintech_core.decision_records
   where decision_id = p_risk_decision_id;
  if not found then
    raise exception 'FT-6 risk decision not found: %', p_risk_decision_id;
  end if;
  if v_risk.decision_type <> 'PRE_TRADE_RISK_GATE'
     or v_risk.outcome <> 'APPROVED'
     or v_risk.output_hash <> p_risk_decision_output_hash
     or v_risk.run_id <> p_run_id
     or v_risk.trace_id <> p_trace_id
     or v_risk.correlation_id <> p_correlation_id
     or v_risk.module_id <> v_run.module_id
     or v_risk.asset_id <> p_asset_id
     or v_risk.decision_version <> p_decision_version
     or v_risk.decided_at > p_created_at then
    raise exception 'FT-6 risk decision is not an approved, hash-bound decision for this workflow';
  end if;

  select * into v_compliance
    from fintech_core.decision_records
   where decision_id = p_compliance_decision_id;
  if not found then
    raise exception 'FT-6 compliance decision not found: %', p_compliance_decision_id;
  end if;
  if v_compliance.decision_type <> 'PRE_TRADE_COMPLIANCE_GATE'
     or v_compliance.outcome <> 'APPROVED'
     or v_compliance.output_hash <> p_compliance_decision_output_hash
     or v_compliance.run_id <> p_run_id
     or v_compliance.trace_id <> p_trace_id
     or v_compliance.correlation_id <> p_correlation_id
     or v_compliance.module_id <> v_run.module_id
     or v_compliance.asset_id <> p_asset_id
     or v_compliance.decision_version <> p_decision_version
     or v_compliance.decided_at > p_created_at then
    raise exception 'FT-6 compliance decision is not an approved, hash-bound decision for this workflow';
  end if;

  insert into fintech_core.order_intents (
    order_intent_id, contract_version, binding_version, run_id, trace_id, correlation_id,
    client_order_id, idempotency_key, asset_id, side, quantity, order_type, limit_price,
    max_slippage_bps, strategy_id, portfolio_id, decision_version,
    risk_approval, compliance_approval, risk_decision_id, risk_decision_output_hash,
    compliance_decision_id, compliance_decision_output_hash, expires_at, intent_hash,
    effect_class, created_at, evidence_refs
  ) values (
    p_order_intent_id, p_contract_version, p_binding_version, p_run_id, p_trace_id, p_correlation_id,
    p_client_order_id, p_idempotency_key, p_asset_id, p_side, p_quantity, p_order_type, p_limit_price,
    p_max_slippage_bps, p_strategy_id, p_portfolio_id, p_decision_version,
    'APPROVED', 'APPROVED', p_risk_decision_id, p_risk_decision_output_hash,
    p_compliance_decision_id, p_compliance_decision_output_hash, p_expires_at, p_intent_hash,
    p_effect_class, p_created_at, coalesce(p_evidence_refs, '[]'::jsonb)
  )
  on conflict do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 1 then
    return true;
  end if;

  select count(*), coalesce(bool_and(
    order_intent_id = p_order_intent_id
    and contract_version = p_contract_version
    and binding_version = p_binding_version
    and run_id = p_run_id
    and trace_id = p_trace_id
    and correlation_id = p_correlation_id
    and client_order_id = p_client_order_id
    and idempotency_key = p_idempotency_key
    and asset_id = p_asset_id
    and side = p_side
    and quantity = p_quantity
    and order_type = p_order_type
    and limit_price is not distinct from p_limit_price
    and max_slippage_bps = p_max_slippage_bps
    and strategy_id is not distinct from p_strategy_id
    and portfolio_id is not distinct from p_portfolio_id
    and decision_version = p_decision_version
    and risk_approval = 'APPROVED'
    and compliance_approval = 'APPROVED'
    and risk_decision_id = p_risk_decision_id
    and risk_decision_output_hash = p_risk_decision_output_hash
    and compliance_decision_id = p_compliance_decision_id
    and compliance_decision_output_hash = p_compliance_decision_output_hash
    and created_at = p_created_at
    and expires_at = p_expires_at
    and intent_hash = p_intent_hash
    and effect_class = p_effect_class
    and evidence_refs = coalesce(p_evidence_refs, '[]'::jsonb)
  ), false)
  into v_collision_count, v_all_match
  from fintech_core.order_intents
  where order_intent_id = p_order_intent_id
     or idempotency_key = p_idempotency_key
     or client_order_id = p_client_order_id;

  if v_collision_count = 1 and v_all_match then
    return false;
  end if;

  raise exception 'FT-6 OrderIntent identity/idempotency/client-order collision';
end;
$$;

create or replace function public.fintech_core_append_reconciliation_record_v1(
  p_reconciliation_id text,
  p_run_id text,
  p_trace_id text,
  p_correlation_id text,
  p_order_intent_id text,
  p_reconciliation_type text,
  p_status text,
  p_source_system text,
  p_target_system text,
  p_asset_id text,
  p_observed_at timestamptz,
  p_input_hash text,
  p_output_hash text,
  p_evidence_refs jsonb,
  p_details jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_intent fintech_core.order_intents%rowtype;
  v_existing fintech_core.reconciliation_records%rowtype;
  v_inserted integer;
begin
  if p_reconciliation_type not in ('ORDER_INTENT_DECISION_BINDING', 'ORDER_INTENT_PAPER_FILL') then
    raise exception 'FT-6 unsupported reconciliation_type: %', p_reconciliation_type;
  end if;
  if p_status not in ('MATCHED', 'MISMATCH', 'PENDING', 'NOT_COMPUTABLE') then
    raise exception 'FT-6 unsupported reconciliation status: %', p_status;
  end if;
  if btrim(coalesce(p_input_hash, '')) = '' or btrim(coalesce(p_output_hash, '')) = '' then
    raise exception 'FT-6 reconciliation hashes are required';
  end if;

  select * into v_intent
    from fintech_core.order_intents
   where order_intent_id = p_order_intent_id;
  if not found then
    raise exception 'FT-6 reconciliation OrderIntent not found: %', p_order_intent_id;
  end if;
  if v_intent.run_id <> p_run_id
     or v_intent.trace_id <> p_trace_id
     or v_intent.correlation_id <> p_correlation_id
     or v_intent.asset_id <> p_asset_id then
    raise exception 'FT-6 reconciliation identity does not match OrderIntent %', p_order_intent_id;
  end if;

  if p_reconciliation_type = 'ORDER_INTENT_DECISION_BINDING'
     and (p_source_system <> 'fintech_core.decision_records'
          or p_target_system <> 'fintech_core.order_intents') then
    raise exception 'FT-6 decision-binding reconciliation source/target mismatch';
  end if;

  insert into fintech_core.reconciliation_records (
    reconciliation_id, run_id, trace_id, correlation_id, order_intent_id,
    reconciliation_type, status, source_system, target_system, asset_id,
    observed_at, input_hash, output_hash, evidence_refs, details
  ) values (
    p_reconciliation_id, p_run_id, p_trace_id, p_correlation_id, p_order_intent_id,
    p_reconciliation_type, p_status, p_source_system, p_target_system, p_asset_id,
    p_observed_at, p_input_hash, p_output_hash, coalesce(p_evidence_refs, '[]'::jsonb),
    coalesce(p_details, '{}'::jsonb)
  )
  on conflict (reconciliation_id) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 1 then
    return true;
  end if;

  select * into v_existing
    from fintech_core.reconciliation_records
   where reconciliation_id = p_reconciliation_id;

  if found
     and v_existing.run_id = p_run_id
     and v_existing.trace_id = p_trace_id
     and v_existing.correlation_id = p_correlation_id
     and v_existing.order_intent_id = p_order_intent_id
     and v_existing.reconciliation_type = p_reconciliation_type
     and v_existing.status = p_status
     and v_existing.source_system = p_source_system
     and v_existing.target_system = p_target_system
     and v_existing.asset_id is not distinct from p_asset_id
     and v_existing.observed_at = p_observed_at
     and v_existing.input_hash = p_input_hash
     and v_existing.output_hash = p_output_hash
     and v_existing.evidence_refs = coalesce(p_evidence_refs, '[]'::jsonb)
     and v_existing.details = coalesce(p_details, '{}'::jsonb) then
    return false;
  end if;

  raise exception 'FT-6 reconciliation_id collision with non-identical record: %', p_reconciliation_id;
end;
$$;

revoke all on function public.fintech_core_append_bound_order_intent_v1(
  text, text, text, text, text, text, text, text, text, text, numeric, text, numeric, numeric,
  text, text, text, text, text, text, text, timestamptz, timestamptz, text, text, jsonb
) from PUBLIC, anon, authenticated;
grant execute on function public.fintech_core_append_bound_order_intent_v1(
  text, text, text, text, text, text, text, text, text, text, numeric, text, numeric, numeric,
  text, text, text, text, text, text, text, timestamptz, timestamptz, text, text, jsonb
) to service_role;

revoke all on function public.fintech_core_append_reconciliation_record_v1(
  text, text, text, text, text, text, text, text, text, text, timestamptz, text, text, jsonb, jsonb
) from PUBLIC, anon, authenticated;
grant execute on function public.fintech_core_append_reconciliation_record_v1(
  text, text, text, text, text, text, text, text, text, text, timestamptz, text, text, jsonb, jsonb
) to service_role;

commit;
