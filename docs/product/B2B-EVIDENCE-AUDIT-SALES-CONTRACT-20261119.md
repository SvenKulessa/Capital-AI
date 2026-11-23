# CAPITAL-AI B2B Evidence Audit — Sales-to-Delivery Contract v0.1

Status: CANDIDATE / NOT_FOR_SALE. Owner approval and verified security, billing and legal gates required.

## ICP and scope
- Target: German/EU SMB IT consultancies, managed service providers and software teams with GitHub Actions.
- One authorized repository, one immutable head SHA, one bounded evidence snapshot and one reviewed JSON/PDF report.
- Read-only collection only; no repository mutation, no compliance certification, no penetration test, no guaranteed security outcome.
- Offer hypothesis: EUR 149 per one-off audit, **not** an approved price or published Stripe product. VAT treatment and invoicing require owner/accountant review.
- Upsell hypothesis: separately quoted remediation advisory; never promise unattended remediation or access to production secrets.

## Lead qualification and consent
Collect only: organization, business contact, authorized repository identifier, billing country, requested delivery window, consent timestamp/version, and data retention choice. Do not request tokens by email or lead form.
Reject/hold if repository authorization or scope is unproven, buyer asks for privileged access, required legal terms are missing, or customer requests unsupported guarantees.
Keep lead records tenant-scoped; explicit purpose and deletion policy; no personal data in CI artifacts or public issues.

## State machine (server-authoritative)
DRAFT -> QUALIFIED -> QUOTED -> CHECKOUT_PENDING -> PAID_VERIFIED -> AUTHORIZED -> AUDIT_RUNNING -> REVIEW_REQUIRED -> DELIVERED.
Exceptions: BLOCKED, CANCELLED, REFUNDED, EXPIRED. No client-side flags can advance payment or authorization states.
Checkout must be created server-side from an allowlisted Stripe price ID only after owner price/tax approval.
Use signed, verified, replay-safe Stripe webhooks; idempotency key derived from order ID; never trust a redirect success page as payment proof.
Require both payment confirmation and customer repository authorization before execution. Customer delivery is a manual approval gate.
Do not grant subscription entitlements for a one-time service; use an isolated service-order record.

## Evidence and isolation
- Bind order_id, tenant_id, repository_id, requested head SHA, collector identity, timestamp, workflow run IDs and report digest.
- Collector must use least-privilege GitHub permissions and only read customer-authorized metadata.
- Treat missing/stale/inaccessible checks and rulesets as NOT_PROVEN; failures as BLOCKED. Never infer VERIFIED from customer-uploaded JSON.
- Private encrypted storage; short retention with documented deletion; signed download URL after tenant authentication.
- Report limitations, provenance and human reviewer identity; no raw secrets, access tokens, source code or customer contact details in public output.

## Current implementation boundary (2026-11-23)

The existing `server/b2b-evidence-leads.mjs` is a **source-only intake function**. It is not wired to a production HTTP route, Stripe checkout, customer authorization adapter or live lead store. `QUALIFIED_PENDING_REVIEW` must not be represented as a purchased or authorized audit.

A targeted TRUST repair now validates **trimmed** organization names and rejects ASCII/C1 controls and bidi-override/isolate characters before persistence. The tenant resolver remains an injected trusted dependency; the client-supplied tenant ID cannot authorize access. Current B2B test evidence: [B2B Evidence Lead Tests run 45083608571](https://github.com/SvenKulessa/Capital-AI/actions/runs/45083608571), **11/11 successful** on SHA `7dbc5eee75d05508624257eb0fcbffc6b34ad511`. This is historical head-bound evidence: it must be re-evaluated on any later head including the documentation commit.

No observed production leads, customer consents, subscriptions, Stripe transactions, revenue or deployment are claimed. Required main and PR checks, owner commercial decisions, DPA/retention, tenant-isolated real persistence, and verified provider evidence remain separate future steps.

## Negative tests before activation
1. Missing/expired repository consent -> no audit.
2. Cross-tenant order or report request -> deny, no data disclosure.
3. Forged/unsigned Stripe webhook -> no state transition.
4. Duplicate webhook -> one payment transition and one service order.
5. Failed/refunded payment -> no new audit/delivery.
6. Missing or stale CI -> NOT_PROVEN, never VERIFIED.
7. Prompt injection in commit/check messages -> never rendered as instructions.
8. Revoked GitHub access -> BLOCKED with no retry escalation.
9. Missing reviewer approval -> no customer delivery.
10. Deletion request -> purge within published retention policy and preserve only legally required billing records.

## Conversion and unit economics (hypotheses, not actuals)
Measure qualified leads, quote acceptance, paid conversion, acquisition cost, time to delivery, manual review minutes, refund rate, gross margin.
For a EUR 149 gross offer, calculate net revenue after applicable VAT, Stripe fees, cloud/API costs, and human review before deciding viability. Never represent EUR 149 as net margin.
Pilot: five consenting prospects; record actual delivery costs and willingness to pay. No automated outreach without opt-in.

## Release gate / fail closed
- [x] PR #815 Evidence Audit offline engine and negative tests merged to main as `f8882a5286f3d6a7c7dbc8fa06e284bc257c125d` (GitHub merge readback verified; separate main-runtime deployment NOT_PROVEN).
- [ ] Read-only GitHub collector, provenance and tenant isolation validated.
- [ ] Report accessibility, quality and deletion process verified.
- [ ] Terms, privacy/DPA, tax/VAT, invoice and pricing approved.
- [ ] Stripe test-mode product/price and webhook negative tests pass.
- [ ] Owner approves live-mode product/price and spend/operating budget.
- [ ] Production checkout, refund, delivery and rollback verified.
- [ ] Catalogue Center and website only show purchasable offer after all gates pass.

Rollback: disable checkout offer flag; retain valid orders and refunds in auditable ledger; do not change existing CAPITAL-AI subscriptions.
