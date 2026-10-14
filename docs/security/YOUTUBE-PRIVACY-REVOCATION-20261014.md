# YouTube privacy and owner deletion — 2026-10-14

Scope: private YouTube API test workflow; no new scopes, public publishing, Ads activation, model training, account-wide erasure or provider-video deletion.

## Behavior and trust boundary

The canonical disclosure in `shared/youtube-privacy.mjs` is rendered in standalone privacy/terms pages, React legal pages and the authenticated owner connection page. All canonical processing activities are regenerated from `src/privacy/privacyPolicy.ts`. OAuth start redirects to the connection page until the current privacy/YouTube terms acknowledgement is submitted. No provider tokens enter HTML or a browser bundle.

`POST /api/social-media/youtube/account/disconnect` requires a fresh verified email/session, current IAM owner, same origin, browser Same-Origin fetch metadata and exact explicit form confirmation. Identity never comes from the request body. It remains available when new OAuth connections are disabled. The Edge route additionally requires the existing JWT-bound workload HMAC and a fresh owner check. Other platforms cannot invoke the YouTube privacy operations.

1. A narrow service-only RPC serializes per user, creates a deletion marker, disables the existing connection and consumes pending OAuth state by deletion.
2. The server decrypts the refresh token (access token fallback) only for a POST to Google's fixed revocation endpoint. Network failures or arbitrary errors do not count as revocation. Google's `invalid_token` response is accepted as already invalid. No stored token means no remote revocation is claimed.
3. Only after provider success does a transaction delete YouTube private receipts, receipt archive, delivery reservations, publish logs, OAuth state and the linked account/tokens. Other owners and other platforms are preserved. A failed transaction cannot claim successful deletion.
4. A marker containing only the CAPITAL-AI user ID and request/completion timestamps blocks late writes/callbacks. Explicit OAuth restart clears a completed marker; a pending cleanup blocks reconnect. The marker cascades with application account deletion.

An already in-flight provider request may finish while revocation is being processed. The Google revocation and database write guards bound that race; the workflow does not claim to cancel a submitted YouTube video or delete a provider resource.

## Evidence

- `server/social-media/youtube-runtime.test.mjs`: owner isolation, explicit consent, foreign-origin denial, provider failure, retry, no secret output and no false remote-revocation claim.
- `server/social-media/youtube-oauth.test.mjs`: current acknowledgement before OAuth state issuance.
- `server/social-media/x-edge-vault.test.mjs`: existing HMAC/JWT boundary for the three new privacy operations.
- `scripts/youtube-privacy-revocation-db.sql`: synthetic rollback-only exercise of cleanup, cross-owner/platform preservation, FK order, tombstone, reconnect and ACL. Wired into the existing disposable PostgreSQL workflow, not a new gate.
- `scripts/static-legal-routes.test.mjs` and the generated-notice drift check: mandatory links, canonical activity parity and current commerce/analytics disclosures.
- PGlite run of the actual migration chain succeeded locally; CI uses the existing PostgreSQL 17.11 container.

## Remaining production evidence

Local tests are not a live Google revocation. The real owner connection must not be disconnected merely to manufacture evidence. Migration/Edge deployment and production readback must be recorded separately after the authorized main merge. Google approval is an external result.

Periodic confirmation of external Google revocations and a deadline-bound cleanup worker are not implemented by this owner-initiated path. They remain required before claiming the whole retention lifecycle complies with YouTube policies. A general privacy request records a case; it is not automatic account erasure, Stripe cancellation or a completed provider deletion. GA4 property retention/transfer configuration and provider contracts still require their actual configuration evidence.

Official references checked 2026-10-14:
- https://developers.google.com/youtube/terms/developer-policies (III.A, III.E)
- https://developers.google.com/identity/protocols/oauth2/web-server#tokenrevoke
