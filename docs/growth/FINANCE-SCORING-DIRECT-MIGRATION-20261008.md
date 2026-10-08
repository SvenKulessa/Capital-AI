# Finance Scoring models, weights and data concepts — direct source port

**Source:** \`SvenKulessa/Finance@dcef421fe6e350a3a2ade61d0299aad9ecca213c\`
**Target:** \`SvenKulessa/Capital-AI\`, baseline \`main@6f2b0be57ccf472d609bbf078d0fd8236690ea4e\`
**Ownership:** GROWTH implementation coordination, MARKET scoring semantics, TRUST rights/evidence, PLATFORM runtime.

## Implemented code

The \`src/platform/FinanceScoringResearch/\` tree contains the following source-matched Finance code, including original factor and version semantics:

- Source-exact Crypto meme + DeFi model contracts and deterministic research scorers, including weight and effective-feature fingerprints.
- Four Commodity category feature/data contracts, directional unit/correlation/freshness checks, hypothesis weights and non-executable DQ evaluation.
- Crypto orchestrator research evaluators for sentiment, momentum, market regime, pattern confluence, fusion and kill-switch telemetry.
- Finance real market signal primitives, integrity gate, source commodity benchmark and sovereign yield scoring calculations, with narrow identity/evidence DTOs and no inherited network/provider connectors.
- The ten source registry descriptors exposed as a **read-only source catalogue** instead of installing the Finance dispatcher alongside the existing Capital-AI ScoringEngineService.
- Original Finance stock, FX, commodity and sovereign factor weights with replayable missing-factor renormalization and source lineage; results are **research-only** at this boundary.

The existing \`src/contracts/financeResearchFeatureBridge.ts\` continues to gate accepted observations using Capital-AI \`FeatureValue\`, \`PipelineSnapshot\` and \`MarketDataRights\`. Research modules do not create or modify scores, ranks, alerts, orders or public feeds. They do not authorize any Finance source model for Capital-AI production. No credentials/data history are copied.

## Important non-completion evidence

This is direct source-code migration of specified model/feature/evaluation components, **not full service cutover**. Not yet ported as live Capital-AI executions: all Finance provider ingestion/data concepts, validated financial feature source DTOs, broader analysis connection registry, complete commodity historical backtesting/promotions, production benchmark/crypto/traditional scoring adapter wiring, UI or API routes. Original Finance **source** sourceScoreEligible=true for four champions is not Capital-AI target approval.

The old Social Engine completion document still reports its **all-media historical** gate as BLOCKED; this does not override root AGENTS.md. User's explicit direct MARKET development request allows engineering work while model promotion still requires actual provider rights, traceability, replay accuracy and runnable tests. Qwen/Chatterbox remain HOLD.

## No cost activation

No paid service, external provider fetch, secrets, GPU worker or model download. GitHub Actions consumes normal CI minutes (quota NOT_PROVEN). No merge or deploy.

## Remaining integration

1. Bind target canonical scorer to eligible Finance factor models through a single dispatch surface. Migrate remaining DATA source schema, strict point-in-time vintage semantics, market rights and external provider readback.
2. Port source-wide backtest and model promotion comparisons with historical Finance fixtures; verify numerical equality, missing-feature behavior and effective fingerprints.
3. Add confidence/calibration, asset-class/venue mapping and negative security/entitlement tests. Activate individual models only after evidence, no blanket champion promotion.
4. Keep social/publishing entirely separate and Qwen/Chatterbox on hold.

## Canonical scorer integration (same branch)

`src/services/scoringEngine.ts#ScoringEngineService.inspectFinanceSourceForShadow` now validates Finance feature candidates with the merged Finance evidence bridge and invokes only the existing `computeShadowScore` when every input is mappable. Duplicate canonical feature/provider keys are blocked, and returned projections are strictly non-production, non-ranking and non-decision. Tests include missing rights and cross-asset source mutations.

Imported original Finance `AnalysisConnectionRegistry`, `CommodityBacktestingContracts`, `CommodityModelValidation`, `CommodityHistoricalBacktestEngine` and `CommodityHistoricalVintage` provide the source semantics for capability inventory, walk-forward/OOS backtests and revision/vintage evidence. There is still no automatic provider fetch or model promotion.

## Additional Finance evidence surfaces

Exact source-matched crypto source modules now cover contract-code identity/audits/formal proof, oracle source/fallback health, exploit lifecycle, meme/DeFi hard-gate projections, and source-attested market sentiment. The code is isolated under `FinanceScoringResearch/`, so source `PASS` applies only to the supplied evidence snapshot; it does not grant Capital-AI production-model, provider, trade, or public score authority. Source files are pinned below.

