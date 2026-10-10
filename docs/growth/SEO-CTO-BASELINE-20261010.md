# SEO and CTO baseline — 2026-10-10

Source reviewed: `d80355f296b429317ff65d7a1cdb9a0e0ca82ae7`.
This is a source audit and work plan, not a live account audit or ranking report.

## Owner-confirmed targeting and Google identifiers

Confirmed in chat on 2026-10-10. These are configuration identifiers, not proof of provider access.

- Google Cloud project ID: `aifinancial-500208`.
- GA4 numeric property ID: `548187678`. Existing GitHub workflow variable: `GA4_PROPERTY_ID=548187678`; Render adapter separately uses `GOOGLE_ANALYTICS_PROPERTY_NUMBER=548187678`. Neither runtime setting was changed in this session.
- Website / intended Workspace domain: `capital-ai.online`; Search Console target: `sc-domain:capital-ai.online`.
- Target audiences: B2B fintech companies, traders, students, fintech community and interested learners.
- Target countries: Germany (DE), Italy (IT), Spain (ES), Portugal (PT), United Kingdom (GB).
- Google Ads customer ID, spending limit and Workspace tenant/admin access remain unknown.

## Audience and content priorities

These are initial editorial hypotheses, not measured keyword-volume or conversion claims.

| Priority | Audience | Search intent / content | Conversion to measure |
| --- | --- | --- | --- |
| 1 | B2B fintech | BYOK market-data integration, provider rights, data-pipeline architecture; accurate public capability overview with links to documentation | Qualified business inquiry or appropriately offered product/demo request |
| 1 | Students and learners | Explain order books, bid/ask spreads, slippage, VWAP and data provenance using the existing public vocabulary | Learning engagement and completed signup |
| 2 | Traders | Explain documented analysis tools, provider integration and limitations; distinguish education from investment recommendations | Completed signup and actual product activation |
| 2 | Fintech community | Reproducible architecture explanations, release notes and educational comparisons | Engaged return visits and explicit newsletter subscription if implemented |

B2B and education need distinct landing-page copy and calls to action. Do not advertise nonexistent demos, certifications, returns, supported integrations or realtime performance. Unimplemented conversion destinations remain content proposals.

## Country and language rollout

| Country | Language | First delivery |
| --- | --- | --- |
| Germany | German (`de-DE`) | Strengthen current canonical German public learning/vocabulary content and one accurate B2B entry |
| United Kingdom | English (`en-GB`) | Complete English public landing content with its own accurate metadata and crawlable output |
| Italy | Italian (`it-IT`) | Native-reviewed translation of the proven core landing/learning content |
| Spain | Spanish (`es-ES`) | Native-reviewed translation of the proven core landing/learning content |
| Portugal | Portuguese (`pt-PT`) | European Portuguese copy; do not assume Brazilian terminology |

All five countries are in scope; start with German source content and English, then reuse the tested structure for Italian, Spanish and European Portuguese. Current language-preview roots remain NOINDEX until real localized content is crawlable. Only then introduce stable localized canonicals, reciprocal hreflang and sitemap entries. Do not create empty country doorway pages or select language solely through IP redirects.

## Measurement and access acceptance

1. Verify GA4 `properties/548187678` and confirm that its web stream belongs to `capital-ai.online`.
2. Independently verify Search Console property access and sitemap/indexing status; aggregate 28 days and the preceding comparable 28 days.
3. Segment GSC by DE/IT/ES/PT/GB (API country codes DEU/ITA/ESP/PRT/GBR), page, query and device. GA4 country dimension values are names, not interchangeable ISO codes.
4. Establish organic sessions, engagement, completed signups and valid commercial key events only once consent and event delivery are proven. The empty browser measurement implementation must not be treated as zero demand.
5. Define commercial success using qualified B2B inquiries/activation and actual paid conversion, alongside organic clicks and impressions. Avoid optimizing traffic volume without qualification.
6. Review country-specific Ads performance only after customer ID, account access and authorized spend constraints are known. No ad campaign or budget activation is included.

The existing keyless workflow can be run by an authorized operator from `main`, target `ga4`, after its three non-secret repository variables and the actual Google OIDC/Viewer permissions are configured. Its redacted seven-day report verifies access but does not supply the full 28-day marketing baseline.

## Verified source findings

