# CAPITAL-AI · Final CI-image license coverage correlation — 2026-11-22

**Evidence only; no redistribution or production approval.** Current Main source SHA `fa706af9aa698d702dc782f3f95a95c7f7572a22`; exact tested/exported CI image CONFIG digest `sha256:5f76597529b8ef14ead01b686879b577c9ba35a455c03ae5aa021c1a8ae7d1d7`. The artifact is GitHub Main Docker Security Gate run [44955707366](https://github.com/SvenKulessa/Capital-AI/actions/runs/44955707366), artifact `14727855604`, ZIP SHA-256 `8206e05babde257aca3a6d281d1c4a888dd68c3e7019b38a8b9615a5b1d63c1f`. These are **not** a published OCI platform manifest digest or provider runtime image identity.

## Exact independent file correlations

The read-only verifier `scripts/platform/runtime-license-coverage.mjs` compares the actual extracted `image-licenses.json`, `capital-ai.sbom.cdx.json`, `os-source-inventory.json`, `frontend-license-inventory.json`, `image-id.txt`, `THIRD_PARTY_NOTICES.txt`, `runtime-node-license.txt`, and `runtime-font-ofl.txt` from one and the same CI artifact. It compares **package name/version multisets** (including duplicates), the 50 Alpine records against the OS installed inventory, and the three complete notice-file SHA-256 digests. On any mismatched identity, missing scanner group, altered notice, fabricated redistribution approval or duplicate package, it fails closed. Inputs are never executed; no provider contact, registry publication or service modification is performed.

| Observed final-image scanner/BOM metadata | Count | Evidence |
|---|---:|---|
| Alpine APK binary packages | 50 | Exact scanner/SBOM/OS-inventory names and versions reconcile |
| Node.js runtime packages | 21 | Exact scanner/SBOM name/version multiset reconciles; not the full frontend bundle |
| Python runtime packages | 63 | Exact scanner/SBOM name/version multiset reconciles, including GA4 MCP dependency paths |
| Total resolved package records | **134** | Plus one Alpine operating-system component in CycloneDX metadata: 135 components total |
| Emitted frontend NPM package records | **38** | Separate emitted-frontend inventory, not additive to installed runtime package count |
| Trivy OS license findings | 62 | Detected license IDs, not 62 distinct delivery obligations |
| Trivy Node.js license findings | 21 | Package license metadata only |
| Trivy Python license findings | 64 | Package license metadata only |
| Trivy “Loose File License(s)” findings | **1,960** | File-level detection hits; **not 1,960 unique licenses or violations** |
| Loose-file findings under `opt/ga4-mcp/` | 1,922 | Detection hits from Python environment paths, not proof of shipping every original source file |
| Loose-file findings under `app/dist/` | 12 | Includes frontend and font license candidates |
| Loose-file findings under `app/licenses/` | 14 | Includes Node and application license text references |
| Loose-file findings under `usr/local/` | 12 | License candidates inside runtime environment |
| Frontend notices + Node notice + font OFL digests | **3/3 verified** | Content SHA-256 matches original in-image inventory declarations |

## Priority package observations

These names and versions are **observed in the actual final CI image scanner**, not inferred from the historical OS mirror:

| Identified runtime component | Detected license metadata | Decision needed |
|---|---|---|
| `@img/sharp-libvips-linuxmusl-x64` `1.3.4` | `LGPL-3.0-or-later` | Examine actual native library inclusion/linkage, applicable LGPL conditions, modifications, replacement/relink options and corresponding source/notice delivery if copies are conveyed |
| Python `certifi` `2026.11.20` | `MPL-2.0` | Review covered files, license copies, attribution and source access on distribution |
| `clamav-clamdscan`, `clamav-daemon`, `clamav-libs`, `freshclam` `1.4.7-r0` | `GPL-2.0-only` | Determine which ClamAV/UnRAR components are compiled or shipped; an UnRAR source-license file alone does not establish runtime inclusion |

The installed image also includes frontend build output and its own notice inventory; `@resvg` or other build-only packages must **not** be asserted to be present in the final runtime merely because they exist in upstream source or build-stage dependency locks.

## Distinct rights/distribution scenarios

A hosted Render service, a private GHCR image pulled by Render, an image provided to B2B customers, and public image publication are **different facts**. Whether a copy of a component is conveyed, what source/notice delivery obligations apply, what exception or dual license applies, and the destination/retention requirements must be separately determined for the actual scenario. This script cannot give legal approval.

The 34-recipe Alpine source mirror from [run 44967916068](https://github.com/SvenKulessa/Capital-AI/actions/runs/44967916068) verified the **229 declared SHA-512 inputs**. It does not cover the independent 21 Node + 63 Python runtime packages, license choices or full build linkage. The source evidence artifact `14731379928` expires **2026-11-25 00:43:35 UTC**; a private copy should be preserved with access control if it is needed for a longer review. Retention does not establish a source-to-recipient distribution mechanism.

## Follow-up checks (not additional CI required checks)

1. Inspect the actual image-stage native binaries and dynamic symbols for `8libclamunrar`, libvips, shared libraries and their precise license/exception text; do not infer from names in build-only sources.
2. Build a version-specific attribution/NOTICE list from actual image package metadata, package license files and verified source NOTICE candidates. Flag missing/ambiguous copyright or license text instead of declaring infringements.
3. For each **actually delivered** binary component with GPL/LGPL/MPL source obligations, record recipient access method, corresponding sources/patches/build/install scripts as applicable, retention and delivery receipts.
4. Inspect image-shipped media/assets, fonts, trademarks and provider-derived data rights separately, as recorded in the existing historical rights ledger; do not overwrite or auto-promote it.

**Status:** `EXACT_CI_PACKAGE_IDENTITIES=VERIFIED`; `NOTICE_FILE_SHA256=VERIFIED`; `NATIVE_BINARY_LINKAGE=NOT_PROVEN`; `NOTICE_COMPLETENESS=NOT_PROVEN`; `RECIPIENT_SOURCE_DELIVERY=NOT_PROVEN`; `REDISTRIBUTION=BLOCKED`; `GHCR_PUBLISH=NONE`; `RENDER_DEPLOY=NONE`. Historical `docs/security/evidence/license-rights-review.json` remains `REVIEW_OPEN` and `deployEligible=false`.
