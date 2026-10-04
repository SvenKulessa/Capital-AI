-- FT-6B / ADR-0099 -- canonical fixed-point OrderIntent + typed reconciliation persistence.
-- Additive evolution only: existing fintech_core tables, append-only semantics and public.outbox_jobs remain canonical.
-- This repository migration does not itself authorize or perform a production mutation.

begin;

alter table fintech_core.order_intents
  add column if not exists order_intent_contract_version text,
  add column if not exists quantity_fixed jsonb,
  add column if not exists price_bounds jsonb,
  add column if not exists risk_policy_id text,
  add column if not exists risk_policy_version text,
  add column if not exists compliance_policy_id text,
  add column if not exists compliance_policy_version text;

alter table fintech_core.reconciliation_records
  add column if not exists reconciliation_contract_version text,
  add column if not exists client_order_id text,
  add column if not exists venue_order_id text,
  add column if not exists settlement_state text,
  add column if not exists expected_quantity jsonb,
  add column if not exists observed_quantity jsonb,
  add column if not exists expected_price_bounds jsonb,
  add column if not exists observed_execution_price jsonb,
  add column if not exists fee_evidence jsonb,
  add column if not exists reconciled_at timestamptz,
  add column if not exists supervisor_escalation_required boolean not null default false;

comment on column fintech_core.order_intents.quantity_fixed is
  'Canonical FinTechCore atoms:string + scale:number quantity. Legacy numeric quantity remains a compatibility projection only.';
comment on column fintech_core.order_intents.price_bounds is
  'Canonical fixed-point price bounds. Legacy limit_price remains a compatibility projection only.';
comment on column fintech_core.reconciliation_records.supervisor_escalation_required is
  'True for unresolved MISMATCH evidence. No autonomous remediation is implied.';

create or replace function fintech_core.fixed_point_numeric_v1(
  p_value jsonb,
  p_field text,
  p_allow_zero boolean default false
)
returns numeric
language plpgsql
immutable
security invoker
set search_path = pg_catalog
as $$
declare
  v_atoms_text text;
  v_scale integer;
  v_value numeric;
begin
  if p_value is null or jsonb_typeof(p_value) <> 'object' then
    raise exception 'FT-6 fixed-point % must be a JSON object', p_field;
  end if;
  v_atoms_text := p_value ->> 'atoms';
  if v_atoms_text is null or v_atoms_text !~ '^-?(0|[1-9][0-9]*)$' then
    raise exception 'FT-6 fixed-point %.atoms must be a canonical integer string', p_field;
  end if;
  begin
    v_scale := (p_value ->> 'scale')::integer;
  exception when others then
    raise exception 'FT-6 fixed-point %.scale must be an integer', p_field;
  end;
  if v_scale < 0 or v_scale > 18 then
    raise exception 'FT-6 fixed-point %.scale must be between 0 and 18', p_field;
  end if;
  v_value := v_atoms_text::numeric / power(10::numeric, v_scale);
  if v_value < 0 or (not p_allow_zero and v_value = 0) then
    raise exception 'FT-6 fixed-point % must be positive', p_field;
  end if;
  return v_value;
end;
$$;

revoke all on function fintech_core.fixed_point_numeric_v1(jsonb, text, boolean)
  from PUBLIC, anon, authenticated;
grant execute on function fintech_core.fixed_point_numeric_v1(jsonb, text, boolean)
  to service_role;

