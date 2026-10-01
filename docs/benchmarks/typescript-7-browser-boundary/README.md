# TypeScript 7 Browser-Boundary Benchmark

Status: IN_PROGRESS
Domain: PLATFORM + TRUST
Base: main@2008cac17c8cabc98576d6b20a1ad56048c0028f

## Problem

TypeScript 7.0.2 removes the JavaScript Compiler API used by `scripts/verify-browser-boundary.mjs`. The security semantics must be preserved without a permanent TypeScript 6 compatibility bridge.

## Baseline contract

The existing gate must:
- reject server-only symbols in browser artifacts,
- reject executable `process.env` dot access,
- reject executable `process["env"]` access,
- allow documentation strings that merely contain `process.env`,
- fail closed when no browser artifacts were inspected,
- continue to complement rather than replace Trivy/secret scanning.

## Candidate

Oxc/Oxlint is a candidate, not yet selected.

Current upstream documentation says Oxlint supports AST traversal and JS plugins, but JS plugins are alpha and not covered by semver. This is a material stability consideration for a security gate and must be benchmarked rather than assumed.

## Benchmark dimensions

1. Detection parity across deterministic positive/negative fixtures.
2. False-positive / false-negative behavior.
3. Cold and warm wall-clock.
4. CPU/RSS where runner instrumentation permits.
5. Dependency/binary surface.
6. Exact package/version and artifact provenance.
7. License/redistribution.
8. CI/build impact.
9. Failure semantics and rollback.

## Evidence status

- Fixture suite: added on benchmark branch.
- Existing TypeScript-API baseline timing harness: added.
- Oxc/Oxlint candidate implementation: pending exact-version trust review.
- Candidate performance measurements: pending.
- Decision: OPEN.

No result in this directory is a Production approval.


## Candidate trust snapshot — 2026-10-01

Oxlint candidate: `1.86.0`.

Verified upstream/registry facts:
- official repository: `oxc-project/oxc`;
- immutable upstream release tag: `oxlint_v1.86.0`, published 2026-09-28;
- release publishes per-platform binaries with SHA-256 values and release attestation;
- npm package `oxlint@1.86.0`: MIT;
- npm package reports zero ordinary dependencies; platform bindings are distributed separately for supported targets;
- custom JavaScript plugin API exists but is explicitly alpha and not covered by semver.

### Architecture implication

The JS-plugin path is useful for detection-parity experiments because it exposes AST traversal and RuleTester-compatible fixtures, but its alpha/no-semver status means it must **not** silently become the permanent production security boundary without a documented stability decision.

Benchmark tracks therefore remain separated:

1. **Oxlint native CLI/built-in rule track** — stable linter surface where existing native rules can enforce a boundary property.
2. **Oxlint JS-plugin track** — candidate for exact custom AST parity; experimental until stability risk is accepted or a stable native/public alternative exists.
3. **Current TypeScript-API gate** — baseline only; incompatible with TypeScript 7 and therefore not a viable target architecture.

No `npx ...@latest` execution is permitted in the benchmark. The exact candidate must be pinned before executable evaluation.
