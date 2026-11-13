# Google Search configuration as code

`scripts/google-search-config.mjs` is the Search-only entry point. The exported
`SEARCH_CONFIGURATION` fixes the domain property, sitemap, logo, favicon and four
inspection URLs. It reuses the existing Google Maintenance client and federation
workflow. It does not create properties, change DNS/IAM/OAuth grants, activate
analytics, connect a chat connector or request recrawling.

## Local execution (Node.js 24)

```sh
# No credentials or network required; prints targets and remaining owner steps.
npm run growth:search:config -- plan

# Public logo/robots/sitemap checks plus read-only Search Console inspection.
npm run growth:search:config -- audit

# Explicitly register only the canonical sitemap, if not registered already.
npm run growth:search:config -- apply

# Explicit user-authorized re-submission, even when already registered.
npm run growth:search:config -- resubmit
```

In an environment that supplies an HTTP(S) proxy, run Node with its inherited
proxy support, for example `NODE_USE_ENV_PROXY=1 npm run growth:search:config -- audit`.
Keep the supplied proxy and CA trust settings. Do not disable TLS verification.

Use `GOOGLE_MAINTENANCE_ACCESS_TOKEN` from the existing trusted short-lived token
mechanism, or `GOOGLE_MAINTENANCE_USE_ADC=true` with an already configured local
Application Default Credential. Do not place tokens in command arguments, files
tracked by Git, chat, or logs. The audit requests the existing
`webmasters.readonly` scope; apply requires `webmasters`. The script does not
create or expand a credential grant. Existing read-only credentials cannot apply.

Before provider-scoped operations, the script discovers the exact
`sc-domain:capital-ai.online` property through Google's sites API. A URL-prefix
property or another domain is not silently substituted. Restricted users can
audit; apply requires owner/full access. If the identity has no property access,
the owner must grant access in Search Console separately. Never guess success
from an empty property list.

## Existing GitHub federation workflow

After this change is merged, use the existing main-only workflow:

```sh
gh workflow run google-learning-setup.yml --ref main -f target=search -f mode=audit
gh workflow run google-learning-setup.yml --ref main -f target=search -f mode=apply
gh workflow run google-learning-setup.yml --ref main -f target=search -f mode=resubmit
```

`resubmit` is accepted only with `target=search`. It checks the existing exact
property and owner/full permission, performs one sitemap PUT and verifies
readback. It neither requests individual URL indexing nor reports a completed
crawl. Repeated re-submissions are not automatic and do not accelerate crawling.

`target=search` requests only the selected Search Console scope. It skips the
GA4/learning script and the Render measurement activation step. The existing
workload identity provider, service account and GitHub main/manual restrictions
are reused; no new federation trust or long-lived service-account key. Existing
`target=learning` behavior remains the default. Workflow availability does not
prove that the Google identity currently has property access.

## Outputs and limits

- `plan`: `PLAN_ONLY`, no network. `audit` is the default and never submits a
  sitemap, including when ambient write flags are enabled.
- Public checks validate the homepage logo schema, actual PNG dimensions,
  favicon reference, five indexable image responses, the expected simple robots
  policy and exact page sitemap allowlist. Responses are bounded to 1 MiB and
  redirects rejected. No public response bodies or credentials are logged.
- `apply` stops before writing if public checks fail, the property is absent or
  access is restricted. It submits only the fixed sitemap and verifies readback.
  Already registered sitemaps are not resubmitted; failed writes are not retried.
- URL inspection reads Google's **stored index snapshot**, not a live indexing
  test. `/`, `/learning`, `/studio/blueprints`, `/marketscreener/scorer` are the
  only targets. Expected INDEX/NOINDEX policy is reported separately from the
  actual Google verdict. The two hub routes remain intentionally NOINDEX.
- `AUDIT_COMPLETE` means the audit finished, not that Google indexed a page or
  selected an image. Read `sitemap.status`, error/pending fields and each URL's
  verdict. `INCOMPLETE` exits 2 while preserving independent public evidence and
  any confirmed submission. Invalid invocation exits 1; successful audit/plan
  exits 0. Provider error bodies, raw canonicals and tokens are never disclosed.
