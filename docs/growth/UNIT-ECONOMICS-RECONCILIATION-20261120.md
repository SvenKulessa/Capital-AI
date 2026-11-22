# CAPITAL-AI · Stripe & Agent Run Unit Economics Reconciliation v1

Status: IMPLEMENTED_SOURCE / TESTED_WITH_SYNTHETIC_FIXTURES_ONLY / LIVE_READBACK_NOT_PROVEN
Owner domain: GROWTH, cross-domain: TRUST / PLATFORM
Baseline main: 3f51c74d83e16125c73782710c0e39dcf808b061
Source: server/unit-economics-reconciliation.mjs
Test: server/unit-economics-reconciliation.test.mjs
Existing economic model: server/unit-economics-readmodel.mjs

## Purpose and admission boundary

This is a **server-only, read-only source reconciliation slice**, not a new
payment processor, webhook endpoint, customer entitlement, price, database
migration, production ledger, accounting/GA4 dashboard or automatic provider
client. It creates no live Stripe/API requests until authorized upstream
reader adapters are separately connected. The constructor **requires** five
trusted server-side callbacks. It deliberately has no HTTP handler, environment
credential reader, flag that can activate it or fallback to mock/synthetic
provider results in production.

The adapter inputs are strictly data; they do not grant authority:
1. resolveTenant(principal): an already authenticated, server-scoped tenant
   UUID. No request body is allowed to choose a user/tenant.
2. readStripeInbox({tenantId,eventId}): an independently persisted,
   processed/livemode Stripe webhook receipt (in the existing
   public.stripe_event_inbox pattern) with verified payload SHA-256.
3. readStripeEvent({tenantId,eventId}): provider-readback canonical business
   object (settled charge/refund or **lost** dispute), matching webhook hash,
   verified customer/tenant-to-Stripe mapping, same invoice/checkout source,
   EUR currency, Stripe balance transaction fee and object digest.
4. readAgentRun({tenantId,runId}): completed real provider run with measured
   token quantities, tenant/product binding, immutable usage digest and an
   allocated provider billingLineId. **Synthetic pilot receipts are denied.**
5. readProviderCost({tenantId,runId,billingLineId}): independently read,
   **settled, EUR-denominated billed cost allocation**, never a price estimate
   from token counts, including both inference and tool cost; immutable digest.

These adapters are dependencies to be implemented/authorized separately.
Existing server/purchase-receipt.mjs generates a GA4 measurement receipt,
**not** an accounting or invoice proof. Existing
server/agent-operations-pilot.mjs produces SYNTHETIC_LOCAL_COMPLETED, modelCalls=0
receipts; they are **not** actual billed AI runs. This slice does not claim
those adapters exist or have been exercised against providers.

## Reconciliation semantics

Call createUnitEconomicsReconciliation(dependencies).reconcile with a trusted
principal and bounded exact Stripe event IDs + run UUIDs. Every source must
resolve and pass provenance, status, identity and UTC period checks; otherwise
the entire request fails with a redacted error and **no partial projection**.

- Effective idempotence **within a complete replayable snapshot**:
  deduplicate webhook IDs and identical business objects (charge, refund,
  dispute), reject conflicting amounts, and reject reused provider billing
  allocations across distinct Agent Runs. Repeated same inputs yield the
  same snapshot digest. **No persistent exactly-once guarantee** is claimed.
- Charge/refund/dispute business objects are validated for processed inbox,
  matching SHA-256, live mode, settled readback, correct currency, account,
  product, source and bounded timestamp. Lost disputes subtract cash; won
  disputes and pending refunds are not recognized.
- For an included charge, cumulative same-slice refunds/disputes must not
  exceed the captured amount. For adjustments to a charge in an **earlier
  period**, the upstream provider adapter must enforce full lifecycle
  consistency. This is a bounded transaction/event view, not a lifetime
  provider backfill.
- netCashExcludingTaxMinor =
    settled charge gross - charge VAT
    - refunded gross + refunded VAT
    - lost dispute gross + dispute VAT.
  Stripe fees are separately added, **not** subtracted again from net cash.
  Fee credits, timing differences, accruals, commissions and accounting
  adjustments require separately evidenced records before any *real*
  recognized revenue or deckungsbeitrag calculation. Nothing is
  automatically posted to a revenue ledger.
- Agent costs are allocated once per unique settled billing line/run; both
  SUCCEEDED and FAILED runs incur costs. Per-successful-run cost includes
  failed-run waste as an operational metric, not a provider invoice formula.
- Money is safe-integer EUR cents; BigInt accumulation avoids silently
  overflowing integer sums. No USD conversion, inferred prices or
  zero-filling missing receipts.
- Strict object allowlists and redacted error handling prevent raw Stripe
  payloads, access credentials, principal, invoice IDs and customer tenant
  identifiers from appearing in the projection. runId is an internal
  pseudonymous UUID: DO NOT expose output publicly.

The output **always** reports:
  status = INCOMPLETE_FOR_ACCOUNTING_AND_PRODUCTION
  qualification = READ_ONLY_SOURCE_ADAPTER_INPUT_NOT_INDEPENDENTLY_ATTESTED

Even a successful offline projection is not audited finance evidence.
EMPTY SOURCE ID LISTS NEVER establish that an account had zero activity.

## Integration boundaries

- PR #850's calculateUnitEconomics remains a separate downstream read model.
  Its recognizedNetRevenueMinor must never be populated directly from
  netCashExcludingTaxMinor without independent period accounting/VAT/refund
  reconciliation; DB I–III stay INCOMPLETE without complete support, payment,
  data, tool, delivery and acquisition cost coverage.
- PR #821 retains B2B quote/sales-to-delivery order states, tenant ownership,
  Stripe test/live approval, permission checks and purchase authority.
- PR #824 retains consented GA4 generate_lead, analytics privacy and attribution.
  Never use GA4 pageviews/form events as Stripe customer identities.
- src/contracts/growthAttribution.ts retains separated GSC/product/social
  signals. No user identity joining is introduced.
- Existing stripe_event_inbox cannot be assumed complete for a managed
  Stripe→Supabase sync: the published subscription contract explicitly
  states missing processed receipts result in NOT_PROVEN. Do not fabricate
  event provenance.

## Negative tests / release

Offline:
  node --check server/unit-economics-reconciliation.mjs
  node --test server/unit-economics-readmodel.test.mjs server/unit-economics-reconciliation.test.mjs

The existing Unit Economics Tests workflow runs both suites; existing GitHub
Docker Security Gate and Domain Governance remain the only required checks.
Tests cover duplicate business events, conflicting replays, cross-tenant
readback, missing/pending inbox, stale/won-dispute records, mismatch of
provider hashes, period and currency, invalid/overflow amounts, synthetic
Agent Runs, unbilled/incomplete costs, duplicate billing allocation,
authorization and error redaction.

Next admission, NOT authorized in this PR:
- independently implement and prove tenant-scoped read-only provider adapters
  and source completeness on isolated infrastructure;
- confirm actual Stripe fees and full refund/dispute/credit history, legal tax
  rules, recognition period, cross-month reversals and reconciliation;
- isolate and restore-test any proposed durable database migration before
  owner-authorized production DDL/DML;
- verify provider rights, pricing and budget approvals before any paid calls.
Rollback: revert the PR. No provider changes, paid API use, DB migration,
publishing or customer-facing financial result was authorized here.
