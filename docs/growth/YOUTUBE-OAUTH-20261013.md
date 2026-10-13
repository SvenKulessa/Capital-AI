# Owner YouTube OAuth connection

Base: 7edc45e. This adds Google authorization and verified channel linkage, not public publishing or a token-refresh scheduler.

## Runtime configuration

Render Capital-AI (`srv-dau1rp893c1s73cdhm1g`) uses server-only `SOCIAL_YOUTUBE_OAUTH_CLIENT_ID`, `SOCIAL_YOUTUBE_OAUTH_CLIENT_SECRET`, `SOCIAL_YOUTUBE_TOKEN_ENCRYPTION_KEY`, `SOCIAL_YOUTUBE_OAUTH_CONNECT_ENABLED=true`, `SOCIAL_OAUTH_CALLBACK_ENABLED=true`, and `PUBLIC_APP_ORIGIN=https://capital-ai.online`. Existing owner-JWT/workload-attested Social Edge transport is shared when `SOCIAL_X_EDGE_STORE_ENABLED=true`; legacy service-role storage remains supported. No browser or response receives provider credentials.

The Google client must authorize exactly `https://capital-ai.online/api/social-media/auth/callback`. The API key is not used for OAuth.

## Acceptance

1. Deploy the merged main version of `capital-social-x-vault` with JWT verification enabled. Its existing X workflow remains the default; signed `channel=YOUTUBE` enables isolated YouTube rows.
2. Log in as verified IAM owner and open `/api/social-media/youtube/account/diagnostics`. Only booleans are returned. `ready=true` confirms configuration prerequisites, not Google approval or channel linkage.
3. Open `/api/social-media/youtube/account/connect`, click Google connection, and consent with the actual channel account. State is random, stored as a user/platform/redirect digest, and consumed atomically once. PKCE verifier stays server-side. A short-lived HttpOnly routing cookie lets Google reuse the existing callback without a channel query parameter. The database-bound state remains authoritative.
4. Google scopes must contain readonly and upload; channels.list(mine=true, part=id,snippet) must return exactly one UC channel. Optional `SOCIAL_YOUTUBE_EXPECTED_CHANNEL_ID` pins the intended channel. Missing refresh token, permissions, wrong identity or mismatched persistence rejects linkage.
5. `/api/social-media/youtube/account/status` returns only channel metadata and current token validity. Expired access tokens are reported as expired; this change does not silently claim automatic refresh/upload readiness.
6. Public upload gates are unchanged. A Google verification demo must show actual consent and scope use; a learning clip cannot stand in for it.

## Validation and rollback

`npm run test:social-provider`: 96 tests passed. `node --test server/security.test.mjs server/auth.test.mjs`: 26 tests passed. Synthetic fixtures cover PKCE, owner-only access, cross-site denial, replay rejection, scope/channel mismatch, AES-GCM AAD and no token exposure. Existing X tests remain green. Live owner consent remains a personal action.

Disable `SOCIAL_YOUTUBE_OAUTH_CONNECT_ENABLED` to stop new connection attempts; preserve encryption keys for existing ciphertext. Revert code through the normal main path. Do not rotate a key without a token migration or reconnect plan.

Sources: https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps ; https://support.google.com/cloud/answer/15549135 ; https://support.google.com/cloud/answer/15549257 .
