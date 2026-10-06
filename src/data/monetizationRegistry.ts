import { cadsCommercialReadinessPct } from './cadsCommercialReadiness';

/**
 * Canonical monetizable product list.
 * Readiness is the share of a sellable, compliant launch already evidenced in repo.
 * Gap is the remaining distance to market. Scan baseline: main @ 824d429, 2026-10-06.
 *
 * Weights: definition 15, user surface 25, commercial path 25, data/compliance gate 20, production evidence 15.
 * A build or UI is not a production release. Provider rights and decisionEligible stay fail-closed.
 */
export type MonetizableProduct = {
  id: string;
  name: string;
  domain: 'MARKET' | 'GROWTH' | 'PRODUCT' | 'PLATFORM' | 'TRUST';
  state: string;
  readinessPct: number;
  gapPct: number;
  blocker: string;
};

export const MONETIZABLE_PRODUCTS = [
  { id: 'saas', name: '[CAPITAL-AI-MARKET]SAAS-MEMBERSHIP', domain: 'MARKET', state: 'ACTIVE', readinessPct: 57, gapPct: 43, blocker: 'Stripe-Price-IDs und Tarif-UI vorhanden, Checkout-Session und Entitlement-Gate fehlen.' },
  { id: 'data-api', name: '[CAPITAL-AI-MARKET]B2B-DATA-API', domain: 'MARKET', state: 'PLANNED', readinessPct: 20, gapPct: 80, blocker: 'Kein API-Key-, Metering- oder Vertragsprodukt.' },
  { id: 'sentiment-api', name: '[CAPITAL-AI-MARKET]SENTIMENT-API', domain: 'MARKET', state: 'PROMPT-2 / 50-COMPONENTS', readinessPct: 31, gapPct: 69, blocker: 'MarketSentiment-Oberfläche vorhanden, API-Produktisierung offen.' },
  { id: 'white-label', name: '[CAPITAL-AI-MARKET]WHITE-LABEL-WIDGETS', domain: 'MARKET', state: 'PLANNED', readinessPct: 10, gapPct: 90, blocker: 'Kein Embed-SDK, kein Tenant-Theme, kein Lizenzvertrag.' },
  { id: 'broker', name: '[CAPITAL-AI-MARKET]BROKER-AFFILIATE-ROUTING', domain: 'MARKET', state: 'PARTIAL', readinessPct: 39, gapPct: 61, blocker: 'Kraken-Referral-Banner vorhanden, Routing-Matrix und Disclosure-Gate unvollständig.' },
  { id: 'fee-share', name: '[CAPITAL-AI-MARKET]TRADING-FEE-REVENUE-SHARE', domain: 'MARKET', state: 'PLANNED', readinessPct: 8, gapPct: 92, blocker: 'Keine Broker-Order-Anbindung und keine Revenue-Share-Abrechnung.' },
  { id: 'pipeline-sim', name: '[CAPITAL-AI-MARKET]OSS-PIPELINE-SIMULATION-ENGINE', domain: 'MARKET', state: 'INTEGRATED', readinessPct: 44, gapPct: 56, blocker: 'Pipeline Builder integriert, nicht als bezahltes Paket mit SLA geschnitten.' },
  { id: 'cads-app', name: '[CAPITAL-AI-PRODUCT]CADS-BENCHMARK-GITHUB-APP', domain: 'PRODUCT', state: 'PRODUCTIZATION', readinessPct: cadsCommercialReadinessPct(), gapPct: 100 - cadsCommercialReadinessPct(), blocker: 'CADS Core, Observability und ein wiederverwendbarer GitHub-Marketplace-Lifecycle sind vorhanden; CADS-spezifische Listing-/Plan-IDs, Pricing-Authority und Marketplace-Entitlement-Bindung bleiben fail-closed.' },
  { id: 'ghcr-app', name: '[CAPITAL-AI-MARKET]GHCR-DIGEST-BLUEPRINT-MARKETPLACE-APP', domain: 'MARKET', state: 'PLANNED', readinessPct: 26, gapPct: 74, blocker: 'Digest-Pipeline dokumentiert, App und kommerzielle Evidence-Tiers fehlen.' },
  { id: 'cpt-stake', name: '[CAPITAL-AI-MARKET]CPT-STAKE-TO-ACCESS', domain: 'MARKET', state: 'PLANNED', readinessPct: 24, gapPct: 76, blocker: 'Tokenomics-Seite vorhanden, Stake-Gate und $CPT-Zahlung deaktiviert.' },
  { id: 'cpt-micro', name: '[CAPITAL-AI-MARKET]CPT-MICROPAYMENTS', domain: 'MARKET', state: 'PLANNED', readinessPct: 10, gapPct: 90, blocker: 'Kein Wallet-, Settlement- oder Usage-Meter.' },
  { id: 'cpt-pay', name: '[CAPITAL-AI-MARKET]CPT-SUBSCRIPTION-PAYMENTS', domain: 'MARKET', state: 'PLANNED', readinessPct: 19, gapPct: 81, blocker: 'Eigener Stripe-Price für $CPT erforderlich, Schalter ist fail-closed.' },
  { id: 'revenue', name: '[CAPITAL-AI-MARKET]REVENUE-SIMULATOR', domain: 'MARKET', state: 'INTEGRATED', readinessPct: 40, gapPct: 60, blocker: 'Interner Rechner integriert, nicht als Kundenprodukt paketiert.' },
  { id: 'sponsorship', name: '[CAPITAL-AI-MARKET]SPONSORSHIP', domain: 'GROWTH', state: 'PLANNED', readinessPct: 16, gapPct: 84, blocker: 'FUNDING-Ziel nicht verifiziert aktiv.' },
  { id: 'seo', name: '[CAPITAL-AI-MARKET]SEO-GROWTH-ENGINE', domain: 'GROWTH', state: 'PARTIAL', readinessPct: 28, gapPct: 72, blocker: 'Route-Analytics und Docs vorhanden, kein vermarktbares SEO-Produkt.' },
  { id: 'social', name: '[CAPITAL-AI-MARKET]SOCIAL-MEDIA-ENGINE', domain: 'GROWTH', state: 'PLANNED', readinessPct: 14, gapPct: 86, blocker: 'Kein Publishing-, Approval- oder Measurement-Workflow.' },
  { id: 'enterprise-scorer', name: '[CAPITAL-AI-MARKET]ENTERPRISE-SCORER', domain: 'MARKET', state: 'PARTIAL', readinessPct: 42, gapPct: 58, blocker: 'Dashboard vorhanden, Scoring nicht decisionEligible und nicht entitlement-gated.' },
  { id: 'whale-radar', name: '[CAPITAL-AI-MARKET]WHALE-RADAR', domain: 'MARKET', state: 'PARTIAL', readinessPct: 39, gapPct: 61, blocker: 'Modal und Section vorhanden, Live-Feed-Rechte und Paid-Gate offen.' },
  { id: 'vocabulary', name: '[CAPITAL-AI-PRODUCT]MARKET-VOCABULARY', domain: 'PRODUCT', state: 'MONETIZED', readinessPct: 100, gapPct: 0, blocker: 'Kein Restabstand: Live-SKU prod_VNTsrtlf2ZL8ja, Price price_1UMiuIPKr4joNbEclpn8AwFW, 19,00 EUR inkl., Checkout, Entitlement und Widerrufsverzicht.' },
  { id: 'price-alerts', name: '[CAPITAL-AI-PRODUCT]PRICE-ALERTS', domain: 'PRODUCT', state: 'PARTIAL', readinessPct: 36, gapPct: 64, blocker: 'Alert-UI vorhanden, Zustellung und Tariflimit nicht serverseitig erzwungen.' },
  { id: 'learning-portal', name: '[CAPITAL-AI-PRODUCT]LEARNING-PORTAL', domain: 'PRODUCT', state: 'PARTIAL', readinessPct: 32, gapPct: 68, blocker: 'Seite vorhanden, kein Curriculum-Commerce.' },
  { id: 'mobile-scorer', name: '[CAPITAL-AI-MARKET]MOBILE-SCORER-TERMINAL', domain: 'MARKET', state: 'PARTIAL', readinessPct: 31, gapPct: 69, blocker: 'Server-Scorer und Mobile-Repo vorhanden, Store-Release und Billing fehlen.' },
  { id: 'hero-buddy', name: '[CAPITAL-AI-PRODUCT]HERO-BUDDY-SUPPORT', domain: 'PRODUCT', state: 'INTEGRATED', readinessPct: 46, gapPct: 54, blocker: 'Portal-Widget mit FAQ und Disclaimer, ohne Live-Handoff und Production-Freigabe.' },
] as const satisfies readonly MonetizableProduct[];

// Orderbook and Market Depth stay owned by the 50-component MARKET registry / Prompt 2.
