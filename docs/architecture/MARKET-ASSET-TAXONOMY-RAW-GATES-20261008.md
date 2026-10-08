# MARKET — Product Asset Taxonomy & Raw Research Safety Cohort

Baseline: `main@019143f65aad16a78760a03114f20d663dc321f9`, 2026-10-08.
Primary: MARKET; impacted PRODUCT (asset labels), TRUST (rights/DQ validation).
Governance: `AGENTS.md / SOLO_MAINTAINER_FLOW@1`.
**This slice is offline-only. It does not activate providers, any of the 50 components, public scores, ranking, alerting or trading.**

## Actual source gap

`src/contracts/common.ts` defines six current canonical engine classes:
`crypto`, `equity_us`, `equity_eu`, `commodities`, `forex`, `fixed_income`.

Nine product classes are required:
`stocks`, `etfs`, `indices`, `crypto`, `forex`, `commodities`, `futures`, `options`, `bonds`.

There is no safe one-to-one implicit mapping for ETFs, options, indices or futures; silently routing these to equities or commodities would destroy derivative/index-specific provenance, eligibility and risk semantics.

## Implementation

- `src/contracts/marketAssetTaxonomy.ts` adds a strict, versioned nine-class product input schema and explicit mapping. US/EU stock market region must be supplied. Bonds structurally map to `fixed_income`, but the identity is always `instrumentVerified=false`, `scoringEligible=false`, `rankingEligible=false` until separately sourced. The four unsupported target classes return null canonical identity with a reason code. Invalid currency, extra fields and non-active status fail closed.
- `src/services/marketResearchGateDiagnostics.ts` runs three deterministic raw **research diagnostics**, referencing the canonical IDs `market_integrity_gate`, `data_quality_scorer`, `liquidity_eligibility_scorer`. It checks exact asset/venue/symbol binding; `observedAt <= receivedAt <= publishedAt <= evaluatedAt`; measured latency; freshness; realtime semantics; delayed/demo quarantine; exact provider, dataset, venue, permission and rights review date. The integrity diagnostic requires valid L1 bid/ask, proven sequence continuity and jitter within policy; quality reports observed age, not calibrated confidence; liquidity requires turnover, 2% book depth and explicit external thresholds. Measurements are raw bps/ms/ratio, **not normalized 0–100 scores**, and can never become executable or publicly display-eligible.
- `src/contracts/__tests__/marketTaxonomyResearchGates.test.ts` exercises nine-class mapping, ambiguity, boundaries, observed metrics, deliberately synthetic test fixtures, negative rights, stale, future, demo, delayed, reference, crossed book, missing liquidity and bad numeric/schematic cases. Included in `analysisFoundation.test.ts`, already invoked by the existing `npm test` script.

## Exact lifecycle limits

The canonical 50-component registry remains 45 planned / 5 blocked; it is **not mutated**.
No raw diagnostic registers as `ComponentRunner` until its declared input/output contracts, live normalized feature dependencies, provider rights, historical calibration and immutable evidence are validated. All three outputs include `modelScore=null`, `evidenceId=null` and every actionable eligibility flag `false`.

Existing `RawFeatureCalculator`, `ScoringEngineService`, `ShadowPipelineService` and `CAPITAL_FACTS` are not replaced. No invented provider flow, score, wallet or latency observation is emitted.

## Costs and compliance

This PR adds no provider calls, new SaaS plan, secret, container, database migration, NATS subscription or paid API use. Normal GitHub Actions minutes for existing Required Checks apply; current billing/quota remain `NOT_PROVEN`. Real data usage and private BYOK/public licence scopes remain separate.

## Next verified unblockers

1. Source-backed first cohort: implement matching L1/sequence/jitter/depth contracts with exact rights, then bind real observed inputs to these diagnostics.
2. Implement the actual `ComponentRunner` formulas only after calibrated normalization and input coverage; shadow activation cannot be inferred from raw diagnostics.
3. Persist score/run evidence with model and weight version; verify hash/readback/restart/replay before making any UI score eligible.
4. Restore optional current GitHub verification: `npm test`, `npm run lint` and `npm run test:market`; Docker Security Gate already runs isolated `test:market` but does **not** imply the entire root test command passed.
5. PRODUCT should expose *only* the actual source status; default market cards, router, branding and control center are unchanged in this slice.

## Review and rollback

Changes are additive with a one-line test-suite import. Reverting the new source/test files and import restores the baseline without migrations, durable-data changes or production traffic shifts.
