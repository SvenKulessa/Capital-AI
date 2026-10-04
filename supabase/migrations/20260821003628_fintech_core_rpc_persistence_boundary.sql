-- FT-3 / ADR-0099 -- service-role-only RPC boundary for private FinTech Core persistence.
--
-- The fintech_core schema intentionally remains outside browser/Data API schema exposure.
-- Existing server code uses the privileged Supabase client, so these narrow public-schema RPCs
-- provide the application boundary without granting anon/authenticated access to fintech_core.
-- Every function is SECURITY INVOKER: the service_role caller must already possess the private
-- schema/table privileges established by the FT-3 base migrations. No SECURITY DEFINER elevation
-- and no new queue, scoring, risk, compliance or execution authority is introduced.

begin;

create or replace function public.fintech_core_create_workflow_run_v1(
  p_run_id text,
  p_contract_version text,
  p_state_machine_version text,
  p_trace_id text,
  p_correlation_id text,
  p_module_id text,
  p_strategy_id text,
  p_portfolio_id text,
  p_decision_version text,
  p_operating_mode text,
  p_asset_id text,
  p_asset_identity jsonb,
  p_status text,
  p_sequence bigint,
  p_started_at timestamptz,
  p_updated_at timestamptz,
  p_evidence_refs jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_existing fintech_core.workflow_runs%rowtype;
  v_inserted integer;
begin
  if p_status <> 'CREATED' or p_sequence <> 0 then
    raise exception 'FinTech Core workflow creation requires CREATED sequence 0';
  end if;

  insert into fintech_core.workflow_runs (
    run_id, contract_version, state_machine_version, trace_id, correlation_id, module_id,
    strategy_id, portfolio_id, decision_version, operating_mode, asset_id, asset_identity,
    status, sequence, started_at, updated_at, evidence_refs
  ) values (
    p_run_id, p_contract_version, p_state_machine_version, p_trace_id, p_correlation_id, p_module_id,
    p_strategy_id, p_portfolio_id, p_decision_version, p_operating_mode, p_asset_id, p_asset_identity,
    p_status, p_sequence, p_started_at, p_updated_at, coalesce(p_evidence_refs, '[]'::jsonb)
  )
  on conflict (run_id) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 1 then
    return true;
  end if;

  select * into v_existing
    from fintech_core.workflow_runs
   where run_id = p_run_id;

  if not found then
    raise exception 'FinTech Core workflow replay could not resolve run_id %', p_run_id;
  end if;

  if v_existing.contract_version = p_contract_version
     and v_existing.state_machine_version = p_state_machine_version
     and v_existing.trace_id = p_trace_id
     and v_existing.correlation_id = p_correlation_id
     and v_existing.module_id = p_module_id
     and v_existing.strategy_id is not distinct from p_strategy_id
     and v_existing.portfolio_id is not distinct from p_portfolio_id
     and v_existing.decision_version = p_decision_version
     and v_existing.operating_mode = p_operating_mode
     and v_existing.asset_id = p_asset_id
     and v_existing.asset_identity = p_asset_identity
     and v_existing.status = p_status
     and v_existing.sequence = p_sequence
     and v_existing.started_at = p_started_at
     and v_existing.updated_at = p_updated_at
     and v_existing.evidence_refs = coalesce(p_evidence_refs, '[]'::jsonb) then
    return false;
  end if;

  raise exception 'FinTech Core run_id collision with non-identical workflow identity/context: %', p_run_id;
end;
$$;

create or replace function public.fintech_core_advance_workflow_run_v1(
  p_run_id text,
  p_expected_status text,
  p_expected_sequence bigint,
  p_next_status text,
  p_next_sequence bigint,
  p_updated_at timestamptz,
  p_completed_at timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_updated integer;
  v_existing fintech_core.workflow_runs%rowtype;
  v_terminal boolean;
begin
  if p_next_sequence <> p_expected_sequence + 1 then
    raise exception 'FinTech Core workflow sequence must advance by exactly one';
  end if;

  v_terminal := p_next_status in ('COMPLETED', 'REJECTED', 'FAILED', 'EMERGENCY_STOPPED');
  if v_terminal and (p_completed_at is null or p_completed_at <> p_updated_at) then
    raise exception 'Terminal FinTech Core workflow transitions require completed_at = updated_at';
  end if;
  if not v_terminal and p_completed_at is not null then
    raise exception 'Non-terminal FinTech Core workflow transitions must not set completed_at';
  end if;

  update fintech_core.workflow_runs
     set status = p_next_status,
         sequence = p_next_sequence,
         updated_at = p_updated_at,
         completed_at = p_completed_at
   where run_id = p_run_id
     and status = p_expected_status
     and sequence = p_expected_sequence;

  get diagnostics v_updated = row_count;
  if v_updated = 1 then
    return true;
  end if;

  select * into v_existing
    from fintech_core.workflow_runs
   where run_id = p_run_id;

  if not found then
    raise exception 'FinTech Core workflow run not found: %', p_run_id;
  end if;

  if v_existing.status = p_next_status
     and v_existing.sequence = p_next_sequence
     and v_existing.updated_at = p_updated_at
     and v_existing.completed_at is not distinct from p_completed_at then
    return false;
  end if;

  raise exception 'FinTech Core stale or conflicting workflow transition for run_id %', p_run_id;
end;
$$;

create or replace function public.fintech_core_append_domain_event_v1(
  p_event_id text,
  p_contract_version text,
  p_event_type text,
  p_event_version text,
  p_run_id text,
  p_trace_id text,
  p_correlation_id text,
  p_causation_id text,
  p_module_id text,
  p_asset_id text,
  p_decision_version text,
  p_occurred_at timestamptz,
  p_evidence_refs jsonb,
  p_payload jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_existing fintech_core.domain_events%rowtype;
  v_inserted integer;
begin
  insert into fintech_core.domain_events (
    event_id, contract_version, event_type, event_version, run_id, trace_id, correlation_id,
    causation_id, module_id, asset_id, decision_version, occurred_at, evidence_refs, payload
  ) values (
    p_event_id, p_contract_version, p_event_type, p_event_version, p_run_id, p_trace_id, p_correlation_id,
    p_causation_id, p_module_id, p_asset_id, p_decision_version, p_occurred_at,
    coalesce(p_evidence_refs, '[]'::jsonb), p_payload
  )
  on conflict (event_id) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 1 then
    return true;
  end if;

  select * into v_existing
    from fintech_core.domain_events
   where event_id = p_event_id;

  if found
     and v_existing.contract_version = p_contract_version
     and v_existing.event_type = p_event_type
     and v_existing.event_version = p_event_version
     and v_existing.run_id = p_run_id
     and v_existing.trace_id = p_trace_id
     and v_existing.correlation_id = p_correlation_id
     and v_existing.causation_id is not distinct from p_causation_id
     and v_existing.module_id = p_module_id
     and v_existing.asset_id = p_asset_id
     and v_existing.decision_version = p_decision_version
     and v_existing.occurred_at = p_occurred_at
     and v_existing.evidence_refs = coalesce(p_evidence_refs, '[]'::jsonb)
     and v_existing.payload = p_payload then
    return false;
  end if;

  raise exception 'FinTech Core event_id collision with non-identical event: %', p_event_id;
end;
$$;

create or replace function public.fintech_core_append_decision_record_v1(
  p_decision_id text,
  p_contract_version text,
  p_decision_type text,
  p_decision_version text,
  p_outcome text,
  p_run_id text,
  p_trace_id text,
  p_correlation_id text,
  p_module_id text,
  p_asset_id text,
  p_policy_id text,
  p_policy_version text,
  p_input_hash text,
  p_output_hash text,
  p_evidence_refs jsonb,
  p_decided_at timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_existing fintech_core.decision_records%rowtype;
  v_inserted integer;
begin
  insert into fintech_core.decision_records (
    decision_id, contract_version, decision_type, decision_version, outcome, run_id, trace_id,
    correlation_id, module_id, asset_id, policy_id, policy_version, input_hash, output_hash,
    evidence_refs, decided_at
  ) values (
    p_decision_id, p_contract_version, p_decision_type, p_decision_version, p_outcome, p_run_id,
    p_trace_id, p_correlation_id, p_module_id, p_asset_id, p_policy_id, p_policy_version,
    p_input_hash, p_output_hash, coalesce(p_evidence_refs, '[]'::jsonb), p_decided_at
  )
  on conflict (decision_id) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 1 then
    return true;
  end if;

  select * into v_existing
    from fintech_core.decision_records
   where decision_id = p_decision_id;

  if found
     and v_existing.contract_version = p_contract_version
     and v_existing.decision_type = p_decision_type
     and v_existing.decision_version = p_decision_version
     and v_existing.outcome = p_outcome
     and v_existing.run_id = p_run_id
     and v_existing.trace_id = p_trace_id
     and v_existing.correlation_id = p_correlation_id
     and v_existing.module_id = p_module_id
     and v_existing.asset_id = p_asset_id
     and v_existing.policy_id is not distinct from p_policy_id
     and v_existing.policy_version is not distinct from p_policy_version
     and v_existing.input_hash = p_input_hash
     and v_existing.output_hash = p_output_hash
     and v_existing.evidence_refs = coalesce(p_evidence_refs, '[]'::jsonb)
     and v_existing.decided_at = p_decided_at then
    return false;
  end if;

  raise exception 'FinTech Core decision_id collision with non-identical decision: %', p_decision_id;
end;
$$;

create or replace function public.fintech_core_append_order_intent_v1(
  p_order_intent_id text,
  p_contract_version text,
  p_run_id text,
  p_trace_id text,
  p_correlation_id text,
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
  p_risk_approval text,
  p_compliance_approval text,
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
  v_inserted integer;
  v_collision_count bigint;
  v_all_match boolean;
begin
  insert into fintech_core.order_intents (
    order_intent_id, contract_version, run_id, trace_id, correlation_id, idempotency_key,
    asset_id, side, quantity, order_type, limit_price, max_slippage_bps, strategy_id,
    portfolio_id, decision_version, risk_approval, compliance_approval, expires_at,
    intent_hash, effect_class, evidence_refs
  ) values (
    p_order_intent_id, p_contract_version, p_run_id, p_trace_id, p_correlation_id, p_idempotency_key,
    p_asset_id, p_side, p_quantity, p_order_type, p_limit_price, p_max_slippage_bps, p_strategy_id,
    p_portfolio_id, p_decision_version, p_risk_approval, p_compliance_approval, p_expires_at,
    p_intent_hash, p_effect_class, coalesce(p_evidence_refs, '[]'::jsonb)
  )
  on conflict do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 1 then
    return true;
  end if;

  select count(*), coalesce(bool_and(
    order_intent_id = p_order_intent_id
    and contract_version = p_contract_version
    and run_id = p_run_id
    and trace_id = p_trace_id
    and correlation_id = p_correlation_id
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
    and risk_approval = p_risk_approval
    and compliance_approval = p_compliance_approval
    and expires_at = p_expires_at
    and intent_hash = p_intent_hash
    and effect_class = p_effect_class
    and evidence_refs = coalesce(p_evidence_refs, '[]'::jsonb)
  ), false)
  into v_collision_count, v_all_match
  from fintech_core.order_intents
  where order_intent_id = p_order_intent_id
     or idempotency_key = p_idempotency_key;

  if v_collision_count = 1 and v_all_match then
    return false;
  end if;

  raise exception 'FinTech Core order-intent identity/idempotency collision';
end;
$$;

revoke all on function public.fintech_core_create_workflow_run_v1(
  text, text, text, text, text, text, text, text, text, text, text, jsonb, text, bigint,
  timestamptz, timestamptz, jsonb
) from PUBLIC, anon, authenticated;
grant execute on function public.fintech_core_create_workflow_run_v1(
  text, text, text, text, text, text, text, text, text, text, text, jsonb, text, bigint,
  timestamptz, timestamptz, jsonb
) to service_role;

revoke all on function public.fintech_core_advance_workflow_run_v1(
  text, text, bigint, text, bigint, timestamptz, timestamptz
) from PUBLIC, anon, authenticated;
grant execute on function public.fintech_core_advance_workflow_run_v1(
  text, text, bigint, text, bigint, timestamptz, timestamptz
) to service_role;

revoke all on function public.fintech_core_append_domain_event_v1(
  text, text, text, text, text, text, text, text, text, text, text, timestamptz, jsonb, jsonb
) from PUBLIC, anon, authenticated;
grant execute on function public.fintech_core_append_domain_event_v1(
  text, text, text, text, text, text, text, text, text, text, text, timestamptz, jsonb, jsonb
) to service_role;

revoke all on function public.fintech_core_append_decision_record_v1(
  text, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, timestamptz
) from PUBLIC, anon, authenticated;
grant execute on function public.fintech_core_append_decision_record_v1(
  text, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, timestamptz
) to service_role;

revoke all on function public.fintech_core_append_order_intent_v1(
  text, text, text, text, text, text, text, text, numeric, text, numeric, numeric, text, text,
  text, text, text, timestamptz, text, text, jsonb
) from PUBLIC, anon, authenticated;
grant execute on function public.fintech_core_append_order_intent_v1(
  text, text, text, text, text, text, text, text, numeric, text, numeric, numeric, text, text,
  text, text, text, timestamptz, text, text, jsonb
) to service_role;

comment on function public.fintech_core_create_workflow_run_v1(
  text, text, text, text, text, text, text, text, text, text, text, jsonb, text, bigint,
  timestamptz, timestamptz, jsonb
) is 'FT-3 service-role-only SECURITY INVOKER entrypoint for idempotent FinTech Core workflow creation.';
comment on function public.fintech_core_advance_workflow_run_v1(
  text, text, bigint, text, bigint, timestamptz, timestamptz
) is 'FT-3 service-role-only SECURITY INVOKER compare-and-set workflow transition persistence.';
comment on function public.fintech_core_append_domain_event_v1(
  text, text, text, text, text, text, text, text, text, text, text, timestamptz, jsonb, jsonb
) is 'FT-3 service-role-only SECURITY INVOKER idempotent append boundary for immutable domain-event evidence.';
comment on function public.fintech_core_append_decision_record_v1(
  text, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, timestamptz
) is 'FT-3 service-role-only SECURITY INVOKER idempotent append boundary for immutable decision evidence.';
comment on function public.fintech_core_append_order_intent_v1(
  text, text, text, text, text, text, text, text, numeric, text, numeric, numeric, text, text,
  text, text, text, timestamptz, text, text, jsonb
) is 'FT-3 service-role-only SECURITY INVOKER idempotent append boundary for OrderIntent evidence; it performs no execution.';

commit;
