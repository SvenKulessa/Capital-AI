-- CAPITAL_AI_INSTAGRAM_CAROUSEL_GROUP_CAS@1
-- Additive, server-owned, fail-closed. Never apply to production as part of CI.
-- A group is NOT a published post. This migration does not activate Meta.
begin;

create table if not exists public.social_media_carousel_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.social_media_accounts(id) on delete restrict,
  campaign_id text not null,
  content_id text not null,
  source_sha text not null check (source_sha ~ '^[a-f0-9]{40}([a-f0-9]{24})?$'),
  asset_ids text[] not null,
  asset_sha256s text[] not null,
  approval_refs text[] not null,
  editorial_fingerprint text not null check (editorial_fingerprint ~ '^[a-f0-9]{64}$'),
  delivery_key text not null,
  status text not null default 'CLAIMED'
    check (status in ('CLAIMED','SUBMITTING','UNKNOWN')),
  expires_at timestamptz not null,
  stage text,
  provider_delivery_id text,
  evidence_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, delivery_key),
  check (length(campaign_id) between 1 and 160),
  check (length(content_id) between 1 and 200),
  check (length(delivery_key) between 1 and 700),
  check (cardinality(asset_ids) between 2 and 10),
  check (cardinality(asset_ids) = cardinality(asset_sha256s)),
  check (cardinality(asset_ids) = cardinality(approval_refs))
);
comment on table public.social_media_carousel_groups is
  'Single atomic multi-JPEG dispatch reservation; no autonomous publish or retry.';
create index if not exists social_carousel_groups_status_expiry_idx
  on public.social_media_carousel_groups(status, expires_at);
alter table public.social_media_carousel_groups enable row level security;
revoke all on public.social_media_carousel_groups from public, anon, authenticated;
grant select, insert, update on public.social_media_carousel_groups to service_role;

-- App endpoints use a verified service-role key and SECURITY INVOKER functions only.
-- Exact per-position approval checks prevent unordered set substitution.
create or replace function public.capital_social_claim_carousel_group(
  p_user_id uuid, p_account_id uuid, p_campaign_id text, p_content_id text,
  p_source_sha text, p_asset_ids text[], p_asset_sha256s text[],
  p_approval_refs text[], p_editorial_fingerprint text, p_delivery_key text
) returns public.social_media_carousel_groups
language plpgsql security invoker set search_path = ''
as $social$
declare v_group public.social_media_carousel_groups%rowtype;
        v_count integer;
        i integer;
begin
  v_count := cardinality(p_asset_ids);
  if p_user_id is null or p_account_id is null
    or v_count is null or v_count not between 2 and 10
    or coalesce(cardinality(p_asset_sha256s), -1) <> v_count
    or coalesce(cardinality(p_approval_refs), -1) <> v_count
    or array_lower(p_asset_ids,1) <> 1
    or array_lower(p_asset_sha256s,1) <> 1
    or array_lower(p_approval_refs,1) <> 1
    or p_source_sha !~ '^[a-f0-9]{40}([a-f0-9]{24})?$'
    or p_editorial_fingerprint !~ '^[a-f0-9]{64}$'
    or p_delivery_key is distinct from concat(
      p_campaign_id, ':', p_content_id, ':INSTAGRAM:CAROUSEL:', p_editorial_fingerprint)
    or nullif(p_campaign_id,'') is null or nullif(p_content_id,'') is null
    or (select count(distinct id) from unnest(p_asset_ids) as x(id)) <> v_count
  then raise exception 'SOCIAL_CAROUSEL_GROUP_IDENTITY_INVALID'; end if;

  perform 1 from public.social_media_accounts a
    where a.id=p_account_id and a.user_id=p_user_id and a.platform='instagram'
      and a.status='connected' and a.token_expires_at > now() + interval '1 minute'
      and nullif(a.access_token_encrypted,'') is not null
      and cardinality(a.scopes) > 0;
  if not found then raise exception 'SOCIAL_CAROUSEL_ACCOUNT_NOT_READY'; end if;

  for i in 1..v_count loop
    if nullif(p_asset_ids[i],'') is null or length(p_asset_ids[i]) > 200
      or p_asset_sha256s[i] !~ '^[a-f0-9]{64}$'
      or nullif(p_approval_refs[i],'') is null
    then raise exception 'SOCIAL_CAROUSEL_ASSET_INVALID'; end if;
    perform 1 from public.social_media_content_approvals a
      where a.id=p_approval_refs[i] and a.user_id=p_user_id
        and a.status='approved' and a.public_publish_allowed=true
        and a.campaign_id=p_campaign_id and a.content_id=p_content_id
        and a.source_sha=p_source_sha and a.asset_id=p_asset_ids[i]
        and a.asset_sha256=p_asset_sha256s[i]
        and 'instagram'=any(a.platforms)
        and a.decided_at is not null and nullif(a.decided_by,'') is not null;
    if not found then raise exception 'SOCIAL_CAROUSEL_HASH_APPROVAL_NOT_READY'; end if;
  end loop;

  insert into public.social_media_carousel_groups
    (user_id, account_id, campaign_id, content_id, source_sha, asset_ids,
     asset_sha256s, approval_refs, editorial_fingerprint, delivery_key, expires_at)
  values (p_user_id,p_account_id,p_campaign_id,p_content_id,p_source_sha,
    p_asset_ids,p_asset_sha256s,p_approval_refs,p_editorial_fingerprint,
    p_delivery_key,now()+interval '10 minutes')
  on conflict (user_id,delivery_key) do nothing
  returning * into v_group;
  if not found then raise exception 'SOCIAL_CAROUSEL_GROUP_ALREADY_RESERVED'; end if;
  return v_group;
