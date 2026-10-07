# CADS GitHub Marketplace Production Readiness — 2026-10-07

Status: **STANDALONE REPOSITORY CREATED / PAID BILLING RUNTIME IMPLEMENTED / EXTERNAL GITHUB ADMISSION + RELEASE HARDENING OPEN**

Current Capital-AI main observed during reconciliation:
`71881d789246f5d382643dce8cc7eaa6daec582f`.

Dedicated product repository:

`capital-ai-online/CADS`

Initial standalone merge:

`capital-ai-online/CADS#1` → `c8e8d91a4c988e75b93f587c4bf6e592016bcb71`

Initial accepted Capital-AI source:

`0276d389412f806d2727c6b7b65d8215c703dbb1`

Later changes in Capital-AI PR #220 require explicit delta synchronization before they may be claimed
for the standalone repository.

## Product decision

CADS is intended to be productively monetized and distributed in GitHub Marketplace.

Paid plans:

- **Starter**
- **Pro**
- **Enterprise**

Website/Stripe and GitHub Marketplace remain separate billing/entitlement authorities.

## Implemented repository/runtime authority

### Paid plan contract

`apps/cads-github-app/marketplace-plans.production.json`

- paid Starter / Pro / Enterprise only;
- flat-rate monthly + yearly billing declaration;
- USD is the Marketplace pricing currency;
- exact Marketplace prices are not invented in source;
- exact Marketplace plan IDs remain runtime configuration.

The standalone repository separates the tier/capability authority into
`packages/cads-core/index.mjs`.

### GitHub App runtime

`server/cads-marketplace.mjs`

Implemented:

- bounded JSON webhook body;
- HMAC-SHA256 verification using `X-Hub-Signature-256`;
- `marketplace_purchase` actions `purchased`, `changed`, `cancelled`;
- GitHub Marketplace API readback before purchase/plan-change entitlement activation;
- runtime mapping from real Marketplace plan IDs to Starter / Pro / Enterprise;
- signed/expiring OAuth state and authenticated buyer linking;
- no Stripe entitlement reuse;
- no secrets/private keys in repository state;
- bounded audit output without raw webhook payloads.

### Entitlement persistence

`supabase/migrations/20261006210500_cads_marketplace_paid_entitlements.sql`

Implemented:

- service-role-only entitlement storage;
- service-role-only delivery/idempotency ledger;
- RLS explicit deny for anon/authenticated;
- duplicate webhook protection by GitHub delivery ID;
- purchase/plan-change upsert;
- cancellation deactivation;
- bounded metadata only;
- purge path for cancelled customer data and old event metadata.

## Event-backbone comparison is not a CADS listing gate

CADS Marketplace readiness does **not** require a successful NATS/Kafka × Node/Rust comparison
benchmark merely to establish the CADS paid-product boundary.

The unsuccessful NATS/Go path must not be represented as CADS PASS.

If an individual CADS capability later promises event-backbone comparison or execution, that
capability requires its own reproducible PRODUCT/PLATFORM/TRUST evidence before it may be enabled or
advertised. This is separate from the Marketplace billing/entitlement runtime.

## Production environment contract

Required outside Git:

```text
CADS_GITHUB_APP_ID
CADS_GITHUB_APP_PRIVATE_KEY
CADS_GITHUB_MARKETPLACE_WEBHOOK_SECRET
CADS_GITHUB_MARKETPLACE_OWNER_ORG
CADS_GITHUB_MARKETPLACE_LISTING_SLUG
CADS_GITHUB_CLIENT_ID
CADS_GITHUB_CLIENT_SECRET
CADS_GITHUB_OAUTH_STATE_SECRET
CADS_GITHUB_PUBLIC_URL

CADS_GITHUB_MARKETPLACE_STARTER_PLAN_ID
CADS_GITHUB_MARKETPLACE_PRO_PLAN_ID
CADS_GITHUB_MARKETPLACE_ENTERPRISE_PLAN_ID

SUPABASE_URL
SUPABASE_SECRET_KEY
```

Missing, invalid or ambiguous values must fail closed.

## External GitHub admission still required

Repository tests cannot manufacture these GitHub-side facts:

1. GitHub App owned by the intended organization;
2. Verified Publisher;
3. any current paid-listing installation threshold required by GitHub;
4. financial onboarding;
5. Marketplace listing and approved assets;
6. monthly and annual USD prices;
7. real Marketplace plan IDs;
8. production webhook configuration;
9. listing review/approval;
10. real install/OAuth-link/purchase/changed/cancelled/deletion smokes.

These requirements must be checked against current GitHub Marketplace rules at publication time.

## Repository and release handoff

The target repository is no longer a placeholder:

`capital-ai-online/CADS`

Organization PR #1 has been merged. The repository is currently public.

Public visibility means the proprietary CADS source is publicly readable even though the
first-party license does not grant an open-source license. Any future visibility/licensing change is
a separate OWNER/LEGAL decision.

The initial standalone repository has its own provenance and acceptance boundary. Later PR #220
hardening must be synchronized by a dedicated delta PR and revalidated there.

## Production sequence

1. Correlate the latest accepted Capital-AI CADS delta against `capital-ai-online/CADS@main`.
2. Export only the admitted delta with explicit source/transformation provenance.
3. Run standalone CADS CI again.
4. Build/scan the exact deployable artifact if one is introduced.
5. Generate standalone SBOM and runtime license inventory.
6. Complete organization/publisher/financial Marketplace admission.
7. Configure real plan IDs and prices.
8. Apply/verify required Supabase migration state.
9. Execute real install/OAuth-link/purchase/change/cancellation/deletion smokes.
10. Submit the listing for Marketplace review.
11. Only after separate TRUST/OWNER gates mark Production/Marketplace publication approved.

A successful test, build or billing event is not by itself a Security, License, Marketplace or
Production approval.
