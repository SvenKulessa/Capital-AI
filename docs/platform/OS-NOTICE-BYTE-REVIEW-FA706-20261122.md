# CAPITAL-AI · Source NOTICE byte-review addendum — 2026-11-22

**Evidence only, no release authority.** Project `CAPITAL-AI`; Main/image source SHA `fa706af9aa698d702dc782f3f95a95c7f7572a22`. Scope is the *existing CI image* and its isolated Alpine source mirror, **not** the independently built Render runtime image. Root `AGENTS.md` governs; this report adds no required gate.

## Exact evidence chain

| Check | Actual observation |
|---|---|
| CI source/image run | [44955707366](https://github.com/SvenKulessa/Capital-AI/actions/runs/44955707366), 50 installed APK packages / 34 pinned Aports recipes |
| Existing CI image CONFIG digest | `sha256:5f76597529b8ef14ead01b686879b577c9ba35a455c03ae5aa021c1a8ae7d1d7` (not an OCI manifest) |
| Isolated source collection | [44967916068](https://github.com/SvenKulessa/Capital-AI/actions/runs/44967916068), 34 recipes / 229 declared source inputs; 229 checked SHA-512, 0 missing, 0 mismatched |
| Private source evidence artifact | ID `14731379928`, SHA-256 `ed52926e22c91486c0504610a60c56a3e48b0e62f73539b18987d9dad1881856`; the downloaded ZIP was independently re-hashed |
| Verified inner source TAR | SHA-256 `5804d7bd93ba3ff481f23bba48724b2ce25d414dcc0f948831472704e7efd5e3`; independently re-hashed by streaming ZIP member |
| Artifact expiration | **2026-11-25 00:43:35 UTC** (three-day private retention); preserve authorized evidence separately *before* expiry if still needed |
| Historical legal record | `docs/security/evidence/license-rights-review.json` remains `REVIEW_OPEN`, `deployEligible=false`, untouched |

## Follow-up: bounded no-execution byte inspection of large upstream sources

An earlier source notice filename scan intentionally skipped the three compressed source archives above 28 MiB. This follow-up streamed their full TAR contents directly from the checksum-bound source mirror. It allowed only regular-file license/notice/copyright name candidates, imposed per-candidate and cumulative size/member limits, calculated SHA-256 of selected source file bytes, and executed **no** source scripts. No binaries or archives were extracted or redistributed.

| Source archive | Uncompressed TAR members scanned | Additional byte-hashed notice candidates | Result |
|---|---:|---:|---|
| `clamav-1.4.7.tar.gz` | 12,435 | 374 | `COMPLETE_BOUNDED_METADATA_AND_NOTICE_CANDIDATES_ONLY` |
| `gcc-15.2.0.tar.xz` | 149,865 | 44 | `COMPLETE_BOUNDED_METADATA_AND_NOTICE_CANDIDATES_ONLY` |
| `openssl-3.5.9.tar.gz` | 6,078 | 4 | `COMPLETE_BOUNDED_METADATA_AND_NOTICE_CANDIDATES_ONLY` |

Prior source notice scan: 69 candidates across 27 of 34 recipes. This follow-up adds 422 candidates and identifies license/notice filenames in **30 of 34 source packages**, total **491 candidates**. Counts are filenames within source archives, **not unique license obligations, notices included in the final binary image, or legal permissions**.

Four source recipes with **no named candidate found**: `alpine-base`, `alpine-baselayout`, `alpine-keys`, `ca-certificates`. All are **REVIEW_OPEN**: Aports recipe files, certificate provenance, and system metadata may carry notice requirements not represented by a `LICENSE`-named file. Absence of a matching filename is **not** proof of a violation.

## Important original text candidates (SHA-256 of bytes actually read)

| Source file | SHA-256 | Why this matters (no attribution of runtime inclusion) |
|---|---|---|
| `clamav-1.4.7/COPYING.txt` | `0c4fd2fa9733fc9122503797648710851e4ee6d9e4969dd33fcbd8c63cd2f584` | Primary GPL text exists in upstream source |
| `clamav-1.4.7/libclammspack/COPYING.LIB` | `a190dc9c8043755d90f8b0a75fa66b9e42d4af4c980bf5ddc633f0124db3cee7` | LGPL text for a contained source subtree |
| `clamav-1.4.7/libclamunrar/license.txt` | `6ecc1687808b7d66b24f874755abfed7464d9751ed0001cd4e8e5d9bf397ff8a` | Distinct UnRAR terms, including restrictions on building a RAR-compatible compressor and a documentation/source-comment paragraph condition for modified source distribution; inspect actual binary inclusion and changes |
| `gcc-15.2.0/COPYING.RUNTIME` | `9d6b43ce4d8de0c878bf16b54d8e7a10d9bd42b75178153e3af6a815bdc90f74` | GCC Runtime Library Exception; scope and eligibility are file/compilation-process specific, not a blanket proprietary-code permission |
| `gcc-15.2.0/gcc/COPYING` | `231f7edcc7352d7734a96eef0b8030f77982678c516876fcb81e25b32d68564c` | GPL license text |
| `openssl-3.5.9/LICENSE.txt` | `7d5450cb2d142651b8afa315b5f238efc805dad827d91ba367d8516bc9d49e7a` | Apache-2.0 text, with redistribution and notice conditions depending on actual distributed work |
| `openssl-3.5.9/external/perl/Text-Template-1.56/LICENSE` | `9837f05336ef3cbacb6a96e1672a0426d81ad01191f214b8d48e22ca62338181` | Additional vendored module license inside source; shipped runtime inclusion **NOT_PROVEN** |

**Interpretation:** the 50-item APK license column is a useful classification but not the complete attribution manifest for dependencies or embedded source. ClamAV's Rust vendor tree accounts for many extra candidate documents; it is **not** evidence that all those dependencies are linked into the `clamav-*` binaries. GCC runtime licenses have exceptions; source text alone cannot resolve the downstream file-level license selection. OpenSSL's bundled Perl text might apply to a build tool only. Never turn source-candidate discovery into an assertion that the final OCI image includes all candidate files.

## Outstanding legal and delivery checks

1. **Actual outbound distribution scenario:** distinguish unchanged Render server operation, private image/registry access, enterprise customer image delivery, and third-party publication. Determine whether and to whom a copy of each covered component is conveyed; do not equate running a service with distributing an image.
2. **Binary composition:** correlate each actual final-stage package and library/linkage with original notice/exception files; confirm whether ClamAV UnRAR functionality, GCC runtime exception files, OpenSSL modules and other vendor components are present.
3. **Per-package obligations:** validate selected license alternatives, applicable text versions, copyright/notice inclusion, exceptions, relevant patches and required modifiable source/build inputs. For GPL/LGPL, check exact corresponding-source scope and any re-linking or written-offer requirements. For MPL-covered components, check covered-file sources and the recipient access mechanism. For Apache-2.0 components, check notices and required copies in the actual distribution.
4. **Delivery path and retention:** the private 3-day CI artifact is a *temporary audit package*, **not** proven source delivery to future recipients. Design a digest-bound durable accessible source/offers/notice bundle only when the actual distribution scenario and scope are known.
5. **Different evidence domains:** Node runtime / font OFL / frontend notices, JPEGs, logos, trademarks, provider data and contracts, and exact published OCI digest still require their own prior evidence.
6. **Legal review:** these are technical audit findings, not legal advice, infringement claims or a redistribution approval. The historical rights ledger must not be altered or implicitly promoted.

Official license interpretation references: [GNU License FAQ](https://www.gnu.org/licenses/gpl-faq.html), [MPL 2.0 terms](https://www.mozilla.org/en-US/MPL/2.0/), [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0.html). Apply exact licenses in original source trees, not generic summaries.

**Gate record:** `SOURCE_ARCHIVES_SHA512=VERIFIED`; `SOURCE_NOTICE_CANDIDATE_BYTES=VERIFIED` for documented candidates; `RUNTIME_COMPOSITION=NOT_PROVEN`; `FINAL_IMAGE_NOTICES=NOT_PROVEN`; `RECIPIENT_SOURCE_DELIVERY=NOT_PROVEN`; `REDISTRIBUTION=BLOCKED`; `GHCR_PUSH=NONE`; `RENDER_DEPLOY=NONE`. This report **does not modify** existing CI admissions, GitHub rulesets, or owner authority.
