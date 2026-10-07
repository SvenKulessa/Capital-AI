> **SUPERSEDED / NON-AUTHORIZING — 2026-10-07**
> Diese Datei bleibt als historische oder fachliche Dokumentation erhalten. Sie erzeugt keine zusätzlichen Repository-Gates, Admissions, Handoffs, Pflichtreviews oder Merge-/Deployment-Regeln. Autoritativ ist ausschließlich `AGENTS.md` mit `SOLO_MAINTAINER_FLOW@1`. Konkrete gesetzliche, regulatorische, Security- oder Provider-/Lizenzpflichten bleiben davon unberührt.

# LEGAL_POLICY — Product Extraction & GitHub Marketplace Track

Primary Domain: CAPITAL-AI-TRUST
Status: MARKETPLACE_VERTICAL_SLICE_WITH_EVIDENCE_HISTORY

## Product boundary

`LEGAL_POLICY` is reusable IP, separated from the CAPITAL-AI-specific DE/EU review profile.

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
        ↓
GitHub Check / Gate
```

The core lives in `packages/legal-policy-core/`; the isolated GitHub adapter lives in `apps/legal-policy-github-app/`.

## Implemented vertical slice

1. Deterministic fail-closed policy core.
2. Community SPDX policy profile.
3. GitHub App JWT, installation tokens, verified webhooks and Check Runs.
4. Dependency Review ingestion for PR deltas.
5. Async GitHub SBOM fallback using generate/fetch flow; temporary-download requests never carry the installation token.
6. Exact PR-head binding check: unbound repository SBOMs cannot produce an enforced `ALLOW`.
7. Optional `.legal-policy.json` usage/distribution classification.
8. Free/Pro/Team/Enterprise Marketplace entitlements.
9. Setup URL + GitHub OAuth bootstrap without OAuth-token persistence.
10. Team/Enterprise append-only Evidence History with canonical SHA-256 evidence hashes.
11. Explicit per-plan retention, authenticated expiry purge and uninstall deletion workflow.
12. Supabase/Postgres bootstrap with RLS and revoked public/authenticated table grants.

## Marketplace product tiers

| Tier | Capability |
|---|---|
| Free | Repository/SBOM classification + neutral check |
| Pro | Free + obligation report |
| Team | Pro + enforced PR gate + evidence history + audit-export entitlement |
| Enterprise | Team + policy profiles + API entitlement |

Actual prices and Marketplace plan IDs remain deployment/onboarding configuration.

## Remaining launch gates

1. Run repository Required Checks on the final correlated PR head.
2. Provision the isolated Evidence History database schema; do not apply `evidence-schema.sql` implicitly to CAPITAL-AI production.
3. Configure Team/Enterprise retention values and maintenance scheduler in the deployment environment.
4. Create/transfer the GitHub App to the intended verified publisher organization.
5. Complete GitHub Marketplace publisher/financial onboarding and create real plan IDs/prices.
6. Exercise purchase, trial, upgrade, downgrade, cancellation and uninstall flows against Marketplace test/stub facilities.
7. PLATFORM deployment/runtime/secret gates and TRUST privacy/security review.
8. Extend ingestion beyond GitHub dependency evidence to container/SBOM/lockfile/assets sources before claiming full multi-artifact coverage.

No successful test, scan or Marketplace entitlement silently converts `LEGAL_REVIEW_REQUIRED` or `BLOCKED` into `ALLOW`.
