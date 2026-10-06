# Monetizable Product Registry

Naming convention: `[CAPITAL-AI-MARKET]PRODUKTNAME` or `[CAPITAL-AI-PRODUCT]PRODUKTNAME`.

Current-state correlation: 2026-10-06, implementation baseline `cef1d11f607778f5226ca1df97376ba408652c69`. Readiness/Gap remain the historical weighted measure only where the underlying implementation state did not materially change. A dash means the old percentage was invalidated and has not been re-measured.

Weights: definition 15, user surface 25, commercial path 25, data/compliance gate 20, production evidence 15.

A successful build, test or UI is not a production release. Provider rights and `decisionEligible` stay fail-closed.

| Product | State | Readiness | Gap | Blocker |
|---|---|---:|---:|---|
| [CAPITAL-AI-MARKET]SAAS-MEMBERSHIP | ACTIVE_COMMERCE_SLICE | — | — | Server-authorized Stripe Checkout und Subscription-Tier-Entitlements sind implementiert; drei echte Testmode-Käufe, Upgrade/Downgrade/Cancel/Reactivation und produktive Runtime-Evidence bleiben offen. |
| [CAPITAL-AI-MARKET]B2B-DATA-API | PLANNED | 20% | 80% | Kein API-Key-, Metering- oder Vertragsprodukt. |
| [CAPITAL-AI-MARKET]SENTIMENT-API | PROMPT-2 / 50-COMPONENTS | 31% | 69% | MarketSentiment-Oberfläche vorhanden, API-Produktisierung offen. |
| [CAPITAL-AI-MARKET]WHITE-LABEL-WIDGETS | PLANNED | 10% | 90% | Kein Embed-SDK, kein Tenant-Theme, kein Lizenzvertrag. |
| [CAPITAL-AI-MARKET]BROKER-AFFILIATE-ROUTING | PARTIAL | 39% | 61% | Kraken-Referral-Banner vorhanden, Routing-Matrix und Disclosure-Gate unvollständig. |
| [CAPITAL-AI-MARKET]TRADING-FEE-REVENUE-SHARE | DRY_RUN_ONLY | — | — | Kraken Spot `AddOrder(validate=true)` ist als nicht ausführender Dry-Run vorbereitet; Live-Submit, persistente Idempotency/Audit und Revenue-Share-Abrechnung bleiben blockiert. |
| [CAPITAL-AI-MARKET]OSS-PIPELINE-SIMULATION-ENGINE | INTEGRATED | 44% | 56% | Pipeline Builder integriert, nicht als bezahltes Paket mit SLA geschnitten. |
| [CAPITAL-AI-PRODUCT]CADS-BENCHMARK-ENGINE | GITHUB_MARKETPLACE_BILLING_RUNTIME_IMPLEMENTED | — | — | Starter/Pro/Enterprise Paid-Marketplace-Runtime mit HMAC, GitHub-Subscription-Readback, idempotentem Supabase-Entitlement-Ledger und Cancellation-Cleanup ist implementiert. Externe GitHub-Admission, USD-Preise, echte Plan-IDs und Listing-Approval bleiben offen. |
| [CAPITAL-AI-MARKET]GHCR-DIGEST-BLUEPRINT-MARKETPLACE-APP | PLANNED | 26% | 74% | Digest-Pipeline dokumentiert, App und kommerzielle Evidence-Tiers fehlen. |
| [CAPITAL-AI-MARKET]CPT-STAKE-TO-ACCESS | PLANNED | 24% | 76% | Tokenomics-Seite vorhanden, Stake-Gate und $CPT-Zahlung deaktiviert. |
| [CAPITAL-AI-MARKET]CPT-MICROPAYMENTS | PLANNED | 10% | 90% | Kein Wallet-, Settlement- oder Usage-Meter. |
| [CAPITAL-AI-MARKET]CPT-SUBSCRIPTION-PAYMENTS | PLANNED | 19% | 81% | Eigener Stripe-Price für $CPT erforderlich, Schalter ist fail-closed. |
| [CAPITAL-AI-MARKET]REVENUE-SIMULATOR | INTEGRATED | 40% | 60% | Interner Rechner integriert, nicht als Kundenprodukt paketiert. |
| [CAPITAL-AI-MARKET]SPONSORSHIP | PLANNED | 16% | 84% | FUNDING-Ziel nicht verifiziert aktiv. |
| [CAPITAL-AI-MARKET]SEO-GROWTH-ENGINE | PARTIAL | 28% | 72% | Route-Analytics und Docs vorhanden, kein vermarktbares SEO-Produkt. |
| [CAPITAL-AI-MARKET]SOCIAL-MEDIA-ENGINE | PLANNED | 14% | 86% | Kein Publishing-, Approval- oder Measurement-Workflow. |
| [CAPITAL-AI-MARKET]ENTERPRISE-SCORER | PARTIAL | 42% | 58% | Dashboard vorhanden, Scoring nicht decisionEligible und nicht entitlement-gated. |
| [CAPITAL-AI-MARKET]WHALE-RADAR | PARTIAL | 39% | 61% | Modal und Section vorhanden, Live-Feed-Rechte und Paid-Gate offen. |
| [CAPITAL-AI-PRODUCT]MARKET-VOCABULARY | MONETIZED | 100% | 0% | Live-SKU prod_VNTsrtlf2ZL8ja, Price price_1UMiuIPKr4joNbEclpn8AwFW, 19,00 EUR inkl., Checkout, Entitlement, Widerrufsverzicht. |
| [CAPITAL-AI-PRODUCT]PRICE-ALERTS | PARTIAL | 36% | 64% | Alert-UI vorhanden, Zustellung und Tariflimit nicht serverseitig erzwungen. |
| [CAPITAL-AI-PRODUCT]LEARNING-PORTAL | PARTIAL | 32% | 68% | Seite vorhanden, kein Curriculum-Commerce. |
| [CAPITAL-AI-MARKET]MOBILE-SCORER-TERMINAL | PARTIAL | 31% | 69% | Server-Scorer und Mobile-Repo vorhanden, Store-Release und Billing fehlen. |
| [CAPITAL-AI-PRODUCT]HERO-BUDDY-SUPPORT | INTEGRATED | 46% | 54% | Portal-Widget mit FAQ und Disclaimer, ohne Live-Handoff und Production-Freigabe. |

