# Public glossary and video-order verification

Branch: `capital-ai-product/customer-tour-subscriptions-20261011`.
Previous verified implementation: `6d2232a`. Main base: `93a5033`.
This follow-up is implemented on that branch; GitHub publication and live deployment are separate, unproven states.

## Public glossary

All 305 canonical terms now have public definitions, anonymous React views, HTTP fallback content, canonical URLs, `DefinedTerm` metadata and sitemap entries. This includes the 162 formerly excluded Quant-level glossary entries. Skill labels describe complexity, independently of purchase rights. No authenticated favorites, private notes, subscription rights or account data become public.

The browser uses existing extended public lessons where available and the reviewed canonical definition/thesaurus for the other entries. It does not retrieve the private database exercises for anonymous users. Authenticated learning access may enrich known IDs with existing exercise details without duplicating the glossary. The complete exercise deck remains part of the paid Learning product; free flashcards still contain five words. Offer wording now describes exercises, rather than selling access to public definitions.

Counts are derived from the catalog, not duplicated fixed numbers. New researched entries feed both the browser and server metadata from `shared/researched-vocabulary.json`. Their explanations, formulas, synthetic examples and primary-source links also appear in HTML without JavaScript. Catalog PR sources remain separate from term-specific external references.

The additions fill gaps found against the actual existing inventory:

