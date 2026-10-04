create table if not exists public.agent_action_approvals (
  id                     uuid primary key default gen_random_uuid(),
  actor_user_id          uuid not null,
  action                 text not null,
  plan_hash              text not null,
  target_resource        text not null,
  expected_fingerprint   text,
  approved_at            timestamptz not null default now(),
  expires_at             timestamptz not null,
  step_up_evidence_id    uuid,
  consumed_at            timestamptz,
  consumed_result        text
);

comment on table public.agent_action_approvals is 'ESS-0018 Phase 2: single-use, plan-hash-bound approval artifacts for governed agent write actions. Service-Role-only, no client access.';

create index if not exists idx_agent_action_approvals_lookup
  on public.agent_action_approvals (id)
  where consumed_at is null;

alter table public.agent_action_approvals enable row level security;

drop policy if exists "service_role_full_access" on public.agent_action_approvals;
create policy "service_role_full_access" on public.agent_action_approvals
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
