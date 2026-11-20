# CAPITAL-AI Unit Economics · PostgreSQL 17 isolated durable ledger

Contract: CAPITAL_AI_UNIT_ECONOMICS_ISOLATED_LEDGER@1
Domain: GROWTH · TRUST/PLATFORM review
Baseline: main c4712b44fa6ca4672953b723d0e2aa956751f1f7
Admission: SOURCE_CANDIDATE / SYNTHETIC_ISOLATED_ONLY / PRODUCTION_DDL_NOT_AUTHORIZED
Files: supabase/migration-candidates/20261120045100_unit_economics_isolated_ledger.sql;
server/unit-economics-ledger-staging.mjs; scripts/unit-economics-ledger-pg-integration.mjs.

## Existing authoritative contracts

PR #850 deterministic Unit-Economics read model and PR #853 reconciliation remain
read-only, not a financial ledger. PR #856 supplies tenant-verified read adapters,
but real Stripe inbox coverage and actual provider-billed EUR run costs are not
admitted to production. Unit Economics cannot promote unverified Stripe cash to
recognized revenue or calculate production contribution margins.

This slice persists **synthetic, explicitly incomplete** reconciliation projections.
It cannot be used as customer accounting, debit/credit balances, pricing authority,
Stripe entitlement, payment invoice, audited profitability statement or financial
reporting authority. Nothing is applied to production. The SQL is deliberately in
supabase/migration-candidates/, not supabase/migrations/.

## Trust / tenancy / provenance

Internal-only createUnitEconomicsLedgerStaging requires a server-authorized
resolveTenant callback, the existing reconcile callback and explicitly injected
record/reverse/read executors. There is no HTTP endpoint, automatic database
connection, environment credential lookup, X/Stripe call or renderer activation.
The verified single Supabase user UUID is passed to SQL; no browser-supplied
tenantId is trusted. Multi-user organization tenancy remains NOT_PROVEN.

The private capital_ai_ue schema has three append-only structures:
- snapshots: tenant/source bound immutable time-period aggregates, request and
  source SHA256, deduplicated by (tenant,idempotency key) and (tenant,source hash).
  Negative net cash is legitimate; fees and costs are nonnegative EUR minor units.
  Every row is SYNTHETIC_ISOLATED and accounting_eligible=false by CHECK.
- run_allocations: per-tenant unique run UUID, SHA256 evidence reference and
  inference/tool costs. A run cannot be allocated to two snapshots for the same
  tenant. Aggregate cost and run counts must equal line-level totals in the
  SQL transaction; malformed, oversized and PII-bearing extra keys are denied.
- reversals: immutable compensating record, unique per original snapshot
  and tenant; no DELETE/UPDATE of source snapshots.

All three tables have RLS enabled, explicit denial for API roles and revoked
direct grants including service_role. Three SECURITY DEFINER functions are in
the private schema, with empty search_path and EXECUTE granted only to
service_role. A service_role is privileged; its server caller must authenticate
and verify the tenant itself. These SQL functions alone cannot guarantee a
malicious service-role client has the authority to choose a tenant; NEVER bind
them to client input or expose the schema in the public Data API.

The staging bridge validates schema/version, EUR, period, aggregate totals,
actual provider-cost evidence fields and source qualification before invoking
a supplied executor, returning a redacted error on failure. SHA256 binds the
canonical tenant + source + aggregated data. Hashes are integrity references,
not proofs of actual Stripe receipt or independently paid provider invoice.

## Crash recovery and idempotency

The atomic record_snapshot function uses a per-tenant PostgreSQL transaction
advisory lock, checks same-key replays, source duplicates and conflicts before
writing the parent plus all run allocations in one transaction. Same input and
key returns the immutable original ID after a lost response or process restart;
different content under the same key returns conflict. Different keys for one
source fingerprint never allocate costs twice. Concurrent clients for the
same key cannot both create a row. Different tenants can reuse keys without
seeing each other's records.

The reverse_snapshot function writes a compensating reversal atomically.
An exact second reversal replays, a changed reversal conflicts and an unknown
or cross-tenant snapshot returns not_found. Subsequent record replays return
reversed; the original snapshot and run allocation remain intact for audit.

