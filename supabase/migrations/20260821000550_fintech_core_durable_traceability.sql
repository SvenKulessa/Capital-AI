-- FT-3 / ADR-0099 (pending in PR #467) -- Durable FinTech Core workflow and traceability persistence.
-- Owner priority: 2026-08-21.
-- Source design input: FinTech Enterprise Orchestration Modell (Google Drive, 2026-08-20).
--
-- Architecture boundaries:
--   * private fintech_core schema; no browser/Data API exposure is introduced here.
--   * public.outbox_jobs remains the single reusable durable queue/lease primitive.
--   * public.agent_audit_events remains the AI-assisted command audit authority.
--   * canonical scoring remains outside this schema and under ADR-0087 / SC-2.
--   * order_intents are evidence/intent records only; this migration adds no execution capability.

begin;

create schema if not exists fintech_core;
comment on schema fintech_core is
  'Private CAPITAL-AI FinTech Core persistence for durable workflow, event, decision, order-intent and reconciliation evidence. Not a scoring, IAM, compliance-policy or execution authority.';

revoke all on schema fintech_core from public, anon, authenticated;
grant usage on schema fintech_core to service_role;

create table if not exists fintech_core.workflow_runs (
  run_id               text primary key check (btrim(run_id) <> ''),
  contract_version     text not null check (btrim(contract_version) <> ''),
  state_machine_version text not null check (btrim(state_machine_version) <> ''),
  trace_id             text not null check (btrim(trace_id) <> ''),
  correlation_id       text not null check (btrim(correlation_id) <> ''),
  module_id            text not null check (btrim(module_id) <> ''),
  strategy_id          text,
  portfolio_id         text,
  decision_version     text not null check (btrim(decision_version) <> ''),
  operating_mode       text not null check (operating_mode in ('RESEARCH','PAPER','GUARDED_LIVE','PRODUCTION','EMERGENCY')),
  asset_id             text not null check (btrim(asset_id) <> ''),
  asset_identity       jsonb not null default '{}'::jsonb check (jsonb_typeof(asset_identity) = 'object'),
  status               text not null check (status in ('CREATED','RUNNING','WAITING_FOR_APPROVAL','COMPLETED','REJECTED','FAILED','EMERGENCY_STOPPED')),
  sequence             bigint not null default 0 check (sequence >= 0),
  started_at           timestamptz not null,
  updated_at           timestamptz not null,
  completed_at         timestamptz,
  evidence_refs        jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_refs) = 'array'),
  constraint workflow_runs_completed_at_order check (completed_at is null or completed_at >= started_at),
  constraint workflow_runs_updated_at_order check (updated_at >= started_at),
  constraint workflow_runs_correlation_identity unique (run_id, trace_id, correlation_id)
);

comment on table fintech_core.workflow_runs is
  'FT-3 durable current-state record for a FinTech Core workflow. Identity/context columns are immutable after insert; status/sequence may advance, but rows cannot be deleted.';

create table if not exists fintech_core.domain_events (
  event_id          text primary key check (btrim(event_id) <> ''),
  contract_version  text not null check (btrim(contract_version) <> ''),
  event_type        text not null check (btrim(event_type) <> ''),
  event_version     text not null check (btrim(event_version) <> ''),
  run_id            text not null,
  trace_id          text not null check (btrim(trace_id) <> ''),
  correlation_id    text not null check (btrim(correlation_id) <> ''),
  causation_id      text,
  module_id         text not null check (btrim(module_id) <> ''),
  asset_id          text not null check (btrim(asset_id) <> ''),
  decision_version  text not null check (btrim(decision_version) <> ''),
  occurred_at       timestamptz not null,
  evidence_refs     jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_refs) = 'array'),
  payload           jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  recorded_at       timestamptz not null default now(),
  constraint domain_events_run_correlation_fkey
    foreign key (run_id, trace_id, correlation_id)
    references fintech_core.workflow_runs (run_id, trace_id, correlation_id)
    on update restrict on delete restrict
);

