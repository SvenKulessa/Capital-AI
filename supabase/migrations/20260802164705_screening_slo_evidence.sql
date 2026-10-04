-- Persistent production sink for screening-slo-evidence/1.0.0.
-- Server-side service-role writes only. No client INSERT/UPDATE/DELETE policies are granted.

create table if not exists public.screening_slo_evidence (
  id uuid primary key default gen_random_uuid(),
  contract_version text not null,
  correlation_id text not null,
  observed_at timestamptz not null,
  symbol text null,
  asset_class text null,
  state text not null check (state in ('HEALTHY', 'DEGRADED', 'UNAVAILABLE', 'NO_RUNTIME_EVIDENCE')),
  eligible boolean not null,
  eligibility_status text not null,
  quote_status text null,
  quote_age_ms bigint null check (quote_age_ms is null or quote_age_ms >= 0),
  quote_fresh boolean null,
  sla_state text not null,
  reasons jsonb not null default '[]'::jsonb,
  score_impact_enabled boolean not null default false check (score_impact_enabled = false),
  hard_screening_block_enabled boolean not null default false check (hard_screening_block_enabled = false),
  evidence jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists screening_slo_evidence_observed_at_idx
  on public.screening_slo_evidence (observed_at desc);
create index if not exists screening_slo_evidence_correlation_id_idx
  on public.screening_slo_evidence (correlation_id);
create index if not exists screening_slo_evidence_symbol_idx
  on public.screening_slo_evidence (symbol, observed_at desc)
  where symbol is not null;
create index if not exists screening_slo_evidence_state_idx
  on public.screening_slo_evidence (state, observed_at desc);

alter table public.screening_slo_evidence enable row level security;

-- Intentionally no public/authenticated write policy. The production backend writes via
-- SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY. RLS therefore remains fail-closed for clients.

create or replace function public.prevent_screening_slo_evidence_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'screening_slo_evidence is append-only';
end;
$$;

revoke all on function public.prevent_screening_slo_evidence_mutation() from public;

DROP TRIGGER IF EXISTS screening_slo_evidence_no_update_delete ON public.screening_slo_evidence;
create trigger screening_slo_evidence_no_update_delete
before update or delete on public.screening_slo_evidence
for each row execute function public.prevent_screening_slo_evidence_mutation();

comment on table public.screening_slo_evidence is
  'Append-only runtime evidence for screening SLO/eligibility/quote freshness governance. Never modifies canonical asset scores.';
