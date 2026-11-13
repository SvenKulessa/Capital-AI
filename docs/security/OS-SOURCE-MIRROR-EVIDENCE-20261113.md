# GHCR runtime source mirror and redistribution evidence (2026-11-13)

Contract: `SOLO_MAINTAINER_FLOW@1`. Scope: PR [#624](https://github.com/SvenKulessa/Capital-AI/pull/624), **read-only evidence with a private source-mirror runner**, not GHCR publication or a production approval.

## Immutable provenance and verified bytes

- **Baseline:** `main@d481bc7dc9dd1a6dfe7e9e9a8c9662e0ca74fcf3`.
- **Historical source subject, not the documentation commit:** `sourceSha=1b7ee312e2b6c15f12460453d7bb712e22b6a1c1`, `testedSha=817214625057b79ca6c35babe766618ea21b7ec4`, original Docker Security Gate [43381125272](https://github.com/SvenKulessa/Capital-AI/actions/runs/43381125272), artifact `14016429345`.
- **Local image config (not OCI manifest):** `sha256:8774d484ea8ae46aefc1d49221b1c4d315ec04e164b7267d6e76c58228c56fc0`. APK DB: `sha256:def19d68395425d42d3d38e931b110e71b3fa52191f3f5ce07c67310acbf0276`.
- **Pinned 21 recipes:** `docs/security/evidence/os-aports-recipe-lock-1b7ee312-20261113.json`, each `APKBUILD` fetched at its immutable `aportsCommit`, upstream Git-blob SHA1 checked.
- **Isolated source verification:** [GitHub Actions 43393619324](https://github.com/SvenKulessa/Capital-AI/actions/runs/43393619324) **SUCCESS**, job `isolated-os-source-mirror`. 21/21 `APKBUILD` Git-blobs, **197/197** declared source/patch/build-input SHA512, zero missing or mismatched. `alpine-base` is a meta/release recipe without external source files.
- **Three fallback downloads:** `apk-tools-v3.0.8.tar.gz`, `ca-certificates-20261020.tar.bz2`, `ncurses-6.6-20260516.tgz` were obtained using `distfiles.alpinelinux.org` when their original upstream returned 418/404, and were accepted **only after exact SHA512 from pinned APKBUILD**.
- **Artifact:** Private CI ZIP `14020859737`, expires `2026-11-16T08:34:53Z`. ZIP SHA256 `13824a60891d7f4c04ba848328b15821180c7707a404e8ebac74965641480fe6`. Contains portable `source-mirror.tar.gz` with SHA256 `801b921a5a488be462a8b8760d21ae743c95eb0418d807fa69367fd85d4a93e3` bound in `collection-summary.json`. The owner should independently retain the artifact **before expiration**.
- **Independent ZIP/TAR readback:** ZIP CRC good, 21 recipe SHA1 and 197 SHA512 recomputed on actual nested archive, no missing/mismatched/unsafe entries, 229 regular members and one legitimate relative `alpine-baselayout.post-upgrade` symlink. Ephemeral `abuild src` absolute links excluded. This readback is separate from the CI verifier.
- Latest documented PR-head security workflow [43393619317](https://github.com/SvenKulessa/Capital-AI/actions/runs/43393619317), Domain Governance [43393619372](https://github.com/SvenKulessa/Capital-AI/actions/runs/43393619372) and CodeQL SUCCESS. Any subsequent doc-only PR head needs its own CI readback.

## Corresponding Sources and notices: evidence vs rights

The tarball contains all **declared source tarballs and Alpine patch/build-input files** for the 21 locked source recipes, plus the matching `APKBUILD` files. This establishes **technical source-byte availability and hash integrity for the historical CI runtime inventory**, not a legal determination of whether they are *all corresponding sources* under each license or whether any additional build tooling, scripts, generated inputs, upstream license files, copyright notices or redistributable source offer is required.

The runtime evidence also preserves `OS-PACKAGE-NOTICES.txt`, `THIRD_PARTY_NOTICES.txt`, the actual Node 26.13 runtime LICENSE and font OFL text. These are technical inventories/notice excerpts **not independently verified to constitute a complete original-copyright/attribution/third-party NOTICE delivery**.

**License categories need obligation-by-obligation review:** GPL-family copyleft (e.g. BusyBox, apk-tools, GCC, Readline), LGPL, MPL, MIT, BSD, Apache, PSF, Zlib and other declared licenses. Not all open-source licensors require additional individualized permission: distribution can be permitted **under the license conditions**. The owner must instead verify source-offer obligations, versions, patches, copyright text, downstream notices, anti-tivoization if applicable, and linkage/build-script scope per actual binaries. Separately assess first-party marks/assets and licensed provider data, rather than treating OSS hashes as those parties' consent.

**Legal and release guard (unchanged):** `docs/security/evidence/license-rights-review.json` is `REVIEW_OPEN`, `deployEligible:false`, `legalApproval:null`, still historically bound to Node 24/source `ed594ef9...`, not this Node 26/source. No review decision for exact immutable OCI index/platform manifest digest or authorized Source/Notice distribution endpoint is recorded. `publishedOCIManifestDigest=null`, Render Git-backed LIVE OCI manifest not independently attested (tracked in issue #622).

**Result:** `APORTS_LOCKED_SOURCE_BYTES=VERIFIED_FOR_HISTORICAL_CI_ARTIFACT`; `FULL_CORRESPONDING_SOURCE_OBLIGATIONS=REVIEW_REQUIRED`; `ORIGINAL_NOTICE_DELIVERY=NOT_PROVEN`; `REDISTRIBUTION_RIGHTS=REVIEW_OPEN`; `GHCR_PUBLISH=BLOCKED`; `PRODUCTION_HANDOFF=BLOCKED`. No merge to main, GHCR push, Render deploy, credential change, signed/public attestation or license status promotion has been performed by this work.

## Reproduce privately

Use the existing PR-only read-only workflow `.github/workflows/trust-os-source-mirror.yml` or an equivalently isolated, unprivileged, no-secret runner. The script `scripts/collect_os_source_mirror.sh` verifies the source/inventory lock, commit-pinned APKBUILD blobs and source hashes, and calls the existing `scripts/verify-os-source-mirror.mjs`. It fails closed on nonmatching SHA512. Only publish a distributable source bundle **after** license/notice/legal review and a separately authorized exact OCI-manifest release; this historical source mirror is not itself a publication authorization.
