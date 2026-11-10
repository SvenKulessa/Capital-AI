# GROWTH / AP-SOC-02: Public Blueprint Sharing — 2026-11-10

Governance: AGENTS.md / SOLO_MAINTAINER_FLOW@1. Scope: public concept sharing only.

## Implemented scope

- On `/marketscreener/dokumentation`, a user-initiated button shares the selected **public catalog concept** through the browser's native Web Share API.
- Clipboard fallback when native sharing is unavailable, and a manually selectable URL if neither API works.
- Stable `https://capital-ai.online/marketscreener/dokumentation#share=<catalog-id>` links, where `catalog-id` is checked against existing `STUDIO_BLUEPRINTS`. The page restores the selection on entry.
- No request to X, LinkedIn or any social-provider API; no automatic publishing or scheduled action.
- No private provider identity, account state, credentials, saved pipeline, prices or entitlement in the link.
- Share-dialog return is not a provider publication receipt. Public concept documentation is **not** evidence of a saleable Blueprint, financial performance or BaFin compliance.
- The URL contains only a hash fragment and must not be treated as proof of campaign attribution.
- Explicit user-initiated **X and LinkedIn text draft copy** actions now build conservative, non-promotional copy from the same allowlisted public catalog ID. Drafts contain no financial return, live throughput or compliance claim. Browser clipboard permission denial falls back to a selectable read-only textarea. There is no provider API call, scheduling, external share, consent grant or publication.
- The AP-SOC-02 roadmap entry remains OPEN for private sharing, asset/claim-rights review, mobile/browser acceptance and any actual external publisher integration. Text drafts are **not** approval records or provider receipts.

## Verification

Existing required `npm run test:blueprint-demo` executes the amended `scripts/market-blueprint-demo.test.mjs` under `node --import tsx`.
It checks all 7 allowlisted concept IDs, canonical origin/path, deep-link round-trip, reject paths, query injection, invalid IDs, finite X/LinkedIn text drafts, rejected platform/ID injections, no external domains and clipboard-only UI feedback/button bindings.

Additional acceptance before full AP-SOC-02 closure: CI on exact PR head (Domain Governance, Docker Security Gate), Mobile/Desktop browser QA and deployed source readback. This repo-slice can be merged when gates pass; it does **not** imply private sharing or published social posts.

Rollback: protected revert of this feature, no schema, billing, providers or tokens changed.
