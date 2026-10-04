# Monetizable Product Registry

Naming convention: `[CAPITAL-AI-MARKET]PRODUKTNAME` or `[CAPITAL-AI-PRODUCT]PRODUKTNAME`.

Scan: 2026-10-04, baseline `main` @ `d31b223`. Readiness is the evidenced share of a sellable, compliant launch. Gap is the remaining distance to market.

Weights: definition 15, user surface 25, commercial path 25, data/compliance gate 20, production evidence 15.

A successful build, test or UI is not a production release. Provider rights and `decisionEligible` stay fail-closed.

| Product | State | Readiness | Gap | Blocker |
|---|---|---:|---:|---|
| [CAPITAL-AI-MARKET]SAAS-MEMBERSHIP | ACTIVE | 57% | 43% | Stripe-Price-IDs und Tarif-UI vorhanden, Checkout-Session und Entitlement-Gate fehlen. |
| [CAPITAL-AI-MARKET]B2B-DATA-API | PLANNED | 20% | 80% | Kein API-Key-, Metering- oder Vertragsprodukt. |
| [CAPITAL-AI-MARKET]SENTIMENT-API | PROMPT-2 / 50-COMPONENTS | 31% | 69% | MarketSentiment-Oberfläche vorhanden, API-Produktisierung offen. |
| [CAPITAL-AI-MARKET]WHITE-LABEL-WIDGETS | PLANNED | 10% | 90% | Kein Embed-SDK, kein Tenant-Theme, kein Lizenzvertrag. |
| [CAPITAL-AI-MARKET]BROKER-AFFILIATE-ROUTING | PARTIAL | 39% | 61% | Kraken-Referral-Banner vorhanden, Routing-Matrix und Disclosure-Gate unvollständig. |
| [CAPITAL-AI-MARKET]TRADING-FEE-REVENUE-SHARE | PLANNED | 8% | 92% | Keine Broker-Order-Anbindung und keine Revenue-Share-Abrechnung. |
| [CAPITAL-AI-MARKET]OSS-PIPELINE-SIMULATION-ENGINE | INTEGRATED | 44% | 56% | Pipeline Builder integriert, nicht als bezahltes Paket mit SLA geschnitten. |
| [CAPITAL-AI-MARKET]CADS-BENCHMARK-MARKET-APP | PARTIAL | 25% | 75% | Observability-Code vorhanden, keine Marketplace-App und kein Billing. |
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
| [CAPITAL-AI-PRODUCT]MARKET-VOCABULARY | PARTIAL | 38% | 62% | Lernmodul vorhanden, kein eigener Tarif oder Abschlussnachweis. |
| [CAPITAL-AI-PRODUCT]PRICE-ALERTS | PARTIAL | 36% | 64% | Alert-UI vorhanden, Zustellung und Tariflimit nicht serverseitig erzwungen. |
| [CAPITAL-AI-PRODUCT]LEARNING-PORTAL | PARTIAL | 32% | 68% | Seite vorhanden, kein Curriculum-Commerce. |
| [CAPITAL-AI-MARKET]MOBILE-SCORER-TERMINAL | PARTIAL | 31% | 69% | Server-Scorer und Mobile-Repo vorhanden, Store-Release und Billing fehlen. |
| [CAPITAL-AI-PRODUCT]HERO-BUDDY-SUPPORT | INTEGRATED | 46% | 54% | Portal-Widget mit FAQ und Disclaimer, ohne Live-Handoff und Production-Freigabe. |

Orderbook and Market Depth stay owned by the 50-component MARKET program / Prompt 2 and are not duplicated here.

## GHCR Marketplace product pipeline

Repository → Build → SBOM → Security Scan → Attestation → Immutable GHCR Digest → Render Blueprint → Runtime Readback → Source SHA correlation → Release Evidence.

The app must never rebuild between verified candidate and promotion. Commercial tiers may package evidence retention, policy profiles and API/reporting, but the underlying digest identity remains immutable.
