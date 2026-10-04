-- M10 (ADR-0066, ESS-0022) Phases 2/4/5 durable PR-CI authorization state.
-- Repository migration only. Production application remains a separate class-M mutation after Human merge.

begin;

create table if not exists public.m10_authorization_challenges (
  challenge_id text primary key,
  challenge text not null,
  owner_actor_id text not null check (owner_actor_id = 'SvenKulessa'),
  repository text not null check (repository = 'SvenKulessa/Finance'),
  pr_number integer not null check (pr_number > 0),
  base_branch text not null,
  base_sha text not null,
  head_sha text not null,
  changed_file_set_hash text not null check (changed_file_set_hash ~ '^[0-9a-f]{64}$'),
  diff_review_digest text not null check (diff_review_digest ~ '^[0-9a-f]{64}$'),
  action text not null check (action = 'AUTHORIZE_PR_CI'),
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  revoked_at timestamptz null,
  constraint m10_authorization_challenges_time_order check (expires_at > issued_at),
  constraint m10_authorization_challenges_terminal_state check (
    not (consumed_at is not null and revoked_at is not null)
  )
);

create index if not exists m10_authorization_challenges_pr_idx
  on public.m10_authorization_challenges (repository, pr_number, issued_at desc);
create index if not exists m10_authorization_challenges_head_idx
  on public.m10_authorization_challenges (head_sha, issued_at desc);

create table if not exists public.m10_approval_evidence (
  approval_id text primary key,
  owner_actor_id text not null check (owner_actor_id = 'SvenKulessa'),
  credential_id text not null references public.m10_owner_credentials(credential_id) on delete restrict,
  challenge_id text not null unique references public.m10_authorization_challenges(challenge_id) on delete restrict,
  authorization_digest text not null unique,
  repository text not null check (repository = 'SvenKulessa/Finance'),
  pr_number integer not null check (pr_number > 0),
  base_branch text not null,
  base_sha text not null,
  head_sha text not null,
  changed_file_set_hash text not null check (changed_file_set_hash ~ '^[0-9a-f]{64}$'),
  diff_review_digest text not null check (diff_review_digest ~ '^[0-9a-f]{64}$'),
  action text not null check (action = 'AUTHORIZE_PR_CI'),
  approved_at timestamptz not null,
  consumed_at timestamptz null,
  constraint m10_approval_evidence_digest_shape check (authorization_digest ~ '^[0-9a-f]{64}$')
);

create index if not exists m10_approval_evidence_pr_idx
  on public.m10_approval_evidence (repository, pr_number, approved_at desc);
create index if not exists m10_approval_evidence_head_idx
  on public.m10_approval_evidence (head_sha, approved_at desc);

create table if not exists public.m10_ci_consumptions (
  consumption_id text primary key,
  approval_id text not null unique references public.m10_approval_evidence(approval_id) on delete restrict,
  repository text not null check (repository = 'SvenKulessa/Finance'),
  pr_number integer not null check (pr_number > 0),
  head_sha text not null,
  authorization_digest text not null,
  consumed_at timestamptz not null,
  dispatch_state text not null default 'PENDING'
    check (dispatch_state in ('PENDING', 'DISPATCHED', 'FAILED_UNCERTAIN')),
  dispatch_completed_at timestamptz null,
  failure_reason text null,
  constraint m10_ci_consumptions_one_run_per_head unique (repository, pr_number, head_sha),
  constraint m10_ci_consumptions_digest_shape check (authorization_digest ~ '^[0-9a-f]{64}$')
);

create index if not exists m10_ci_consumptions_state_idx
  on public.m10_ci_consumptions (dispatch_state, consumed_at desc);

alter table public.m10_authorization_challenges enable row level security;
alter table public.m10_approval_evidence enable row level security;
alter table public.m10_ci_consumptions enable row level security;

