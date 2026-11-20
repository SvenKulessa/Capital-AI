# CAPITAL-AI Unit Economics – offline GROWTH read model

Contract: capital-ai.unit-economics-snapshot/v1
Status: SOURCE_ONLY / TESTED_SYNTHETIC / LIVE_RECONCILIATION_NOT_PROVEN
Domain: GROWTH; safety review: TRUST
Implementation: server/unit-economics-readmodel.mjs
Tests: server/unit-economics-readmodel.test.mjs

## Authority and deliberate isolation

This module computes a *projection from caller-supplied aggregates*, NOT a durable
ledger, revenue authority, live accounting statement or production KPI service.
No HTTP route, database migration, checkout, new CRM, GA4 tag, external provider
call or paid service is introduced. No real tenant/customer data is required.
Output qualification is always SOURCE_PROOFS_NOT_INDEPENDENTLY_VERIFIED.
A metric with missing source coverage is INCOMPLETE, never a guessed zero.

Existing contracts are authoritative:
- PR #821: B2B Evidence Audit sales-to-delivery order states, qualified lead
  consent/tenancy, signed and replay-safe Stripe authority. Its EUR 149 offer is
  an unapproved price hypothesis, not recognized net revenue. No order or
  entitlement transitions are implemented by this read model.
- PR #824: consented governance-sprint lead event only after mail acceptance;
  GA4 event counters are not authenticated customer/checkout evidence and
  may not be joined across visitor identities without a legal, consented basis.
- src/contracts/growthAttribution.ts keeps GSC, product analytics and social
  observations separated. None of those are assumed to be paid-customer data.
- Stripe event inbox, subscription lifecycle and purchase receipts must be
  independently reconciled against signed provider records, settled net EUR
  revenue, refunds, credits, tax and chargebacks before use.
- Agent Operations pilot receipts are SYNTHETIC_LOCAL_COMPLETED and modelCalls=0.
  They do not prove actual provider spend, paid users or live agent execution.

## Input and output

Call calculateUnitEconomics(snapshot) from *trusted server-side code only*.
Snapshot fields: schemaVersion; currency=EUR; provenanceKind=SYNTHETIC or
UNVERIFIED_INPUT; product; exact canonical UTC periodStart/periodEnd; coverage
for revenue, paymentFees, directData, inference, tools, support, delivery,
acquisition, visitors, leads, offers, subscriptions and agentRuns; financial
EUR-cent amounts; funnel, subscription-cohort and agent-run counts.

Each coverage item has complete:boolean and evidenceRefs:string[]; complete=true
requires a nonempty evidence reference. For offer acceptance, evidenceClass=A
is required. These labels are assertions by the input source, NOT cryptographic
or provider validation. No evidence references, PII or raw receipts are
returned in the output.

Computations (cost inputs already attributed to the same product/period):
- Recognized net revenue: excluding VAT and already net of refunds, credits
  and chargebacks. Do not subtract refunds a second time.
- DB I = revenue - payment fees - direct data - inference - tools.
- DB II = DB I - variable support - variable delivery.
- DB III = DB II - attributable variable acquisition costs.
- Lead-to-paid = first paid customers / qualified leads in the *same cohort*.
- Offer acceptance = accepted valid paid offers / valid offers (evidence A).
- Logo churn = lost opening-cohort customers / opening customers.
- Gross revenue churn = lost opening MRR + downgrade MRR, divided by opening MRR.
- NRR = (opening MRR - lost MRR - downgrade MRR + expansion MRR) / opening MRR.
- Cost per successful agent run = attributed inference+tool costs, including
  failed-run waste, divided by successful runs. Only use when all inference
  and tool costs were allocated to these runs.
- Denominator 0 yields null; missing coverage yields INCOMPLETE.
- All monetary inputs must be nonnegative safe integer cents, including zero.
  DB outputs may be negative; zero revenue does not imply zero costs.

## Security and production admission

The read model neither accepts nor returns tenant IDs and must not be mounted
as a public endpoint. A future caller must enforce server-authenticated tenant,
product, UTC period and cohort isolation, source integrity, retention policy,
cross-tenant denial, reconciled per-provider costs and signed Stripe receipts.
Durable migrations require separate owner-authorized backup/restore evidence.
The API must never infer a verified customer from GA4 counters. Until these
requirements have been implemented and checked in actual runtime:
LIVE_PROFITABILITY_NOT_PROVEN.

Local deterministic test:
  node --test server/unit-economics-readmodel.test.mjs

CI: isolated non-required Unit Economics Tests workflow plus the unchanged
repository Required Checks Docker Security Gate and Domain Governance.
No optional test is declared as a new GitHub Ruleset requirement.
Rollback: revert the source-only PR; no data migration or external state to undo.
