# GHCR → Render: offline cutover readiness — 2026-11-22

Scope: `SvenKulessa/Capital-AI`, SOLO_MAINTAINER_FLOW@2, PLATFORM/TRUST/QUALITY. This is **not** an additional GitHub Required Check or authorization policy. Keep the existing Git-backed Render production service unchanged.

## Verified provider/source baseline (read-only)

- Main source at time of audit: `fa706af9aa698d702dc782f3f95a95c7f7572a22`; revalidate before any future action.
- Render workspace: `tea-d90o4rj7uimc739i86ug`; service: `srv-dau1rp893c1s73cdhm1g`; environment `docker`; Git repo `https://github.com/SvenKulessa/Capital-AI`, branch `main`, `./Dockerfile`.
- Live deploy at time of audit: `dep-dc11jelg1s2s73ass520` from source SHA above; `/healthz` matched the source SHA, but `buildIdentity.bound=false` and `renderGitBuildIdentity.evidence=RENDER_GIT_BUILD_ARG_UNATTESTED`.
- Existing plan `0.5c-512mb`, Frankfurt, one instance. A GitHub registry credential is configured as metadata; its ability to read an **as yet unpublished** immutable image is `NOT_PROVEN`.
- No Render **running** OCI platform manifest digest was returned in provider deploy, service or build readbacks (`NOT_PROVEN`). Matching Git commit is **not** image equality.
- Main CI `44955707366` passed, with image-ID and CycloneDX SBOM; `publish_candidate` and `Production Handoff Gate` were **skipped**. No new GHCR candidate, signed attestation or deploy has been created in this scope.

## Reuse existing machinery — no parallel publisher

The existing `.github/workflows/build-security.yml` already contains:

1. A gated `workflow_dispatch` `publish_candidate` path, whose first security prerequisite calls `scripts/assert-ghcr-publication-rights.mjs` against the exact Main SHA, pinned Dockerfile base and `docs/security/evidence/license-rights-review.json`.
2. Transfer of the **existing tested image archive**, Docker config digest check, `linux/amd64` enforcement, GHCR immutable registry manifest/index selection, re-scanning, SBOM, provenance and SBOM attestations and independent `gh attestation verify`.
3. An existing `Production Handoff Gate` using `scripts/verify-production-handoff.mjs`, which requires image-backed Render source, deploy image manifest identity, rulesets, registry-scan and bound runtime identity.

**Current rights:** `docs/security/evidence/license-rights-review.json` has `status=REVIEW_OPEN`, `deployEligible=false`, and `applicationSourceSha` differing from the current main. It is historical evidence, **not** redistribution permission. The workflow must remain blocked before registry login and push. An upstream base-image digest or GitHub artifact ZIP hash must not be promoted to the deployed OCI manifest digest.

## Minimal offline preflight implementation

`scripts/platform/ghcr-render-cutover-plan.mjs` imports the existing rights prechecker. It reads a supplied **sanitized** GitHub/Main + Render service/deploy snapshot, the existing Dockerfile, profile and rights evidence, and emits a deterministic plan. It performs **no network request and no mutations**. Output is allowlisted: no raw provider payloads, secrets or credentials.

Example after obtaining a fresh sanitized snapshot into a temporary local file (do **not** commit raw API responses):

```sh
node scripts/platform/ghcr-render-cutover-plan.mjs \
  /tmp/capital-ai-render-readback-sanitized.json \
  Dockerfile \
  docs/security/evidence/license-rights-review.json
```

The snapshot object must contain `expectedMainSha`, `currentMainSha`, `expectedServiceId`, `expectedOwnerId`, `profile`, `service` and `deploy`, all sanitized of environment variables and tokens. The function may classify matched **supplied** source metadata as `VERIFIED`; these are snapshot consistency checks, not independently signed runtime proof. The CLI uses exit code 2 when blocked. Never interpret this as a CI failure or auto-start a deployment.

## Owner/deployment boundary — explicit later steps, not actions in this PR

