# Backup-Reader: isolated PostgreSQL-17 regression (Issue #664)

**Status:** Existing isolated PG17.11 test contract is implemented in `main`. No additional Dockerfile, standalone role-provisioner or SQL-negative-test runner is introduced by this PR.

## Use the existing, pinned test implementation

- Workflow: `.github/workflows/backup-reader-pg17.yml` (`PG17 Backup Reader Contract (isolated)`)
- Role, RLS, PUBLIC/pg_net/pg_cron, permission-denial and two-cluster pg_dump/restore tests: `scripts/platform/backup-reader-contract-test.sh`
- Synthetic Auth/Storage/Vault/ACL recovery tests: `scripts/platform/backup-recovery-slices-test.sh`

The existing workflow builds a pinned PostgreSQL 17.11 image with version-matched extension build headers and runs these scripts inside an unprivileged, offline container with an isolated temporary PostgreSQL environment. Run the **existing** workflow on the intended exact commit; previous successful runs do not validate a changed PR head.

The removed experimental runner referred to `.github/docker/pg17-reader.Dockerfile` and `scripts/platform/backup-reader-inventory.sql`, neither of which was present in this PR's checkout. It also ignored inventory/negative-test exit status with `|| true`, used no SQLSTATE assertions, omitted an independent restore, and could report completion after untested failure. Its manual instructions could cause accidental role creation against an unintended database. Do not use copies of that runner.

## Evidence criteria

The PG17 contract checks both allowed reads and prohibited writes, including a deliberate `BEGIN READ WRITE` override of the role default, explicit SQLSTATE assertions, extension privilege paths and source/restore fingerprints. It does **not** prove production role isolation or that a production dump includes Supabase Auth/Storage bytes, Vault keys, jobs and external provider dependencies.

**Production status:** `BLOCKED / NOT_ACTIVE`. No productive role creation, credential use, backup, GCS upload, SQL migration or cutover is authorized by this document. See `docs/platform/SUPABASE-BACKUP-READER-CONTRACT.md` and Issue #664 for the evaluated residual rights.