create or replace function public.fintech_core_append_order_intent_v2(
  p_order_intent_id text,
  p_contract_version text,
  p_order_intent_contract_version text,
  p_binding_version text,
  p_run_id text,
  p_trace_id text,
  p_correlation_id text,
  p_client_order_id text,
  p_idempotency_key text,
  p_asset_id text,
  p_side text,
  p_quantity_fixed jsonb,
  p_order_type text,
  p_price_bounds jsonb,
  p_max_slippage_bps numeric,
  p_strategy_id text,
  p_portfolio_id text,
  p_decision_version text,
  p_risk_decision_id text,
  p_risk_decision_hash text,
  p_risk_policy_id text,
  p_risk_policy_version text,
  p_compliance_decision_id text,
  p_compliance_decision_hash text,
  p_compliance_policy_id text,
  p_compliance_policy_version text,
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
  v_quantity numeric;
  v_limit_price numeric;
  v_inserted integer;
  v_collision_count bigint;
  v_all_match boolean;
begin
  if btrim(coalesce(p_order_intent_contract_version, '')) = ''
     or btrim(coalesce(p_binding_version, '')) = ''
     or btrim(coalesce(p_client_order_id, '')) = ''
     or btrim(coalesce(p_idempotency_key, '')) = ''
     or btrim(coalesce(p_intent_hash, '')) = '' then
    raise exception 'FT-6 BOUND OrderIntent identity/version/hash fields are required';
  end if;
  if p_effect_class <> 'SIDE_EFFECTING' then
    raise exception 'FT-6 OrderIntent effect_class must remain SIDE_EFFECTING';
  end if;
  if p_max_slippage_bps is null or p_max_slippage_bps <> trunc(p_max_slippage_bps)
     or p_max_slippage_bps < 0 or p_max_slippage_bps > 10000 then
    raise exception 'FT-6 OrderIntent max_slippage_bps must be an integer in [0,10000]';
  end if;
  if p_price_bounds is null or jsonb_typeof(p_price_bounds) <> 'object' then
    raise exception 'FT-6 OrderIntent price_bounds must be a JSON object';
  end if;

  v_quantity := fintech_core.fixed_point_numeric_v1(p_quantity_fixed, 'quantity', false);
  if p_price_bounds ? 'limitPrice' and p_price_bounds -> 'limitPrice' is not null then
    v_limit_price := fintech_core.fixed_point_numeric_v1(p_price_bounds -> 'limitPrice', 'priceBounds.limitPrice', false);
  end if;
  if p_price_bounds ? 'minPrice' and p_price_bounds -> 'minPrice' is not null then
    perform fintech_core.fixed_point_numeric_v1(p_price_bounds -> 'minPrice', 'priceBounds.minPrice', false);
  end if;
  if p_price_bounds ? 'maxPrice' and p_price_bounds -> 'maxPrice' is not null then
    perform fintech_core.fixed_point_numeric_v1(p_price_bounds -> 'maxPrice', 'priceBounds.maxPrice', false);
  end if;
  if p_order_type in ('LIMIT', 'POST_ONLY') and v_limit_price is null then
    raise exception 'FT-6 LIMIT/POST_ONLY OrderIntent requires priceBounds.limitPrice';
  end if;
  if p_expires_at <= p_created_at then
    raise exception 'FT-6 OrderIntent expires_at must be after created_at';
  end if;

  select * into v_run
    from fintech_core.workflow_runs
   where run_id = p_run_id;
  if not found then
    raise exception 'FT-6 workflow run not found: %', p_run_id;
  end if;
  if v_run.operating_mode <> 'PAPER' then
    raise exception 'FT-6 OrderIntent persistence is PAPER-only; run % is %', p_run_id, v_run.operating_mode;
  end if;
  if v_run.trace_id <> p_trace_id
     or v_run.correlation_id <> p_correlation_id
     or v_run.asset_id <> p_asset_id
     or v_run.decision_version <> p_decision_version
     or v_run.strategy_id is distinct from p_strategy_id
     or v_run.portfolio_id is distinct from p_portfolio_id then
    raise exception 'FT-6 OrderIntent workflow identity mismatch for run %', p_run_id;
  end if;

  select * into v_risk from fintech_core.decision_records where decision_id = p_risk_decision_id;
  if not found
     or v_risk.decision_type <> 'PRE_TRADE_RISK_GATE'
     or v_risk.outcome <> 'APPROVED'
     or v_risk.output_hash <> p_risk_decision_hash
     or v_risk.policy_id is distinct from p_risk_policy_id
     or v_risk.policy_version is distinct from p_risk_policy_version
     or v_risk.run_id <> p_run_id
     or v_risk.trace_id <> p_trace_id
     or v_risk.correlation_id <> p_correlation_id
     or v_risk.module_id <> v_run.module_id
     or v_risk.asset_id <> p_asset_id
     or v_risk.decision_version <> p_decision_version
     or v_risk.decided_at < v_run.started_at
     or v_risk.decided_at > p_created_at then
    raise exception 'FT-6 risk decision is not the approved hash/policy-bound decision for this workflow';
  end if;

  select * into v_compliance from fintech_core.decision_records where decision_id = p_compliance_decision_id;
  if not found
     or v_compliance.decision_type <> 'PRE_TRADE_COMPLIANCE_GATE'
     or v_compliance.outcome <> 'APPROVED'
     or v_compliance.output_hash <> p_compliance_decision_hash
     or v_compliance.policy_id is distinct from p_compliance_policy_id
     or v_compliance.policy_version is distinct from p_compliance_policy_version
     or v_compliance.run_id <> p_run_id
     or v_compliance.trace_id <> p_trace_id
     or v_compliance.correlation_id <> p_correlation_id
     or v_compliance.module_id <> v_run.module_id
     or v_compliance.asset_id <> p_asset_id
     or v_compliance.decision_version <> p_decision_version
     or v_compliance.decided_at < v_run.started_at
     or v_compliance.decided_at > p_created_at then
    raise exception 'FT-6 compliance decision is not the approved hash/policy-bound decision for this workflow';
  end if;

  insert into fintech_core.order_intents (
    order_intent_id, contract_version, order_intent_contract_version, binding_version,
    run_id, trace_id, correlation_id, client_order_id, idempotency_key, asset_id, side,
    quantity, quantity_fixed, order_type, limit_price, price_bounds, max_slippage_bps,
    strategy_id, portfolio_id, decision_version, risk_approval, compliance_approval,
    risk_decision_id, risk_decision_output_hash, risk_policy_id, risk_policy_version,
    compliance_decision_id, compliance_decision_output_hash, compliance_policy_id,
    compliance_policy_version, expires_at, intent_hash, effect_class, created_at, evidence_refs
  ) values (
    p_order_intent_id, p_contract_version, p_order_intent_contract_version, p_binding_version,
    p_run_id, p_trace_id, p_correlation_id, p_client_order_id, p_idempotency_key, p_asset_id, p_side,
    v_quantity, p_quantity_fixed, p_order_type, v_limit_price, p_price_bounds, p_max_slippage_bps,
    p_strategy_id, p_portfolio_id, p_decision_version, 'APPROVED', 'APPROVED',
    p_risk_decision_id, p_risk_decision_hash, p_risk_policy_id, p_risk_policy_version,
    p_compliance_decision_id, p_compliance_decision_hash, p_compliance_policy_id,
    p_compliance_policy_version, p_expires_at, p_intent_hash, p_effect_class, p_created_at,
    coalesce(p_evidence_refs, '[]'::jsonb)
  ) on conflict do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 1 then return true; end if;

  select count(*), coalesce(bool_and(
    order_intent_id = p_order_intent_id
    and contract_version = p_contract_version
    and order_intent_contract_version = p_order_intent_contract_version
    and binding_version = p_binding_version
    and run_id = p_run_id
    and trace_id = p_trace_id
    and correlation_id = p_correlation_id
    and client_order_id = p_client_order_id
    and idempotency_key = p_idempotency_key
    and asset_id = p_asset_id
    and side = p_side
    and quantity_fixed = p_quantity_fixed
    and order_type = p_order_type
    and price_bounds = p_price_bounds
    and max_slippage_bps = p_max_slippage_bps
    and strategy_id is not distinct from p_strategy_id
    and portfolio_id is not distinct from p_portfolio_id
    and decision_version = p_decision_version
    and risk_approval = 'APPROVED'
    and compliance_approval = 'APPROVED'
    and risk_decision_id = p_risk_decision_id
    and risk_decision_output_hash = p_risk_decision_hash
    and risk_policy_id = p_risk_policy_id
    and risk_policy_version = p_risk_policy_version
    and compliance_decision_id = p_compliance_decision_id
    and compliance_decision_output_hash = p_compliance_decision_hash
    and compliance_policy_id = p_compliance_policy_id
    and compliance_policy_version = p_compliance_policy_version
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

  if v_collision_count = 1 and v_all_match then return false; end if;
  raise exception 'FT-6 OrderIntent identity/idempotency/client-order collision';
end;
$$;

create or replace function public.fintech_core_append_reconciliation_record_v2(
  p_reconciliation_id text,
  p_reconciliation_contract_version text,
  p_run_id text,
  p_trace_id text,
  p_correlation_id text,
  p_order_intent_id text,
  p_client_order_id text,
  p_venue_order_id text,
  p_reconciliation_type text,
  p_status text,
  p_settlement_state text,
  p_source_system text,
  p_target_system text,
  p_asset_id text,
  p_expected_quantity jsonb,
  p_observed_quantity jsonb,
  p_expected_price_bounds jsonb,
  p_observed_execution_price jsonb,
  p_fee_evidence jsonb,
  p_observed_at timestamptz,
  p_reconciled_at timestamptz,
  p_input_hash text,
  p_output_hash text,
  p_evidence_refs jsonb,
  p_supervisor_escalation_required boolean,
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
  if p_settlement_state not in ('NOT_APPLICABLE', 'PENDING', 'SETTLED', 'FAILED', 'NOT_COMPUTABLE') then
    raise exception 'FT-6 unsupported settlement_state: %', p_settlement_state;
  end if;
  if p_reconciliation_type = 'ORDER_INTENT_PAPER_FILL' and p_settlement_state <> 'NOT_APPLICABLE' then
    raise exception 'FT-6 PAPER reconciliation cannot assert settlement finality';
  end if;
  if p_status = 'MISMATCH' and not p_supervisor_escalation_required then
    raise exception 'FT-6 reconciliation MISMATCH requires supervisor escalation evidence';
  end if;
  if btrim(coalesce(p_reconciliation_contract_version, '')) = ''
     or btrim(coalesce(p_client_order_id, '')) = ''
     or btrim(coalesce(p_input_hash, '')) = ''
     or btrim(coalesce(p_output_hash, '')) = '' then
    raise exception 'FT-6 typed reconciliation identity/hash fields are required';
  end if;

  perform fintech_core.fixed_point_numeric_v1(p_expected_quantity, 'expectedQuantity', false);
  if p_observed_quantity is not null then
    perform fintech_core.fixed_point_numeric_v1(p_observed_quantity, 'observedQuantity', true);
  end if;
  if p_expected_price_bounds is null or jsonb_typeof(p_expected_price_bounds) <> 'object' then
    raise exception 'FT-6 expected_price_bounds must be a JSON object';
  end if;
  if p_observed_execution_price is not null then
    perform fintech_core.fixed_point_numeric_v1(p_observed_execution_price, 'observedExecutionPrice', false);
  end if;
  if p_fee_evidence is not null and jsonb_typeof(p_fee_evidence) <> 'object' then
    raise exception 'FT-6 fee_evidence must be a JSON object when present';
  end if;

  select * into v_intent from fintech_core.order_intents where order_intent_id = p_order_intent_id;
  if not found then raise exception 'FT-6 reconciliation OrderIntent not found: %', p_order_intent_id; end if;
  if v_intent.run_id <> p_run_id
     or v_intent.trace_id <> p_trace_id
     or v_intent.correlation_id <> p_correlation_id
     or v_intent.asset_id <> p_asset_id
     or v_intent.client_order_id <> p_client_order_id then
    raise exception 'FT-6 reconciliation identity does not match OrderIntent %', p_order_intent_id;
  end if;

  insert into fintech_core.reconciliation_records (
    reconciliation_id, reconciliation_contract_version, run_id, trace_id, correlation_id,
    order_intent_id, client_order_id, venue_order_id, reconciliation_type, status,
    settlement_state, source_system, target_system, asset_id, expected_quantity,
    observed_quantity, expected_price_bounds, observed_execution_price, fee_evidence,
    observed_at, reconciled_at, input_hash, output_hash, evidence_refs,
    supervisor_escalation_required, details
  ) values (
    p_reconciliation_id, p_reconciliation_contract_version, p_run_id, p_trace_id, p_correlation_id,
    p_order_intent_id, p_client_order_id, p_venue_order_id, p_reconciliation_type, p_status,
    p_settlement_state, p_source_system, p_target_system, p_asset_id, p_expected_quantity,
    p_observed_quantity, p_expected_price_bounds, p_observed_execution_price, p_fee_evidence,
    p_observed_at, p_reconciled_at, p_input_hash, p_output_hash,
    coalesce(p_evidence_refs, '[]'::jsonb), p_supervisor_escalation_required,
    coalesce(p_details, '{}'::jsonb)
  ) on conflict (reconciliation_id) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 1 then return true; end if;

  select * into v_existing
    from fintech_core.reconciliation_records
   where reconciliation_id = p_reconciliation_id;
  if found
     and v_existing.reconciliation_contract_version = p_reconciliation_contract_version
     and v_existing.run_id = p_run_id
     and v_existing.trace_id = p_trace_id
     and v_existing.correlation_id = p_correlation_id
     and v_existing.order_intent_id = p_order_intent_id
     and v_existing.client_order_id = p_client_order_id
     and v_existing.venue_order_id is not distinct from p_venue_order_id
     and v_existing.reconciliation_type = p_reconciliation_type
     and v_existing.status = p_status
     and v_existing.settlement_state = p_settlement_state
     and v_existing.source_system = p_source_system
     and v_existing.target_system = p_target_system
     and v_existing.asset_id is not distinct from p_asset_id
     and v_existing.expected_quantity = p_expected_quantity
     and v_existing.observed_quantity is not distinct from p_observed_quantity
     and v_existing.expected_price_bounds = p_expected_price_bounds
     and v_existing.observed_execution_price is not distinct from p_observed_execution_price
     and v_existing.fee_evidence is not distinct from p_fee_evidence
     and v_existing.observed_at = p_observed_at
     and v_existing.reconciled_at = p_reconciled_at
     and v_existing.input_hash = p_input_hash
     and v_existing.output_hash = p_output_hash
     and v_existing.evidence_refs = coalesce(p_evidence_refs, '[]'::jsonb)
     and v_existing.supervisor_escalation_required = p_supervisor_escalation_required
     and v_existing.details = coalesce(p_details, '{}'::jsonb) then
    return false;
  end if;
  raise exception 'FT-6 reconciliation_id collision with non-identical record: %', p_reconciliation_id;
end;
$$;

revoke all on function public.fintech_core_append_order_intent_v2(
  text, text, text, text, text, text, text, text, text, text, text, jsonb, text, jsonb, numeric,
  text, text, text, text, text, text, text, text, text, text, text, timestamptz, timestamptz,
  text, text, jsonb
) from PUBLIC, anon, authenticated;
grant execute on function public.fintech_core_append_order_intent_v2(
  text, text, text, text, text, text, text, text, text, text, text, jsonb, text, jsonb, numeric,
  text, text, text, text, text, text, text, text, text, text, text, timestamptz, timestamptz,
  text, text, jsonb
) to service_role;

revoke all on function public.fintech_core_append_reconciliation_record_v2(
  text, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb,
  jsonb, jsonb, jsonb, jsonb, timestamptz, timestamptz, text, text, jsonb, boolean, jsonb
) from PUBLIC, anon, authenticated;
grant execute on function public.fintech_core_append_reconciliation_record_v2(
  text, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb,
  jsonb, jsonb, jsonb, jsonb, timestamptz, timestamptz, text, text, jsonb, boolean, jsonb
) to service_role;

comment on function public.fintech_core_append_order_intent_v2(
  text, text, text, text, text, text, text, text, text, text, text, jsonb, text, jsonb, numeric,
  text, text, text, text, text, text, text, text, text, text, text, timestamptz, timestamptz,
  text, text, jsonb
) is 'FT-6B service-role-only SECURITY INVOKER append boundary for canonical fixed-point, decision/policy-bound PAPER OrderIntent evidence.';
comment on function public.fintech_core_append_reconciliation_record_v2(
  text, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb,
  jsonb, jsonb, jsonb, jsonb, timestamptz, timestamptz, text, text, jsonb, boolean, jsonb
) is 'FT-6B service-role-only SECURITY INVOKER append boundary for typed reconciliation evidence; no autonomous repair or settlement authority.';

commit;
