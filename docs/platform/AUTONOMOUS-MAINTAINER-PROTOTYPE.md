# CAPITAL-AI Autonomous Maintainer: offline evidence-first prototype

Status: `PROTOTYPE / NOT_PROVEN IN PRODUCTION` — 2026-11-20.
Engineering authority: root `AGENTS.md` / `SOLO_MAINTAINER_FLOW@2`.
This document is architecture evidence and **not** an extra governance or release gate.

## Existing platform reused

- Existing `scripts/growth-agent/auto_loop.py` implements the bounded, trusted-adapter LangGraph repair/merge flow, including the pre-existing Docker Security Gate and Domain Governance checks.
- Existing `agent_platform.py` implements a separate curated, source-bound offline document retriever. This prototype adds a **metadata-only local retrieval index** over previously validated fixes; no arbitrary log, patch, or document is executed.
- Existing `checkpoint_store.py` provides private SQLite-based LangGraph checkpointing for approved tasks. The repair-knowledge database is separate, tenant- and repository-scoped, and carries only opaque failure IDs, curated playbook keys and SHA-bound accepted outcomes.
- Existing Google Maintenance and Local Growth Graph PR workflow discovers `test_*.py`, including the new synthetic tests. No new required check, worker, paid model, external storage, event webhook or production service is added.

## Failure → retrieval → review → learning

1. `fingerprint(untrusted_ci_log)` scans **at most 32 KiB**, maps a recognized failure to a fixed category and hashes `{schema, source, category}`. It never returns or stores the raw CI log. Unknown errors return `UNKNOWN` and cannot yield a repair candidate.
2. `propose()` invokes a **real** existing pinned LangGraph `StateGraph` with the nodes `PLATFORM → RAG → TRUST → QUALITY`. The graph carries only the opaque tenant/repository scope and safe metadata. Curated retrieval returns the same pre-authored, *non-executable* playbook as a candidate, never an automatic patch or trusted approval.
3. The candidate is `UNVERIFIED_CANDIDATE` until an **independently trusted adapter** passes a SHA-bound `ReviewedOutcome` with actual reproduction, regression tests, current Main, appropriate CI and both existing required checks, independent TRUST/QUALITY review, complete scope, and no active HOLD. Untrusted PR bodies, logs or model outputs are never a substitute for that adapter.
4. `RepairKnowledge.learn()` stores only reviewed *local* outcomes in a `0600` SQLite file beneath a `0700` owner-private directory, isolated by exact hashed tenant/repository scope. Duplicate head-SHA outcomes cannot inflate a learning count. A subsequent diagnostic can label the curated playbook `EVIDENCE_BACKED_CANDIDATE`, but never directly authorize writes or merge.
5. No automated software modification or integration into provider-write adapters is enabled. Any future automatic repair action must flow through the current `auto_loop.Authority` and actual GitHub CI/ruleset evaluation. The additional learning signal must never bypass those gates.

**Limitations:** This is deterministic category matching and metadata retrieval, **not** a validated AI model, vector RAG, general fault-repair engine or a production service. `ReviewedOutcome` is an *adapter contract*, not cryptographic attestation. End-to-end provider attribution, complete check-run pagination, actual real-world fix success rates, injection robustness of future LLM agents, and operational scalability remain `NOT_PROVEN`. All records and tests are synthetic.

Local synthetic verification (same test discovery as existing CI):

```sh
python3 -m unittest discover -s scripts/growth-agent -p 'test_*.py'
python3 -m compileall -q scripts/growth-agent/failure_learning.py scripts/growth-agent/unit_economics.py
```

## Phase 2: authenticated learning provenance (opt-in, offline)

The Phase 1 `ReviewedOutcome` boolean structure is **not a provider or reviewer
attestation**. `RepairKnowledge.learn()` now defaults to **deny** when the
trusted runtime has not supplied an independent verifier and a matching
`ReviewProof`; old fixture booleans alone cannot increment success metrics.

`trusted_learning_adapter.py` reuses the existing, host-pinned
`provider_adapters.SafeHTTP.github` read-only transport. Each learning decision
checks the exact authorized tenant/repository scope, PR number, base/main/head
SHAs, mergeability, bounded/unambiguous GitHub check runs, required Docker
Security Gate and Domain Governance, applicable code scanning and independent
TRUST/QUALITY HMAC-SHA256 reviewer proofs. Proofs bind all reviewed claims,
fingerprint, scope, PR and a five-minute timestamp; reviewer keys are distinct
and at least 256 bits. Secret keys and the tenant-to-repository authorization
map must be supplied from the **trusted worker runtime**, not a PR, LLM,
checkpoint, API caller input or repository configuration. No signing endpoint
or key provisioning is included. Do not co-locate the separate reviewer
signers with an untrusted agent process.

