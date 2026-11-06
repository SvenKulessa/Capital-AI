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

## Free-Tier decision (owner, 2026-11-06)

Supabase remains on Free. No Pro upgrade, paid add-on or paid activation is authorized. The native leaked-password feature requires Pro or higher per the current official password-security documentation; it remains disabled and the advisor warning stays open. No owner action to enable a paid toggle is requested.

Existing application controls include 14–256 characters for new passwords, verified server sessions, Origin checks, signed HttpOnly/Secure cookies, TOTP/passkey code paths and bounded process-local rate limiting on general auth routes. This is not a distributed limiter or a blanket guarantee for every separately routed security endpoint. Current provider configuration and real enrollment are separate evidence.

The corrected isolation harness binds upstream user lookup to immutable token identities and sends complete cookie jars, including all session chunks. The count cookie alone is not a session. Malformed password, cross-origin, registration and two-session tests are executed through the existing npm/Docker paths.

## Residual risk

Leaked passwords are not checked locally. Length, MFA and session controls do not replace a breach-list check. No new external password/hash service is called; the native finding remains open under the Free-Tier constraint.

## Evidence refs

- `server/auth.mjs` (login/email, register, normalizeNewPassword)
- `server/auth-security.mjs` (password/reset)
- `server/auth.test.mjs` (existing harness)
- `server/password-auth-isolation.test.mjs` (this change)
- Issue #560
