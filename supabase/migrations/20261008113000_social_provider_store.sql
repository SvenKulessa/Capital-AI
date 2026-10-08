-- CAPITAL_AI_SOCIAL_PROVIDER_STORE@1. Additive, replay-safe PostgreSQL migration.
-- Commit only: no DDL has been applied to Supabase production.
-- The sandbox lacks Supabase CLI; filename follows existing repository convention.
-- Existing records remain and cannot acquire publication authority by default.
begin;

alter table public.social_media_content_approvals
  add column if not exists campaign_id text,
  add column if not exists content_id text,
  add column if not exists source_sha text,
  add column if not exists asset_id text,
  add column if not exists asset_sha256 text,
  add column if not exists public_publish_allowed boolean not null default false;

alter table public.social_media_content_approvals
  drop constraint if exists social_approval_asset_sha256_format;
alter table public.social_media_content_approvals
  add constraint social_approval_asset_sha256_format
  check (asset_sha256 is null or asset_sha256 ~ '^[a-f0-9]{64}$');

-- Old "approved" rows remain readable but fail the new asset/hash/owner contract.
-- No destructive updates or blanket legacy backfills.
create table if not exists public.social_media_delivery_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.social_media_accounts(id) on delete restrict,
  approval_ref text not null references public.social_media_content_approvals(id) on delete restrict,
  campaign_id text not null,
  content_id text not null,
  source_sha text not null check (source_sha ~ '^[a-f0-9]{40}([a-f0-9]{24})?$'),
  asset_id text not null,
  asset_sha256 text not null check (asset_sha256 ~ '^[a-f0-9]{64}$'),
  platform text not null check (platform in ('youtube','tiktok','instagram','x','facebook')),
  delivery_key text not null,
  status text not null default 'CLAIMED'
    check (status in ('CLAIMED','PROCESSING','UNKNOWN','PUBLISHED','FAILED')),
  expires_at timestamptz not null,
  provider_delivery_id text,
  published_url text,
  evidence_ref text,
  publish_log_id uuid unique references public.social_media_publish_log(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, delivery_key),
  check (length(delivery_key) between 1 and 700),
  check (length(asset_id) between 1 and 200),
  check (length(campaign_id) between 1 and 160),
  check (length(content_id) between 1 and 200)
);
comment on table public.social_media_delivery_jobs is
  'Durable social dispatch reservation; external publication always requires separately verified approval and provider readback.';
create index if not exists social_delivery_jobs_user_created_idx
  on public.social_media_delivery_jobs (user_id, created_at desc);
create index if not exists social_delivery_jobs_pending_idx
  on public.social_media_delivery_jobs (status, expires_at)
  where status in ('CLAIMED','PROCESSING','UNKNOWN');
alter table public.social_media_delivery_jobs enable row level security;
revoke all on public.social_media_delivery_jobs from public, anon, authenticated;
grant select, insert, update on public.social_media_delivery_jobs to service_role;

-- Service-role-only INVOKER RPC. Unique(user_id, delivery_key) is the durable
-- idempotency barrier. Existing/expired/UNKNOWN rows are never auto-reclaimed.
create or replace function public.capital_social_claim_delivery(
  p_user_id uuid,
  p_account_id uuid,
  p_approval_ref text,
  p_campaign_id text,
  p_content_id text,
  p_source_sha text,
  p_asset_id text,
  p_asset_sha256 text,
  p_platform text,
  p_delivery_key text
) returns public.social_media_delivery_jobs
language plpgsql security invoker set search_path = ''
as $$
declare v_account public.social_media_accounts%rowtype;
        v_approval public.social_media_content_approvals%rowtype;
        v_job public.social_media_delivery_jobs%rowtype;
begin
  select * into v_account from public.social_media_accounts
    where id = p_account_id and user_id = p_user_id
      and platform = p_platform and status = 'connected'
      and token_expires_at > now() + interval '1 minute'
      and cardinality(scopes) > 0 and access_token_encrypted is not null;
  if not found then raise exception 'SOCIAL_ACCOUNT_NOT_READY'; end if;

  select * into v_approval from public.social_media_content_approvals
    where id = p_approval_ref and user_id = p_user_id and status = 'approved'
      and campaign_id = p_campaign_id and content_id = p_content_id
      and source_sha = p_source_sha and asset_id = p_asset_id
      and asset_sha256 = p_asset_sha256 and public_publish_allowed = true
      and p_platform = any(platforms)
      and decided_at is not null and nullif(decided_by, '') is not null;
  if not found then raise exception 'SOCIAL_HASH_APPROVAL_NOT_READY'; end if;

  if p_source_sha !~ '^[a-f0-9]{40}([a-f0-9]{24})?$'
      or p_asset_sha256 !~ '^[a-f0-9]{64}$'
      or p_delivery_key is null or p_delivery_key <> concat(
        p_campaign_id, ':', p_content_id, ':', p_asset_id, ':', upper(p_platform)
      ) then raise exception 'SOCIAL_DELIVERY_IDENTITY_INVALID'; end if;

  insert into public.social_media_delivery_jobs
    (user_id, account_id, approval_ref, campaign_id, content_id,
     source_sha, asset_id, asset_sha256, platform, delivery_key, expires_at)
  values (p_user_id, p_account_id, p_approval_ref, p_campaign_id, p_content_id,
          p_source_sha, p_asset_id, p_asset_sha256, p_platform, p_delivery_key,
          now() + interval '10 minutes')
  on conflict (user_id, delivery_key) do nothing returning * into v_job;
  if not found then raise exception 'SOCIAL_DELIVERY_ALREADY_RESERVED'; end if;
  return v_job;
