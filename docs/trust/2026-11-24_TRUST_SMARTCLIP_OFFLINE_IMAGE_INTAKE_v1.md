# SmartClip offline image intake — scoped PR #916 evidence (2026-11-24)

## Bound source and environment
- Repository: `SvenKulessa/Capital-AI`; existing branch `capital-ai-growth/smartclip-sandbox-commerce-20261122`.
- Root `AGENTS.md` checked against default `main` during this work.
- Starting main SHA: `524f25ef07e5436d5dbda416dfdacd1129a4cddd`.
- Implementation commits: `57fa97f0fe11159cf3180081aa1105dee0720cfe` (module), `0e5691b7e8869755951716f429fa06099fee0c73` (tests), `c21901fa1d7628527856c042086223b9434a8bd9` (security suite wire), `2f80859fe26942620b3942615e8c8b1ac14b60ee` (test fixture correction). Exact head read back `2f80859fe26942620b3942615e8c8b1ac14b60ee`.
- At readback, branch `ahead=50, behind=3` main; do not merge or represent earlier green CI as current-head evidence.

## Implemented and bounded
- `server/smartclip-image-local.mjs` exports `ingestSmartclipPng(Uint8Array, provenance)`.
- Offline-only PNG signature/chunk-length/CRC/deflate/scanline/filter checks, maximum encoded size 8 MiB, 4096 per dimension and 16,777,216 pixels; only 8-bit non-interlaced truecolor or truecolor-alpha.
- Safe reconstruction includes solely IHDR/IDAT/IEND; all ancillary PNG chunks (including tEXt/eXIf/iCCP) removed. SHA-256 computed for both source bytes and sanitized result.
- Provenance schema has explicit rightsBasis (original, ai_generated, third_party_licensed), source description, AI generator or third-party license-evidence digest. Client-supplied publication flag never trusted. Output is ALWAYS `BLOCKED_PENDING_INDEPENDENT_RIGHTS_REVIEW`.
- Security-test suite integration: `npm run test:smartclip-images` and existing `npm run test:security`.
- No network requests, Stripe calls, plugin upload, product/price/payment mutation, production database access, rendering of untrusted HTML/SVG, or changes to commerce handler.
- This is a standalone ingestion library; it is NOT yet wired into the Acode ZIP/mobile UI. Actual on-device display, storage, EXIF removal across other formats and compatibility remain NOT_PROVEN.

## Test/evidence classification
- Test definitions were committed for valid decode/metadata removal/deterministic SHA, malformed signature/CRC/trailing payload, unsupported size/filters, SVG disguise, missing provenance/third-party evidence, and refusal of externally supplied publication approval.
- At first commit-head CI readback, the GitHub workflow-run list and combined commit status were empty. Therefore `TEST_EXECUTION=NOT_PROVEN`, `CURRENT_HEAD_CI=NOT_PROVEN`; neither is labeled PASS.
- Independent QUALITY code review: no remote fetch, no secret reads, bounded decompression, no checkout activation, no self-certified licensing. Residual concerns: PNG parser is custom and demands CI/runtime validation and fuzzing before shipping; multiple PNG color formats intentionally unsupported, no native Acode wiring, no output image fixture from actual device, no independent rights adjudication.
- Rollback: revert the scoped image module/test and package-script commits on the existing feature branch. No main or production rollback required because no merge/deployment was performed.

## Gate
`IMAGE_LOCAL_LIBRARY=IMPLEMENTED_NOT_RUNTIME_VERIFIED`;
`MOBILE_PREVIEW=NOT_PROVEN`;
`PROVENANCE_RECORD=IMPLEMENTED_USER_ATTESTED_ONLY`;
`IMAGE_PUBLICATION_RIGHTS=NOT_PROVEN`;
`CURRENT_HEAD_SECURITY_CI=NOT_PROVEN`;
`MERGE=HOLD`; `DEPLOY=HOLD`; `PUBLICATION=BLOCKED`; `LIVE_CHECKOUT=BLOCKED`.
