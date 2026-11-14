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

## Negative Tests (must fail)

- `INSERT` / `UPDATE` / `DELETE` / `DDL`
- `cron.schedule(...)`
- `net.http_get(...)`
- Any write while `default_transaction_read_only = on`

## Residual Risk

`pg_net` `PUBLIC` privileges cannot be selectively revoked in Supabase managed environments. This residual risk must be documented as **BLOCKED** or mitigated by a time-bounded, isolated backup procedure with explicit owner approval.

## Next Steps

1. Run inventory script in isolated PG17
2. Finalize exact GRANT list based on inventory
3. Implement and execute negative tests
4. Obtain owner approval before any productive role creation

**No productive changes in this document.**
