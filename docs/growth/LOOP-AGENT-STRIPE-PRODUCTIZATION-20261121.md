# CAPITAL_AI_GROWTH_STRIPE_PRODUCTIZATION_REPORT@1

Stand: 2026-11-21. Primary Domain: GROWTH; supporting: PRODUCT, PLATFORM, TRUST, QUALITY, CADS.
Repository: SvenKulessa/Capital-AI. Main baseline: a69a81cca53f7460224e94eaa896d6a2099043ae.
Feature branch: capital-ai-growth/stripe-loop-productization-20261121.
Overall readiness: SOURCE_IMPLEMENTED for the isolated synthetic contract and acceptance; COMMERCIAL_READY = BLOCKED.

## A. Current-state inventory
Root AGENTS.md and GROWTH, revenue, product and analytics skills read on current source.
VERIFIED_EXISTING: server/billing-catalog.mjs, server/subscription-entitlements.mjs, server/subscription-checkout.mjs, existing public.subscriptions Stripe sync contract.
SOURCE_IMPLEMENTED: server/agent-operations-pilot.mjs, server/agent-operations-pilot-store.mjs, unit-economics read models and reconciliation; local candidate persistence SQL exists.
TEST_ONLY: local synthetic test fixtures in this change.
NOT_PROVEN: production pilot SQL migration applied, processed Stripe inbox correlation, Loop-specific tenant scoped persisted entitlements, production action runtime admission, live costs and commercial operation.
MISSING: authorized Loop-specific price mapping and production Loop-specific subscription/runtime wiring.

## B. Existing Stripe catalog evidence
Authorized Stripe connector, READ_ONLY calls only, no Stripe mutations:
- Test mode: 3 products, 5 prices. 3 active monthly prices and 2 inactive monthly prices.
- Live mode: 14 products, 21 prices; some prices inactive; some products inactive; legacy/alternative offerings coexist.
- Sanitized complete snapshots: docs/growth/evidence/stripe-loop-catalog-test-20261121.json and docs/growth/evidence/stripe-loop-catalog-live-20261121.json; both have_more=false.
- The six canonical recurring live Price IDs from server/billing-catalog.mjs exist as active on their matching active products: Starter EUR 7 monthly / EUR 75.60 annual; Pro EUR 29 monthly / EUR 248 annual; Enterprise EUR 109 monthly / EUR 1280 annual.
- Inactive product/price records and one-time Blueprint/Learning Portal prices are excluded.
- These are CURRENT_STRIPE_PRICE observations, not approved new LOOP_AGENT_PRODUCT prices. No sale, refund, tax, customer or production billing action occurred.

## C. Existing reusable components
Use existing subscription checkout and catalog; existing auth.resolvePaidTier and public.subscriptions for legacy paid website tiers; existing managed Stripe sync and stripe_event_inbox patterns; existing agent-operations pilot, service-only ledger RPC, unit economics reconciliation, Growth consent instrumentation, CADS design. No new payment processor, authentication system, cost ledger, growth pipeline or visual design system.

## D. Missing components
Actual processed inbox evidence from the managed Stripe sync, independently authorized Stripe customer/subject/tenant/repository binding, Loop-specific allowlisted price mapping and persisted entitlement readback, SQL/RPC atomic Loop tenant-run quota and receipt storage, real provider cost attestations, upstream proof for Growth, and legally reviewed commercial launch configuration.

## E. Product-contract implementation
server/loop-agent-product.mjs implements LOOP_AGENT_PRODUCT@1 with logical FREE / PRO / TEAM / ENTERPRISE. There is no implied one-to-one Stripe product correspondence.
Caveat: source-only module exports functions but is not registered as an active production API.
FREE has no paid Loop grant; proposed action capabilities are observe, advisor, repair, createPullRequest, autonomousConvergence and productionMutation. Every tier policy must be server-provided; productionMutation is categorically denied by this initial contract.

## F. Price-to-tier mapping
Explicit server-approved map: Stripe price ID + product ID + mode + active recurring catalog status -> commercial tier. Unknown IDs, inactive objects, mismatched modes, missing approval and ambiguous mappings fail closed.
No existing real Stripe Price has been approved for LOOP_AGENT_PRODUCT@1; an artificial price_TESTAAA is used ONLY in the isolated synthetic fixture. Existing Starter/Pro/Enterprise catalog mappings must not be inherited as Loop entitlements.