- `CryptoContractAssuranceEvidence.ts` Finance git-blob `788c8c3b12c789cd9d4d6400626bb74781fe22a3`
- `CryptoOracleEvidence.ts` Finance git-blob `da7cdab65530a960b5fdeeabe5b366a4a16e4009`
- `CryptoExploitIncidentEvidence.ts` Finance git-blob `98dbe74fbc10e583492a8eec095b6ba8eed75583`
- `CryptoResearchGateEvidence.ts` Finance git-blob `e10b9695908ecc17db355bc4f4ec5defe1b5d1b1`
- `SentimentEvidenceProjection.ts` Finance git-blob `c926c3f3ed0e76f3a79f4f569761437877e7a9b8`
- `CryptoContractAssuranceHardGateProjection.ts` Finance git-blob `4cd1c93b2d646bad2849bfdec1905f629162c296`
- `CryptoOracleHardGateProjection.ts` Finance git-blob `24c5b99867d75941bc70f8f0c3df981049b7a296`
- `CryptoExploitHardGateProjection.ts` Finance git-blob `0a4ca40a8724c1525accb8d050a8f1e8a9f7605f`

## Commodity promotion and P2 evidence (further migration)

Finance source-matched `CommodityModelPromotion` and `CommodityP2EvidencePipeline` now provide immutable model descriptors, historical OOS/correlation/weight stability, provider-resilience/stress scenario evaluation, explicit human decision evidence and computed review-package checks. Their source-only Finance registry query has been redirected to `FINANCE_SOURCE_MODEL_CATALOG`, not a live Capital-AI dispatcher. `assessCommodityOwnerPromotionDecision` only assesses supplied evidence: it does **not** approve a model, mutate a registry or grant production authority. `SentimentNewsFeatureEvidenceAdapter` computes only reproducible news novelty and mention saturation; no invented polarity, news feeds, or rights admission. New negative tests preserve non-mutating boundaries.

## Rights-bound source factor composition

The new `FinanceAdmittedFactorMapping.ts` and `ScoringEngineService.inspectFinanceResearchFactors` map admitted Finance observations to original Finance model weights. They enforce exact factor/source bindings, asset-class target taxonomy, special sovereign benchmark subclass, provider permissions, vintage/freshness, evidence/source pin and missing-factor fingerprint replay. Outputs are RESEARCH_FACTORS_EVALUATED/RESEARCH_PARTIAL or BLOCKED, **never** publishable score/portfolio/alert/order authority. `index` is deliberately blocked because Capital-AI currently has no equivalent canonical index asset class. The test suite now includes positive rights-admitted factor weight replay and rights/asset-class/unknown-factor/duplicate negative cases.

## Finance UAI and SLA data concepts

Finance source Universal Asset Interface identity shape and the exact `UniverseSla` evaluator are now local to the FinanceResearch source module (not a second target asset registry). No missing instruments are invented: underfilled categories remain `INSUFFICIENT_REAL_UNIVERSE`, and provider/evidence problems are signaled. Original Finance 24-real-asset top-level/category targets remain informational (`hardMinimum:false`). Capital-AI target classes use a different taxonomy, so production identity mapping still requires explicit correlation.


## Finance FIN-12 validated DATA → Capital-AI source-to-target bridge

New \`FinanceValidatedDataHandoff.ts\` adapts source \`validated-data-input/1.0.0\` and Finance \`ValidatedFinancialFeatureContract\` **semantics** (not the legacy provider gateway): source PASS/PARTIAL, complete correlation/asset/provenance, strict one-to-one source fields, explicit normalized 0–100 values with separate normalizer evidence, exact timestamp lineage, and the current \`inspectFinanceFeatureMapping\` rights/quality checks. \`ScoringEngineService.inspectValidatedFinanceResearchFactors\` routes these accepted candidates through Capital-AI admitted factors only. A source PASS does not imply a score or model promotion.

New \`FinancePointInTimeAdmission.ts\` composes Finance's immutable archived-vintage policy with Capital-AI rights for a specific provider/feed/venue, plus historical decision-time availability and analysis-time retrieval constraints. Older observation timestamps do **not** establish historical release availability; currently fetched history and missing release/revision evidence are blocked. PIT source declarations and fingerprints require independent archival authenticity checks before production model-promotion use. No data acquisition, provider billing, cache write or migration of provider keys.

\`financeValidatedHandoff.test.ts\` exercises provenance/normalization/rights/staleness/factor weights and PIT lookahead/current-history/license denial. The new work is research only and does not alter the live score dispatcher, UI, rank/alert or trading contract.


## Source UAI → CAPITAL-AI AssetIdentity/model resolution

\`FinanceSourceAssetModelResolution.ts\` resolves Finance's ten metadata-only descriptors by **explicit source asset identity and model version**, rather than importing its ScoringDispatcher. The target's own \`AssetIdentity\`, declared raw input identity reference and asset-class/subclass/venue are preserved. Source \`stock\` maps to \`equity_us/equity_eu\`, \`commodity\` to \`commodities\`, \`bond\` only to supported sovereign-benchmark fixed income, \`crypto\` and \`forex\` to like-named target classes. Finance \`index\` and agricultural subtypes remain **BLOCKED** where no governed target taxonomy exists; no index-as-stock or sovereign-as-credit fallback. DeFi/Meme/commodity challengers require their declared subtype or instrument kind. Positive identity matching only returns \`IDENTITY_MAPPED\` and does NOT admit provider data or allow a score. The SHA-256 identity fingerprint binds the immutable Finance source, model, venue, and target identity evidence; permissions are separately checked by existing target authority.
