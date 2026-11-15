# HomeEditorialNews — P0 rights-holder chain and P1 editorial candidate acceptance

Review date: **2026-11-15**, timezone Europe/Berlin. Scope: [Draft PR #739](https://github.com/SvenKulessa/Capital-AI/pull/739) at/after `1a39a3eefb2a1752dfd3b45580ad57a7e6116f7e`. **No release/merger/deployment authorization.** Root `AGENTS.md` is the only repository-wide engineering authority. This record is evidence and a review packet, not a new global approval gate or a legal sign-off.

## Decision summary

- **XRPL:** source, original-portal MIT license and first-party *technical source-code lineage* **VERIFIED**. Independent **human authorship, editorial ownership and right-of-use declaration NOT_PROVEN**. The existing neutral news text and structural status graphic are ready for *a targeted ownership/notice review only*, not for public display. Independent public-display rights ledger stays empty.
- **Polygon SoFiUSD:** primary date, factual announcement and limited conditional linking basis **VERIFIED**. The editorial draft has been rewritten in CAPITAL-AI's own German words (not a translation/copy of a paragraph) and expressly distinguishes the stablecoin from insured deposits. As of 2026-11-15 its source is **3 days old** (limit 14 days). Story, source and graphic rights remain **REVIEW_REQUIRED**. It is a *pre-review draft*, not an approved public or final acceptance candidate.
- **Polygon OMS/Solana:** 2026-10-29 source is **17 days old** (14-day limit), so **STALE / EXCLUDED** from a current editorial acceptance, regardless of rights. Retained in historical edition JSON for traceability, not admitted for homepage display.
- **Public-display accepted candidates = 0.** Only an exact-snapshot entry matching separately recorded `story/source/graphic` rights in `src/features/home/homeEditorialRightsLedger.mjs`, plus freshness, can progress to site rendering or further release assessment. At this review, the ledger is deliberately `[]`.

## P0 — evidence chain for XRPL

| Element | Primary evidence | What is actually proved | Outstanding |
|---|---|---|---|
| Official factual announcement | [XRPL blog, 2026-11-09](https://xrpl.org/blog/2026/testnet-devnet-reset); [official source Markdown](https://github.com/XRPLF/xrpl-dev-portal/blob/c66cd324556389f3bdea6be9ac35157c33b559d3/blog/2026/testnet-devnet-reset.md), Git blob `cd27044287521108fbf6c33cc6a90283e5c5e60e` | 2026-11-25 planned Testnet/Devnet reset, associated test ledger data lost, Mainnet not affected | Any operational change after the 2026-11-15 review would require rechecking |
| Original developer portal copyright/license | [XRPLF LICENSE](https://github.com/XRPLF/xrpl-dev-portal/blob/e452a3285b59c2ebdd7e32428b3005cf478355d7/LICENSE), Git blob `edcf3ac952af03e64739ad3d0bca01e0a20c5637` | Original XRPL.org portal content is MIT; permission including commercial re-use for covered content, on MIT conditions | Confirm any actually copied asset is original portal material rather than third-party, branded or independently licensed |
| CAPITAL-AI artifact introduction | [CAPITAL-AI merge commit](https://github.com/SvenKulessa/Capital-AI/commit/ef7a9f79cf8fc044faaccf57414133ba5e082994), dated 2026-11-15 05:08:24 UTC, GitHub author/account `SvenKulessa` | First checked-in HTML renderer and JSON story; no earlier revisions in the traced `homeEditorialEdition.json` file history | Commit account and prose in commit message **do not prove** the natural-person creator, human originality or legal rights assignment |
| Original renderer | `src/features/home/HomeEditorialNews.tsx`, original blob `47355ea40c3dc659cb03ccdad8cc598a2aa65ef1` | XRPL status diagram rendered from `<figure><figcaption><dl><dt><dd>` and local rows, without an external image/logo request | Actual layout/art direction contribution, third-party design derivation and rights assignment |
| Original edition data | `src/features/home/homeEditorialEdition.json`, original blob `9aeba175431b45fd711ac45f484fbb12b6120284` | XRPL card contains local German prose, caption and status labels; `home-xrpl-vector-v1` is only a logical asset reference, **not** a hash or licensing receipt | Confirmation that wording and graphic were independently generated/edited and approved by an authorized rights owner |
| CSS origin | `src/features/home/homeEditorialNews.css`, PR #732 code/style | CSS gradients, borders, typography; no `url()` external image or source artwork in the inspected homepage CSS | Other global UI/brand assets are outside this narrowly inspected card scope |

### MIT and attribution obligations for actual intended use

1. **Present use:** CAPITAL-AI only links the XRPL source and summarizes the date/affected environments in its own words; its HTML status table does not copy an XRPL image. For *facts-only independent summaries and plain links* the MIT permission-text redistribution requirement is **not triggered merely by citing a source**. A visible source attribution remains appropriate for auditability.
2. **If copying or distributing substantial original XRPL portal text, code or covered media:** preserve the relevant XRPL Foundation/contributors copyright text and **full MIT permission/warranty text** in all copies/substantial portions, as the MIT license requires. Supply an accessible notice in the delivered artifact and trace precisely the source revision and any modifications.
3. **Third-party material, fonts, icons and brands:** the portal's LICENSE identifies separately licensed components, including ISC, Apache and OFL. The MIT header cannot be substituted for their conditions. Do not reuse XRP Ledger logos, provider artwork or brand appearance without verifying their own terms. The rendered plain text `XRP Ledger`, `Testnet` and `Devnet` identifies the subject; it is not an authorization to imply sponsorship.
4. **No notice laundering:** a mere hyperlink to MIT, a GitHub SHA, a test PASS or an AI-authored statement is not a license grant. Explicitly record whether any covered expression was copied. The current card has no observed external image and no substantial copied source text; planned usage is `ORIGINAL_EDITORIAL_SUMMARY` + `ATTRIBUTION_LINK_ONLY` + `FIRST_PARTY_STRUCTURED_GRAPHIC`.

### Missing rights-holder declaration — unfilled evidence fields

An authorized human editorial/repository rights holder must complete an independently traceable GitHub review, signed attestation or equivalent record **for the actual deployed revision**. No signature or transfer is assumed. The minimal review record should identify:

- Natural-person creator(s) or lawful rights holder(s) of the article wording, graphic data, graphical layout and any AI-assisted contribution; whether any prior third-party asset/source text was incorporated.
- Basis for CAPITAL-AI's commercial web-display entitlement, including employer/client assignments, commissioned works or other contributor permissions when applicable; scope and dates of the permission.
- Explicit confirmation that the status graphic uses **only** own HTML/CSS/text, no XRPL visual asset or logo, and no protected external design copied into the graphic.
- Exact Git references for the approved `HomeEditorialNews.tsx`, `homeEditorialNews.css`, `homeEditorialEdition.json` and current content snapshot, linked to `home-xrpl-vector-v1`; confirmation of permitted attribution/notice obligations.
- Review date, reviewer identifier, source permalink, `story/source/graphic` use-case decisions, and the evidence URL(s). Any `APPROVED` ledger value must be based on actual verified receipts and must match the separate content snapshot. **These fields remain empty/unapproved until real evidence exists**.

No one has provided such a human rights-holder attestation in the inspected code or task. This is a real unresolved legal provenance fact, not a CI fault.

## P1 — editorial candidates with current source dates and permitted copy boundaries

### Candidate A: Polygon SoFiUSD — rights pre-review only

- **Official link:** https://polygon.technology/blog/sofiusd-lands-on-polygon
- **Publication:** 2026-11-12; **age:** 3 days as of 2026-11-15; **current under 14-day criterion:** YES.
- **Independent German draft in** `src/features/home/homeEditorialEdition.json`, article ID `polygon`:
  - Headline: **SoFiUSD: Polygon als zusätzliches Netzwerk**
  - Summary: *Polygon meldet, dass SoFiUSD nun auch auf Polygon unterstützt wird. Für SoFi-Mitglieder nennt die Quelle Kauf, Verkauf, Verwahrung und Umtausch innerhalb der SoFi-App. Ethereum und Solana werden als weitere Netzwerke aufgeführt.*
  - Context: *SoFiUSD ist laut Originalbeitrag kein Bankguthaben. Der Stablecoin selbst ist weder durch FDIC noch SIPC versichert.*
  - Graphic: purely local network-label renderer, with text names `Polygon`, `Solana`, `Ethereum`. No official images/logos, charts or screenshots are imported by this component. No prices.
- **Fact check:** All claims are supported by the original Polygon blog, including the deposit-insurance distinction; a source announcement is not an independent provider/financial verification and should be framed as *laut Polygon*.
- **Legal distinction:** https://polygon.technology/terms-of-use (2026-11-10), §5(c) permits fair/legal links with no implied affiliation/approval/endorsement; §§4(b), 5(a) do **not** create permission to scrape/copy articles/media for monetization. No automated Polygon harvesting is authorized. Network names as text are factual references, **not** a commercial license for marks/logos.
- **Decision:** technically source-verified, wording newly prepared, within freshness window. **RIGHTS REVIEW REQUIRED** for actual wording and graphic ownership, separately recorded scoped website-use rights and no prohibited collection method. Remains `websiteAllowed:false` / not displayable until an independent final decision exists.

### Candidate B: XRPL scheduled reset — targeted ownership review only

- **Original link:** https://xrpl.org/blog/2026/testnet-devnet-reset; **publication:** 2026-11-09; **age:** 6 days; **current:** YES on the review date.
- **Current local wording:** independently worded German summary identifying planned event, affected test environments and unaffected Mainnet. Local status grid uses only text and CSS.
- **Decision:** source verified, MIT obligation scoping documented, first-party *code lineage* verified, **human author/rights-holder and approval unproven**. No public article or graphic release.

### Excluded candidate C: Polygon OMS/Solana

- **Original link:** https://polygon.technology/blog/polygon-oms-supports-solana; **publication:** 2026-10-29; **age:** 17 days on 2026-11-15.
- **Decision:** **EXCLUDED from the current editorial acceptance** because 17 days exceeds the configured `maxAgeDays:14`, even before resolving Polygon's rights/reuse question. Its presence in the historical JSON is not a current display approval.

## No-publication acceptance matrix

| Article | Official link/date verified | Own wording prepared | Source age ≤14d | Human rights-holder evidence | `story/source/graphic` independent ledger | Public-admitted |
|---|---|---|---|---|---|---|
| XRPL reset | VERIFIED | Existing local summary | YES, 6d | NOT_PROVEN | NONE | NO |
| Polygon SoFiUSD | VERIFIED | Revised private draft | YES, 3d | NOT_PROVEN | NONE | NO |
| Polygon OMS/Solana | VERIFIED | Existing historical draft | NO, 17d | NOT_PROVEN | NONE | NO |

**Gate semantics:** Only *fresh* articles with actual separately validated rights for their exact content snapshot can enter a later release acceptance; no rights approvals currently exist, so **0/3** advance. In the future a source expiry, edited text, altered diagram, new logo, revoked permission or stale review must invalidate any previous approval. `CADS PASS` only establishes technical content quality. `publicPublishAllowed:false` remains required.

## Evidence, test and rollback

- Verify existing `src/features/home/homeEditorialAdmission.test.ts` rights-denied, source-only, modified-text/graphic and stale cases and `scripts/growth/home-editorial-edition.test.mjs` candidate rejection on exact HEAD. Existing CI handles `npm test`, TypeScript/lint, Domain Governance and Docker Security Gate.
- This packet is editorial evidence, not original artwork bytes or a signed author document. No source-body scraping, third-party media copying, self-signed grant, false market price or automatic publishing was done.
- Rollback: revert the editorial text change and this review record in the existing PR; no provider configuration or production state was touched.
