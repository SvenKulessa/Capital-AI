# CAPITAL-AI worker — OCI/SBOM license inventory and Render admission (2026-11-19)

**Authority:** root AGENTS.md / SOLO_MAINTAINER_FLOW@2. Evidence and preparation
only. No GHCR publish, Render service/disk creation, secret, budget authorization,
LLM usage, or change to render.yaml. This is an addition to
`docs/platform/LANGGRAPH-RUNTIME-OCI-RIGHTS-ADMISSION-20261119.md`, not a
replacement for its previous observations.

## 1. Exact image chain and limits of proof

The isolated offline LangGraph candidate uses these immutable BellSoft
hardened-python base references, established by candidate CI:

- Build image: `bellsoft/hardened-python@sha256:267c24fca93f8882fde084442224fe230231b0c0b095f4b182ecb2d54d6cb72a`.
- Runtime image: `bellsoft/hardened-python@sha256:bb03a9fdd7fd8e03b3ac887ca6c480d29aba1a4fe99e1eee6501588042e5f2d9`.
- Python 3.14, linux/amd64, offline default-OFF, UID/GID 10001:10001.
- The derived worker has **not** been pushed to GHCR. Its **registry OCI
  platform-manifest digest is NOT_PROVEN**. An image config ID (sha256) or the
  SHA-256 of a `docker save` archive is *not* interchangeable with a registry
  manifest digest.

Existing candidate CI already enforces the unmodified Trivy 0.76.2
vulnerability and secret scan. This change adds, **after that scan**, two
SBOM documents (CycloneDX JSON and SPDX JSON) from **the same exact local
candidate tar**, and a read-only, sorted full SPDX package-license inventory.
`worker_oci_evidence.py` cryptographically binds the archive SHA-256, both SBOM
SHA-256s, candidate image config ID, pull-request head SHA, actual tested checkout SHA and both base digests.
No unverified signature, copyright clearance or GHCR digest is invented.

The artifact `langgraph-worker-sbom-<PR head SHA>` retains:
`worker.cdx.json`, `worker.spdx.json`, and
`worker-license-inventory.json` for 30 days. It is an internal GitHub Actions
artifact, not an image release. A missed/invalid SBOM fails the inventory step.
Existing PR checks are reused; no additional Required Check is introduced.

**Important limitations:** An SPDX `licenseDeclared` value is only metadata,
not legal approval. `NOASSERTION`/`NONE` and missing source/copyright information
remain explicit review items. Trivy enumerates *detected* OS and language
components; independently compare actual packaged binary/files and installed
software metadata before claiming completeness. The runtime bootstrap removal
and `sqlite-vec` must be checked in the **final derived image**, not inferred
from BellSoft's upstream SBOM. CI artifacts are not a permanent notarized
license registry: archive signed copies in an owner-authorized evidence store
before release if retention is required.

## 2. Redistribution assessment — no automatic permission

BellSoft's official hardened-python Docker Hub description states that other
packages inside its image can carry different licenses, and makes downstream
compliance the image user's responsibility:
https://hub.docker.com/r/bellsoft/hardened-python

Before commercial GHCR redistribution or customer delivery, separately verify
all of the following against the **exact** image and source snapshot:

1. Cryptographically verify upstream signatures and SBOM attestations for both
   pinned BellSoft digests using a trusted BellSoft signing-key provenance.
   Key retrieval from untrusted PR content is not permitted.
2. Reconcile CycloneDX and SPDX inventories with the packaged Alpaquita Linux
   APK database, glibc/runtime, Python stdlib and every vendored/third-party
   dependency. Record source/version, SPDX license expression, copyright,
   bundled notices, whether source-offer and/or attribution is required, and
   whether any proprietary redistribution restrictions apply.
3. Resolve `NOASSERTION`, missing copyright, unclear dual licensing,
   GPL/LGPL obligations and unverified BellSoft conditions; include all
   required notices and a concrete method for making corresponding sources
   available where applicable.
