# CAPITAL-AI · Private GHCR → Render GPL/LGPL/MPL source-delivery candidate (2026-11-22)

**Evidence / preparation only; NOT a legal approval, written offer, release or recipient-delivery receipt.** Draft PR #913 under Root `AGENTS.md`. Do not publish or merge from this document alone. The current Render Git-backed service remains unchanged.

## Concrete intended conveyance scenario

`PLANNED: private ghcr.io/svenkulessa/capital-ai@sha256:<OCI-platform-manifest>` → existing Render web service. This exact OCI manifest **does not yet exist in verified evidence**. No registry image has been pushed, no recipient image copy or source delivery has been confirmed, and the legal classification of a transfer between repository owner, private registry and hosting provider is unresolved. B2B customer images and a public GHCR publication are **out of scope**, not implicitly approved.

## Immutable evidence baseline (scanned image, not registry)

- Current image source `1f62a679d70eacbb02c6f9ce05bf304140b056b4`; GitHub Actions Docker Security Gate `44974194456`, artifact `14734714650`, independent artifact-ZIP SHA-256 `fb0cd3c1777d960b052285dd9709961ab6dddf332e298465e7a57fe968383982`.
- CI **image configuration** digest `sha256:4381f74f1b4783b4f7494ac834d42b7f16061ae6695f5fc0e0221be0a5f0378b` (NOT registry OCI platform manifest or Render runtime digest).
- Installed APK database digest `sha256:263c775b75102a70b050dcf8bfde0da4e728ab316c8ebea31cd51735fdc16f64`; **50 Alpine, 21 Node, 63 Python** scanned package records. Alpine release 3.24.4, platform x86_64 / linux/amd64 subject to later registry verification.
- Base pinned `node:26.13.1-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5`.
- Original isolated source collection `44967916068` / artifact `14731379928`: **229/229** declared APKBUILD SHA-512 source inputs verified; 34 recipes; original source mirror ZIP SHA-256 `ed52926e22c91486c0504610a60c56a3e48b0e62f73539b18987d9dad1881856`. Collector references older image/source SHA `fa706af9aa698d702dc782f3f95a95c7f7572a22`; **do not equate commits**. The unchanged installed APK-database digest and identical pinned recipe commit/version records link the OS package-input lineage, not a full reproducible binary rebuild.

## Actual GPL/LGPL/MPL involvement or alternatives

| Runtime area | What is in the scanned image | Original source-input staging | Recipient obligations |
|---|---|---|---|
| Alpine: 24 binary package records, 15 source recipes | `alpine-baselayout`, `apk-tools`, `busybox`, `ca-certificates`, `clamav`, `gcc`, `gdbm`, `libidn2`, `libmspack`, `libunistring`, `musl`, `pax-utils`, `readline`, `xz`, `zstd` | 199 original recipe/source/patch inputs privately staged, independently byte-hashed | Exact license alternatives, GPL source/build/installation inputs, LGPL library-source/relink and notices, MPL covered files and provenance, source recipient access **NOT_PROVEN** |
| Node: `@img/sharp-libvips-linuxmusl-x64@1.3.4` | Native `libvips-cpp.so.8.18.7`, LGPL-3.0-or-later package metadata; linked from Sharp addon | Matching original source + patches + license/relink materials **NOT_INCLUDED** | **NOT_PROVEN** |
| Python: `certifi@2026.11.20` | MPL-2.0 package metadata, GA4 MCP runtime | Matching original covered-file source, modifications and notice **NOT_INCLUDED** | **NOT_PROVEN** |

The **24 Alpine records are inclusive of license alternatives** (e.g. `BSD-3-Clause OR GPL-2.0-or-later`) and mixed-file expressions; they are **not** a finding that all 24 binaries necessarily require the same GNU copyleft obligations. GCC runtime exceptions, dual/alternative terms and exact file-level scope require individual review. The other 26 Alpine binaries, many Node/Python dependencies, media and data contracts remain separate license/rights scopes.

### UnRAR and source provenance boundary

