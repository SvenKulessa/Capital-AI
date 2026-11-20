# GA4 Render Configuration Probe — Acode / Federation

Status: read-only, operator-invoked, secret-safe. Contract `CAPITAL_AI_GA4_RENDER_CONFIG_DIAGNOSTIC@1`.

## Scope

Runs from an already authorized Acode/Termux or federated operator terminal. Uses the Render API **locally**; it does not obtain a credential from the chat, Render application's environment, or Google Cloud. Never grant Render API tokens to browser code, GitHub PRs, chat messages or Google Drive exchange folders.

The current Render API supports `GET /v1/services/{serviceId}/env-vars/{envVarKey}` for **direct service variables only**. Environment-group values need a separate authorized route and are deliberately not retrieved by this narrow probe. Only two fixed keys are requested:

- `GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON`
- `GOOGLE_ANALYTICS_CLOUD_PROJECT`

The expected Google Cloud project is the existing project `aifinancial-500208`. No project/host/service ID is accepted from untrusted CLI arguments.

## Run in Acode / existing federation terminal

Requires Node.js with built-in `fetch` (Node 26 in repo; Node 20+ locally) and a **pre-existing, local, authorized** Render API credential in `RENDER_API_KEY`, `RENDER_API_TOKEN`, or `RENDER_API`. Do not copy the credential out of the protected profile, and do not put it into shell history.

```sh
node scripts/ga4-render-config-diagnostic.mjs
```

No CLI secret flags and no verbose mode. The script returns only:

```json
{"JSON_VALID":true,"PROJECT_MATCH":true,"reason":"GA4_CONFIG_VALID"}
```

This is a **format and project-identity check**, not evidence of Google authentication, key validity, GA4 Property Viewer privileges, real events, or a successful MCP subprocess. A failure returns exit code 1 and a fixed code; no raw response or exception is printed.

Examples of fixed codes: `RENDER_API_NOT_CONFIGURED`, `RENDER_API_UNAUTHORIZED`, `RENDER_API_FORBIDDEN`, `RENDER_VAR_UNAVAILABLE`, `RENDER_RESPONSE_INVALID`, `GA4_MCP_SERVICE_ACCOUNT_INVALID_JSON`, `GA4_MCP_SERVICE_ACCOUNT_INVALID`, `GA4_MCP_PROJECT_MISMATCH`.

## Safety and recovery

- Hard-coded API host `api.render.com`, service ID `srv-dau1rp893c1s73cdhm1g`, fixed GET-only paths, 8-second timeout, 64 KiB response bound, no redirects
- Secret JSON is parsed in process memory; only booleans and allowlisted codes leave the process
- Does not log key fingerprints, key existence beyond fixed diagnostic codes, full HTTP responses, PII, environment inventories or service-account email
- No service-account JSON is written to disk, Drive, GitHub Actions artifacts or the browser
- Does **not** update a variable or trigger a deployment. Use an authorized secret manager or Render's protected editor to replace a malformed value after validation; never manufacture a replacement key or round-trip an existing private key through chat
- For an API `404`, investigate whether the key is set directly on the service or in a linked environment group; do not assume missing secret

## Verification

```sh
node --test scripts/ga4-render-config-diagnostic.test.mjs
```

The existing Docker Security Gate runs these tests on PRs in its first Node test batch. Domain Governance remains unchanged. After repairing any Render value, verify actual Render deployment SHA, then owner-only `/api/profile/google-analytics-readback` and `/api/profile/evidence-dashboard-readback`; preserve `NOT_PROVEN` until provider read succeeds. Do not report a blank GA4 value as zero events.
