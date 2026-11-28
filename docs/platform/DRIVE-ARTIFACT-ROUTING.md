# CAPITAL-AI Drive Artifact Routing @1

**Scope:** This workflow applies only to the CAPITAL-AI project. It is an offline, metadata-only placement planner, **not** a Drive writer, updater, mover, archiver, or background scheduler.

## Verified source of folders
- Google Drive folder plan: `CAPITAL-AI/00_Orientierung/2026-11-14_ORIENTATION_DRIVE_ORDNERPLAN_v1.md`.
- Folder path source is read from the existing project Drive hierarchy; no additional private project folder IDs are hardcoded in this public repository.
- Canonical route **paths**: `.agents/contracts/drive-artifact-routing.json`; resolve each ID from the actual connected Drive service before upload.
- Acode-only shared directory: `CAPITAL-AI-ACODE-CHATGPT-EXCHANGE/shared`, bound by the existing `.agents/contracts/acode-shared-delivery.json`. **Not** a default for reports, graphics or ZIP bundles.

## Pipeline
1. **CLASSIFY**: receive explicit `project=CAPITAL-AI`, `scope=PROJECT|ACODE`, content-related `category`, `topic` and extension. Never infer a destination from an extension alone.
2. **REVIEW**: redact the file, complete privacy and licensing review, then supply `privacyReview=VERIFIED`, `rightsReview=VERIFIED` and `sensitivity=PUBLIC|REDACTED`. The planner does **not** inspect or certify the file's bytes; the caller must use separate actual evidence.
3. **ROUTE**: select a known folder ID in the routing manifest. Unmapped categories, cross-project context and `ACODE` misrouting are BLOCKED. `99_Exports` requires explicit `DISTRIBUTION_EXPORT`.
4. **NAME**: for ordinary Drive files, `YYYY-MM-DD_DOMAIN_TOPIC[_STATUS]_vN.extension`; for code expressly destined to Acode, `YYYY-MM-DD_DOMAIN_CHATGPT_TOPIC_vN.extension`. Never invent APPROVED. Use the verified, **complete** existing destination folder listing to avoid collisions.
5. **ADMIT**: verify the actual destination folder ID and complete list. `ROUTE_READY` means the selected name and directory pass the contract after caller-provided connector readback metadata; the caller still must authenticate that metadata, not that an upload occurred.
6. **UPLOAD**: use an actually connected, authorized Google Drive writer to create only the intended new file. No existing file delete/rename/overwrite and no additional OAuth client.
7. **READBACK**: independently query Drive file metadata: exact filename, file ID and expected parent ID. Verify SHA-256 only from genuinely available file bytes; separately mark Acode device sync only after actual device readback.

## Metadata-only local CLI
Create a private JSON metadata file (not raw file bytes or secrets), with folder names and existing filenames fetched from the real provider:

```json
{
  "project": "CAPITAL-AI",
  "scope": "PROJECT",
  "category": "TRUST_AUDIT",
  "topic": "EXPOSURE_AUDIT",
  "extension": "md",
  "date": "2026-11-21",
  "sensitivity": "REDACTED",
  "privacyReview": "VERIFIED",
  "rightsReview": "VERIFIED",
  "listingComplete": true,
  "providerFolderId": "REPLACE_WITH_ACTUAL_CONNECTOR_READBACK",
  "listedParentId": "REPLACE_WITH_ACTUAL_CONNECTOR_READBACK",
  "listedFolderPath": "CAPITAL-AI/40_Trust/Audit",
  "parentChainVerified": true,
  "existingNames": []
}
```

Then run `node scripts/platform/drive-artifact-router.mjs metadata.json`. When these values come from real Drive connector readback, the expected destination is `CAPITAL-AI/40_Trust/Audit`, with `2026-11-21_TRUST_EXPOSURE_AUDIT_v1.md` as candidate if this **real** folder listing remains empty. Sample data is explanatory only, not provider evidence or an authorized upload. The same CLI with `scope=ACODE` and `category=ACODE_CODE` applies the separate Acode contract.

## Authorized create-only adapter (separate from offline planner)

The module `scripts/platform/drive-artifact-delivery.mjs` exports `deliverDriveArtifact({request,bytes,provider,authorization})`. It is an **orchestration port**, not a new Google Drive login, OAuth client, direct HTTP caller, cron worker or a claim that this repository can automatically invoke a ChatGPT connector. Its `provider` must be injected by an **already authenticated, appropriately authorized** runtime. The caller must explicitly approve `{project:"CAPITAL-AI",operation:"CREATE_ONLY",approved:true}`; provider authorization and real folder access are verified independently.

The trusted provider adapter exposes these existing Drive capabilities under a narrow interface:

