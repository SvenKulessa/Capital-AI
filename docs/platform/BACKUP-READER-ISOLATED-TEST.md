# Isolated Backup Reader Test – Execution Guide

## Purpose
Run inventory, role creation, and negative tests for `capital_ai_backup_reader` in an isolated PostgreSQL 17 environment (Issue #664).

## Prerequisites
- Docker installed and running
- Repository checked out

## Run the full test

```bash
chmod +x scripts/platform/backup-reader-isolated-test.sh
./scripts/platform/backup-reader-isolated-test.sh
```

## What the script does
1. Builds the pinned PostgreSQL 17 fixture (`.github/docker/pg17-reader.Dockerfile`)
2. Starts an isolated container (`--network none`)
3. Creates sample data
4. Runs the inventory script
5. Creates the backup reader role
6. Executes negative tests
7. Removes the container

## Expected result
All statements in `backup-reader-negative-tests.sql` must fail with permission or read-only errors.

## Manual execution (without Docker)
If Docker is not available (e.g. in Acode), run the SQL files individually against an isolated PostgreSQL 17 instance:

```bash
psql -f scripts/platform/backup-reader-inventory.sql
psql -f scripts/platform/backup-reader-role-draft.sql
psql -U capital_ai_backup_reader -f scripts/platform/backup-reader-negative-tests.sql
```

## Files
- `scripts/platform/backup-reader-isolated-test.sh` — full automated runner
- `scripts/platform/backup-reader-inventory.sql` — inventory queries
- `scripts/platform/backup-reader-role-draft.sql` — role creation (draft)
- `scripts/platform/backup-reader-negative-tests.sql` — negative tests
- `docs/platform/BACKUP-READER-ROLE-DESIGN-664.md` — role design

**Do not run against production.**
