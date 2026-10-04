-- ADR-0086 — durable append-only runtime AI governance evaluation evidence.
-- Repository migration only. Production application is a separate class-M mutation.

begin;

create table if not exists public.ai_governance_evaluations (
  id uuid primary key default gen_random_uuid(),
  evaluation_id text not null unique,
  observed_at timestamptz not null,
  prompt_id text not null,
  prompt_version text not null,
  model_provider text not null check (model_provider in ('anthropic', 'openai')),
  model text not null,
  request_id text null,
  evidence_ids jsonb not null default '[]'::jsonb,
  checks jsonb not null default '{}'::jsonb,
  outcome text not null check (outcome in ('PASS', 'WARN', 'FAIL')),
  notes text null,
  evidence jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_governance_evaluations_observed_at_idx
  on public.ai_governance_evaluations (observed_at desc);
create index if not exists ai_governance_evaluations_request_id_idx
  on public.ai_governance_evaluations (request_id)
  where request_id is not null;
create index if not exists ai_governance_evaluations_prompt_idx
  on public.ai_governance_evaluations (prompt_id, observed_at desc);
create index if not exists ai_governance_evaluations_outcome_idx
  on public.ai_governance_evaluations (outcome, observed_at desc);

alter table public.ai_governance_evaluations enable row level security;

-- This repository intentionally does not rely on Supabase default service_role grants.
-- Browser roles receive no table privileges; the server-side privileged role receives only
-- SELECT/INSERT because records are immutable evidence.
revoke all on table public.ai_governance_evaluations from anon;
revoke all on table public.ai_governance_evaluations from authenticated;
revoke all on table public.ai_governance_evaluations from service_role;
grant select, insert on table public.ai_governance_evaluations to service_role;

create or replace function public.prevent_ai_governance_evaluation_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'ai_governance_evaluations is append-only';
end;
$$;

revoke all on function public.prevent_ai_governance_evaluation_mutation() from public;

DROP TRIGGER IF EXISTS ai_governance_evaluations_no_update_delete ON public.ai_governance_evaluations;
create trigger ai_governance_evaluations_no_update_delete
before update or delete on public.ai_governance_evaluations
for each row execute function public.prevent_ai_governance_evaluation_mutation();

comment on table public.ai_governance_evaluations is
  'Append-only runtime AI model/prompt/evaluation governance evidence. Server-side privileged writes only.';

commit;