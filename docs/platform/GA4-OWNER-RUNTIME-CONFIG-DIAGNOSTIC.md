# Owner-only GA4 runtime configuration diagnostic

Route: `GET /api/profile/google-analytics-config-diagnostic`

This route is handled by the existing `createGoogleAnalyticsReadback` instance and uses the same strict owner authorization contract as `/api/profile/google-analytics-readback` (verified owner identity and IAM role). Unauthorized clients receive indistinguishable 404 responses. All responses are `private, no-store`; methods other than GET return 405 and query strings return 400 after owner authorization.

The diagnostic reads **only** the currently loaded Render process environment, entirely in memory. It does **not** use `RENDER_API_KEY`, Render REST API, Google API, MCP processes, secret manager access, or filesystem materialization. It adds no new permissions, external calls, costs, or unauthenticated routes.

The response has only `schema`, fixed `status`, `JSON_VALID`, `PROJECT_MATCH`, and a fixed `reason` code. No project IDs, key material, hashes, service-account email, JSON fragments, environment inventory, provider details, or error text appear in the response. `GA4_CONFIG_VALID` means **syntax, required service-account fields and project match only**, not that the key, API permissions, property, or events have been verified.

Example (synthetic):

```json
{"schema":"CAPITAL_AI_GA4_OWNER_CONFIG_DIAGNOSTIC@1","status":"CONFIG_DIAGNOSTIC_ONLY","JSON_VALID":false,"PROJECT_MATCH":null,"reason":"GA4_MCP_SERVICE_ACCOUNT_INVALID_JSON"}
```

Diagnostic classes: `GA4_MCP_SERVICE_ACCOUNT_NOT_CONFIGURED`, `GA4_MCP_SERVICE_ACCOUNT_INVALID_JSON`, `GA4_MCP_SERVICE_ACCOUNT_INVALID`, `GA4_MCP_CLOUD_PROJECT_NOT_CONFIGURED`, `GA4_MCP_PROJECT_MISMATCH`, `GA4_CONFIG_VALID`.

Tests: `node --test server/google-analytics-readback.test.mjs`. Existing Docker Security Gate already executes this suite. The owner must initiate the browser request from the authenticated dashboard session, read only these safe fields, and keep full credential values out of chat/logs.

Do not attempt automatic secret repairs. Once a valid, trusted original service-account credential is restored through the existing protected Render environment editor, independently verify the owner-only GA4 MCP readback; preserve NOT_PROVEN for provider events until a successful verified report.
