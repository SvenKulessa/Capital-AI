-- CAPITAL_AI_X_MILESTONE_POST_ONCE@1
-- Immutable owner-scoped receipt for the first public X milestone; no browser RLS authority.
begin;
create table if not exists public.capital_x_milestone_posts (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_key text not null check (content_key ~ '^[a-f0-9]{64}$'),
  external_account_id text not null check (external_account_id ~ '^[0-9]{1,25}$'),
  status text not null default 'CLAIMED' check (status in ('CLAIMED','POSTED','VERIFIED_PUBLISHED')),
  post_id text check (post_id is null or post_id ~ '^[0-9]{1,25}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verified_at timestamptz,
  primary key (user_id, content_key),
  constraint x_milestone_post_consistency check (status = 'CLAIMED' or post_id is not null)
);
alter table public.capital_x_milestone_posts enable row level security;
revoke all on public.capital_x_milestone_posts from public, anon, authenticated;
grant select, insert, update on public.capital_x_milestone_posts to service_role;
-- The existing X Edge Vault requires an owner JWT and signed workload attestation.
commit;
