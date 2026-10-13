-- CAPITAL_AI_YOUTUBE_PRIVATE_RECEIPT_RECOVERY@1
-- A verified private test upload deleted by its owner can be retired without losing
-- the original evidence. This migration never archives or releases a job itself.
-- The operator must first confirm deletion in YouTube Studio. This confirmation
-- is an owner attestation, NOT an independently proven provider deletion.
begin;

create table if not exists public.youtube_private_upload_archive (
  archive_id uuid primary key default gen_random_uuid(),
  source_job_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null,
  channel_id text not null,
  asset_sha256 text not null,
  provider_video_id text not null,
  original_status text not null check (original_status = 'VERIFIED_PRIVATE'),
  original_created_at timestamptz not null,
  original_verified_at timestamptz not null,
  original_record jsonb not null,
  archive_reason text not null check (archive_reason = 'OWNER_ATTESTED_DELETED_ON_YOUTUBE'),
  provider_deletion_verified boolean not null default false check (provider_deletion_verified = false),
  archived_at timestamptz not null default now(),
  unique(source_job_id, provider_video_id)
);
create index if not exists youtube_private_archive_user_idx
  on public.youtube_private_upload_archive(user_id, archived_at desc);
alter table public.youtube_private_upload_archive enable row level security;
revoke all on public.youtube_private_upload_archive from public, anon, authenticated;
grant select, insert on public.youtube_private_upload_archive to service_role;

comment on table public.youtube_private_upload_archive is
  'Private immutable-by-ACL historical receipts for owner-attested YouTube deletions; never evidence of provider-confirmed deletion. User erasure cascades to the archive.';

-- Only trusted service_role may call the narrow maintenance function. No browser
-- route or automatic job retry is created. SECURITY DEFINER avoids granting a
-- broad DELETE on the active job table to the connected application role.
create or replace function public.capital_youtube_archive_deleted_private_test(
  p_user_id uuid,
  p_channel_id text,
  p_asset_sha256 text,
  p_video_id text
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_job public.youtube_private_upload_jobs%rowtype;
  v_deleted integer;
begin
  if p_user_id is null
    or p_channel_id !~ '^UC[A-Za-z0-9_-]{22}$'
    or p_asset_sha256 !~ '^[a-f0-9]{64}$'
    or p_video_id !~ '^[A-Za-z0-9_-]{11}$' then
    raise exception 'YOUTUBE_PRIVATE_RECOVERY_CONTEXT_INVALID';
  end if;

  select j.* into v_job
    from public.youtube_private_upload_jobs j
    join public.social_media_accounts a on a.id = j.account_id
   where j.user_id = p_user_id
     and j.channel_id = p_channel_id
     and j.asset_sha256 = p_asset_sha256
     and j.video_id = p_video_id
     and j.status = 'VERIFIED_PRIVATE'
     and j.verified_at is not null
     and a.user_id = p_user_id
     and a.platform = 'youtube'
     and a.status = 'connected'
     and a.external_account_id = p_channel_id
   for update of j;

  if not found then
    raise exception 'YOUTUBE_PRIVATE_RECOVERY_RECEIPT_NOT_MATCHED';
  end if;

  insert into public.youtube_private_upload_archive(
    source_job_id, user_id, account_id, channel_id, asset_sha256,
    provider_video_id, original_status, original_created_at,
    original_verified_at, original_record, archive_reason
  ) values (
    v_job.id, v_job.user_id, v_job.account_id, v_job.channel_id,
    v_job.asset_sha256, v_job.video_id, v_job.status, v_job.created_at,
    v_job.verified_at, to_jsonb(v_job), 'OWNER_ATTESTED_DELETED_ON_YOUTUBE'
  );

  delete from public.youtube_private_upload_jobs
   where id = v_job.id and user_id = p_user_id
     and channel_id = p_channel_id and asset_sha256 = p_asset_sha256
     and video_id = p_video_id and status = 'VERIFIED_PRIVATE';
  get diagnostics v_deleted = row_count;
  if v_deleted <> 1 then
    raise exception 'YOUTUBE_PRIVATE_RECOVERY_DELETE_CAS_LOST';
  end if;

  return true;
end;
$$;

revoke all on function public.capital_youtube_archive_deleted_private_test(uuid,text,text,text)
  from public, anon, authenticated;
grant execute on function public.capital_youtube_archive_deleted_private_test(uuid,text,text,text)
  to service_role;
comment on function public.capital_youtube_archive_deleted_private_test(uuid,text,text,text)
  is 'Explicit owner-confirmed, service-only archive+CAS-delete of one formerly verified private YouTube test receipt. Never reuploads media.';
commit;
