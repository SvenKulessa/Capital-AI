-- CAPITAL-AI MARKET — canonical market facts source of record.
-- Repository migration only. Production application remains a separate controlled Supabase mutation.
-- NATS JetStream remains the event/replay backbone; this table is the append-only queryable persistence layer.

begin;

create table if not exists public.canonical_market_facts (
  evidence_id text primary key,
  stream_name text not null check (stream_name = 'CAPITAL_FACTS'),
  stream_seq bigint not null unique check (stream_seq > 0),
  envelope_hash text not null check (envelope_hash ~ '^[a-f0-9]{64}$'),
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  schema_version text not null,
  symbol text not null,
  provider text not null,
  venue text not null,
  observed_at timestamptz not null,
  received_at timestamptz not null,
  fact jsonb not null,
  raw_payload jsonb not null,
  inserted_at timestamptz not null default now(),
  constraint canonical_market_facts_time_order check (received_at >= observed_at)
);

create index if not exists canonical_market_facts_symbol_observed_idx
  on public.canonical_market_facts (symbol, observed_at desc);

create index if not exists canonical_market_facts_provider_observed_idx
  on public.canonical_market_facts (provider, observed_at desc);

alter table public.canonical_market_facts enable row level security;

revoke all on table public.canonical_market_facts from anon;
revoke all on table public.canonical_market_facts from authenticated;
revoke all on table public.canonical_market_facts from service_role;
grant select, insert on table public.canonical_market_facts to service_role;

comment on table public.canonical_market_facts is
  'Append-only canonical Market-Fact persistence derived from acknowledged CAPITAL_FACTS JetStream events. No browser authority.';

commit;
