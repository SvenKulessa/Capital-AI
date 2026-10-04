-- ADR-0003.5 / ADR-0008 — IAM-Grundlage (angepasst: iam_role statt role, um Kollision mit Abo-Tier zu vermeiden)

alter table public.profiles
  add column if not exists iam_role text
    check (iam_role in ('owner','admin','supervisor','user'))
    default 'user';

create table if not exists public.audit_logs_iam (
  id uuid primary key default gen_random_uuid(),
  event_type text not null default 'IAM',
  actor_user_id uuid references auth.users(id),
  target_user_id uuid references auth.users(id),
  action text not null,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.iam_access_log (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  token_id text not null,
  zone text not null,
  outcome text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.audit_logs_iam enable row level security;
alter table public.iam_access_log enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_own'
  ) then
    execute 'create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id)';
  end if;
end $$;