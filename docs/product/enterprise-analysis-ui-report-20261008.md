# Enterprise Analysis UI — Implementation and readiness

Audited main: `71fe8ba6a26925cce5d0b8bf629ccba8c37ad253`. Integrated current main: `12fc92e779500420025cef118dc180814f1a2720`.
Date: 2026-10-08. Primary domain: PRODUCT. No production activation or migration.

## Implemented surfaces

- Existing `/marketscreener` / `/screener`: overview remains scorer + table. URL tabs add scorer, terminal, 50-component explorer, sentiment and whale views. Existing module links, aliases and branding retained.
- `/marketscreener?tab=components`: 50 German component names, eight analysis families, nine-class filter, lifecycle/data filters, URL-shareable search and selection, dependencies, input/output contracts, refresh/weight/confidence/risk policies, reason catalogue and unresolved references. No empty-score card facade.
- Existing sentiment and whale landing/modal surfaces: visible unavailable state, data coverage/confidence requirements, all specified sentiment factors and flow columns, native methodology dialogs, fact/interpretation separation. No invented indices, transactions or institutional counterparties.
- Scorer: explicit unavailable result on missing public adapter; model/weights and explanation remain inspectable. No invalid USDT-as-ISO-currency preset. Private Kraken context remains separate.
- Explainability: bounded result contract and freshness checks; formula, weighted contribution bars, features/units/versions, provenance, provider-signal and inference groups, reasons, risk boundaries and evidence/replay limitations. Native dialog supplies focus containment, Escape and focus return.
- Screener: required score/confidence/regime/momentum/sentiment/catalyst/liquidity/risk/status/time columns. URL filters for all nine product classes, market, sector, score range, confidence, liquidity, regime, sentiment direction, risk and all six data states. Sorts include final score, change, momentum, sentiment velocity and catalyst. Original server ranks retained; unavailable assets never gain synthetic ranks. No preference persistence. Existing ECB/private quote modules retained separately.
- `/control-center/console`, legacy console query and `/studio?tab=console`: owner session check, ten console views, actual canonical shadow policy, provider metadata without template health numbers, dependency graph, static reference failures, session-only config version/hash/diff, selectable provider families/intervals/priority/fallback, scoped weights and component cohort. Explicit offline DEMO executes existing pipeline/runner diagnostics; readback and replay are functional. Browser-memory history is not durable production evidence.
- Existing Control Center components/system and Studio analytics show the reusable registry explorer.

## Rollout

`VITE_CAPITAL_ANALYSIS_UI_MODULES` accepts `components,sentiment,whales,console`. Omitted: all presentation modules; empty: hidden. Unknown/wildcard values never enable modules. The console still requires owner identity. Existing server `CAPITAL_ANALYSIS_COMPONENTS_ENABLED` activation gates are unchanged.

No new provider integration, secret handling, paid resource or browser preference store. Normal CI/hosting consume existing resources; live quotas/costs were not measured. No credentials or private provider results enter shared public data.

## Validation

PASS: targeted 161 tests (new UI projection/SSR, canonical foundation, taxonomy/research gates, shadow/replay, navigation and frontend security). Full `npm test`, TypeScript/frontend boundaries and production build passed during implementation; final repetitions are recorded in PR validation. Build retains acyclic chunk guard and 500 kB limit; initial oversize bundle fixed by lazy loading, not limit changes. New test suite is included in npm test.

WARNING: interactive browser screenshots, real focus interaction, mobile/desktop visual acceptance and WCAG audit are NOT_PROVEN in this environment. Playwright browser downloads returned invalid archives; the cloud browser cannot reach local preview (connection refused). SSR and responsive classes do not constitute visual acceptance.

Existing build warnings externalize node:crypto from Finance research modules. This UI uses existing WebCrypto-based shadow evidence, not the node-only model research functions. Provider-backed UI roundtrips and runtime loading require browser acceptance.

## Component states

### planned — 45

- `data_quality_scorer`
- `multi_timeframe_trend_regime_scorer`
- `relative_strength_scorer`
- `momentum_persistence_scorer`
- `breakout_quality_scorer`
- `mean_reversion_opportunity_scorer`
- `volume_confirmation_scorer`
- `volatility_regime_scorer`
- `support_resistance_proximity_scorer`
- `pattern_confidence_scorer`
- `vwap_location_scorer`
- `market_breadth_scorer`
- `sector_rotation_scorer`
- `correlation_diversification_scorer`
- `cross_asset_regime_scorer`
- `macro_surprise_scorer`
- `economic_calendar_risk_scorer`
- `entity_resolution_engine`
- `news_relevance_scorer`
- `financial_sentiment_scorer`
- `sentiment_velocity_scorer`
- `sentiment_dispersion_scorer`
- `news_novelty_scorer`
- `source_authority_scorer`
- `event_detection_classification_engine`
- `event_impact_scorer`
- `catalyst_strength_scorer`
- `market_reaction_validator`
- `narrative_emergence_scorer`
- `narrative_saturation_scorer`
- `social_attention_velocity_scorer`
- `social_engagement_quality_scorer`
- `bot_manipulation_risk_scorer`
- `fundamental_quality_scorer`
- `growth_acceleration_scorer`
- `valuation_peer_comparison_scorer`
- `earnings_revision_scorer`
- `earnings_surprise_guidance_scorer`
- `financial_distress_scorer`
- `insider_institutional_flow_scorer`
- `options_positioning_gamma_scorer`
- `open_interest_funding_regime_scorer`
- `orderflow_liquidity_imbalance_scorer`
- `onchain_flow_holder_behavior_scorer`
- `protocol_fundamentals_tokenomics_scorer`