| Evidence / action | Current state | Next permitted action |
|---|---|---|
| Commercial redistribution rights, notices, source-offer duties | **BLOCKED** | Review exact source/base and existing rights ledger; obtain actual legal reference and independently validate it |
| Published immutable `ghcr.io/svenkulessa/capital-ai@sha256:…` | **NOT_PROVEN** | Only use existing gated candidate workflow after rights admission and owner-approved publication |
| Published registry image = CI scanned image | **NOT_PROVEN** | Verify pulled platform manifest/config SHA, `linux/amd64`, Trivy scan and SBOM |
| Provenance and SBOM signatures | **NOT_PROVEN** | Verify attestation subject and trusted GitHub workflow + exact source SHA |
| GHCR read permission on Render | **NOT_PROVEN** | Verify existing `read:packages` permission on exact immutable candidate without exposing the token |
| Cost and release management | **NOT_PROVEN** | Compare any changed pricing/storage/egress and obtain explicit Owner approval for source change |
| Rollback | **NOT_PROVEN** | Preserve Git-source settings and durable pinned registry images; validate rollback. Switching source or rolling back can trigger a deployment. |
| Actual Render image-backed digest after authorized cutover | **NOT_PROVEN** | Compare `deploy.image.ref`, `deploy.image.sha`, registry manifest and live `/healthz` from the same deployment |

Render official documentation: https://render.com/docs/deploying-an-image and https://api-docs.render.com/reference/retrieve-deploy . Git-backed deploys do not have `deploy.image`; prebuilt image services can reference immutable digests. Render pulls from registry again on deploy/restart and requires the old image to remain available for rollback. See also `docs/platform/LANGGRAPH-RUNTIME-OCI-RIGHTS-ADMISSION-20261119.md` for independent worker image restrictions; do not mix product scopes or evidence.


## Focused open-rights inventory (verified against actual existing ledger)

The source of truth for rights evidence is `docs/security/evidence/license-rights-review.json`. The document is **historical** (source `ed594ef93f66ee8f13f67d75dde56f46a95b1cd6`, base `node:24.19.0-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43`) and is **not** applicable to the current source `fa706af9aa698d702dc782f3f95a95c7f7572a22` and pinned base `node:26.13.1-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5`. It still records `status=REVIEW_OPEN`, `deployEligible=false`, `legalApproval=null`, 18 historical OS package records marked `VERSION_MATCHED_RECIPE_SOURCE_DELIVERY_OPEN`, and six unclosed obligations:

| Exact existing remainingGate text | Evidence needed to make progress, not an approval |
|---|---|
| Complete corresponding sources and delivery obligations for OS binaries | For actual **current** packaged binary versions, source archives, patches, build inputs, redistributable source delivery path and legally required offer/NOTICE |
| Exact base binary/source provenance and notice packaging | Confirm current pinned base's official manifest, architecture, binary-to-source mapping, license/NOTICE and redistributable archive or source-offer policy |
| JPEG usage terms and creation trace; AI origin confirmed by owner | Identify each **currently shipped** JPEG by repository path/digest, author/source, permitted commercial redistribution and derivative rights; exclude obsolete assets |
| Inline logo origin and trademark use review | Identify each **currently shipped** logo/symbol and required authorization for public/registry use; check trademarks separately from software copyright |
| Provider contract scopes and attribution for actual public display/API/derived-data/export use | Review contracts for only the exact **currently used** data/API/provider and attribution/redistribution scopes; do not confuse authentication with content rights |
| Verify pinned font binaries and OFL in the final published image | Match hashes and exact OFL notices against binaries from the final **registry-pulled** image; preserve required notices |

These are **six open audit topics, not six independently verified legal violations**. No file in the present branch changes or invents the rights ledger; if a particular asset is absent from the current final image, that fact must be shown by a current image inventory before closing its row. Do not set `status=APPROVED` from a synthetic test or an unchanged historical JSON.

## Additional verified Render behavior relevant to rollback

- Official Render source change: **Settings → Build → Source → Edit** triggers a new deploy upon submission (Render changelog, May 11 2026): https://render.com/changelog/change-your-services-backing-repo-or-image-in-the-render-dashboard
- Official image-backed deployment supports GHCR and `@sha256` immutable references; private GHCR requires **`read:packages`** on a token actually permitted to pull the exact package: https://render.com/docs/deploying-an-image
- Official deployment docs: image-backed services need a deliberate deploy trigger; merely updating a mutable registry tag does not redeploy them: https://render.com/docs/deploys
- Existing Render service has a persistent disk. **Do not assume image or source rollback also rolls back disk data**; preserve backup/restore evidence and retain the prior pinned image for a rollback. Source-switching back to Git itself deploys and must be considered a new production operation.
- Cost comparison is **NOT_PROVEN** for any future source switch: the currently configured `0.5c-512mb` plan and single-instance count are a read-only baseline, not a bill, future pricing approval, or assertion of zero costs. Validate workspace pricing and applicable build/pipeline minutes, storage and bandwidth before a change.