Orderbook and Market Depth stay owned by the 50-component MARKET program / Prompt 2 and are not duplicated here.

## GHCR Marketplace product pipeline

Repository → Build → SBOM → Security Scan → Attestation → Immutable GHCR Digest → Render Blueprint → Runtime Readback → Source SHA correlation → Release Evidence.

The app must never rebuild between verified candidate and promotion. Commercial tiers may package evidence retention, policy profiles and API/reporting, but the underlying digest identity remains immutable.


## CADS Website-Commerce Slice — 2026-10-06

Die Website monetarisiert CADS **ohne neue Stripe-SKUs**:

- Preisautorität: bestehende Starter/Pro/Enterprise-Produkte in `server/billing-catalog.mjs`.
- Subscription Authority: `public.subscriptions`, serverseitig über `auth.resolvePaidTier()`.
- Capability Authority: `packages/benchmark-core/index.mjs`.
- User Surface: `src/features/pricing/MonetizationModal.tsx`.
- Commerce Projection: `GET /api/cads/commerce/readiness`.
- Benutzergebundenes Entitlement: `GET /api/cads/commerce/entitlement`.
- Benchmark Runs bleiben `productionEligible=false` und `decisionEligible=false`.
- GitHub Marketplace besitzt weiterhin eine separate, noch nicht implementierte Billing-/Entitlement-Authority.


## CADS GitHub Marketplace channel

GitHub Marketplace ist **ein zusätzlicher Vertriebskanal**, nicht die kanonische CADS-Billing-Authority der Website.

- Website-Billing bleibt `server/billing-catalog.mjs` + Stripe Subscription Checkout.
- Website-Entitlements bleiben `public.subscriptions` via `auth.resolvePaidTier()`.
- GitHub-Marketplace-Billing/Entitlements bleiben separat und fail-closed, bis eine CADS-spezifische GitHub App, Listing-, Plan-ID- und Marketplace-API-Authority existiert.
- Der historische gewichtete Readiness-Prozentwert bleibt für CADS bewusst **nicht** reaktiviert; nach #216 ist `readinessPct/gapPct = null`, bis ein neuer vollständiger Scan gegen den aktuellen Implementierungsstand erfolgt.
- Paid Marketplace Entitlements dürfen Security-, Lizenz-, Provider-/Datenrechte- oder Production-Gates nie übersteuern.


## CADS GitHub Marketplace Paid Production — 2026-10-06

Der Zielkanal ist **produktive Paid-Monetarisierung im GitHub Marketplace**. Community-only ist nicht der Produktzustand.

- Pläne: Starter / Pro / Enterprise.
- Pricing Authority: GitHub Marketplace Listing.
- Währung: USD.
- Jeder Paid-Plan benötigt monatlichen und jährlichen Preis.
- Marketplace Plan IDs werden nach Erstellung der realen Listing-Pläne als Runtime-Secrets/Config gebunden.
- `marketplace_purchase.purchased`, `changed` und `cancelled` werden serverseitig verarbeitet.
- Aktivierung und Planwechsel benötigen einen autoritativen GitHub-Marketplace-API-Readback.
- Delivery IDs werden idempotent in Supabase verarbeitet.
- Kündigungen deaktivieren Entitlements und Kundendaten werden vor Ablauf von 30 Tagen bereinigt.
- Stripe-/Website-Entitlements bleiben eine separate Authority und erzeugen keine Marketplace-Rechte.

Runtime authority: `server/cads-marketplace.mjs`  
Persistence: `supabase/migrations/20261006210500_cads_marketplace_paid_entitlements.sql`  
Plan contract: `apps/cads-github-app/marketplace-plans.production.json`


### Marketplace buyer identity

Marketplace billing and CAPITAL-AI application identity are bound explicitly:

```text
GitHub Marketplace purchase
  -> GitHub App installation
  -> CAPITAL-AI authenticated session
  -> signed 10-minute OAuth state
  -> GitHub user OAuth
  -> /user/installations verification
  -> Marketplace subscription readback
  -> Supabase user/account/installation link
  -> CADS effective tier
```

A setup URL `installation_id` is treated as untrusted input until GitHub OAuth verifies that the user is authorized for that installation. Stripe and Marketplace remain independent billing authorities; application access selects the highest valid CADS tier without converting one billing system into the other.
