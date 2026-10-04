-- Applied to production as Supabase migration 20260901144312_retire_m10_passkey_authorization.
-- Permanent M10 retirement: fail closed while preserving historical rows.
-- Credential retirement uses the schema's supported one-way revoked_at lifecycle.
update public.m10_owner_credentials
set revoked_at = coalesce(revoked_at, now())
where revoked_at is null;

-- Registration challenges remain under their original expiry/consumption lifecycle.
-- Authorization challenges are intentionally not rewritten because
-- guard_m10_authorization_challenge_mutation() owns their immutable single-use lifecycle.
-- Runtime reachability is terminated by privilege revocation instead.
revoke all privileges on table public.m10_registration_challenges from anon, authenticated, service_role;
revoke all privileges on table public.m10_owner_credentials from anon, authenticated, service_role;
revoke all privileges on table public.m10_authorization_challenges from anon, authenticated, service_role;
revoke all privileges on table public.m10_approval_evidence from anon, authenticated, service_role;
revoke all privileges on table public.m10_ci_consumptions from anon, authenticated, service_role;
revoke all privileges on table public.m10_shadow_evaluations from anon, authenticated, service_role;

comment on table public.m10_registration_challenges is 'RETIRED 2026-09-01: historical M10 WebAuthn registration challenges; runtime access revoked; retained for audit/history only.';
comment on table public.m10_owner_credentials is 'RETIRED 2026-09-01: historical M10 Owner WebAuthn public credential material; all credentials revoked; runtime access revoked; retained for audit/history only.';
comment on table public.m10_authorization_challenges is 'RETIRED 2026-09-01: historical immutable M10 PR authorization challenges; runtime access revoked; retained for audit/history only.';
comment on table public.m10_approval_evidence is 'RETIRED 2026-09-01: historical M10 approval evidence; runtime access revoked; retained for audit/history only.';
comment on table public.m10_ci_consumptions is 'RETIRED 2026-09-01: historical M10 CI consumption evidence; runtime access revoked; retained for audit/history only.';
comment on table public.m10_shadow_evaluations is 'RETIRED 2026-09-01: historical M10 shadow evaluation evidence; runtime access revoked; retained for audit/history only.';
