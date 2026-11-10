# SEO/public accessibility: HTML snapshot skip-navigation — 2026-11-10

**Domain:** GROWTH with PRODUCT/TRUST. **Status:** branch implementation, CI/production NOT_PROVEN until separately checked.

Independent public static-HTML accessibility audit of `https://capital-ai.online/blog/x-api-expansions-kosten` (10 November 2026) returned HTTP 200, score 98/A, and one **low** finding: no skip-to-content anchor in the server-rendered fallback. This score is **not** a WCAG certificate and does not assess keyboard navigation, contrast, focus behavior or hydrated rendering.

The existing hydrated React application already has `href="#main-content"` linking to its focusable `<main id="main-content" tabIndex={-1}>` in `src/app/layout/ApplicationViewport.tsx`. The static HTML-only fallback had no such link.

Change only the static SEO snapshot in `server/index.mjs`:
- A focus-visible link `href="#capital-ai-public-snapshot"` appears *before* the public `<main id="capital-ai-public-snapshot">`. It reuses CSS utilities already present in the React skip link.
- This HTML exists only on the existing static index-allowlist paths; private/index-restricted endpoints are unaffected.
- Once the app hydrates, React replaces the fallback and its own existing `#main-content` skip link applies.
- `scripts/seo-production-readback.mjs` now rejects the X article page if the fallback skip link or its target is missing. The existing readback regression has a broken-anchor negative test.

No cookies, providers, permissions, navigation contracts, SEO canonical targets or customer data are changed.

**Required validation:** exact-head Domain Governance + Docker Security Gate, post-merge Main-CI/Render, independent HTTP static accessibility re-audit, mobile keyboard focus check. The accessibility domain remains OPEN for full browser-based WCAG evidence. Roll back using protected git revert.
