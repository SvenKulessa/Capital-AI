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
  "providerFolderId": "INSERT_VERIFIED_DRIVE_FOLDER_ID",
  "listedParentId": "INSERT_VERIFIED_DRIVE_FOLDER_ID",
  "listedFolderPath": "CAPITAL-AI/40_Trust/Audit",
  "parentChainVerified": true,
  "existingNames": []
}
```

Then run `node scripts/platform/drive-artifact-router.mjs metadata.json`. When these values come from real Drive connector readback, the expected destination is `CAPITAL-AI/40_Trust/Audit`, with `2026-11-21_TRUST_EXPOSURE_AUDIT_v1.md` as candidate if this **real** folder listing remains empty. Sample data is explanatory only, not provider evidence or an authorized upload. The same CLI with `scope=ACODE` and `category=ACODE_CODE` applies the separate Acode contract.

## Validation
- `node --test scripts/platform/drive-artifact-router.test.mjs`
- `npm run test:domain-skills`
- Existing `Docker Security Gate` runs the same router tests; no additional Required Check.
- **Expected evidence:** `FILE_NAME`, `ROUTE`, `LOCAL_EXPORT`, `DRIVE_UPLOAD`, `DRIVE_PARENT`, `SHA256`, `ACODE_SYNC` are independent. Without provider proof, use `NOT_PROVEN`.

**Rollback:** revert the small routing PR via the existing GitHub flow. No Drive records or production services are changed by this implementation.
