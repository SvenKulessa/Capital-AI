# Customer UI, account subscriptions and Capital-AI Tour

Base: main d34c9307c24ee192dc4a3599d81116cc3074638c.

Customer-facing login/profile text omits infrastructure vendor branding. Legally relevant recipient information in the privacy policy is retained. Public CADS promotion and customer entitlement panels are paused; the internal engine, access controls and APIs remain unchanged. Owner display uses the verified IAM role, without changing subscription rights or relying on a client email exception. Active subscription status uses a green badge with a text label.

The authenticated `/profile/subscription` page calls POST `/api/billing/subscriptions/portal`. The backend resolves the stored subscription for the verified user, checks Stripe subscription identity and mode, and rejects shared customer identities. Caller-supplied customer IDs never authorize a portal. Stripe controls renewals, cancellation and plan changes; the existing subscription sync remains authoritative. Unavailable/anonymous/empty states do not invent paid rights.

Stripe live configuration `bpc_1TnKdrPKr4joNbEcCYk5xGPC`: update confirmed 2026-10-11. Price changes enabled for the six current catalog prices; proration=create_prorations, trial_update_behavior=continue_trial. Cancellation remains at period end. Default return URL is `/profile/subscription`; legal URLs added. No customer subscription, price or payment was changed. Rollback: disable subscription_update and restore `/dashboard` default return URL and the former empty business-profile links. Customers confirm actual tariff/price changes inside Stripe.

Marketing, commerce and scoring disclaimers share `shared/product-disclaimers.mjs`; legal source links appear in expandable UI. Disclaimers do not decide regulatory classification or replace legally required consumer flows. The account portal is not asserted to be a complete public cancellation-button implementation under §312k BGB.

Kraken referral is the Owner-confirmed URL `https://proinvite.kraken.com/9f1e/8nfzp3u7`, code `yc4ggk3f`. The reusable YouTube description template is exposed in the SocialMediaEngine and Content Studio, with advertising disclosure, risk/disclaimer text and no guaranteed referral reward.

20-second silent tour rendered via the existing offline social renderer. ffprobe confirms exactly 20.000 seconds, one video stream and no audio. The follow-up now shows Quant learning, synthetic Blueprint sentiment, swipe/Lernfeld and the waving Buddy with the current logo. The edit-ready MediaProject is validated and does not grant external publishing authority. FFmpeg local GPL profile was explicitly allowed for rendering; no FFmpeg binary is distributed.

Verification: application suite 615 tests passed; 15 checkout/portal tests and 30 SEO tests passed; additional subscription checkout/portal tests, 6 social-core tests, navigation/pricing/position/learning tests, auth tests, SEO tests, TypeScript and Vite build. Browser responsive testing NOT_PROVEN: no local browser executable and official browser download failed. Live browser check follows normal main deployment. No personal signed-in browser session available; owner/pro UI cannot be asserted live without it.

Rollback: revert the PR through the usual main flow; restore Stripe portal configuration as above if required. No data migration or provider activation.

Follow-up implementation and current Learning/browser verification supersede the initial Learning test status above: [learning-swipe-tour-20261011.md](learning-swipe-tour-20261011.md). Signed-in production subscription behavior remains separately unproven.
