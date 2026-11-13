# Milestone Consolidation — 2026-11-13

**Purpose:** Consolidate the open draft Milestone PRs into one reviewable unit for the Control Center.

## Source Drafts (to be closed after this PR)
- #684 roadmap milestone draft from PR #681
- #671 combined milestone draft from PR #665
- #656 roadmap milestone draft from PR #650
- #655 Consolidate milestone roadmap drafts
- #643 combined milestone draft from PR #641
- #635 roadmap milestone draft from PR #630
- #616 combined milestone draft from PR #585

## Current main state
- `src/data/roadmapMergeReconciliation.json`: lastReconciledPr 545
- `src/data/controlCenterNews.json`: lastBatchPr 528, state DRAFT_NOT_PUBLISHED

## Intent
The Milestone App generates draft reconciliation and news files after every 10/20 merges. These drafts are meant to surface the latest changes in the Control Center. They should be consolidated against the current main and reviewed as one unit.

## Non-claims
- This PR does not regenerate the full reconciliation (requires local script execution).
- News drafts remain DRAFT_NOT_PUBLISHED.
- No automatic publication or VERIFIED promotion.
- Old draft PRs should be closed after this consolidation is reviewed.

## Next step
Run the existing milestone scripts locally against current main to produce a fresh `roadmapMergeReconciliation.json` and updated `controlCenterNews.json`, then update this branch.
