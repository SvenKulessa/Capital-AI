-- AIF-CORE: Server-side quota enforcement table
-- Backs server/quota.ts. Enforces the Starter/Free daily screening limit
-- server-side, replacing the purely client-side localStorage counter.

create table if not exists public.user_quota (
  email        text not null,
  quota_kind   text not null check (quota_kind in ('screening', 'monte_carlo', 'full_ai_analysis')),
  window_start timestamptz not null default now(),
  count        integer not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (email, quota_kind)
);

create index if not exists idx_user_quota_email on public.user_quota (email);

create or replace function public.touch_user_quota_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql
set search_path = public, pg_temp;

drop trigger if exists trg_touch_user_quota on public.user_quota;
create trigger trg_touch_user_quota
before update on public.user_quota
for each row execute function public.touch_user_quota_updated_at();

alter table public.user_quota enable row level security;

drop policy if exists "service_role_full_access" on public.user_quota;
create policy "service_role_full_access" on public.user_quota
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
