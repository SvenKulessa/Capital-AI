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
        | future Google Analytics Data API / MCP adapter
        v
GROWTH / analytics evidence
```

GSC and GA4 share a Growth analytics boundary but remain separate upstream authorities. The LukeRenton component currently exposes Search Console only; GA4 must not be represented as implemented by it.

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

## GA4 next slice

GA4 is intentionally not bundled into this component. The follow-up adapter should:

- use the official Google Analytics Data API or a separately reviewed OSS MCP;
- remain read-only initially;
- keep GA4 credentials server/operator-side;
- normalize GA4 landing-page/session metrics and GSC query/page metrics into a common Growth evidence schema;
- correlate by canonical URL without treating GA4 traffic as Search Console index evidence;
- receive its own license/provenance and runtime review before activation.

## Write operations

Sitemap submission is deliberately excluded from this slice. If later required, implement it as a separate Owner-approved capability with an explicit write credential/scope and audit event. Do not broaden the default read credential.
