# Instagram Professional – Meta Facebook Login, Owner-only

Contract: `CAPITAL_AI_INSTAGRAM_FACEBOOK_OAUTH@1` · Issue #662 · GROWTH/TRUST.
Status: CODE_IMPLEMENTED_DISABLED / NO_PUBLISH. No direct Instagram Login (`graph.instagram.com`).

## Real registration and activation (separate operator action)
1. Have an Instagram **Business or Creator** account linked to a Facebook Page you manage, with a Page Content/Create task. Meta's Facebook Login API cannot connect consumer Instagram accounts.
2. In Meta for Developers configure the **Facebook Login** product, the matching Instagram API permissions and the **exact Valid OAuth Redirect URI** `https://capital-ai.online/api/social-media/auth/callback`. Confirm Meta app role, permissions, Page access and the chosen Instagram ID. Never paste a code, token, app secret, or cookies into a PR/chat.
3. Put the credentials only in server-side Render secrets, never Vite/client:
   - `SOCIAL_INSTAGRAM_OAUTH_APP_ID`: numeric Meta Facebook App ID.
   - `SOCIAL_INSTAGRAM_OAUTH_APP_SECRET`: App Secret, server-only.
   - `SOCIAL_INSTAGRAM_TOKEN_ENCRYPTION_KEY`: independent 32-byte hex/base64 key, server-only.
   - `SOCIAL_META_GRAPH_API_VERSION`: explicitly supported version, e.g. `v26.0` after provider verification.
   - `SOCIAL_INSTAGRAM_EXPECTED_ACCOUNT_ID` and `SOCIAL_INSTAGRAM_EXPECTED_PAGE_ID`: recommended fixed numeric owner-bound identities.
   - Existing `PUBLIC_APP_ORIGIN=https://capital-ai.online/`, `SUPABASE_URL` and server-only admin credential required by the current Social Provider Store.
   - `SOCIAL_OAUTH_CALLBACK_ENABLED=true` only once the existing callback contract is ready, `SOCIAL_INSTAGRAM_OAUTH_CONNECT_ENABLED=true` only once owner manually verifies the Meta config. Both default disabled. Note: the current Instagram vault path uses encrypted service-role store like the existing legacy social store; it does **not** claim the X Edge vault can persist Instagram tokens.
4. Start the login **only while authenticated as email-confirmed IAM owner** from a same-origin browser via `GET /api/social-media/instagram/auth/start`. A same-site secure HttpOnly callback cookie plus server-side user/channel/redirect-bound, expiring, one-shot OAuth state defends login CSRF. No arbitrary redirect or browser-provided user ID.
5. The callback exchanges code **server-side** for Facebook user token, obtains long-lived token, verifies app/type/scopes/granted permissions, enumerates exact Page/IG link, Page task, Page token and final Page/IG identity, encrypts the Page token with AES-256-GCM tenant+IG AAD, and writes/readbacks the bound `social_media_accounts` row. Status at `GET /api/social-media/instagram/account/status` is IAM-owner-only, token-free and never returns Meta Page IDs or token material.
6. In a fresh session verify success from the **account/status** endpoint; do not infer connection from OAuth redirect alone. No detached clients, public OAuth entry, scheduler or provider publishing.

## Explicit no-publish separation
`SOCIAL_PROVIDER_PUBLISH_ENABLED`, `SOCIAL_INSTAGRAM_PUBLISH_ENABLED` and `SOCIAL_INSTAGRAM_CAROUSEL_ENABLED` remain **unset/false**. Rights owner self-attestation is not `rightsVerified` in the durable asset Rights store, and is not a publish ApprovalRef. The three JPEG hash-bound rights record is in `docs/growth/evidence/instagram-etf-jpeg-owner-rights-20261112.json`. A connected Instagram account does not authorize any post.

## Tests and rollback
`node --test server/social-media/instagram-oauth.test.mjs server/social-media/oauth-callback.test.mjs` (included in existing `test`, `test:security`, `test:social-provider` and Docker gate). Negative cases cover missing configs, cross-site start, non-owner, missing state/cookie, replay, bad redirect, wrong app/token-type, missing scopes, wrong Page tasks and Page/IG binding, malformed persisted readback, and token-free owner-only status.

Rollback: revert the feature PR, disable `SOCIAL_INSTAGRAM_OAUTH_CONNECT_ENABLED`; if a connection has occurred, separately revoke the Meta grant and rotate credentials under the existing Owner incident workflow. Do not enable publishing.
