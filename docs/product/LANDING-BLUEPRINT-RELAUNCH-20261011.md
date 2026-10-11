# CAPITAL-AI — Blueprint Landing Relaunch

Stand: 2026-10-11 · Scope: PRODUCT / GROWTH / TRUST · Status: CODE_PRESENT; Runtime NOT_PROVEN

## Authority and source

- Base: `SvenKulessa/Capital-AI` `main` @ `1a1534df51bcf9012fb249b345e3dc387673d2bd`.
- Design reference: `SvenKulessa/FRONTEND` `main` (tree `9c2e2255a0fca5fe113b7ddf56906889f8ef1186`).
- Existing shared Hero source image: `src/assets/images/glowing_earth_nodes_1789997454893.jpg`; same filename in the reference repository, already on CAPITAL-AI main before this PR.
- No transfer of private user data or direct import from the external reference repository. Existing accessible app navigation, i18n, assets and Tailwind design tokens retained.
- Canonical brand colors used in three-dimensional orbit graphics: gold `#F9BF21`, emerald `#44DE88`, magenta `#FF2E93`, violet `#8D26FF`.

## User flows

1. Landing Hero: a clearly labeled Blueprint-Bundle preview becomes the primary CTA to `/marketscreener/dokumentation`. The existing analysis opens as explicitly named demo; no invented checkout, price or SKU.
2. Globe: existing Three.js sphere keeps its original static artwork fallback and true axial rotation; four locally generated orbital loops and connected nodes pulse. Motion pauses when hidden/offscreen, respects reduced-motion and releases WebGL resources.
3. Scores: landing Hero, public Blueprint showcase, and market overview identify example scoring as demo or synthetic. No real-time rank, predictive success claim, personalized financial advice or performance evidence.
4. Vault: remove profile navigation, header desktop/mobile entries and visible Vault badges. Existing authenticated `/profile/key-vault` route, server authority, BYOK secrets and account entitlement contracts are intentionally untouched and remain subject to authorization.
5. Cookie consent: the consent dialog unmounts only after a versioned 180-day receipt has been persisted and read back. Reopening and withdrawal are accessible from the legal footer and the authenticated account header. Missing/invalid storage remains denied by default. No GA4 or marketing scripts are activated.
6. Social product video: `createCapitalAiLandingBlueprintVideoProject` creates a schema-validated 30s editable 16:9 MediaProjectV2 draft with five chapters and original Earth artwork. The German voiceover text is embedded as draft metadata. Gemini TTS is requested but the audio asset is **NOT_PROVEN** and the template deliberately does not add a fabricated audio track.

## Content / compliance

- Advertised goods are **Blueprint architecture bundles and explainable analysis/learning**, not investment performance or trading recommendations.
- Public previews do **not** promise an available paid bundle checkout; `src/data/blueprintDeliveryPolicy.ts` stays fail-closed for future paid private delivery.
- The disclaimer is included in marketing content and product video edges: `DEMO-DATEN · Keine Anlageberatung`.
- No new provider data redistribution, user-provided secrets, third-party personal data, or client-side key exposure.
- No automatic publishing; social Legal-Receipt and human approval remain prerequisites.

## Gemini audio dependency and cost

Actual Gemini TTS synthesis requires an authenticated server-side Gemini connection, confirmed model and voice availability, commercial-output rights, Social Engine completion state, content/brand approval, consumption quota and billing readback. None is invented. Paid inference, storage and export require confirmed budget/Owner authorization. The locally rendered MP4 concept video delivered in chat is **silent** and separate from the repo's provider-isolated, editable engine draft.

## Acceptance / evidence

- Unit and source-contract tests: `src/privacy/cookieConsentV3.test.ts`, `scripts/navigation.test.mjs`, `src/platform/SocialMediaEngine/__tests__/socialCore.test.ts`.
- Existing `Docker Security Gate` and `Domain Governance` remain the only required checks; no extra pre-PR gate.
- On a new PR: wait for these exact checks and repair failures within the PR. Never equate source correctness with successful browser rendering.
- Browser/mobile/keyboard accessibility QA, production screenshots, native Three.js frame timing and live Gemini audio: **NOT_PROVEN** until measured after deploy/provider approval.
- No merge, deploy or publishing without existing Owner authorization.
