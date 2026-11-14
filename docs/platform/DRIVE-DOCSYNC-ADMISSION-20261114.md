# CAPITAL-AI · Docs-as-Code Drive Mapping & Admission (DOCSYNC-01 / DOCSYNC-03)

**Scope:** `SvenKulessa/Capital-AI`, `SOLO_MAINTAINER_FLOW@2`, PLATFORM + TRUST.
**State:** Implemented offline/synthetic dry-run planner. Google Drive authentication, folder creation, uploads, update and bidirectional sync remain **NOT_IMPLEMENTED / NOT_PROVEN**. Not a new required CI gate, not a new authorization policy; `AGENTS.md` remains authoritative.

## Existing Drive layout

Read-only owner-Drive inventory, 2026-11-14, under existing `CAPITAL-AI` folder: `PRODUCT`, `MARKET`, `PLATFORM`, `TRUST`, `GROWTH`, `Learning-Hub`, `Evidence`, `Growth-Media`, `PRIVATE-BACKUPS`, `CAPITAL-AI-CODE-TRANSFER-20261012`. No folder IDs, user emails, keys, private inventories, OAuth tokens or service-account JSON are written to GitHub. The mapping uses **logical names**, never creates another numerically prefixed parallel hierarchy. Existing encrypted backup path is outside this workflow.

## Contract and admission behavior

- Source of truth is `SvenKulessa/Capital-AI` at a separately recorded source SHA. `scripts/upload-drive/mapping.v1.json` is a versioned, reviewable, **dry-run-only** configuration with an explicit one-document allowlist. Folders and `docs/**` path prefixes have declared classifications. Unmatched paths default to `RESTRICTED`. `PUBLIC`, `INTERNAL`, `RESTRICTED` and `SECRET` are distinct states, not automatic permissions. A path must be explicitly allowlisted **and** classified `PUBLIC` or `INTERNAL` to be eligible for a future operation.
- `docs/security`, `docs/compliance`, `docs/evidence` and `docs/licenses` are hard-restricted even if a future file override attempts promotion. Sensitive filenames, storage backups, encrypted archives, credentials, keyfiles, `.env` and non-Markdown extensions are excluded. A bounded content signature scan is a **defense-in-depth check, not a complete DLP or legal classification**. Human/editorial classification and license review are still required before any remote publication.
- `drive-sync-plan.mjs` only reads local `docs/`, optionally a supplied **offline** inventory JSON, and prints JSON to stdout. It imports no Google SDK and calls no network APIs. `--apply` is explicitly unsupported; it always reports `networkRequests: 0` and `writes: 0`. No real Drive inventory is bundled. Without a supplied inventory, eligible files are marked `BLOCKED: REMOTE_INVENTORY_REQUIRED` rather than guessed to be missing remotely.
- The inventory contract `capital-ai.doc-tree-inventory.v1` is **synthetic for tests** or privately provided read-only evidence. It contains a root key/id, exact logical folder names and verified root parents, and file identities/parents/hashes. Folder parent mismatches and files outside the mapped folders are rejected. Identical names within a destination folder, casefold collisions, wrong parent, different stable source identity, rename and ambiguous IDs fail closed.
- Stable source IDs use `sha256("capital-ai/doc:v1:" + case-sensitive repo-relative path)` with a `caid-` prefix. The SHA-256 of file content is **separate**: the stable ID survives content revisions, while the hash distinguishes `SKIP` from `PLAN_UPDATE`. All results are **plans**, never authoritative Drive state.
- The planner refuses symlink traversal, absolute paths, `..`, duplicate case-insensitive local paths, unsupported filesystem nodes, oversized files, token/private-key signatures and unallowlisted documents. Blocked rows contain only stable hashed identifiers, class and a reason; their private path/name or content is not printed.
- A plan records `PLAN_CREATE`, `PLAN_UPDATE`, `SKIP`, `CONFLICT` and `BLOCKED`. No deletion, mirroring, credential load, actual Drive write or GitHub write-back exists. GitHub remains the sole authorized original; a future Drive → GitHub path must produce a reviewable diff in a normal feature branch/PR.

## Reproducible local verification

```bash
node --test scripts/upload-drive/drive-sync-plan.test.mjs
node --check scripts/upload-drive/drive-sync-plan.mjs
node scripts/upload-drive/drive-sync-plan.mjs \
  --mapping scripts/upload-drive/mapping.v1.json \
  --docs-root docs
```

The last command is a read-only planning run. Unless a separately supplied valid offline inventory is available it emits `BLOCKED` for every eligible file and performs **zero writes**. Do not use `--apply`, OAuth or service-account key files with this planner.

## DOCSYNC-03 · Identity and threat boundaries

| Threat | Required protection | Current status |
| --- | --- | --- |
| Overly broad Drive API scope | Prefer scoped owner OAuth or an explicitly authorized Shared Drive with limited service-account access; verify ownership, folder membership, Workspace controls and effective permissions independently | DESIGN; no credentials installed |
| OAuth/service-account token leakage | No credentials, tokens, refresh tokens, service-account files or provider IDs committed. Runtime credentials require approved isolated secrets storage, rotation, revocation and short-lived access | VERIFIED for planner source; runtime NOT_PROVEN |
| Backup/private knowledge exposure | Separate private encrypted backup store from document projection; no shared credentials or blanket access; fail-closed on restricted classes | VERIFIED in synthetic policy tests; Drive not touched |
| Cross-user/cross-folder overwrite | Validate exact root/parent relationships, unique folder and file IDs, hash identity, target name and stable source identity; reject collisions | VERIFIED in isolated synthetic tests |
| Directory escape and malicious local input | No symlink following, path normalization, allowlist, file type and size bounds, minimal content signature detection | VERIFIED in isolated synthetic tests |
| Drive outage/change, concurrent edits and stale inventory | Future implementation must use paginated metadata readback, revision/ETag, retries, conflict detection and atomic private state | NOT_IMPLEMENTED, separate DOCSYNC-02 |
| Consent, publication and licensing | Never infer a customer's rights, public availability or entitlement from a Drive file/URL or GitHub status; review every document and channel separately | REVIEW_REQUIRED before production |

## Rollback and cost

Remove or revert the new mapping, planner, tests and this ADR slice. No remote objects, credentials, CI required checks, Terraform state, production database or hosting resources were created. Current infrastructure cost change: **0 €**, no paid API use. The real cloud provider cost is **NOT_PROVEN** until a separate owner-authorized provider evaluation.

## Evidence status

- **VERIFIED (repository/local only):** exact files and fixture test exit codes recorded in the PR after execution; explicit fail-closed cases are independently reproducible with Node's built-in test runner.
- **NOT_PROVEN:** full GitHub required CI at the newest PR head, real Drive folder ancestry/permissions, actual authenticated provider inventory, real upload/delta/recovery, current Production build and UI.
- **BLOCKED for activation:** approved minimum-scope runtime identity, independent authorized target folder and permissions, privacy/license class signoff, Drive provider tests and rollback. These are not prerequisites for this read-only local planner.

## Next boundary

`CA-PLATFORM-DOCSYNC-02` may consume a separately verified read-only inventory and propose future create/update operations, but must retain explicit owner authorization for writes, idempotency and race-safe remote updates. No live sync should be inferred from this document or the local planner's `PLAN_*` rows.