Price evidence model: CURRENT_STRIPE_PRICE (readback only); INTERNAL_COST_FLOOR (NOT_PROVEN); GROWTH_PRICE_HYPOTHESIS (PROPOSAL_ONLY); MARKET_EVIDENCE (NOT_PROVEN); APPROVED_PRICE (NOT_PROVEN). No selling-price hypothesis becomes a live offer.

## G. Entitlement implementation
LOOP_AGENT_ENTITLEMENT@1 projects tenantId, subjectId, tier, capabilities, limits, periodEnd, Stripe customer/subscription/price/event evidence and a canonical SHA-256 integrity digest.
Signed subscription deletion revokes access even if provider readback briefly reports active. Active subscriptions require a valid period; trialing requires independently enabled product policy; canceled, past_due, unpaid, incomplete and unknown states resolve to BLOCKED and no paid Loop access.
A hash is not authority: authorizeLoopAction requires the trusted existing persisted-entitlement readback in addition to identical full digest, the authenticated tenant/user/repository scope and independent provider/policy/TRUST/QUALITY/membership/capability evidence.
No browser tier or Stripe metadata grants repository, GitHub administration, merge, deploy or production mutation rights.

## H. Subscription-event implementation
Signed raw-body Stripe event verification uses HMAC SHA-256, timing-safe comparison, bounded freshness, allowed subscription event types and the explicit test/live bit.
An injected adapter requires a processed inbox receipt with identical payload SHA-256, provider subscription readback, customer binding, server price/product mapping, atomic event projection and readback.
The existing production Stripe sync / inbox is NOT wired to this module. The injected transactional provider MUST enforce exactly-once event processing, ordering, persisted unique keys and cancellation rollback; local Map fixtures are not production persistence.

## I. Usage receipt implementation
LOOP_AGENT_USAGE_RECEIPT@1 includes runId, tenantId, repositoryId, entitlementId, tier, UTC timestamps, modelCalls, providerCost EUR minor, computeCost EUR minor, toolCalls, ciCycles, repairCycles, humanIntervention, outcome and evidenceRefs. Receipt SHA-256 is deterministic with canonical object ordering.
Offline usage fixture is source-only, 0 provider/model calls, 0 cost, no real invoices. Actual idempotent allocation and concurrent quota must be enforced by existing service-only persisted ledger; not yet linked to this contract.

## J. Growth Intelligence projection and CADS
Vocabulary contains all 12 events: PRODUCT_VIEWED, PRICING_VIEWED, CHECKOUT_STARTED, SUBSCRIPTION_ACTIVATED, REPOSITORY_CONNECTED, FIRST_LOOP_STARTED, FIRST_LOOP_VERIFIED, LOOP_SUCCEEDED, LOOP_FAILED, HUMAN_INTERVENTION, LIMIT_REACHED, SUBSCRIPTION_CANCELED.
Synthetic receipts never yield verified marketing events. Even with a supplied test readback boolean, the projection does NOT claim real Growth evidence.
Primary activation: FIRST_LOOP_VERIFIED. Primary operational KPI: cost per successful outcome. Autonomy rate = 1 - interventions/eligible runs.
calculateLoopKpis returns null for zero denominators and rejects contradictory counts. It is a supplied-input read model, not authoritative production analytics.
CADS contract views: Pricing, Entitlements, Usage, Loop Economics, Growth Funnel. Empty states are NOT_PROVEN / NO_DATA / INSUFFICIENT_EVIDENCE as applicable; do not construct fabricated graphs or fork the existing Universe visual design.

## K. Tests executed
Local Node.js 22.16.0 offline test run: node --test server/loop-agent-product.test.mjs scripts/growth/loop-agent-productization-acceptance.test.mjs : 37 tests, 37 PASS, 0 FAIL.
Also node --check of affected source and CLI.
Coverage: valid mapping, unknown/inactive prices, trial policy, cancel/unpaid/past_due/unknown status, wrong tenant/user/customer/repository, forged/missing/stale entitlement, independent authority checks, quota boundary, fake concurrent admission, explicit event replay, invalid signature, forged processed inbox, missing readback, deterministic receipt, zero KPIs and CLI no real claims.
The event inbox, quotas and usage storage in the CLI are in-memory test doubles; parallel and persistence behavior MUST NOT be promoted to live. No real Stripe test checkout or Postgres integration was executed.

