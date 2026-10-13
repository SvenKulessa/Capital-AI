begin;
create table if not exists public.youtube_private_upload_jobs (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 account_id uuid not null references public.social_media_accounts(id) on delete restrict,
 channel_id text not null check (channel_id ~ '^UC[A-Za-z0-9_-]{22}$'),
 asset_sha256 text not null check (asset_sha256 ~ '^[a-f0-9]{64}$'),
 status text not null default 'UNKNOWN' check (status in ('UNKNOWN','VERIFIED_PRIVATE')),
 video_id text check (video_id is null or video_id ~ '^[A-Za-z0-9_-]{11}$'),
 created_at timestamptz not null default now(),
 verified_at timestamptz,
 check (status <> 'VERIFIED_PRIVATE' or (video_id is not null and verified_at is not null)),
 unique (user_id,channel_id,asset_sha256)
);
create index if not exists youtube_private_upload_jobs_account_idx on public.youtube_private_upload_jobs(account_id);
alter table public.youtube_private_upload_jobs enable row level security;
revoke all on public.youtube_private_upload_jobs from public,anon,authenticated;
grant select,insert,update on public.youtube_private_upload_jobs to service_role;
comment on table public.youtube_private_upload_jobs is 'Owner-bound private YouTube test receipts. UNKNOWN never auto-retries submission; only private channel-matched provider readback verifies a job.';
commit;
