# Growth Data Layer v1 — 2026-11-24

Scope: GROWTH / PLATFORM / TRUST, existing SOLO2 and Content Engine. Source-separated aggregate projections and explicitly enabled provider transports in `scripts/growth/growth-intelligence-drafts.mjs`; offline Growth StateGraph in `scripts/growth-agent/product_opportunity_graph.py`. No new scheduler, deployment, publishing or cost authority.

| Source | Identity | Aggregate metric contract |
|---|---|---|
| GA4 | configured `properties/<id>` | sessions, engagedSessions (reuse #932 MCP readback) |
| GSC | `sc-domain:capital-ai.online` | clicks, impressions, ctr (fraction), impression-weighted position |
| Instagram | configured numeric profile ID | reach, accounts_engaged (period-level, not sums) |
| YouTube | configured channel ID | views, estimatedMinutesWatched (exact day rows and headers) |

`projectGrowthDataLayer({records, expectedIdentities, asOf})` isolates invalid, duplicate, stale, missing and empty source reports. Missing values are not measured zero. SHA-256 binds the normalized projection; it is not authentication. Imported records cannot grant publishing, costs, attribution or automatic recommendation promotion. Default draft builds remain offline. The collector uses server/operator-provided configuration, bounded fixed-origin reads, source-specific failure states and explicitly enabled flags. GA4 dates derive from the property timezone. GSC, Instagram and YouTube runtime authentication and rights are not established by source code or synthetic tests.

## Explicit local graph handoff

Run only in the existing trusted operator environment with pinned Node/Python dependencies. Provider read flags must remain disabled unless the corresponding account, scopes and costs are already authorized. No credentials in the command, JSON, Git or logs. The graph-only flag omits the content draft bundle, and the Python reader bounds stdin before parsing. No temporary provider-data file is necessary.

```bash
set -o pipefail
node --import tsx scripts/growth/growth-intelligence-drafts.mjs --read-providers --graph-handoff |
  python3 scripts/growth-agent/product_opportunity_graph.py --growth-data -
```

The existing file-based `--growth-data <path>` and full draft output remain supported. The graph fans out PRODUCT, MARKET, PLATFORM, TRUST and GROWTH, joins QUALITY, and returns source status/evidence references only; `NOT_PROVEN_BY_GRAPH` is not provider authentication. The graph cannot publish, spend, mutate or manufacture attribution events. The engineering `auto_loop.py` and private worker admission remain unchanged. Owner dashboard live ingestion, persistent evidence and production provider execution are separate, not established by this change.

Tests: `npm run test:growth-intelligence` and `python3 -m unittest discover -s scripts/growth-agent -p 'test_product_opportunity_graph.py'` in existing CI. Earlier head `3c756c11eaeca9f666901a8f546b9c09ecd8884e`: Docker Security Gate 45409449631, Domain Governance 45409449314, Google Maintenance and Local Growth Graph 45409449336 returned success. These results do not certify the new head. Rollback: revert scoped commits. No real provider metrics or credentials committed.
