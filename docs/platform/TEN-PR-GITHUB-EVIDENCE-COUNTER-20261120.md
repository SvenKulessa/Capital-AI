# Zehn-PR-Effizienzmeilenstein – GitHub-Quellnachweise

**Schema:** `CAPITAL_AI_TEN_PR_GITHUB_EVIDENCE_COUNTER@1`  
**Root-Autorität:** `AGENTS.md` / `SOLO_MAINTAINER_FLOW@2`  
**Kanonische Vertragsquelle:** `.agents/app.prompt.json` → `tenPrEfficiencyMilestone` und `.agents/skills/registry.json` → `promptContracts`

## Bounded read-only source collection

```bash
npm run test:domain-skills
GITHUB_TOKEN='<read-only GitHub token only in your trusted local environment>' npm run milestone:github:readback
```

Use an existing GitHub token delivered through the authorized runner environment. **Never** paste credentials in chat, logs, Drive, artifacts, or PR comments. Public-read execution without a token may be rate-limited. No scheduled workflow, new credentials, paid provider, publishing, SQL, or runtime mutation is created.

The CLI reads only fixed-host GitHub REST GET endpoints for the current `main` SHA, paginated closed-PR inventory, individual PR merge provenance, immutable head check-runs, and merge-commit ancestry. It has a 15-page inventory limit, 40-candidate limit, 2 MiB response cap, request timeouts, explicit URL allowlist and checks main stability between the first and final source reads. Truncated, inconsistent, absent, or failed provider evidence yields `NOT_PROVEN` rather than invented progress.

A PR is counted only when its GitHub-source-bound domain, title, dates, `merged=true`, checked PR head, merge-commit ancestry to observed `main`, and unique successful `Docker Security Gate`, `Domain Governance` and `CodeQL` check-runs are verified. Explicitly exclude #850, duplicate PRs, draft/unmerged items, missing evidence, noncanonical domains, or out-of-bound date evidence.

## Conservative authorization boundary

Owner authorization is recorded for **20 November 2026**, but its **exact time is not proven**. Therefore this counter uses the safe UTC cutoff **2026-11-21T00:00:00Z**, deliberately excluding all 20 November merges. Those excluded PRs may be reconsidered only after immutable, independently source-backed authorization-time evidence is supplied and the contract is safely revised. A synthetic test passing does not certify a real merge.

The report's `verifiedCount` is a conservative verified lower bound, not permission to merge or publish. `VERIFIED_THRESHOLD` means the source-bound count is at least ten, but `publishAuthorized` remains **false**. The responsive homepage efficiency illustration is a separate future product scope requiring 10 actual post-authorization PR merge references and accepted UX/source rights. Do not infer financial value or efficiency gains from the PR count.

## Tests and rollback

Deterministic positive/negative fixtures in `scripts/ten-pr-evidence-counter.test.mjs` cover source/authority spoofing, invalid domains, #850, unknown same-day authorization, missing/failed required checks, neutral CodeQL, unrelated merge ancestry, moved main SHA, unreachable GitHub, candidate overflow, ten verified synthetic merges, and no publishing. The test suite is wired to the **existing** `test:domain-skills` command; no new Required Check.

Rollback: revert the isolated evidence-counter commits, restoring the prior Docker build-context allowlist and package script. No production state requires rollback.
