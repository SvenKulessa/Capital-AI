# Homepage Editorial Candidate · DTCC / Solana · 2026-11-15

Domain: GROWTH · Supporting TRUST · Scope: **DRAFT ONLY** · Main baseline: `f92df36aad5e578599285cecc3cdcb84e7f995dc`.
No changes to `src/features/home/homeEditorialEdition.json`; no publishing, no Owner approval manifest.

## Fact check: VERIFIED for draft

- Primary source, Solana Foundation, published **2026-11-12**: https://solana.com/news/dtcc-tokenization-service-to-connect-with-solana
- Independent primary corroboration, DTCC, published **2026-11-12**: https://www.dtcc.com/press-releases/2026/dtcc-tokenization-service-to-connect-with-solana
- DTCC's **Tokenization Service itself is already available**, as independently reported on 2026-10-28: https://www.dtcc.com/press-releases/2026/dtcc-tokenization-service-goes-live
- The **Solana connection** is explicitly *planned for H2 2027*, **not available in production** as of this review. The proposed service would let eligible DTC-custodied securities be represented as tokens, with existing safeguards. There is no supported claim of present Solana tokenized issuance, expected return or a market price.
- The source URL matches the existing strict Solana allowlist and has no query string, login, or redirect. Date is not future-dated.

## Original candidate draft (content identity)

```json
{
  "id": "dtcc-solana-tokenization-2027",
  "topic": "Solana · Wertpapier-Tokenisierung",
  "title": "DTCC plant Solana-Anbindung für tokenisierte Wertpapiere",
  "summary": "Die DTCC will ihren bestehenden Tokenisierungsdienst in der zweiten Jahreshälfte 2027 mit Solana verbinden. Damit sollen geeignete, bei DTC verwahrte Wertpapiere als Token bereitgestellt werden können. Die Solana-Anbindung ist bislang nur angekündigt.",
  "context": "Tokenisierung bildet bestehende Wertpapieransprüche digital ab. Geplant ist eine neue technische Verbindung, keine bereits gestartete Solana-Ausgabe.",
  "graphic": {
    "kind": "status",
    "caption": "DTCC: Dienst und geplanter Netzwerkanschluss",
    "rows": [
      {"label": "DTS-Dienst", "outcome": "Seit Oktober 2026 live"},
      {"label": "Solana-Anbindung", "outcome": "Für H2 2027 geplant"},
      {"label": "Wertpapier-Rechte", "outcome": "Laut DTCC weiter geschützt"}
    ]
  },
  "source": {
    "name": "Solana Foundation",
    "url": "https://solana.com/news/dtcc-tokenization-service-to-connect-with-solana",
    "date": "2026-11-12"
  },
  "editorial": {"relevance": 5, "impact": 4}
}
```

SHA-256 via canonical `homeStoryDigest` (JSON key order as in contract): `97ffaa249087af9a515e80455292ca8d2e77372a6915ed4cf037f5b87f921b90`. This hash proves a candidate's exact bytes, **not** rights or editorial approval.

## Relevance

As of 2026-11-15:
- Freshness 24/30 (3 days × -2).
- Relevance 5/5 (40/40): financial infrastructure, custody, digital securities and the distinction between a proposed integration and a released product.
- Impact 4/5 (24/30): important institutional *plan*, not an already-live Solana implementation.
- **Total 88/100**, threshold ≥65; proposed replacement is the 2026-10-29 Polygon OMS/Solana item (score 50/100). Newer date and strictly higher score; no duplicate URL/title/ID.

## Editorial / rights separation

- **FACT_VERIFIED**: Solana and DTCC original statements cross-checked; independent German summary written from specific facts, not a copied article or quote.
- **GRAPHIC_ORIGIN**: the three-line status chart is original explanatory text built for CAPITAL-AI's existing `graphic.kind=status` renderer, not a downloaded image, logo, or third-party media. Actual visual QA and owner-of-asset proof remain **NOT_PROVEN** until the relevant code/design is accepted.
- **SOURCE_RIGHTS_BLOCKED / NOT_PROVEN**: Solana's published terms at https://solana.com/tos limit commercial use, automated retrieval, redistribution/reproduction and unauthorized linking. A manually reviewed, original factual summary plus a link is **not equivalent to a granted commercial reuse license**. No excerpt/license from the third-party page is carried into this file, and no owner/content-specific rights clearance has been established.
- **CONTENT_ENGINE_CADS**: `planContentCampaign` with WEBSITE TEXT/IMAGE has not been executed against this candidate; technical status is **NOT_PROVEN**, and that contract's editorialReview remains REVIEW_REQUIRED regardless of technical PASS.
- **EDITORIAL DECISION**: **REVIEWED_FOR_DRAFT; PUBLICATION_BLOCKED**. Do not set `reviewer: OWNER`, `status: APPROVED`, `sourceRights: LINK_ONLY` in a promotion manifest based on this review. Re-evaluate with a trusted owner-authored approval, applicable rights evidence, exact digest and CI before proposing a data change.

## CI / merge dependency

PR #738 code-only security fix changes `Dockerfile` + `.dockerignore` to include the exact imported `home-editorial-review.mjs` module. Main and PR #739 must be re-checked because #739 also touches `home-editorial-edition.mjs`, tests and the bundled news JSON. Neither a cleared build nor this draft candidate authorizes merging PR #738 or publishing the homepage.

Rollback: remove this draft/revert the feature branch; production content remains unchanged.
