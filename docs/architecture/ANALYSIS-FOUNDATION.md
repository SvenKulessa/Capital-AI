# Analysis foundation: truthful registry and fail-closed admission

Repository: SvenKulessa/Capital-AI. Audit baseline: `ed594ef93f66ee8f13f67d75dde56f46a95b1cd6`.
Implementation base: `67860625ad0c19ab74aac6264a2f11f6355c1b3d` (includes merged license documentation).

## Resulting behavior

The existing registry contains exactly 50 components on the current baseline: 45 planned/unavailable,
0 mock/simulated, 5 blocked/unavailable. All `lastValidatedAt` values are null:
the prior date was not supported by component calculation evidence. No component
is promoted to active or live by this change.

`FeatureStoreService` returns no features for a real quote until dataset-backed
formulas exist. Its symbol/whitelist/constant fixtures run only with the explicit
`capital_ai_demo_engine` adapter and `sandbox_demo` provenance. Fixture quality is
zero; reproducibility is not evidence of measured data sufficiency. The event
baseline exists only as an explicitly simulated feature, never a live fallback.

`FinalRankResultSchema` remains the canonical result contract. Model 4.0.0 adds
resultStatus, dataAvailability and score/rank/alert eligibility. Scores and
subscores are nullable: missing required inputs, stale/malformed features,
asset mismatches, mixed provenance or hard vetoes produce no numeric score.
Callers must handle null; dashboard and drawer display unavailable. Demo values
may illustrate the formula, but confidence is zero and all eligibility flags are
false. Halted, delisted and unverified assets are blocked. High opportunity
features cannot hide a manipulation or spread veto.

No live scoring is admitted yet: the registry's required components are not
active and replayable evidence is not implemented. Rank remains null; single
asset scores no longer claim rank 1. No compliance stamp, SHA-256 proof or
replay token is invented for these results. Legacy EvidenceEngine is not invoked
by this score path and must be separately hardened before future admission.

The Control Center reads the existing canonical registry instead of maintaining
a second status catalogue. Screener fixtures are marked DEMO, with no measured
confidence or actionable rankings. The dashboard clears old results on new
requests, ignores late completions and binds displayed results to asset/mode.
Branding assets and routing are unchanged. Other legacy market/news/whale pages
still contain fixtures and are outside this bounded slice.

## Reference validation

`validateAnalysisComponentRegistry` checks shape/count/uniqueness, actual contract
names, existing provider IDs, implemented live feature IDs and asset taxonomy.
Aliases for Binance/Kraken/TwelveData resolve into the existing ProviderRegistry;
this helper is not another provider or ownership authority. Prototype keys cannot
resolve to providers. Unimplemented reference names are not replaced with empty
schemas or invented adapters.

Current diagnostics: 126 contract references (76 inputs, 50 outputs), 36 provider
references, 131 live feature references and 27 asset-scope references unresolved.
These are occurrence counts, not distinct names. `schemaValid:true` describes
registry shape only; `activationAllowed:false` is required and expected. Public
registration of metadata must never be interpreted as production activation.

The foundation uses a conservative 30-second input age bound. Before enabling
real fundamentals, macro or other delayed datasets, refresh policy must be
resolved per feature/dataset and asset class from the existing registry; an
arbitrary quote timestamp must not refresh a quarterly filing. The quote endpoint
and its provider licensing/capability limitations are unchanged. No database
connection or migration is introduced.

## Validation capsule (five steps)

1. Fresh main/PR scope and overlap correlation; implementation stays on a branch.
2. Registry schema/reference checks, including deliberately unresolved activation
   blockers and null validation metadata.
3. Twenty foundation regression cases: real quote isolation, explicit demo,
   missing event data, mixed provenance, halted/delisted/unverified assets, veto,
   timestamps, NaN, identity/license corruption and result admission invariants.
   Existing async suite assertions are awaited before reporting completion.
4. TypeScript, full existing npm suites and production Vite build; navigation,
   license evidence, Render-image preparation and market/HTTP security tests.
   Test entry uses `node --import tsx` to avoid tsx CLI's unnecessary IPC socket.
5. Exact published content/readback plus fresh main and overlap check before PR.

All tests use local inputs/mocked providers. No live provider validation, browser
or smartphone interaction, Docker/CVE scan, GHCR publication, migration or Render
deployment is claimed. The existing Vite bundle-size warning remains. No GitHub
workflow was dispatched for this slice.

## Recovery and next activation requirements

Failures produce explicit reason codes and non-actionable results. Recovery
requires real formula inputs, resolved schemas/providers/assets, measured quality,
validated registry state, persistent replayable evidence and a cross-sectional
ranking authority. Changing a UI flag or requesting `isDemo=false` cannot promote
a fixture to live intelligence. This is admission in existing services, not a
new autonomous deployment or self-healing authority.


## 2026-09-30 closeout note

The older implementation-base hashes above remain historical evidence. Current-main correlation is tracked in
`ENTERPRISE-MARKET-INTELLIGENCE-PART1-CLOSEOUT-20260930.md`.

Per-component rollout is now guarded by `CAPITAL_ANALYSIS_COMPONENTS_ENABLED` through
`src/config/analysisComponentFlags.ts`. The default is no enabled components; wildcard/unknown IDs do not
activate anything, and flag opt-in cannot override canonical registry, contract, feature, evidence or lifecycle gates.
