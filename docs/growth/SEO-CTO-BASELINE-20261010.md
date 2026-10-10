# SEO and CTO baseline — 2026-10-10

Source reviewed: `d80355f296b429317ff65d7a1cdb9a0e0ca82ae7`.
This is a source audit and work plan, not a live account audit or ranking report.

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
| GA4 | Read adapter and GitHub workflow implemented | Numeric property ID, stream identity, historical report, consent and measurement validation |
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
- Full frontend build and live browser/Google account checks were not run in this partial local source snapshot.
- Existing repository required checks must pass on the PR head.
- Production release remains the owner merge to `main` under AGENTS.md; no deployment was triggered.