| Term | Verified primary reference |
| --- | --- |
| Datenleckage | [scikit-learn: Common pitfalls](https://scikit-learn.org/stable/common_pitfalls.html) |
| Walk-forward-Validierung | [scikit-learn: TimeSeriesSplit](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html) |
| Permutationswichtigkeit | [scikit-learn: Permutation feature importance](https://scikit-learn.org/stable/modules/permutation_importance.html) |
| Wahrscheinlichkeitskalibrierung | [scikit-learn: Probability calibration](https://scikit-learn.org/stable/modules/calibration.html) |
| Brier Score | [scikit-learn: brier_score_loss](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.brier_score_loss.html) |
| Precision | [scikit-learn: precision_score](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.precision_score.html) |
| Recall | [scikit-learn: recall_score](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.recall_score.html) |
| ROC-AUC | [scikit-learn: roc_auc_score](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.roc_auc_score.html) |
| Zinsstrukturkurve | [ECB: Euro area yield curves](https://www.ecb.europa.eu/stats/financial_markets_and_interest_rates/euro_area_yield_curves/html/index.en.html) |
| Realzins | [ECB: What are interest rates?](https://data.ecb.europa.eu/methodology/what-are-interest-rates) |

Research date: 2026-10-11 UTC. Text is independently phrased; numbers are synthetic. Sources are explanatory references, not imported live datasets or evidence of financial returns. The ECB interest-rate methodology was available in search text; a subsequent page fetch returned 503. No new library, paid integration or tracking was introduced.

## Video and prior-chat audit

The full original wording of the older “Website überarbeiten und prüfen” chat was not returned by Personal Context. A complete, word-for-word closure of that older conversation is therefore NOT_PROVEN. The visible follow-up instructions and the existing branch handoff were checked against code, tests and the actual media asset:

| Instruction / recorded scope | Current evidence | Status |
| --- | --- | --- |
| Current logo in video | Existing site icon used; input/output hashes in the video manifest | Local PASS |
| Quant skill demo | Shared point-in-time lesson and PR #406 link remain on the website; user subsequently requested an Elite card in the video | Local PASS |
| Left/right mouse and touch swipes | Browser gestures; left saves, right advances; vertical scrolling remains available | Local PASS |
| Private Lernfeld and X removal | Reload/removal browser fixtures; independently user-scoped server tests | Local PASS; signed-in production NOT_PROVEN |
| Current vocabulary count and PR sources | Dynamic shared counts, 305 public terms, matching sitemap and schema | Local PASS; deployed indexation NOT_PROVEN |
| Waving Buddy | First-party JaJa right-arm animation, 30 rendered frames in the last scene | Local PASS |
| Blueprint sentiment demo values | Shared 72/30/18 inputs, 120 total, index +45 in UI; video now maps the synthetic index to a 72.5/100 Greed dial | Local PASS |
| Glowing and horizontally scrollable hub tabs | Mouse, touch, keyboard, 320/390/768/1440 px browser checks | Local PASS |
| Duplicate Quant demo introduced during follow-up | Removed from breadcrumb; one demo remains, covered by rendering/browser assertions | Fixed |
| Customer-facing copy, Owner/active status, paused CADS promotion | Existing branch implementation and account/pricing/navigation regression suite retained | Local PASS within tested scope |
| Account-bound subscription portal | Existing tests reject injected identities, foreign ownership, shared customers and foreign origins | Local PASS; live customer action NOT_PROVEN |
| Kraken referral and product disclaimers | Existing owner-confirmed link and disclosure retained in UI and video description | Repository verified; no commercial data-license claim |
| Drive video delivery | Existing 20-second file updated in place; MIME, byte size, private sharing and target folder read back | Drive PASS |
| Earlier Gemini-audio request found in history | Current 20-second tour has no audio stream; no successful Gemini-audio output identified in this scope | NOT_PROVEN; do not claim completed |
| Remote PR, required checks, production effect | Local branch only; existing push approval blockage unresolved | NOT_PROVEN |

The revised tour is exactly 20.000 seconds at 1080×1920 with one H.264 High-profile, yuv420p video stream, fast-start MP4 and no audio. Actual browser playback is checked, rather than merely testing the duration. The server now serves `video/mp4`, with the downloaded bytes compared to the manifest hash. It remains an educational demo with synthetic values. Its asset manifest records the file SHA-256 and first-party inputs. A private Drive upload does not change SocialMediaEngine publication rights.

## Video simplification requested during this follow-up

The latest user instruction overrides the initial video lesson choice: show a simple Elite vocabulary card and a graphical Greed tachometer, without commands or repository internals. The first scene now shows Backtesting (verified Elite skill label), its plain-language meaning and a warning that past outcomes do not guarantee future gains. The second shows an educational Fear/Neutral/Greed gauge. Its synthetic signed index +45 maps linearly to 72.5 on a 0–100 demo dial; these thresholds are illustrative and are not an external provider's Fear & Greed index. The third describes the personal learning field without navigation commands. The Buddy still waves in the final scene.

Visible captions contain no PR references, repository paths, terminal commands, credentials or architecture internals. Video-project/template captions are synchronized, and regression checks reject repository/command references in those captions. The previous MPEG-4-Part-2 file actually failed local browser playback with media error 4. H.264 fixes that confirmed failure; the renderer stages fresh assets and validates the complete duration before replacing shipped media. Current MP4 SHA-256 is recorded in its manifest. The existing Drive file was updated in place again, preserving its link and privacy.

## Verification

- `npm test`: PASS, 670 tests and zero failures.
- `npm run test:seo`: PASS, 31 tests. The existing HTTP test requests all 305 term URLs anonymously and verifies HTTP 200, no noindex header, indexable HTML metadata and canonical links. Unknown terms and private routes retain their existing negative checks. New-term formulas, examples and source links are checked in server HTML.
- `npm run lint`: PASS, TypeScript and frontend boundaries; no suppression added.
- `npm run build`: PASS; existing 500 kB chunk guard preserved, entry chunk approximately 480.48 kB.
- `scripts/qa/learning-swipe-browser.mjs`: PASS in Chromium 153.0.8010.0. The existing four responsive widths, mouse/touch swipes, storage-failure retention, keyboard, 200% font size and removal checks were retained. Decoded H.264 video playback, anonymous `/vocabulary/vwap`, `/vocabulary/brier-score`, source-link display, Realzins search and a single Quant demo passed.

Browser API responses are synthetic fixtures. They demonstrate UI behavior, not a real signed-in production account. Evidence and reproduction steps: [current browser results](evidence/public-glossary-browser-20261012.json), [390 px screenshot](evidence/public-brier-score-390-20261012.png), and the [original browser setup](learning-swipe-tour-20261011.md#reproduction). Existing API authorization tests cover user isolation separately.

## Drive organization

The connected Drive now has a `CAPITAL-AI` folder containing PRODUCT, MARKET, PLATFORM, TRUST and GROWTH. Existing TRUST was reused. Project folders and mixed-domain files were checked and moved using their verified previous parents. Mobile UI/design references were visually inspected before assigning them to PRODUCT; brand media belong to GROWTH, financial methodology to MARKET, infrastructure/backups to PLATFORM and security/governance to TRUST. Existing file IDs and private sharing were preserved. No files were deleted. A private organization report in TRUST records old and new parents for reversal; private Drive IDs and security-backup metadata are intentionally absent from this public repository report.

## Release and rollback

Public glossary behavior becomes live only after the normal PR/main deployment. Required checks remain `Docker Security Gate` and `Domain Governance`. Search-engine inclusion itself is not guaranteed by indexable HTML. Revert the follow-up through the normal main flow to restore the prior glossary policy; no migration or provider activation is needed. Drive moves can be reversed using the private report. The updated video retains its original Drive ID and version history.
