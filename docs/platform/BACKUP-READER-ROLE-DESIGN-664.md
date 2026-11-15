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
