-- ADR-0101/P3-A: durable/exported Commodity shadow observation evidence.
-- Server-side privileged writes only; the table cannot grant score/ranking/execution authority.
-- Migration is intentionally fail-closed: an unexpected pre-existing object must surface as drift.

create table public.commodity_shadow_evidence (
  observation_id text primary key,
  contract_version text not null,
  durable_fingerprint text not null,
  observation_version text not null,
  observation_fingerprint text not null,
  observed_at timestamptz not null,
  asset_id text not null,
  symbol text not null,
  domain text not null,
  instrument_kind text not null,
  model_id text not null,
  model_version text not null,
  model_registry_version text not null,
  evaluation_status text not null,
  coverage numeric not null,
  required_coverage numeric not null,
  data_quality_score numeric not null,
  effective_feature_fingerprint text not null,
  non_executable_weight_fingerprint text not null,
  evidence_fingerprint text not null,
  evidence_count integer not null,
  provider_ids text[] not null default '{}'::text[],
  feature_statuses jsonb not null default '[]'::jsonb,
  canonical boolean not null default false,
  score_eligible boolean not null default false,
  ranking_eligible boolean not null default false,
  execution_eligible boolean not null default false,
  registry_mutation_performed boolean not null default false,
  evidence jsonb not null,
  created_at timestamptz not null default now(),

  constraint commodity_shadow_evidence_contract_check
    check (contract_version = 'commodity-shadow-durable-evidence/1.0.0'),
  constraint commodity_shadow_observation_contract_check
    check (observation_version = 'commodity-shadow-observability/1.0.0'),
  constraint commodity_shadow_durable_fingerprint_check
    check (durable_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint commodity_shadow_observation_fingerprint_check
    check (observation_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint commodity_shadow_observation_id_check
    check (observation_id = 'commodity-shadow:sha256:' || observation_fingerprint),
  constraint commodity_shadow_effective_feature_fingerprint_check
    check (effective_feature_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint commodity_shadow_non_executable_weight_fingerprint_check
    check (non_executable_weight_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint commodity_shadow_evidence_fingerprint_check
    check (evidence_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint commodity_shadow_identity_nonempty_check
    check (
      length(btrim(asset_id)) > 0
      and length(btrim(symbol)) > 0
      and length(btrim(model_id)) > 0
      and length(btrim(model_version)) > 0
      and length(btrim(model_registry_version)) > 0
    ),
  constraint commodity_shadow_domain_check
    check (domain in ('energy', 'industrial-metals', 'precious-metals', 'agriculture')),
  constraint commodity_shadow_instrument_kind_check
    check (instrument_kind in (
      'commodity-energy-benchmark',
      'commodity-industrial-metal-benchmark',
      'commodity-precious-metal-benchmark',
      'commodity-agriculture-benchmark'
    )),
  constraint commodity_shadow_evaluation_status_check
    check (evaluation_status in ('RESEARCH_READY', 'BLOCKED')),
  constraint commodity_shadow_coverage_check
    check (coverage >= 0 and coverage <= 1),
  constraint commodity_shadow_required_coverage_check
    check (required_coverage >= 0 and required_coverage <= 1),
  constraint commodity_shadow_data_quality_score_check
    check (data_quality_score >= 0 and data_quality_score <= 100),
  constraint commodity_shadow_evidence_count_check
    check (evidence_count >= 0),
  constraint commodity_shadow_authority_check
    check (
      canonical = false
      and score_eligible = false
      and ranking_eligible = false
      and execution_eligible = false
      and registry_mutation_performed = false
    )
);

create index commodity_shadow_evidence_observed_at_idx
  on public.commodity_shadow_evidence (observed_at desc);
create index commodity_shadow_evidence_asset_model_idx
  on public.commodity_shadow_evidence (asset_id, model_id, observed_at desc);
create index commodity_shadow_evidence_symbol_idx
  on public.commodity_shadow_evidence (symbol, observed_at desc);
create index commodity_shadow_evidence_evaluation_status_idx
  on public.commodity_shadow_evidence (evaluation_status, observed_at desc);

alter table public.commodity_shadow_evidence enable row level security;

revoke all on table public.commodity_shadow_evidence from anon, authenticated;
revoke all on table public.commodity_shadow_evidence from service_role;
grant select, insert on table public.commodity_shadow_evidence to service_role;

create function public.prevent_commodity_shadow_evidence_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'commodity_shadow_evidence is append-only';
end;
$$;

revoke all on function public.prevent_commodity_shadow_evidence_mutation() from public, anon, authenticated, service_role;

create trigger commodity_shadow_evidence_no_mutation
before update or delete or truncate on public.commodity_shadow_evidence
for each statement execute function public.prevent_commodity_shadow_evidence_mutation();

comment on table public.commodity_shadow_evidence is
  'Append-only ADR-0101/P3-A Commodity shadow evidence. Persists sanitized observation-period lineage across process restarts and never modifies canonical scoring, ranking, eligibility or execution.';