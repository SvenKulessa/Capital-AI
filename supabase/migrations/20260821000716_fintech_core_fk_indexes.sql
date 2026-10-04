-- FT-3 Supabase Performance Advisor remediation.
-- Cover the composite workflow correlation FKs used by durable child evidence tables.

begin;

create index if not exists domain_events_run_correlation_fk_idx
  on fintech_core.domain_events (run_id, trace_id, correlation_id);

create index if not exists decision_records_run_correlation_fk_idx
  on fintech_core.decision_records (run_id, trace_id, correlation_id);

create index if not exists order_intents_run_correlation_fk_idx
  on fintech_core.order_intents (run_id, trace_id, correlation_id);

create index if not exists reconciliation_records_run_correlation_fk_idx
  on fintech_core.reconciliation_records (run_id, trace_id, correlation_id);

commit;
