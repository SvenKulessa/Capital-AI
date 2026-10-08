# Finance source/target reference parity — evidence baseline

Stand: 2026-10-08. Target main baseline: 019143f65aad16a78760a03114f20d663dc321f9.
Source: SvenKulessa/Finance@dcef421fe6e350a3a2ade61d0299aad9ecca213c.
Domains: MARKET source semantics; TRUST immutable evidence and licensing; GROWTH documentation.

## Source artifacts reviewed at immutable source commit

| Source file | Git blob SHA | Scope |
|---|---|---|
| tests/fixtures/scoringGoldenV1.ts | cda86ad11bb065813ec56d361e0fc7050dac85b2 | Explicitly synthetic 50-point stock / FX golden cases |
| tests/unit/scoringGoldenRegression.test.ts | d1d8de4883bcbdc58c58f7421edc8eca20ca4569 | Source tests for expected scores |
| src/services/traditionalAssetScoring.ts | 9813a102e15403f38b54f3edb89b66e7e77cdfdf | Factor weights and one-decimal source result |
| src/services/realMarketSignals.ts | 34536e6b6a54897ef14d968aec37ad4ca485f520 | Renormalization and missing-factor semantics |
| tests/unit/traditionalAssetScoring.test.ts | 8d1469a66097e1af3922515fce94f34c4a095f05 | Technical-only and empty-input source expectations |
| tests/unit/commodityHistoricalBacktestEngine.test.ts | 621d638d6ad4a175f8b67e38e4d7970da2c18cc7 | Synthetic historical 2025 observations |
| src/platform/Scoring/CommodityHistoricalBacktestEngine.ts | 913cd7c69791fbc5c1b3670ca24f7fdc46c73706 | Validation-only point-in-time walk-forward implementation |
| src/services/commodityHistoricalArchiveEvidence.ts | c574c9c14f2a0d5931176ddc6dfe15adcfe6d64f | Archive authenticity verifier; not an actual archive dataset |

## Actual new implementation

The existing financeModels.test.ts checks the immutable Finance source golden stock/FX inputs (source 0.5, normalized target 50) against the pinned expected score 50; checks missing fundamental renormalization at 100; and explicitly records the empty-input distinction (source numerical 0 with no used factors versus Capital-AI research null, NOT an observed zero). Source presentation rounds to one decimal, while target research composition remains unrounded.

These are source-referenced SYNTHETIC regression cases only. No production score, ranking, trading, model promotion, paid provider or API activation was introduced. Finance source golden fixtures expressly warn that they are not production financial observations.

## Historical empirical comparison: NOT_PROVEN

The exact Finance source Git tree was inventoried: no CSV, Parquet, JSONL or NDJSON market historical dataset was present. Reviewed golden fixtures and commodity walk-forward tests are synthetic. The existence of provider acquisition code, archive verifier code, and historical test timestamps is not evidence that real data bytes, point-in-time revisions, or source-generated historical outputs were captured and licensed.

To establish actual historical numeric parity in later work, obtain independently verifiable immutable provider archive bytes and original release/revision/availability lineage, the Finance original model outputs bound to the same timestamps and assets, its input/normalizer fingerprints, and applicable provider rights. Then use the existing ScoringEngineService research API and value-sensitive researchReplayFingerprint to compare row-by-row at the source result precision, separately reporting mismatches, missing-factor semantics, and proven PIT eligibility.

Do not silently reinterpret synthetic 2025 test dates or current API history as historical release evidence.

Status: SOURCE_GOLDEN_PARITY_REGRESSION_ADDED; EMPIRICAL_HISTORICAL_PARITY_NOT_PROVEN.
