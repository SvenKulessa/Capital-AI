# PRODUCT · Universe Hero + Video Branding

## Current reconciliation · 2026-10-31

Owner scope: replace the empty homepage hero area with the uploaded globe as a rotating 3D brand graphic and integrate reusable graphics tooling into the existing Social Media Engine.

- `IN_PROGRESS`: the local PRODUCT branch implements a real textured sphere, six 3D orbital trajectories and satellites. `BrandGlobeRenderer.ts` is shared by homepage and Content Studio; it reuses installed Three.js 0.186.1. No new dependency, external service, paid activation or provider change.
- `VERIFIED` (local automated scope): sphere depth, bounded texture coordinates, 90-second rotation, invalid-time rejection, SSR poster fallback, artwork hash identity, Social project boundary, navigation regression and TypeScript/frontend boundaries. See `HERO-GLOBE-INTEGRATION-20261031.md` for commands and limitations.
- `NOT_PROVEN`: browser/mobile/tablet/desktop/200% zoom, WebGL context loss, animation lifecycle, PNG download, production rendering and deployment. Browser access was blocked by this chat's policy; source/SSR tests do not replace these readbacks.
- `IN_PROGRESS`: after the original push rejection, the owner explicitly authorized push and PR on 2026-10-31. The branch is rebased onto main `b0a0028` (PR #527). Targeted hero browser tests were added to the existing Financial Learning Simulator Browser QA workflow. CI, merge and deployment outcomes remain unproven until observed.

The older table below records the previous static-image implementation. The newer owner request supersedes the static-only preference for this slice; the old SVG overlay remains unused. The broad `CA-PRODUCT-SOC-STUDIO` and `PRODUCTION-WEB-01-PRODUCT` packages remain open; no global completion or Social publishing approval is inferred.

Date: 2026-10-15 · Scope: PRODUCT homepage + existing Social Media Studio.

| Priority | Work | State | Evidence |
|---|---|---|---|
| P1 | 3 responsive landing hero assets | CODE_PRESENT | `src/components/Hero.tsx`, `public/branding/universe/` |
| P1 | genuinely vector-based reduced-motion-aware orbit asset for offline video/brand templates; **not on homepage** per owner request | CODE_PRESENT | `hero-universe-orbit.svg`, `src/platform/SocialMediaEngine/Editing/MediaStudioTemplates.ts` |
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

## Owner preference, 2026-10-15

The owner explicitly requested that the small vector overlay (`hero-universe-orbit.svg`) **must not render on the homepage**. Homepage still uses the responsive raster `picture`; keep the vector as a licensed offline branding / video-template asset. Preserve CTA handlers, no authentication changes. After merge verify browser behavior and reduced-motion baseline. Video timeline edits have a separate rights/readback scope.