## L. CI evidence
Existing Unit Economics Tests workflow was extended with targeted source checks and synthetic acceptance tests; no new required check created.
At earlier head 26d8ca6ae9a597367a72e9adf615f279feb7bd6d the Unit Economics Tests, PostgreSQL 17 and Domain Governance checks completed successfully. This source was then revised; all applicable checks need to be observed on the final PR head. Until that completes, final CI = NOT_PROVEN; do not infer green from local tests.

## M. Security findings
Confirmed design risks requiring conservative denial:
- A metadata-only Stripe tier and client-forged tier could grant rights if trusted; explicit server mapping prevents that path.
- An unsignatured entitlement digest is not proof of persistence; require trusted readback.
- Missing nowMs could bypass expiry; explicitly validate nowMs.
- A supplied growth boolean cannot attest actual product outcomes; no verified event status emitted.
- Existing stripe_event_inbox synchronization and installed pilot migration remain NOT_PROVEN.
No secret keys, payment details, live Stripe write calls or production DB actions were used.

## N. SOLO2 findings and repairs
ARCHITECTURE: reuse existing Stripe and pilot components.
SECURITY/TENANT_ISOLATION: add exact tenant/subject/customer/repo binding, persisted readback and negative tests.
STRIPE_BOUNDARY: signature, mode, active recurring allowlist.
ENTITLEMENT_BOUNDARY: separate commercial grant from runtime action.
IDEMPOTENCY/REPLAY: deterministic test duplicate denial and adapter contract; durable production guarantee NOT_PROVEN.
QUOTA: positive/negative local atomic function doubles; real concurrent tenant-safe persistence NOT_PROVEN.
BILLING_EVIDENCE/GROWTH_EVIDENCE: synthetic zero-cost cannot make real claims.
CADS_COMPATIBILITY: data and empty-state contract only; no UI publishing.
ROLLBACK: branch-level file reversal, no live subscription/customer changes.

## O. Remaining blockers
P1: Authoritatively connect processed subscription inbox, Stripe customer binding and Loop tenant/repository ownership without relying on email, client or metadata.
P1: Implement and validate an isolated, durable, tenant-scoped entitlement and atomic usage storage using the existing database migration/RPC patterns, including crash/retry/concurrency, cancellation and readback.
P1: Attach server-only authorization lookup to the actual Loop Agent runtime, ensure independent repository policy, capability grant, TRUST, QUALITY and current provider evidence per run.
P1: Execute real six-variant Stripe test-mode subscription and cancellation E2E against an isolated test project; current price catalog and fixtures are NOT sufficient.
P1: Link confirmed provider cost and settled billing evidence to the existing unit economics / Growth paths; do not declare marketing metrics from fixtures.
Commercial owner action: approve Loop-specific package mapping, cost ceilings, terms, applicable tax/legal/privacy/processor readiness and any intended live enablement separately.

## P. Rollback
Revert this feature branch's source/test/workflow/docs modifications if necessary. No Stripe, Supabase, Render, GitHub merge/deploy, secret, customer or production data mutation was performed by this slice; rollback of such external state is not required.
No release switch was enabled. The existing application checkout, auth, CADS, billing and revenue components are unchanged.

## Q. Commercial readiness verdict
Product and adapter contracts: SOURCE_IMPLEMENTED.
Synthetic offline end-to-end: SOURCE_IMPLEMENTED (local automated tests passed), NOT TEST_MODE_VERIFIED.
Actual Stripe billing flow: NOT_PROVEN.
Persisted Loop entitlement authority: NOT_PROVEN.
Real product/Growth evidence: NOT_PROVEN.
COMMERCIAL_READY: BLOCKED. Do NOT make live claims, charge customers, activate production mutation or merge while the product's required P1 gaps remain.

Conservative next implementation: extend the existing Stripe event inbox and agent-operations RPC with tenant-scoped Loop entitlements in an isolated test environment, then complete actual signed subscription events, durable replay/quotas, operational readback and CI evidence before any commercial enablement.
