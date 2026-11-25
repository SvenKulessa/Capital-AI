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

## Follow-up: dependency-free streaming and owner analytics readback
The existing provider transport/projection is shared from `server/growth-provider-read.mjs`; the draft wrapper preserves its public exports. A direct zero-credential Node CLI can stream the exact provider envelope into the existing Python graph without installing additional Node libraries:

```bash
set -o pipefail
node server/growth-provider-read.mjs --graph-handoff |
  python3 scripts/growth-agent/product_opportunity_graph.py --growth-data -
```

Existing pinned Python CI discovers the two cross-process streaming tests (all disabled and synthetic partial GA4). The actual owner action fetches GA4 and GSC separately and appends a single version; GSC uses the existing explicit `GROWTH_GSC_READ_ENABLED` and `GROWTH_GSC_READ_TOKEN` configuration, default deny, fixed property, no new scope or secret activation. Owner-only endpoint rejects arbitrary queries and methods. The encrypted archive accepts the GSC origin as documentation; recovery flags remain unchanged. No periodic provider calls, production graph-worker activation, direct production readback or recovery claim follows from merging this change. Rollback: revert scoped PR, preserve archive contents (disable/archive export before reverting if new GSC-origin snapshots exist).

Host-only cross-language tests reside in `test_growth_streaming_e2e.py`, discovered by the existing Google Maintenance workflow. The intentionally Python-only offline candidate executes `test_product_opportunity_graph.py` unchanged. No Node installation or skipped host tests. At prior head 1d9dd66bd653d02686556cef0217e96d9ea34d9e, host graph run 45455778666 and Owner Chromium run 45455778477 succeeded; candidate run 45455778593 failed with missing `node` in the two misplaced host tests. The synchronized head requires fresh CI.
