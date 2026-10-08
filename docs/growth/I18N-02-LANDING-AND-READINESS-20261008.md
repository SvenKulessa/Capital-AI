# CAPITAL-AI-GROWTH I18N-02 — Landing Sections, Legal/FinTech Review and SEO Readiness
Date: 2026-10-08
Base main: 9fbee3b0e7460db33408e2bd0bb761f6bc8a044f
Scope: PRODUCT / GROWTH / TRUST / PLATFORM
Status: implementation submitted; runtime and QA require independent evidence.

## Delivered in this slice
- Additional six-language text catalogs for Platform Hub Directory and Content Engine details, CTA labels and statuses.
- Dynamic module status codes remain authoritative; the labels reflect the status, not invented capabilities.
- Dynamic legal/financial/contract reasons remain German with an explicit language attribute until reviewed.
- The public destination IDs, routes, account/owner access checks, licensed claims, raw contract data and pricing remain unchanged.
- Dictionaries and duplicate locale key coverage are tested with deterministic Node suites.

## TRUST terminology and legal review inventory
The following remain **untranslated** and **not approved** in non-DE languages:
- Legal: /impressum, /datenschutz, /agb, /lizenz, /datenprovider-lizenzen, /opensource-lizenzen.
- Commercial: /pricing, Stripe checkout, cancellation, risk warnings, provider data rights and consent.
- Finance: scoring performance claims, live-provider statements, 'BaFin', 'MaRisk', 'WORM', data latency, costs/limits and advice/disclaimer language.
Existing German source text is authoritative. Do not imply regulator certification, data rights, production availability or legal equivalence via translation. A qualified legal/financial terminology review is required before asserting multilingual legal parity.

## PLATFORM country-detection evidence
Current server reads CF-IPCountry when provided by an upstream CDN. Without it, Accept-Language is used.
Cloudflare documents CF-IPCountry when IP Geolocation or Add visitor location headers is enabled; that does not confirm this origin is actually behind Cloudflare.
Unverified: DNS/CDN route, origin header trusted path, selected Render workspace, actual deployed commit/response header and browser rendering in various regions.
Do not use country detection for security or entitlement controls.

## GROWTH / SEO contract
The 2026-10-08 main SEO manifest has German route-specific canonical, og:locale, JSON-LD inLanguage and sitemap.
Because public routes still contain German content, do NOT publish translated hreflang alternates or non-DE indexed URLs prematurely. A future SEO-03 slice must provide complete localized first-response HTML for /en/, /it/, /fr/, /pt/, /es/, canonical+hreflang+og:locale+schema+site map aligned, and origin-side crawler QA.
Until then the indexable authority is German and localized UI selection remains client-side.

## Remaining work / acceptance
- Full application-area extraction (login, all hub subpages, markets, pricing, FAQ, docs, vocabulary, flows and email templates), 6-language proofreading and regression review.
- Client selection persistence, keyboard/screen-reader/mobile width, menu wrapping and no-layout-shift browser tests.
- Render/CDN origin verification and multi-country readback.
- `npm run test:i18n`, `npm run lint`, `npm run build` and GitHub Required Checks.
- No agent merge without explicit human-owner approval; deployment only after main merge.
