# Social Provider Bridge — PLATFORM (2026-10-08)

**Authority:** `AGENTS.md` / `SOLO_MAINTAINER_FLOW@1`. Primary domain PLATFORM, related GROWTH and TRUST. PR #268 (Growth Content Social Package) is already merged on main. PR #269 is a separate draft implementation. Publishing authority remains `SOCIAL_MEDIA_ENGINE_ONLY`. No server component can publish merely because a manifest is valid.

## Current implementation

| Boundary | Implementation | Evidence and limitation |
| --- | --- | --- |
| Manifest binding | `server/social-media/provider-adapter.mjs` | Exact campaign/content/source SHA, asset byte SHA-256, channel, approval and delivery identity |
| Account / OAuth | Existing `social_media_accounts` and `social_media_oauth_states`; `server/social-media/provider-store.mjs` | User ID and platform required; OAuth SHA-256 state, PKCE for X, atomic RPC consumes once before code exchange |
| HTTP callback | `server/social-media/oauth-callback.mjs`, registered in `server/index.mjs` | Session verified using existing Supabase Auth; HTTPS exact callback URL; no tokens in response; **disabled** without `SOCIAL_OAUTH_CALLBACK_ENABLED=true` AND server-injected provider token exchanger |
| Approval and job | `supabase/migrations/20261008113000_social_provider_store.sql` | Versioned additive migration **committed, not applied to production**; old approvals default no public authority, unique user/delivery key, RLS and service-role-only RPCs |
| DB state machine | `claim_delivery`, `note_unknown`, `complete_delivery` RPCs | Claimed `→ UNKNOWN → PUBLISHED/FAILED` only after trusted provider status; reservations never automatically reclaimed, no blind re-send, one publish-log entry |
| Media / rights | `server/social-media/asset-readback.mjs` | Real server-fetched bytes are SHA-256 checked; rights reference required; injection boundary awaits a private storage backend, no external URLs accepted |
| YouTube / TikTok | `server/social-media/provider-readback.mjs` | Read-only, owner-channel check for YouTube, privacy status and processing checked; TikTok `publish_id` status separate from publish-complete; requests disabled unless explicit server setting |
| Instagram / Facebook / X | `server/social-media/provider-external-readback.mjs` | Pure provider-output normalization with exact account owner and HTTPS host checks. X read-only lookup also requires `SOCIAL_X_PAID_READBACK_APPROVED=true` plus general readback flag; Meta live Graph calls are **not** implemented |

### Fail-closed contract and runtime integration

- The callback route returns 503 by default. Even with its feature switch enabled, a missing, owner-verified token exchanger blocks state consumption. No OAuth authorization-start URL, token persistence or public-facing account-connect activation is included.
- The Docker runtime copies only the callback and its two dependencies. Other provider modules are build-only and covered by CI. There is **no** provider upload, direct post, background worker, Cron trigger or automatic delivery/retry endpoint.
- `social_media_publish_log` accepts only terminal states after trusted server readback; `UNKNOWN` remains a durable job record without publish-log creation.
- The SQL migration uses `SECURITY INVOKER`, explicitly revokes anon/authenticated function EXECUTE, and grants service_role only. No direct browser table writes.
- Finance legacy Meta Graph v19 calls, old OAuth tokens and implicit TikTok public privacy are not migrated.

## Verification

- **Main PR dependency:** GROWTH PR #268 merged.
- **GitHub CI:** `Social Provider PostgreSQL Contract` succeeded on 2026-10-08 in an earlier PR #269 commit. Subsequent commits must rerun this test; no stale CI result is a current-head approval.
- **Disposable PostgreSQL 17:** GitHub Actions runs the original two Social schema migrations followed by `20261008113000_social_provider_store.sql`. The test fixtures exercise OAuth CAS/replay, missing legacy hash approval, cross-user account denial, RLS, two independent concurrent writers claiming the same delivery key, zero published logs before terminal readback, UNKNOWN receipt and exactly one completed log.
- **Node:** `npm run test:social-provider`, `npm test`, `npm run test:security`; includes mock HTTP status requests and no real provider calls.
- **Supabase:** Read-only observation of connected `AIFINANCIAL` found existing legacy social tables and zero account rows. Target production-project identity, migrated schema, service-role secret configuration, actual provider scopes, account tokens and live OAuth E2E are **NOT_PROVEN**. No DDL applied.
- The implementation used a versioned repository migration filename compatible with surrounding migrations; Supabase CLI was unavailable in the editing runtime. A separate CLI-generated migration file must **not** be created with duplicate DDL.

## External provider evidence

- **YouTube:** `videos.list` supports `snippet,status` and its `snippet.channelId`; this readback has a documented 1-unit quota cost. Upload via `videos.insert` may be restricted to private videos for unverified projects. https://developers.google.com/youtube/v3/docs/videos/list and https://developers.google.com/youtube/v3/docs/videos
- **TikTok:** Creator information, allowed privacy options, app audit and separate status readback must be validated before publishing. https://developers.tiktok.com/docs/en/content-posting-api-get-started and https://developers.tiktok.com/docs/en/content-posting-api-reference-get-video-status
- **Instagram:** Meta provides separate `status_code=FINISHED` (container ready) and `media_publish` steps; **FINISHED is not PUBLISHED**. The Facebook Login vs Instagram Login permissions differ; see https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api
- **Facebook:** Real Page task rights, target Graph API version, publish and page ownership readback are still NOT_PROVEN; no HTTP transport activated.
- **X:** `GET /2/tweets/{id}` supports post lookup and author attribution. It may be billable. https://docs.x.com/x-api/posts/get-post-by-id and https://docs.x.com/x-api/getting-started/pricing

## Costs, deploy and rollback

No provider charge, production DDL, provider upload, new Render service, NATS/Valkey deployment or Secret rotation initiated. Additional optional PostgreSQL GitHub workflow consumes CI minutes and pulls an official PostgreSQL container; execution stays within the repository's existing CI. A moving `postgres:17.11-alpine` tag is version constrained but not digest-locked yet; capture and pin its digest before production-grade supply-chain attestation. Current provider quotas, paid API credits, token permissions, Stripe entitlements and ongoing storage/CPU/network usage are **NOT_PROVEN**.

Rollback before database deploy: revert PR #269. After any eventual database migration, additive schema data must be preserved; never automatically drop jobs or approvals. Before a release, verify exact main SHA, CI, production DB identity, offline secret provisioning, OAuth session/PKCE E2E, approval/rights byte hashes and provider-specific contracts. Owner review/merge remains separate from technical tests.
