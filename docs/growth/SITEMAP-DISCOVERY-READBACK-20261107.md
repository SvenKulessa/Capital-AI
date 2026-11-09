# Canonical sitemap / discovery readback — 2026-11-07

Baseline: main `1b95b92f2738b99ca2d06cd7bcd6219ae01e54d8` (includes #595, #596, #600–#602). Authority: root AGENTS.md. Primary domain GROWTH.

## Problem and directly effective change

The existing public production readback checks robots.txt, exact sitemap allowlist, admitted discovery links and server HTML. That proves HTTP eligibility, not registration or download in Google Search Console. The existing Google Learning SEO Setup audit inspected index state and country reports, but did not expose the existing `gsc_list_sitemaps` read operation's result.

The audit now emits `sitemapRegistration`: exact canonical registration, count of other sitemap entries, nullable pending state, last Google download, errors and warnings. The expected URL is fixed to `https://capital-ai.online/sitemap.xml`, property to `sc-domain:capital-ai.online`. Other sitemap paths and untrusted free text are never printed. Missing/invalid counters remain null; absent registration is false, never an inferred success. A registered sitemap does not prove indexing (`indexingConfirmed=false`).

Existing readonly API client and main-only federation are reused, without new tool, credential, workflow, scope or provider mutation. Inspection failure affects only this boundary (NOT_PROVEN); independent GA4 reports remain available. In audit mode no sitemap submission, privacy edit or Render configuration write occurs.

## Verification

37 targeted Google/MCP/readback/privacy tests PASS on this baseline, including registered/missing/duplicate/malformed sitemap, redacted foreign URLs, invalid/missing values and provider failure separation. The standard Google-maintenance and Docker workflows remain responsible for actual PR checks; no new required check.

Live Google canonical registration/download is NOT_PROVEN until the changed audit runs on main. Existing main-only restriction is retained; old run 42299898589 proves only its original source and must not be relabelled as sitemap-registration evidence.

## Current related evidence (bounded)

- User reports no real Learning/course enquiry exists yet. Do not fabricate an event or infer tracking failure from missing true leads. Business conversion acceptance waits for an actual consented enquiry.
- #595 is merged (`bf51dec`) with successful checks and recorded live Render rollout. Current /healthz readback returned HTTP 200/status=ok and reported source `1b95b92`. Immutable build/image binding is still unproven. Synthetic form/CSP tests and healthy deployment do not prove a real owner Google consent/callback.
- Existing private Drive licence-status text was read again (source dated 2026-10-14): third-party/Gemini-related commercial rights and publication remain NOT_PROVEN. No private IDs, authenticated URLs or contents beyond this bounded conclusion are published here. No media published.
- #596 is merged (`2736bf9`): ADK 2.14.0 and OTel API/SDK 1.45.2 are pinned with normal resolver/checks; prior ADK<=1.44 metadata statement is historical. PR checks are successful. The evidence document still distinguishes package/runtime gates and #593 remains open; no global CVE-free or live-provider-function claim follows from this source review.

## Next bounded execution

After merge, run the existing Google Learning SEO Setup workflow on main in audit mode. Compare public discovery, Google sitemap registration/download and URL-index snapshot as three distinct observations. If absent, propose canonical submission separately; do not silently switch audit to apply. Continue #559 only with actual owner-channel and exact asset-rights evidence. Revert this patch to remove the additional projection; there are no provider writes to undo.