| Method | Provider implementation and proof |
|---|---|
| `assertCreateAuthorized` | Existing delegated Google Drive identity/permissions for the exact folder; no new auth scopes |
| `resolveFolderId`, `getFolder` | Resolve existing path, read each parent/name/ID, folder MIME and `canAddChildren`; anchor to previously authorized root ID |
| `listFolder` | Enumerate **every page**, return `{files:[{id,name,parentId}],nextPageToken:null|string}`; detect duplicates, cycles and missing pages |
| `withExclusiveCreateLease` | Trusted cross-agent, cross-process lease on the fixed project-wide key `CAPITAL-AI/DRIVE/CREATE_ONLY@1`; **no write if the runtime cannot provide it** |
| `uploadNewFile` | Map to existing Drive **create-new-file** action, with required parent/name/content/MIME, never update/overwrite/move |
| `getFile`, `readFileBytes` | Independent metadata and **remote file bytes** readback, not only a Drive MD5/ETag or client-provided SHA |

A ChatGPT Google Drive connector can provide listing, upload and metadata/fetch capabilities, but its upload API does **not** provide a distributed atomic create-if-absent lock. Until the orchestrator provides a genuine cross-worker exclusive lease, **the connector alone is insufficient for the adapter's write admission** and must remain `HOLD`. Do not substitute a local boolean, synthetic lock, fabricated `canAddChildren`, mock folder metadata or user-supplied response as live evidence. For binary uploads, the connected host converts trusted local bytes to its supported file reference **without storing secrets in prompts or logs**; the repository module does not fabricate a file URI.

### Replay, corruption and retry contract

- SHA-256 is computed from local bytes. Under an exclusive lease, list and verify existing matching versions against **actual provider-downloaded bytes**; exact matches yield `VERIFIED_SKIP` with `driveUpload=NOT_PERFORMED`. Different content receives the next free version. Any unreadable existing match yields `HOLD`; do not create a duplicate.
- After create-only upload, fetch fresh file metadata and bytes, verify exact **name, unique parent, ID and digest**, then re-list the complete folder to detect duplicate names. Only then `VERIFIED_CREATED`; device sync remains `NOT_PROVEN`.
- If the write may already have happened but its readback fails, return `HOLD` and **do not blindly retry** or delete the file. A later attempt can prove a matching existing file and skip it. Cross-worker locking must remain active over both read and write operations. All authorized automated writers, including different topics and destinations, must share this exact lease namespace. A per-topic mutex cannot protect the complete folder invariant. This change does not install a lock backend or grant direct connector writes. If a lease owner crashes or an upload outcome is unknown, do not automatically steal an expired lease: Google Drive creation has no fencing-token check. Reconcile the prior operation and prove the old writer is quiescent before an authorized recovery releases the lease. No automatic force-unlock, fallback writer or second scheduler.
- No existing Drive object is changed; no cloud resources, costs, OAuth grants or separate synchronization service are created. File size limit: 32 MiB for this adapter. A caller lacking source-byte rights or remote-byte readback cannot claim SHA-256 proof.
- These are **mock-port tests**, not a successful live Drive upload. Production integration remains unproven until the real host adapter and exclusive lease are observed.

### Usage by authorized host runtime

```js
import {deliverDriveArtifact} from './scripts/platform/drive-artifact-delivery.mjs';
const result = await deliverDriveArtifact({
  request: {project:'CAPITAL-AI',scope:'PROJECT',category:'TRUST_AUDIT',
    topic:'EXPOSURE_AUDIT',extension:'md',date:'2026-11-21',
    sensitivity:'REDACTED',privacyReview:'VERIFIED',rightsReview:'VERIFIED'},
  bytes: verifiedRedactedBytes,
  provider: alreadyConnectedExclusiveDriveProvider,
  authorization: {project:'CAPITAL-AI',operation:'CREATE_ONLY',approved:true},
});
```

The example variable names are **injection points**, not evidence that provider access or a global lease exists in this repository.

## Validation
- `node --test scripts/platform/drive-artifact-router.test.mjs scripts/platform/drive-artifact-delivery.test.mjs`
- `npm run test:domain-skills`
- Existing `Docker Security Gate` runs the same router tests; no additional Required Check.
- **Expected evidence:** `FILE_NAME`, `ROUTE`, `LOCAL_EXPORT`, `DRIVE_UPLOAD`, `DRIVE_PARENT`, `SHA256`, `ACODE_SYNC` are independent. Without provider proof, use `NOT_PROVEN`.

**Rollback:** revert the small routing PR via the existing GitHub flow. No Drive records or production services are changed by this implementation.

**Important:** The JSON above is a template, not a verified listing. Its `REPLACE_...` placeholders intentionally fail folder admission until replaced by an actual connected Google Drive readback; never mark a user-provided placeholder as a verified provider result.