comment on table fintech_core.domain_events is
  'FT-3 append-only domain-event evidence. EventMesh may transport events, but this table is the durable FinTech Core event history for replay/audit correlation.';

create table if not exists fintech_core.decision_records (
  decision_id       text primary key check (btrim(decision_id) <> ''),
  contract_version  text not null check (btrim(contract_version) <> ''),
  decision_type     text not null check (btrim(decision_type) <> ''),
  decision_version  text not null check (btrim(decision_version) <> ''),
  outcome           text not null check (outcome in ('APPROVED','REJECTED','NOT_COMPUTABLE','REVIEW_REQUIRED')),
  run_id            text not null,
  trace_id          text not null check (btrim(trace_id) <> ''),
  correlation_id    text not null check (btrim(correlation_id) <> ''),
  module_id         text not null check (btrim(module_id) <> ''),
  asset_id          text not null check (btrim(asset_id) <> ''),
  policy_id         text,
  policy_version    text,
  input_hash        text not null check (btrim(input_hash) <> ''),
  output_hash       text not null check (btrim(output_hash) <> ''),
  evidence_refs     jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_refs) = 'array'),
  decided_at        timestamptz not null,
  recorded_at       timestamptz not null default now(),
  constraint decision_records_run_correlation_fkey
    foreign key (run_id, trace_id, correlation_id)
    references fintech_core.workflow_runs (run_id, trace_id, correlation_id)
    on update restrict on delete restrict
);

comment on table fintech_core.decision_records is
  'FT-3 append-only decision evidence. Stores versioned outcome plus input/output hashes and evidence references; it does not grant risk, compliance or execution authority.';

create table if not exists fintech_core.order_intents (
  order_intent_id       text primary key check (btrim(order_intent_id) <> ''),
  contract_version      text not null check (btrim(contract_version) <> ''),
  run_id                text not null,
  trace_id              text not null check (btrim(trace_id) <> ''),
  correlation_id        text not null check (btrim(correlation_id) <> ''),
  idempotency_key       text not null unique check (btrim(idempotency_key) <> ''),
  asset_id              text not null check (btrim(asset_id) <> ''),
  side                  text not null check (side in ('BUY','SELL')),
  quantity              numeric not null check (quantity > 0),
  order_type            text not null check (order_type in ('MARKET','LIMIT','POST_ONLY','IOC','FOK','TWAP','VWAP')),
  limit_price           numeric check (limit_price is null or limit_price > 0),
  max_slippage_bps      numeric not null check (max_slippage_bps >= 0),
  strategy_id           text,
  portfolio_id          text,
  decision_version      text not null check (btrim(decision_version) <> ''),
  risk_approval         text not null check (risk_approval in ('PENDING','APPROVED','REJECTED','EXPIRED')),
  compliance_approval   text not null check (compliance_approval in ('PENDING','APPROVED','REJECTED','EXPIRED')),
  expires_at            timestamptz not null,
  intent_hash           text not null check (btrim(intent_hash) <> ''),
  effect_class          text not null default 'SIDE_EFFECTING' check (effect_class = 'SIDE_EFFECTING'),
  created_at            timestamptz not null default now(),
  evidence_refs         jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_refs) = 'array'),
  constraint order_intents_run_correlation_fkey
    foreign key (run_id, trace_id, correlation_id)
    references fintech_core.workflow_runs (run_id, trace_id, correlation_id)
    on update restrict on delete restrict,
  constraint order_intents_expiry_order check (expires_at > created_at)
);

comment on table fintech_core.order_intents is
  'FT-3 append-only hash-/idempotency-bound OrderIntent evidence. No row can execute an order; future execution adapters must independently enforce authoritative risk/compliance approvals and operating-mode gates.';

