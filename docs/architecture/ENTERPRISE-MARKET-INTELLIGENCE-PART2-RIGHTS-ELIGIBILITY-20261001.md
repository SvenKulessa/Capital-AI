# MARKET Part 2 — Rights Eligibility Activation Slice

Baseline: `main@1bf5a0f57e7ec1d5e6b76231cad44207bddc1251`.

## Regulatory / rights-document correlation

The current documentation does **not** support a blanket relaxation of market-data rights gates. `LICENSE-REVIEW.md`, `LICENSE-RIGHTS.md`, `ACCOUNT-PROFILE-LICENSE-FOLLOWUP.md`, the Part-1 closeout and root `AGENTS.md` consistently require provider-, feed- and use-case-specific evidence.

The machine-readable `license-rights-review.json` is extensive, but its current provider entries remain `CONTRACT_SCOPE_UNVERIFIED`: contract/entity/region/tier/feed scope and permissions for display, redistribution, derived scoring, retention and resale are null. Primary-source research excerpts are explicitly not an executed-contract substitute.

## Research re-evaluation (DE/EU)

The scientific-research background is legally relevant and must be represented separately from ordinary commercial provider licensing.

German `§ 60d UrhG` / Article 3 DSM Directive can permit reproductions/extractions for scientific text-and-data mining where the actor qualifies and has lawful access. Contract terms conflicting with this specific statutory research exception can be unenforceable under `§ 60g UrhG` / Article 7 DSM Directive. The database-right limitation in `§ 87c UrhG` also expressly includes scientific TDM.

This does **not** create a universal API entitlement. The research path requires evidence of:
- the applicable DE/EU legal basis;
- actor qualification (qualified research organisation or eligible non-commercial individual researcher);
- lawful access to the actual dataset/API;
- a scientific TDM purpose;
- the remaining statutory eligibility requirements;
- respect for access controls, rate limits and network/database integrity measures;
- a scoped legal-review reference.

It also does not itself authorize public display, API redistribution, resale, production SaaS use or circumvention of technical access controls. Those remain separate use cases.

The repository currently documents research-oriented development, but does not yet contain evidence sufficient to conclude that CAPITAL-AI itself is a qualified research organisation under `§ 60d UrhG`. Therefore the existence of a research objective is not converted into a blanket `ALLOW`.

## Provider impact

- **Twelve Data:** current provider materials explicitly recognize academic research as a non-commercial use case on individual plans, while commercial display/redistribution and many exchange datasets require plan/add-on/approval rights. This supports a research-only corridor, not general production rights.
- **Kraken:** public endpoints are technically accessible, but Kraken states that prior permission is required for certain non-personal commercial uses of public market data. A research basis must therefore be classified by actor/purpose rather than inferred from endpoint publicity.
- **Binance:** public market-data APIs and data-only endpoints are documented, but service/IP permissions and regional terms still constrain use; research does not imply redistribution.
- **Polygon/Massive:** standard market-data terms are particularly restrictive for business/non-display/derived works. A statutory scientific-TDM analysis may be relevant to qualifying research, but cannot be treated as a contractual production/redistribution licence and cannot override third-party exchange entitlements by assumption.

## Part-2 decision

Part 2 now separates seven use cases:
- internal analysis
- scientific research TDM
- public display
- API redistribution
- derived scoring/research
- cache/retention
- export/resale

Permission or statutory eligibility for one use case never implies another. Missing scope/evidence yields `REVIEW_REQUIRED`; an explicit prohibition yields `BLOCK`. `ALLOW_WITH_OBLIGATIONS` preserves attribution or other obligations instead of discarding them.

Research-TDM is evaluated through a separate statutory-evidence object. It may be eligible without inventing a provider redistribution licence, but only after the statutory research prerequisites and lawful access are evidenced.

This is intentionally independent from global container `LICENSE_REDISTRIBUTION_REVIEW`: a MARKET dataset may be eligible for a specific research use while an unrelated image/OS redistribution gate remains open, and the inverse is also true.

## Legal status / precedent note

The Hanseatic Higher Regional Court (OLG Hamburg, 5 U 104/24, 10 December 2025) accepted applied research and dataset preparation as capable of falling within scientific research/TDM in the facts before it. The court allowed revision; this repository therefore treats the decision as persuasive current evidence, not as a final universal rule for all API/data uses.

## Next slice

Project the existing provider-rights inventory into this contract without inventing missing values. For each provider/dataset, distinguish a research-only path from commercial/product paths. Then bind the first activation cohort (Integrity/Data Quality/Liquidity) to the exact dataset/use-case evidence. No component becomes commercially active from this change alone.
