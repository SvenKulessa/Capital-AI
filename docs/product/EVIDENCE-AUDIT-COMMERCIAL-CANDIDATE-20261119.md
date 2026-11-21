# CAPITAL-AI Evidence Audit — commercial admission candidate

Status: **CANDIDATE / NOT_FOR_SALE**  
Date: 2026-11-19  
Owner: CAPITAL-AI  
Scope: product definition only; no billing or entitlement activation.

## Customer proposition

A bounded, read-only evidence review of one customer-authorized GitHub repository. Target: small teams and IT service providers needing an actionable technical governance snapshot.

**Proposed one-off price:** EUR 149 (commercial hypothesis, not a Stripe price; tax treatment to be confirmed). Not a published purchasable product.

## Deliverables and acceptance

1. Customer authorizes a specific repository and scopes access to read-only metadata.
2. Collect commit SHA, timestamps, existing GitHub Actions run URLs, status conclusions and applicable repository rules; never collect secrets or private code in a public report.
3. Produce an evidence manifest in JSON with source, observation time, status `VERIFIED | BLOCKED | NOT_PROVEN`, confidence boundary, and remediation recommendation.
4. Produce an accessible human-readable PDF report derived from the same manifest.
5. Explicitly mark missing CI, inaccessible rulesets, absent scanner evidence, stale results and failed API requests as NOT_PROVEN, not PASS.
6. Retain evidence only under an agreed data-processing and deletion policy; no persistent access tokens in reports.
7. Provide a manual customer review before release; no certification, penetration-test, regulatory-compliance or security-guarantee claims.

## Conservative implementation plan

- Reuse existing GitHub/Evidence adapters and current trust/security workflows. No second source-of-truth catalog.
- Keep report assembly deterministic, with schema validation and negative tests for missing data, cross-tenant access, malicious issue text, and redaction.
- No autonomous changes to customer repositories, billing, providers, or production infrastructure.
- Add a non-purchasable product-candidate record in the Catalogue Center only after identifying its existing schema; do not add this offer to `src/data/pricingCatalog.ts`, `server/billing-catalog.mjs` or the production pricing UI before verified Stripe product/price and entitlement support.

## Release gates

- [ ] Product implementation, sample evidence and PDF verified
- [ ] Positive/negative tests and required Docker Security Gate + Domain Governance green at current head
- [ ] Read-only scope and tenant isolation verified
- [ ] Pricing/tax, terms, privacy and data retention approved
- [ ] Stripe product/price, server checkout mapping, webhook and entitlement independently verified
- [ ] Accessibility and mobile browser QA completed
- [ ] Owner commercial activation authorization recorded
- [ ] Main/production deployment and live checkout verified

Until all relevant gates pass: **NOT_FOR_SALE**.

## Commercial validation

Benchmark competing AI governance platforms but do not claim equivalent features. Interview five prospective customers, test EUR 149 against delivery time and conversion, and cap included work to one repository and one report. Record actual delivery cost and gross margin before expansion.

## Rollback

Withdraw candidate listing without affecting existing Starter, Pro, Enterprise or Market Vocabulary prices. Never revoke unrelated subscriptions.