revoke all on table public.m10_authorization_challenges from anon, authenticated, service_role;
revoke all on table public.m10_approval_evidence from anon, authenticated, service_role;
revoke all on table public.m10_ci_consumptions from anon, authenticated, service_role;

grant select, insert, update on table public.m10_authorization_challenges to service_role;
grant select, insert on table public.m10_approval_evidence to service_role;
grant select on table public.m10_ci_consumptions to service_role;

create or replace function public.guard_m10_authorization_challenge_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if new.consumed_at is null and new.revoked_at is null then
      return new;
    end if;
    raise exception 'm10_authorization_challenges must be inserted UNUSED';
  end if;

  if tg_op = 'DELETE' then
    raise exception 'm10_authorization_challenges cannot be deleted';
  end if;

  if old.consumed_at is null
     and old.revoked_at is null
     and (
       (new.consumed_at is not null and new.revoked_at is null)
       or (new.consumed_at is null and new.revoked_at is not null)
     )
     and (
       to_jsonb(new) - array['consumed_at', 'revoked_at']
     ) = (
       to_jsonb(old) - array['consumed_at', 'revoked_at']
     ) then
    return new;
  end if;

  raise exception 'm10_authorization_challenges context is immutable and lifecycle transition is single-use';
end;
$$;

revoke all on function public.guard_m10_authorization_challenge_mutation() from public;

drop trigger if exists m10_authorization_challenges_guard on public.m10_authorization_challenges;
create trigger m10_authorization_challenges_guard
before insert or update or delete on public.m10_authorization_challenges
for each row execute function public.guard_m10_authorization_challenge_mutation();

create or replace function public.guard_m10_approval_evidence_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if new.consumed_at is null then
      return new;
    end if;
    raise exception 'm10_approval_evidence must be inserted unconsumed';
  end if;

  if tg_op = 'DELETE' then
    raise exception 'm10_approval_evidence is immutable and cannot be deleted';
  end if;

  if old.consumed_at is null
     and new.consumed_at is not null
     and (to_jsonb(new) - 'consumed_at') = (to_jsonb(old) - 'consumed_at') then
    return new;
  end if;

  raise exception 'm10_approval_evidence only permits the atomic unconsumed -> consumed transition';
end;
$$;

revoke all on function public.guard_m10_approval_evidence_mutation() from public;

drop trigger if exists m10_approval_evidence_guard on public.m10_approval_evidence;
create trigger m10_approval_evidence_guard
before insert or update or delete on public.m10_approval_evidence
for each row execute function public.guard_m10_approval_evidence_mutation();

create or replace function public.guard_m10_ci_consumption_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if new.dispatch_state = 'PENDING'
       and new.dispatch_completed_at is null
       and new.failure_reason is null then
      return new;
    end if;
    raise exception 'm10_ci_consumptions must be inserted PENDING';
  end if;

  if tg_op = 'DELETE' then
    raise exception 'm10_ci_consumptions is immutable and cannot be deleted';
  end if;

  if old.dispatch_state = 'PENDING'
     and new.dispatch_state in ('DISPATCHED', 'FAILED_UNCERTAIN')
     and new.dispatch_completed_at is not null
     and (
       to_jsonb(new) - array['dispatch_state', 'dispatch_completed_at', 'failure_reason']
     ) = (
       to_jsonb(old) - array['dispatch_state', 'dispatch_completed_at', 'failure_reason']
     ) then
    return new;
  end if;

  raise exception 'm10_ci_consumptions only permits one terminal dispatch transition';
end;
$$;

revoke all on function public.guard_m10_ci_consumption_mutation() from public;

drop trigger if exists m10_ci_consumptions_guard on public.m10_ci_consumptions;
create trigger m10_ci_consumptions_guard
before insert or update or delete on public.m10_ci_consumptions
for each row execute function public.guard_m10_ci_consumption_mutation();

