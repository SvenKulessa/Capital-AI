# GROWTH — Official RSS → Learning Hub + Social drafts (smallest slice)

Date: 2026-11-14. Baseline main: `986038f3a734f9350418149440ac0327dfbe095a`. Governance: `AGENTS.md` / `SOLO_MAINTAINER_FLOW@2`.

## Scope and authority

- Single pinned official source: ECB press RSS (`https://www.ecb.europa.eu/rss/press.html`). ECB lists this RSS offering on its official RSS page. There is no crawling arbitrary URLs and no automatic polling, provider OAuth or paid inference.
- Parse a bounded RSS 2.0 metadata subset (title, link, publication timestamp) with strict origin/path, freshness, duplicate, XML entity and resource-size controls. A deliberately restricted RSS parser is not a generic XML/Atom parser. Future sources require explicit allowlisting and new fixtures.
- `eventAt=null`: the feed publishing time is not represented as an underlying financial event time. `LICENSE_REVIEW_REQUIRED`: public availability alone is not a commercial re-use grant. No external source body, prices, forecasts, or scraped text are reproduced.
- One deterministically phrased evergreen educational article, a source/quiz trace and three channel-specific DRAFT texts. All still require editorial and rights review. The article is not inserted into `src/data/learningArticles.ts` (that list contains PUBLISHED pages only).
- Uses the **existing** `assessCadsContentCampaign`, `planContentCampaign` and `buildDraftContentSocialPackage` via the repository contracts. The campaign source ID is the SHA-256 of the exact selected metadata source set (`CONTENT_SOURCE_SET_SHA256` semantics), not a claimed Git commit or verified source-body digest.
- Social delivery stays owned by `SOCIAL_MEDIA_ENGINE_ONLY`: `approvals=[]`, `deliveries=[]`; publisher adapters and production DB remain untouched.

## Read-only reference and tests

Open PRs at branch creation: #703 (TRUST), #691 (TRUST), #548 (PRODUCT/held). No open GROWTH scope PR found; package.json overlap with #548 must be rechecked before any later merge.

Isolated local Node 22 test runner (controlled fixtures; no network) command:

`node --test scripts/growth/news-to-learning.test.mjs`

7 subtests, 7 passed, 0 failed, exit 0. These isolated tests use a local test-only mirror of the repository CADS campaign-check function and stubbed existing TypeScript adapter contracts because the workspace cannot reach GitHub/npm. They do **not** certify the full repository's TypeScript integration or CI status. Real default-adapter execution, full `npm test`, `npm run lint`, Docker Security Gate and Domain Governance remain **NOT_PROVEN** until GitHub CI readback.

Negative cases: unapproved/cross-origin/credentialed/HTTP/port/path-escape URLs, future/stale/invalid dates, duplicate conflicting metadata, entity injection, hostile markup, oversized response, wrong MIME/403/redirect, rights tampering and attempts to smuggle approvals/deliveries.

## DoD, costs and rollback

- Gate A: source-bounded ingestion and deterministic content proven locally with synthetic fixture.
- Gate B: real `planContentCampaign` and `buildDraftContentSocialPackage` integration, full repository tests and CI readback required before merge.
- Gate C: human editorial/license/brand/SEO/a11y review and explicit separate publisher authorization required before any release.
- New runtime recurring costs: none. No new dependencies; optional `fetch` only when explicitly invoked. OAuth, app data, paid providers, tokens, and production database unchanged.
- Rollback: revert the feature-branch commit(s) containing this isolated module, test and documentation. No migration or persistent state to reverse.

Statuses: CODE/LOCAL FIXTURE **VERIFIED**; LIVE FEED **NOT_PROVEN**; PRODUCTION INTEGRATION **NOT_PROVEN**; LICENSE/PUBLISH **BLOCKED**.
