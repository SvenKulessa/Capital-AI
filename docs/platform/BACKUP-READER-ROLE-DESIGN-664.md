# Backup Reader: least-privilege design and risk decision (Issue #664)

**Status: DESIGN / BLOCKED / NOT_ACTIVE.** This document does not authorize provisioning `capital_ai_backup_reader` or operating a production backup.

## What is actually verified

The repository already contains the isolated PostgreSQL 17.11 role-and-restore contract in `scripts/platform/backup-reader-contract-test.sh` and the supplementary recovery slices in `scripts/platform/backup-recovery-slices-test.sh`. The existing `.github/workflows/backup-reader-pg17.yml` executes them in a disposable environment. The current PR adds **no new runnable role-definition SQL**. Test evidence applies only to the exact commit and synthetic fixture where it ran.

The fixture tests `LOGIN`, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOREPLICATION`, `NOINHERIT`, `CONNECTION LIMIT 1`, absence of group memberships, and named-object `CONNECT`/`USAGE`/`SELECT` grants. `BYPASSRLS` is a separate, high-risk decision: the isolated tests establish its relevance to a complete `pg_dump` while also demonstrating its broader effect. No production `BYPASSRLS` or blanket `pg_read_all_data` grant is approved.

## The effective-rights blocker

- `default_transaction_read_only=on` is **only a default**, not a security boundary. The role can explicitly start a read-write transaction; tests therefore check actual object/function privilege denial with SQLSTATE `42501`, not only read-only errors.
- A role-specific `REVOKE` cannot cancel access inherited through `PUBLIC`. Observed Supabase `PUBLIC` privileges include `USAGE` on `net`, queue DML and executable functions such as `net.http_delete`; other reachable functions and `cron` need comparable evaluation. No global revocation or provider configuration change is within scope.
- An isolated test can revoke shared `PUBLIC` privileges **only inside its disposable database**. It cannot justify a production guarantee from the same role definition.
- The existing unrestricted exporter and a full Supabase recovery have a broader scope than the fixture dump. Auth, Storage object bytes, Vault/key portability, extensions, cron jobs, pgmq queues, owners/ACLs and GCS require separate verification.

The earlier experimental role SQL (with plain role creation and ineffective role-specific revokes), standalone negative SQL and runner were removed from this PR to avoid a misleading success signal and accidental execution. The authoritative implemented fixture and its version-pinned CI remain unchanged.

## Safe decision sequence

1. Treat the isolated PG17.11 tests as **synthetic evidence only** and inspect exact-head CI.
2. Use the previously recorded catalog and recovery-scope inventory to design a real object-level allowlist; do not infer effectiveness from grant statements alone.
3. Leave production provisioning, SQL changes, backup and restore **BLOCKED** until independently evidenced, separately authorized owner-operated procedure and residual-risk decision.

Rollback for this documentation-only PR is a Git revert. Production systems and permissions must remain unchanged.
