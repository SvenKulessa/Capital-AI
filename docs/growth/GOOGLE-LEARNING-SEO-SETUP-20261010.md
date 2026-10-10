# Learning enquiries and Google configuration

Target: `capital-ai.online`, GA4 `548187678`, Search Console
`sc-domain:capital-ai.online`, Google project `aifinancial-500208`.

## Shipped behavior

The public Learning page has a working email enquiry action to the existing
support address. Opening an email program is not a received enquiry. The page
states this explicitly, links privacy information and never emits a lead event
for this click. Crawlable server HTML, page metadata and the React route describe
the available glossary, charts and quizzes without promising investment returns
or inventing course availability.

`Google Learning SEO Setup` is manually dispatched on `main` only. Use `audit`
to read settings, or `apply` for the following bounded changes:

- Find exactly one HTTPS web stream for the configured site; otherwise stop.
- Register `generate_lead` as a key event if absent, counted once per event.
  Preserve existing key events and do not assign a fictitious monetary value.
- Enable email and sensitive query-parameter redaction, preserving existing
  redaction keys. This is additional protection, not permission to send personal
  data to Analytics.
- Disable automatic form interactions, preserving other enhanced-measurement
  settings. Form starts and incidental interactions are not received enquiries.
- Submit the fixed canonical sitemap if missing and verify it by reading back
  Search Console. Submission does not guarantee indexing.
- Verify access to bounded organic Learning reports for Germany, Italy, Spain,
  Portugal and the United Kingdom, comparing the last complete 28 days against
  the preceding 28 days. Search Console country reports use the same five target
  countries. Raw reports never enter workflow logs or artifacts.

Each changed setting is read back. A failed readback fails the workflow. An
interrupted run can have applied earlier steps: inspect the failure and rerun
explicitly after fixing the cause. No automatic mutation retries. Repeating a
successful run does not create another key event or reapply identical settings.

## Identity and operation

Existing repository variables are sufficient:

- `GCP_WORKLOAD_IDENTITY_PROVIDER`:
  `projects/542877602707/locations/global/workloadIdentityPools/capital-ai-github-read/providers/capital-ai-dispatch`
- `GCP_GOOGLE_READER_SERVICE_ACCOUNT`:
  `capital-ai-google-audit@aifinancial-500208.iam.gserviceaccount.com`
- `GA4_PROPERTY_ID`: `548187678`

The service account needs GA4 Editor and Search Console full-user access already
granted by the owner. The workflow requests a 15-minute token through the
existing GitHub OIDC binding, stores no credential file and binds these exact
resources before authentication. Audit requests read-only scopes; apply requests
Analytics edit and Search Console write scopes. It changes no Cloud IAM, billing,
Ads budget or Workspace accounts. The existing read-only workflow remains usable.

After the authorized merge, run:

```sh
gh workflow run google-learning-setup.yml --ref main -f mode=audit
gh workflow run google-learning-setup.yml --ref main -f mode=apply
```

The trusted stdio MCP exposes `ga4_learning_configuration`,
`ga4_configure_learning`, `ga4_learning_report` and
`gsc_submit_canonical_sitemap`. Direct MCP mutations require explicit server-side
write flags. There is no public maintenance HTTP endpoint.

No new dependency, model invocation, paid service, schedule or cloud resource is
introduced. Google API quotas and existing CI usage still apply; remaining quota
is not proven by local tests.

## Measurement limits

The browser analytics provider remains disabled and this change neither loads
Google tags nor changes consent. The key-event definition does not itself collect
events. Actual received-enquiry attribution, email receipt, browser consent and
live collection are **NOT_PROVEN**. `keyEvents` in the reporting endpoint includes
all key events; it must not be represented as a count of Learning enquiries.

Do not report improved clicks, leads or ranking without subsequent live data.
The setup output deliberately distinguishes verified configuration from verified
collection. No special AI schema or synthetic reviews are added.

## Validation

Branch: `capital-ai-growth/learning-seo-google-setup-20261010`; the PR commit
identifies the source under test. Local production build, TypeScript/frontend
boundary checks, SEO suite, Learning portal suite and Google maintenance tests
pass. Google tests use a fake provider, covering repeat runs, omitted proto false
values, empty sitemap PUT responses, precise field masks, ambiguous web streams,
write flags, failed readbacks and private-report suppression. These are not live
Google write evidence.

Local Chromium ran the built `/learning` route at 1440×900, 768×1024, 390×844 and
320×800, plus 720×450 at device scale 2 as a 200% viewport equivalent. The enquiry
action has the correct email URI, 48–72px height, visible keyboard focus and no
horizontal page overflow. Heading order starts H1 then H2. Reduced-motion media
was enabled. The actual browser screenshot was rendered in chat. This is a
focused accessibility check, not a complete WCAG audit or live deployment proof.

## Official references

- [GA4 key-event creation](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.keyEvents/create)
- [Analytics Admin v1alpha discovery, including singleton field masks](https://analyticsadmin.googleapis.com/$discovery/rest?version=v1alpha)
- [Search Console sitemap submission](https://developers.google.com/webmaster-tools/v1/sitemaps/submit)
- [Google Search AI features and ordinary SEO requirements](https://developers.google.com/search/docs/appearance/ai-features)
