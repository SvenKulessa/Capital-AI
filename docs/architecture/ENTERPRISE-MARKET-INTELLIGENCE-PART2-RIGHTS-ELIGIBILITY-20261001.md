# MARKET Part 2 — Rights Eligibility Activation Slice

Baseline: `main@1bf5a0f57e7ec1d5e6b76231cad44207bddc1251`.

## Regulatory / rights-document correlation

The current documentation does **not** support a blanket relaxation of market-data rights gates. `LICENSE-REVIEW.md`, `LICENSE-RIGHTS.md`, `ACCOUNT-PROFILE-LICENSE-FOLLOWUP.md`, the Part-1 closeout and root `AGENTS.md` consistently require provider-, feed- and use-case-specific evidence.

The machine-readable `license-rights-review.json` is extensive, but its current provider entries remain `CONTRACT_SCOPE_UNVERIFIED`: contract/entity/region/tier/feed scope and permissions for display, redistribution, derived scoring, retention and resale are null. Primary-source research excerpts are explicitly not an executed-contract substitute.

## Part-2 decision

Part 2 starts by separating six use cases:
- internal analysis
- public display
- API redistribution
- derived scoring/research
- cache/retention
- export/resale

Permission for one use case never implies another. Missing scope/evidence yields `REVIEW_REQUIRED`; an explicit prohibition yields `BLOCK`. `ALLOW_WITH_OBLIGATIONS` preserves attribution or other obligations instead of discarding them.

This is intentionally independent from global container `LICENSE_REDISTRIBUTION_REVIEW`: a MARKET dataset may be eligible for a specific use while an unrelated image/OS redistribution gate remains open, and the inverse is also true.

## Next slice

Project the existing provider-rights inventory into this contract without inventing missing values, then bind component admission to the exact datasets/use cases required by the first activation cohort. No component becomes active from this change alone.
