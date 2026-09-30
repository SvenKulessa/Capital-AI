# ENTERPRISE MARKET INTELLIGENCE — PART 1/3 Closeout Audit

**Repository:** SvenKulessa/Capital-AI  
**Audit baseline:** `main@648c71c4cb73f6404df4b0fea2c7611046326410`  
**Date:** 2026-09-30  
**Scope:** Audit, canonical inventory and architecture only. No scorer is promoted to production by this document.

## Executive status

Part 1 is **structurally implemented but not production-activated**.

- Canonical component inventory: **50/50 unique component IDs present**.
- Lifecycle state on the audited main: **45 planned, 5 blocked, 0 mock, 0 shadow, 0 active, 0 degraded, 0 retired**.
- Provenance state: **50/50 unavailable**.
- Validation timestamps: no component carries a production validation timestamp.
- Canonical domain taxonomy: all 13 requested domain names are declared.
- Runtime contracts and Zod validation exist.
- Real quote ingress, NATS JetStream evidence and Valkey cache/pub-sub exist independently of scorer activation.
- Scoring/ranking remain fail closed because component contracts, feature implementations, provider rights and replay/admission evidence are incomplete.

This means the **Part-1 architecture artifacts are mostly complete**, while **production scorer activation remains 0/50** by design.

## Deliverable correlation

| Prompt deliverable | Current main evidence | Status |
| --- | --- | --- |
| Repository audit/current-state inventory | `ARCH-PIPE-0001-current-state-report.md`, `REAL-DATA-INGRESS.md`, current production snapshots | PRESENT; historical snapshots must not be treated as live state |
| Gap analysis | `ARCH-PIPE-0002-target-state-delta-report.md`, `ANALYSIS-FOUNDATION.md` | PRESENT |
| Canonical 50-component registry | `src/contracts/analysisComponentRegistry.ts` | PRESENT, exactly 50 unique IDs |
| Domain boundaries | `CanonicalDomainSchema` plus contract/service separation | PRESENT |
| Dependency graph | dependencies are encoded per registry entry; this document makes the directional graph explicit | PRESENT AFTER THIS SLICE |
| Existing/new/do-not-touch file list | documented below | PRESENT AFTER THIS SLICE |
| No destructive implementation before audit | migrations/destructive refactors were not required for this closeout slice | SATISFIED |

## Canonical dependency graph

```text
provider-registry
      |
      v
 market-data ---> asset-master
      |              |
      +-------> evidence
      |              |
      v              v
 data-quality --> feature-store
      |              |
      v              v
 risk-controls --> market-intelligence
                       |
                       v
                    scoring
                       |
                       v
                    ranking
                       |
          +------------+------------+
          v                         v
   ui-explainability          observability

pipeline-configurator may compose approved nodes, but it may not bypass
provider, evidence, quality, risk or eligibility gates.
```

The graph is directional policy, not proof that every edge has a production-ready implementation.

## Current architecture inventory

### Contracts and registry
- `src/contracts/analysisComponentRegistry.ts`
- `src/contracts/analysisComponentRegistryValidator.ts`
- `src/contracts/canonicalContracts.ts`
- `src/contracts/common.ts`
- `src/contracts/pipeline.ts`

### Provider and market ingress
- `src/services/providerAdapters.ts`
- `src/config/providers/providerRegistry.ts`
- `server/market.mjs`
- `server/infrastructure.mjs`
- `shared/market-contracts.mjs`

### Scoring, evidence and feature boundaries
- `src/services/scoringEngine.ts`
- `src/services/evidenceEngine.ts`
- `src/services/featureStore.ts`
- `src/services/marketDataStore.ts`

### Pipeline composition
- `src/services/pipelineConfigurator.ts`
- `src/services/pipelineStorage.ts`
- `src/components/PipelineBuilder.tsx`

## Files modified by this closeout slice

- `src/config/analysisComponentFlags.ts` — new fail-closed per-component opt-in parser/runtime gate.
- `src/contracts/__tests__/analysisFoundation.test.ts` — feature-flag quarantine regression tests.
- `docs/architecture/ANALYSIS-FOUNDATION.md` — stale registry counts corrected.
- this report.

## Files intentionally not touched

The closeout does not modify:
- routing or visual identity;
- market-card layout or mobile responsiveness;
- brand/logo/license assets;
- legal pages;
- authentication/ZITADEL;
- Render/NATS/Valkey provisioning;
- database schema or migrations;
- live provider credentials;
- existing real quote/evidence payloads.

## Architecture gaps that still block activation

1. **Registry references:** unresolved input/output contracts remain explicit blockers; descriptive names are not fabricated schemas.
2. **Feature implementations:** the production feature store has no complete live formula set for the 50 components.
3. **Asset taxonomy:** the common taxonomy is narrower than the product target taxonomy. ETF, options, futures, bonds/indices mapping must be normalized before activation where applicable.
4. **Provider rights/capabilities:** live quote evidence does not prove redistribution/scoring rights for all required datasets.
5. **Coverage:** news, social, fundamentals, options, L2/order flow, macro and on-chain datasets remain incomplete or unavailable.
6. **Evidence/admission:** durable quote evidence exists, but each scorer still needs versioned input evidence, formula evidence and replay/admission validation.
7. **Progressive rollout:** per-component feature flags are now explicit and fail closed; flags cannot override registry or evidence gates.
8. **Historical documentation drift:** older architecture snapshots contain superseded counts/infrastructure statements and must be read as dated evidence only.

## Progressive enablement contract

The runtime opt-in variable is:

`CAPITAL_ANALYSIS_COMPONENTS_ENABLED`

Its value is a comma-separated list of exact canonical component IDs. Default is empty. Wildcards and unknown IDs are rejected by the parser. A listed component is only **flag-enabled**; it is not runtime-eligible unless the canonical registry admission checks also pass.

Therefore this is deliberately impossible:

```text
feature flag = enabled
        +
status = planned / unresolved contracts / unavailable provenance
        =
runtimeEligible = false
```

## 5-step validation model for subsequent activation slices

1. **Identity:** exact component ID, asset identity, provider and contract versions resolve.
2. **Data:** required facts/features are real, fresh, rights-compatible and quality-gated.
3. **Calculation:** deterministic formula/version, weights, reason codes and risk vetoes are reproducible.
4. **Evidence:** immutable/replayable input + output evidence survives restart/restore tests.
5. **Admission:** registry status, feature flag, confidence/eligibility and UI explainability gates all pass before ranking or alerting.

## Next implementation order

1. Resolve canonical asset taxonomy and contract references without inventing DTOs.
2. Select a small first activation cohort (integrity/data-quality/liquidity before opportunity scorers).
3. Implement real feature formulas and dataset-specific freshness policies for that cohort.
4. Bind scorer evidence to durable replay and validate restart/restore.
5. Only then move a component through shadow -> active and expose an actionable result.
