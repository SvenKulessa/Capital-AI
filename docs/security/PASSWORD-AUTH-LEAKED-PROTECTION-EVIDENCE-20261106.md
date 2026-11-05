# Password Auth Path & Leaked-Password Protection Evidence — 2026-11-06

**Issue:** #560  
**Work package:** AP-SEC-02 / CA-TRUST-SUPABASE-AUTH  
**Main baseline:** `bea9223d1d661259d147d2cd22dc09004e62351f`  
**Status:** Investigation **VERIFIED** · Activation **REVIEW_REQUIRED**  
**Contract:** `SOLO_MAINTAINER_FLOW@1` / AGENTS.md

## Verified facts (code + existing tests)

- Email/password authentication is implemented and used:
  - `server/auth.mjs`: `/api/auth/login/email` → `authRequest(..., '/token?grant_type=password', { email, password })`
  - Registration: `/api/auth/register` uses `normalizeNewPassword` (≥ 14, ≤ 256)
  - Password reset: `server/auth-security.mjs` `/api/auth/password/reset` also enforces ≥ 14
- Local length gate is **not** a leaked-password or HIBP check. No local call to HaveIBeenPwned or equivalent exists in the auth path.
- Supabase GoTrue is the authority for password strength / leaked-password protection when the feature is enabled (Pro plan and higher, per current Supabase docs).
- Existing harness in `server/auth.test.mjs` already covers same-origin rejection, successful email login, registration consent + length, and session cookie hygiene.
- Aggregated evidence from prior issue comment (2026-11-05): password credentials exist in the project (no identities or hashes read).

## Isolation / regression coverage added in this change

New focused tests in `server/password-auth-isolation.test.mjs` assert:

1. New-password length gate rejects < 14 characters on register (no upstream signup call).
2. Login password format gate rejects empty / over-long values before upstream.
3. Same-origin enforcement on password login (cross-origin → 403).
4. Session isolation: two distinct subjects receive independent session cookies; one subject’s cookie does not authenticate as the other.
5. Explicit note that the test harness never simulates a leaked-password rejection from Supabase (feature not enabled / not under test).

## Activation status (REVIEW_REQUIRED)

Leaked Password Protection remains a Supabase Auth setting (Dashboard → Authentication → Policies).  
Current tools cannot read or mutate the production Auth setting. No tariff upgrade or setting change was performed.

**Owner next step (smallest):**  
Open the Supabase Auth dashboard for the production project, confirm current plan includes the feature, and enable “Leaked password protection” if available. Verify with a synthetic weak/leaked password on a test account only. Rollback = disable the toggle.

## Residual risk

Until the Supabase setting is enabled, users can set passwords that appear in public breach lists, subject only to the local 14-character minimum and any other GoTrue policies already active. OAuth and passkey paths are unaffected.

## Evidence refs

- `server/auth.mjs` (login/email, register, normalizeNewPassword)
- `server/auth-security.mjs` (password/reset)
- `server/auth.test.mjs` (existing harness)
- `server/password-auth-isolation.test.mjs` (this change)
- Issue #560
