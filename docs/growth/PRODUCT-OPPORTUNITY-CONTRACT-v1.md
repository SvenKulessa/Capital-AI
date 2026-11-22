# CAPITAL-AI Product Opportunity @1 — Issue #874

Status: **repository-only prototype, DRAFT_ONLY**. Governing source: root `AGENTS.md` / `SOLO_MAINTAINER_FLOW@2`. No new authority, provider, scheduler, required check, paid resource, or publishing route.

## Decision and domains

The first-party chat classifier `identifyProductSignal` returns a review candidate only for explicit commercial/product intent; ordinary security, app debugging or CI chat does not trigger a product review. This is a **pure function**, not a background listener or UI deployment.

| Domain | Scope | Trust boundary |
| --- | --- | --- |
| MARKET | competitors, evidence age, method of market sizing | Source-recorded is not an authenticated fact |
| PRODUCT | capability and source-SHA binding, MVP effort | No runtime or protection claim without independent evidence |
| FINANCE | ARPU, unit variable costs, fixed cost, CAC, labor costs, ROI, break-even, horizon | Numbers are scenarios / hypotheses, never actual sales |
| GROWTH | reusable `ContentCampaignBrief` for `contentEngine.ts`; draft-only CADS downstream | Publisher disabled, n8n evaluation only, no spend |
| TRUST | provenance boundaries, PII-deny heuristics, license gaps | No automatic source, rights, approval or credential authority |
| QUALITY | independent LangGraph join / evidence gaps | `PASS_WITH_GAPS` is not security or release approval |

## Contracts and commands

- `scripts/growth/product-opportunity-contract.mjs` exports `PRODUCT_OPPORTUNITY_VERSION`, `identifyProductSignal`, `validateProductOpportunity`, `evaluateProductOpportunity`, `calculateOpportunityScenario`, `buildOpportunityDraftCampaign`, `evaluateProductPortfolio`.
- `scripts/growth/product-opportunity-contract.test.mjs` includes synthetic positive/negative cases for provenance, source/campaign binding, fabricated ROI, unauthorized claims, PII, invalid money, cohorts, rights and deny-by-default publishing.
- `scripts/growth-agent/product_opportunity_graph.py` is an offline LangGraph `StateGraph`, pinned by existing `scripts/growth-agent/requirements.lock`, with local source-bound lexical RAG. The independent QUALITY node runs only after MARKET/PRODUCT/FINANCE/GROWTH/TRUST finish. No prompt content can become instructions or graph authority.
- `scripts/growth-agent/test_product_opportunity_graph.py` tests RAG isolation and graph denial. Actual `StateGraph` execution requires the existing pinned Python environment.

```sh
node --test scripts/growth/product-opportunity-contract.test.mjs
python3 -m unittest discover -s scripts/growth-agent -p 'test_product_opportunity_graph.py' -v
```

The Python test marks graph execution **SKIPPED/NOT_PROVEN** if LangGraph is not installed; passing other tests does not establish runtime graph operation. The existing optional offline worker candidate is a build candidate, not proof of a live agent.

## Financial math

For scenario horizon `h` in months, paid users `u`, **net of indirect taxes and platform fees** monthly ARPU `p`, variable monthly cost per paying user `v`, monthly fixed cost `f`, newly acquired paying customers `n`, CAC `c`, development hours `d` and developer hourly cost `r`:

- Revenue: `u × p × h`
- Operating costs: `(u × v + f) × h`
- Acquisition: `n × c`; development: `d × r`
- Profit: revenue minus operating, acquisition and development costs
- ROI on total costs: `profit / (operating + acquisition + development) × 100`; zero-denominator -> `null`
- Break-even paying users: `ceil((f + (n×c + d×r)/h) / (p-v))`; non-positive contribution -> `null`

These calculations assume stable user count across horizon (not cohorts), no churn/seasonality, unchanged pricing and no taxation on profit. **No KPI or ROI is measured evidence**. Pricing, CAC, retention, conversion, TAM/SAM/SOM and competitor data require fresh independent research and a defined market-sizing method before a commercial decision. Version-1 `GO` is deliberately unreachable without a separate authenticated evidence admission: `VALIDATE/HOLD/REJECT` are decision suggestions, not publication authority.

## Market-sizing methodology (hypothesis only)

Input `marketSizing` stores the selected `BOTTOM_UP`, `TOP_DOWN` or `UNKNOWN` method, a 12-month reference period, estimated addressable customer denominator, assumed penetration percentage, and an evidence reference. `UNKNOWN` requires all numeric fields to be null. The only derived count is `addressableCustomers × penetrationPercent / 100` labelled `HYPOTHESIS_NOT_VERIFIED`, never observed TAM/SAM/SOM or a causal conversion estimate. No public revenue, product penetration or paid campaign decision may be justified by that count alone.

## DeviceCare-KI pilot

Use `productId=devicecare-ki` and a **fresh verified GitHub source commit SHA** from `SvenKulessa/DeviceCare-KI`. A `SOURCE_RECORDED` capability permits a draft claim only; it does **not** prove its truth. Limit public-facing conceptual positioning to manually initiated, local, data-minimizing Android diagnostic features where source/test evidence is independently available. Do **not** claim proven malware protection, always-on detection, Play Store production availability, Play Integrity approval, medical/security effectiveness, or actual sales.

Draft package has `campaignId/productId/sourceSha/canonicalUrl`, invokes the pre-existing `CAPITAL_AI_CONTENT_ENGINE@1` shape and reserves the existing social engine as the only possible publisher; it never calls that publisher. CADS, source verification, original graphic rights and Owner approvals remain open. Seven-colour Universe visuals are governed by `src/contracts/contentEngine.ts`. For actual asset generation and licensing reuse `src/contracts/contentSocialPackage.ts`, `src/contracts/originalGraphicLicense.ts`; do not copy or forge approval receipts.

The n8n proposal is **internal orchestration only**; evaluate n8n's license and privacy obligations before use. No new n8n webhook/secret/instance is created by this slice. Existing `growthAttribution.ts` remains the only attribution source contract; no device diagnostic or PII should enter campaign analytics.

## Threat model / limitations

- Caller-supplied evidence statuses, source URLs and scores **cannot authenticate themselves**. Repo SHA identity and semantic content must be independently confirmed at a trusted boundary. Record `NOT_PROVEN` otherwise.
- Local lexical RAG filters product/SHA and PII-looking strings, but is **not comprehensive DLP**, sanitization or retrieval of actual external facts. No search or graph result grants publishing rights.
- Cost scenarios support **one snapshot with fixed u over h**; acquisition budgets and user counts are bounded but no time-series/LTV or causal claim is implemented.
- Negative tests cover common token/email patterns, not all personal data. Before putting user-supplied prompts or device findings in production, use the pre-existing trusted redaction and consent boundaries.
- Branch and PR CI evidence must be assessed separately from actual Android/Render live readiness.

## Rollback

Remove the new opportunity modules/tests and the minimal test-script wiring via a revert. No database, external resources, secrets or publishing state have changed. The existing Content Engine and social publishing adapter remain unaffected.