## Security correction in this PR

A structurally matching `legalApproval.reference` in a locally supplied JSON could previously make the *offline preview* output a `REDISTRIBUTION_RIGHTS=VERIFIED` label, despite no independent proof that the reference was genuine. The updated evaluator returns `NOT_PROVEN` for a structurally matched contract while preserving `BLOCKED` for any open rights requirements. The output explicitly declares `evidenceAuthority=SUPPLIED_SNAPSHOT_CONSISTENCY_ONLY`. The real publication workflow's pre-existing rights guard remains unchanged; the preview **never authorizes publishing**.

## Source-bound Main CI package/notice evidence

Read-only evidence inspection of **GitHub Actions Main Docker Security Gate** run [44955707366](https://github.com/SvenKulessa/Capital-AI/actions/runs/44955707366), run artifact `docker-security-fa706af9aa698d702dc782f3f95a95c7f7572a22` (artifact ID `14727855604`):

| Evidence field | Verified inspection value | What it does **not** prove |
|---|---|---|
| Artifact ZIP SHA-256 | `8206e05babde257aca3a6d281d1c4a888dd68c3e7019b38a8b9615a5b1d63c1f` | OCI manifest digest; redistribution right |
| Main source SHA | `fa706af9aa698d702dc782f3f95a95c7f7572a22` | Render image equals CI image |
| CI image config digest | `sha256:5f76597529b8ef14ead01b686879b577c9ba35a455c03ae5aa021c1a8ae7d1d7` | Runtime provider platform manifest |
| Pinned Node base | `node:26.13.1-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5` | Exact upstream binary/source redistribution clearance |
| `os-source-inventory.json` | 50 installed packages, 34 source-recipe locators, zero `missingSourceMetadata`; `sourceDeliveryProven=false` and `redistributionApproved=false` | Actual matching source archives/patches and delivery |
| `runtime-font-ofl.txt` | Hash `sha256:995c7199cab65954f545996326755daee7b63cc6b42b06c13da1f9502ab08a99` matches `fontOflSha256` | All final published font binaries or third-party trademark rights |
| `runtime-node-license.txt` | Hash `sha256:8e603aa87c70d36e497004f0dec63111511cb61b7d65ace12e10ea791599286c` matches `nodeLicenseSha256` | Complete base source delivery |
| `THIRD_PARTY_NOTICES.txt` | Hash `ada644d883573cae637a8b8b69fae5d6e54a73556490ee781266fb8a470e169d` matches `frontend-license-inventory.json.noticesSha256` (38 emitted frontend packages) | Legal permission to distribute final published image |
| CycloneDX SBOM | 135 components; Alpine `zlib=1.4-r0` | Actual Render runtime image identity |

This advances **artifact integrity and license-text inventory consistency**, not permission to publish GHCR images. The historical ledger's 18 earlier OS package entries must not be conflated with the **current CI artifact's 50 packages**. The existing main job's `publish_candidate` and `Production Handoff Gate` were skipped; `runtimeProviderDigest`, `platformManifestDigest` and `ociIndexDigest` in this CI identity are null. No new registry image or attestation was generated.

**Next evidence work:** retain source archive and patch checksums for the actual 50 packages, verify corresponding-source delivery and final font assets, reconcile image-shipped JPEG/logo material and provider license permissions, and obtain a genuine current-source legal review. Proceed in the existing rights workflow, **without** replacing historical evidence with unreviewed generated approvals.

## QUALITY evidence

Five deterministic Node tests cover the Git baseline, stale Main/foreign owner/source, forged credentials/signature/approval claims, secret minimization, and no provider mutations. Wired into the existing `Docker Security Gate` test list, **not** a new workflow or required check. A passing synthetic test proves only the preflight code behavior. Actual package rights, registry push, signatures, Render digest, and production cutover remain **BLOCKED** or **NOT_PROVEN**.

Rollback for this change: revert the feature-branch commit; the preflight adds no live integration or background task. **No branch merge, live deploy, GHCR publish, secrets, provider settings, or paid resources** is part of this isolated preparation.
