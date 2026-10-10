/**
 * Canonical monetizable product list.
 * Readiness is the share of a sellable, compliant launch already evidenced in repo.
 * Gap is the remaining distance to market. Current-state correlation baseline:
 * cef1d11f607778f5226ca1df97376ba408652c69, 2026-10-06.
 *
 * The historical weighted scan used: definition 15, user surface 25, commercial path 25,
 * data/compliance gate 20, production evidence 15. When material implementation changes
 * invalidate that scan, readinessPct/gapPct are null until the weighted assessment is rerun.
 * A build or UI is not a production release. Provider rights and decisionEligible stay fail-closed.
 */
export type MonetizableProduct = {
  id: string;
  name: string;
  domain: 'MARKET' | 'GROWTH' | 'PRODUCT' | 'PLATFORM' | 'TRUST';
  state: string;
  readinessPct: number | null;
  gapPct: number | null;
  blocker: string;
};

export const MONETIZABLE_PRODUCTS = [
  { id: 'saas', name: '[CAPITAL-AI-MARKET]SAAS-MEMBERSHIP', domain: 'MARKET', state: 'ACTIVE_COMMERCE_SLICE', readinessPct: null, gapPct: null, blocker: 'Server-authorized Stripe Checkout und Subscription-Tier-Entitlements sind implementiert; drei echte Testmode-Käufe, Upgrade/Downgrade/Cancel/Reactivation und produktive Runtime-Evidence bleiben offen.' },
  { id: 'data-api', name: '[CAPITAL-AI-MARKET]B2B-DATA-API', domain: 'MARKET', state: 'PLANNED', readinessPct: 20, gapPct: 80, blocker: 'Kein API-Key-, Metering- oder Vertragsprodukt.' },
  { id: 'sentiment-api', name: '[CAPITAL-AI-MARKET]SENTIMENT-API', domain: 'MARKET', state: 'PROMPT-2 / 50-COMPONENTS', readinessPct: 31, gapPct: 69, blocker: 'MarketSentiment-Oberfläche vorhanden, API-Produktisierung offen.' },
  { id: 'white-label', name: '[CAPITAL-AI-MARKET]WHITE-LABEL-WIDGETS', domain: 'MARKET', state: 'PLANNED', readinessPct: 10, gapPct: 90, blocker: 'Kein Embed-SDK, kein Tenant-Theme, kein Lizenzvertrag.' },
  { id: 'broker', name: '[CAPITAL-AI-MARKET]BROKER-AFFILIATE-ROUTING', domain: 'MARKET', state: 'PARTIAL', readinessPct: 39, gapPct: 61, blocker: 'Kraken-Referral-Banner vorhanden, Routing-Matrix und Disclosure-Gate unvollständig.' },
  { id: 'fee-share', name: '[CAPITAL-AI-MARKET]TRADING-FEE-REVENUE-SHARE', domain: 'MARKET', state: 'DRY_RUN_ONLY', readinessPct: null, gapPct: null, blocker: 'Kraken Spot validate-only Order-Dry-Run ist implementiert; Live-Submit, persistente Idempotency/Audit und Revenue-Share-Abrechnung bleiben blockiert.' },
  { id: 'pipeline-sim', name: '[CAPITAL-AI-MARKET]OSS-PIPELINE-SIMULATION-ENGINE', domain: 'MARKET', state: 'INTEGRATED', readinessPct: 44, gapPct: 56, blocker: 'Pipeline Builder integriert, nicht als bezahltes Paket mit SLA geschnitten.' },
  { id: 'cads-app', name: '[CAPITAL-AI-PRODUCT]CADS-BENCHMARK-ENGINE', domain: 'PRODUCT', state: 'GITHUB_MARKETPLACE_BILLING_RUNTIME_IMPLEMENTED', readinessPct: null, gapPct: null, blocker: 'Paid Marketplace Billing/Entitlement Runtime für Starter/Pro/Enterprise ist implementiert: HMAC, GitHub-Readback, verifizierter GitHub-Installation→Supabase-User-Link, idempotente Supabase-Entitlements und Cancellation-Cleanup. Produktive Veröffentlichung bleibt blockiert, bis CAPITAL_AI_EVENT_BACKBONE@1 real execution-bound ist und GitHub-Organisation/Verified Publisher, >=100 Installationen, Financial Onboarding, monatliche+jährliche USD-Preise, echte Plan-IDs und Listing-Approval vorliegen.' },
  { id: 'ghcr-app', name: '[CAPITAL-AI-MARKET]GHCR-DIGEST-BLUEPRINT-MARKETPLACE-APP', domain: 'MARKET', state: 'PLANNED', readinessPct: 26, gapPct: 74, blocker: 'Digest-Pipeline dokumentiert, App und kommerzielle Evidence-Tiers fehlen.' },
  { id: 'cpt-stake', name: '[CAPITAL-AI-MARKET]CPT-STAKE-TO-ACCESS', domain: 'MARKET', state: 'PLANNED', readinessPct: 24, gapPct: 76, blocker: 'Tokenomics-Seite vorhanden, Stake-Gate und $CPT-Zahlung deaktiviert.' },
  { id: 'cpt-micro', name: '[CAPITAL-AI-MARKET]CPT-MICROPAYMENTS', domain: 'MARKET', state: 'PLANNED', readinessPct: 10, gapPct: 90, blocker: 'Kein Wallet-, Settlement- oder Usage-Meter.' },
  { id: 'cpt-pay', name: '[CAPITAL-AI-MARKET]CPT-SUBSCRIPTION-PAYMENTS', domain: 'MARKET', state: 'PLANNED', readinessPct: 19, gapPct: 81, blocker: 'Eigener Stripe-Price für $CPT erforderlich, Schalter ist fail-closed.' },
  { id: 'revenue', name: '[CAPITAL-AI-MARKET]REVENUE-SIMULATOR', domain: 'MARKET', state: 'INTEGRATED', readinessPct: 40, gapPct: 60, blocker: 'Interner Rechner integriert, nicht als Kundenprodukt paketiert.' },
  { id: 'sponsorship', name: '[CAPITAL-AI-MARKET]SPONSORSHIP', domain: 'GROWTH', state: 'PLANNED', readinessPct: 16, gapPct: 84, blocker: 'FUNDING-Ziel nicht verifiziert aktiv.' },
  { id: 'seo', name: '[CAPITAL-AI-MARKET]SEO-GROWTH-ENGINE', domain: 'GROWTH', state: 'PARTIAL', readinessPct: 28, gapPct: 72, blocker: 'Route-Analytics und Docs vorhanden, kein vermarktbares SEO-Produkt.' },
  { id: 'social', name: '[CAPITAL-AI-MARKET]SOCIAL-MEDIA-ENGINE', domain: 'GROWTH', state: 'PUBLISHING_CODE_PRESENT', readinessPct: null, gapPct: null, blocker: 'Publishing-/Distribution-Cutover aus PR #305 und Approval-/Readback-Code vorhanden; reale Kanalzustellung, Nutzungsrechte und Kundenprodukt-Paketierung bleiben offen.' },
  { id: 'enterprise-scorer', name: '[CAPITAL-AI-MARKET]ENTERPRISE-SCORER', domain: 'MARKET', state: 'PARTIAL', readinessPct: 42, gapPct: 58, blocker: 'Dashboard vorhanden, Scoring nicht decisionEligible und nicht entitlement-gated.' },
  { id: 'whale-radar', name: '[CAPITAL-AI-MARKET]WHALE-RADAR', domain: 'MARKET', state: 'PARTIAL', readinessPct: 39, gapPct: 61, blocker: 'Modal und Section vorhanden, Live-Feed-Rechte und Paid-Gate offen.' },
  { id: 'vocabulary', name: '[CAPITAL-AI-PRODUCT]LEARNING-PORTAL-VOCABULARY', domain: 'PRODUCT', state: 'INTEGRATED', readinessPct: null, gapPct: null, blocker: 'Learning Portal: 25,00 EUR einmalig im Live-Checkout am 10.10.2026 verifiziert. Historischer 19-EUR-Katalog bleibt für bestehende Belege erhalten; Stripe-Katalogumstellung und echter Käufer-Roundtrip sind noch offen.' },
  { id: 'price-alerts', name: '[CAPITAL-AI-PRODUCT]PRICE-ALERTS', domain: 'PRODUCT', state: 'PARTIAL', readinessPct: 36, gapPct: 64, blocker: 'Alert-UI vorhanden, Zustellung und Tariflimit nicht serverseitig erzwungen.' },
  { id: 'learning-portal', name: '[CAPITAL-AI-PRODUCT]LEARNING-PORTAL', domain: 'PRODUCT', state: 'PARTIAL', readinessPct: 32, gapPct: 68, blocker: 'Seite vorhanden, kein Curriculum-Commerce.' },
  { id: 'mobile-scorer', name: '[CAPITAL-AI-MARKET]MOBILE-SCORER-TERMINAL', domain: 'MARKET', state: 'PARTIAL', readinessPct: 31, gapPct: 69, blocker: 'Server-Scorer und Mobile-Repo vorhanden, Store-Release und Billing fehlen.' },
  { id: 'hero-buddy', name: '[CAPITAL-AI-PRODUCT]HERO-BUDDY-SUPPORT', domain: 'PRODUCT', state: 'INTEGRATED', readinessPct: 46, gapPct: 54, blocker: 'Portal-Widget mit FAQ und Disclaimer, ohne Live-Handoff und Production-Freigabe.' },
] as const satisfies readonly MonetizableProduct[];

// Orderbook and Market Depth stay owned by the 50-component MARKET registry / Prompt 2.
