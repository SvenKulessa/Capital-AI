# Backup Reader: least-privilege design and risk decision (Issue #664)

**Status: DESIGN / BLOCKED / NOT_ACTIVE.** This document does not authorize provisioning `capital_ai_backup_reader` or operating a production backup.

## What is actually verified

The repository already contains the isolated PostgreSQL 17.11 role-and-restore contract in `scripts/platform/backup-reader-contract-test.sh`, the read-only ACL inventory in `scripts/platform/backup-reader-inventory.sql` (merged via PR #729), and supplementary recovery slices in `scripts/platform/backup-recovery-slices-test.sh`. The existing `.github/workflows/backup-reader-pg17.yml` builds `.github/docker/pg17-reader.Dockerfile` and executes these contracts in a disposable environment. The current PR adds **no new runnable role-definition SQL**. Test evidence applies only to the exact commit and synthetic fixture where it ran.

The fixture tests `LOGIN`, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOREPLICATION`, `NOINHERIT`, `CONNECTION LIMIT 1`, absence of group memberships, and named-object `CONNECT`/`USAGE`/`SELECT` grants. `BYPASSRLS` is a separate, high-risk decision: the isolated tests establish its relevance to a complete `pg_dump` while also demonstrating its broader effect. No production `BYPASSRLS` or blanket `pg_read_all_data` grant is approved.

## The effective-rights blocker

- `default_transaction_read_only=on` is **only a default**, not a security boundary. The role can explicitly start a read-write transaction; tests therefore check actual object/function privilege denial with SQLSTATE `42501`, not only read-only errors.
- A role-specific `REVOKE` cannot cancel access inherited through `PUBLIC`. Observed Supabase `PUBLIC` privileges include `USAGE` on `net`, queue DML and executable functions such as `net.http_delete`; other reachable functions and `cron` need comparable evaluation. No global revocation or provider configuration change is within scope.
- An isolated test can revoke shared `PUBLIC` privileges **only inside its disposable database**. It cannot justify a production guarantee from the same role definition.
- The existing unrestricted exporter and a full Supabase recovery have a broader scope than the fixture dump. Auth, Storage object bytes, Vault/key portability, extensions, cron jobs, pgmq queues, owners/ACLs and GCS require separate verification.

The earlier experimental role SQL (with plain role creation and ineffective role-specific revokes), standalone negative SQL and runner were removed from this PR to avoid a misleading success signal and accidental execution. The authoritative implemented fixture and its version-pinned CI remain unchanged.

## Explicit production risk decision (Issue #664)

**RISK_REJECTED / NO_GO / AVOID** applies to provisioning a new permanently login-enabled production `capital_ai_backup_reader` as a purportedly read-only security boundary. This is a technical risk rejection, **not** an owner's acceptance of residual risk or permission to change production roles. The existing role-and-restore fixture is valid only for disposable PostgreSQL 17.11 instances. Reference: [Issue #664](https://github.com/SvenKulessa/Capital-AI/issues/664) (2026-11-15 recovery preflight and risk decision).

- A read-only production catalog check on 2026-11-15 confirmed PostgreSQL **17.11**, **zero** `capital_ai_backup_reader` roles, one `PUBLIC` `USAGE` ACL entry for the `net` schema, and seven `PUBLIC` `INSERT`/`UPDATE`/`DELETE` ACL entries on `net` relations. Counts are catalog entries, **not** executed network requests. No production functions or data were accessed.
- The isolated two-cluster fixture demonstrates `PUBLIC`-inherited `pg_net` enqueue even after per-role `REVOKE` and demonstrates `pg_read_all_data` opening the `pg_cron` scheduling path, with fixture operations rolled back. The existing negative tests deny writes, DDL, role escalation, and network/cron calls after **fixture-only** shared-ACL hardening. Their success does not establish equivalent restrictions on the managed service.
- **Do not propose or execute** blanket `pg_read_all_data`, unrestricted `BYPASSRLS`, per-role `REVOKE` as a substitute for `PUBLIC` isolation, or a permanent password-based production reader. `default_transaction_read_only=on` and `NOINHERIT` are insufficient security guarantees.
- The separate recovery project contains existing identities/jobs and has no independently verified network-egress isolation. Real Auth/MFA, Storage object bytes, Vault root-key portability, ACL/owner mapping, disabled cron/webhooks, independent encrypted offsite retrieval and measured RPO/RTO remain **NOT_PROVEN**. A PostgreSQL dump alone does not include Storage object bytes.
- **Reconsider only after** an independently verified, narrowly time-boxed, owner-authorized alternative with credential, runner, outbound-network and restore-target isolation, complete encrypted backup coverage, negative tests and an explicit residual-risk decision. This paragraph does not grant that authorization. No production SQL, role, provider, backup, or deployment change is in scope.

## Safe decision sequence

1. Treat the isolated PG17.11 tests as **synthetic evidence only** and inspect exact-head CI.
2. Use the previously recorded catalog and recovery-scope inventory to design a real object-level allowlist; do not infer effectiveness from grant statements alone.
3. Leave production provisioning, SQL changes, backup and restore **BLOCKED** until independently evidenced, separately authorized owner-operated procedure and residual-risk decision.

Rollback for this documentation-only PR is a Git revert. Production systems and permissions must remain unchanged.


## Candidate: scoped RLS-aware export without role-wide BYPASSRLS (2026-11-25)

Evidence [#7153542148](https://github.com/SvenKulessa/Capital-AI/issues/664#issuecomment-7153542148) confirms the only currently mapped JIT role is `postgres`, with CREATEDB, CREATEROLE, REPLICATION, BYPASSRLS and effective DML/net/cron privileges. The computed remaining lifetime was zero; the raw value and unit/sentinel semantics are not established. Do not use this mapping as a least-privilege export identity. The existing exporter remains unchanged and fail-closed.

The existing isolated PG17 test now includes an additional, table-scoped alternative: `pg_dump --enable-row-security --inserts --data-only --table=app.notes` with NOBYPASSRLS. It contrasts an apparently successful zero-row dump with a synthetic table-specific SELECT policy addressed only to the fixture reader. The test imports each archive into the existing isolated restore cluster, checks the exact expected row set, rolls back, and checks the original restore fingerprint and tenant visibility. This is **not a full backup** and the fixture-only policy must never be applied directly to production. CI results are recorded separately at the exact tested head. An INSERT-format dump avoids COPY/row-security incompatibility; default pg_dump behavior remains fail-closed for incomplete RLS access. Restrictive policies, partitions, sequences, other schemas, ACLs, Auth, Vault and Storage bytes require separately scoped completeness evidence. No broad BYPASSRLS or automatic production policy generation.

JIT lifecycle design (not provisioned): bind an approved dedicated role and operator to explicit source project, allowlisted objects, network ranges, finite expiry with documented unit, no persistent password, and independently tested new-connection denial after expiry/revocation plus termination of only the exact dedicated role's remaining sessions. Do not infer session termination from a mapping expiration. A provider JIT mapping authenticates an existing database role; it does not override effective PUBLIC grants. The synthetic RLS test does not remove the net/cron blocker. No provider-supported cost-neutral complete backup path with enforced write isolation has yet been established for this Free project. The provider read-only SQL API is a catalog/read interface, not a complete dump/restore path. Read replicas, paid backups or new resources are not authorized. No production export, role change, global ACL adjustment or live connection is enabled by this change.
