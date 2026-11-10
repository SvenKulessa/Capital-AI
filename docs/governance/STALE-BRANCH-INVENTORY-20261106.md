# Stale Branch Inventory — 2026-11-06

**Main baseline:** `bea9223d1d661259d147d2cd22dc09004e62351f`  
**Contract:** AGENTS.md / SOLO_MAINTAINER_FLOW@1  
**Action:** Inventory only. No branches deleted.

## Categories observed (non-exhaustive)

| Category | Examples | Recommendation |
|----------|----------|----------------|
| Historical merged or superseded | many `capital-ai-*/…` from Oct | Safe to delete after confirming no open PR |
| Active evidence / HOLD | `capital-ai-product/private-notes-occ-20261031` (#548 draft) | Keep until HOLD condition met |
| New evidence (this session) | `capital-ai-trust/password-auth-isolation-evidence-20261106`, `capital-ai-product/learning-isolation-negative-cases-20261106`, `capital-ai-product/roadmap-reconciliation-20261106` | Keep until PRs merged |
| Dependency / NATS patches | recent short-lived | Verify merge status then prune |

## Next bounded cleanup step

1. List branches older than 30 days with no open PR.  
2. Confirm no unique commits needed.  
3. Delete in batches via GitHub UI or `git push origin --delete`.  

No automated deletion performed. Inventory supports the next cleanup pass.
