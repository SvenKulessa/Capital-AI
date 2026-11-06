# Merge-order review — 2026-11-06

Main baseline: `bea9223d1d661259d147d2cd22dc09004e62351f`. AGENTS.md remains authoritative.

1. Consolidated #578: repair auth-session harness and test execution wiring; retain the reviewed #572–#577 documents, preserve all roadmap overrides and the export function, and apply the Free-Tier decision. The original #576 deleted about 240 lines and the export despite its metadata-only description; that deletion is rejected.
2. Superseded #572–#577 close only after their reviewed contents are committed to #578. Branches are retained; no code merge from a failed PR.
3. #548 remains a separate Draft/HOLD: isolated recovery on PostgreSQL 16 and 17.11 is verified, but a real production backup and authorized SQL-before-API cutover remain required. Refresh from the new main after #578.

Immediately before any merge re-read current main, open PRs, changed files, review threads and exact-head checks. This snapshot is not a new gate or a production/paid-publication approval.
