# CAP-BP-001 — Market Integrity Gate | Technical Blueprint v1.0.0

PRODUCT scope. Authority: root AGENTS.md / SOLO_MAINTAINER_FLOW@2. Baseline: main@c89deed279b3e58452be5c7606eeed5f94a90539.

## Identity and scope

- Canonical identity: market_integrity_gate in src/contracts/analysisComponentRegistry.ts; lifecycle blocked, provenance unavailable; calculationVersion read from registry (1.2.0 on baseline).
- Blueprint ID CAP-BP-001 and blueprintVersion 1.0.0 are independent of calculationVersion.
- Versioned contracts in src/contracts/capBp001Blueprint.ts: CAP_BP_001_BLUEPRINT@1, CAP_BP_001_INPUT@1, CAP_BP_001_RESULT@1.
- Strict schema defines the 14 mandatory ordered modules of SCREENER-COMPONENT-BLUEPRINT-PRODUCT-CONTRACT-V1.md; every module is CONCEPT with runtimeEvidence NOT_PROVEN.
- Canonical conceptual inputs: RawTickStreamContract, ExchangeStatusContract. Conceptual output: IntegrityStatusContract. Those names remain unresolved in the production registry; the local synthetic DTOs do not promote them to registered live schemas.

## Fourteen module contract

| # | Module | Verification target |
|---|---|---|
| 01 | Component identity | Registry binding, independent blueprint version, blocked lifecycle |
| 02 | Business purpose | Market integrity control, no alpha or trading claim |
| 03 | Data contracts | Input/output concepts, strict synthetic schemas |
| 04 | Data pipeline | Rights, identity, normalization, timestamp gate |
| 05 | Feature engineering | Spread, sequence continuity, jitter |
| 06 | Indicators and analytical tools | Formula and explicitly proposed demo tolerance |
| 07 | Scoring model | No numeric live score or eligible rank |
| 08 | Weighting and normalization | Gate semantics, no invented cross-family weighting |
| 09 | Confidence and quality | Registry minimum 0.95; synthetic confidence fixed to zero |
| 10 | Risk and gates | Crossed book, gaps, stale/future data, halted market |
| 11 | Evidence and explainability | Deterministic reason codes, no fabricated proofs |
| 12 | UI integration | Demo-only preview contract, no live path |
| 13 | API contract | Pure in-process schema, no endpoint or tenant key |
| 14 | Acceptance criteria | Negatives, deterministic replay, existing CI and rulesets |

## Proposed synthetic demonstration

- Deterministic input uses explicit evaluation time, exchange state, bounded quote samples and a fixture interval. No external API or provider credentials.
- Demo-only spread formula: 20000 * (ask - bid) / (ask + bid) basis points. The proposed 250 ms jitter tolerance is uncalibrated, illustrative and not an exchange SLA.
- Registry-derived limits are 5-second maximum snapshot age and minimum 0.95 data sufficiency. Two required observations are only a synthetic completeness measure, not measured market coverage.
- Failure cases: malformed input, attempted live mode, wrong rights, unknown extra keys, nonfinite price, crossed bid/ask, duplicate/missing sequence, nonmonotonic/future/stale timestamps, jitter, halted or unknown exchange status.
- All results are either DEMO_ONLY or BLOCKED. Score/rank null, confidence zero, productionEligible/rankEligible/decisionEligible/publishable false. Synthetic replay does not prove production reliability.
- Evidence explicitly reports sandbox_demo rights, sourceSha null, lastValidatedAt null, productionEvidence false and replayScope OFFLINE_ONLY.

## Test and evidence contract

| Check | Command or origin | Status at authoring |
|---|---|---|
| Positive and negative contract fixtures | node --import tsx --test src/contracts/__tests__/capBp001Blueprint.test.ts | NOT_PROVEN until CI |
| Existing analysis regression suite | node --import tsx --test src/contracts/__tests__/analysisFoundation.test.ts | NOT_PROVEN until CI |
| TypeScript/front-end boundaries | npm run lint | NOT_PROVEN until CI |
| Full existing suite | npm test | NOT_PROVEN until CI |
| Required Docker Security Gate | GitHub PR workflow | NOT_PROVEN until CI |
| Required Domain Governance | GitHub PR workflow | NOT_PROVEN until CI |
| Provider rights, live quote coverage, licensed re-distribution | Independent admission | BLOCKED |
| Customer purchase, private delivery, tenant entitlements | BLUEPRINT_DELIVERY_POLICY.currentCommerceAdmission=false | BLOCKED |

## Risk/rollback

Do not register this demo as a ComponentRunner or enable any component lifecycle, provider, Stripe SKU, database migration, credentials or paid delivery. Never treat local test success as real data, signed source provenance or production eligibility. Rollback is a revert of the isolated PRODUCT PR; the registry, scorer and delivery policy are unchanged.

Record final PR head SHA, CI run IDs, actual job conclusions and post-merge verification separately after they exist.