end;
$$;
revoke all on function public.capital_social_claim_delivery(uuid,uuid,text,text,text,text,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.capital_social_claim_delivery(uuid,uuid,text,text,text,text,text,text,text,text)
  to service_role;

-- CAS consume of existing hashed OAuth state. The API may exchange the
-- authorization code only AFTER this RPC commits. Caller identity must come
-- from verified server session, never an unsigned query parameter.
create or replace function public.capital_social_consume_oauth_state(
  p_state_hash text, p_user_id uuid, p_platform text, p_redirect_uri text
) returns public.social_media_oauth_states
language plpgsql security invoker set search_path = ''
as $$
declare v_state public.social_media_oauth_states%rowtype;
begin
  if p_state_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'SOCIAL_OAUTH_STATE_FORMAT_INVALID';
  end if;
  update public.social_media_oauth_states
  set used_at = now()
  where state_token = p_state_hash and user_id = p_user_id
    and platform = p_platform and redirect_uri = p_redirect_uri
    and used_at is null and expires_at > now()
  returning * into v_state;
  if not found then raise exception 'SOCIAL_OAUTH_STATE_REUSED_OR_EXPIRED'; end if;
  return v_state;
end;
$$;
revoke all on function public.capital_social_consume_oauth_state(text,uuid,text,text)
  from public, anon, authenticated;
grant execute on function public.capital_social_consume_oauth_state(text,uuid,text,text)
  to service_role;

-- Mark an uncertain dispatch without a blind retry or publish-log mutation.
-- Provider receipt IDs are useful for later status readbacks, not proof of publication.
create or replace function public.capital_social_note_unknown(
  p_user_id uuid, p_job_id uuid, p_provider_delivery_id text, p_evidence_ref text
) returns public.social_media_delivery_jobs
language plpgsql security invoker set search_path = ''
as $social$
declare v_job public.social_media_delivery_jobs%rowtype;
begin
  if nullif(p_evidence_ref, '') is null
    or (p_provider_delivery_id is not null
      and length(p_provider_delivery_id) not between 1 and 200) then
    raise exception 'SOCIAL_RECEIPT_EVIDENCE_REQUIRED';
  end if;
  update public.social_media_delivery_jobs
    set status = 'UNKNOWN',
      provider_delivery_id = coalesce(p_provider_delivery_id, provider_delivery_id),
      evidence_ref = p_evidence_ref, updated_at = now()
    where id = p_job_id and user_id = p_user_id
      and status in ('CLAIMED','PROCESSING','UNKNOWN')
      and publish_log_id is null
      and (provider_delivery_id is null or p_provider_delivery_id is null
        or provider_delivery_id = p_provider_delivery_id)
  returning * into v_job;
  if not found then raise exception 'SOCIAL_DELIVERY_UNKNOWN_UPDATE_DENIED'; end if;
  return v_job;
end;
$social$;
revoke all on function public.capital_social_note_unknown(uuid,uuid,text,text)
  from public, anon, authenticated;
grant execute on function public.capital_social_note_unknown(uuid,uuid,text,text)
  to service_role;

-- Log only verified terminal completion. The server must have independently
-- confirmed provider status, ID, target URL and evidence BEFORE calling.
-- Unknown/timeout outcomes stay in the delivery job, no blind re-send.
create or replace function public.capital_social_complete_delivery(
  p_user_id uuid, p_job_id uuid, p_terminal_state text,
  p_provider_delivery_id text, p_published_url text, p_evidence_ref text
) returns public.social_media_delivery_jobs
language plpgsql security invoker set search_path = ''
as $$
declare v_job public.social_media_delivery_jobs%rowtype;
        v_log_id uuid;
begin
  if p_terminal_state not in ('PUBLISHED','FAILED')
    or nullif(p_evidence_ref, '') is null
    or (p_terminal_state = 'PUBLISHED' and
      (nullif(p_provider_delivery_id, '') is null
       or p_published_url !~ '^https://')) then
    raise exception 'SOCIAL_TERMINAL_EVIDENCE_REQUIRED';
  end if;
  update public.social_media_delivery_jobs
  set status = p_terminal_state, provider_delivery_id = p_provider_delivery_id,
    published_url = case when p_terminal_state = 'PUBLISHED' then p_published_url else null end,
    evidence_ref = p_evidence_ref, updated_at = now()
  where id = p_job_id and user_id = p_user_id
    and status in ('CLAIMED','PROCESSING','UNKNOWN')
    and publish_log_id is null
  returning * into v_job;
  if not found then raise exception 'SOCIAL_DELIVERY_NOT_FINISHABLE'; end if;
  insert into public.social_media_publish_log
    (user_id, episode_id, platform, account_id, status, publish_type, published_url)
  values (v_job.user_id, v_job.content_id, v_job.platform, v_job.account_id,
    lower(p_terminal_state), 'instant', v_job.published_url)
  returning id into v_log_id;
  update public.social_media_delivery_jobs
    set publish_log_id = v_log_id
    where id = v_job.id returning * into v_job;
  return v_job;
end;
$$;
revoke all on function public.capital_social_complete_delivery(uuid,uuid,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.capital_social_complete_delivery(uuid,uuid,text,text,text,text)
  to service_role;

-- Old tables already use service-role-only RLS. No permissive policy added.
commit;
