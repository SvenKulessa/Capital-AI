# GROWTH — HomeEditorialNews: Source rights, editorial reuse and graphic provenance

Stand: 2026-11-15 (Europe/Berlin). Scope: [PR #739](https://github.com/SvenKulessa/Capital-AI/pull/739), `AGENTS.md` / `SOLO_MAINTAINER_FLOW@2`. Baseline for the review: `main@f92df36aad5e578599285cecc3cdcb84e7f995dc`.

**Decision:** The source and technical provenance checks below are documented. None is a content/brand/license grant from the source provider or a publishing approval. Product JSON remains `REVIEW_REQUIRED` and `websiteAllowed:false` for all three rights classes (article, source, graphic). No currently reviewed, independently approved exact content snapshot exists in `src/features/home/homeEditorialRightsLedger.mjs` (`HOME_PUBLIC_DISPLAY_REVIEWS=[]`). The website projection and editorial candidate selector therefore remain fail-closed even if a candidate's JSON self-asserts `APPROVED`. No merger, deployment, source scraping or publishing is included.

## Use-case separation — do not collapse these permissions

| Use case | What evidence permits or limits | Decision for CAPITAL-AI |
|---|---|---|
| Source URL / factual attribution | Direct, fair/legal links to the official publication; Polygon §5(c) explicitly permits links without implying partnership, endorsement or damaging reputation; XRPL primary-source URL is public | **CONDITIONALLY PERMISSIBLE** as a plain attribution link; not equivalent to permission to copy an article or brand asset |
| Independently written factual summary | New German wording, cited origin and date, no copied creative expression, no invented facts/prices, no third-party visual bytes | **POSSIBLE**, subject to confirming editorial authorship, accuracy, prohibited extraction methods and the precise usage context; not a blanket provider license |
| Verbatim article, translation, image, layout or copied original figure | Protected original text/media and third-party licensed material may trigger copyright, license, brand and contractual restrictions; Polygon §§4(b), 5(a,c) do not grant broad commercial republishing | **BLOCKED** pending specific right, applicable exception or valid separate license |
| Crawling, scraping, automated extraction from Polygon site | Polygon §4(b) prohibits using data-mining tools, robots, crawlers and similar extraction tools, plus unauthorized manual copying | **BLOCKED** without a separately established legal/contractual basis and explicit authorization; no such ingestion activated |
| First-party code-rendered info graphic | Original repo-markup is independently traceable; no downloaded third-party image is bundled by this component | **TECHNICAL ORIGIN VERIFIED**, but independent authorship/rights-holder and brand/claim approvals remain **NOT_PROVEN** |

This is evidence/risk classification, **not legal advice** and not an added organization-wide admission policy. The existing root `AGENTS.md` remains authoritative for engineering.

## P0 — XRPL (2026-11-09)

**Official article:** https://xrpl.org/blog/2026/testnet-devnet-reset (Testnet and Devnet reset planned for 2026-11-25). Exact authored Markdown exists in the official [XRPLF developer portal repository](https://github.com/XRPLF/xrpl-dev-portal/blob/master/blog/2026/testnet-devnet-reset.md), file blob SHA `cd27044287521108fbf6c33cc6a90283e5c5e60e`; the repository file has frontmatter date `2026-11-09`. This establishes source provenance and the factual advisory; it is **not** a legal opinion about all constituent assets.

**License:** The XRPLF developer portal [LICENSE](https://github.com/XRPLF/xrpl-dev-portal/blob/master/LICENSE), blob SHA `edcf3ac952af03e64739ad3d0bca01e0a20c5637`, identifies XRPL.org and its **original contents** as MIT. Its permission grant includes commercial use, distribution, modification and sublicensing, subject to retaining copyright and the permission text in **all copies or substantial portions**. The license also lists additional ISC/Apache/OFL components and separately licensed third-party libraries, fonts and icons. Scope of the MIT grant is **original portal content**, not automatically a logo, external screenshot, outside image, branding endorsement or unrelated third-party media. Preserve attribution even for own factual summaries.

**Exact usage here:** The CAPITAL-AI excerpt is a short editorial restatement of facts (date, affected Testnet/Devnet and unaffected Mainnet). It does not embed XRPL's original graphic assets or copy a substantial part of its Markdown article. If the future editorial edition does reproduce substantial licensed text or images shown to be covered by MIT, provide the XRPLF copyright and full relevant license notice with that distributed material, verify asset-specific third-party notices and record an exact reviewer receipt; a bare license URL/score is not a receipt.

**First-party graphic technical ancestry:** Original CAPITAL-AI commit `ef7a9f79cf8fc044faaccf57414133ba5e082994` from PR [#732](https://github.com/SvenKulessa/Capital-AI/pull/732) added both `src/features/home/HomeEditorialNews.tsx` and `src/features/home/homeEditorialEdition.json`. The `NewsGraphic` component renders `status` as HTML `<dl>`, `<dt>`, `<dd>` from checked-in rows (Testnet / Devnet / Mainnet); other variants use lists. There is **no external `img` URL, SVG copy, fetched logo or external byte dependency** in that render component. Structured asset reference `home-xrpl-vector-v1` is a local *logical* identifier, **not** a content SHA-256 or a creator signature. Code provenance **VERIFIED**; verified ownership/authorship, complete visual review and use of named marks **NOT_PROVEN**.

**Decision:** `xrpl` has a current authoritative source and a documented MIT framework for original content. Do **not** change `story`, `source` or `graphic` to `APPROVED` until an identified content/graphic rights-holder or editorial owner confirms the exact authored summary and graphic, attribution/notice scope, no logo copying and the approved display revision. It is a candidate for **further private editorial acceptance**, not current public admission or an implicit license approval.

## P1 — Polygon (2026-11-12 and 2026-10-29)

**Primary sources:** 
- https://polygon.technology/blog/sofiusd-lands-on-polygon — 2026-11-12, SoFiUSD supported on Polygon.
- https://polygon.technology/blog/polygon-oms-supports-solana — 2026-10-29, Polygon Open Money Stack connection to Solana.
- https://polygon.technology/terms-of-use — last updated **2026-11-10** (as shown on the official page; terms may change).

**Rights clauses checked:** §4(b) restricts unauthorized harvesting, crawling, scraping and manual copying; §5(a) limits the license for the interface/content to accessing and using the features, not blanket republication; §5(c) permits fair and legal links, with **no suggested affiliation, endorsement or approval** without explicit consent. Polygon graphics/logos are subject to separate brand-guideline conditions. Third-party services/material are covered by their own terms (§6). The website's free accessibility is **not** a commercial reuse grant.

**Safe editorial distinction:** A neutral link `Quelle: Polygon` to the official URL can be used under §5(c)'s stated conditions, and new factual wording may be separately reviewed for accuracy and permitted sourcing. Neither permission conveys authorization to duplicate Polygon's paragraph text, promotional imagery, logos or charts. Do not automatically scrape Polygon's pages into the Social Content Engine; no robots/Terms override from scoring or CADS.

**Current edition:** The SoFiUSD article is **3 days old** and scores **88/100** on 2026-11-15; its graphic `home-polygon-vector-v1` is repository-local markup, but verified authorship and content rights receipt are still missing. The OMS article is **17 days old** with **14-day maximum freshness** and score **50/100**; it is **STALE**, independently of any eventual license finding. Both retain `REVIEW_REQUIRED` for story/source/graphic and **must not be added to the public display or automatic replacement** until all specific rights and freshness conditions are met.

## Release-neutral review procedure

1. Review the *exact* candidate's independently authored text, original source URL/date, permitted source collection method, visual composition, third-party assets and terms/notice obligations. Only recorded public-display rights, not the score, constitute approval evidence.
2. Produce a **separate and revision-bound** reviewer entry in `homeEditorialRightsLedger.mjs`, binding `storyId`, `kind` (`story` / `source` / `graphic`), `allowedUse` (`ORIGINAL_EDITORIAL_SUMMARY` / `ATTRIBUTION_LINK_ONLY` / `FIRST_PARTY_STRUCTURED_GRAPHIC`), `evidenceRef`, `reviewedAt`, and `contentSnapshot` to the *identical approved content*. The corresponding candidate JSON must agree. This prevents self-approval by a generated candidate. Do not treat synthetic fixture approvals as production license evidence.
3. For non-empty public-display rights, re-evaluate on the publication date: all three rights uses admitted **and** age no greater than the story's `maxAgeDays`. An expired item is not shown despite prior approval. A content/graphic/source revision invalidates the old snapshot and requires another review.
4. Existing `planContentCampaign`/CADS tests and required CI are technical only. A specific source-rights or brand-rights legal question remains for its actual rights-holder/owner. Publishing remains a distinct action under `SOCIAL_MEDIA_ENGINE_ONLY` with `publicPublishAllowed:false`; no rights record may self-authorize publishing, deployment or provider calls.

## Status and rollback

| Item | Status |
|---|---|
| XRPL official article, date, developer-portal Markdown and MIT source | VERIFIED |
| XRPL source-side MIT obligations and original-vs-third-party scope | VERIFIED / documented terms, not a blanket grant |
| First-party graphic code ancestry, local DOM-only rendering | VERIFIED |
| Actual authorship/assignment of rights to graphic and original summary | NOT_PROVEN |
| Polygon conditional fair/legal attribution links vs third-party copying | VERIFIED / scoped |
| Polygon express permission to copy full articles/media into commercial assets | BLOCKED / no permission evidenced |
| 2026-10-29 Polygon source freshness on 2026-11-15 | STALE |
| Three-item public homepage admission and publication | BLOCKED / DRAFT_ONLY |

No original copyrighted article/media duplicated into this evidence report, no approval artificially generated and no paid provider engaged. Rollback: revert the PR's documentation/ledger/code changes without touching production.