- `googleLogoDisplayed`, `connectorConnected` remain `NOT_PROVEN`. Google chooses
  its displayed images after crawling. HYPD's Google-account connection is a
  separate personal consent and is not created by API credentials or this script.
  If needed, the owner can request homepage indexing in Search Console manually.
  No Indexing API or deprecated sitemap ping is used.

## Agent Reader and permission boundary

The existing `capital-ai-google-maintenance` MCP now exposes exact-property role
discovery, the four Search index snapshots and explicit canonical sitemap
re-submission. The owner's 2026-11-13 instruction authorizes Search configuration
writes: `.mcp.json` enables only `GOOGLE_MAINTENANCE_GSC_WRITES_ENABLED`; GA4 writes
remain disabled. The separate `capital-ai-gsc` OAuth reader/guard remains read-only.
No token is stored in this configuration. The trusted worker still needs its
existing short-lived token or ADC; the existing federated workflow is the proven
execution path. Reload a repository MCP client to discover newly registered
tools; repository metadata cannot hot-install a connector into an ongoing chat.

`siteFullUser` already permits sitemap submission and the Search Console UI's
indexing request. User administration needs the Search Console property owner
role (`siteOwner`), not a Google Cloud project Owner grant. The public Search
Console API has no user/owner-management endpoint. To grant the explicitly
requested delegated-owner role, an existing verified owner must use Search
Console → Settings → Users and permissions for `sc-domain:capital-ai.online`,
and select the existing identity
`capital-ai-google-audit@aifinancial-500208.iam.gserviceaccount.com`. This personal
UI step remains unperformed until actually verified; no role is silently claimed
or global Cloud/IAM permission broadened.

Googlebot/Googlebot-Image have crawl access through the public robots policy and
indexable logo/favicon responses. They are Google crawlers, not service accounts
that can be assigned an administrator role. Logo eligibility is already deployed;
actual SERP image selection still belongs to Google. A direct homepage crawl
request is made in Search Console's URL Inspection UI with "Request indexing";
no API result is described as having pressed that UI action.

2026-11-13 acceptance for the owner-authorized write extension: 40 configuration
and maintenance tests plus six existing Google-authority tests passed; test
wiring passed. Real read-only workflow run 43526581432 verified siteFullUser,
registered error-free sitemap and homepage PASS with lastCrawlTime
2026-11-08T05:58:15Z. Browser fallback timed out and no shared desktop browser
tool was offered, so no UI indexing request or delegated-owner grant is claimed.
Post-merge acceptance is one explicit `target=search, mode=resubmit` invocation;
its provider result is not a completed crawl or proof of logo selection.
The homepage sitemap lastmod is corrected to 2026-11-13, when PR #693 actually
changed its publisher/logo structured data. It is not generated from workflow
execution time; other pages retain their independently documented dates.

Official permission/crawl references:
https://support.google.com/webmasters/answer/7687615 and
https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl.

## Validation and rollback

`npm run test:google-maintenance` includes positive/negative tests for mode
isolation, property discovery, permissions, idempotent sitemap submission,
noindex/small-logo/private-sitemap rejection, fixed URL inspection, error
redaction and workflow boundaries. The existing Google Maintenance CI runs them
on the affected PR paths. No new required check is introduced.

Baseline: `ed11b75` on 2026-11-13. Existing Search-logo implementation from #693
is preserved. No property access, live provider execution or SERP image display
is claimed by repository tests. Revert through the normal PR/main flow to remove
this entry point; reverting code does not delete a previously registered sitemap
or revoke any pre-existing Google access.

Local acceptance on 2026-11-13: 37 Google Maintenance/configuration tests and 11
existing Google authority/service-account tests passed; the test-wiring check
reported no unreferenced tests. A real read-only run with the supplied environment
proxy passed all 12 public checks. Google credentials were not configured in this
executor: the script correctly returned `INCOMPLETE`, exit 2, and
`GOOGLE_IDENTITY_NOT_CONFIGURED`. The existing federated workflow can perform the
provider readback after merge; this local result is not a Google index verdict.

## Official sources checked 2026-11-13

- https://developers.google.com/webmaster-tools/v1/sites/list
- https://developers.google.com/webmaster-tools/v1/sitemaps/submit
- https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect
- https://developers.google.com/search/docs/appearance/favicon-in-search
- https://developers.google.com/search/docs/appearance/structured-data/organization
