# CAPITAL AI – MetricDuck + Metricool + Agent Ready

Status: **CONTRACT_IMPLEMENTED / LIVE_PUBLISHING_BLOCKED**. These services are separate, complementary read-only/operational integrations, **not** a second Social Media Engine or a Finance runtime bridge.

## Observed connector checks (2026-10-10)

| Connector | Readback | Intended role | Runtime/publishing boundary |
| --- | --- | --- | --- |
| MetricDuck | `search_companies("Apple")` returned AAPL/CIK 0000320193 and SEC EDGAR identity | SEC filings, source-linked financial research, facts for editorial claim verification | SEC-derived facts are not redistribution rights; EOD pricing is not intraday or guaranteed commercial display authority |
| Metricool | `getBrandSettings` returned no connected social network, brand id 7337397 | Channel discovery, scheduling, social analytics and true provider readbacks after OAuth | **BLOCKED**: no network linked. Metricool MCP is operator-side; not Capital-AI production backend API, do not activate paid REST API |
| Agent Ready | Scan `https://capital-ai.ai.studio` completed: 44/100, llms.txt 0, auto accessibility 100; report https://agent-ready.dev/scan/-xSoAjaQST | Public-site agent-readability/SEO candidate evidence | Scanner report is advisory and reflects scanned host only, not production or WCAG PASS |

### Architecture

```text
CAPITAL-AI Content Engine
  +--> MetricDuck SEC evidence (read-only, link to official filing)
  +--> Agent Ready audit evidence (read-only, site-specific)
  +--> Legal/licensing checks for tools, original source, generated graphics
  +--> PRIVATE_PERSONAL / COMMERCIAL policy boundary (server-side)
  +--> Existing Social Media Engine handoff/approval
          +--> Metricool operator-side scheduling ONLY if OAuth-connected
          +--> provider ID + terminal readback before PUBLISHED
```

Implemented reusable source-level policy: `src/contracts/contentExternalToolPack.ts`. It is **not yet attached to a server enforcement endpoint**; this distinction must not be hidden.

## Rights and privacy

- `PRIVATE_PERSONAL` does not license outputs for commercial use; no spillover into commercial drafts, caches or shared channels.
- `COMMERCIAL` requires explicit provider, input, output, media and derived-data rights. No provider query/connection status grants rights.
- Isolate owner/user BYOK, analytics and provider secrets server-side. Never export raw credentials or private financial inputs.
- Editorial model output and comments are untrusted; carry SEC accession/CIK, filing date and quotation source, not numerical guesses or implied buy/sell signals.
- Verify image, video, font, voice, codec and model weights independently via Legal Engine. Without real licensed artwork and visual QA, content remains DRAFT.
- This contract is advisory for tool usage; it grants **no publication, merger or billing authority**.

## Specific next evidence

1. Link a social network through https://app.metricool.com/brands/connections?blogId=7337397; re-run brand/channel readback before any scheduling.
2. Check MetricDuck redistribution/commercial terms and actual price-feed terms before public financial-signal use; research is not public rebroadcast.
3. Verify public production domain independently of `capital-ai.ai.studio`, then reproduce Agent Ready findings; do not expose repository `AGENTS.md` or sensitive paths as public SEO remediation.
4. Add server-enforced mode separation, provider result schemas, audit receipts, negative tests, and publish/approval verification to the existing Growth/Social contracts.
5. Re-run Docker Security Gate and Domain Governance on exact PR head; no deploy outside main, no PR merge without owner authority.

Costs: MetricDuck described as free up to 500 queries/day (provider quota needs current verification); Metricool free-plan feature/connected-channel limits apply; Agent Ready reports a free scan. Usage, plan caps and deployment-side costs remain **NOT_PROVEN**; do not activate paid APIs.
