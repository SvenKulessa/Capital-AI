# CAPITAL-AI Facebook Page OAuth – Owner-only

Contract: `CAPITAL_AI_FACEBOOK_PAGE_OAUTH@1` · GROWTH/TRUST · 2026-11-13

Status: **CODE_IMPLEMENTED_DISABLED / NO_PUBLISH**. This does **not** authorize Meta network operations, content publication, pricing changes or production database mutation.

## Scope and provider authority

- Reuse the **existing** Facebook Login application and exact redirect `https://capital-ai.online/api/social-media/auth/callback`.
- Independent OAuth consent and `FACEBOOK` state, channel-binding, HttpOnly/Secure/SameSite=Lax cookie, one-shot server-side state consumption and owner-only callback.
- Required Facebook Page scopes: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`. No Instagram scope may satisfy the Facebook Page grant.
- Require exact configured Page ID and `CREATE_CONTENT` (or `PROFILE_PLUS_CREATE_CONTENT`) task. No arbitrary page selection, pagination, auto-posting or cross-page fallback.
- Verify provider USER and PAGE token types, same Meta App ID, granted scopes, Page identity, Page-token readback and bounded token/data-access validity.
- Encrypt Page token using **independent** AES-256-GCM key and AAD `["capital-social-facebook-page-v1", ownerUserId, "FACEBOOK", pageId]`. Persist only in the existing service-role-only `social_media_accounts` table under `platform='facebook'`. Read back the exact cipher before claiming successful connection.
- Owner-only `GET /api/social-media/facebook/account/status` exposes connection, enumerated scopes and safe status, but no Page identifiers, tokens, account names or credentials.

## Owner-side prerequisites (NO secrets in issues/chat)

The existing Meta app settings must allow the exact redirect, Page permissions, selected app mode and suitable Page tasks. A Meta App Review and/or configured app role may be necessary depending on production use. Configure **server side only**:

- `SOCIAL_INSTAGRAM_OAUTH_APP_ID`, `SOCIAL_INSTAGRAM_OAUTH_APP_SECRET`: existing shared Meta Facebook Login App credentials.
- `SOCIAL_META_GRAPH_API_VERSION`: explicitly supported Meta Graph version.
- `SOCIAL_FACEBOOK_EXPECTED_PAGE_ID`: **mandatory** pinned numeric Page ID.
- `SOCIAL_FACEBOOK_TOKEN_ENCRYPTION_KEY`: new independent 32-byte hex or canonical base64 key.
- Existing `PUBLIC_APP_ORIGIN`, `SUPABASE_URL`, and `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` service-side access.
- `SOCIAL_OAUTH_CALLBACK_ENABLED=true` only after approved callback setup; `SOCIAL_FACEBOOK_OAUTH_CONNECT_ENABLED=true` only after explicit approved owner-side configuration. Both flags remain unset/false by default.

Endpoints after deliberate activation: `GET /api/social-media/facebook/auth/start` (owner-only same-origin) then `GET /api/social-media/facebook/account/status` (owner-only readback). No automatic OAuth start is performed.

## Security and publishing boundaries

The existing `SOCIAL_PROVIDER_PUBLISH_ENABLED` and `SOCIAL_FACEBOOK_PUBLISH_ENABLED` remain **false/unset**. OAuth is not content approval. Provider transport or HTTP 2xx is not published evidence; the existing hash-approval, CAS/UNKNOWN, provider readback and rights/claims gates remain authoritative. The user/token/account/page/scopes must be independently bound again before any future publication.

This slice intentionally supports one explicitly pinned Facebook Page per owner, matching the existing `unique(user_id,platform)` store contract. Multiple pages per owner require a separately approved identity/storage schema. It does not migrate, delete, read or mutate any production account rows.

## Tests and rollback

Synthetics: `node --test server/social-media/facebook-oauth.test.mjs server/social-media/instagram-oauth.test.mjs server/social-media/oauth-callback.test.mjs`. Included in existing `test`, `test:security`, `test:social-provider` and Docker build wiring. Negative cases: non-owner, disabled flag, cross-site start, forged redirect/state, replay, mixed-platform cookies, missing/expired/granular scopes, wrong Page/App/token type, duplicate/ambiguous Pages, wrong task, forged persistence, page/account mismatch, and AAD cross-owner failure.

No real Meta OAuth, token exchange, paid API, external post or production migration is performed by these tests.

Rollback: revert the feature changes or keep `SOCIAL_FACEBOOK_OAUTH_CONNECT_ENABLED=false`. If a real grant is later connected, revoke it at Meta and rotate credentials via the existing owner incident procedure. Keep publication flags disabled.

Current external integration status: **NOT_PROVEN** until fresh owner-only Meta Page/account status, provider rights, exact test+CI head and runtime readback are independently evidenced.