4. Store reviewed evidence, owner/legal decision and exact immutable artifact
   identity. Only a separately authorized registry publish may create and
   attest a final derived **platform manifest digest**; reconcile that pushed
   digest to the pre-push image identity before distribution. A clean Trivy
   report is necessary but **not** a license grant.

Current state: `SBOM_PIPELINE_PREPARED`,
`REDISTRIBUTION_REVIEW_REQUIRED`, `GHCR_PUBLISHING_BLOCKED`.
Do not mark component rights VERIFIED until the real inventory is reviewed.

## 3. Render admission plan — no resource creation

**Current connected Render inventory:** only existing `Capital-AI` web service
uses persistent disk `dsk-db7d22q5b2lc73fflpug` at `/var/data`.
`capital-ai-provider-bridge` is a suspended *different* Rust/NATS worker,
without a disk; do not repurpose or wake it.

A future separately authorized LangGraph worker must be configured as:
- Type: dedicated `background_worker`, plan candidate `0.5c-512mb`,
  **one instance only**, no public ingress, no new broker, no shared web disk.
- Independent durable disk mounted precisely at
  `/var/lib/capital-ai-agent`. Verify provider disk ID, service binding and
  runtime `/proc/self/mountinfo`; only files below that path survive restart.
- Run as UID/GID `10001:10001`. Disk root, `checkpoints`, `inbox`,
  `approvals`: same ownership and exact `0700`; SQLite, lock and
  task files: `0600`; refuse symlinked ancestors and path swaps.
  An initially mounted disk can hide Dockerfile-created directories.
  Do not weaken checks or auto-`chown` untrusted content at runtime:
  an authorized, isolated operator must first establish correct ownership.
- Default `CAPITAL_AI_OFFLINE_WORKER_ENABLED=false`, no API credentials.
  Offline RAG needs **zero** GitHub scopes. An independent optional readback
  process could later receive short-lived repo-limited read scopes;
  merge/write credentials are prohibited in this offline worker.
- Provider-level restart evidence: capture PID, UID, mount ID and SQLite
  checkpoint count before a documented SIGTERM/deploy restart, after restart
  confirm same disk ID and same completed checkpoint count, prove no duplicate
  task effects and test unsafe-mode/missing-mount/credential-deny failures.
  Back up state before destructive recovery tests; verify snapshot/restore
  only in a separately authorized recovery environment.
- Render persistent disks are runtime-only and single-instance. They do
  **not** support zero-downtime deploys and their shutdown delay cannot be
  customized. Review graceful SIGTERM and SQLite close/lock behavior
  accordingly. Source: https://render.com/docs/disks and
  https://render.com/docs/deploys.

### Indicative monthly cost (not a quote or authorization)

The current Render starter-sized background-worker plan is
`0.5c-512mb`; a planning example is **USD 7.00/month compute +
USD 0.25/GB-month persistent storage**. If a 1 GB allocation is permitted,
that would be **USD 7.25/month** before usage extras, taxes, rate changes or
plan terms. Verify actual minimum disk capacity, checkout quote, workspace
allowances and region before any spend. Sources:
https://render.com/pricing and https://render.com/docs/compute-plans.

No Render service, disk, payment setting, provider connection, new secret,
or `render.yaml` resource is created by this branch.

## 4. Decisions and rollback

| Gate | State |
| --- | --- |
| Existing offline LangGraph source/CI | VERIFIED on merged #777 |
| SBOM/SPDX generation from exact candidate archive | PENDING_NEW_PR_CI |
| Source/hash-bound package license inventory | PENDING_NEW_PR_CI |
| Upstream signature and exact derived manifest attestation | NOT_PROVEN |
| Full component rights/NOTICE/source-offer legal decision | NOT_PROVEN |
| Dedicated Render disk, process UID, real restart | NOT_PROVEN |
| Owner cost authorization | MISSING |
| GHCR publish and paid Worker activation | BLOCKED |

Rollback of this source-only change is a protected PR revert. The existing
offline candidate remains disabled. Do not delete checkpoints or the web
service's existing `/var/data` disk as part of rollback.