create table if not exists fintech_core.reconciliation_records (
  reconciliation_id  text primary key check (btrim(reconciliation_id) <> ''),
  run_id             text not null,
  trace_id           text not null check (btrim(trace_id) <> ''),
  correlation_id     text not null check (btrim(correlation_id) <> ''),
  order_intent_id    text,
  reconciliation_type text not null check (btrim(reconciliation_type) <> ''),
  status             text not null check (btrim(status) <> ''),
  source_system      text not null check (btrim(source_system) <> ''),
  target_system      text not null check (btrim(target_system) <> ''),
  asset_id           text,
  observed_at        timestamptz not null,
  input_hash         text,
  output_hash        text,
  evidence_refs      jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_refs) = 'array'),
  details            jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  recorded_at        timestamptz not null default now(),
  constraint reconciliation_records_run_correlation_fkey
    foreign key (run_id, trace_id, correlation_id)
    references fintech_core.workflow_runs (run_id, trace_id, correlation_id)
    on update restrict on delete restrict,
  constraint reconciliation_records_order_intent_fkey
    foreign key (order_intent_id)
    references fintech_core.order_intents (order_intent_id)
    on update restrict on delete restrict
);

comment on table fintech_core.reconciliation_records is
  'FT-3 append-only reconciliation evidence scaffold. Concrete settlement/custody status semantics remain a later FT-6 contract; this table does not assert settlement finality.';

-- Query paths required for audit reconstruction and operational replay.
create index if not exists workflow_runs_trace_id_idx
  on fintech_core.workflow_runs (trace_id);
create index if not exists workflow_runs_correlation_id_idx
  on fintech_core.workflow_runs (correlation_id);
create index if not exists workflow_runs_status_updated_at_idx
  on fintech_core.workflow_runs (status, updated_at desc);

create index if not exists domain_events_run_occurred_at_idx
  on fintech_core.domain_events (run_id, occurred_at, recorded_at);
create index if not exists domain_events_trace_id_idx
  on fintech_core.domain_events (trace_id);
create index if not exists domain_events_correlation_id_idx
  on fintech_core.domain_events (correlation_id);
create index if not exists domain_events_causation_id_idx
  on fintech_core.domain_events (causation_id)
  where causation_id is not null;
create index if not exists domain_events_type_occurred_at_idx
  on fintech_core.domain_events (event_type, occurred_at desc);

create index if not exists decision_records_run_decided_at_idx
  on fintech_core.decision_records (run_id, decided_at);
create index if not exists decision_records_trace_id_idx
  on fintech_core.decision_records (trace_id);
create index if not exists decision_records_outcome_decided_at_idx
  on fintech_core.decision_records (outcome, decided_at desc);

create index if not exists order_intents_run_created_at_idx
  on fintech_core.order_intents (run_id, created_at);
create index if not exists order_intents_trace_id_idx
  on fintech_core.order_intents (trace_id);
create index if not exists order_intents_expires_at_idx
  on fintech_core.order_intents (expires_at);

create index if not exists reconciliation_records_run_observed_at_idx
  on fintech_core.reconciliation_records (run_id, observed_at);
create index if not exists reconciliation_records_order_intent_idx
  on fintech_core.reconciliation_records (order_intent_id)
  where order_intent_id is not null;
create index if not exists reconciliation_records_trace_id_idx
  on fintech_core.reconciliation_records (trace_id);

-- Defense in depth even though fintech_core is not exposed through the Data API.
alter table fintech_core.workflow_runs enable row level security;
alter table fintech_core.domain_events enable row level security;
alter table fintech_core.decision_records enable row level security;
alter table fintech_core.order_intents enable row level security;
alter table fintech_core.reconciliation_records enable row level security;

revoke all on table fintech_core.workflow_runs from public, anon, authenticated, service_role;
revoke all on table fintech_core.domain_events from public, anon, authenticated, service_role;
revoke all on table fintech_core.decision_records from public, anon, authenticated, service_role;
revoke all on table fintech_core.order_intents from public, anon, authenticated, service_role;
revoke all on table fintech_core.reconciliation_records from public, anon, authenticated, service_role;

