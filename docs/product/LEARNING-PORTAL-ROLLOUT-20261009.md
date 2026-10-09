# Learning Portal: implementation and rollout

Date: 2026-10-09. Development branch: `capital-ai-product/learning-portal-access`.
Main correlation: `0a56ee0` merged into branch; production is unchanged by this document.

## Product contract

Learning Portal costs EUR 25 once. Existing EUR 19 Vocabulary receipts continue to grant permanent Learning Portal access; no legacy Stripe Price is edited. The old API path remains compatible. Checkout uses a new inline EUR 25 price unless the server is configured with a verified new Price/Product pair.

| Capability | Free | Learning Portal | Additional requirement |
| --- | --- | --- | --- |
| Categories, tabs, Quant/Pro tab | All visible | All visible | None |
| Vocabulary glossary | Seven fixed entries per skill level | All entries | None |
| Flashcard box | Five fixed words total | All words | None |
| Profile favorites | Authenticated account only | Authenticated account only | Maximum 500 saved terms |
| Videos | First published video per category | All published videos | No actual videos published yet |
| Daily quiz | One question per Berlin calendar day | Five daily questions | References seven new public learning articles |
| Chart atlas and module explanations | Preview/locked | Active | Starter or higher subscription |
| Random chart recognition quiz | Locked | Active | Pro or Enterprise subscription |
| Owner | All access | All access | Verified profile IAM role |

The exact three-day Enterprise trial includes temporary Learning Portal, atlas and recognition access. Activation reads the paid provider session and subscription back, verifies identity, Enterprise price, campaign and exactly 72 hours. Access expires at Stripe's original trial end. A later permanent Learning Portal purchase survives trial expiry. Code `ENTERPRISE3` is entered on the website; ordinary Stripe checkouts also expose Stripe's promotion-code field. The trial does not stack invoice discounts. A 100% invoice coupon is intentionally not created: it would discount a billing period instead of limiting access to three days.

Marketing copy: **Drei Tage vorausdenken. Enterprise und Learning Portal kostenlos entdecken.** Trial copy discloses the subsequent EUR 109/month or EUR 1,280/year subscription and the separate EUR 25 Learning Portal purchase after the trial.

## Access and fulfillment

Apply `supabase/migrations/20261009181208_learning_portal_access.sql` before enabling the new promotion. Authenticated user IDs come only from the server session; service-role RPCs are inaccessible to anonymous/authenticated database roles. Favorite lists are per account. Daily free quiz consumption is an atomic update using Europe/Berlin calendar dates.

Server secrets/configuration:

- Existing `STRIPE_SECRET_KEY`, Supabase server credentials and public base URL.
- Optional `STRIPE_LEARNING_PORTAL_PRICE_ID` plus `STRIPE_LEARNING_PORTAL_PRODUCT_ID`: active, one-time, EUR 2,500 cents; mismatch fails closed.
- Required for asynchronous fulfillment: `STRIPE_LEARNING_WEBHOOK_SECRET`, belonging to a Stripe endpoint at `https://capital-ai.online/api/billing/learning/webhook` with `checkout.session.completed` and `checkout.session.async_payment_succeeded` events. The endpoint checks raw-body HMAC, freshness and Stripe readback before granting. No secret belongs in Git.
- Existing subscription sync must keep verified `public.subscriptions` status/tier/period ends current.

The return page is a compatible secondary fulfillment path. Production webhook creation and migration application have not been performed. Refund/revocation policy remains outside this change; do not claim it was implemented. Trial reservations fail closed if Stripe creation/attachment is uncertain; reconcile an abandoned reservation with Stripe readback before clearing it, never blindly release it after a transport timeout.

## Media and content provenance

52 chart lessons: original 12 plus 30 patterns/flags and 10 indicators. Chart geometry is authored and synthetic, not redistributed market feed data. Each lesson has explanation, confirmation and invalidation; chart recognition selects random patterns and four distinct options without leaking the answer in the SVG title.

Three original rocket/shooting-star SVGs have ContentCampaignBrief and validated MediaProjectV2 drafts under `public/learning/videos`. Drafts are explicitly not rendered videos or published social campaigns. No external image license or provider permission is inferred from validation. Future YouTube items must be approved for embedding and entered into `LEARNING_VIDEOS`; invalid IDs are rejected. YouTube is loaded only after the user clicks consent; Free selection happens before category filtering.

New learning articles are public in the Learning Portal. They are educational content, not repository News and not live market headlines. Daily questions rotate through this finite bank; no autonomous news ingestion or fresh article generation is claimed.

## Wallets and Android

Google Pay was already enabled in the connected live Stripe account; read-only evidence is stored in `docs/security/evidence/learning-wallet-readback-20261009.json`. Actual device/browser wallet visibility and a live purchase remain NOT_PROVEN.

Google Play Billing is a separate Android/store integration, not a Stripe wallet toggle. Plugin discovery returned no suitable Google Play connector. Existing `mobile/android-private` is a private WebView application, not a verified Play Billing application. No Play product, Console publication, billing library, receipt verification, purchase acknowledgment or real-time developer notification integration has been enabled in this change.

Required Android follow-up: confirm the intended published app/package, configure store products and license testers, establish least-privilege server verification, bind purchases to signed-in accounts, implement BillingClient purchase/restoration and acknowledgment, process revocation/expiry notifications, and test pending/canceled/renewed purchases. Do not trust a browser-provided purchase token as an entitlement without Google server readback. Store fees and operational costs need account-specific verification before activation; no paid resources or store contracts were activated.

Official implementation references: https://developer.android.com/google/play/billing/integrate and https://developer.android.com/google/play/billing/security .

## Validation and release boundaries

Local unit/SSR/security tests, lint, build and isolated PostgreSQL/PGlite access tests verify their stated scopes. PGlite is not a live Supabase deployment, and mocked Stripe tests are not a real provider checkout. Browser visual QA remains NOT_PROVEN because the Chromium download failed. No production migration, checkout, webhook registration or Google Play purchase has been run.

GitHub required checks are `Docker Security Gate` and `Domain Governance`. Merge is an Owner action unless the specific PR is explicitly delegated in chat, per root `AGENTS.md`. Only main deploys normally. After release, verify runtime source identity, database migration, signed fulfillment, temporary expiry, paid retention, account-isolated favorites, free daily reset and mobile readability.
