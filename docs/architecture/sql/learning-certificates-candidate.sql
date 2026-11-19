-- CANDIDATE ONLY; never applied as a migration.
-- This schema is not production authorization or a certificate issuance API.
create table if not exists private.learning_certificate_issuance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_slug text not null check (course_slug ~ '^[a-z0-9-]{1,80}$'),
  assessment_version integer not null check (assessment_version > 0),
  evidence_sha256 text not null check (evidence_sha256 ~ '^[a-f0-9]{64}$'),
  issuer_key_id text not null check (length(issuer_key_id) between 1 and 120),
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, course_slug, assessment_version, evidence_sha256),
  constraint revocation_after_issue check (revoked_at is null or revoked_at >= issued_at)
);
alter table private.learning_certificate_issuance enable row level security;
revoke all on private.learning_certificate_issuance from public, anon, authenticated;
grant select, insert, update on private.learning_certificate_issuance to service_role;
-- No client policy, no public RPC; all issuance must go through verified BFF.
