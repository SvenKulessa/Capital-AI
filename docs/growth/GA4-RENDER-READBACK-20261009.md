# GA4 Render Readback — Capital-AI

**Status:** DRAFT / PROVIDER_READ_NOT_PROVEN  
**Primary domain:** GROWTH  
**Cross-cutting:** PLATFORM, TRUST  
**Target runtime:** existing Render web service `Capital-AI`  
**Source baseline:** `main@9e11e812984695a2e28e7ad7f82cfc13431569d4`

## Goal

Move the GA4 read plane into the canonical `SvenKulessa/Capital-AI` repository and existing Render runtime. The old Finance/Codex execution path is not the production authority.

The implementation keeps the official Google Analytics MCP package `analytics-mcp==0.7.0` as the provider adapter. It runs only as an internal stdio child process. The web service exposes a bounded owner-only projection, not a raw MCP endpoint.

## Runtime flow

```text
Google Analytics property
  -> Google Analytics Admin API / Data API
  -> analytics-mcp==0.7.0 (stdio, internal only)
  -> Capital-AI Render web service
  -> GET /api/profile/google-analytics-readback
  -> authenticated owner only
```

## Read surface

Only these MCP tools are admitted:

- `get_account_summaries`
- `get_property_details`
- `run_realtime_report`
- `run_report`

The HTTP projection returns only the configured property summary plus aggregated `eventName/eventCount` evidence for realtime and seven days. Account inventories, credentials, raw tokens, user identifiers and arbitrary caller-supplied dimensions are not projected.

## Secrets

Render-only configuration:

- `GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON`
- `GOOGLE_ANALYTICS_CLOUD_PROJECT`
- `GOOGLE_ANALYTICS_PROPERTY_NUMBER`

The service-account JSON is validated, materialized below the writable runtime temp directory with mode `0600`, and passed to the MCP process only through `GOOGLE_APPLICATION_CREDENTIALS`. The raw JSON is not inherited by the child process and is never returned by the API.

## Privacy / consent boundary

This slice does **not** activate browser GA4 collection. `src/utils/analytics.ts` stays fail-closed until Capital-AI has a separately accepted consent implementation, Measurement ID and production verification.

Therefore:

- server-side GA4 readback implementation: source implementation in this work package;
- browser event collection: disabled;
- live GA4 provider readback: NOT_PROVEN until Render secrets are configured after merge;
- `PAGE_VIEW_OBSERVED`: NOT_PROVEN until a real provider read reports it.

## Cost / quota boundary

No additional Render service is introduced. The existing web service gains Python plus the MCP runtime, which increases image size and may increase build/runtime resource use. No additional Render service or paid plan is activated by this change.

Google Analytics Admin/Data APIs are quota-limited. The readback uses a five-minute cache, a fixed property and at most 25 aggregated event rows per report. A fresh provider snapshot is bounded to eight seconds and the internal MCP child process is closed after the refresh. No write APIs are called.

## Acceptance

1. Docker Security Gate PASS on the exact PR head.
2. Domain Governance PASS.
3. Container contains the pinned MCP executable and runtime Python without a writable package installer.
4. Owner authorization denies non-owner access without starting provider work.
5. Property discovery and details are bound to the configured property number.
6. Realtime and seven-day reads succeed in Production.
7. Event evidence reports `PAGE_VIEW_OBSERVED` only when the provider response actually contains a positive `page_view` count.
8. Browser tracking remains disabled until its independent consent work is complete.
