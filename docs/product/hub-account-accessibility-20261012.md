# Hub navigation, account display and accessibility audit · 12 October 2026

Continuation of `capital-ai-product/customer-tour-subscriptions-20261011`, including the public glossary, learning swipes and customer video work. Main architecture PR #422 remains integrated. No changes to other chats' untracked `docs/reviews/` work.

## Implemented customer behavior

- Header and account shell share a verified account display. Owner takes precedence over stored Free billing. Pro remains Pro. Failed verification displays an unknown status, never an invented Free label. IAM projection survives an independent subscription fetch failure; mismatched profile identity fails closed. Paid rights remain separately server-enforced.
- Login/profile use customer language. Infrastructure details stay out of routine authentication copy. Privacy processor disclosures and legally necessary references remain accessible.
- `/profile/rights` bundles personal access, subscription navigation and legal information. `/legal` remains the anonymous legal overview. Long repeated product disclaimers move to these two locations. Consent, terms and checkout references remain in their relevant forms.
- Hub labels: Analytics Hub, Studio Hub, Learning Hub, Dokumentation Hub, Control Center. Existing URLs and billing product IDs remain compatible. Hub subnavigation uses native links in a single horizontal scroll strip, active state, touch scroll and 44px scroll buttons. Modified clicks and keyboard focus remain available.
- Fixed colours in the shared hub registry: Analytics cyan `#67E8F9`, Studio purple `#C4B5FD`, Learning gold `#F9BF21`, Documentation pink `#F9A8D4`, Control Center rose `#FDA4AF`; legal navigation blue `#93C5FD`. Financial gain/loss use separate semantic colours and signs/icons.
- Analytics overview now provides responsive index cards, sparklines, search, change sorting and an expandable data table. All metrics are explicitly educational; they never enter canonical scores or ranking contracts.

## Historical archive boundary and quantitative method

Read-only inspection confirmed 24 BTC/ETH/SOL stored daily price rows for 23–30 September 2026 in the existing archive. The archive has no source licence/provenance columns; public commercial redistribution is NOT_PROVEN. No raw archive prices, scores, record IDs, credentials or database project identifiers are committed to public assets.

The authenticated, MFA-aware owner-only endpoint `/api/analytics/owner-archive-demo` reads that fixed window server-side. It validates 24 complete, finite, positive samples and unique chronological dates. Only normalised series leave the server: first day = 100, index = price / first price × 100, rounded to two decimals. It does not return raw prices, stored scores or currency assertions. Anonymous, ordinary paid and MFA-pending sessions are denied before database access; malformed or unavailable archives fail closed. No schema or RLS changes, no new provider contract or paid resource.

The public demo is deliberately synthetic and separate from the historical source. Owner can switch between the private historical view and public demo. Daily sample standard deviation is calculated from seven percentage returns, without annualisation, confidence claims or trading advice. This is conventional quantitative analysis, not a claim of quantum computation. Public use of the actual archive remains blocked until source rights are evidenced.

## Actual verification

- `npm test`: 680 tests passed (all component suites reported zero failures).
- `npm run test:security`: 275 tests passed, including the five archive tests added to this existing script.
- `node --test server/auth.test.mjs server/historical-analytics-demo.test.mjs`: 29 tests passed including independent billing outage, foreign profile identity, Pro subscriber, unauthorised archive access, MFA denial, corrupt samples and leakage prevention.
- `npm run test:seo`: 31 tests passed. Source hashes refreshed against actual files; glossary remains 305 publicly indexable terms. Private account rights route explicitly excluded from indexing.
- Build, TypeScript/frontend-boundary lint and whitespace check passed.
- Chromium 153 + axe-core 4.10.3 audited 28 page/viewport combinations: 320/390/768/1440px × Analytics, Learning flashcards, Documentation, Profile, Account rights, Login, Legal. Zero reported WCAG 2 A/AA, 2.1 AA and 2.2 AA violations after fixing Footer targets and low-contrast account/login helper copy. See `evidence/hub-accessibility-20261012/accessibility-audit.json`.
- Browser actions: owner/Pro/unknown status, search/sort, private archive switch using synthetic fixture, keyboard focus to last hub link, scroll buttons, reduced motion, no page overflow and 200% root-font enlargement at 320px.
- Separate learning/video browser run: touch and mouse card swipes, persistence/removal, anonymous/error card retention, account isolation fixtures, horizontal touch navigation, 200% font size, public formerly gated deep links and H264 decode all passed. See `evidence/learning-swipe-20261012/`.

Fixtures are not real live authentication or paid checkout evidence. Axe incomplete/manual checks are retained in the JSON; real VoiceOver/NVDA, physical Android/iOS, full WCAG certification and authenticated production owner archive readback are NOT_PROVEN. No claim of revenue, conversion lift or live price accuracy.

## Previous instructions and media

The branch includes the current-logo video, simple Elite Backtesting card, synthetic Greed tachometer and waving JaJa Buddy. The clip is a real silent 20-second H264 file without visible commands or repository internals. Earlier reports record its checksum-verified private Drive upload and five-domain folder organisation. An unavailable older chat's Gemini/audio instructions remain unproven; this audit does not invent completion of missing context.

## Activation and rollback

Normal PR checks and main-only deployment apply. Required Docker Security Gate and Domain Governance must complete successfully at the exact current PR head before any delegated merge. Verify production source identity and public navigation separately after deployment; local fixture evidence is not a live release. Rollback by reverting the product commits; no database migration or entitlement mutation needs reversal.
