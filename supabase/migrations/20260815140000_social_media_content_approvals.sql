-- SEO-ROADMAP-0001 / N4 — Content approval gate (draft; apply after security review).
-- Service-role only; Express API is the sole access path.

create table if not exists public.social_media_content_approvals (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  topic text,
  platforms text[] not null default '{}',
  payload_summary text,
  status text not null check (status in ('pending', 'approved', 'rejected', 'consumed')),
  scheduled_at timestamptz,
  decided_at timestamptz,
  decided_by text,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_media_content_approvals_user_created_idx
  on public.social_media_content_approvals (user_id, created_at desc);

create index if not exists social_media_content_approvals_status_idx
  on public.social_media_content_approvals (status);

alter table public.social_media_content_approvals enable row level security;

drop policy if exists "service_role_full_access" on public.social_media_content_approvals;
create policy "service_role_full_access" on public.social_media_content_approvals
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
