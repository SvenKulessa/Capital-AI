# CAPITAL-AI Drive Artifact Routing @1

**Scope:** This workflow applies only to the CAPITAL-AI project. It is an offline, metadata-only placement planner, **not** a Drive writer, updater, mover, archiver, or background scheduler.

## Verified source of folders
- Google Drive folder plan: `CAPITAL-AI/00_Orientierung/2026-11-14_ORIENTATION_DRIVE_ORDNERPLAN_v1.md`.
- Root folder ID: `1q3R-enFc-LdYkvo7Du1BrbmEG6VJT9q8`.
- Canonical route IDs: `.agents/contracts/drive-artifact-routing.json` (existing Drive folders, verified by connector listing on 2026-11-21).
- Acode-only shared folder ID: `1j3VADFmrFfBuPVv9lFGpRsWM5ygAfusv`, using the existing `.agents/contracts/acode-shared-delivery.json`. **This folder is not a fallback for ordinary reports, images, PDF, JSON or ZIP exports.**

## Pipeline
1. **CLASSIFY**: receive explicit `project=CAPITAL-AI`, `scope=PROJECT|ACODE`, content-related `category`, `topic` and extension. Never infer a destination from an extension alone.
2. **REVIEW**: redact the file, complete privacy and licensing review, then supply `privacyReview=VERIFIED`, `rightsReview=VERIFIED` and `sensitivity=PUBLIC|REDACTED`. The planner does **not** inspect or certify the file's bytes; the caller must use separate actual evidence.
3. **ROUTE**: select a known folder ID in the routing manifest. Unmapped categories, cross-project context and `ACODE` misrouting are BLOCKED. `99_Exports` requires explicit `DISTRIBUTION_EXPORT`.
4. **NAME**: for ordinary Drive files, `YYYY-MM-DD_DOMAIN_TOPIC[_STATUS]_vN.extension`; for code expressly destined to Acode, `YYYY-MM-DD_DOMAIN_CHATGPT_TOPIC_vN.extension`. Never invent APPROVED. Use the verified, **complete** existing destination folder listing to avoid collisions.
5. **ADMIT**: verify the actual destination folder ID and complete list. `ROUTE_READY` means the selected name and directory pass the contract, not that an upload occurred.
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
  "listedParentId": "1nSaGrKxdiTq6_UsyIz24wlbKyS0fBVMk",
  "existingNames": []
}
```

Then run `node scripts/platform/drive-artifact-router.mjs metadata.json`. The expected destination is `CAPITAL-AI/40_Trust/Audit`, with `2026-11-21_TRUST_EXPOSURE_AUDIT_v1.md` as candidate if this **real** folder listing remains empty. Sample data is explanatory only, not provider evidence or an authorized upload. The same CLI with `scope=ACODE` and `category=ACODE_CODE` applies the separate Acode contract.

## Validation
- `node --test scripts/platform/drive-artifact-router.test.mjs`
- `npm run test:domain-skills`
- Existing `Docker Security Gate` runs the same router tests; no additional Required Check.
- **Expected evidence:** `FILE_NAME`, `ROUTE`, `LOCAL_EXPORT`, `DRIVE_UPLOAD`, `DRIVE_PARENT`, `SHA256`, `ACODE_SYNC` are independent. Without provider proof, use `NOT_PROVEN`.

**Rollback:** revert the small routing PR via the existing GitHub flow. No Drive records or production services are changed by this implementation.
