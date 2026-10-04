-- M10 (ADR-0066, ESS-0022) Phase 3 live-wiring: durable storage for Owner WebAuthn/passkey
-- registration challenges and enrolled credentials (docs/evidence/m10/
-- M10_PHASE3_LIVE_WIRING_2026-08-17.md). Mirrors the existing step_up_tokens /
-- agent_action_approvals single-use, Service-Role-only pattern (supabase/migrations/
-- 20260731000400_security_events_stepup_totp.sql, 20260810002200_agent_action_approvals.sql).
--
-- owner_actor_id is the REM/IAM string actor id (SYSTEMADMIN_OWNER_ACTOR_ID = 'SvenKulessa' in
-- src/platform/Security/roadmapExecutionMandate.ts), not a Supabase auth.users UUID - this system
-- has exactly one canonical Owner and every M10 authorization check already binds to that same
-- constant, so storing it as text keeps this table's rows self-describing without an extra join.
--
-- Public key material only: m10_owner_credentials never stores a private key, the raw attestation
-- object, or biometric data (ADR-0066 §7) - server/m10/credentialEnrollment.ts's own persistence
-- logic already enforces this at the application layer; this schema simply has no column that
-- could hold any of it.

create table if not exists public.m10_registration_challenges (
  challenge_id    text primary key,
  challenge       text not null,
  owner_actor_id  text not null,
  issued_at       timestamptz not null default now(),
  expires_at      timestamptz not null,
  consumed_at     timestamptz
);
comment on table public.m10_registration_challenges is
  'M10 (ADR-0066) Phase 3: short-lived, single-use WebAuthn registration challenges for Owner passkey enrollment. Service-Role-only, no client access.';

create index if not exists idx_m10_registration_challenges_unconsumed
  on public.m10_registration_challenges (challenge_id)
  where consumed_at is null;

create table if not exists public.m10_owner_credentials (
  credential_id   text primary key,
  owner_actor_id  text not null,
  public_key      text not null,
  counter         bigint not null default 0,
  transports      text[] not null default '{}',
  device_type     text not null,
  backed_up       boolean not null default false,
  aaguid          text not null,
  created_at      timestamptz not null default now(),
  revoked_at      timestamptz
);
comment on table public.m10_owner_credentials is
  'M10 (ADR-0066) Phase 3: registered Owner WebAuthn/passkey credentials for PR authorization. Public key material only. Service-Role-only, no client access.';

create index if not exists idx_m10_owner_credentials_active
  on public.m10_owner_credentials (owner_actor_id)
  where revoked_at is null;

alter table public.m10_registration_challenges enable row level security;
alter table public.m10_owner_credentials enable row level security;

drop policy if exists "service_role_full_access" on public.m10_registration_challenges;
create policy "service_role_full_access" on public.m10_registration_challenges
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service_role_full_access" on public.m10_owner_credentials;
create policy "service_role_full_access" on public.m10_owner_credentials
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
