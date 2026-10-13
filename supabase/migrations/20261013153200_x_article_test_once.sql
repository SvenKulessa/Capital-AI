-- CAPITAL_AI_X_ARTICLE_TEST_ONCE@1
-- Owner-bound, single-content, no-retry X Article receipt; no public RLS policies.
begin;
create table if not exists public.capital_x_article_tests (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_key text not null check (content_key ~ '^[a-f0-9]{64}$'),
  external_account_id text not null check (external_account_id ~ '^[0-9]{1,25}$'),
  status text not null default 'CLAIMED'
    check (status in ('CLAIMED','DRAFTED','POSTED','VERIFIED_PUBLISHED')),
  article_id text check (article_id is null or article_id ~ '^[0-9]{1,25}$'),
  post_id text check (post_id is null or post_id ~ '^[0-9]{1,25}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verified_at timestamptz,
  primary key (user_id, content_key),
  constraint x_article_draft_consistency check (status='CLAIMED' or article_id is not null),
  constraint x_article_post_consistency check (status in ('CLAIMED','DRAFTED') or post_id is not null)
);
alter table public.capital_x_article_tests enable row level security;
revoke all on public.capital_x_article_tests from public, anon, authenticated;
grant select, insert, update on public.capital_x_article_tests to service_role;
-- The signed Supabase Edge Vault enforces current JWT + owner IAM on every operation.
-- No SQL/RLS policy grants browser-side access to receipts.
commit;
