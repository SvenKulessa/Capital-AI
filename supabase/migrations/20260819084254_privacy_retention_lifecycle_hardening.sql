-- ADR-0092 / post-PR414 privacy hardening
--
-- Repairs production drift discovered on 2026-08-19:
--   * the repository-defined social-media persistence tables are absent in production,
--   * purge_expired_privacy_operational_data() therefore fails when it reaches OAuth state cleanup,
--   * pg_cron is available but no privacy-retention schedule exists.
--
-- The migration is deliberately idempotent so it can serve as a production catch-up without
-- changing business/statutory billing retention.

begin;

create table if not exists public.social_media_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('youtube', 'tiktok', 'instagram', 'x', 'facebook')),
  account_name text,
  handle text,
  avatar_url text,
  status text not null default 'disconnected' check (status in ('connected', 'disconnected', 'token_expired', 'connecting')),
  scopes text[] not null default '{}',
  followers_count integer,
  external_account_id text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform)
);

create table if not exists public.social_media_oauth_states (
  id uuid primary key default gen_random_uuid(),
  state_token text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('youtube', 'tiktok', 'instagram', 'x', 'facebook')),
  redirect_uri text not null,
  code_verifier text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create table if not exists public.social_media_publish_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  episode_id text,
  episode_title text,
  platform text not null check (platform in ('youtube', 'tiktok', 'instagram', 'x', 'facebook')),
  account_id uuid references public.social_media_accounts(id) on delete set null,
  account_handle text,
  status text not null check (status in ('published', 'scheduled', 'failed', 'draft')),
  publish_type text not null check (publish_type in ('instant', 'scheduled', 'draft')),
  published_url text,
  scheduled_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

comment on table public.social_media_accounts is
  'Per-user social-media account links. OAuth tokens are stored encrypted by the application and the table is service-role-only.';
comment on table public.social_media_oauth_states is
  'Short-lived, single-use OAuth state/PKCE records for social account linking. Service-role-only.';
comment on table public.social_media_publish_log is
  'Per-user social publishing history. Service-role-only; no direct browser access.';

create or replace function public.touch_social_media_accounts_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_social_media_accounts_updated_at on public.social_media_accounts;
create trigger trg_social_media_accounts_updated_at
before update on public.social_media_accounts
for each row execute function public.touch_social_media_accounts_updated_at();

create index if not exists idx_social_media_oauth_states_expires
  on public.social_media_oauth_states (expires_at);
create index if not exists idx_social_media_publish_log_user
  on public.social_media_publish_log (user_id, created_at desc);

alter table public.social_media_accounts enable row level security;
alter table public.social_media_oauth_states enable row level security;
alter table public.social_media_publish_log enable row level security;

revoke all on table public.social_media_accounts from anon, authenticated;
revoke all on table public.social_media_oauth_states from anon, authenticated;
revoke all on table public.social_media_publish_log from anon, authenticated;
grant select, insert, update, delete on table public.social_media_accounts to service_role;
grant select, insert, update, delete on table public.social_media_oauth_states to service_role;
grant select, insert, update, delete on table public.social_media_publish_log to service_role;

drop policy if exists service_role_full_access on public.social_media_accounts;
create policy service_role_full_access on public.social_media_accounts
  for all to service_role using (true) with check (true);

drop policy if exists service_role_full_access on public.social_media_oauth_states;
create policy service_role_full_access on public.social_media_oauth_states
  for all to service_role using (true) with check (true);

drop policy if exists service_role_full_access on public.social_media_publish_log;
create policy service_role_full_access on public.social_media_publish_log
  for all to service_role using (true) with check (true);

alter table public.security_events
  add column if not exists retention_hold_until timestamptz;
comment on column public.security_events.retention_hold_until is
  'Optional incident/legal preservation boundary. Rows are excluded from generic privacy retention while this timestamp is in the future.';

alter table public.privacy_requests
  add column if not exists identity_verified_at timestamptz,
  add column if not exists retention_hold_until timestamptz;

comment on column public.privacy_requests.identity_verified_at is
  'Timestamp when the authenticated privacy-rights workflow records identity verification.';
comment on column public.privacy_requests.retention_hold_until is
  'Optional accountability/legal preservation boundary that overrides the generic three-year post-completion purge window while active.';

create or replace function public.touch_privacy_request_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.status is distinct from new.status then
    if not (
      (old.status = 'received' and new.status in ('identity_verified', 'rejected')) or
      (old.status = 'identity_verified' and new.status in ('in_progress', 'rejected')) or
      (old.status = 'in_progress' and new.status in ('completed', 'rejected'))
    ) then
      raise exception 'invalid privacy request status transition: % -> %', old.status, new.status
        using errcode = '23514';
    end if;
  end if;

  new.updated_at := now();

  if new.status = 'identity_verified' and new.identity_verified_at is null then
    new.identity_verified_at := now();
  end if;

  if new.status in ('completed', 'rejected') and new.completed_at is null then
    new.completed_at := now();
  end if;

  return new;
