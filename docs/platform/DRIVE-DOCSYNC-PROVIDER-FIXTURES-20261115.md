# CAPITAL-AI · DOCSYNC-02 Offline Provider Contract Fixtures

**Authority:** Root `AGENTS.md` (`SOLO_MAINTAINER_FLOW@2`). **Domain:** PLATFORM with TRUST boundaries. **Scope:** synthetic-only regression tests, not a Google Drive integration or an extra required CI gate.

## Exact baseline and behavior

Repository baseline at the start of this scope: `SvenKulessa/Capital-AI`, `main@f1c00449b9eb813e26d038fbb27c4be30714afc1` (2026-11-15). The original DOCSYNC admission and delta files are not changed. GitHub remains the only source of truth. `mapping.v1.json` stays `DRY_RUN_ONLY` with auth mode `NONE`, zero remote access, and an explicit document allowlist.

The new `scripts/upload-drive/drive-sync-provider-fixtures.mjs` **only** processes in-memory, finite mock responses for `LIST_ONLY`. It imports the existing `collectPages()` validation and does not import a network client, OAuth, Drive SDK, authentication or filesystems. It has no command-line `--apply`, no provider client or external side effects. Its output is a synthetic `capital-ai.doc-tree-pages.v1` fixture and a redacted summary (`networkRequests=0`, `providerWrites=0`, `credentialReads=0`). It does not save state or claim real provider rights.

The test contract checks:

- HTTP-like 429/500/502/503/504 transient *fixture* responses; at most three deterministic attempts, capped/validated `Retry-After`, no real delays or network retry loops, failure after exhaustion.
- Nonretryable 401/403/404/412 responses, including permission revocation during a later page. These terminate without proposing a successful snapshot.
- Ordered, bounded synthetic page tokens; end-of-pagination is mandatory. Missing, malformed, repeated, cyclic, reordered, oversized or post-terminal pages fail closed.
- Mock read-only grants tied to the exact root/folder IDs; no wildcards, out-of-root data, hidden folders, unlisted parents, duplicate names/IDs or foreign folders. Status or metadata cannot smuggle credentials/links into the returned inventory.
- A replayed file inventory passed to the **existing** `buildDeltaPlan()` still detects stale remote revisions/ETags or hashes as `CONFLICT`; matching tracked objects may result in `SKIP`, and legitimate changes are only `PLAN_UPDATE` with the expected revision/ETag. Neither proposed operation writes to Drive.

All statuses and rights are simulated inputs, **not observed Google responses**. There is no evidence of service-account or owner OAuth access, correct real Drive API pagination, live IAM, token expiry, latency, data rights, uploading, retry semantics with the real provider, or production readiness. Do not promote any of those to `VERIFIED` from this fixture suite.

## Reproduction and rollback

```bash
node --check scripts/upload-drive/drive-sync-provider-fixtures.mjs
node --check scripts/upload-drive/drive-sync-provider-fixtures.test.mjs
node --test scripts/upload-drive/drive-sync-plan.test.mjs scripts/upload-drive/drive-sync-delta.test.mjs scripts/upload-drive/drive-sync-provider-fixtures.test.mjs
```

The new test file is added to the existing `test:audit-regressions` npm script; no new required check, workflow or dedicated admission layer is introduced. The scoped rollback removes the new module/test/document and the one package-script reference. No Drive data, Terraform, deployment, credential, backup or state file can be affected by that rollback.

## Evidence classification

- `VERIFIED` (local): baseline DOCSYNC source/test Git blob SHA-1 values independently match the GitHub default-branch objects; new Node tests and `node --check` have real exit-0 logs.
- `VERIFIED` (CI): only when the existing required CI workflows complete successfully at the exact new feature-branch head; run IDs should be added to PR evidence.
- `NOT_PROVEN`: real authenticated read, provider pagination/ETag behavior, Drive permission binding, runtime impact.
- `BLOCKED`: provider enablement, new paid services or any remote mutation without separate authorized evidence.
