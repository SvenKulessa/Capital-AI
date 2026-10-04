# LEGAL_POLICY — Product Extraction & GitHub Marketplace Track

Stand: 2026-10-01
Primary Domain: CAPITAL-AI-TRUST
Status: IMPLEMENTED_VERTICAL_SLICE / MARKETPLACE_BLOCKERS_OPEN

## Product boundary

`LEGAL_POLICY` is extracted as reusable IP instead of remaining a CAPITAL-AI-only rule set.

```text
Repository / Container
        ↓
SBOM + Lockfile + Assets
        ↓
License Classification
        ↓
Legal Evidence
        ↓
LEGAL_POLICY core + selected policy profile
        ↓
ALLOW | ALLOW_WITH_OBLIGATIONS | LEGAL_REVIEW_REQUIRED | BLOCKED
        ↓
Release / PR decision
```

The reusable engine lives in `packages/legal-policy-core/`. CAPITAL-AI's existing `docs/security/legal-policy-v1.json` remains a project-specific DE/EU profile and is not silently promoted from `REVIEW_DRAFT` to legal truth.

The GitHub adapter lives in `apps/legal-policy-github-app/` and is intentionally separate from the main CAPITAL-AI runtime/container so Marketplace development does not expand the production web image by default.

## Marketplace product tiers

| Tier | Purpose | Planned Marketplace model |
|---|---|---|
| Free | Repository/SBOM license classification + neutral PR check | FREE |
| Pro | Automated obligation report | FLAT_RATE |
| Team | Enforceable PR gate + evidence history + audit export | PER_UNIT/user |
| Enterprise | Custom policy profiles + audit export + API | FLAT_RATE |

Monthly and yearly billing are required for paid Marketplace plans. Prices and Marketplace plan IDs remain deployment configuration, not source-code constants.

## Current vertical slice

Implemented:

1. Dependency-free policy core with deterministic, fail-closed decisions.
2. Community baseline profile with explicit obligation templates for common SPDX families and review routing for GPL/LGPL/AGPL.
3. GitHub App JWT + installation-token handling using Node built-ins.
4. GitHub Dependency Review diff ingestion for PRs; unsupported/unavailable dependency evidence remains fail-closed.
5. Optional `.legal-policy.json` repository classification contract.
6. Check Run publication with neutral behavior on Free/Pro and enforceable behavior on Team/Enterprise.
7. GitHub Marketplace entitlement lookup using App JWT; Marketplace webhook accepted without treating cached webhook state as authoritative.
8. HMAC-SHA256 webhook verification.
9. Registration and pricing-plan blueprints.
10. Unit tests for core decisions, entitlement mapping, repository classification and webhook signature validation.
11. Marketplace billing events are separated from the GitHub App event subscription and may share the same verified webhook handler endpoint.
12. Marketplace Setup URL + GitHub user OAuth bootstrap with signed/expiring state and installation ownership verification; no OAuth token persistence in the vertical slice.

## Marketplace blockers / owner actions

Paid publication cannot happen while the app is owned by a personal GitHub account. Before paid launch:

1. Create or transfer the GitHub App to an organization intended to publish it.
2. Complete GitHub publisher verification for that organization (2FA/contact/domain requirements).
3. Reach the paid-app Marketplace eigilibility threshold applicable to GitHub Apps before paid publication.
4. Create the Marketplace listing and actual plan IDs; configure Free, Pro, Team and Enterprise monthly/yearly plans.
5. Complete financial onboarding.
6. Configure production webhook/setup/callback URLs, webhook secret, App private key/App ID, GitHub client ID/client secret and a dedicated session-state secret in the isolated service.
7. Exercise purchase, free-trial, upgrade, downgrade and cancellation flows against GitHub's Marketplace test/stub endpoints before submission.
8. Add durable evidence history for Team/Enterprise. Store evidence metadata/hashes rather than private source contents wherever possible.
9. Implement cancellation/private-data retention deletion workflow before paid trials are enabled.
10. Add GitHub asynchronous SBOM generation/fetch as the fallback when Dependency Review cannot provide PR evidence; do not base the product on the legacy synchronous SBOM export.
11. Put the GitHub App service through PLATFORM deployment gates and TRUST security/privacy review before production.

## Self-healing validation contract

A new automated rule or remediation becomes a stable policy behavior only after 3–5 positive validations:

1. Reproduce/classify the finding deterministically on fixed evidence.
2. Verify the proposed rule does not widen permissions or bypass a hard legal/security gate.
3. Validate against at least one positive and one negative fixture.
4. Correlate the generated decision/evidence to exact source SHA and policy version.
5. After repeated positive runs, promote the rule from experimental profile data to the versioned stable profile.

No ML/model output may silently convert `LEGAL_REVIEW_REQUIRED` or `BLOCKED` into `ALLOW`.

## Next extraction boundary

Do not move CAPITAL-AI's jurisdiction-specific policy into the product core. Instead create versioned profile packs (`community`, `capital-ai-de-eu`, later customer-owned profiles) with signed policy identity. The core should remain deterministic, testable and jurisdiction-agnostic.
