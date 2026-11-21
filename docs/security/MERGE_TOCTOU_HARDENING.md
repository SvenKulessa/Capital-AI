# Merge evidence for the reviewed-PR worker

The existing `scripts/growth-agent/run_reviewed_pr.py` delegates to
`GitHubRenderActions` in the LangGraph execution path governed by
`SOLO_MAINTAINER_FLOW@2`. The worker requires its existing private approval
bound to the exact repository, PR, Main and head before a write.

The GitHub readback evaluates bounded check coverage on the reviewed head.
Docker Security Gate and Domain Governance must come from GitHub Actions
(app ID 15368). CodeQL is enforced by the active Main ruleset and must come
from GitHub Advanced Security (app ID 57789). The two required Actions checks
also bind to their canonical workflow ID, path, job ID, and PR-triggered
successful run for that same head. The worker requires Actions read access
for this readback. These identities were observed
on [PR #878](https://github.com/SvenKulessa/Capital-AI/pull/878).
Same-name runs with ambiguous provenance fail closed. Evidence stores the
identifiers from the same check response and recognized outcomes only.

The worker reads the PR and Main again after it reads checks. A changed head,
base, Main, PR identity or eligibility stops the pending mutation. A HOLD
marker in the title is a veto. Issue text, PR text and provider diagnostics
confer no permissions. GitHub owns the enforced merge rules and the atomic
head lease on the existing squash request. The worker never retries a merge
using an earlier approval after an intervening change.

The trust boundary applies equally to mobile GitHub, MCP and other clients.
The patch changes the existing adapter and synthetic regressions only.
GitHub permissions, required checks and deployment configuration retain
their existing settings. Roll back with a revert and the standard PR checks.
