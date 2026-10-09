# GROWTH: Google Search Authority Foundation

## Status

`LukeRenton/google-search-console-mcp` is admitted as the pinned GSC/SEO MCP component at package version `0.1.0`, upstream commit `a701813f030c7b343302b2eb84474add1697c42f`, MIT license.

This slice creates an operator/control-plane integration only. It does **not** put Google credentials or the MCP process into the public Capital-AI web runtime.

## Authority split

```text
Google Search Console
        |
        | webmasters.readonly
        v
LukeRenton GSC MCP 0.1.0
        |
        | scripts/gsc-mcp-guard.mjs
        v
GROWTH / SEO evidence

Google Analytics 4
        |
        | Admin API + Data API
        v
googleanalytics/google-analytics-mcp 0.7.0
        |
        | internal stdio only
        v
Capital-AI Render web service
        |
        | owner-only sanitized readback
        v
GROWTH / analytics evidence
```

GSC and GA4 share a Growth analytics boundary but remain separate upstream authorities. The LukeRenton component exposes Search Console only. GA4 uses the separately reviewed official Google Analytics MCP package `analytics-mcp==0.7.0` inside the existing Capital-AI Render web service. Source implementation is present; live provider readback remains `NOT_PROVEN` until the Render credentials/property are configured and Production returns a successful read.

## Security model

The upstream authentication helper requests the full `webmasters` scope because it exposes `submit_sitemap`. Capital-AI does not use that auth flow for the default integration. Instead:

1. `npm run growth:gsc:auth -- /path/to/oauth-client.json` requests only `https://www.googleapis.com/auth/webmasters.readonly`.
2. The resulting token is stored in the upstream-compatible token format at `GSC_TOKEN_FILE` or `~/.config/google-search-console-mcp/tokens.json` with mode `0600`.
3. `.mcp.json` starts `scripts/gsc-mcp-guard.mjs`.
4. The guard pins `@lukerent/google-search-console-mcp@0.1.0`, pins the property to `sc-domain:capital-ai.online`, removes `submit_sitemap` from `tools/list`, and rejects direct `tools/call` attempts for that tool.
5. No OAuth client JSON, refresh token, access token, or client secret belongs in Git.

The property pin is an MCP guardrail, not a Google credential boundary. Google account/property permissions remain the ultimate authorization authority.

## Supported initial readback

The admitted read-only surface is:

- `list_properties`
- `query_search_analytics`
- `inspect_url`
- `list_sitemaps`

This is sufficient for the Vocabulary production/indexing workflow: sitemap discovery, per-URL index state, Google-selected canonical, last crawl time, sitemap membership, and Search Analytics metrics.

## One-time operator setup

Enable the Google Search Console API in the chosen Google Cloud project and create a Desktop OAuth client. Do not commit the downloaded OAuth JSON.

```sh
npm run growth:gsc:auth -- /secure/path/oauth-client.json
```

Then start the MCP through the project config or directly:

```sh
npm run growth:gsc:mcp
```

Authentication is only considered verified after `list_properties` succeeds and returns the expected Capital-AI property.

## GA4 Render readback

The GA4 read plane is implemented separately from GSC:

- provider: `googleanalytics/google-analytics-mcp`;
- package: `analytics-mcp==0.7.0`;
- license: Apache-2.0;
- transport: internal stdio child process only;
- execution host: existing Capital-AI Render web service;
- HTTP projection: `GET /api/profile/google-analytics-readback`;
- authorization: existing verified owner identity plus IAM `owner` role;
- cache: five minutes;
- raw MCP endpoint: none;
- provider writes: none.

Only `get_account_summaries`, `get_property_details`, `run_realtime_report` and `run_report` are admitted. Account inventories and credentials are not projected. Realtime and seven-day reports are bounded to aggregated `eventName/eventCount` rows.

The server-side read plane is independent of browser measurement. `src/utils/analytics.ts` remains fail-closed, so this change does not load `gtag.js`, set a Measurement ID or emit browser events. Browser GA4 activation requires its own accepted consent implementation and production verification.

Render-only configuration:

- `GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON`;
- `GOOGLE_ANALYTICS_CLOUD_PROJECT`;
- `GOOGLE_ANALYTICS_PROPERTY_NUMBER`.

Production status stays `NOT_PROVEN` until an authenticated read confirms the configured property and Data API reports. `PAGE_VIEW_OBSERVED` is only emitted when a real provider response contains a positive `page_view` count.

## Write operations

Sitemap submission is deliberately excluded from this slice. If later required, implement it as a separate Owner-approved capability with an explicit write credential/scope and audit event. Do not broaden the default read credential.
