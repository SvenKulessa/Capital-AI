# GSC Service Account — read-only access verification

**Stand:** 2026-10-09 · **Primary Domain:** GROWTH · **Cross-domain:** TRUST / PLATFORM
**Status:** REPO_IMPLEMENTED / LIVE_ACCESS_NOT_PROVEN

## Scope and trust boundary

This adds a standalone, operator-run verification script at scripts/gsc-service-account-readback.mjs. It does **not** change the default LukeRenton GSC MCP interactive OAuth read plane, expose an HTTP route, run at server startup, or activate browser tracking. It adds no publication, Google API write or Google Cloud IAM authority.

The service account has reportedly received Search Console property permissions. That external fact stays **NOT_PROVEN** until Google authenticates its exact identity and confirms access to sc-domain:capital-ai.online.

## Execution

Invoke in a trusted operator environment with an existing private service-account JSON secret. Do not paste credentials into chat, files under Git, CI variables, logs or scripts.

~~~sh
# GSC_SERVICE_ACCOUNT_JSON is supplied by the private secrets mechanism
node scripts/gsc-service-account-readback.mjs
~~~

Required environment: GSC_SERVICE_ACCOUNT_JSON holding a Google-issued service_account JSON including client_email, private_key, project_id and token_uri=https://oauth2.googleapis.com/token. No credentials are created or copied by this PR. Existing GA4 credentials are **not** reused implicitly.

The script requests only webmasters.readonly using a short-lived signed OAuth JWT and performs these operations in order:

1. POST https://oauth2.googleapis.com/token — obtain ephemeral access token
2. GET https://www.googleapis.com/webmasters/v3/sites — confirm exact property and effective permission
3. GET https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Acapital-ai.online/sitemaps — verify property data access

Returned evidence contains only the property, Google permission level, sitemap count, timestamp, readonly scope, and result status. Google error response bodies, key material, service-account email, tokens, JWTs and account inventories are not projected.

## Verification

- Unit tests: node --test scripts/gsc-service-account-readback.test.mjs (mock HTTP and ephemeral, locally generated RSA key; **never** a real Google provider test)
- LIVE PASS requires exit code zero and actual Google responses to both read-only Search Console GETs under the intended service account.
- A 401/403 is not a reason to expand scopes or disable checks. Review API enablement, the exact Search Console property assignment and the authenticated service-account identity separately.
- Google Cloud IAM and Search Console property permissions are separate authorities; GA4 property permissions are separate again.
- No public API route and no automatic provider calls in CI.

No new paid subscription, Render service or resource is created. A real invocation uses one token request and two quota-limited GSC reads; remaining quota, billing state and runtime costs are NOT_PROVEN.

## Sources (official Google documentation)

- https://developers.google.com/identity/protocols/oauth2/service-account
- https://developers.google.com/webmaster-tools/v1/how-tos/authorizing
- https://developers.google.com/webmaster-tools/v1/sites/list
- https://developers.google.com/webmaster-tools/v1/sitemaps/list

Rollback: revert the standalone script, test, documentation and existing-workflow test invocation. Google configuration and live data are unchanged.
