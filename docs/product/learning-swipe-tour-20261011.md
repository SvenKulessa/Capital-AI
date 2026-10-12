# Learning swipe cards, demo lessons and refreshed tour

Branch: `capital-ai-product/customer-tour-subscriptions-20261011`.
Implementation: `88ddabd`; synchronized main: `93a5033` via `0a2e9d3`.
The subsequent verification commit contains this report, browser evidence, aligned tour copy and regression assertions.

## Delivered behavior

- Vocabulary cards accept horizontal touch gestures and mouse dragging. Left saves an unknown term through the existing authenticated favorites API, then advances. Right advances without storing. Buttons provide equivalent keyboard actions. A failed save retains the card and displays an error. Vertical page scrolling remains available.
- `/profile/dashboard` has Lernfeld and Notizen tabs. Saved terms survive reload through the existing user-scoped database storage. An accessible X button removes a term. Client-supplied user identities never authorize storage access; no database migration is required.
- The public Quant demo teaches point-in-time data availability with synthetic 09:55/10:05 publications and a 10:00 decision. Its first-party source is the merged Quant Research skill, PR #406. This free lesson does not unlock protected Quant-Pro content.
- Blueprint documentation and the video share synthetic sentiment inputs: 72 positive, 30 neutral, 18 negative, 120 total; `(72−18)/120×100 = +45`. The scale is −100 to +100. These are educational numbers, not live news or a predictive signal.
- Hub links use one horizontal strip with glowing hover, focus and current-page states. Native horizontal touch scrolling reaches overflowed links; ordinary and modified link behavior remain available.
- Vocabulary totals are calculated from the canonical catalog, including the new lesson: 295 catalog entries, 133 public, 162 protected Quant-Pro entries. React, HTTP fallback and SEO metadata use the same count source. Catalog source links identify merged PRs #139, #142, #365 and #406. SEO source hashes have been refreshed; drift tests reject stale provenance.
- The existing 20-second silent product tour uses the current site logo and the first-party JaJa model. The final five seconds animate its right arm across 30 distinct rendered frames. Its four scenes show Quant, sentiment, swipe/Lernfeld and the waving Buddy. Tour descriptions and chapter labels match those scenes.

## Verification performed

| Check | Result |
| --- | --- |
| `npm test` | PASS, 668 tests, zero failures |
| `npm run test:seo` | PASS, 30 tests including source-provenance drift |
| `node --test server/vocabulary-checkout.test.mjs` | PASS, 10 tests, including idempotent save, user isolation, removal, invalid IDs, anonymous requests and foreign origins |
| `npm run lint` | PASS, TypeScript and frontend boundaries |
| `npm run build` | PASS, existing 500 kB chunk limit preserved; entry chunk 480.49 kB |
| `git diff --check` | PASS |
| `ffprobe` | 20.000 seconds, 1080×1920, one video stream, no audio |

Browser verification used Chromium 153.0.8010.0 against the built frontend at widths 320, 390, 768 and 1440, height 900. Mouse swipes, reload persistence, removal, keyboard tab navigation, no page overflow and reachable horizontal hub links passed at all widths. CDP touch gestures passed for left/right cards and the hub strip at 390 px. A 320 px viewport with 200% root font size retained no page overflow. Reduced motion was enabled. Cookie consent was set to necessary-only.

Anonymous 401 and unavailable-storage 503 fixtures displayed an error without advancing the card. A second user fixture saw an empty Lernfeld. Browser API responses were synthetic; actual server user scoping was verified separately by the API tests. These results do not establish signed-in production behavior or full accessibility conformance. Hub text contrast, calculated from current CSS token colors, is 15.25:1 normal, 13.39:1 hover and 9.83:1 selected.

Evidence: [browser results](evidence/learning-swipe-browser-20261011.json), [390 px screenshot](evidence/learning-cards-390-20261011.png), [video asset hashes](../../public/learning/videos/capital-ai-tour-asset-manifest.json).

## Reproduction

Run the commands above from the repository root after `npm ci`. The optional browser script is `scripts/qa/learning-swipe-browser.mjs`; it starts a local Vite preview and mocks only `/api/**` responses. Supply Playwright Core and a compatible Chromium helper outside the production dependency tree:

```sh
PLAYWRIGHT_MODULE_PATH=/absolute/path/to/playwright-core/index.mjs \
CHROMIUM_HELPER_MODULE_PATH=/absolute/path/to/@sparticuz/chromium/build/index.js \
CHROMIUM_EXECUTABLE_PATH=/absolute/path/to/chromium \
QA_OUTPUT_DIR=/absolute/path/to/qa-output \
node scripts/qa/learning-swipe-browser.mjs
```

The recorded run used `@sparticuz/chromium` 153.0.0 and the runtime-provided Playwright Core. Neither package was added to production dependencies or CI requirements. Port 4173 must be available. The script uses synthetic users and no real account credentials.

For offline video reproduction, first generate the existing JaJa model with `node scripts/generate-jaja-3d.mjs`, then use `python scripts/media/render_capital_ai_tour.py --allow-gpl-ffmpeg` with Pillow, NumPy and the already authorized local FFmpeg GPL build. The model is generated by the normal build and is not committed as a new binary. No external publishing, provider activation or paid rendering is performed. MP4 SHA-256: `02897f6e0cde3cf69966be1bd0f75f1ee84bf6ea4e951784744a059dc1fe4abb`.

## Release limits and rollback

GitHub PR checks (`Docker Security Gate`, `Domain Governance`), merge and signed-in production readback are NOT_PROVEN until the branch is published and the normal deployment completes. Existing subscription-portal work on this branch remains part of the original scope; its live owner/account behavior is not proven by these Learning fixtures. Rollback is a normal revert through main; no new migration or provider configuration is involved in this follow-up.
