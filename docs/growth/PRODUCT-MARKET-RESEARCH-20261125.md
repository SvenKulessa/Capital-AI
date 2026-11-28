# Product market research and AI-Smartcopy pilot — 2026-11-25

Baseline 352f1a105030a3c0b168459783be7668350128ac (merged #966). Existing Growth CLI gains `--product-research /absolute/private/records.json /absolute/private/review.json`. Both inputs use the existing bounded private-file loader (0600, current UID, no symlinks). Records: `{"records":[{"productId":"ai-smartcopy","kind":"PLATFORM_RULE","entityId":"acode","sourceUrl":"https://docs.acode.app/docs/getting-started/publish-from-ci","observedOn":"2026-11-25","summary":"Official docs describe CI publishing."}]}`. Independent reviewer file: `{"asOf":"2026-11-25","reviewGrants":[{"digest":"<researchDigest of exact record>","reviewRef":"<operator's review reference>"}]}`. Generate digests via exported researchDigest, never automatically approve imported records. Date is an explicit historical/as-of parameter, records outside 30 days of it or in the future are excluded. URLs are data, not fetched. No crawler, schedule, additional provider, raw page text or permission grant. New products from existing registry receive research queries. Unknown channels are source candidates only, not automatically admitted to LangGraph/publishing. Existing RAG/rights/consent and channel graph remain authoritative; no live retrieval or source rights implied.

## AI-Smartcopy: reviewed public research, not a sales authorization

- Acode documentation: https://docs.acode.app/docs/getting-started/publish-from-ci and https://docs.acode.app/docs/plugin-essentials/manifest . Official publishing interface exists, but no API key or publication authorized. Earlier private provider guidance is SmartClip-specific, not a general approval for AI-Smartcopy or mobile purchase links.
- Alternative Termux:API: https://f-droid.org/packages/com.termux.api/ describes system clipboard from shell scripts. Separate Termux environment, free/open source alternative. Do not claim exclusive feature.
- AcodeX: https://github.com/bajrangCoder/acode-plugin-acodex includes terminal clipboard support. Candidate differentiation is explicit wrapped-command completion, exit-code capture and native readback on tested configuration, not universal compatibility.
- Android: https://developer.android.com/privacy-and-security/risks/secure-clipboard-handling . No claim of comprehensive DLP. Clipboard text never used for marketing analytics.
- Product Hunt https://help.producthunt.com/en/articles/17734384-5-how-to-promote-your-launch-and-what-to-avoid ; no vote solicitation. HN https://news.ycombinator.com/newsguidelines.html : human-authored only, no generated copy or automated posting. TikTok own-brand disclosure https://support.tiktok.com/en/business-and-creator/creator-and-business-accounts/promoting-a-brand-product-or-service . All are prep only.
- Private 1.3.1 RC is not a customer release. Acode listing, fresh install device evidence, rights, tax, legal, payment, support and release identity stay separate. No price or revenue claim. SmartClip #916 unaffected.

Pilot text briefs for supported canonical channels are passed to existing ContentCampaign and Social Package contracts. Existing Universe visual identity is returned; MediaKit asset creation and rights are not asserted. Manual channels remain separately marked. Draft source identities bind exact research digests. No purchase CTA, public assets, provider calls, costs or publish grants. Existing X consent/initial subscription invoice adapter is fixed to a different campaign; do not reuse those receipts for AI-Smartcopy one-time licenses. Optional analytics require scoped consent, independent authenticated event/commerce readback and explicit refund reversal; all actual KPIs null. Product-specific durable conversion reconciliation and live research through authorized providers remain follow-up work.

Tests: node --test scripts/growth/product-market-research.test.mjs (9 local interface/negative cases); canonical integration in existing npm run test:growth-intelligence; no new CI gate. Rollback by reverting this PR.

## Demand, willingness to pay and product acceptance — 2026-11-28

Baseline: `ed67c384281f1e30f8d0e30b6a2faf37819d28e3`. The existing `--product-research` entrypoint now returns `products[].validation` (`CAPITAL_AI_PRODUCT_VALIDATION@1`) for every registered product. It includes a three-part questionnaire/method plan, descriptive study results, missing-evidence list and a separate product-approval matrix. Existing text-only records and their digests remain compatible. No new crawler, provider, scheduler, dependency or paid resource.

| Research dimension | Accepted study methods | Result and limits |
| --- | --- | --- |
| Demand | `PROBLEM_INTERVIEW`, `DEMAND_SURVEY` | Positive answers / sample size per study, segment and version. Text signals remain separate; no population estimate. |
| Willingness to pay | `PRICE_SURVEY`, `PRICE_OFFER_TEST` | Positive answers for an explicit EUR price and `one_time`, `monthly` or `annual` interval. Declared intent and offer response are not payments; no optimal or approved price inferred. |
| Customer acceptance | `CONCEPT_TEST`, `PROTOTYPE_TEST`, `PILOT_FEEDBACK` | Concept response, observed core-task completion and pilot feedback remain distinct. Customer acceptance does not grant owner approval. |

### Existing private input and review path

A record may include exactly one `study` object. New kinds `WILLINGNESS_TO_PAY` and `PRODUCT_ACCEPTANCE` require it; `DEMAND_SIGNAL` optionally accepts it. Other kinds cannot contain studies. The existing independent `reviewGrants` file must bind the digest of the complete record, including canonical study bytes. The 30-day as-of freshness rule, unknown-product exclusion and bounded private-file loader remain in place.

Synthetic format example only; **not measured market evidence or a price recommendation**:

```json
{
  "productId": "ai-smartcopy",
  "kind": "WILLINGNESS_TO_PAY",
  "entityId": "synthetic-survey",
  "sourceUrl": "https://capital-ai.online/",
  "observedOn": "2026-11-28",
  "summary": "Synthetic format example; no real respondents.",
  "study": {
    "studyId": "synthetic-price-study",
    "segmentId": "mobile-developers",
    "productVersion": "private-rc",
    "method": "PRICE_SURVEY",
    "recruitment": "Synthetic fixture",
    "limitations": "Not market evidence; no representative sampling",
    "consentRef": "synthetic-consent-reference",
    "sampleSize": 10,
    "positiveResponses": 2,
    "priceCents": 499,
    "currency": "EUR",
    "billing": "one_time"
  }
}
```

For non-price studies, `priceCents`, `currency` and `billing` must all be `null`. Define the target population, observation period, positive-response criterion and success target **before** collection. Record recruitment and limitations; retain consent/rights evidence privately. `consentRef` is a reference, not authenticated proof. Import aggregate counts only; the schema rejects respondent fields. Free text still requires the existing operator privacy/rights review. Source URLs are stored references and are never fetched by this module.

Sample sizes must be integers from 1 to 1,000,000 and positive responses must be between zero and sample size. Zero positives is a measured descriptive zero; absent, unreviewed or stale evidence produces empty studies and `NOT_PROVEN`, never fabricated zeros. The same product/study/segment/version cohort cannot be imported twice, even via a different source; independently recruited price arms must have distinct study IDs. Segments, product versions, methods and billing intervals are never pooled. No conversion attribution, causal uplift, representativeness or statistically validated demand is inferred.

### Decision and approval boundaries

The recommendation is `VALIDATE` while any measured dimension is missing, otherwise `OWNER_REVIEW_REQUIRED`. This is an evidence-completeness check, **not a positive market verdict or sample-size sufficiency test**. A study with zero positive responses still requires human interpretation; it never yields automatic GO. The engine supplies no invented sample threshold or financial forecast.

`productApprovals` identifies `CONCEPT`, `PROTOTYPE`, `PILOT` and `COMMERCIAL_RELEASE` separately. Their state remains `NOT_PROVEN`: this input does not import or authenticate the existing owner approval ledger (`ownerApprovalReadback=NOT_PROVEN_NOT_IMPORTED`) and does not revoke or overwrite approvals held elsewhere. Market evidence is only an input to that existing approval process. Technical, privacy, rights, delivery, support and commerce readiness remain separate prerequisites in their existing contracts. Actual demand rate, purchase conversion, validated price and revenue remain `null`. No live sales, publication, billing, price change or provider activation is granted.

### Validation and remaining evidence

The existing research unit suite and `npm run test:growth-intelligence` cover the CLI/service handoff, original draft generation, measurement digest binding, missing versus zero results, cohort duplication, freshness, invalid counts/prices, unsupported methods and attempted self-approval. Test fixtures are synthetic. These checks prove local computation and interface compatibility, not respondents, consent validity, owner approval or production deployment. The existing Docker test COPY/allowlist and Growth test entrypoint already include both modified modules; no extra CI gate is introduced.

Scope roadmap: aggregate research evaluation and questionnaire preparation implemented; collecting real authorized studies, independently verifying their evidence and reading existing owner approvals remain `NOT_PROVEN`. The existing LangGraph product/channel reviews and owner workspace stay authoritative for their own scopes; no new autonomous graph or background task is claimed. Rollback: revert the implementation commit; no database or provider rollback is needed.