grant select, insert, update on table fintech_core.workflow_runs to service_role;
grant select, insert on table fintech_core.domain_events to service_role;
grant select, insert on table fintech_core.decision_records to service_role;
grant select, insert on table fintech_core.order_intents to service_role;
grant select, insert on table fintech_core.reconciliation_records to service_role;

create policy fintech_core_workflow_runs_service_select on fintech_core.workflow_runs
  for select to service_role using (true);
create policy fintech_core_workflow_runs_service_insert on fintech_core.workflow_runs
  for insert to service_role with check (true);
create policy fintech_core_workflow_runs_service_update on fintech_core.workflow_runs
  for update to service_role using (true) with check (true);

create policy fintech_core_domain_events_service_select on fintech_core.domain_events
  for select to service_role using (true);
create policy fintech_core_domain_events_service_insert on fintech_core.domain_events
  for insert to service_role with check (true);

create policy fintech_core_decision_records_service_select on fintech_core.decision_records
  for select to service_role using (true);
create policy fintech_core_decision_records_service_insert on fintech_core.decision_records
  for insert to service_role with check (true);

create policy fintech_core_order_intents_service_select on fintech_core.order_intents
  for select to service_role using (true);
create policy fintech_core_order_intents_service_insert on fintech_core.order_intents
  for insert to service_role with check (true);

create policy fintech_core_reconciliation_records_service_select on fintech_core.reconciliation_records
  for select to service_role using (true);
create policy fintech_core_reconciliation_records_service_insert on fintech_core.reconciliation_records
  for insert to service_role with check (true);

-- Shared append-only enforcement for immutable financial evidence.
create or replace function fintech_core.block_append_only_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, fintech_core
as $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;

revoke all on function fintech_core.block_append_only_mutation() from public, anon, authenticated, service_role;

create trigger fintech_core_domain_events_append_only
  before update or delete on fintech_core.domain_events
  for each row execute function fintech_core.block_append_only_mutation();
create trigger fintech_core_decision_records_append_only
  before update or delete on fintech_core.decision_records
  for each row execute function fintech_core.block_append_only_mutation();
create trigger fintech_core_order_intents_append_only
  before update or delete on fintech_core.order_intents
  for each row execute function fintech_core.block_append_only_mutation();
create trigger fintech_core_reconciliation_records_append_only
  before update or delete on fintech_core.reconciliation_records
  for each row execute function fintech_core.block_append_only_mutation();
create trigger fintech_core_workflow_runs_no_delete
  before delete on fintech_core.workflow_runs
  for each row execute function fintech_core.block_append_only_mutation();

-- Workflow context identity is immutable; only lifecycle state may advance.
create or replace function fintech_core.guard_workflow_run_update()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, fintech_core
as $$
begin
  if new.run_id is distinct from old.run_id
     or new.contract_version is distinct from old.contract_version
     or new.state_machine_version is distinct from old.state_machine_version
     or new.trace_id is distinct from old.trace_id
     or new.correlation_id is distinct from old.correlation_id
     or new.module_id is distinct from old.module_id
     or new.strategy_id is distinct from old.strategy_id
     or new.portfolio_id is distinct from old.portfolio_id
     or new.decision_version is distinct from old.decision_version
     or new.operating_mode is distinct from old.operating_mode
     or new.asset_id is distinct from old.asset_id
     or new.asset_identity is distinct from old.asset_identity
     or new.started_at is distinct from old.started_at
     or new.evidence_refs is distinct from old.evidence_refs then
    raise exception 'workflow run identity/context is immutable';
  end if;

  if new.sequence < old.sequence then
    raise exception 'workflow sequence cannot decrease';
  end if;

  if new.updated_at < old.updated_at then
    raise exception 'workflow updated_at cannot move backwards';
  end if;

  return new;
end;
$$;

revoke all on function fintech_core.guard_workflow_run_update() from public, anon, authenticated, service_role;

create trigger fintech_core_workflow_runs_guard_update
  before update on fintech_core.workflow_runs
  for each row execute function fintech_core.guard_workflow_run_update();

commit;
