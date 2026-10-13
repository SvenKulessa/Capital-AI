# CAPITAL-AI Owner-only Stripe Product Test Lab
Status 2026-10-13: Branch implementation only; NOT deployed.
Authority: AGENTS.md / SOLO_MAINTAINER_FLOW@1.

## Isolation

The Profile selector is visible only to an authenticated Owner, and every
API endpoint verifies a real Supabase session and the Owner IAM role.
Test mode is strictly an **owner-specific testing namespace in the existing
Supabase project**, not a switch of the production Supabase database and not
a separate Supabase project.

Production is a **read-only view** in this panel; it never creates a
live Checkout Session. Existing customer Stripe live checkouts remain
unchanged and run on their configured production secret.

Saved selection/price mappings live in the server-only table
public.capital_ai_owner_product_lab. RLS is enabled; anon/authenticated
have no table privileges; service_role access remains exclusively at the BFF.
Mutations require verified same-origin requests and a strict SKU allowlist.

Exactly nine Stripe live-price entries: Starter/Pro/Enterprise monthly and
annual, Vocabulary, CAP-BP-001, CAP-BP-002. Three existing test-mode monthly
prices are reused. Test Products/Prices for remaining entries are created
only on the Owner's explicit button click. Strict amount, recurring interval,
tax behavior, active status and environment parity validation applies.

Test Checkout metadata and client_reference_id are deliberately namespaced:
capital_ai_owner_testlab / ownerlab-UUID instead of production user_id or
plan_id subscription authority. Test checkouts never grant production rights.
The test-result API reads Stripe's test session using the test secret and
checks bound Owner identity before confirming the synthetic payment.

WARNING: Test mode covers payment-flow testing, NOT live entitlement or
feature-access rollout, tax compliance, Blueprint licensing, actual
screen-reader certification or a separate Supabase Auth sandbox.

## Required server-side configuration

STRIPE_TEST_SECRET_KEY: Private test secret from the CAPITAL-AI Stripe test
environment, e.g. sk_test_*. Required for test Stripe calls.
STRIPE_SECRET_KEY: Existing LIVE secret remains unchanged; read-only
source Price parity checks in the Owner test path.
SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY: Existing server-only
key for isolated table CRUD. Never send secrets to JS, GitHub or chat.

Android Owner-only action: Stripe Dashboard -> CAPITAL-AI -> Test mode ->
Developers -> API keys -> copy TEST secret; Render -> AICapital ->
Capital-AI web service -> Environment -> add STRIPE_TEST_SECRET_KEY.
Never replace STRIPE_SECRET_KEY, never add VITE_ prefix or include
keys in screenshots. Configure before declaring test checkout ready.

## Acceptance and rollback

Run node --test server/owner-product-lab.test.mjs and node --run
test:learning-portal; build and applicable PR checks (Docker Security Gate,
Domain Governance). Verify only Owner can select/clone/checkout, no POST
through live Stripe key, amount/tax parity, mobile 320/390 px, session
identity, successful test payment confirmation and customer live-checkout
regression. After merge verify production /healthz and source SHA separately.

No new Render resource or Supabase branch, and no paid plan activation.
Hosting usage and provider quotas not proven; monitor existing budget.
Rollback: revert feature code; do not rotate/replace production Stripe
credentials as a rollback mechanism. Any schema deletion is separately
reviewed before execution.
