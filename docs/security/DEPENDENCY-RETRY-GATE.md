# DEPENDENCY_RETRY_GATE@1

Domain: TRUST + PLATFORM
Self-healing family: `CAPITAL-AI-SH-SUPPLY-CHAIN`

## Purpose

Prevent repeated execution of an unchanged dependency candidate while preserving fail-closed security behavior.

## Four-stage flow

1. **Candidate correlation** — dependency name and candidate version are correlated against existing machine-readable dependency evidence.
2. **Artifact fingerprint** — package integrity, native package integrity, exact binary SHA-256 when retained, embedded runtime/buildinfo and the security-evidence revision are compared.
3. **Reason-to-retry gate** — retest only if version, artifact identity, binary digest, embedded runtime or security evidence changed. Missing fingerprint data is `MANUAL_REVIEW_REQUIRED`.
4. **Dependency suppression with evidence** — an already blocked exact version may be temporarily ignored by Dependabot only with a repository evidence reference and review date.

## TypeScript 7.0.2

The suppression is intentionally limited to `typescript@7.0.2`.

Known fingerprint:
- npm package integrity: SHA-512 recorded in the evidence record;
- native Linux x64 package integrity: SHA-512 recorded in the evidence record;
- embedded runtime: Go 1.26.4;
- embedded `golang.org/x/text`: v0.38.0;
- Trivy: blocking HIGH findings;
- govulncheck v1.8.0: symbol-level `AFFECTED`.

The historical workflow captured an exact binary SHA-256, but that digest was not retained in the repository projection. This limitation is explicit. A future run that persists an exact binary SHA-256 is therefore considered new evidence and triggers a retry.

Review on/after: **2026-10-09**. This date does not unblock the version; it forces a fresh evidence review.

## Invariants

- No blanket TypeScript major ignore.
- A new TypeScript version remains eligible for Dependabot.
- Same nominal version with changed package/native integrity is treated as a supply-chain change.
- Missing fingerprint fields fail closed.
- `BINARY_AFFECTED` is never rewritten as `NOT_AFFECTED` for convenience.
- Suppression changes no runtime, container, Render, NATS or Valkey state.
