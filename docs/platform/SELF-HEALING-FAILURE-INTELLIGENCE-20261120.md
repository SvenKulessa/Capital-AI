# CAPITAL-AI Autonomous Maintainer — offline Failure Intelligence MVP

Stand: 2026-11-20. Baseline: main \`babb35d11fbb7e346836d9d6ceebca720530a1b3\`.
Primary Domain: PLATFORM. TRUST and independent QUALITY review required for each real repair.
Contract: \`CAPITAL_AI_FAILURE_INTELLIGENCE@1\`. Status: **SOURCE_ONLY / OFFLINE / NOT_PROVEN_FOR_PRODUCTION**.

## Implementation and reuse

- \`scripts/growth-agent/failure_intelligence.py\` extends the *existing* Python/LangGraph code location with pure functions; no second orchestrator, DB, broker, model, service, scheduler or GitHub-App credential.
- \`classify_failure\` accepts an exact metadata-only schema, a separately authenticated tenant UUID, one known GitHub CI source, a failed result, a compact allowlisted failure code, run ID and immutable commit SHA. Arbitrary logs, PR instructions, secrets and additional claims fail closed.
- Recurring error fingerprints include tenant, repository, source, check, category and failure code. Run and commit are intentionally excluded from the stable fingerprint but preserved in the observation's Evidence URL and source SHA.
- \`propose_repair\` produces only \`HYPOTHESIS_NOT_PROVEN\`. It has no patch executor, privileged tool, persistence side effect, provider request, approval or merge permission.
- \`eligible_for_admission\` is **only a structural precondition**. Booleans from untrusted logs or chat cannot satisfy the underlying independently verified TRUST/QUALITY review; the future trusted host must bind actual reviewers, relevant test logs and GitHub SHA evidence. It is not an authorization decision.
- Persistence and replay must reuse existing private worker mount and \`checkpoint_store.py\` / \`auto_loop.py\` once an authenticated source adapter and durable knowledge projection are validated. This first slice does not store repair patterns persistently and does not activate background monitoring.

## Automated quality cases

Run: \`python3 -m unittest discover -s scripts/growth-agent -p 'test_failure_intelligence.py' -v\`.

1. Same tenant, repeated failure on different commits/runs produces one fingerprint with distinct evidence.
2. Different tenant or category changes the fingerprint.
3. Unknown fields, instructions, raw logs, forged approvals, skipped results, invalid IDs and invalid SHA fail closed.
4. Hypotheses cannot self-promote; all structural admission conditions are required.
5. Free-text repair commands and fake VERIFIED observations are rejected.

The test suite uses synthetic tenant IDs and metadata; it does **not** prove live GitHub ingestion, production tenant authorization, learned-fix success or a security review.

## Next incremental slices

1. An authenticated, read-only GitHub failure adapter with pagination, source-SHA verification and strict error-code normalization, integrated through the existing LangGraph offline worker. No raw issue/CI text becomes execution instructions.
2. A tenant-partitioned durable Repair Knowledge projection, idempotent run binding, trust/quality Evidence records, collision/rollback tests, 0700/0600 checkpoint permissions and two-retry ceiling.
3. Deterministic strategy ranking from independently verified success/failure, false positives, regression risk and token/tool costs. No automatic patch or merge until trusted scope and full existing required GitHub checks are available.

## Commercial hypothesis — SIMULATED, NOT VALIDATED

These EUR/month numbers are invented planning assumptions, **not** real prices, billable receipts or market willingness-to-pay.

| Offer | Assumed price | Assumed compute/API | Assumed support/security | Simulated contribution | Contribution ratio |
| --- | ---: | ---: | ---: | ---: | ---: |
| STARTER (monitor/diagnose) | 19 | 4 | 5 | 10 | 52.6% |
| PRO (reviewed patch PRs) | 79 | 22 | 15 | 42 | 53.2% |
| TEAM (multi-repo governance) | 249 | 85 | 55 | 109 | 43.8% |

Fixed infrastructure, tax, customer acquisition, refunds, compliance and non-usage cost are not modeled; these ratios are not GAAP gross margins. No commercial activation or sale is approved. Future cost receipts must be reconciled with the existing source-only \`CAPITAL_AI_UNIT_ECONOMICS_ISOLATED_LEDGER@1\`; production migration and account/billing entitlement remain separately blocked pending real restore/security admission.

Metrics: MTTD, MTTR, fix success, regression and false-positive rates, reuse, support overhead and cost per verified fix are all **NOT_PROVEN** until an evidence-complete measured cohort exists. Failed or deferred candidates remain in denominator; no success-rate inflation by excluding hard errors.

Security release gates: actual GitHub-App least privilege, webhook signature and replay protection, authentic tenant IDs, cross-tenant negative tests, sandboxed execution, prompt-injection and secret-redaction tests, immutable audit and rollback, rate/cost limits, licensing, GDPR deletion, billing and entitlement gates. No SaaS/public endpoint is enabled.
