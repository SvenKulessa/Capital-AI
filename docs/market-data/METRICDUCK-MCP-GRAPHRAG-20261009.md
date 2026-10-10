# MetricDuck MCP and financial-signal Graph-RAG proposal

Status: CONFIGURATION_IMPLEMENTED / ARCHITECTURE_PROPOSED / RUNTIME_NOT_PROVEN
Reviewed: 2026-10-09 UTC (2026-10-10 Europe/Berlin)
Baseline: main@ad22dcf1408eab3f38e7064eb2f8613cbc092067
Primary domain: CAPITAL-AI-MARKET
Authority: AGENTS.md, SOLO_MAINTAINER_FLOW@1.

## Implemented scope

.mcp.json adds a credential-free operator entry:
```json
{"metricduck":{"type":"http","url":"https://mcp.metricduck.com/mcp"}}
```

Existing GSC and Metricool entries remain. This repository entry is consumed only by compatible clients that explicitly load this configuration. It does not install a ChatGPT connector, configure every MCP client, authenticate a user, or add a website runtime transport. No MetricDuck tool was invoked in the originating session, as requested.

Client handoff:
1. Load the branch configuration in a compatible project MCP client, or connect the official MetricDuck ChatGPT app.
2. Start a fresh client session.
3. Complete the one-time browser sign-in if prompted, personally.
4. In the new connected session invoke search_companies with the company name Apple using its advertised schema; verify the actual returned ticker/CIK. Do not assume successful authentication from exposed tool descriptors.
5. Record the provider/tool contract version, timestamp and returned identity without credentials.

Official ChatGPT app:
https://chatgpt.com/apps/metricduck/asdk_app_6a283782f9d48191a3422b95827b227b

## Provider evidence and restrictions

Sources checked on review date:
- https://www.metricduck.com/mcp/setup
- https://www.metricduck.com/docs/mcp/tools
- https://www.metricduck.com/pricing
- https://www.metricduck.com/terms (Last Updated October 1, 2026)

Interactive MCP uses Streamable HTTP with OAuth; no API key is stored here. The official headless setup documents API-key authentication. Interactive login must not be assumed to authorize an unattended website worker, and its tokens must not be copied into prompts, Git, browser bundles or shared events.

Published pricing: Free 500 tool calls/day, reset 00:00 UTC; Pro USD 20/month or USD 200/year for 50,000 calls/month. Account-specific plan, remaining quota and any tax: NOT_PROVEN. MCP and REST share quotas. Some REST endpoints require Pro. No paid plan or infrastructure was activated. LLM inference, embeddings, compute, storage and egress can add costs; no budget amount has been verified or approved.

Terms section 3 prohibits resale, redistribution or commercialization of provider data without written permission and automated trading without explicit approval. Section 6.3 limits use to personal or internal business purposes. Section 7.3 requires a separate written redistribution agreement; attribution in section 7.2 does not replace that agreement. Therefore public Capital-AI website signals, public caches and social publishing based on these data remain BLOCKED until applicable written rights are evidenced, including derived metrics, excerpts, retention and price-feed data.

SEC filing facts, provider-calculated metrics, provider-generated analysis and price-feed data require separate provenance. The service describes prices as daily end-of-day; do not label them live. Filing analysis can include LLM-generated material and must not be treated as an original filing fact.

## Existing integration points

- .mcp.json: existing operator MCP configuration.
- docs/growth/METRICOOL-MCP-INTEGRATION-20261006.md: Metricool operator/control-plane boundary; no proof of current account permissions or runtime publication.
- Chat Buddy/src/core/graph.ts: static educational finance nodes/edges, retrieval and GraphRagAdapter interface. This is not a persistent company/filing evidence graph or an evaluated financial-signal engine.
- docs/security/ARCHITECTURE-A-GRAPHRAG-TOKENOMICS-TRUTH-WORK-PACKAGE-20261006.md: existing isolated GraphRAG research proposal. Its version and runtime claims were not externally revalidated; do not silently install it.
- package.json: current tests for market contracts, private queries, evidence, prompt-injection controls and social-provider adapters. Tests were inspected as available validation targets, not executed in this configuration-only change.
- server/social-media/provider-adapter.mjs and provider-readback.mjs: discovered social publication/readback extension points; no live binding is established here.

