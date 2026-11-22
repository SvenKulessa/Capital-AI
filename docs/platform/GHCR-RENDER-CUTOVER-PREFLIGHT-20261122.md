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

## QUALITY evidence

Five deterministic Node tests cover the Git baseline, stale Main/foreign owner/source, forged credentials/signature/approval claims, secret minimization, and no provider mutations. Wired into the existing `Docker Security Gate` test list, **not** a new workflow or required check. A passing synthetic test proves only the preflight code behavior. Actual package rights, registry push, signatures, Render digest, and production cutover remain **BLOCKED** or **NOT_PROVEN**.

Rollback for this change: revert the feature-branch commit; the preflight adds no live integration or background task. **No branch merge, live deploy, GHCR publish, secrets, provider settings, or paid resources** is part of this isolated preparation.
