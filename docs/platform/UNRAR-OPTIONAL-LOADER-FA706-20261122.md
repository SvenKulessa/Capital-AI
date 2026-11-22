# CAPITAL-AI · ClamAV 1.4.7-r0 UnRAR optional-loader/source-to-binary boundary (2026-11-22)

**Evidence only. No distribution, GitHub Required Check, merge, or production authority.** Project CAPITAL-AI, Draft PR #913. Main/source baseline: `fa706af9aa698d702dc782f3f95a95c7f7572a22`. For the current evidence run, use the PR-head `image-id.txt`, not the prior baseline config digest.

## Verified original-source chain

- The private source-collection artifact **14731379928** ([GitHub Actions run 44967916068](https://github.com/SvenKulessa/Capital-AI/actions/runs/44967916068)) recorded `checkedSha512Files=229`, no missing/mismatched source inputs, and `redistributionApproved=false`. Archived ZIP SHA-256: `ed52926e22c91486c0504610a60c56a3e48b0e62f73539b18987d9dad1881856`. Its contained source mirror was inspected read-only.
- Exact selected Aports recipe: `community/clamav/APKBUILD` at recipe commit `b1b3bfe3756fbac5029deaba411987817c059d89`, Git blob `59e297594fd1a6aae27f9db9dafd4068ab891588`, package **clamav 1.4.7-r0**. Independently read staged recipe SHA-256: `01aa36a3744a2cb8e57ea64bb384e4bca9ebea46c4ec6d46db1582822a910fb2`.
- Verified upstream source archive: `clamav-1.4.7.tar.gz` (SHA-256 `3f93bf28b193677d09427a19602bf07af30629edbce93fd7f92b92a64e75c027`); source-checker validated its **declared SHA-512**. Exact source tree inspected **without executing build commands**.

## Exact recipe/CMake/loader findings

| Original file | Direct source observation | Consequence (not license approval) |
|---|---|---|
| Alpine `APKBUILD`, `subpackages` and `libunrar()` | A separate `$pkgname-libunrar` subpackage owns `usr/lib/libclamunrar*` | These UnRAR shared libraries are not automatically part of `clamav-libs` |
| Alpine `APKBUILD`, `build()` | Invokes CMake with neither `-DENABLE_UNRAR=OFF` nor a static-only override | Effective options depend on upstream defaults/build cache, not explicit absence |
| ClamAV `CMakeLists.txt` line with `ENABLE_UNRAR_DEFAULT` | Defaults **ON** | UnRAR *source-build capability* enabled by default; this is not evidence of runtime packaging |
| ClamAV `CMakeOptions.cmake` | `ENABLE_SHARED_LIB` defaults **ON**, `ENABLE_STATIC_LIB` has no ON default | Distinct shared vs static linkage pathways |
| ClamAV top-level `CMakeLists.txt` | `UNRAR_LINKED` is set only when static enabled **and** shared disabled **and** UnRAR enabled | Under ordinary documented defaults, the `UNRAR_LINKED` static branch is not selected |
| `libclamav/others.c`, `rarload()` | `load_module("libclamunrar_iface", "unrar")` and resolved function pointers; **no unconditional direct ELF DT_NEEDED expected** | `libclamunrar_iface` may be loaded by `dlopen` after startup |
| `libclamunrar_iface/CMakeLists.txt` | Interface library is independently built and installed with shared UnRAR target when enabled | Shared-library packaging boundary is intentional |
| `libclamunrar/license.txt` | Different restricted UnRAR distribution/source-modification terms | Legal text must be reviewed if the actual component or covered source is conveyed |

Source excerpts were identified by exact local source files and filenames; this document does not redistribute their license or source content.

## Actual image evidence (previous successful CI)

- [Docker Security Gate run 44973128695](https://github.com/SvenKulessa/Capital-AI/actions/runs/44973128695), source SHA `c8518788fabe302b0feffe4a2882ac16473f7529`, security artifact **14734213095**, image **config** SHA-256 `e86ab9deae9ae35e8cdfcfb887ea74b4d29ce0f264de043b862ea8daa12598fe`.
- Actual 50-item installed Alpine inventory contains `clamav-libs`, `clamav-daemon`, `clamav-clamdscan`, `freshclam`; **does not contain `clamav-libunrar`**.
- Actual APK-owned file candidates with `libclamunrar`/`libunrar` names: **none**. All inspected direct ELF `DT_NEEDED` sets have **no** UnRAR library dependency. This was corroborated by the successfully repaired ELF parser, but **does not prove** absence of unowned copies or late runtime loading.

## Next exact-image file-boundary readback

`scripts/platform/runtime-unrar-files.mjs` performs a bounded, no-execution scan for **named UnRAR library files** under `/usr/lib`, `/lib`, `/usr/local/lib`, `/app/node_modules`, and `/opt/ga4-mcp/lib` (including files not owned by APK), and checks for the literal `libclamunrar_iface` loader marker in the actual `libclamav` bytes. It records missing search roots, skipped directory symlinks, and found candidates, never uploads raw binary or license text. The existing native image readback binds the evidence to the same scanned image config and APK installed-db digest.

**Evidence levels must remain distinct:** `NO_NAMED_LIB_IN_SCANNED_ROOTS` (if actually observed) is limited to those directories and filenames. An in-binary loader literal indicates the path was compiled into the file, not that it executed. Neither observation proves absence of statically embedded UnRAR, late `dlopen`, an unscanned path, or an alternative implementation. The optional loader remains capable of loading a subsequently supplied library; **no security functionality is disabled**.

The decision on software redistribution and Corresponding Source must consider **what was actually conveyed to whom**, all non-UnRAR ClamAV/GPL components, Sharp/libvips LGPL, Python certifi MPL, notice completeness, actual recipient source-delivery mechanisms, trademarks/media and a live OCI registry identity. The existing historical rights ledger remains `REVIEW_OPEN`, `deployEligible=false`; **do not update it from metadata-only checks**.

**Current authorization:** `STATIC_OR_DLOPEN_UNRAR_ABSENCE=NOT_PROVEN`; `FINAL_IMAGE_NOTICES=NOT_PROVEN`; `CORRESPONDING_SOURCE_DELIVERY=NOT_PROVEN`; `REDISTRIBUTION_APPROVED=false`; `GHCR_PUSH=NONE`; `RENDER_CUTOVER=NONE`.