## Proposed runtime flow

Provider → Normalization → Data Quality → Features → Scoring → Evidence → UI

An authenticated prompt selects a bounded research request, not an arbitrary endpoint or an unrestricted tool call. A server-only MCP adapter checks tool allowlists, user identity, rights, timeouts, response size and budget before execution. Private provider results stay user/provider scoped throughout caches, graph traversal, retrieval and generated answers.

Proposed evidence graph entities:
Company (CIK), Instrument (ticker + venue + currency), Filing (accession + filedAt), FiscalPeriod, Fact (concept + unit + value + source locator), Signal, ModelVersion and EvidenceReceipt.

Company identity alone is insufficient for tradable instrument identity. Relations include FILED, REPORTS, SUPPORTS, DERIVED_FROM and SUPERSEDES. Every relationship carries its source and validity scope; semantic association must not be presented as measured causality. Separate observedAt, receivedAt, publishedAt, filing availability and fiscal-period end. Restatements must retain availability chronology: MetricDuck's documented vantage_date restriction is not a guarantee of original historical values.

Graph retrieval supplies bounded cited context. An LLM explains evidence and drafts content; deterministic code calculates numeric features and scores with versioned parameters. Unsupported claims remain NOT_PROVEN. Do not introduce new GitHub required checks or treat model confidence as calibrated probability.

Website projection and social publishing consume the same eligible content/evidence object. The website needs its own authenticated write path and readback. Metricool is the optional social distribution branch, not the market-data source or website database. Retry/idempotency and publication status must distinguish drafted, scheduled, published and readback-verified.

## Architecture decision for Owner review

A — Incremental graph retrieval within the current application (recommended first stage).
Implement a bounded server-side graph/evidence contract and adapter interfaces without a new paid service. Begin with source-linked private research and an offline fixture evaluation. Use the existing graph interface where semantically compatible; select persistent storage only after inspecting actual runtime/schema. Add embeddings only when retrieval evaluation shows a concrete benefit. Benefits: smaller operational surface, easier tenant isolation and rollback. Limits: fewer global/community summaries, storage/inference costs still possible.

B — Isolated GraphRAG research sidecar.
Evaluate the existing research direction as a separate implementation with incremental indexing and local/global retrieval candidates. Verify upstream version, software license, model license, actual cost and runtime footprint before choosing dependencies. Benefits: richer corpus-level research. Trade-offs: extra service, model/indexing costs, deletion propagation and synchronization complexity. No sidecar is created in this PR.

Both alternatives keep numeric scoring deterministic and public provider-data publication disabled until rights are evidenced. The final backend/model/storage architecture is deliberately not selected by this configuration change.

## Proposed acceptance criteria

- New-session Apple search returns real identity and authentication evidence.
- Private tenant A data never appears in tenant B retrieval, cache or output.
- Unsupported tool names/URLs, oversized results, timeouts, quota exhaustion and prompt-injected write requests fail safely.
- All numeric output has unit, fiscal period, source locator, availability timestamp and calculation version.
- Offline replay reproduces the same numeric result after restart; restatements and future filings cannot contaminate a historical comparison.
- Retrieval evaluation measures supported citations, unsupported claims and missed evidence against a fixed source-linked fixture set. Thresholds are agreed from measured baseline, not invented here.
- End-of-day and filing-derived signals are labelled with actual freshness; no live-market label without evidence.
- Missing public rights prevent website/shared-event/social projection.
- Authorized publishing requires idempotency plus destination readback; an LLM output or a scheduled post is not publication evidence.
- Hosted Docker Security Gate and Domain Governance remain the only repository Required Checks; merge follows AGENTS.md.

## Current status

Repository MCP entry: CONFIGURED_ON_FEATURE_BRANCH
Client installation and OAuth: NOT_PROVEN
MetricDuck new-session Apple query: NOT_EXECUTED
Public commercial data rights: BLOCKED_PENDING_WRITTEN_PERMISSION
Graph-RAG runtime / financial-signal publication: PROPOSED_NOT_IMPLEMENTED
Production deployment: UNCHANGED_BY_THIS_PR
