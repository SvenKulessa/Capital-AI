create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.external_component_inventory (
  component_id text primary key,
  display_name text not null,
  component_kind text not null,
  domain text not null check (domain in ('PRODUCT','MARKET','PLATFORM','TRUST','GROWTH')),
  installed_at timestamptz,
  observed_at timestamptz not null default now(),
  active_version text,
  pipeline_version text,
  lifecycle text not null check (lifecycle in ('DISCOVERED','BENCHMARKED','APPROVED','ACTIVE','SUPERSEDED')),
  function_summary text not null,
  webapp_binding text,
  source_repository text,
  license_spdx text,
  cads_profile text not null default 'CADS_PROFILE@2',
  cads_score numeric(5,2) check (cads_score between 0 and 100),
  score_state text not null default 'PROVISIONAL' check (score_state in ('PROVISIONAL','BENCHMARKED','VERIFIED','BLOCKED')),
  alternatives jsonb not null default '[]'::jsonb,
  evidence_refs jsonb not null default '[]'::jsonb,
  contains_secret_values boolean not null default false,
  constraint external_component_inventory_no_secrets check (contains_secret_values = false)
);

comment on table private.external_component_inventory is
'Private metadata-only inventory for external components. Secret values, tokens, passwords, private keys and copyrighted source payloads are prohibited.';

create table if not exists private.external_component_inventory_events (
  event_id uuid primary key default gen_random_uuid(),
  component_id text not null references private.external_component_inventory(component_id),
  occurred_at timestamptz not null default now(),
  event_type text not null check (event_type in ('OBSERVED','VERSION_CANDIDATE','VERSION_PROMOTED','SUPERSEDED_FRONTEND','SUPERSEDED_BACKEND','BENCHMARK_UPDATED')),
  source_sha text,
  documentary_ref text,
  sanitized_action_hash text,
  details jsonb not null default '{}'::jsonb
);

revoke all on all tables in schema private from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update on private.external_component_inventory to service_role;
grant select, insert on private.external_component_inventory_events to service_role;
