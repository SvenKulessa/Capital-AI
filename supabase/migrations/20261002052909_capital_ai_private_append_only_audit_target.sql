create table if not exists private.capital_ai_audit_events (
  event_id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  event_type text not null,
  request_id text,
  trace_id text,
  actor_ref text,
  domain text check (domain is null or domain in ('PRODUCT','MARKET','PLATFORM','TRUST','GROWTH')),
  authorization_decision text,
  sanitized_action_hash text,
  repository text,
  branch text,
  source_sha text,
  pull_request bigint,
  workflow_run text,
  artifact_digest text,
  deployment_id text,
  runtime_version text,
  result text not null,
  rollback_reference text,
  supersession_scope text check (supersession_scope is null or supersession_scope in ('FRONTEND','BACKEND')),
  documentary_ref text,
  metadata jsonb not null default '{}'::jsonb
);
comment on table private.capital_ai_audit_events is
'Append-only CAPITAL-AI security/governance audit target. No secrets, raw credentials, full prompts or raw sensitive commands.';
revoke all on private.capital_ai_audit_events from public, anon, authenticated;
grant select, insert on private.capital_ai_audit_events to service_role;
