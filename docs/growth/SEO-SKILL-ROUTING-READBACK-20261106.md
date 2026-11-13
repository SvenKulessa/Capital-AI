# SEO, skill routing and Google readback — 2026-11-06

Baseline: main `3e42cdedc9de16a37b749535a5a60e9fbd3edf4f`.

## Repository correlation

Initial open PRs: #583 YouTube consent, #581 dependencies, held draft #548 private-notes OCC. During this run #585 X PPU explainer opened. None implements this router/readback fix; no unrelated branch is merged or deleted. Issues #559 and parent #388 retain actual channel OAuth, asset rights and publishing boundaries; #560 concerns Supabase password protection and #579 the separate wallet roadmap. No public marketing publication or payment activation performed.

Branch snapshot: 106 branches; 59 associated with closed PRs, four with open PRs, 42 without a matching PR in the retrieved history, plus main. Closed PR does not prove a branch is merged/disposable. Do not delete these as cleanup. History classification is a snapshot, not a complete semantic diff of every legacy branch.

## Implemented routing

The existing ten-specialist API and its 76 curated tasks remain unchanged. Optional `--plan --domain GROWTH` adds an advisory agent/skill-file plan using the same registry. It includes the primary engineering/advisory skills, task-matched SEO/revenue skills, matched common specialists (including GA4/GSC analytics) and presentation. Every domain profile points to the same CLI. No agents are spawned, providers called or permissions granted; users still read the returned skill instructions. Unmatched tasks remain REVIEW_REQUIRED. This is deterministic text routing, not proof of arbitrary natural-language intent understanding.

Example: `node scripts/skill-routing.mjs --plan --domain GROWTH "SEO Search Console checkout GA4"`.

## Google identity and analytics VERIFIED, bounded scope

Existing main-only, keyless `Google Learning SEO Setup` workflow executed in **audit** mode: [42237211693](https://github.com/SvenKulessa/Capital-AI/actions/runs/42237211693), successful against this baseline. Google federation, GA4 property 548187678, stream G-0542DT2HCE and read access to GA4/GSC verified. No provider writes. Lead event configured; email/query redaction enabled; automatic form/enhanced measurement disabled.

Report window: 2026-10-09 through 2026-11-05; comparison GA4 previous 28 days. Bounded reports for Germany, Italy, Spain, Portugal and UK contain no organic Learning GA4 rows. GSC has country rows, including one German impression and zero clicks in the bounded top-page report. These are not sitewide totals or evidence that no real enquiries exist. Browser collection, actual enquiry receipts, purchases, uplift and causal attribution remain NOT_PROVEN.

## Live SEO and commerce

Health reports runtime sourceSha equal to baseline through RENDER_DEPLOYMENT_ENVIRONMENT. Immutable bound build/image identity remains NOT_PROVEN; do not promote that weaker identity to an attested image.

Corrected existing productionReadback now passes the 16-route public sample plus discovery/login/health/readiness contracts. The earlier FAIL came from requiring a React root and explicit robots INDEX tag on the site's standalone legal documents. Absence of robots is default INDEX on those known legal pages. Explicit robots/googlebot noindex/none and empty shells still fail. No production index policy was relaxed.

Subscription checkout reports configured; real purchases NOT_PROVEN. CADS Marketplace readiness false. Google indexing and last crawl state require URL inspection; live HTTP eligibility does not prove Google recrawled or indexed a page.

## Validation and priorities

73 Node tests PASS: existing routing/domain suites plus new plan regressions, production readback (including legal negatives), privacy analytics. Independent 21 metadata/manifest/privacy checks PASS; registry validation PASS. Existing required checks remain unchanged; actual PR CI is documented in the PR.

TypeScript suppression validation already passes on current main, review deadline 2026-11-19. No date-only renewal or unrelated compiler upgrade included.

Next: validate actual consented browser collection and successful enquiry receipt before attributing GA4 leads; inspect Google's indexed/canonical state; continue #559 only when exact rights/channel evidence is available. Router changes do not activate providers, commerce or publishing.


## Follow-up: Google URL Inspection (source implementation)

Integration re-correlated with main `2162da68167346311a8dfdc2cbd12745681bdf49` after #589 (English YouTube page) and #591 (paused NATS checks). Current open work also includes #592 renderer WORKDIR and #594 GA4 MCP propagator isolation; the latter is a partial mitigation for #593, not a fixed upstream package. These independent PRs and draft #548/#587 are not merged by this patch.

The existing Google-maintenance REST client and stdio MCP now expose `gsc_inspect_public_urls`. The existing main-only `Google Learning SEO Setup` audit calls it automatically. It inspects exactly `/learning`, `/vocabulary/orderbuch` and `/vocabulary/capital-eventmesh`, fixed to `sc-domain:capital-ai.online`. No caller URLs, private account routes, query strings, credentials, live crawl tests or recrawl requests are accepted. Expected INDEX/NOINDEX comes from the existing central policy.

Output is restricted to known enum values, validated crawl timestamp and canonical-match booleans. Raw referring URLs, Google result links, free-text coverage descriptions, arbitrary canonicals and provider errors are omitted. Provider 403 or missing inspection evidence remains NOT_PROVEN for this boundary while independent GA4/country reports can still succeed. `PROVIDER_READ_VERIFIED` means index-state data was read, not that every target is indexed or has already adopted today's policy.

Live URL-inspection results remain NOT_PROVEN until this implementation is on main and the existing audit is dispatched again (`google-learning-setup.yml`, `mode=audit`). Existing readonly OAuth scopes are sufficient in design; actual API enablement/authorization must be proven by that readback. Main-only federation restrictions are retained. No service-account keys, new IAM grants, new required checks, provider mutations or separate orchestration service introduced.

## Search configuration follow-up — 2026-11-13

The SEO architecture/readback work package now has a Search-only as-code entry
point: [GOOGLE-SEARCH-CONFIG-AS-CODE.md](GOOGLE-SEARCH-CONFIG-AS-CODE.md).
Plan needs no network; audit is read-only; explicit apply is limited to the exact
canonical sitemap. Existing federation is reused with `target=search`; no GA4 or
Render activation. Local acceptance: 37 configuration/client tests, 11 authority
tests and 12 real public HTTP checks passed. Google provider credentials were
unavailable locally, reported as INCOMPLETE rather than VERIFIED. Google index
snapshots, connector connection and actual image selection remain separate
evidence; no broad index promotion or Search-ranking claim.

Validation: focused routing/SEO/privacy/Google/MCP tests include fixed targets, denied arbitrary input, sanitized provider fields, unknown/missing results and inspection-unavailable separation. The earlier live Google audit remains evidence for its original source version and does not verify this new inspection feature.
