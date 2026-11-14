# CAPITAL-AI Docs-as-Code · DOCSYNC-02 Synthetic Delta Planner

**Scope:** `CA-PLATFORM-DOCSYNC-02` on a stacked feature branch based on PR #705 at `39273e52a437af9d2b10feb3d4579341070fcdd2`; GitHub remains Source of Truth. **Offline only:** no Drive OAuth, no network requests, no remote writes, no Terraform, merge or deployment.

## Versioned inputs and explicit boundaries

- Use the existing `scripts/upload-drive/mapping.v1.json` (`mode=DRY_RUN_ONLY`, auth `NONE`, exact approved Markdown allowlist, class exclusions, existing logical Drive folders). No real Drive folder IDs are committed.
- Supply a **private synthetic** `capital-ai.doc-tree-pages.v1` inventory containing `rootKey`, synthetic `rootId` and ordered `pages[]`: `pageToken` (null on the first), `nextPageToken` (null on the last), `folders[]`, `files[]`. Every file must have a stable source key, unique ID, parent ID, approved basename, SHA-256, positive string revision, and ETag. Each page is capped at 200 files and 200 folders; at most 100 pages. Missing, reordered, cyclic, duplicated and malformed pages are rejected.
- Supply the checked source Git SHA through `--source-sha` (40 lowercase hex characters). This is a **caller claim**, not independent GitHub attestation; bind independently before using real provider data.
- Optional **private local** `capital-ai.doc-tree-state.v1` stores only stable source key, remote ID, parent ID, SHA-256, revision and ETag with source SHA and root ID. Never commit state, token, raw Drive inventory or audit output.

## Exact planner behavior

The planner reuses `drive-sync-plan.mjs` and its fail-closed classification, `O_NOFOLLOW`/hardlink checks, stable source IDs and read-only CREATE/UPDATE/SKIP/CONFLICT/BLOCKED actions.

- `PLAN_CREATE` is proposed only when target root and parent folders have been verified within the *synthetic* snapshot, the document is explicitly approved, the target name has no collision, and no remote tracking entry existed. A proposed create is **never recorded as completed** in private state.
- `PLAN_UPDATE` requires a previously confirmed private record with identical remote ID, parent, SHA-256, ETag and revision. The audit contains the **expected ETag and revision** for a hypothetical future conditional write and a **hash of the target ID**, not the raw remote ID. Any remote change is a `CONFLICT`, never an overwrite.
- `SKIP` requires identical document/content digest. Only SKIP may be reflected in the proposed `confirmedState` (which is not persisted by the CLI).
- Missing previously tracked remote IDs, duplicate remote IDs or names across pages, escaped paths, cross-folder ancestry, stale ETags/revisions, invalid page token sequence and malformed state fail closed.
- The JSON CLI prints sanitized audit rows and summaries, excludes the `confirmedState` with raw private IDs, and rejects `--apply`, `--write-state`, `--oauth` or other unknown flags. It performs **no provider API operation**.

## Atomic local state mechanism

The exported `savePrivateStateAtomic` is an explicitly invoked **local** function, not called by the CLI. It validates schema, refuses symlink targets, uses an exclusive `.lock`, compares the previous file's SHA-256 before overwrite, creates a private `0600` temporary file, writes and fsyncs it, atomically renames, and fsyncs its containing directory. It never accepts secrets and never alters Google Drive. Tested crash-before-rename preserves original state and removes temporary files/locks. Calling it is *not* evidence that remote changes were applied.

## Reproduction

```
node --check scripts/upload-drive/drive-sync-plan.mjs
node --check scripts/upload-drive/drive-sync-delta.mjs
node --test scripts/upload-drive/drive-sync-plan.test.mjs scripts/upload-drive/drive-sync-delta.test.mjs
```

The CLI accepts a private synthetic fixture only:

```
node scripts/upload-drive/drive-sync-delta.mjs \
  --mapping scripts/upload-drive/mapping.v1.json \
  --docs-root docs \
  --pages /private/synthetic-pages.json \
  --source-sha <verified-40-character-sha>
```

Path placeholders in the example are not provisioning instructions. No new GitHub Required Check is introduced; the new test is referenced through the existing `test:audit-regressions` command. A successful synthetic run establishes no effective remote Drive permissions, actual revisions, provider idempotency, or customer-facing publication.

## Rollback, outstanding evidence and costs

Rollback: revert `drive-sync-delta.mjs`, its tests, this document, the package test-script addition and the two Roadmap status/evidence-reference lines, leaving PR #705 base untouched. **Local sandbox tests: VERIFIED** when separately logged; **actual provider readback, state across real runners, IAM, uploads, remote mutation and production runtime: NOT_PROVEN**. Cloud spend remains 0 from this scope; future authenticated reads/writes need independent Owner authorization, full licensing/privacy review and rights scoping.
