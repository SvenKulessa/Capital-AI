# CAPITAL-AI Unit Economics – five read-only evidence adapters (v1)

Date: 2026-11-20
Scope: GROWTH (TRUST review); Root AGENTS.md / SOLO_MAINTAINER_FLOW@2
Status: SOURCE_IMPLEMENTED / SYNTHETIC_TESTS / LIVE_PROVIDER_NOT_ENABLED / DATABASE_READBACK_NOT_PROVEN
Code: server/unit-economics-source-adapters.mjs
Tests: server/unit-economics-source-adapters.test.mjs
Existing downstream contract: server/unit-economics-reconciliation.mjs (#853)

## Five adapters and their authority

\`createUnitEconomicsSourceAdapters({auth,db,stripeGet,readTaxAdjustment})\`
returns exactly \`{resolveTenant,readStripeInbox,readStripeEvent,readAgentRun,readProviderCost}\`.
Supply the resulting object **only** to the trusted, server-side
\`createUnitEconomicsReconciliation\`. There is no HTTP handler or scheduled
job, no production flag or automatic connection. Construction performs zero
network operations. Missing source configuration returns a redacted error.

1. **resolveTenant**: passes only an internal \`{req,res}\` to the existing
   \`auth.verify(req,res)\` Supabase session authority. Requires UUID \`userId\`
   identical to \`subject\`. The browser cannot submit/select a tenant.
   Existing tenant authority is **one verified Supabase user UUID**, not a
   multi-user organization.
2. **readStripeInbox**: uses the existing
   \`public.stripe_event_inbox\` source with \`processed\`, \`livemode=true\`,
   allowlisted event types and bounded SHA-256 hash. The existing table is
   global and has **no tenant_id**: its event receipt alone is NOT tenant
   authorization. Downstream Stripe provider readback must independently bind
   the checkout session to the authenticated tenant.
3. **readStripeEvent**: checks the previously processed inbox before any
   Stripe GET. Reads live event, charge, exact one checkout session by payment
   intent, exact one line item, paid invoice and balance transaction. Requires
   \`client_reference_id\` AND \`metadata.user_id\` to equal the authenticated
   tenant UUID; allowlisted subscription plan/cycle/price/product from
   \`server/billing-catalog.mjs\` must match. Amount, tax, invoice, fee, event
   type, live mode and UTC event timestamp are cross-checked. Refunds and lost
   disputes require independent tax-adjustment evidence; WON/PENDING/unknown
   statuses fail closed. This scope supports **initial subscription checkout**
   only. Ongoing renewals, business orders (#821), invoice credit notes,
   multiple-payment invoices and complex multi-line items remain NOT_PROVEN.
   The stored \`payload_hash\` is a verified-ingress assertion from the inbox,
   NOT independently recomputed from a Stripe retrieval: retrieval JSON is
   not necessarily byte-equal to the original signed webhook request.
   Object readback SHA-256 is a deterministic local fingerprint, NOT a
   Stripe cryptographic signature. Actual webhook signature processing
   remains outside this read-only module.
4. **readAgentRun**: reads one exact tenant-/UUID-scoped metered usage record
   from the candidate read source \`agent_run_usage_evidence\`. Requires
   \`PROVIDER_METERED\`, allowed actual completion state, bounded token usage,
   known run/billing-line binding and SHA-256 of versioned canonical fields.
   Synthetic \`agent_operations_pilot_runs\` are never promoted as live usage.
5. **readProviderCost**: reads a separate exact tenant/run/billing-line-scoped
   provider invoice allocation from \`agent_run_billing_evidence\`. Requires
   \`PROVIDER_SETTLED_INVOICE\`, EUR, \`SETTLED\`, safe integer cents and a
   versioned canonical hash. Token-based cost estimates, unsupported FX,
   negative/fragmented costs and unproven rows fail closed. The existing
   downstream reconciliation independently matches model/provider/product
   and prevents duplicate billing allocations.

Versioned integrity digests detect accidental changes/replays of source
projection fields. **They do not independently prove that a provider billed
those amounts.** Production promotion needs independently validated
provider invoices, source permissions, coverage and durable transactions.

## Read-only transports (explicit dependencies)

\`createUnitEconomicsSupabaseReader({origin,serviceKey,fetchImpl})\`:
allowlisted HTTPS \`*.supabase.co\`, service-role credential verification,
GET-only PostgREST, exact key equality after reading and an at-most-2 result
limit. The returned tenant row must exactly match the authenticated tenant
even though service_role bypasses RLS. No direct update/upsert/RPC.

\`createUnitEconomicsStripeReader({secret,fetchImpl})\`:
requires an already authorized *live* restricted or secret Stripe key,
hardcoded Stripe HTTPS origin, validated GET-only resource paths, no
redirection and bounded payload. No automatic key lookup, account creation,
checkout, webhook replay, provider activation or paid API call. The user has
not authorized activating a new paid provider; **only synthetic fetch mocks
are exercised by this PR.** No secret is written to GitHub, tests, logs or chat.

**Important existing-state limitation:** \`agent_run_usage_evidence\` and
\`agent_run_billing_evidence\` are expected read-only future source views.
They are NOT claimed to be present in the production Supabase schema.
Without separately approved, applied and restore-tested source tables/views,
their reads return failure. This PR does not create or modify those views,
apply SQL, backfill data, grant new roles, enable endpoints or change runtime
secrets. The global Stripe inbox can also be missing processed receipts for
the existing managed subscription sync; missing receipts remain NOT_PROVEN.

## Idempotency and tenant safety

- One authorized UUID per reconciliation; each read uses that ID as a strict
  query and verifies returned rows. Cross-tenant Stripe sessions are rejected.
- The original #853 business-key/balance-transaction/run-allocation
  idempotency remains authoritative. Replays produce identical projections
  from the same trusted snapshot; no persistent exactly-once guarantee.
- Every failed or incomplete read returns a generic error, not raw
  provider payloads, PII, tenant IDs or credentials.
- This adapter NEVER feeds net cash straight into recognized accounting
  revenue or DB I–III. The downstream result remains
  \`INCOMPLETE_FOR_ACCOUNTING_AND_PRODUCTION\`.
- A source may not claim zero billed runs just because the queried ID list is
  empty; source completeness and cross-period refund lifecycle are separate
  validation requirements.

## Test and rollback

Run locally:

\`\`\`bash
node --check server/unit-economics-source-adapters.mjs
node --test server/unit-economics-source-adapters.test.mjs \
  server/unit-economics-reconciliation.test.mjs \
  server/unit-economics-readmodel.test.mjs
\`\`\`

\`.github/workflows/unit-economics-readmodel.yml\` runs the combined tests
on changed files, alongside the unchanged Required Checks \`Docker Security
Gate\` and \`Domain Governance\`. Do not add a new Required Check.

Rollback: revert this source-only PR. No production DB DDL/DML, payment,
provider usage, authentication or pricing mutations to undo.
