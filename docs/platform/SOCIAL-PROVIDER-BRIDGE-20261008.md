# CAPITAL-AI Social Provider Bridge — controlled provider migration (2026-10-08)

## Scope and authority

- **Primary domain:** PLATFORM; **related:** GROWTH (Social), TRUST (OAuth, publication evidence).
- **Stacked dependency:** PR #268, `CAPITAL_AI_CONTENT_SOCIAL_PACKAGE@1` / `CAPITAL_AI_CONTENT_SOCIAL_PUBLISHER_ADAPTER@1`.
- **Implementation:** `server/social-media/provider-adapter.mjs` (server-only), `server/social-media/provider-adapter.test.mjs`.
- **Authority:** `SOCIAL_MEDIA_ENGINE_ONLY`. No Content Studio or Content Engine direct publish.
- **Status:** `PREPARED_FAIL_CLOSED`. No provider network calls, OAuth redirects/exchanges, secret reads, production activations, delivery job writes, or deployments have been introduced. Default adapter readiness in the public contract remains `INTEGRATION_PENDING`.

## Exact binding to existing Supabase tables

| Existing table | Bridge mapping | Enforced boundaries |
| --- | --- | --- |
| `social_media_accounts` | `id`, `user_id`, `platform`, `status`, `scopes`, `token_expires_at`, `external_account_id`, `handle` | Account owner and platform exact match, connected/encrypted token present, token not near expiry; encrypted token material never leaves server-only account readback |
| `social_media_oauth_states` | `state_token`, `user_id`, `platform`, `redirect_uri`, `code_verifier`, `expires_at`, `used_at` | CSPRNG state stored **as SHA-256**, redirect exact allowlist, X requires PKCE, expiry and constant-time hash comparison. **Callback must first atomically claim `used_at`** before token exchange; inspection alone does not prevent replay |
| `social_media_content_approvals` | `id`, `user_id`, `status`, `platforms`, `decided_by` | Existing schema lacks `asset_id` and `asset_sha256`; no trusted hash-bound publish approval is yet representable |
| `social_media_publish_log` | `user_id`, `episode_id` (content ID), `platform`, `account_id`, `status`, `publish_type`, `published_url`, `created_at` | Only provider-verified terminal `published` / `failed` may enter legacy log; `UNKNOWN`, async accepted and processing never count as published |

Mappings for `YOUTUBE`, `TIKTOK`, `INSTAGRAM`, `X`, `FACEBOOK` preserve the legacy lowercase database enum. `LINKEDIN` and other channels stay unsupported for this provider bridge.

## Mandatory remaining storage/runtime implementation

The bridge's `prepareSocialProviderDelivery` intentionally requires **all** evidence below (default: none available). These are implementation preconditions rather than new repository-level governance checks.

1. The authoritative, **server-fetched** content package and handoff match campaign/content/source, immutable `assetSha256`, channel, approval reference and deterministic delivery key. The manifest's approval array by itself is **not trusted**.
2. A current authenticated Supabase user ID matches the service-role-read social account row and the persistent approval. The historical Finance user IDs, credentials and tokens are **never migrated**.
3. An additive, reviewed schema evolution introduces a durable approval binding to `asset_id` + `asset_sha256`, with an immutable-asset byte readback and rights evidence. The current `social_media_content_approvals` table does not contain these columns.
4. A durable, **uniquely reserved** delivery job stores at least `user_id`, `delivery_key`, `asset_sha256`, `approval_ref`, reservation expiry, provider delivery ID, readback status and evidence reference. Claim must be atomic in the database. The current `social_media_publish_log` has no delivery key or provider ID, and cannot replace a job store.
5. Provider-specific OAuth configuration, scopes, app review, account type, rights, API versions, quotas and usage costs are freshly verified, persisted as trusted operator evidence; do not promote `READY` based only on a local flag.
6. Resumable uploads, source URL protections (SSRF/DNS rebinding), content-type, payload limits and media specifications are verified against the current provider API. Upstream Finance source uses old Meta v19.0 calls, hardcoded public TikTok privacy and an incomplete YouTube multipart content type. Those calls have **not** been copied.
7. Provider acceptance, processing, explicit unknown and final publication are separate states. Only a provider-side readback tied to the correct delivery key and provider ID may generate `PUBLISHED`; on timeout, reconcile by provider ID before retrying. Never auto-republish on redelivery without idempotent proof.
8. A server-only production route may be attached **after** persistent approval/job and secret-store scoping are implemented; enforce authenticated owner capability, no browser-visible secrets, CSRF/origin protection, bounded input, quotas, observability and sanitized logs.

## Validation

```bash
npm run test:social-provider
npm test
npm run test:security
npm run lint
```

New suite covers the five mappings, manifest identity/hash binding, account user scoping and token redaction, legacy approval fail-closed, immutable byte evidence and reservation, async/unknown readback, terminal publish-log mapping, OAuth PKCE/state expiry/replay.

## Cost / license and release boundary

No new dependencies, external provider requests, billable resources, broker changes, credentials, or migrations were introduced in this slice. Provider API usage, app review, quotas and possible per-post/upload charges remain **NOT_PROVEN**. The next implementation should check official provider contracts and quota/cost specifics before enabling any outbound traffic; a local mock or successful CI test is not a live API/rights approval.

**Rollout:** PR-based review only. No main merge, no Render deploy, no NATS/Valkey redeploy. Remove the server-only bridge and its test/script changes to roll back this slice without changing production data.
