# CADS GitHub Marketplace Production Readiness — 2026-10-06

Status: **PAID_RUNTIME_IMPLEMENTED / EXTERNAL_GITHUB_ADMISSION_BLOCKED**

Implementation baseline: `main@4fa3e3f92547cd6356f46490a38e9b7515f69a6d`.

## Product decision

CADS is intended to be **productively monetized and productively distributed in GitHub Marketplace**.

The production Marketplace offer is:

- **Starter**
- **Pro**
- **Enterprise**

There is no Community-only production target. The existing website/Stripe CADS channel remains separate.

## Implemented repository/runtime authority

### Paid plan contract

`apps/cads-github-app/marketplace-plans.production.json`

- paid Starter / Pro / Enterprise only;
- flat-rate monthly + yearly billing model;
- USD is the Marketplace pricing currency;
- capabilities are locked to `packages/benchmark-core/index.mjs`;
- exact Marketplace prices are not inferred from the EUR website catalogue.

### GitHub App runtime

`server/cads-marketplace.mjs`

Implemented:

- bounded JSON webhook body;
- HMAC-SHA256 verification using `X-Hub-Signature-256`;
- `marketplace_purchase` actions `purchased`, `changed`, `cancelled`;
- GitHub Marketplace API readback before purchase/plan-change entitlement activation;
- runtime mapping from real Marketplace plan IDs to Starter / Pro / Enterprise;
- no Stripe entitlement reuse;
- no secrets or private keys in repository state;
- bounded audit output without raw webhook payloads.

### Entitlement persistence

`supabase/migrations/20261006210500_cads_marketplace_paid_entitlements.sql`

Implemented:

- service-role-only entitlement table;
- service-role-only delivery/idempotency ledger;
- RLS explicit deny for anon/authenticated;
- duplicate webhook protection by GitHub delivery ID;
- purchase/plan-change upsert;
- cancellation deactivation;
- bounded metadata only; no raw webhook body;
- purge RPC for cancelled customer data and old event metadata.

The server invokes the purge path against a 29-day boundary so cleanup occurs before GitHub's 30-day cancellation-data limit when the runtime remains healthy.

## Production environment contract

The productive runtime requires these values outside Git:

```text
CADS_GITHUB_APP_ID
CADS_GITHUB_APP_PRIVATE_KEY
CADS_GITHUB_MARKETPLACE_WEBHOOK_SECRET
CADS_GITHUB_MARKETPLACE_OWNER_ORG
CADS_GITHUB_MARKETPLACE_LISTING_SLUG

CADS_GITHUB_MARKETPLACE_STARTER_PLAN_ID
CADS_GITHUB_MARKETPLACE_PRO_PLAN_ID
CADS_GITHUB_MARKETPLACE_ENTERPRISE_PLAN_ID

SUPABASE_URL
SUPABASE_SECRET_KEY
```

The three Marketplace plan IDs must be positive and distinct. Missing or invalid values make the runtime fail closed.

## External GitHub admission still required

The repository cannot manufacture these GitHub-side facts:

1. CADS GitHub App owned by the intended GitHub organization.
2. Verified Publisher for that organization.
3. At least 100 GitHub App installations for a paid listing.
4. GitHub financial onboarding.
5. Draft Marketplace listing and listing assets.
6. Monthly and annual USD price for Starter, Pro and Enterprise.
7. Real Marketplace plan IDs copied into runtime configuration.
8. Production Marketplace webhook configured to:
   `https://capital-ai.online/api/integrations/github/cads-marketplace`
9. Marketplace listing review/approval.
10. Real purchase, upgrade/downgrade and cancellation smokes.

Current connected GitHub account context exposed during this reconciliation has no organization membership available to the connector. That prevents claiming organization ownership or Verified Publisher evidence.

## Plan capability authority

The Marketplace does not create a second CADS feature matrix.

`packages/benchmark-core/index.mjs` remains canonical:

- Starter: standard profiles + neutral GitHub check.
- Pro: Starter + history + regression detection + evidence export.
- Enterprise: Pro + custom profiles + custom thresholds + enforced PR gate + API + self-hosted runner.

A paid entitlement never overrides:

- Security/Trust gates;
- software or asset licensing;
- provider/data rights;
- source-bound evidence requirements;
- Production Handoff.

## Production sequence

1. Create/connect the target GitHub organization.
2. Register or transfer the CADS GitHub App to that organization.
3. Complete Publisher Verification.
4. Reach/verify the paid-listing installation requirement.
5. Complete financial onboarding.
6. Create Starter / Pro / Enterprise paid Marketplace plans.
7. Set monthly + yearly USD pricing in GitHub Marketplace.
8. Bind the real plan IDs to Render/runtime secrets.
9. Apply the Supabase migration.
10. Configure Marketplace plan-change webhook.
11. Deploy the exact validated image.
12. Execute real purchase / changed / cancellation / deletion smokes.
13. Submit the listing for Marketplace review.
14. Only after approval mark Marketplace publication evidence VERIFIED.

A successful test, build or billing event is not by itself a security, license or production-release approval.
