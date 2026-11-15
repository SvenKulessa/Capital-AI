# CAPITAL-AI TRUST – GHCR-/Source-Provenance-Evidence-Gap (2026-11-15)

**Classification:** evidence-only reconciliation; `REVIEW_REQUIRED / GHCR_PUBLISH_BLOCKED`. This document is not an owner/legal approval, additional required gate, or authorization to change any production provider, registry, source licensing, or user data.

## Exact inspected baseline

- GitHub Main at start of this change: `6137a3196187c75f909e335c3df64fa15ebc5219`.
- Policy: root `AGENTS.md`, `SOLO_MAINTAINER_FLOW@2`, explicit task restrictions: no GHCR push, deployment, merge, legal status promotion, costs, or productive data writes.
- Public-release precheck: `scripts/assert-ghcr-publication-rights.mjs` in `.github/workflows/build-security.yml` before GHCR login/push. Preserve fail-closed behavior.
- Review artifact: `docs/security/evidence/license-rights-review.json`, blob `1cd26301e33a2628f2b4aad8e720f7edfa361bac`.

## Proven findings

| Required proof | Observable source | Status and exact missing proof |
| --- | --- | --- |
| Legal/redistribution decision | `license-rights-review.json`: `status=REVIEW_OPEN`, `deployEligible=false`, `legalApproval=null` | **BLOCKED:** source-bound documented owner/legal approval for commercial OCI image redistribution, with verifiable reference; no synthetic approval |
| Current application-source binding | Review `applicationSourceSha=ed594ef93f66ee8f13f67d75dde56f46a95b1cd6` vs Main `6137a3196187c75f909e335c3df64fa15ebc5219` | **NOT_PROVEN:** review actual final candidate at exact source SHA, not a historic SHA relabel |
| Exact base image / binary-source chain | Review `baseImage=node:24.19.0-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43`; current `Dockerfile` pins `node:26.13.0-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94` | **NOT_PROVEN:** exact-package SBOM, pinned origin, matching source recipe and complete corresponding source/binary provenance for the new base |
| OS sources, notices, obligations | Historical `osPackages` / `sourceRecipes`, existing `scripts/verify-os-source-mirror.mjs` and `scripts/license-evidence.mjs` | **NOT_PROVEN:** final-image exact versions, all source SHA512 matches and distribution/delivery obligations, build information/notice compliance; a successful *staged synthetic/historical* source-mirror check alone does not grant redistribution |
| Branding/photo/commercial rights | Review `assets`, `inlineAssetSymbols`, `brandingIntegration` and `mockupHistoryEvidence` | **NOT_PROVEN:** explicit source/creation trace, JPEG image rights and inline logo/trademark permission for actual published assets |
| Provider commercial terms | Review `providers` and remaining gates | **NOT_PROVEN:** source-specific commercial display, API, derived-data, redistribution/export and attribution scope at final production configuration |
| Fonts | Review `font` includes OFL metadata, pinned example font SHA-256 and `public/fonts/provenance.json` | **PARTIALLY DOCUMENTED, NOT_PROVEN FOR FINAL IMAGE:** verify exact packaged TTF/WOFF2 bytes, reserved-name conditions, distributed OFL and matching current candidate |
| Runtime BuildIdentity | `scripts/write-runtime-identity.mjs`, `server/index.mjs`, `.github/workflows/build-security.yml` | **Existing CI source binding VERIFIED by code inspection, final-image readback previously NOT_PROVEN.** This branch adds exact built-image source verification and negative tests, without enabling publication |
| OCI provenance and Render | `scripts/registry-manifest-evidence.mjs`, `scripts/verify-production-handoff.mjs`; Render remains `runtime:docker` Git-backed | **NOT_PROVEN:** GHCR immutable candidate's linux/amd64 manifest/attestations **and** provider runtime manifest equality. A local Docker Config SHA is not an OCI manifest |

## Deterministic remediation dependency graph

1. **License/source owners:** Resolve all six `remainingGates` with primary evidence for the *current candidate* and a real legal approval record. Do not change `REVIEW_OPEN` or `deployEligible:false` until independently supported.
2. **Technical TRUST branch (this scope):** Add post-build, pre-PASS inspection of `/app/server/index.mjs` from the actual built image and verify exact `GITHUB_SHA` + builder. Reject absent, duplicate, unbound, wrong-source and wrong-builder declarations. Runs only on the existing Docker Security Gate, with no new Required Check.
3. **Only after separate publication authorization:** Existing GitHub workflow may generate a GHCR candidate, verify exact OCI reference/index/platform/config digests, publish/verify GitHub build and SBOM attestations. Candidate remains `deployEligible:false` without handoff proof.
4. **Only after separate provider/change authorization:** Render migration from Git-built to digest-pinned image with backup/Rollback evidence and runtime/provider manifest equality. Current service `srv-dau1rp893c1s73cdhm1g` remains untouched.

## Scope/rollback and DoD

- Exact modified paths for the technical slice: `scripts/write-runtime-identity.mjs`, `scripts/write-runtime-identity.test.mjs`, `.github/workflows/build-security.yml`, and **this evidence document**.
- Existing Docker Security and Domain Governance continue unchanged as named checks; publish_candidate remains guarded by manual `workflow_dispatch` and the original rights precheck.
- Local/unit and workflow evidence is only `VERIFIED` on real execution at the same head; a draft plan is not a PASS.
- Restore by reverting the feature branch commits. No image push, Render change, new service, live credential, or production mutation.
- **Final rights status: BLOCKED.** No invented approval or GHCR push.
