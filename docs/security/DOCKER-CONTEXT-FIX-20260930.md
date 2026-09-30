# Docker build context correction — 2026-09-30

Scope: SvenKulessa/Capital-AI, CAPITAL-AI-OPS / PVC-02 and PVC-07/08;
SEC supply-chain constraints preserved. Fresh owner report and direction:
repair the failed Capital-AI deploy. No Finance mutation or new service.

Baseline main: `566b90b5010f3d8ac13913df68c7446f18105668`.
User log at 01:34:11Z: build/runtime COPY shared failed with "/shared": not found.
Render readback: dep-dau6e17avr4c73fsirb0 (manual) and
dep-dau6euhsrm7s73avobk0 (api) both build_failed on that main.

## Cause and bounded correction

shared/market-contracts.mjs exists in the main Git tree. The default-deny
.dockerignore did not admit shared/. It also omitted server/advisor.ts,
auth.mjs, telegram.mjs, http-security.mjs, infrastructure.mjs and the
frontend-security/verify-browser-boundary scripts referenced by Dockerfile.
The failure is build-context exclusion, not an absent repository directory.

Add only those exact inputs and shared's parent directory. Keep deny-all and
existing scoped src/license input rules. No broad !server/** exception,
secret input, Dockerfile weakening, skipped test or license-gate change.
The existing security workflow runs the dependency-free context regression
before expensive Docker steps; no new trigger, publication/deploy right or
independent self-healing controller.

## Four validation steps

1. Reproduction: exact main/tree and Dockerfile/allowlist correlated.
   New COPY guard fails against the original allowlist on excluded
   server/advisor.ts. The shared omission is independently explicit in
   the original rules and supplied Docker log.
2. Correction: all current local COPY inputs and descendant files survive
   the amended rules. Representative secrets, git metadata, reports and
   unrelated server files remain excluded. Existing license and image-profile
   test files also pass (8 license cases, 1 image-profile case).
   The guard supports this repository's deliberately small glob subset;
   it is a preflight regression, not a Docker build or security scanner.
3. Image/security: full Docker build, SBOM and CVE/secret scans are still
   NOT_RUN here (no Docker daemon or workflow-dispatch capability).
   Latest observed successful Actions run 36653873202 used old PR #17 head
   cdd26f750b83aa35ed90de8df985be147623b901, not this main or fix.
4. Provider/runtime: two failed deployments on the baseline main confirmed.
   No new deploy, live HTTP check, registry digest acceptance or runtime
   convergence is claimed. deployEligible:false remains unchanged.

## Exact continuation

Run existing build-security.yml on the fix branch with publish_candidate=false.
Review exact-head build/tests, scan and smoke evidence. Merge requires Human
Owner decision after that validation; reread main after merge.
A later GHCR candidate must be built from the final current source and pass
existing rights, image and runtime gates before promotion. No deployment is
authorized solely by this context correction. NATS provisioning and its costs
remain unapproved; this fix does not provision or configure it.
