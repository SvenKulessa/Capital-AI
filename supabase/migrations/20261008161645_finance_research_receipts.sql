-- Non-private Finance research receipts only.
-- Separate from legacy daily score_snapshots; this table never stores score values or BYOK data.
create table if not exists public.finance_research_receipts (
  event_id text primary key check (event_id ~ '^[a-f0-9]{64}$'),
  record_hash text not null check (record_hash = event_id),
  jetstream_sequence bigint not null unique check (jetstream_sequence > 0),
  asset_class text not null check (asset_class in
    ('crypto', 'equity_us', 'equity_eu', 'forex', 'commodities', 'fixed_income')),
  instrument_fingerprint text not null check (instrument_fingerprint ~ '^[a-f0-9]{64}$'),
  model_id text not null check (model_id ~ '^[a-z][a-z0-9-]{1,79}$'),
  model_version text not null,
  evaluated_at timestamptz not null,
  rights_evidence_fingerprint text not null check (rights_evidence_fingerprint ~ '^[a-f0-9]{64}$'),
  source_identity_fingerprint text not null check (source_identity_fingerprint ~ '^[a-f0-9]{64}$'),
  feature_fingerprint text not null check (feature_fingerprint ~ '^[a-f0-9]{64}$'),
  effective_weight_fingerprint text not null check (effective_weight_fingerprint ~ '^[a-f0-9]{64}$'),
  state text not null default 'RESEARCH_EVALUATED' check (state = 'RESEARCH_EVALUATED'),
  created_at timestamptz not null default now()
);

comment on table public.finance_research_receipts is
  'Append-only non-private Finance research metadata. No raw provider facts, user identifiers, prices, scores or trading authority.';

create index if not exists finance_research_receipts_evaluated_at_idx
  on public.finance_research_receipts (evaluated_at desc);

alter table public.finance_research_receipts enable row level security;
revoke all on table public.finance_research_receipts from public, anon, authenticated, service_role;
grant select, insert on table public.finance_research_receipts to service_role;

drop policy if exists finance_research_receipts_service_read on public.finance_research_receipts;
create policy finance_research_receipts_service_read on public.finance_research_receipts
  for select to service_role using (true);
drop policy if exists finance_research_receipts_service_insert on public.finance_research_receipts;
create policy finance_research_receipts_service_insert on public.finance_research_receipts
  for insert to service_role with check (true);
