# Recommended Merge Order — 2026-11-06

**Context:** AGENTS.md P0 PR-Reihenfolge vor jedem Merge.  
**Current open / pending evidence PRs (this session):**

1. Password-auth isolation evidence (TRUST / #560) — lowest risk, pure tests + docs
2. Learning isolation negative cases (PRODUCT / #388 WP-02) — pure tests + docs
3. Roadmap reconciliation metadata (PRODUCT) — docs + small TS metadata
4. Remaining open evidence (#559/#388 + branch hygiene)
5. Points 7-10 evidence (this PR)

HOLD: #548 Private Notes OCC v2 remains held until SQL-before-API cutover evidence.

Independent PRs may be merged in any order once Required Checks are green. No production mutation until post-merge runtime readback.

This recommendation is evidence only; the executing agent must re-check open PRs immediately before any merge.