end;
$$;

create table if not exists public.privacy_retention_runs (
  id bigint generated by default as identity primary key,
  run_at timestamptz not null default now(),
  invocation text not null default 'database',
  status text not null check (status in ('succeeded', 'skipped_concurrent')),
  purged_counts jsonb not null default '{}'::jsonb
);

comment on table public.privacy_retention_runs is
  'Audit evidence for successful or concurrency-skipped privacy-retention executions. Failed pg_cron executions remain visible in cron.job_run_details.';

alter table public.privacy_retention_runs enable row level security;
revoke all on table public.privacy_retention_runs from anon, authenticated;
grant select, insert on table public.privacy_retention_runs to service_role;

drop policy if exists privacy_retention_runs_service_role on public.privacy_retention_runs;
create policy privacy_retention_runs_service_role on public.privacy_retention_runs
  for all to service_role using (true) with check (true);

create or replace function public.purge_expired_privacy_operational_data(
  p_now timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_security_events integer := 0;
  v_oauth_states integer := 0;
  v_step_up_tokens integer := 0;
  v_user_quota integer := 0;
  v_unconfirmed_alerts integer := 0;
  v_privacy_requests integer := 0;
  v_result jsonb;
begin
  if not pg_try_advisory_xact_lock(202608190031) then
    v_result := jsonb_build_object(
      'status', 'skipped_concurrent',
      'purged_at', p_now
    );
    insert into public.privacy_retention_runs(invocation, status, purged_counts)
    values ('function', 'skipped_concurrent', v_result);
    return v_result;
  end if;

  if to_regclass('public.security_events') is not null then
    execute $sql$
      delete from public.security_events
       where created_at < $1 - interval '180 days'
         and (retention_hold_until is null or retention_hold_until < $1)
    $sql$ using p_now;
    get diagnostics v_security_events = row_count;
  end if;

  if to_regclass('public.social_media_oauth_states') is not null then
    execute $sql$
      delete from public.social_media_oauth_states
       where expires_at < $1 - interval '1 day'
    $sql$ using p_now;
    get diagnostics v_oauth_states = row_count;
  end if;

  if to_regclass('public.step_up_tokens') is not null then
    execute $sql$
      delete from public.step_up_tokens
       where expires_at < $1 - interval '7 days'
    $sql$ using p_now;
    get diagnostics v_step_up_tokens = row_count;
  end if;

  if to_regclass('public.user_quota') is not null then
    execute $sql$
      delete from public.user_quota
       where updated_at < $1 - interval '90 days'
    $sql$ using p_now;
    get diagnostics v_user_quota = row_count;
  end if;

  if to_regclass('public.alert_subscriptions') is not null then
    execute $sql$
      delete from public.alert_subscriptions
       where confirmed = false
         and created_at < $1 - interval '14 days'
    $sql$ using p_now;
    get diagnostics v_unconfirmed_alerts = row_count;
  end if;

  if to_regclass('public.privacy_requests') is not null then
    execute $sql$
      delete from public.privacy_requests
       where completed_at is not null
         and completed_at < $1 - interval '3 years'
         and (retention_hold_until is null or retention_hold_until < $1)
    $sql$ using p_now;
    get diagnostics v_privacy_requests = row_count;
  end if;

  v_result := jsonb_build_object(
    'status', 'succeeded',
    'security_events', v_security_events,
    'social_media_oauth_states', v_oauth_states,
    'step_up_tokens', v_step_up_tokens,
    'user_quota', v_user_quota,
    'unconfirmed_alert_subscriptions', v_unconfirmed_alerts,
    'privacy_requests', v_privacy_requests,
    'purged_at', p_now
  );

  insert into public.privacy_retention_runs(invocation, status, purged_counts)
  values ('function', 'succeeded', v_result);

  return v_result;
end;
$$;

revoke all on function public.purge_expired_privacy_operational_data(timestamptz)
  from public, anon, authenticated;
grant execute on function public.purge_expired_privacy_operational_data(timestamptz)
  to service_role;

comment on function public.purge_expired_privacy_operational_data(timestamptz) is
  'ADR-0092 fail-safe privacy retention. Service-role-only, concurrency-safe, table-presence-aware and retention-hold-aware; business/statutory billing records remain outside generic purge.';

do $$
declare
  v_jobid bigint;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    for v_jobid in
      select jobid from cron.job where jobname = 'privacy-operational-retention-daily'
    loop
      perform cron.unschedule(v_jobid);
    end loop;

    perform cron.schedule(
      'privacy-operational-retention-daily',
      '17 3 * * *',
      'select public.purge_expired_privacy_operational_data();'
    );
  else
    raise exception 'pg_cron extension is required for ADR-0092 scheduled privacy retention';
  end if;
end;
$$;

commit;