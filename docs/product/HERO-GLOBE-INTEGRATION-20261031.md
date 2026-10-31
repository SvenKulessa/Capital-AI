# Rotating homepage globe and Social Engine integration

Base: `b0a0028fce127c6f36bed5b053ad45b2d63fe66a` after PR #527; original implementation base was `6abf9c6c43eb80bca2941deccf602d5dbfc116df`.
Branch: `capital-ai-product/rotating-brand-globe-20261031`.
Primary domain PRODUCT; shared GROWTH media path. Date: 2026-10-31 (Europe/Berlin).

## Implemented behavior

The homepage replaces its static landscape image with `BrandGlobe`: a canonical brand poster followed by a lazy-loaded, transparent WebGL sphere with six orbit rings and satellites. The sphere rotates fully over 90 seconds, using the supplied brand illustration's center as a projected texture. The rear repeats the illustration; an unseen model or accurate globe map cannot be recovered from one PNG.

`BrandGlobeSpec` and `BrandGlobeRenderer` live in the existing SocialMediaEngine visualization layer. Content Studio uses the identical component, pause/resume controls, current-frame PNG export and an original-image download. The existing landing video template references the same canonical artwork and SHA-256. Its static-image/video timeline does not silently become a 3D video renderer; PNG export is the implemented new media operation. Existing publishing boundaries remain intact.

No added dependency, remote media service, provider call, new OAuth scope, paid activation, NATS activation, or auth/tenant change. Reuse installed Three.js 0.186.1. The input and existing lossy WebP provenance are documented in `docs/licenses/CAPITAL-AI-UNIVERSE-HERO-20261015.md`.

## Resource and accessibility behavior in source

- Static complete artwork remains visible until a first successful render; failure restores it.
- Reduced-motion users get the complete static artwork without loading Three.js.
- A native, keyboard-focusable pause control stops animation scheduling. Hidden tabs and offscreen canvases also stop scheduling. GPU resources and observers are disposed on unmount; asynchronous setup is discarded safely after unmount.
- Rendering pixel ratio is capped at 1.5, with low-power GPU preference.
- At every width the globe occupies the rear layer and the left-aligned copy stays above it. A token-based translucent shade fades beyond the copy panel without a hard vertical edge. Narrow layouts no longer reserve a separate artwork row. Text and primary actions remain actual DOM content.
- Visual/browser validation of those behaviors is still required; these are implementation descriptions, not measured runtime findings.

## Local verification

| Command | Result | Scope |
|---|---|---|
| `npm ci --ignore-scripts --no-audit --no-fund` | PASS | Locked dependencies installed |
| `npm run test:social-core` | PASS, 14 tests | 10 Social/geometry/SSR tests plus 4 artwork integration tests |
| `npm run test:navigation` | PASS, 40 tests | Existing navigation, owner gating and hero bindings |
| `npm run lint` | PASS | TypeScript and frontend boundaries |
| `npm run build` | PASS | Existing build/chunk graph; existing node:crypto externalization and large bootstrap warnings remain |

Browser attempt: the initial local page request failed before the preview server was ready; the subsequent error-tab acquisition/reload was blocked by the browser URL security policy. No browser workaround was attempted. The built static preview server is available locally, but that is not visual verification.

Mobile 320/390, tablet 768, desktop 1280/1440, keyboard, 200% zoom, real reduced motion, WebGL unavailable/context loss, pause/offscreen/resume, PNG download and actual console cleanliness: `NOT_PROVEN`. Tests verify sphere geometry and deterministic time, not actual GPU execution or video quality. No fabricated screenshot or visual approval is supplied.

## Delivery boundary

Preview follow-up: the managed preview now opens successfully after adding the exact dev host `terminal.local` to Vite's allowedHosts. Desktop (1363 CSS px) and narrow (500 CSS px) source-rendered views were inspected in the cloud browser. Its WebGL capability is disabled, so these captures show the complete artwork fallback, not animated GPU output. The homepage now hides playback controls until a 3D render is ready, including after context loss. This is not a native Android test or a signed-in production readback.

Owner layout refinement: the hero logo now uses intrinsic aspect ratio (`w-auto h-auto`) bounded by its existing maximum height, so the border follows the actual image instead of a wider object-contain box. At 1363 CSS px the inspected border measures 197.55×112 px, matching the 1536×864 source after borders. The decorative background is explicitly at z-index -1, copy at 10; observed copy/background top offset is 16 px. Mobile uses the same overlay relationship. Browser CI now asserts intrinsic logo ratio, foreground/background order and absence of the former separate mobile globe row at all four viewports; these new assertions need current-head CI evidence.

Browser run `41147249830` on PR head `a6bfb94f148b03282c9000680cd822f7c811b16b` succeeded, including all four globe viewports, rotation, native Enter pause/resume and context-loss fallback. Docker run `41147249811` failed because the minimal build context omitted `scripts/universe-hero.test.mjs`, newly invoked by test:social-core. The fix copies that test and explicitly allows its existing Universe assets. No test, scan or security condition is removed. Docker-context plus asset tests (11) and the 54 Social/navigation tests pass locally; all checks must be re-evaluated on the new head.

2026-10-31 follow-up: the owner explicitly authorized GitHub push and PR in this chat. The branch was rebased cleanly onto the Security merge #527. The existing Financial Learning Simulator Browser QA workflow now also runs `scripts/brand-globe-browser.mjs` against its isolated local BFF, preserving screenshots and a SHA-bound JSON report. It tests 320/390/768/1440 CSS pixels, reduced-motion poster, double text size, software-WebGL animation, keyboard pause/resume and WebGL context-loss fallback. This is an extension of the existing workflow, not a new Required Check. Runtime results remain `NOT_PROVEN` until CI actually executes it; software WebGL is not native Android GPU or human visual review. No cloud-browser policy workaround is used.

Historical first attempt: automatic approval review rejected `git push` because external disclosure/repository mutation was not considered explicitly authorized. No alternate GitHub mutation was attempted before owner permission. No CI success, merge or live change is inferred from the later authorization.

After permission: compare latest main and overlapping open PRs again (especially #523's PRODUCT/frontend scope), push this implementation, run existing Docker Security Gate, Domain Governance and other applicable CI. Merge only under `AGENTS.md`; perform Render and homepage runtime readbacks separately. Current open PR snapshot also contains #524, #527, #530, #531, #534–#538, #540–#545; their security/dependency status is not resolved by this hero change.

Rollback: revert this single feature commit; static assets, private data and provider configuration remain available and unchanged. Package-wide roadmap completion is not claimed.
