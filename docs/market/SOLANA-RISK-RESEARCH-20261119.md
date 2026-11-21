# Solana Risk Research Slice · 2026-11-19

Contract: `CAPITAL_AI_SOLANA_RISK_RESEARCH@1` · Domain: MARKET

## Scope
- New synthetic-only research input schema: `src/contracts/solanaRiskResearch.ts`.
- Deterministic creator first-slot and remaining-supply concentration checks.
- Mint/freeze authority and historical-incident research flags; unknown authority/history is BLOCKED.
- Independent hypothetical constant-product marginal spot-price stress `1 - 1/(1 + q/R)^2`.
- Canonical entrypoint `ScoringEngineService.inspectSolanaRiskResearch`.
- Positive and negative tests wired into existing `npm test`.

## Scientific boundaries
- The formula is **not** average execution price, actual realized slippage, or a price prediction.
- Creator history and ownership are caller assertions in a synthetic fixture, not on-chain verification.
- No inferred common ownership, scanner/stream, trading recommendations, live RPC calls, new providers, credentials, alerts, persistence, production scores, or transaction signing.
- Outputs are always `synthetic: true` and `scoreEligible/rankEligible/alertEligible/decisionEligible/productionEligible: false`.
- No code, branding, or internal logic copied from QuantumOrb. Independent general financial math only.

## Verification plan
- `node --import tsx --test src/contracts/__tests__/solanaRiskResearch.test.ts`
- `npm run lint`
- `npm test`
- Existing PR checks: Docker Security Gate, Domain Governance, applicable security checks.
- Record actual run IDs, conclusions, and exit codes before merge. A commit or PR does not prove test success.

## Rollback
- Revert this feature PR. No database migrations, runtime flags, secrets, providers, paid services, or deployment configuration are changed.

## Current evidence
- Source changes committed on `capital-ai-market/solana-risk-research-20261119`.
- Test execution, workflow job conclusions, main merge and live effect: **NOT_PROVEN** until checked in GitHub Actions.
