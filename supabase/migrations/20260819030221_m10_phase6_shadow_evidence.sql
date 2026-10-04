-- M10 (ADR-0066, ESS-0022) Phase 6 — immutable Shadow Mode evidence and prerequisite hardening.
-- Shadow evidence is intentionally separate from m10_approval_evidence so it can never be
-- consumed by Phase 5 as an authoritative CI approval.

begin;

-- Production preflight found residual REFERENCES/TRIGGER/TRUNCATE privileges from the earlier
-- Phase-3 table creation. RLS is not a substitute for table-level least privilege (notably TRUNCATE),
-- so normalize both legacy M10 credential tables to server-only access before enabling Shadow Mode.
revoke all on table public.m10_owner_credentials from anon, authenticated, service_role;
revoke all on table public.m10_registration_challenges from anon, authenticated, service_role;
grant select, insert, update on table public.m10_owner_credentials to service_role;
grant select, insert, update on table public.m10_registration_challenges to service_role;

-- Supabase Performance Advisor follow-up from the production Phase-5 migration verification.
create index if not exists m10_approval_evidence_credential_id_idx
  on public.m10_approval_evidence (credential_id);

create table if not exists public.m10_shadow_evaluations (
  shadow_id text primary key,
  owner_actor_id text not null check (owner_actor_id = 'SvenKulessa'),
  credential_id text not null references public.m10_owner_credentials(credential_id) on delete restrict,
  challenge_id text not null unique references public.m10_authorization_challenges(challenge_id) on delete restrict,
  authorization_digest text not null unique
    check (authorization_digest ~ '^[0-9a-f]{64}$'),
  repository text not null check (repository = 'SvenKulessa/Finance'),
  pr_number integer not null check (pr_number > 0),
  base_branch text not null,
  base_sha text not null,
  head_sha text not null,
  changed_file_set_hash text not null check (changed_file_set_hash ~ '^[0-9a-f]{64}$'),
  diff_review_digest text not null check (diff_review_digest ~ '^[0-9a-f]{64}$'),
  action text not null check (action = 'AUTHORIZE_PR_CI'),
  verdict text not null check (verdict = 'APPROVED_SHADOW'),
  approved_at timestamptz not null,
  observed_at timestamptz not null default clock_timestamp()
);

create index if not exists m10_shadow_evaluations_pr_idx
  on public.m10_shadow_evaluations (repository, pr_number, observed_at desc);
create index if not exists m10_shadow_evaluations_head_idx
  on public.m10_shadow_evaluations (head_sha, observed_at desc);

alter table public.m10_shadow_evaluations enable row level security;

revoke all on table public.m10_shadow_evaluations from anon, authenticated, service_role;
grant select, insert on table public.m10_shadow_evaluations to service_role;

create or replace function public.guard_m10_shadow_evaluation_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    return new;
  end if;
  raise exception 'm10_shadow_evaluations is immutable';
end;
$$;

revoke all on function public.guard_m10_shadow_evaluation_mutation() from public, anon, authenticated, service_role;

drop trigger if exists m10_shadow_evaluations_guard on public.m10_shadow_evaluations;
create trigger m10_shadow_evaluations_guard
before insert or update or delete on public.m10_shadow_evaluations
for each row execute function public.guard_m10_shadow_evaluation_mutation();

comment on table public.m10_shadow_evaluations is
  'Non-authoritative M10 Phase-6 WebAuthn shadow evidence. Records here can never authorize CI consumption.';

commit;
