# Growth Data Layer v1 — 2026-11-24

Scope: GROWTH / PLATFORM / TRUST, existing SOLO2 and Content Engine. Source-separated aggregate projections in `scripts/growth/growth-intelligence-drafts.mjs`, with five synthetic regression groups in the existing test entrypoint. No Docker or package changes needed.

| Source | Identity | Aggregate metric contract |
|---|---|---|
| GA4 | configured `properties/<id>` | sessions, engagedSessions (new #932 readback metrics projection) |
| GSC | `sc-domain:capital-ai.online` | one aggregate row: clicks, impressions, ctr (fraction), position |
| Instagram | configured numeric profile ID | reach, accounts_engaged (period-level, not sums) |
| YouTube | configured channel ID | one row, exact headers views, estimatedMinutesWatched |

`projectGrowthDataLayer({records, expectedIdentities, asOf})` accepts a bounded set of already projected reports; expected identities must come from the trusted caller, not imported data. Reports carry explicit ISO UTC observation time and completed date boundaries. Invalid, duplicate, stale, missing and empty source reports are isolated and do not become zero. SHA-256 binds the normalized projection; it is not authentication. Each source has an independent evidence status and no aggregate cross-source score. `buildGrowthIntelligenceDraftBundle(dataInput)` optionally adds a private context field without altering the historical draft, campaign identity, attribution contract or approval state. No new provider call, scheduler, credential, account linkage or publishing path.

## Runtime handoff
The data-layer function is a local operator/adapter contract, not a deployed importer. Use existing #932 GA4 read plane, pinned GSC MCP guard, existing social read adapters and approved YouTube Analytics reader when each identity and permission are verified. Source-specific upstream transports must supply the projected envelopes; actual GSC, Instagram and YouTube transport execution is NOT_PROVEN. GA4's fixed relative report period must be resolved to exact property-local dates by a trusted caller, not guessed from UTC. This version does not claim LangGraph execution or add a graph runner; existing `scripts/growth-agent/auto_loop.py` remains the orchestrator. Only use a trusted action adapter to pass the bounded projection into a graph; never derive authority from the report. The existing attribution contract must not receive aggregate data as fabricated campaign events. Use explicit consent, matching campaign/content identity, and separate canonical source adapters for future event-level correlation.

Tests: `npm run test:growth-intelligence` (existing CI). No real provider metrics or credentials committed. Rollback: revert scoped commits. Production activation and independently verified provider readback remain separate.
