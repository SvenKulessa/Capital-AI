-- Add value-sensitive Finance replay lineage without rewriting historic append-only receipts.
-- Historical rows may remain NULL; only the new transport requires this fingerprint.
alter table public.finance_research_receipts
  add column if not exists research_replay_fingerprint text;

alter table public.finance_research_receipts
  add constraint finance_research_receipts_replay_sha256
  check (research_replay_fingerprint is null
    or research_replay_fingerprint ~ '^[a-f0-9]{64}$');

comment on column public.finance_research_receipts.research_replay_fingerprint is
  'SHA-256 of admitted normalized research values and their point-in-time provenance; NULL denotes legacy receipts that are not value-replay verified.';
