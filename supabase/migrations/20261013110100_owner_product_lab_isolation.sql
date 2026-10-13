-- Owner-only test selection and price mapping. No live subscription mutations.
create table public.capital_ai_owner_product_lab (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  mode text not null default 'production' check (mode in ('production', 'test')),
  selected_skus text[] not null default array[]::text[]
    check (coalesce(array_length(selected_skus, 1), 0) <= 7),
  replica_price_ids jsonb not null default '{}'::jsonb
    check (jsonb_typeof(replica_price_ids) = 'object'
      and octet_length(replica_price_ids::text) <= 4096),
  updated_at timestamptz not null default now()
);
alter table public.capital_ai_owner_product_lab enable row level security;
revoke all on public.capital_ai_owner_product_lab from public, anon, authenticated;
grant select, insert, update on public.capital_ai_owner_product_lab to service_role;