create or replace function public.claim_m10_ci_consumption(
  p_approval_id text,
  p_consumption_id text,
  p_expected_repository text,
  p_expected_pr_number integer,
  p_expected_head_sha text,
  p_expected_authorization_digest text
)
returns table(status text, returned_consumption_id text, returned_consumed_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_approval public.m10_approval_evidence%rowtype;
  v_consumed_at timestamptz;
begin
  select * into v_approval
  from public.m10_approval_evidence
  where approval_id = p_approval_id
  for update;

  if not found then
    return query select 'DENY_UNKNOWN_APPROVAL'::text, null::text, null::timestamptz;
    return;
  end if;

  if v_approval.repository <> p_expected_repository
     or v_approval.pr_number <> p_expected_pr_number
     or v_approval.head_sha <> p_expected_head_sha
     or v_approval.authorization_digest <> p_expected_authorization_digest then
    return query select 'DENY_CONTEXT_MISMATCH'::text, null::text, null::timestamptz;
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_approval.repository || '|' || v_approval.pr_number::text || '|' || v_approval.head_sha, 0)
  );

  if exists (
    select 1 from public.m10_ci_consumptions
    where repository = v_approval.repository
      and pr_number = v_approval.pr_number
      and head_sha = v_approval.head_sha
  ) then
    return query select 'DEDUPE_HEAD'::text, null::text, null::timestamptz;
    return;
  end if;

  if v_approval.consumed_at is not null then
    return query select 'DEDUPE_APPROVAL'::text, null::text, v_approval.consumed_at;
    return;
  end if;

  v_consumed_at := clock_timestamp();

  update public.m10_approval_evidence
  set consumed_at = v_consumed_at
  where approval_id = p_approval_id
    and consumed_at is null;

  if not found then
    return query select 'DEDUPE_APPROVAL'::text, null::text, null::timestamptz;
    return;
  end if;

  insert into public.m10_ci_consumptions (
    consumption_id,
    approval_id,
    repository,
    pr_number,
    head_sha,
    authorization_digest,
    consumed_at,
    dispatch_state
  ) values (
    p_consumption_id,
    v_approval.approval_id,
    v_approval.repository,
    v_approval.pr_number,
    v_approval.head_sha,
    v_approval.authorization_digest,
    v_consumed_at,
    'PENDING'
  );

  return query select 'CLAIMED'::text, p_consumption_id, v_consumed_at;
end;
$$;

revoke all on function public.claim_m10_ci_consumption(text, text, text, integer, text, text) from public;
grant execute on function public.claim_m10_ci_consumption(text, text, text, integer, text, text) to service_role;

create or replace function public.finalize_m10_ci_dispatch(
  p_consumption_id text,
  p_terminal_state text,
  p_failure_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_terminal_state not in ('DISPATCHED', 'FAILED_UNCERTAIN') then
    raise exception 'invalid terminal dispatch state';
  end if;

  update public.m10_ci_consumptions
  set dispatch_state = p_terminal_state,
      dispatch_completed_at = clock_timestamp(),
      failure_reason = case
        when p_terminal_state = 'FAILED_UNCERTAIN' then left(coalesce(p_failure_reason, 'dispatch outcome uncertain'), 500)
        else null
      end
  where consumption_id = p_consumption_id
    and dispatch_state = 'PENDING';

  return found;
end;
$$;

revoke all on function public.finalize_m10_ci_dispatch(text, text, text) from public;
grant execute on function public.finalize_m10_ci_dispatch(text, text, text) to service_role;

comment on table public.m10_authorization_challenges is
  'M10 short-lived PR authorization challenges bound to exact trusted GitHub PR state.';
comment on table public.m10_approval_evidence is
  'M10 immutable Owner WebAuthn approval evidence; only consumed_at may transition once.';
comment on table public.m10_ci_consumptions is
  'M10 atomic CI-consumption evidence; at most one expensive CI dispatch is claimable per exact PR head.';

commit;