The exact Alpine `clamav 1.4.7-r0` recipe packages UnRAR in the separate `clamav-libunrar` subpackage, absent from the scanned runtime. In the actual CI image, 5 library roots / 14,920 entries were inspected: no named UnRAR library; no direct DT_NEEDED entry in examined ELF files. The `libclamunrar_iface` optional-loader literal **is present** in `libclamav`. Therefore neither static UnRAR inclusion nor late `dlopen` loading from other runtime locations can be declared absent in every future state.

## Prepared private package (local only, not uploaded to GHCR)

- Local file `2026-11-22_CAPITALAI_CHATGPT_GHCR_RENDER_SOURCE_DRAFT_v5.zip`; SHA-256 `683d4c507fe4ac9c7e23446b010858597d5365bb989d26166e883b4180dcbcc0`; **167,409,973 bytes**.
- Includes 199 original Alpine source inputs from 15 source recipes; 47 original upstream LICENSE/COPYING/NOTICE **candidates**, and the actual CI frontend notices, Node license, font OFL and incomplete OS package notice index; manifest JSON, pinned provenance receipts, source checksums SHA-256+SHA-512, recipient-delivery template, hold manifest, and read-only verifier.
- Tests: independent ZIP CRC, all 199 input SHA-256/SHA-512, 47 text SHA-256, 7 CI notice/evidence SHA-256, identity/package version cross-check against original CI and collector manifests. **9 local validator positive/negative tests passed**; no claim about CI execution of this detached offline packaging script.
- The file is a **private chat/container artifact**, **not** uploaded to the repository, a durable approved archive, a written source offer, or an artifact a third-party recipient can obtain. GitHub's original 3-day source evidence expires on **2026-11-25 00:43:35 UTC**; archive retention and recipient access remain `NOT_PROVEN`.

## Actual obligations/gates that still block transfer

1. Determine whether the **concrete recipient** receives a copy and the applicable terms; record legal entity, exact licensed product, destination and owner-approved intended use. Service access alone and conveying an image are not identical.
2. Select applicable alternative licenses and establish **complete corresponding sources**, including downstream patches, build/config/installation scripts and exceptions. A verified upstream mirror is insufficient on its own.
3. For LGPL v2.1/v3: applicable original text, complete library sources and modifications, actual combined-work/linking details, and any source/object/relink/installation obligations. Native `DT_NEEDED` is evidence, **not a legal exception grant**.
4. For MPL v2: identify covered files including trust-store/certifi, preserve terms and notices, and design an actual accessible corresponding covered-file source delivery channel.
5. Verify NOTICE/copyright attribution for all *remaining* runtime/frontend/media assets and provider/trademark rights; no automatic licensing inference from metadata or candidate text filenames.
6. Only after real legal/current-source/recipient evidence exists, use the existing `scripts/assert-ghcr-publication-rights.mjs` workflow. Do not edit historical `docs/security/evidence/license-rights-review.json` to fabricate rights. Any later GHCR registry manifest, actual Render pull identity, receipts, cost approval and rollback require independent evidence.

Official term references (not a substitute for reviewing each exact license): [GPLv2 §3](https://www.gnu.org/licenses/old-licenses/gpl-2.0.html), [GPLv3 §6](https://www.gnu.org/licenses/gpl-3.0.html), [LGPLv3 §4](https://www.gnu.org/licenses/lgpl-3.0.html), [MPLv2 §§3.1–3.2](https://www.mozilla.org/en-US/MPL/2.0/). The formal duties depend on whether and to whom an actual copy is conveyed.

**Status:** `CANDIDATE_SOURCE_BYTES=VERIFIED`; `SOURCE_BUNDLE_PRIVATE=VERIFIED_LOCAL_ONLY`; `CURRENT_OCI_MANIFEST_DIGEST=NOT_PROVEN`; `COMPLETE_LICENSE_NOTICES=NOT_PROVEN`; `CORRESPONDING_SOURCE_DELIVERY=NOT_PROVEN`; `LEGAL_APPROVAL=NOT_PROVEN`; `REDISTRIBUTION=BLOCKED`; `GHCR_PUSH=NONE`; `RENDER_DEPLOYMENT=UNCHANGED`.