end;
$social$;
revoke all on function public.capital_social_claim_carousel_group(
  uuid,uuid,text,text,text,text[],text[],text[],text,text) from public,anon,authenticated;
grant execute on function public.capital_social_claim_carousel_group(
  uuid,uuid,text,text,text,text[],text[],text[],text,text) to service_role;

-- One winner under concurrent workers. No automatic reclaim of expired claims.
create or replace function public.capital_social_begin_carousel_attempt(
  p_user_id uuid,p_account_id uuid,p_group_id uuid,p_delivery_key text
) returns public.social_media_carousel_groups
language plpgsql security invoker set search_path = ''
as $social$
declare v_group public.social_media_carousel_groups%rowtype;
begin
  update public.social_media_carousel_groups
    set status='SUBMITTING',updated_at=now()
  where id=p_group_id and user_id=p_user_id and account_id=p_account_id
    and delivery_key=p_delivery_key and status='CLAIMED'
    and expires_at > clock_timestamp()
  returning * into v_group;
  if not found then raise exception 'SOCIAL_CAROUSEL_GROUP_CAS_DENIED'; end if;
  return v_group;
end;
$social$;
revoke all on function public.capital_social_begin_carousel_attempt(
  uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.capital_social_begin_carousel_attempt(
  uuid,uuid,uuid,text) to service_role;

-- Ambiguous provider status is sticky. Never create a terminal publish-log row.
create or replace function public.capital_social_note_carousel_unknown(
  p_user_id uuid,p_account_id uuid,p_group_id uuid,p_delivery_key text,
  p_stage text,p_provider_delivery_id text,p_evidence_ref text
) returns public.social_media_carousel_groups
language plpgsql security invoker set search_path = ''
as $social$
declare v_group public.social_media_carousel_groups%rowtype;
begin
  if p_stage !~ '^[A-Z_]{3,80}$'
    or nullif(p_evidence_ref,'') is null or length(p_evidence_ref)>512
    or (p_provider_delivery_id is not null
      and (length(p_provider_delivery_id) not between 1 and 200
        or p_provider_delivery_id !~ '^[0-9]{1,40}$'))
  then raise exception 'SOCIAL_CAROUSEL_UNKNOWN_EVIDENCE_INVALID'; end if;
  update public.social_media_carousel_groups
    set status='UNKNOWN',stage=p_stage,
        provider_delivery_id=coalesce(p_provider_delivery_id,provider_delivery_id),
        evidence_ref=p_evidence_ref,updated_at=now()
  where id=p_group_id and user_id=p_user_id and account_id=p_account_id
    and delivery_key=p_delivery_key and status in ('SUBMITTING','UNKNOWN')
    and (provider_delivery_id is null or p_provider_delivery_id is null
      or provider_delivery_id=p_provider_delivery_id)
  returning * into v_group;
  if not found then raise exception 'SOCIAL_CAROUSEL_UNKNOWN_CAS_DENIED'; end if;
  return v_group;
end;
$social$;
revoke all on function public.capital_social_note_carousel_unknown(
  uuid,uuid,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.capital_social_note_carousel_unknown(
  uuid,uuid,uuid,text,text,text,text) to service_role;
commit;
