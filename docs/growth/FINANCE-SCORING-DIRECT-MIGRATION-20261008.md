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
