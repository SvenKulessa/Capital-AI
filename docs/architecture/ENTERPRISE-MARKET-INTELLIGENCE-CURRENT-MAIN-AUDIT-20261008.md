# CAPITAL AI — Enterprise Market Intelligence: Current-Main Architecture Audit

**Date:** 2026-10-08. **Primary domain:** MARKET (PRODUCT/PLATFORM/TRUST intersections).
**Baseline:** `main@44ce0b4b727a857809595619709ee23366367ab9`.
**Authority:** root `AGENTS.md` / `SOLO_MAINTAINER_FLOW@1`.
**Scope:** static source audit of the main tree; no deployment, provider health, contract-entitlement, secrets, CI or live-data claims.
**Earlier audit:** `docs/architecture/ENTERPRISE-MARKET-INTELLIGENCE-PART1-CLOSEOUT-20260930.md`.
All status assertions below describe inspected source, not a current operational readback.

## Executive decision

Do **not** create another registry, scorer, public market feed or NATS/Valkey deployment. Parts 1–3 already have partial source implementation. Retain the existing canonical authorities, extend in reversible slices, and keep all scoring/ranking delivery blocked until implementation, data rights, quality, eligibility and durable evidence are independently proven.

The repository main tree contains 1,523 entries; source paths were catalogued across `src`, `server`, `services`, `shared`, `supabase`, `docs`, `contracts`, `deploy`, `.github` and `render.yaml`. This is a source-path inventory and targeted content audit, **not** a claim that every file was manually code-reviewed.

## Canonical inventory

- `src/contracts/analysisComponentRegistry.ts`: exactly 50 unique requested component identifiers, all 13 named domains; 45 `planned`, 5 `blocked`, zero `active`/`shadow`/`mock`; all 50 `unavailable`, all `lastValidatedAt=null`.
- `src/contracts/analysisComponentRegistryValidator.ts`: unresolved input/output DTOs, provider aliases, feature IDs, asset-class compatibility and lifecycle activation fail closed.
- `src/contracts/common.ts`: narrower internal asset taxonomy; target product universe includes ETFs, options and additional classes that require mapping.
- `src/contracts/canonicalContracts.ts`: Zod schemas for `AssetIdentity`, `DataProvenance`, `FeatureValue`, `ScoreResult`, `FinalRankResult`; active rank requires eligibility and confidence policy.
- `src/contracts/pipelineExecution.ts` and `src/config/shadowScoreConfig.ts`: eight ordered stages, six score/risk families and shadow-only research configuration; no default provider activation.
- `src/services/componentRunner.ts`, `scoringEngine.ts`, `shadowPipeline.ts`, `featureStore.ts`, `evidenceEngine.ts`: typed runner, existing scoring authority, offline replay, snapshot interface, canonical hashing. Durable restart-proof production scoring evidence is not established by the browser fingerprint helper.
- `src/services/pipelineConfigurator.ts`, `src/config/analysisComponentFlags.ts`: configuration models and conservative flags; in-memory revisions are not proof of an authorized production control plane.
- `src/config/providers/providerRegistry.ts`, `src/services/providerAdapters.ts`, `server/oss-provider-adapters.mjs`, `server/ecb-reference-rates.mjs`: provider abstractions and ECB reference adapter; registered providers do not establish public redistribution entitlements.
- `server/market.mjs`, `shared/market-contracts.mjs`, `server/infrastructure.mjs`, `server/market-spot-ingestion.mjs`: canonical quote ingress, mapping, NATS JetStream `CAPITAL_FACTS`, replay and Valkey read cache; score delivery remains separately disabled.
- `server/private-provider-query.mjs`, `server/private-market-batch.mjs`, `services/provider-bridge-rs/src/main.rs`, `src/config/providers/privateByokCatalog.ts`: distinct authenticated, user-scoped Kraken/Massive private BYOK lane; it is not a public market feed.
- `supabase/migrations/*`: 105 versioned SQL migration files; `20260801143612_score_snapshots.sql` is a score history primitive, not evidence that every score is reproducible.
- `src/services/marketDataStore.ts`: React `useSyncExternalStore` and server-sourced market catalog; existing empty asset seeds under `src/data/assets/*`.
- `src/features/screener/{EnterpriseScorerDashboard,ScoreExplainabilityDrawer,ScreenerTable}.tsx`: existing scorer/screener/drawer UI and explicit unavailable states; no verified cross-sectional ranked universe is shown.
- `src/features/market/{MarketSentiment,SectorAnalysis}.tsx` and `src/features/whale-radar/*`: unavailable content rather than fabricated sentiment, social activity or flows.
- `src/app/routing/*`, `src/utils/appNavigation.ts`: existing routes/navigation; preserve.
- `src/data/mockData.ts`: legacy metadata contains unverified realtime, sub-45ms and indicative percentage trend wording. Current transformed module descriptions mark features planned; claim-copy still needs targeted review.
- `server/index.mjs`: public informational market endpoints, separate authenticated provider calls and internal owner-only diagnostics.
- `render.yaml`, `.env.example`, `Dockerfile`, `.github/workflows/*`, `package.json`: existing deployment/config/security/test paths; no Render sync, OCI or CI terminal verdict is inferred.

## Required domain dependency direction