### mock — 0

None.

### shadow — 0

None.

### active — 0

None.

### degraded — 0

None.

### blocked — 5

- `market_integrity_gate`
- `liquidity_eligibility_scorer`
- `spread_slippage_risk_scorer`
- `tradability_gate`
- `final_rank_confidence_evidence_scorer`

### retired — 0

None.

Three raw research diagnostics exist (integrity, data quality, liquidity); they remain separate from admitted normalized ComponentRunners. They are not promoted by this UI.

## Plausibility findings

| Severity | Finding | Evidence / smallest next step |
|---|---|---|
| PASS | All 50 registry entries represented; lifecycle totals equal 50 | Registry/SSR tests |
| PASS | Demo, stale, future, degraded, low-confidence or missing-evidence result cannot produce displayed final score/rank | Projection negative tests |
| PASS | Units, model/feature versions and provenance render separately | Explainability DTO/SSR tests |
| PASS | Missing components produce explicit blocked/null results | All-50 offline run and replay test |
| PASS | Configuration revisions are hashed, immutable and never production-approved | Config history tests |
| WARNING | Visual mobile/desktop and interactive accessibility acceptance missing | Run browser acceptance on reachable preview |
| WARNING | Browser session config/evidence history is volatile | Add authenticated durable backend before operational use |
| BLOCKER | 364 unresolved registry references | Machine inventory lists exact component/reference/code |
| BLOCKER | No admitted normalized runner cohort or provider-backed final-rank DTO endpoint | Implement and validate MARKET runners and evidence delivery |
| BLOCKER | Nine product classes exceed current canonical engine taxonomy | Complete exact ETF/index/future/option and bond mapping; no alias shortcuts |
| BLOCKER | No sentiment, on-chain, dark-pool or sub-45-ms runtime proof | Source rights/provenance + real telemetry, not metadata/template values |

## Unresolved provider dependencies

- `alphavantage`: 1 affected component references; status/details in JSON inventory.
- `binance`: 18 affected component references; status/details in JSON inventory.
- `coinbase`: 1 affected component references; status/details in JSON inventory.
- `financialmodelingprep`: 6 affected component references; status/details in JSON inventory.
- `fred`: 3 affected component references; status/details in JSON inventory.
- `gemini`: 11 affected component references; status/details in JSON inventory.
- `internal_consensus_engine`: 1 affected component references; status/details in JSON inventory.
- `internal_master_data`: 8 affected component references; status/details in JSON inventory.
- `kraken`: 7 affected component references; status/details in JSON inventory.
- `sec_edgar`: 5 affected component references; status/details in JSON inventory.
- `twelvedata`: 19 affected component references; status/details in JSON inventory.

## Launch checklist

| Mode | Required validation | Current status |
|---|---|---|
| Demo UI / offline diagnosis | Visible DEMO, zero publishability, no synthetic live values, deterministic session replay, browser/mobile acceptance | Logic PASS; visual acceptance pending |
| Delayed data | Auth/scope rights, canonical inputs, explicit delay and freshness, complete model/evidence, runner validation | BLOCKED; no source results exposed by this UI |
| Verified live | All provider/feature/runner/evidence blockers resolved; real health/latency; durable audit and tenant isolation; explicit server-side activation | BLOCKED |

Production readiness is not claimed. Merge is an Owner action under AGENTS.md; this work supplies a reviewable Draft PR.

## Created and modified files

- Modified: `.env.example`
- Added: `docs/product/enterprise-analysis-ui-audit-20261008.md`
- Modified: `package.json`
- Modified: `scripts/navigation.test.mjs`
- Modified: `src/app/routing/AppRoutes.tsx`
- Modified: `src/components/ControlCenterPage.tsx`
- Modified: `src/components/HubSidebarDrawer.tsx`
- Added: `src/features/analysis/AnalysisComponentExplorer.tsx`
- Added: `src/features/analysis/AnalysisShadowSession.ts`
- Added: `src/features/analysis/AnalysisUi.tsx`
- Added: `src/features/analysis/EnterpriseAnalysisHub.tsx`
- Added: `src/features/analysis/MarketIntelligencePanels.tsx`
- Added: `src/features/analysis/PipelineConfiguratorConsole.tsx`
- Added: `src/features/analysis/__tests__/analysisUi.test.tsx`
- Added: `src/features/analysis/analysisPresentation.ts`
- Added: `src/features/analysis/analysisUiFlags.ts`
- Added: `src/features/analysis/scorePresentation.ts`
- Added: `src/features/analysis/screenerProjection.ts`
- Added: `src/features/analysis/useAnalysisQuery.ts`
- Modified: `src/features/market/MarketSentiment.tsx`
- Modified: `src/features/screener/EnterpriseScorerDashboard.tsx`
- Modified: `src/features/screener/ScoreExplainabilityDrawer.tsx`
- Modified: `src/features/screener/ScreenerTable.tsx`
- Modified: `src/features/studio/StudioPage.tsx`
- Modified: `src/features/whale-radar/WhaleRadarModal.tsx`
- Modified: `src/features/whale-radar/WhaleRadarSection.tsx`
- Added: `docs/product/enterprise-analysis-ui-report-20261008.md`
- Added: `docs/product/enterprise-analysis-ui-inventory-20261008.json`

## Reversibility

Revert the PRODUCT commit or hide presentation modules with the UI rollout variable. No schema/data migration or broker deployment to undo. Existing API, trading, IAM, RLS, billing and provider authority remain unchanged.
