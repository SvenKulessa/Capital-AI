# CADS GitHub Marketplace Readiness — 2026-10-06

Status: **BLOCKED_FOR_PAID_LISTING**

This document binds the CADS productization path to the GitHub Marketplace requirements checked on 2026-10-06. It does not approve a price, Marketplace listing, security release, software license or production deployment.

## Product boundary

- Product: `[CAPITAL-AI-PRODUCT]CADS-BENCHMARK-GITHUB-APP`
- Product ID: `cads-app`
- Product owner: **PRODUCT**
- Assurance / admission: **TRUST**
- Target channel: GitHub Marketplace
- Pricing authority: **not assigned**
- Marketplace plan IDs: **not assigned**
- Purchase: **disabled / fail-closed**

## Current GitHub Marketplace requirements

Official GitHub documentation checked on 2026-10-06 establishes the following requirements relevant to a paid CADS listing:

1. A paid GitHub App must be owned by an organization.
2. Paid plans require a verified publisher.
3. A GitHub App must have at least 100 installations before a paid listing can be published.
4. Paid subscriptions must support both monthly and annual billing.
5. Marketplace prices are defined and processed in US dollars.
6. A listing can publish up to ten plans.
7. The app must process Marketplace purchase lifecycle events, including:
   - `purchased` for new purchases/free trials/free plans;
   - `changed` for upgrades/downgrades;
   - `cancelled` for cancellations.
8. The Marketplace listing needs its own webhook for plan changes.
9. Privacy, support/contact and publisher/listing requirements must be complete before review.

Official references:

- https://docs.github.com/en/apps/github-marketplace/creating-apps-for-github-marketplace/requirements-for-listing-an-app
- https://docs.github.com/en/apps/github-marketplace/github-marketplace-overview/applying-for-publisher-verification-for-your-organization
- https://docs.github.com/en/apps/github-marketplace/selling-your-app-on-github-marketplace/pricing-plans-for-github-marketplace-apps
- https://docs.github.com/en/apps/github-marketplace/listing-an-app-on-github-marketplace/setting-pricing-plans-for-your-listing
- https://docs.github.com/en/apps/github-marketplace/using-the-github-marketplace-api-in-your-app
- https://docs.github.com/en/apps/github-marketplace/listing-an-app-on-github-marketplace/configuring-a-webhook-to-notify-you-of-plan-changes

## Repository evidence already present

The repository already contains a reusable Marketplace lifecycle implementation in `apps/legal-policy-github-app`:

- HMAC-SHA256 webhook verification;
- signed/expiring OAuth state;
- GitHub Marketplace subscription readback;
- entitlement capability mapping;
- `marketplace_purchase` webhook acceptance;
- append-only evidence metadata in Supabase/Postgres;
- retention and uninstall deletion behavior.

This is architecture evidence only. It does **not** prove that CADS itself has a Marketplace listing, publisher approval, 100 installations, plan IDs or approved pricing.

## CADS-specific blockers

| Gate | State |
|---|---|
| CADS GitHub App owned by target organization | UNVERIFIED |
| Verified publisher | UNVERIFIED |
| >=100 CADS GitHub App installations | UNVERIFIED |
| CADS Marketplace draft listing | UNVERIFIED |
| CADS Marketplace listing webhook | UNVERIFIED |
| Privacy/support/contact listing evidence | UNVERIFIED |
| Monthly USD price | UNASSIGNED |
| Annual USD price | UNASSIGNED |
| Marketplace plan IDs | UNASSIGNED |
| Authoritative CADS entitlement readback | REQUIRED |
| Customer-facing CADS report/history | REQUIRED |
| Exact release artifact/runtime correlation | REQUIRED |

## Monetization sequencing

1. Create/identify the CADS GitHub App under the intended organization.
2. Minimize and document permissions.
3. Create a draft Marketplace listing and dedicated Marketplace plan-change webhook.
4. Bind `purchased`, `changed`, `cancelled` to idempotent entitlement transitions.
5. Verify publisher status and installation count.
6. Bind privacy/support/contact evidence.
7. Assign capabilities to plans.
8. **Only after these gates:** owner decision on monthly/annual USD prices.
9. Test Marketplace purchase flows against the draft listing.
10. Re-run TRUST, supply-chain and release evidence before requesting listing review.

A paid entitlement must never override security, software licensing, provider/data rights, source-bound evidence or production-release gates.
