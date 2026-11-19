# CAPITAL-AI PLATFORM / TRUST — LangGraph runtime, OCI and rights admission (2026-11-19)

**Root authority:** `AGENTS.md` / `SOLO_MAINTAINER_FLOW@2`. This is source-bound **evidence only**, not a publishing, service, hosting-cost or credential authorization. No resource is created by this change.

## P0 — Existing web deployment and BuildIdentity

Read-only connected GitHub/Render observations on 2026-11-19 UTC:

| Claim | Evidence | Classification |
| --- | --- | --- |
| GitHub main | `7bdf02eb70d7a2fb5e134aa5d70a51149bd32d75` | VERIFIED |
| Render web service | `srv-dau1rp893c1s73cdhm1g` `Capital-AI`, Dockerfile `./Dockerfile` | VERIFIED |
| Render deployment | `dep-dbvbgfuq1p3s73891m2g`, commit equal to main, status `live`, finished 08:53:34 UTC | VERIFIED |
| Render build | `bld-dbvbgfuq1p3s73891m30`, `build_ended` succeeded 08:52:55 UTC | VERIFIED |
| Live process telemetry | instance `srv-dau1rp893c1s73cdhm1g-7dq6g`, structured `request.completed` sourceSha equal to main at 08:55:39 UTC, GET 200 | VERIFIED_AS_SOURCE_SHA_ONLY |
| Post-merge Docker Security Gate | [44489237619](https://github.com/SvenKulessa/Capital-AI/actions/runs/44489237619) success | VERIFIED |
| Post-merge GitHub push CodeQL | [44489236659](https://github.com/SvenKulessa/Capital-AI/actions/runs/44489236659) success | VERIFIED |
| Web service disk | `dsk-db7d22q5b2lc73fflpug` at `/var/data` | VERIFIED |
| Public `GET /healthz` JSON from this instance | External readback unavailable in auditor runtime | NOT_PROVEN |
| `buildIdentity.bound=true` or OCI platform manifest digest + registry attestation | Provider deploy SHA and telemetry are **not** an attestation | NOT_PROVEN |

The application intentionally distinguishes `buildIdentity` (GitHub builder identity) from `renderGitBuildIdentity` (`RENDER_GIT_BUILD_ARG_UNATTESTED`) and `runtimeIdentity` (`RENDER_GIT_COMMIT`), see `server/index.mjs`. **Do not promote a correct source SHA to an attested OCI identity.**

Bounded, unauthenticated readback to execute outside the restricted audit environment; print only approved fields:

```sh
EXPECTED=7bdf02eb70d7a2fb5e134aa5d70a51149bd32d75
curl --proto '=https' -fsS --connect-timeout 5 --max-time 12 \
  https://capital-ai.online/healthz \
  | jq -c --arg sha "$EXPECTED" '{runtime_source_sha: .runtimeIdentity.sourceSha, runtime_sha_match: (.runtimeIdentity.sourceSha == $sha), build_identity_bound: (.buildIdentity.bound == true), render_build_identity: .renderGitBuildIdentity.evidence}'
```

Observe a provider-confirmed new instance/deploy and actual GET response before marking `runtimeIdentity` verified. Never include raw env, cookies or token material in Evidence.

## P1 — BellSoft hardened-python OCI and license assessment

Unactivated worker image source `deploy/Dockerfile.langgraph-worker` has immutable `linux/amd64` Python 3.14 OCI input references:

- Builder `bellsoft/hardened-python@sha256:267c24fca93f8882fde084442224fe230231b0c0b095f4b182ecb2d54d6cb72a`
- Runtime `bellsoft/hardened-python@sha256:bb03a9fdd7fd8e03b3ac887ca6c480d29aba1a4fe99e1eee6501588042e5f2d9`

[Candidate CI 44488291514](https://github.com/SvenKulessa/Capital-AI/actions/runs/44488291514), job `135437167540`, **success**: exact digest/architecture/Python tests, candidate build, UID 10001/offline default-DENY, **unmodified** Trivy 0.76.2 HIGH/CRITICAL+secret gate (exit 0), and synthetic three-container SQLite-bind-mount resume. [LangGraph CI 44488291725](https://github.com/SvenKulessa/Capital-AI/actions/runs/44488291725) **103/103 PASS**. These are **CI image and process tests**, not a live Render worker test.

The **derived** worker was not pushed to a registry in this scope. Its platform-manifest digest, publish-time identity, registry attestation, complete runtime SPDX/CycloneDX SBOM and commercial NOTICE/source-offer inventory are **NOT_PROVEN**.

BellSoft official [Docker Hub license statement](https://hub.docker.com/r/bellsoft/hardened-python): a prebuilt image includes packages with potentially **different licenses**; downstream users must comply with all relevant licenses. BellSoft publishes [cosign/SBOM verification instructions](https://docs.bell-sw.com/alpaquita-linux/latest/how-to/cosign-guide/) and its public key, but availability of an upstream signature **for these exact digests** has not been verified in this review.

**Separate GHCR admission (NO-GO today):**

1. Verify `cosign verify --key cosign-bellsoft.pub <EXACT_BUILDER_OR_RUNTIME_DIGEST>` against both immutable upstream identities, independently validate the vendor key provenance, and read exact signed SBOM attestations via `cosign verify-attestation --type cyclonedx`. A command in documentation is not execution evidence.
2. Inspect the **derived** final runtime image, generate its SBOM and notices, bind image ID + OCI platform manifest digest + build source SHA; inspect Alpaquita OS, glibc/LGPL, Python, sqlite-vec, LangGraph and all transitive packages for license, copyright/notice and source-offer compliance.
3. Document any commercial redistribution/vendor contract limits and obtain owner/legal signoff for ambiguous cases. A clean Trivy scan alone cannot approve copyright redistribution. Do not distribute to GHCR, publish an OCI candidate, weaken scanner flags or activate any license hold.

## P1 — Future isolated Render LangGraph worker (NO-GO until provider evidence)

Read-only Render service list confirms only: web `Capital-AI` with `/var/data`; suspended `capital-ai-provider-bridge` Rust/NATS worker **without disk**; suspended `capital-ai-market-events` private service **without disk**. A separate LangGraph worker is **absent**, and NATS/Rust remain off under the licensing hold.

Proposed **single-instance, independent** Render Background Worker:
- Candidate image from `deploy/Dockerfile.langgraph-worker`, `CAPITAL_AI_OFFLINE_WORKER_ENABLED=false` by default, **no internet-facing ingress**. It is a local source-bound RAG proof, not a tenant-isolated customer inference service.
- New dedicated persistent disk mounted **exactly** at `/var/lib/capital-ai-agent`, not shared with the web disk `/var/data`. Verify provider disk ID/path, live UID/GID `10001:10001`, root / `checkpoints` / `inbox` / `approvals` exact `0700`; SQLite / locks / tasks `0600`, deny symlinks.
- Startup **fail closed** for wrong UID, missing mount, symlinks or unsafe permissions; correlate process PID/UID and actual disk mount on the real host. This cannot be inferred from Dockerfile alone.
- CI `44488291514` verified three offline containers reuse the same synthetic host bind mount with no additional checkpoint writes, invalid permissions fail closed and absent mounts block service startup. **Real Render restart events, SIGTERM/stop/restart and disk persistence are NOT_PROVEN**.
- Offline research worker needs **zero GitHub permissions**. If a separate observer is later authorized, use a short-lived GitHub App installation credential with only necessary read-only Metadata/Contents/Pull requests/Checks/Actions scopes. No writer/merge token or provider credentials in this worker. Any merge identity must be separate and protected by existing GitHub rulesets.
- Render public docs: [Persistent Disks](https://render.com/docs/disks) attach only to paid eligible services and are single-instance/runtime-only; they change deployment availability properties. [Pricing](https://render.com/pricing): lowest shown paid 0.5c/512MB service/worker ~**$7/month** plus persistent disk **$0.25/GB/month** (illustrative 1 GB total ~$7.25/month before taxes/bandwidth; validate provider offer/minimum size/region). **No costs or service changes authorized.**

**Admission classification:** `WEB_DEPLOY_AND_SOURCE_SHA_VERIFIED`; `OCI_BUILD_IDENTITY_NOT_PROVEN`; `WORKER_SOURCE_AND_SYNTHETIC_CI_VERIFIED`; `UPSTREAM_SIGNATURE_NOT_PROVEN`; `COMMERCIAL_REDISTRIBUTION_NOT_PROVEN`; `RENDER_WORKER_HOST_AND_RESTART_NOT_PROVEN`; `COST_APPROVAL_MISSING`. GHCR publication and paid Render worker remain blocked.

**Rollback:** documentation-only; revert via the existing protected PR flow. No mount, service, OAuth, key, permission, paid API or provider operation occurred.
