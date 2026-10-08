# I18N-03 — Auth/Workspace and non-indexable localized landing URLs

Base: main ed5c47611208ae4b145d110e03fb88657f51912c (2026-10-08)
Branch: capital-ai-growth/i18n-03-auth-workspace-seo-20261008
Owner: CAPITAL-AI-GROWTH; PRODUCT for UI, PLATFORM for runtime, TRUST for legal/security.

## Implementation
- Private Account Shell and BYOK/BYOM Workspace labels and informational copy: six languages. Client requests, API identifiers, auth, tenant boundaries and permissions unchanged.
- Explicit homepage URLs /de/, /en/, /it/, /fr/, /pt/, /es/ select locale even if an older cookie disagrees.
- Default / remains behavior-compatible with cookie > country header > browser language.
- Non-DE and /de/ locale routes stay NOINDEX, with X-Robots-Tag, no canonical, no hreflang, no JSON-LD and localized metadata previews.
- Language switch on homepage updates the shareable URL via history.replaceState, preserving query and fragment.
- Legal and finance source claims remain governed by the German originals; no approval assumed.

## Explicitly NOT accepted or released
- Do not promote /xx/ pages to INDEX, sitemap or alternate hreflang until full rendered body translation, metadata parity and legal/financial terminology checks are satisfied.
- Partial UI strings on app surfaces are not equivalent to a translated crawling document.
- CF-IPCountry trust path to Render origin is not proven. Simulated headers in offline tests are NOT geolocation evidence.
- External browser/mobile/Safari/iOS response checks still required. CI checks alone do not prove those outcomes.
- Do not enable paid services or new resource tiers. Existing GitHub Actions and Render service only.

## Acceptance
- npm run test:i18n, npm run lint, npm run build and GitHub Required Checks.
- GET /en/ with conflicting DE country + ES cookie must remain EN; unknown /pl/ must not gain SEO INDEX.
- Check body and navigation in six languages at 375px and 1440px; legal texts remain marked as German.
- Production verification only after owner merger and deploy of resulting main commit.

## TRUST finding: password strength UI mismatch (corrected in I18N-03)
Previous German registration copy denied uppercase/lowercase/special-character constraints, but `newPasswordMeetsObservedPolicy` on the client enforced those plus 14 characters and digits. We align the user-facing registration/reset copy across six languages with the existing client validation. **No auth policy, password requirement, server validation, or credential handling was changed.** This is a correctness fix, not a legal approval.