The verifier refuses missing, stale, failed or ambiguous readbacks and
re-checks main/head and PR eligibility after the CI readback. A repeated
required Actions check is accepted only when each run has distinct job and
workflow-run IDs and a successful, canonical workflow receipt on the exact
head. The same verifier is used by the existing reviewed-PR worker. Real
#878 and #876 runs demonstrated the repeated Domain Governance case.
A stale, unverified or unsuccessful run still blocks learning. New verified rows are written only to `authenticated_outcomes`; any
older `outcomes` table remains untouched and untrusted, and its counts never
promote a candidate. This is a fail-closed, non-destructive schema separation.
It cannot initiate an HTTP write, merge, deployment or model
inference. Its signed decision only allows *local* SQLite learning for an
already independently reviewed case; it does not authorize patching,
publishing or a GitHub merge. The runtime must separately authenticate the
human/agent reviewer identities and prevent signing services from signing
untrusted PR-body assertions. HMAC provides symmetric integrity, **not
third-party non-repudiation**. Reviewer compromise, key rotation, provider
identity, cross-tenant production controls and operational key management
remain `NOT_PROVEN` until separately implemented and tested.

Existing `auto_loop.py` and `checkpoint_store.py` remain unchanged.
No new CI required checks, provider credentials, paid resources or live SaaS
service are introduced. The existing LangGraph graph still outputs only
non-executable curated candidates. Synthetic tests live in
`test_trusted_learning_adapter.py`; they use test-only keys and a fake
provider. They are not live-provider authorization evidence.

## Competitor facts vs pricing hypothesis

Official price references checked 2026-11-20 (USD, subject to vendor changes):

- [GitHub Copilot pricing](https://github.com/features/copilot/plans): Pro $10 per user/month plus a usage-based credit pool; Copilot agent already supports Issues → PRs.
- [CodeRabbit pricing](https://www.coderabbit.ai/pricing): Essentials $30/developer/month, Team $60; its coding-agent usage is additionally metered. This is a substantive competitor in autonomous repair.
- [Gitar pricing](https://gitar.ai/pricing): Pro $40/user/month with CI-fix automation. This competes directly on the 'fix until CI is green' claim.
- [Sentry Seer](https://sentry.io/changelog/seer-pr-iteration/): root cause analysis and iterative PR repair, metering differs from per-seat plans.
- [Anthropic Sonnet 5 announcement, amended August 10, 2026](https://www.anthropic.com/news/claude-sonnet-5): **$2 / 1M input** and **$10 / 1M output tokens** is the benchmark pricing used below; this is a model-choice assumption, not a provider connection.

**Hypotheses, not market data:** Recommended initial ICP is 1–10-maintainer B2B development teams with repeated CI regressions and a demand for auditable changes. Proposed **$49 solo / $149 team / $399 compliance** per month are pricing experiments only; no paid pilot, conversion, churn, TAM or willingness-to-pay is verified. Reachable-market scenario: 5,000 relevant teams × 3% conversion × $149 × 12 = **$268,200 hypothetical ARR**, not a validated market size.

## Inspectable per-customer unit economics

The checked-in `unit_economics.py` uses decimal USD arithmetic, no billing calls and explicit assumptions. Default illustrative **$149 team plan**, 60 incidents/customer/month, 1.5 model attempts/incident, 60k input + 8k output tokens/attempt, $2/M input + $10/M output, $0.15 CI + $0.05 storage per incident, $8 infrastructure per customer, 3% + $0.30 payments, $2,500 fixed operating cost/month (excludes founder salary and taxes):

| Modeled outcome | Base hypothesis |
| --- | ---: |
| Token cost per attempt | $0.20 |
| Token cost per incident | $0.30 |
| Fully-loaded per incident before shared overhead/payments | $0.50 |
| Monthly COGS per customer | $42.77 |
| Monthly contribution | $106.23 |
| Gross margin on this modeled scope | 71.30% |
| Customers for $2,500/month fixed-cost break-even | 24 |

**Retry stress:** At 3 attempts/incident (all else identical), COGS is $60.77 and break-even becomes 29 customers. Real GitHub Actions bills, AI prompt/response token distributions, support, refunds, taxes, data processing, enterprise compliance, and acquisition costs have not been observed. A full-business profitability claim cannot be made from this model. Add metered overages and fail-closed cost budgets before a commercial pilot.

## Provenance and rollback

Source baseline: Main `babb35d11fbb7e346836d9d6ceebca720530a1b3` (2026-11-20). No change to `AGENTS.md`, existing workflows, trusted merge paths, providers, secrets, billing or production Docker/Render configurations. Rollback = revert the prototype-only commit. CI and production status must be checked at the actual PR head SHA; a synthetic pass is never equivalent to full required GitHub checks or a deployed service.
