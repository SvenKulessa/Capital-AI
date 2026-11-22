# SmartClip: Acode free-distribution decision and Stripe tax sandbox preflight
Evidence status: 2026-11-22 · TRUST / GROWTH / PLATFORM · Draft PR #916
Scope: SvenKulessa/Capital-AI only. No public publication, live payment, Stripe product creation, deployed migration or seller/MoR activation.

## Evidence 1: Written Acode response

The Acode team, signing as Foxbiz Software Private Limited, replied in writing on 22 November 2026 to the user-directed inquiry. Gmail message `1a204bdb673e99dd`, thread `1a2045fb82b7ecbb`:
https://mail.google.com/mail/u/?authuser=sven.kulessa%40gmail.com#all/1a204bdb673e99dd

Provider-stated proposal: publish the plugin as a *free* Acode Store download, with user accounts, independent licensing and website payments managed by CAPITAL-AI; no Acode commission on payments processed independently. The independent vendor bears taxes, invoices, refunds, consumer protection, updates and support. External purchase redirection or outbound payment links within a plugin may be restricted by Google Play/Apple rules; Acode did not provide unconditional permission for any such link.

This reply does **not** establish Acode's seller/MoR role for paid Acode-native checkout and is not store review, APK compatibility or legal EULA approval. The recommended business route differs from a paid native store listing.

## Evidence 2: Actual Acode pilot package

Existing Drive source: `2026-11-22_PLATFORM_CHATGPT_ACODE_SMARTCLIP_PILOT_BUNDLE_v1.zip` (existing private SmartClip folder). Its embedded `acode-plugin/2026-11-22_PLATFORM_CHATGPT_ACODE_ANDROID_CLIPBOARD_BRIDGE_PLUGIN_v2.zip` has SHA-256
`8c2683d641f28bf466026dff1f4adb0c073bc81564bc0afd4b758a33d7b76512`, equal to the code-bound sandbox release digest.

The embedded `plugin.json` identifies `com.capitalai.smartclip.androidbridge`, version `0.2.0`, `minVersionCode:954`, entry `main.js`, and a private-use license pending commercial determination. It has no `price` field, meaning free under current Acode manifest documentation. Static review of `main.js`: `acode.setPluginInit` and `setPluginUnmount` present; no literal `fetch(`, `XMLHttpRequest`, `WebSocket`, Stripe, Checkout, http(s) URLs or client-side license API call found. This is **static-only evidence**, not proof of device security or complete information-flow analysis.

The current ZIP **does not implement an entitlement login** and the website's `sameOrigin`-restricted `/api/billing/smartclip-sandbox/access` cannot simply be called from the Acode mobile plugin. A separate approved Auth/PKCE device pairing flow, customer consent, least-privilege token scope, signed authorization, replay/rate-limit tests, revoked/grace-state handling, cross-account negatives and device validation are required before any paid functionality is claimed. Never put Stripe or Supabase server-side credentials in the ZIP.

A free listing must accurately disclose any separately licensed functionality; no external purchase link or conversion redirect inside the plugin without express platform/legal approval. No Store submission attempted.

Official Acode manifest guidance: https://docs.acode.app/docs/plugin-essentials/manifest .

## Evidence 3: Stripe account and tax

Stripe TESTMODE `GET /v1/tax/settings` => `status=active`; `GET /v1/tax/registrations?limit=100` => `data=[]`, `has_more=false`; `GET /v1/products?limit=100` => 3 existing products, no SmartClip product. Testmode `GET /v1/account` => standard German account with card-payment capability active. No account-specific Managed Payments eligibility or terms acceptance proof was returned; these cannot be inferred from ordinary charges_enabled status.

Executed **one synthetic testmode tax calculation** `taxcalc_1UejQBPKr4joNbEckStC9Z8C`, EUR 2.49 tax-inclusive, representative DE location Berlin/10115, no real buyer identity, tax code `txcd_10202000` (Stripe's candidate for prewritten downloadable personal-use software). Returned `livemode=false`, `amount_total=249`, `tax_amount_inclusive=0`, and `taxability_reason=not_collecting`. This proves test-account non-collection **not** any seller's exemption, registration or entitlement to display a zero VAT price.

SearchTaxCodes provider results: `txcd_10202000` (downloadable personal-use software) and `txcd_10202001` (downloadable non-recreational personal-use software). The previous fixture used `txcd_10503000` (unrelated digital news/documents). Sandbox configuration now admits only the two catalog software candidates, with existing tax attestation flag, DE registration and product metadata readback still mandatory. The official code catalog is not a legal tax classification opinion. No new Stripe Product, Price, Payment Link, Session, Registration, charge or webhook activated in this work.

Stripe Managed Payments eligibility: https://docs.stripe.com/payments/managed-payments/eligibility .
Stripe tax setup: https://docs.stripe.com/tax/set-up .

## Decision / boundaries

- `ACODE_PROVIDER_REPLY=VERIFIED`; `ACODE_FREE_DISTRIBUTION=PROVIDER_RECOMMENDED`; `ACODE_OFFSITE_IN_PLUGIN_CTA=NOT_APPROVED`.
- `PILOT_PLUGIN_ARCHIVE_SHA256=VERIFIED`; `ACODE_MOBILE_ENTITLEMENT=NOT_IMPLEMENTED`; `PUBLIC_UPLOAD=BLOCKED`.
- `STRIPE_TEST_TAX_CALCULATION=VERIFIED`; `DE_STRIPE_TAX_COLLECTION=BLOCKED`; `SMARTCLIP_TAX_CODE_OWNER_APPROVAL=NOT_PROVEN`.
- `STRIPE_MANAGED_PAYMENTS_ACCOUNT_ELIGIBILITY=NOT_PROVEN`; `REAL_STRIPE_TEST_CHECKOUT=NOT_PROVEN`; `LIVE=BLOCKED`.
- `ACODE_PAID_STORE_MOR=NOT_PROVEN`; `ACTI_COMMERCIAL_PUBLICATION=HOLD`; `MERGE=HOLD`.

Next independent technical work: complete security/negative CI at exact PR head after tax-code hardening; prepare test-only PKCE/device-linking contract against existing auth infrastructure, validate actual Acode compatibility and customer disclosure separately. Provider registration or business tax choice is not inferred from postal address, Stripe capabilities or a synthetic tax calculation.
