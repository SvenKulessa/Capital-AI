# PR #298 — Main correlation and legacy TOTP retirement

Owner request, 2026-10-08: disable the entire legacy Finance TOTP configuration,
repair QR/enrollment behavior, resolve PR conflicts and rerun checks.

## Main integration

Integrates Main `5b6b8b79ec0f29d3da99b55eed6920a7bd9c8cbf` (#295, #296, #297).
Resolves package.json by retaining all Main suites plus analysis UI and TOTP
regressions. Retains latest #297 correlation evidence; it is evidence only.
Owner Render dashboard, locale routing and historical parity audit are preserved.

## Live database retirement

Applied Supabase migration `20261008194654_disable_legacy_profile_totp` to
Capital-AI. Before: three enabled legacy profiles with three encrypted seeds.
After: zero enabled legacy profiles, zero stored seeds, zero pending seeds.
All unused legacy step-up tokens and break-glass codes are invalidated.
`profiles_legacy_totp_retired` is validated and rejects attempted reactivation;
a caught check-violation probe verified this without retaining any update.
Native Supabase factors, passkeys, user identities and sessions are untouched.
Historical seed removal is intentional: old authenticator registrations cannot
be reused; users must enroll and verify fresh native Supabase factors.
No shared encryption key rotation: the retired Finance service is suspended,
and its key also protected historical non-TOTP tokens. Database retirement
blocks the old TOTP lane independently of that key.

## Code changes

- Retired Finance TOTP/step-up/break-glass routes return HTTP 410.
- Auth transport retains only bounded, validated provider error codes from
  non-2xx responses. Previously these were discarded by boundedJson, hiding
  enrollment/configuration failures. No raw provider body, token or seed is logged.
- TOTP Base32 setup accepts whitespace/padding while validating its alphabet.
- QR renderer supports raw SVG, XML-prefixed SVG and image data URLs; external
  QR services and HTML injection remain prohibited. Manual secret fallback remains.
- Restarting enrollment clears stale setup material before issuing the request.
- Signed-session HTTP tests verify secret/QR delivery and a provider-disabled
  failure, including no-store and absence of secrets in audit output.

## Evidence and limitations

Local auth regression suite passes 35 server tests plus two QR tests. Full test,
security suite, lint, build and GitHub Required Checks are evaluated on this PR.
Finance source-authority fingerprint is rebound to the changed auth file, without
weakening the drift test. Frontend security test exercises the extracted QR helper.
A real owner-account enrollment/QR scan/verification has not been reproduced;
these fixes do not claim a verified production Authenticator E2E. Web changes
require owner merge and the regular checked Main deployment; database retirement
is already applied and read back. No NATS redeploy or paid integration.
