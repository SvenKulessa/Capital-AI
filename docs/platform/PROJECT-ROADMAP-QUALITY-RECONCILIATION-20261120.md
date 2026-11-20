# CAPITAL-AI · Project-to-Main Quality Reconciliation (20.11.2026)

**Observed main:** `eabdedbbd00f6b37f7221595dd39c01f395cc3b2` (read-only GitHub connector). **Authority:** root `AGENTS.md`, `SOLO_MAINTAINER_FLOW@2`. **Scope:** code-backed roadmap projection + bounded status inventory. This document introduces no release gate, merge authorization, provider activation, CI check or parallel scheduler.

## Evidence vocabulary

- **MAIN_CODE**: verified path / merged source; not proof of deployed or customer-visible behavior.
- **PR_ONLY**: open implementation, not assumed to exist on main.
- **NOT_PROVEN**: relevant independent provider/runtime/receipt evidence unavailable to this reconciliation.
- **BLOCKED / HOLD**: a documented trust boundary or current owner constraint.
- Historical `ROADMAP_RECONCILIATION.reviewedAt=2026-10-06` and 105-package source list remain unchanged and are *not* republished as a new full historical audit.

## Main source and remaining production separation

| Work package | Main source / merged PR | Current evidence boundary | Required next independent readback |
| --- | --- | --- | --- |
| `CA-PLATFORM-SELF-HEAL` | #777, #786, #844: offline SQLite worker, synthetic agent pilot and read-only PR inventory | MAIN_CODE; 24/7 worker, paid/credential/provider adapters and autonomous repair NOT_PROVEN | Worker mount/restart, `/healthz` identity, authenticated GitHub/Render operation authorization where explicitly commissioned |
| `CA-PLATFORM-DR-RECOVERY` | PostgreSQL-17 synthetic backup-reader contract and recovery documentation | MAIN_CODE; issue #664 OPEN; full real backup, Auth/Storage/Vault/GCS restore NOT_PROVEN | Isolated authorized recovery, actual hashes/provenance, pg_net/cron privilege-risk decision |
| `AP-FIN-01` | #825 + #839: CAP-BP-001 blueprint and fail-closed admission | MAIN_CODE; market_integrity_gate BLOCKED; rights, canonical contract resolution, PIT+replay NOT_PROVEN | Independently licensed inputs, temporal replay and runtime admission |
| `PRODUCTION-WEB-01-GROWTH` | #841 + #842: GA4 configuration diagnostic code | MAIN_CODE; provider readback, consented generate_lead/purchase, actual revenue NOT_PROVEN | Authenticated GA4 data, consent, B2B receipts, deployed SHA and explicit conversion evidence |

Other merged source slices with separate live acceptance: #752 news Home→Overview→Archive, #829 reusable copyable chat prompts. The old MARKET reconciliation from 15.11 describing #752 as open is a historical snapshot, not the current status.

## Open PR reconciliation — 13 at inventory time

| Group | Open PRs | Ordering / anti-duplication |
| --- | --- | --- |
| Revenue, attribution, evidence | #815, #821, #819, #824, #849, #850 | #815 precedes dependent #821; #819/#824 must agree on consent and event authority; #849 draft-only content and #850 read-model are not sales proof |
| Product | #846 | Existing Learning Simulator, HeroEarth3D and Buddy; no new parallel chat service; check `shared/seo-source-provenance.mjs` overlap with #714 |
| Market | #714, #834, #838 | #714 missing rights and not mergeable at read; #834 synthetic Solana research, both touch `package.json`; #838 archive browser QA on top of merged #752 |
| Historical roadmaps | #810, #826, #840 | All touch `src/data/roadmapMergeReconciliation.json`; preserve source-bound snapshots and reconcile same-path changes sequentially rather than treating Drafts as current code or merging blindly |

**Open Issues:** #560 Free-Tier password breach protection HOLD; #664 backup reader/pg_net/cron P0; #760 linear-history merge settings; #756 per-user Notion export; #757 private avatar storage. A closed PR or repository code does not close these issues by inference.

## Risk-ordered next slices

1. **TRUST/PLATFORM P0:** #664 isolated recovery and retention/provenance; keep database/Vault changes blocked until backup and authorization are proven. #560 retains free-tier limitation.
2. **GROWTH/PRODUCT P0:** Resolve #815→#821 and #819/#824 consent/lead boundaries; #850 cost evidence and #849 plan drafts remain independent until real GA4 and buyer receipts exist.
3. **MARKET/PRODUCT P1:** #838/#846 browser accessibility and source provenance; #834 synthetic research; #714 requires current rights and source eligibility before any signal admission.
4. **TRUST P1:** Clear existing #760 setting mismatch separately. Fold #810/#826/#840 documentation into the *single canonical effective projection* only on verified main states; do not overwrite old source-bound evidence.

## Verification and rollback

Changed effective roadmap fields retain `OFFEN`, null progress and explicit missing-runtime language. Targeted test: `node --import tsx --test src/data/__tests__/roadmapCurrentMainState.test.ts`; existing CI and required `Docker Security Gate` / `Domain Governance` must run on the exact PR head. Source evidence from GitHub is not proof that these tests ran locally or in GitHub. Rollback is revert of this scoped roadmap projection, negative test and documentation; no production data or settings were changed.