- Browser SEO updates previously derived the canonical origin from `window.location.origin`, allowing preview or alternate hosts to replace the server's production canonical. This PR fixes the production origin, strips query/fragment, updates Open Graph URL and existing Twitter metadata, and guards browserless calls.
- Google Analytics browser measurement is explicitly disabled in `src/utils/analytics.ts`. No page-view/conversion measurement from this implementation should be inferred from successful Google API authentication.
- `config/growth-google-authority.json` defines separate GSC and GA4 readonly authority.
- `.github/workflows/google-readback.yml` uses a manual-only, keyless GitHub identity for project `aifinancial-500208`, independently selectable GA4/GSC readbacks. This is not a ChatGPT credential or a Cloud/Workspace/Ads admin connection.
- `/marketscreener`, `/pricing`, `/dokumentation` and several other product routes currently have NOINDEX policy. Public account/admin routes remain PRIVATE. Indexing promotion requires useful public content, accurate metadata and a crawlable response for the specific route.
- Browser metadata in `src/platform/analytics/useRouteAnalytics.ts` still describes 294 public vocabulary terms; the canonical public metadata reports 132. Reconcile these sources in the next route-metadata change; avoid distributing the private Quant/Pro catalog.
- Direct Git clone and live website requests from this workspace failed because the inherited proxy was unreachable. This does not establish a website outage.
- The requested external performance audit did not start: the connected audit account lacks the required paid entitlement; no quota was consumed. The SEO audit including private Search Console data was rejected by automatic review. No external audit scores were obtained.

## Google account audit status

| Scope | Evidence available | Pending read-only verification |
| --- | --- | --- |
| Cloud project | Repository names `aifinancial-500208` and a dedicated OIDC reader | Exact project identity, enabled APIs, OIDC conditions, service-account bindings, billing/resource inventory |
| Search Console | `sc-domain:capital-ai.online` configured in source | Property access, sitemap status, URL inspections, 28-day queries/pages and comparison period |
| GA4 | Owner confirmed property `548187678`; read adapter and workflow implemented | Provider access, stream identity, historical report, consent and measurement validation |
| Google Ads | No accessible account evidence in this session | Customer ID, linked GA4, conversion definitions, historical spend/conversions/search terms |
| Workspace Admin | No admin connection in this session | Intended tenant/domain, authorized admin reader, relevant domain/security/mail configuration |

No Cloud IAM role expansion, paid-service activation, campaign launch, budget change, Workspace administration or tracking activation is included.

## Prioritized delivery plan

1. Establish the existing Google readonly identity and record provider HTTP success at the exact property, without credentials in logs. Separate Cloud, GSC, GA4, Ads and Workspace permissions; never treat one as proof of the others.
2. Record a 28-day organic baseline and previous comparable period: GSC clicks, impressions, CTR and average position by query/page/country/device; GA4 organic sessions and valid key events when measurement exists. Mark unavailable values NOT_PROVEN, never zero.
3. Reconcile client/server route metadata, including public vocabulary counts. Build a useful public landing page for a selected product search intent before changing its NOINDEX policy. Alternative: start with existing public vocabulary pages, retaining product NOINDEX until landing content is ready.
4. Verify production canonical, robots, sitemap, status codes and mobile lab/field performance. Optimize the measured largest bottleneck; do not assume a Lighthouse score from source inspection.
5. Define consent-aware signup and purchase measurement with deduplication and no keys, personal inputs or private analysis payloads. Test consent denial and withdrawal. Browser measurement is not activated by this PR.
6. Improve existing public topic pages through accurate answers, internal links and clear product descriptions. Prioritize actual GSC opportunities, rather than invented keyword volume or mass-generated thin pages.
7. Review Ads only after account access, reliable conversion definitions and an explicit spending constraint. Paid media and organic rankings are separate outcomes.

Success criteria: production verification of this PR's canonical behavior, measurable organic click/qualified-session trends against baseline, and valid signup/purchase conversion measurement. Ranking or revenue gains are not guaranteed.

## Validation and release

- Executed locally on Node v24.19.0: `node scripts/privacy-analytics.test.mjs` — 4 passed, 0 failed.
- Local full frontend build and live browser/Google account checks were not run in this partial local source snapshot.
- GitHub Docker Security Gate, including isolated frontend build and SEO/server regression steps, passed on implementation commit `3b1dcd2c51293f9a82acdab83bbdbb4cf04c85f9`; Domain Governance also passed. This later documentation-only update needs its own current-head check results.
- Production release remains the owner merge to `main` under AGENTS.md; no deployment was triggered.
