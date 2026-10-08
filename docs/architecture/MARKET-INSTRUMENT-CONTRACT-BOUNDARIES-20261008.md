# MARKET instrument and execution boundaries — 2026-10-08

## Baseline and scope

Reviewed main `e94d47cddde8ae32da749d08bc161daad323b914` includes merged PR #298. Its synchronization task is complete. This additive MARKET follow-up does not replace existing routes, branding, the six-class scoring taxonomy, or production provider adapters. No migration, provider call, production activation, deployment or NATS redeployment was performed.

The existing nine-class product mapping, 50-component registry, scoring service, shadow runner, Finance research receipts, rights gates and explainability UI were inspected before changes. An additive instrument contract was selected over expanding the production engine enum: this preserves existing routing and prevents unsupported product classes from silently receiving stock scores.

## Implemented

- `InstrumentMasterSchema`: strict tagged contracts for stocks, ETFs, indices, crypto, forex, commodities, futures, options and bonds. Derivatives require underlying, expiry, multiplier and settlement; options add strike/type/exercise style; bonds add maturity, coupon and face value. Metadata retains provenance. ISIN validation checks format only. Currency validation checks format, not an external currency registry. Structural validity grants neither identity verification nor provider rights. ETF/index/futures/options engine mapping remains unavailable.
- `ScoreResultSchema`: required semver `modelVersion`, bounded finite scores and declared ranges, and explicit `null` for unavailable states. Old results without modelVersion are rejected; versions are never fabricated. There are no current repository producers of this DTO to migrate. ComponentExecutionResult and FinalRankResult remain separate contracts.
- Future timestamps are rejected without the previous 3-second publication tolerance by scoring, plausibility checks, the receipt orchestrator and receipt service. Checks also reject inconsistent provenance ordering/latency. Replay uses its fixed snapshot evaluation time; this change does not claim clock synchronization telemetry.
- The shadow runner accepts a copied, code-owned map of known feature implementation IDs and versions, validates snapshots, and rejects version/time mismatches. Snapshot payloads and feature flags cannot supply implementation identity. This is resolution infrastructure, not completed feature implementations or admission of planned components. No live runner or calibrated feature was registered.
- The two changed target-authority blob hashes were explicitly rebound in the Finance source-target manifest; pinned external source hashes and admission checks were retained.

## Validation

PASS: `npm test`, `npm run test:market`, `npm run test:security`, `npm run lint`, `npm run build`; standalone receipt service tests (10) and receipt orchestrator tests (3). Five additional contract/runner boundary tests run inside npm test. All inputs are synthetic test fixtures, not observed feeds. `git diff --check` passes.

The first full test run correctly rejected target-authority hash drift. It passed after correlating only the two reviewed authority files. This was not a disabled check.

## Remaining evidence and launch blockers

| Severity | Finding | Required evidence |
|---|---|---|
| WARNING | Nine-class instrument schemas are additive and not yet connected to provider normalization/UI | Real source-specific identity mapping and integration tests |
| BLOCKER | 50 registry entries remain 45 planned / 5 blocked; no active/shadow canonical scorer | Actual typed inputs/outputs, feature implementations and runners |
| BLOCKER | Production provider entitlements and real feed coverage are unproven | Dataset/scope/delay/retention/redistribution evidence and observed coverage; BYOK results remain private |
| BLOCKER | Calibration and production confidence/risk policy are incomplete | Versioned datasets, calibration metrics, class/horizon/regime policies and negative tests |
| BLOCKER | Durable score snapshots and deterministic historic score replay are incomplete | Authorized persistence, tenant isolation, input/config hashes, replay equality and restart tests |
| BLOCKER | Admin configuration history is not a durable audit trail | Authenticated/versioned persistent changes, approval and concurrency tests |
| BLOCKER | Complete PRODUCT/TRUST/PLATFORM acceptance is outstanding | Real browser accessibility/mobile tests, full E2E chain, public HTTP identity and measured latency |

Existing private batch coverage documentation proves bounded request design only: Kraken has a 50-USD-pair ticker batch; Massive bounds stock/index/forex requests, while commodity coverage consists of futures contracts rather than 50 distinct commodities. These are not observed licensed live-feed coverage. Existing ECB admission metadata concerns reference rates with outstanding obligations, not verified realtime scoring. Finance research receipts do not prove durable score-input persistence or replay.

Demo launch still requires visible demo provenance and the relevant UI/E2E acceptance. Delayed-data launch additionally requires measured delay and actual entitlement evidence. Verified-live launch remains BLOCKED until the findings above are resolved. No production readiness claim is made.

## Changed-file inventory and rollback

New: this report; `src/contracts/assetMasterInstrument.ts`; `src/contracts/__tests__/marketContractBoundaries.test.ts`.

Modified: `src/contracts/canonicalContracts.ts`, `src/contracts/dataPlausibilityValidator.ts`, `src/contracts/__tests__/analysisFoundation.test.ts`, `src/services/componentRunner.ts`, `src/services/scoringEngine.ts`, `src/services/financeResearchReceiptOrchestrator.ts`, its test, `server/finance-research-evidence.mjs`, its test, and `CAPITAL-AI-GROWTH/finance-social-market-source-target-manifest.json`.

Preserved: production activation flags, rights policy, credentials, provider integrations, database schema, routes and visual design. Rollback is a normal revert of this follow-up commit, including the two authority hashes. There is no data migration to undo. A reverted timestamp tolerance would restore the previous weaker boundary and should be assessed explicitly.
