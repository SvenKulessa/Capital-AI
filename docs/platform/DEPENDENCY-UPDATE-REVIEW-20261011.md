# Dependency inventory, TypeScript suppression, and Node/Go patch review — 2026-10-11

Primary Domain: PLATFORM. Source baseline: \`main@e00943da7ba9650c911083214c0a8a4c180330ea\`.
Scope: repository inventory, isolated update discovery, and **read-only** image patch-candidate evaluation.
Authority: \`AGENTS.md\` (\`SOLO_MAINTAINER_FLOW@1\`). This document adds no gate or owner review.

## Existing CVE evidence flow

PR #398 is merged. \`.github/workflows/daily-dependency-security-watch.yml\` independently captures:
- locked-install exit; \`npm outdated --json\` report, stderr, and exit code;
- \`npm audit --audit-level=high --json\` report, stderr, and exit code;
- pinned runtime source identity, policy tests, and TypeScript-suppression outcome;
- \`daily-dependency-summary.json\` and existing 14-day artifact retention.

The suppression review is **still due** as of 2026-10-09. \`typescript@7.0.2\` remains
\`BLOCKED / BINARY_AFFECTED\`, with missing persisted native binary SHA-256.
A failed policy step must **not** skip audit capture, and a complete uploaded artifact
must **not** be mistaken for a passing Security Gate.

Merged code is \`CODE_PRESENT\`; a new scheduled/dispatch run's artifact and contents
are \`RUNTIME_VERIFIED=NOT_PROVEN\` until directly inspected.

## Inventory source-of-truth correction

- Root packages are resolved from \`package-lock.json\` (TypeScript 6.0.3,
  Vite 8.3.2, Motion 14.0.0, React 19.3.0, Gemini SDK 2.27.0,
  Lucide 1.52.0, Tailwind 4.3.3, Three.js 0.184.0).
- Private runtime packages are resolved separately from
  \`deploy/runtime/package-lock.json\` (NATS JS 3.4.0, redis 6.3.0,
  zod 4.6.5, nodemailer 10.0.15).
- \`deploy/Dockerfile.nats\` uses a NATS 2.15.0 *base image* with checksum-verified
  NATS 2.15.1 *server executable*. \`deploy/compose.market.yml\` remains a separate
  local-test 2.15.0 image. Neither tells us the live broker version.
- The web and NATS inventory rows no longer conflate lockfile versions, image base
  tags, release binary versions, or deployed runtime evidence.
- \`scripts/verify-release-readiness.test.mjs\` now compares source inventory to
  root/runtime lockfiles and build pins in the **existing Docker Security Gate**.
  This is a regression assertion, not an extra Required Check.

\`.github/dependabot.yml\` now covers the distinct \`/deploy/runtime\` npm lockfile
and the \`/mobile/android-private\` Gradle scope. TypeScript 7.0.2 exact-version
suppression is unchanged. Android Gradle Plugin 9.x is a **separate migration**;
the Gradle Dependabot scope ignores AGP semver-major only.

## Patch candidates: no unverified digest promotion

| Identity | Current exact source pin | Verified upstream release | Migration state |
| --- | --- | --- | --- |
| Node runtime | \`Dockerfile\` node:26.10.0-alpine@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80 | Node 26.11.1 (2026-10-07) | CANDIDATE_ONLY |
| Go security scanner runtime | \`.github/workflows/build-security.yml\` golang:1.26.8-alpine@sha256:6e5de3f5b9fb7e30b8bb2ffe8dcbcbdaa2990f0f31267456eabe83f870a623be | Go 1.26.9 (2026-10-08; security fixes) | CANDIDATE_ONLY |

Upstream release sources:
- https://nodejs.org/en/blog/release/v26.11.1
- https://go.dev/doc/devel/release

OCI manifest / platform digest, Alpine package availability, CVE/SBOM parity,
runtime compiler/broker diagnostic parity, and production deploy identity are
**NOT_PROVEN** for the two candidate tags. Thus **no \`FROM\` or security-scanner
digest was changed**, and no paid resource or separate runtime deployed.

Reproducible migration checks in a dedicated follow-up implementation, once
immutable candidate digests are obtained:

\`\`\`bash
# Read metadata; NEVER replace an immutable tag+digest with a floating tag.
docker buildx imagetools inspect docker.io/library/node:26.11.1-alpine
docker buildx imagetools inspect docker.io/library/golang:1.26.9-alpine

# Pin independently validated amd64/arm64 manifests or index digest.
# Then build exactly the proposed Dockerfile in the existing security pipeline.
npm ci --ignore-scripts --no-audit --no-fund
npm run lint
npm test
npm run build
npm run verify:browser
# GitHub PR automatically runs Docker Security Gate and Domain Governance.
# Re-run existing binary reachability (NATS + TS7) twice with same govulncheck pin.
\`\`\`

Acceptance requires:
1. Exact \`FROM tag@sha256:\` source identity and expected \`node --version\` / \`go version\`.
2. Nonweakened Alpine security floor and clean Docker image/OS scans; source SBOM/integrity.
3. CI on the exact PR head: \`Docker Security Gate\` and \`Domain Governance\` successful.
4. No loss of deterministic NATS binary or TS7 reachability findings; TS7 stays blocked.
5. Independent production runtime readback before any claim of effective rollout.

Rollback: **revert only the patch-migration commit**, restoring the exact
\`node:26.10.0-alpine@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80\`
and \`golang:1.26.8-alpine@sha256:6e5de3f5b9fb7e30b8bb2ffe8dcbcbdaa2990f0f31267456eabe83f870a623be\`
pins; redeploy only the affected service through the existing normal main release
path when necessary. NATS/JetStream and Rust Provider Bridge images, state and
configuration are outside this scope and **must not** be restarted due to a
repository-HEAD change.

Costs: uses existing GitHub Actions / Dependabot quotas only; incremental CI minutes
and quota availability are NOT_PROVEN. No new paid infrastructure.
