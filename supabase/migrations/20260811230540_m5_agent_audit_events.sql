-- M5 Agent Audit Evidence persistence
-- Applied to production Supabase project AIFINANCIAL via approved M5 mutation gate.

create table public.agent_audit_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  request_id text not null,
  trace_id text not null,
  span_id text,
  human_actor_id uuid,
  app_id text not null,
  agent_id text not null,
  provider text,
  model text,
  intent text not null,
  scope jsonb not null default '{}'::jsonb,
  capability text not null,
  risk_class text not null check (risk_class in ('LOW','MEDIUM','HIGH','CRITICAL')),
  policy_id text,
  policy_version text,
  authorization_decision text not null check (authorization_decision in ('ALLOW','DENY','REQUIRE_APPROVAL','REQUIRE_STEP_UP')),
  approval_reference uuid,
  step_up_reference uuid,
  tool_name text,
  repository text,
  branch text,
  commit_sha text,
  pull_request_number bigint,
  ci_run_id text,
  artifact_digest text,
  deployment_id text,
  runtime_version text,
  result text not null,
  error_code text,
  rollback_reference text,
  attributes jsonb not null default '{}'::jsonb,
  constraint agent_audit_events_scope_object check (jsonb_typeof(scope) = 'object'),
  constraint agent_audit_events_attributes_object check (jsonb_typeof(attributes) = 'object')
);

comment on table public.agent_audit_events is
  'M5 append-only security audit evidence for AI-assisted commands. Operational telemetry remains separate.';

alter table public.agent_audit_events enable row level security;

revoke all on table public.agent_audit_events from anon, authenticated, public;
grant select, insert on table public.agent_audit_events to service_role;

create index agent_audit_events_occurred_at_idx on public.agent_audit_events (occurred_at desc);
create index agent_audit_events_request_id_idx on public.agent_audit_events (request_id);
create index agent_audit_events_trace_id_idx on public.agent_audit_events (trace_id);
create index agent_audit_events_agent_id_idx on public.agent_audit_events (agent_id);
create index agent_audit_events_pr_idx on public.agent_audit_events (repository, pull_request_number) where pull_request_number is not null;

create or replace function public.block_agent_audit_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  raise exception 'agent_audit_events is append-only';
end;
$$;

revoke all on function public.block_agent_audit_event_mutation() from public, anon, authenticated;

drop trigger if exists agent_audit_events_append_only on public.agent_audit_events;
create trigger agent_audit_events_append_only
before update or delete on public.agent_audit_events
for each row execute function public.block_agent_audit_event_mutation();
