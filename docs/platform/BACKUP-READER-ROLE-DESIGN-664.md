# Backup Reader Role Design – Issue #664

## Goal
Define a least-privilege PostgreSQL role `capital_ai_backup_reader` that can perform a full `pg_dump` while being unable to write data or invoke `pg_cron` / `pg_net`.

## Role Attributes

```sql
CREATE ROLE capital_ai_backup_reader
  LOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  CONNECTION LIMIT 1;

ALTER ROLE capital_ai_backup_reader
  SET default_transaction_read_only = on;
```

## Required Grants (minimal)

- `CONNECT` on the target database
- `USAGE` on schemas that contain dump-relevant objects
- `SELECT` on tables, views, and sequences required for a complete dump
- `BYPASSRLS` only if proven necessary for a full dump (to be decided after inventory)

## Explicit Revokes

```sql
REVOKE ALL ON SCHEMA cron FROM capital_ai_backup_reader;
REVOKE ALL ON SCHEMA net FROM capital_ai_backup_reader;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cron FROM capital_ai_backup_reader;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA net FROM capital_ai_backup_reader;
```

## Negative Tests

Implemented in `scripts/platform/backup-reader-negative-tests.sql`.

All of the following must fail when executed as `capital_ai_backup_reader`:

- `INSERT` / `UPDATE` / `DELETE`
- `CREATE` / `DROP` (DDL)
- `cron.schedule(...)`
- `net.http_get(...)`
- Any write while `default_transaction_read_only = on`

## Residual Risk

`pg_net` `PUBLIC` privileges cannot be selectively revoked in Supabase managed environments. This residual risk must be documented as **BLOCKED** or mitigated by a time-bounded, isolated backup procedure with explicit owner approval.

## Execution Plan

1. Run `scripts/platform/backup-reader-inventory.sql` in an isolated PostgreSQL 17 instance.
2. Finalize the exact GRANT list based on the inventory output.
3. Create the role in the isolated instance and execute `backup-reader-negative-tests.sql`.
4. Document results (all negative tests must fail).
5. Obtain explicit owner approval before any productive role creation.

**No productive changes until step 5 is completed.**
