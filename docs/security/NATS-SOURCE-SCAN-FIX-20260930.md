# Source-scan blocker DS-0002 — 2026-09-30

Scope: SvenKulessa/Capital-AI; CAPITAL-AI-OPS, security constraint.
Baseline main 8b3c444826894fd5bfaa16890c91a965f8c06b6b.

Run 36657864948, job 109705974343 passed all ten context/license tests
and Hadolint. Trivy source scan then blocked on HIGH DS-0002:
deploy/Dockerfile.nats had no explicit non-root USER. npm/bun scans
reported zero vulnerabilities at that scan time. Application image build,
image scan, SBOM and runtime smoke were skipped, not PASS.

The prepared NATS Dockerfile now specifies numeric UID/GID 1000:1000.
No shell or passwd database in the base is assumed. The base digest,
configuration, listener and entrypoint remain unchanged. No ignore,
severity reduction, skipped scan or acceptance of a security finding.

Four validation stages:
1. Reproduction: exact failed source/job/log and Dockerfile matched.
2. Targeted correction: explicit final USER before ENTRYPOINT checked;
   upstream image digest and command preserved.
3. Exact-head Trivy source and full application image/security workflow
   remain required; no local Docker/scanner available in this environment.
4. NATS deployment/startup/replay and storage ownership are NOT_VERIFIED.
   NATS is unapproved and is not provisioned or deployed by this correction.

Before any separately authorized NATS deployment, the persistent mount
/var/data/jetstream must be writable by UID/GID 1000:1000. That filesystem
ownership is a provision-time prerequisite, not established by this USER
statement. Do not broaden directory permissions or revert to root to bypass
a startup failure. Review the separate NATS Docker build context, image
scan and restart/replay tests when that capability is actually approved.
No NATS cost/configuration approval, provider mutation or release eligibility
is inferred here. Existing deployEligible:false stays in force.

After merge, launch a NEW workflow on current main with
publish_candidate=false; rerunning the old failed run keeps its old source
SHA and cannot validate this change. Automatic branch deletion after merge
is compatible with this main-based validation.