```text
provider-registry + asset-master
             | rights/identity/venue
             v
market-data ingestion -> normalization -> data-quality
             |                                |
             +--------> immutable facts       v
                                        feature-store
                                             |
                                market-intelligence
                                             |
                                   risk-controls/eligibility
                                             |
                                     deterministic scoring
                                             |
                                         ranking
                                             |
                             evidence + ui-explainability
                                      + observability

pipeline-configurator: versioned orchestration only, no gate bypass
private BYOK lane: independent tenant data, no public CAPITAL_FACTS fan-out
```

## Gap and validation backlog (severity)

| Finding | Severity | Minimal verifiable unblocker |
| --- | --- | --- |
| 50 registry entries, zero executable/admitted production cohort | BLOCKER | Resolve real contracts/features/provider scope; implement first integrity/DQ/liquidity cohort and shadow evidence |
| Public redistribution, derived-work rights and feed entitlements for proprietary providers | BLOCKER | Explicit rights evidence per use case, market, venue, plan, user and license scope |
| Durable scorer snapshots, model/weight/input fingerprints, replay-to-UI linkage | BLOCKER | Append-only persisted replay readback bound to modelVersion/evidenceId/timestamps |
| Nine product classes vs narrower engine taxonomy | WARNING | Versioned asset-class/subclass/venue mapping and tests, without assuming identical product and internal values |
| Simulated/unverified product copy (latency, realtime, trends) | WARNING | Remove or qualify each unsupported claim; no performance SLA without measurements |
| Provider/runtime smoke, current website readback and measured latency | NOT_PROVEN | Exact main SHA → deployed image → health → fact/hash replay → UI |
| Admin-only pipeline route with audit/approval persistence | BLOCKER before activating production configuration | Owner-authenticated backend read/write with immutable config history, revision approval and audit trail |
| NEWS/SOCIAL/ONCHAIN/DERIVATIVES dataset family coverage | BLOCKER for corresponding component activation | Contracted feeds with scope, mapping, freshness, completeness and observed source facts |

**Current public reference coverage**: source code admits 20 daily ECB EUR-FX reference instruments; this is **not** proof that 20 current quotes were delivered or displayed. `docs/architecture/MARKET-SPOT-COVERAGE-20261008.md` notes zero source-admitted commercial instruments in other listed public classes. Private Kraken/Massive batches are a separate product surface.

## Part-by-part delivery inventory

**Part 1:** STRUCTURE PRESENT. Registry, contract IDs, 13 domains and prior architecture report exist. Static readiness snapshot added in `src/services/marketIntelligenceReadiness.ts`; explicitly never authorizes scores or providers.

**Part 2:** PARTIAL. Strict shadow/replay contract and rights checks exist. Missing verified data coverage, executable registry cohorts, durable production scored evidence, full instrument taxonomy and admin-authorized configurator.

**Part 3:** PARTIAL / FAIL-CLOSED. Existing dashboard/drawer/table preserve visual identity, but no admitted ranked universe, no complete source-backed sentiment/whale feature set, and no production run-history/replay console.

## Files for the next implementation slices

**Existing paths to extend only when tests cover exact behavior:**
`src/contracts/common.ts`,
`src/contracts/analysisComponentRegistryValidator.ts`,
`src/contracts/canonicalContracts.ts`,
`src/services/componentRunner.ts`,
`src/services/scoringEngine.ts`,
`src/services/shadowPipeline.ts`,
`src/features/screener/*`,
`src/features/market/*`,
`src/features/whale-radar/*`,
`server/market.mjs` and `server/index.mjs`.

**Additive candidates (not yet created):**
`src/contracts/assetMasterMapping.ts`,
`src/services/marketFeatureQuality.ts`,
`server/market-scorer-evidence.mjs`,
`src/features/screener/MarketReadinessConsole.tsx`,
`src/contracts/__tests__/*` for dedicated contract and boundary regression.

**Untouched in this audit slice:**
`AGENTS.md`, `render.yaml`, `Dockerfile`, `public/branding/*`, navigation/router, the existing market cards, Supabase migrations, deployment secrets, provider Vault, live data caches, NATS/Valkey provisioned services and pricing/licensing agreements.

## Ordered next work

1. Add registry/readiness regression and prevent unverified marketing claims across shared UI copy.
2. Introduce versioned mapping for all target asset classes; test mapping ambiguity and venue/currency identity.
3. Implement first real ingestion→DQ→feature→runner shadow cohort using contracted provider data, not mocked values.
4. Persist/verify score evidence and replay with exact model/weight versions; keep public rank disabled.
5. Implement restricted pipeline history/configuration readback and explainability; validate accessibility and responsive UI.
6. Run contract/unit/integration/plausibility/production-readback suites on exact PR and main commits.
7. Promote components individually only after rights, source coverage, observability, cost, runtime and Owner approvals where legally/contractually or operationally required.

## Rollout criteria

- **DEMO**: `isDemo=true`, explicit label, never rank/alert/decision eligible.
- **DELAYED**: display only with provider permission, timestamp and delay methodology; derived score separately gated.
- **VERIFIED LIVE**: verified legal scope + exact mapping + quality + freshness + explicit eligibility + immutable scorer replay + owner-authorized activation + UI audit path. No shortcut from a passing GitHub test.

Potential incremental costs: provider plans/BYOK limits, WebSocket/REST quotas, Render CPU/network/storage, Supabase persistence, NATS/Valkey persistence and CI minutes. Actual tariffs, remaining free quotas and estimated spend are **NOT_PROVEN** here. No paid service or usage expansion is activated by this audit.
