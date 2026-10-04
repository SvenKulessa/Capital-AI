create table if not exists public.agent_evaluation_runs (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid not null,
  prompt_id    text not null,
  eval_input   text not null,
  succeeded    boolean not null,
  latency_ms   integer not null,
  evaluated_at timestamptz not null default now()
);

comment on table public.agent_evaluation_runs is 'Regressionsmessung fuer die Gemini-Agenten (ARCH-AUDIT-0002 J2): pro Lauf (run_id) und Agent (prompt_id), ob eine echte KI-Antwort erzielt wurde oder auf den hartkodierten Fallback zurueckgefallen wurde. Service-Role-only, kein Client-Zugriff.';

create index if not exists idx_agent_evaluation_runs_run_id on public.agent_evaluation_runs (run_id);
create index if not exists idx_agent_evaluation_runs_evaluated_at on public.agent_evaluation_runs (evaluated_at);

alter table public.agent_evaluation_runs enable row level security;

drop policy if exists "service_role_full_access" on public.agent_evaluation_runs;
create policy "service_role_full_access" on public.agent_evaluation_runs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
