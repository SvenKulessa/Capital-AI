# HeyGen v3 for CAPITAL-AI owner marketing drafts

Baseline: main@9a8b4e782d8e1ffbd84cf0beb8a1dfccffbb2ad2. This is a new integration, not a proven v1/v2 migration.

Owner-only server routes use the existing verified IAM role through `auth.authorizeIamRole`. No customer BYOK, browser API key, SDK dependency, automatic publishing, webhook registration, secret mutation or provider call is introduced by installation. Existing Gemini/Veo contracts stay available.

## Routes

| Method | Route | Behavior |
| --- | --- | --- |
| GET | /api/growth/heygen/readiness | Local configuration check; never calls HeyGen; liveVerified remains false |
| POST | /api/growth/heygen/videos | Same-origin owner session, JSON `{ "jobId": "marketing-01" }`; selects only an approved server-side job |
| GET | /api/growth/heygen/videos/marketing-01 | Polls only the persisted provider ID for that local job |

The provider operations are `POST https://api.heygen.com/v3/videos` and `GET https://api.heygen.com/v3/videos/{video_id}`, authenticated by server-only `x-api-key`. Creation supports avatar + script + voice, MP4 and 16:9/9:16/1:1. Image/studio inputs, translation, cloned voices, arbitrary asset URLs, callback URLs and fallback to legacy endpoints are outside this first slice.

## Configuration and costs

Defaults in `.env.example` are disabled. An owner must verify API access and the current tariff in their HeyGen developer account; a mobile/video product subscription does not establish API credits. Public pricing redirects to the account UI, so no account-specific price or free allowance was verified on 2026-10-08. No paid request was executed.

Configure `HEYGEN_API_KEY` only through the hosting secret interface. Never use VITE_ variables. `HEYGEN_ENABLED=true` and `HEYGEN_PAID_USAGE_APPROVED=true` are explicit runtime opt-ins after the owner confirms costs. `HEYGEN_APPROVED_BATCH_USD` bounds the sum of owner-supplied estimates in `HEYGEN_APPROVED_JOBS_JSON`. This is an approval/estimate guard, **not a metered monthly ledger or a guaranteed provider charge ceiling**. Actual charges may differ; provider-side prepaid credit/spending limits require separate verification before activation. Start with one approved job.

`HEYGEN_STATE_DIR` must be an existing private persistent mounted directory, writable by the runtime UID, outside the public document root and /tmp. No disk is provisioned by this change. A production host with only ephemeral storage must keep creation disabled. Run one service replica with that disk; do not use separate disks across replicas or delete attempted records. These requirements prevent repeating paid submissions after restarts.

Example server-owned approval manifest (illustrative placeholders, not an actual approval):

```json
[
  {
    "jobId": "marketing-01",
    "sourceSha": "0000000000000000000000000000000000000000",
    "expiresAt": "2026-10-09T00:00:00Z",
    "estimatedCostUsd": 1,
    "costApprovalRef": "REPLACE_WITH_OWNER_COST_DECISION",
    "rightsApprovalRef": "REPLACE_WITH_SOURCE_AND_OUTPUT_RIGHTS",
    "brandApprovalRef": "REPLACE_WITH_BRAND_AND_CLAIM_REVIEW",
    "personaConsentRef": "REPLACE_WITH_AVATAR_AND_VOICE_RIGHTS",
    "payload": {
      "type": "avatar",
      "avatar_id": "REPLACE_AVATAR_ID",
      "voice_id": "REPLACE_VOICE_ID",
      "script": "REPLACE_WITH_REVIEWED_MARKETING_SCRIPT",
      "title": "CAPITAL-AI marketing draft",
      "aspect_ratio": "16:9",
      "output_format": "mp4"
    }
  }
]
```

This private manifest is maintained through server configuration, not supplied by API clients. Evidence refs identify actual owner decisions; their text alone does not prove rights, pricing, or consent. Do not copy example placeholders into an activated configuration. Keep the reviewed source revision and exact script bound to the job.

## Submission safety and evidence

Before each POST, an exclusive mode-0600 ledger file records request hash, source SHA, estimate and approval refs and is synced to disk. Concurrent/repeated requests use the same job record; changed content under an attempted job ID is rejected. HeyGen also receives a SHA-bound Idempotency-Key. There are no automatic POST retries; a timeout, HTTP error or malformed response leaves UNKNOWN. An owner must reconcile UNKNOWN in HeyGen before any new job can be authorized; do not clear the ledger to retry. The upstream idempotency window is 24 hours, so local UNKNOWN is never automatically resubmitted later.

Responses are bounded to 64 KiB, redirects rejected and errors sanitized. API keys, scripts and raw upstream errors are not returned. A COMPLETED provider status is not publication or asset acceptance: `assetVerified=false`, `assetHash=null`, `draftOnly=true`, `publicPublishAllowed=false`. Output URLs are not downloaded or automatically published. Immutable byte hash, media QA, branding/claim acceptance and a publisher integration remain subsequent work. Poll results include observation time but do not replace the durable original submission record.

## Validation and references

Run `node --test server/heygen-owner.test.mjs` or `npm run test:heygen`. The offline suite also runs in the app Docker build. Live API/credit availability, Render disk, provider rendering and browser UI are NOT_PROVEN. No UI is added in this backend slice. Existing Social completion and TTS/ASR holds are not changed.

- https://developers.heygen.com/reference/create-video
- https://developers.heygen.com/reference/get-video
- https://developers.heygen.com/endpoint-version-comparison
- https://www.heygen.com/api-pricing
