
create table if not exists public.legal_policy_evidence (
  id uuid primary key,
  installation_id text not null,
  account_id text not null,
  repository_id text not null,
  repository_full_name text not null,
  source_sha text not null,
  policy_id text not null,
  release_decision text not null check (release_decision in ('ALLOW','ALLOW_WITH_OBLIGATIONS','LEGAL_REVIEW_REQUIRED','BLOCKED')),
  gate_decision text not null check (gate_decision in ('ALLOW','ALLOW_WITH_OBLIGATIONS','LEGAL_REVIEW_REQUIRED','BLOCKED')),
  evidence_hash text not null check (length(evidence_hash) = 64),
  summary jsonb not null,
  evaluated_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.legal_policy_evidence enable row level security;
revoke all on table public.legal_policy_evidence from public, anon, authenticated;
grant select, insert, delete on table public.legal_policy_evidence to service_role;

create index if not exists legal_policy_evidence_installation_source_idx
  on public.legal_policy_evidence (installation_id, source_sha, evaluated_at desc);
create index if not exists legal_policy_evidence_expiry_idx
  on public.legal_policy_evidence (expires_at);
create index if not exists legal_policy_evidence_repository_idx
  on public.legal_policy_evidence (repository_id, evaluated_at desc);
