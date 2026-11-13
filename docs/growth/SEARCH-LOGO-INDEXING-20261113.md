# Search logo and P1 indexability readback

Date: 2026-11-13. Baseline main and observed production runtime source SHA:
`866eaa481ada4084a66c6d0d19de1ac5f7030195`.

## Reconciled scope

The SEO indexing inventory and current ecosystem roadmap require product truth
before Search promotion. `/studio/blueprints` and `/marketscreener/scorer` are
explicit NOINDEX hub routes. Anonymous production GETs confirmed HTTP 200 and
both HTML/header noindex. Their exclusion is intentional, not evidence of a
Google regression. No route promotion, entitlement, provider or database change.
HYPD property discovery returned an empty site list; Google's actual index
verdict and selected canonical remain NOT_PROVEN.

## Reproduced defect and implementation

Production GETs of the 96x96 PNG favicon and 512x512 publisher avatar returned
HTTP 200 with `X-Robots-Tag: noindex, nofollow`. Google requires an indexable
Organization logo image. The generic unknown-route policy caused the exclusion.

The static server now removes that header only after successfully reading an
exact allowlisted PNG/ICO/JPEG asset. Five existing first-party metadata images
are admitted; missing assets, other branding artifacts and private/app routes
retain noindex. Image eligibility is separate from the HTML INDEX policy and
does not add images to the page sitemap. Robots.txt remains unchanged.

The existing 512x512 avatar is specified as ImageObject in an Organization/Project
publisher node, preserving the project identity and avoiding legal-entity or
financial-service claims. Static publisher metadata now agrees with runtime
metadata. The supported 96x96 PNG is the primary favicon instead of the SVG
wrapper. No artwork was generated or altered. Provenance remains
`docs/licenses/Capital-AI-BRANDING.md` and the asset pack manifest.

Alternative considered: lifting noindex for the entire branding directory or
promoting application pages. Rejected because it unnecessarily broadens Search
exposure. No new dependency, tracking, paid activation or OAuth scope.

## Verification and release

- `npm run test:seo`: 41 tests plus 3 provenance tests passed.
- `node --test scripts/branding-assets.test.mjs`: 7 passed.
- `npm run build`: passed; existing >500 kB chunk warning remains.
- Positive and negative HTTP tests cover admitted images, missing images,
  non-admitted assets, app/private pages and sitemap separation.
- Existing open PRs #691 and #688 touch server/index.mjs in OAuth wiring;
  the Search change touches a separate import group and static file response.
  No existing Search-logo implementation was found. Held/draft PRs are untouched.
- Required PR checks and production deployment must be evaluated at the final
  head. Local tests do not prove deployment or Google Search appearance.
- Post-deployment readback: `/healthz` runtime SHA, home publisher graph and PNG
  favicon, five successful image responses without noindex, unchanged hub/private
  exclusions, and sitemap page-only behavior.
- Rollback: revert this change through the normal PR/main flow.

Google selection and actual Search appearance remain NOT_PROVEN until Google
recrawls and chooses the assets. Browser layout was not changed or revalidated.

## Official references

- https://developers.google.com/search/docs/appearance/favicon-in-search
- https://developers.google.com/search/docs/appearance/structured-data/organization
- https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag
