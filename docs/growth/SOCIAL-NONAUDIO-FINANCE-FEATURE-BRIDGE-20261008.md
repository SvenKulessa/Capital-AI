# Social Non-Audio + Finance Feature Bridge — 2026-10-08

Primary GROWTH; related MARKET / PLATFORM / TRUST. Source verified against Capital-AI main f961753013a46a9860d64090799d9ca070dbdf2e, Finance dcef421fe6e350a3a2ade61d0299aad9ecca213c. Root AGENTS.md is the only repository-wide engineering policy.

## Implemented (development scope)

- Social: deterministic, schema-validated TEXT/IMAGE editorial review plan. Exact campaign/content/source SHA and asset byte SHA are preserved; immutable approval is looked up through the existing Content Social Package authority.
- Social: proposed UTC-offset schedule is a review field only. No job reservation, webhook, token exchange, upload, posting, Cron job, replay or public provider claims. All provider runtime states remain INTEGRATION_PENDING. A user-provided approval cannot set a provider to READY.
- Qwen/Chatterbox AUDIO and VIDEO paths are skipped. Their historical HOLD and evidence remain untouched.
- MARKET: pinned Finance validated-feature semantics are mapped one-to-one into the existing Capital-AI FeatureValue contract, conditional on exact raw evidence reference, provider identity, rights, source feed, quality, timestamp and freshness checks.
- Finance: never scores, ranks, publishes, trades or selects a second dispatcher. All outputs have scoreEligible/rankEligible/decisionEligible/productionEligible=false. Only the current ScoringEngineService may compute shadow results.
- Tests are added to the existing npm test chain.

## Runtime not claimed

The existing Social Engine Completion Gate is BLOCKED. Its older all-media inventory must not be reinterpreted as complete because a safe text/image review projection exists. Existing provider bridge (PR #269) is a fail-closed preparation, not autonomous publishing. Finance model/weight promotion remains deferred until real Social cutover evidence, admitted market source rights, replay and canonical scorer integration. No production deployment, database migration, token transfer, API/AI cost activation, provider authorization or main merge is requested by this PR.

Costs: no new paid dependency, external API calls, tokens or GPU workload in this slice; GitHub Actions still consumes its normal CI allowance (quota/price NOT_PROVEN).

## Next implementation slices

1. SocialMediaEngine editing and deterministic media renderer wiring for text/image, provider-private asset store and real idempotent delivery readback tests, plus a controlled approved end-to-end pilot.
2. Narrow Social completion check to the owner-selected non-audio product scope only through a separately validated contract change. Never mark old all-media gate PASS while it still requires audio.
3. Finance validated input replay fixtures, feature-model binding comparison, weight profile convergence into existing ScoringEngineService, rights and asset-class regression, then production-readiness decision based on evidence.

No owner action is required for the development PR. The eventual PR merge is owner-only.
