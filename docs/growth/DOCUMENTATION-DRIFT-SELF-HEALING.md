# Documentation Drift Self-Healing — DOC-SH-01

Primary Domain: **GROWTH**. Technical authority: **PLATFORM**. Security/compliance authority: **TRUST**.

Implementation base for DOC-SH-01 before merge: `c1a720a32a054c16944e6c582086a509be137fc4`.

## Purpose

This slice adds deterministic drift detection to the existing Documentary architecture. It does **not** create a second documentation authority. The canonical inputs remain `DOCUMENTARY_EVIDENCE@1`, `CHANGE_PROPAGATION@1`, `GROWTH_PROJECTION@1` and `POST_MERGE_CORRELATION@3`.

The immediate problem is bounded: living documents can silently retain an obsolete current-main identity after later merges, while dated evidence and generated documentary records must remain immutable historical snapshots.

## Scope

`documentary/documentation-drift-profile.json` classifies a small explicit set of living documents and historical paths. `scripts/documentation-drift.mjs` then checks:

1. configured living documents still exist,
2. explicit current-main identity claims in living documents match repository HEAD,
3. `src/data/roadmapData.ts` does not contain duplicate work-package IDs.

Dated reports, `documentary/evidence/`, `docs/security/evidence/` and generated projections are treated as historical/non-authorizing for this check and are never rewritten by this slice.

## Self-Healing boundary

The profile uses the canonical five stages:

`DETECT → CORRELATE → CLASSIFY → REMEDIATE → VERIFY`

The first implementation stops after deterministic detection/classification. `autoRepairEnabled=false`; findings are report/PR input only. Promotion to an automatic invariant requires at least three independent positive validation cycles with the same repair fingerprint `STALE_CURRENT_MAIN_METADATA@1`.

The detector may identify `STALE_DOCUMENTARY_PROJECTION`, but it may not promote Security, license, compliance, deployment or public-production claims. Missing evidence remains fail closed. A Living Document must not embed an exact SHA as a durable `current main` promise; the stable remediation is to reclassify that value as an immutable implementation/audit baseline or consume generated current-state metadata.

## Validation observation

The first real post-merge observation occurred when PR #131 advanced main from `de4c268311c42877f8a7e1361e7de986ffb096cb` to `c1a720a32a054c16944e6c582086a509be137fc4`. The initial detector revision did not recognize the hyphenated phrase `Current-main baseline for this slice`; that false negative is intentionally not counted as a positive cycle. The parser and regression suite now include this exact wording. The remediation also removes the self-referential `current main` promise instead of chasing the SHA after every merge.

## Run locally

```sh
npm run documentary:drift
npm run test:documentary-drift
```

Use `node scripts/documentation-drift.mjs --report-only` for baseline inventory where existing drift should be reported without changing the process exit code.

## DOC-SH-02 — PR-only remediation

The validated fingerprint `STALE_CURRENT_MAIN_METADATA@1` reached 3/3 independent positive cycles in `docs/growth/DOCUMENTATION-DRIFT-VALIDATION-20261004.json`.

DOC-SH-02 connects the detector to `POST_MERGE_CORRELATION@3` in two stages. The correlation job remains read-only for repository contents and generates `DOCUMENTATION_DRIFT_REPAIR_PLAN@1`. A separate write-scoped job is eligible only for `PR_PROPOSAL_CANDIDATE`, rechecks the exact expected Main SHA, verifies source digests and allowed paths, applies the deterministic marker transformation, reruns the documentation regressions and opens a new `capital-ai-growth/docs-self-heal-<mainsha>` pull request.

The promotion does **not** enable direct repair of `main`: `autoRepairEnabled=false`, `autoMerge=false`, `directMainMutation=false` and `productionAuthority=false` remain invariant. `AGENTS.md`, `.github/`, `docs/security/`, `docs/governance/`, contracts, deploy, server, Supabase, dependency manifests and historical evidence are excluded from the automated patch scope.

If Main changes between detection and branch creation, if a source digest changes, if the marker occurs ambiguously, or if any unsupported finding is present, the proposal fails closed and no repair branch is pushed.
