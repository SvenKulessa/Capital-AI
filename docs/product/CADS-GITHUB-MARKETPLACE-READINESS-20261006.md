# CADS GitHub Marketplace Readiness — 2026-10-06

Status: **BLOCKED_FOR_PAID_LISTING**

Correlation baseline: `main@cef1d11f607778f5226ca1df97376ba408652c69`.

This document describes the **additional GitHub Marketplace channel** for CADS. It does not replace the already implemented website-commerce authority from PR #216 and it does not approve a price, listing, production deployment, security release or software/data license.

## Authority boundary

- Canonical product: `[CAPITAL-AI-PRODUCT]CADS-BENCHMARK-ENGINE`
- Product ID: `cads-app`
- Product owner: **PRODUCT**
- Assurance/admission: **TRUST**
- Website billing: `server/billing-catalog.mjs` + Stripe Subscription Checkout
- Website entitlement: `public.subscriptions` via `auth.resolvePaidTier()`
- GitHub Marketplace billing/entitlement: **separate and not configured**
- GitHub Marketplace pricing authority: **unassigned**
- Marketplace plan IDs: **unassigned**
- Marketplace purchase path: **disabled / fail-closed**

The website slice remains `productionEligible=false` and `decisionEligible=false` until its own runtime/evidence gates close.

## Current GitHub Marketplace requirements

Official GitHub documentation checked on 2026-10-06 requires or describes for the paid-app path:

1. Paid plans are published by an organization-owned app under a verified publisher.
2. GitHub Apps should have at least 100 installations before a paid listing is published.
3. Paid subscriptions support monthly and annual billing.
4. Prices are set in USD; a listing can offer up to ten plans.
5. Marketplace purchase handling covers purchases/free trials, upgrades/downgrades and cancellations via `marketplace_purchase`.
6. Plan-change/cancellation webhook handling must be configured.
7. Listings need valid publisher contact, privacy and support information and the required listing assets.
8. On cancellation, the customer account is deactivated and customer data is removed within 30 days; token/webhook cleanup applies where relevant.
9. Because CADS already has a paid service outside GitHub Marketplace, a free Marketplace listing cannot remain the sole Marketplace offer once the paid-app requirements are met.

Official references:

- https://docs.github.com/en/apps/github-marketplace/creating-apps-for-github-marketplace/requirements-for-listing-an-app
- https://docs.github.com/en/apps/github-marketplace/github-marketplace-overview/applying-for-publisher-verification-for-your-organization
- https://docs.github.com/en/apps/github-marketplace/selling-your-app-on-github-marketplace/pricing-plans-for-github-marketplace-apps
- https://docs.github.com/en/apps/github-marketplace/using-the-github-marketplace-api-in-your-app
- https://docs.github.com/en/apps/github-marketplace/using-the-github-marketplace-api-in-your-app/handling-plan-cancellations

## Repository evidence already present

The repository contains reusable Marketplace architecture in `apps/legal-policy-github-app`:

- HMAC-SHA256 webhook verification;
- signed/expiring OAuth state;
- Marketplace subscription readback;
- entitlement capability mapping;
- `marketplace_purchase` event acceptance;
- evidence retention and installation-deletion handling.

This is **architecture evidence only**. The current `marketplace_purchase` handler does not by itself prove a CADS-specific idempotent entitlement lifecycle, listing, pricing, plan IDs, cancellation cleanup or Marketplace approval.

## CADS-specific gates

| Gate | State |
|---|---|
| Website Starter/Pro/Enterprise entitlement runtime evidence | REQUIRED |
| CADS GitHub App owned by target organization | UNVERIFIED |
| Verified publisher | UNVERIFIED |
| >=100 CADS GitHub App installations | UNVERIFIED |
| CADS Marketplace draft listing | UNVERIFIED |
| CADS Marketplace plan-change webhook | UNVERIFIED |
| Privacy/support/contact/listing assets | UNVERIFIED |
| Monthly USD price | UNASSIGNED |
| Annual USD price | UNASSIGNED |
| Marketplace plan IDs | UNASSIGNED |
| Idempotent purchased/changed/cancelled lifecycle | REQUIRED |
| Cancellation account/token/data cleanup <=30 days | REQUIRED |
| Authoritative Marketplace subscription readback | REQUIRED |
| Customer-facing CADS report/history | REQUIRED |
| Exact release artifact/runtime correlation | REQUIRED |

## Conservative sequence

1. Verify the existing website CADS entitlement slice against real Starter/Pro/Enterprise subscriptions.
2. Create or identify the CADS GitHub App under the intended organization.
3. Minimize and document permissions.
4. Create the draft Marketplace listing and its plan-change webhook.
5. Bind `purchased`, `changed` and `cancelled` to idempotent entitlement transitions.
6. Implement cancellation deactivation/token cleanup/data deletion evidence.
7. Verify publisher status and installation threshold.
8. Bind privacy/support/contact and listing assets.
9. Map capabilities to Marketplace plans.
10. Only then assign monthly/annual USD prices and plan IDs through an Owner decision.
11. Test Marketplace billing flows and authoritative subscription readback.
12. Re-run TRUST, supply-chain and release evidence before requesting listing review.

Paid entitlement never overrides security, software licensing, provider/data rights, source-bound evidence or production-release gates.
