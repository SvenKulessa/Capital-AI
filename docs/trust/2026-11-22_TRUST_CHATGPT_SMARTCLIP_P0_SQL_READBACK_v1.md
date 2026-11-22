# SmartClip P0 — SQL- und Webhook-Evidence
Date: 2026-11-22 | Repo: SvenKulessa/Capital-AI | Scope: PR #916
Contract: SOLO_MAINTAINER_FLOW@2 | TRUST / PLATFORM | No live activation
Source of truth: docs/platform/smartclip-sandbox-sql-candidate-20261122.sql
Target branch: capital-ai-growth/smartclip-sandbox-commerce-20261122

## Verified by actual provider/database readback

A *separate* non-production Supabase project named `capital-ai-recovery-664-test` was inspected; its project ID differs from CAPITAL-AI production. Initial read-only SQL showed PostgreSQL 17.11, with neither `private` schema, SmartClip ledger nor SmartClip RPC installed.

The PR's SQL candidate was executed under a single explicit `BEGIN ... ROLLBACK` transaction, with synthetic UUIDs and Stripe-shaped test IDs. The first run created the missing schema within the transaction, executed the candidate, and asserted:
- `anon` and `authenticated` have no EXECUTE on the RPC; `service_role` does.
- Anonymous/authenticated table SELECT access is denied.
- Valid grant succeeds; duplicate identical grant returns the same effective paid status and one ledger row.
- A different user cannot claim the same Stripe payment intent.
- A different SHA-256 cannot grant access.
- Full refund *before* payment success creates a durable revocation tombstone; later grant returns false.
- Refund/dispute *after* a grant revokes entitlement, and a subsequent delayed grant stays denied.
- Access is false after revocation and true only while an independent valid purchase remains active; revoking that purchase returns false.

Database tool result: `rollback_verified=true`. A second verification after changing the SQL candidate to create a missing private schema returned `rolled_back=true`. Both assertions checked that no SmartClip function/schema remained after rollback. No live database, user account, Stripe charge, or permanent test-database object was modified by this procedure.

Evidence level: **SQL_TRANSACTION_TESTED=VERIFIED**. Not evidence of a deployed migration, a committed grant, or a concurrent multi-connection workload.

## Source changes

- SQL candidate adds `CREATE SCHEMA IF NOT EXISTS private` to support otherwise empty isolated sandboxes. This is not permission to deploy it to production; no existing schema grants are altered by this addition.
- `server/smartclip-sandbox-commerce.test.mjs` adds a 24-way concurrent simulated signed webhook dispatch, and an explicitly staged in-flight grant / full refund / delayed grant race. Both use a mocked provider and in-memory ledger to test HTTP orchestration; neither proves PostgreSQL cross-session locking.
- The pre-existing regression suite covers forged/stale signatures, unverified payments, wrong SKU/digest, duplicate receipts, cross-channel attempts, partial/full refunds and provider outages.

## Not proven / limits

- **DB_CONCURRENT_TRANSACTIONS=NOT_PROVEN**: No durable dedicated SmartClip testing database was designated. The recovery-test project was used exclusively inside ROLLBACK transactions; a real two-connection race needs a separately designated ephemeral PostgreSQL database or authorized test branch with isolated credentials.
- **DATABASE_MIGRATED=NOT_PROVEN**: Candidate intentionally not applied.
- **STRIPE_TEST_PAYMENT=NOT_PROVEN**: Real end-to-end provider checkout and webhook callback not executed.
- **STRIPE_TEST_TAX_READY=BLOCKED**: Stripe Tax settings active but zero active German tax registrations in test-mode readback. Product tax-code/account tax obligations not attested.
- **STRIPE_MANAGED_PAYMENTS_MOR=NOT_PROVEN**; **ACODE_CONTRACT=WAIT**; **ACTI_PAID_CHANNEL=HOLD**.
- **LIVE_CHECKOUT=BLOCKED**; **MERGE=HOLD**; **PUBLISH=BLOCKED**.

## Revalidation

After any change: rerun `npm run test:smartclip-sandbox`, inspect Docker Security Gate and Domain Governance at the **new PR head SHA**, test the SQL transaction again in a separate rollback-safe environment, and independently validate Postgres multi-connection races before declaring the entitlement subsystem race-proof.

Never store private provider keys, Stripe webhook signing secrets, real customer data or personal identifiers in test fixtures or evidence.
