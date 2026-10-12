-- CAPITAL-AI: private saleable digital blueprints; no buyer access to database tables.
-- Raw buyer files are deliberately NOT committed into this migration/repository.
-- Run separate authenticated one-time secure import and SHA-256 proof for each release.
create table if not exists private.blueprint_release_artifacts (
  sku text not null check (sku in ('CAP-BP-001','CAP-BP-002')),
  version text not null check (version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  file_name text not null check (length(file_name) between 5 and 160 and file_name !~ '[/\\]'),
  sha256_hex text not null check (sha256_hex ~ '^[a-f0-9]{64}$'),
  content bytea not null,
  released boolean not null default false,
  source_reference text not null check (length(source_reference) between 8 and 500),
  created_at timestamptz not null default now(),
  primary key (sku,version),
  check (octet_length(content) between 128 and 1048576),
  check (encode(sha256(content),'hex') = sha256_hex)
);
alter table private.blueprint_release_artifacts enable row level security;
revoke all on private.blueprint_release_artifacts from public, anon, authenticated;
grant select, insert, update on private.blueprint_release_artifacts to service_role;

create table if not exists private.blueprint_purchase_entitlements (
  checkout_session_id text primary key check (checkout_session_id ~ '^cs_(test_)?[A-Za-z0-9_]{8,240}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  sku text not null check (sku in ('CAP-BP-001','CAP-BP-002')),
  version text not null check (version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  stripe_price_id text not null check (stripe_price_id ~ '^price_[A-Za-z0-9]+$'),
  stripe_customer_id text,
  stripe_payment_intent_id text not null unique check (stripe_payment_intent_id ~ '^pi_[A-Za-z0-9]+$'),
  licensee_legal_name text not null check (length(licensee_legal_name) between 2 and 160),
  license_version text not null check (license_version = '1.0.0'),
  status text not null default 'paid' check (status in ('paid','refunded','disputed','revoked')),
  purchased_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, sku, checkout_session_id),
  foreign key (sku,version) references private.blueprint_release_artifacts(sku,version)
);
create index if not exists blueprint_entitlements_by_user on private.blueprint_purchase_entitlements (user_id,sku,status);
alter table private.blueprint_purchase_entitlements enable row level security;
revoke all on private.blueprint_purchase_entitlements from public,anon,authenticated;
grant select,insert,update on private.blueprint_purchase_entitlements to service_role;

-- The authenticated website server alone invokes this RPC with a service-role credential.
-- auth.verify supplies user_id; public callers cannot execute or see raw bytes.
