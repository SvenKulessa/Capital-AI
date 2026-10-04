create table if not exists public.compliance_runs (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  triggered_by          text,
  scanner_results       jsonb not null,
  findings              jsonb not null,
  compliance_score      integer not null,
  security_score        integer not null,
  enterprise_readiness  integer not null,
  production_readiness  integer not null,
  risk_score            integer not null,
  is_production_ready   boolean not null default false
);

create index if not exists idx_compliance_runs_created_at on public.compliance_runs (created_at desc);

alter table public.compliance_runs enable row level security;

drop policy if exists "service_role_full_access" on public.compliance_runs;
create policy "service_role_full_access" on public.compliance_runs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.compliance_certificates (
  id            text primary key,
  run_id        uuid not null references public.compliance_runs(id) on delete cascade,
  certified_by  text,
  scope         text not null,
  issued_at     timestamptz not null default now()
);

create index if not exists idx_compliance_certificates_run_id on public.compliance_certificates (run_id);

alter table public.compliance_certificates enable row level security;

drop policy if exists "service_role_full_access" on public.compliance_certificates;
create policy "service_role_full_access" on public.compliance_certificates
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