## PostgreSQL 17.11 integration / restore evidence

The repository's existing pinned Postgres 17.11 GitHub service image is reused
in a new optional Unit Economics PostgreSQL 17 job on the existing Unit
Economics Tests workflow. Only disposable CI database ue_ledger_ci is used;
no Supabase credentials or network access to a live project. The job verifies:
- schema privileges, ACL/RLS enforcement, service-only RPC access
- SHA/versioned inputs, broken run totals and foreign-key denials
- same key replay, changed key conflict, duplicate source, duplicate run
- two concurrent tenants and 12 parallel same-key writers
- explicit BEGIN/ROLLBACK and terminated PostgreSQL backend while waiting
  in PgSleep with an open transaction: no committed parent/line; exact retry creates once
- immutable reversal, retry, conflicting reversal and cross-tenant denial
- real PostgreSQL 17 pg_dump custom-format export and pg_restore into
  a separate fresh ue_ledger_restore_ci database. Restored counts, sorted
  full-row SHA references and deterministic content fingerprints for **each** of
  snapshots, run_allocations and reversals; restored RLS and explicit-deny
  policies across all three tables; revoked direct privileges for anon,
  authenticated and service_role; and service-only EXECUTE on all three RPCs.
  A truncated custom-format backup must fail its own independent restore.
  Idempotency behavior and tenant isolation must match the source.
  restoreVerified=true only after every assertion.

The synthetic restore uses a fresh isolated database inside the disposable
CI PostgreSQL service, not production or customer data. It is evidence of this
candidate ledger's logical schema/data restore, not physical PITR,
storage/auth/vault restore, WAL RPO/RTO or production restore readiness.
Production backup/restore, owner approval and a versioned production
admission remain separately required.

## Execution, rollback, further admission

Run with pinned CI PostgreSQL job and a service container identified by
PG_LEDGER_CONTAINER_ID (no arbitrary production connection target).
The unit suite also executes source contract and bridge negative tests.
No new GitHub required checks are created; existing Docker Security Gate and
Domain Governance remain authoritative.

To revert the implementation, revert the source-only PR. The isolated CI DBs
are ephemeral and discarded after the run. Reverting a production migration
is NOT authorized or described as safe: production has not received this SQL.

Before any production DDL/DML, require separate explicit owner authorization,
isolated target-environment backup, verified restore including auth/storage
relevant to real tenancy, RLS/role grant audit, provider-source completeness,
replay/rollback policy and retention/GDPR review. Current status:
PRODUCTION_ADMISSION_NOT_PROVEN.

## 2026-11-20 production admission check

The repository and project readback identified the active Supabase production
project `ryzywoktpmyhwzxmstyu` (PostgreSQL 17.11, eu-west-1). The private
`capital_ai_ue` schema was absent on the read-only preflight. A separate
recovery/test project exists, but **no actual production-sourced backup with
a successful isolated restore of the production database** has been verified
against the current source SHA and recovery time. Previous disposable CI
snapshots represent only synthetic data, and the existing backup control
journal was unavailable at readback. Supabase managed-backup availability,
PITR retention, original production Auth/Storage/Vault recovery and a
complete roll-forward/rollback plan are also not proven.

The human owner explicitly authorized a production migration in this new
request; authorization does not substitute for a verified recoverable backup.
Production migration remains **BLOCKED** by the technical restore admission
condition (not by an invented second approval). Never run
`supabase/migration-candidates/20261120045100_unit_economics_isolated_ledger.sql`
against production while these facts remain unverified. Its
`SYNTHETIC_ISOLATED` / `accounting_eligible=false` CHECKs and absent live
usage/invoice sources additionally prevent accounting promotion.

Next technical requirement: independently read back a current recovery point,
obtain a protected production-sourced dump or equivalent provider backup,
restore to a *separate isolated target*, verify auth/ACL/tenancy and full
schema/record digests without exporting customer PII to GitHub, then
re-evaluate whether a production-specific migration (rather than this
synthetic-only candidate) is appropriate. No production DDL or DML is
initiated by this PR.
