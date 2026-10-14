# PRODUCT · Universe Hero + Video Branding

Date: 2026-10-15 · Scope: PRODUCT homepage + existing Social Media Studio.

| Priority | Work | State | Evidence |
|---|---|---|---|
| P1 | 3 responsive landing hero assets | CODE_PRESENT | `src/components/Hero.tsx`, `public/branding/universe/` |
| P1 | genuinely vector-based, reduced-motion-aware orbit accent | CODE_PRESENT | `hero-universe-orbit.svg`, `src/index.css` |
| P1 | lawful provenance and hash evidence | CODE_PRESENT, RIGHTS_REVIEW_REQUIRED | `docs/licenses/CAPITAL-AI-UNIVERSE-HERO-20261015.md` |
| P1 | Media Studio template source update | CODE_PRESENT | `src/platform/SocialMediaEngine/Editing/MediaStudioTemplates.ts` |
| P1 | navigation and media asset tests | NOT_PROVEN until CI | `scripts/navigation.test.mjs`, `scripts/universe-hero.test.mjs` |
| P1 | 4 original images and 12s silent introductory video in Drive | DRIVE_WRITE_CONFIRMED | GROWTH/10_Media (owner private) |
| P1 | JaJa Buddy footage and three Chartanalyse masters/Shorts final revision | NOT_PROVEN, not in this frontend code change | Separate media edit and source-rights evidence |
| P1 | tablet/mobile/browser, live /login screen and production readbacks | NOT_PROVEN | Post PR/CI and deployment |
| P2 | Login-page concept via design review | NOT_STARTED | Prefer homepage first to avoid auth workflow disruption |

## Existing roadmap anchor

Related current work packages: `CA-PRODUCT-SOC-STUDIO` and `PRODUCTION-WEB-01-PRODUCT`. This file is a slice-specific reconciliation, **not** a new global governance gate or new package counted in `roadmapCurrentMainState.ts`. Full Social Studio approvals, content editing, security and cross-tenant isolation remain incomplete.

The live image placement is the already present homepage `Hero` component. An independent login redesign is **not** shipped. Layout remains conversion/education-first and avoids authentication changes. This is reversible in one PR without additional provider infrastructure.

Technical verification: file SHA-256 checks and existing navigation regression tests are present in the PR. CI and manual viewport QA are separate and may not be inferred from source inspection. The generated 12s clip is a **silent draft**, without speaking JaJa or YouTube upload.

Required project checks remain **Docker Security Gate** and **Domain Governance**; no additional gating. Only merge when required existing conditions are met, then verify production runtime separately.
