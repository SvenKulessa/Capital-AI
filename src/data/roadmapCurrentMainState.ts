export type RoadmapReconciliationPatch = {
  status?: 'aktiv' | 'pending' | 'planning';
  progressPercent?: number | null;
  evidenceState?: 'VERIFIED' | 'OFFEN' | 'GEHALTEN' | 'UNGEKLÄRT';
  evidenceRefs?: string[];
  nextStep?: string;
};

export const ROADMAP_RECONCILIATION = Object.freeze({
  schema: 'CAPITAL_AI_ROADMAP_RECONCILIATION@1',
  baseMainSha: '0bf052cbc8f7774db29cc77493f6f24bb28bd93b',
  reviewedAt: '2026-10-06',
  packageCount: 104,
  packageSources: [
  {
    "id": "AP-AGT-01",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-AGT-02",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-AGT-03",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-CMP-01",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-CMP-02",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-CMP-03",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-CMP-ANALYTICS",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-CMP-LEGAL",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-CMP-OLD-DATA",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-CMP-PRIVACY",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-CMP-PROVIDERS",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-CMP-RIGHTS",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-DOC-01",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-DOC-02",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-DOC-03",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-FE-01",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-FE-02",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-FE-03",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-FE-04",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-FE-BRAND",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-FE-NAV",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-FIN-01",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-FIN-02",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-FIN-03",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-FIN-BOUNDARY",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-FIN-TRANSPORT",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-GOV-01",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-GOV-02",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-GOV-03",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-OPS-01",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-OPS-02",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-OPS-03",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-OPS-CURRENT",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-OPS-DOMAIN",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-OPS-FINANCE-OFF",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-OPS-NATS-LIVE",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-QA-01",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-QA-02",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-QA-03",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-SEC-01",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-SEC-02",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-SEC-03",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-SEC-04",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-SEC-AUTH-LIVE",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-SEC-IMAGE",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-SEC-OIDC",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-SOC-01",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-SOC-02",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-SOC-03",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-GROWTH-CAPITAL-SPONSORS",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-GROWTH-CONSENT-OUTREACH",
    "source": "src/data/trustArchitectureAWorkPackages.ts"
  },
  {
    "id": "CA-GROWTH-CONTENT-ENGINE",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-GROWTH-CONTENT-SOCIAL-PACKAGE",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-GROWTH-CREATOR-REVENUE",
    "source": "src/data/trustArchitectureAWorkPackages.ts"
  },
  {
    "id": "CA-GROWTH-DOMAIN-BRANDING",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-GROWTH-FIN-SOC-MARKET-MIGRATION",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-GROWTH-FINANCE-SPONSORS-OFF",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-GROWTH-SEO-ARCHITECTURE",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-GROWTH-SOC-COPY",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-GROWTH-SOC-MIGRATION",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-GROWTH-SOC-PILOT",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-GROWTH-SOC-TTS",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-GROWTH-SOC-UGC",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-MARKET-FINANCE-SCORING-DATA-FOLLOWUP",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-MARKET-GHCR-BLUEPRINT-APP",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PLATFORM-APP-READ-CONSUME",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PLATFORM-COMPONENT-DEPLOY",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PLATFORM-COMPONENT-INVENTORY",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PLATFORM-DR-RECOVERY",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PLATFORM-EDGE-CACHE",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PLATFORM-ENTERPRISE-PUBLIC",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PLATFORM-GITHUB-COSTS",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PLATFORM-IONOS-SMTP",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PLATFORM-MARKET-INFRA-BENCH",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PLATFORM-OBSERVABILITY-BASELINE",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PLATFORM-OTEL-COLLECTOR",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PLATFORM-SELF-HEAL",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PLATFORM-SOC-DISTRIBUTION",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-PLATFORM-SOC-FOUNDATION",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-PLATFORM-SOC-GENVIDEO",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-PLATFORM-SOC-MEDIA",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-PLATFORM-TS-APP-BOUNDARY",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PLATFORM-VERSIONING",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PRODUCT-BENCHMARK-MARKETPLACE",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PRODUCT-BLUEPRINT-COMMERCE-EVIDENCE",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PRODUCT-CADS-GITHUB-MARKETPLACE",
    "source": "src/data/trustArchitectureAWorkPackages.ts"
  },
  {
    "id": "CA-PRODUCT-SOC-STUDIO",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-PRODUCT-VOCABULARY-NFT-MINTING",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-TRUST-APP-READ-DESIGN",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-TRUST-DAILY-SUPPLY-CHAIN",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-TRUST-GITGUARDIAN",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-TRUST-GITHUB-FREE",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-TRUST-LICENSE-TOOLS",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-TRUST-LINEAR-HISTORY",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-TRUST-PUBLIC-AUTHORITY-GATE",
    "source": "src/data/trustArchitectureAWorkPackages.ts"
  },
  {
    "id": "CA-TRUST-SIGNED-COMMITS",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-TRUST-SOC-RIGHTS",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-TRUST-SUPABASE-AUTH",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-TRUST-WORK-VERIFICATION",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-TRUST-ZERO-COST-THRESHOLDS",
    "source": "src/data/trustArchitectureAWorkPackages.ts"
  },
  {
    "id": "PRODUCTION-WEB-01-GROWTH",
    "source": "src/data/productionWebsiteWorkPackage.ts"
  },
  {
    "id": "PRODUCTION-WEB-01-MARKET",
    "source": "src/data/productionWebsiteWorkPackage.ts"
  },
  {
    "id": "PRODUCTION-WEB-01-PLATFORM",
    "source": "src/data/productionWebsiteWorkPackage.ts"
  },
  {
    "id": "PRODUCTION-WEB-01-PRODUCT",
    "source": "src/data/productionWebsiteWorkPackage.ts"
  },
  {
    "id": "PRODUCTION-WEB-01-TRUST",
    "source": "src/data/productionWebsiteWorkPackage.ts"
  }
],
});

export const ROADMAP_CURRENT_STATE_OVERRIDES: Readonly<Record<string, RoadmapReconciliationPatch>> =
  Object.freeze({
  "AP-OPS-01": {
    "status": "aktiv",
    "evidenceState": "OFFEN",
    "progressPercent": null,
    "evidenceRefs": [
      "Dockerfile",
      ".github/workflows/build-security.yml",
      "scripts/verify-release-readiness.mjs"
    ],
    "nextStep": "Image-backed Runtime, Release-Evidence und bounded Self-Healing gegen einen attestierten Kandidaten end-to-end abnehmen; ein grüner Build allein bleibt keine Production-Freigabe."
  },
  "AP-OPS-02": {
    "status": "aktiv",
    "evidenceState": "OFFEN",
    "progressPercent": null,
    "evidenceRefs": [
      "server/observability.mjs",
      "server/cads-observability.mjs",
      "server/index.mjs"
    ],
    "nextStep": "CADS-/HTTP-Telemetrie um persistente, providerübergreifende Fleet-Evidence ergänzen und p95-/Fehler-Schwellen mit realer Runtime-Evidence kalibrieren."
  },
  "AP-FE-01": {
    "status": "aktiv",
    "evidenceState": "VERIFIED",
    "progressPercent": 100,
    "evidenceRefs": [
      "src/app/routing/AppRoutes.tsx",
      "src/app/AppShell.tsx",
      "scripts/navigation.test.mjs"
    ],
    "nextStep": "Die implementierte Hub-Navigation im nächsten produktiven Runtime-Readback auf Desktop und Mobile erneut abnehmen."
  },
  "AP-FE-02": {
    "status": "aktiv",
    "evidenceState": "VERIFIED",
    "progressPercent": 100,
    "evidenceRefs": [
      "src/components/LearningPortalPage.tsx",
      "src/data/vocabularyData.ts",
      "src/data/vocabularyPresentation.ts"
    ],
    "nextStep": "Learning-Portal-Inhalte und Paid-Vocabulary-Entitlements weiter ausbauen; die bestehende Portal-/Glossar-Oberfläche bleibt als implementierter Basisslice erhalten."
  },
  "AP-FE-03": {
    "status": "aktiv",
    "evidenceState": "VERIFIED",
    "progressPercent": 100,
    "evidenceRefs": [
      "src/components/ControlCenterPage.tsx",
      "src/components/RoadmapPanel.tsx",
      "src/data/roadmapData.ts"
    ],
    "nextStep": "Control-Center-Projektionen weiter an Runtime-/Evidence-Readbacks binden; Roadmap-Status bleibt durch den vollständigen Reconciliation-Snapshot regressionsgeprüft."
  },
  "AP-SEC-02": {
    "status": "aktiv",
    "evidenceState": "OFFEN",
    "progressPercent": null,
    "evidenceRefs": [
      "server/auth.mjs",
      "server/auth-security.mjs",
      "src/components/ControlCenterPage.tsx"
    ],
    "nextStep": "Implementierte Session-, AAL2- und Owner-IAM-Grenzen auf dem Zielhost mit echten Login-/Role-Readbacks abnehmen; keine Rolle aus Client-Metadaten ableiten."
  },
  "AP-FIN-01": {
    "status": "aktiv",
    "evidenceState": "OFFEN",
    "progressPercent": null,
    "evidenceRefs": [
      "src/contracts/analysisComponentRegistry.ts",
      "server/scorer-proxy.mjs",
      "docs/architecture/ANALYSIS-FOUNDATION.md"
    ],
    "nextStep": "50-Komponenten-Registry schrittweise mit realen point-in-time Features, Datenrechten, DQ- und Scoring-Evidence aktivieren; produktive Rankings bleiben bis dahin fail-closed."
  },
  "AP-FIN-03": {
    "status": "aktiv",
    "evidenceState": "OFFEN",
    "progressPercent": null,
    "evidenceRefs": [
      "server/kraken-order-dry-run.mjs",
      "server/uniswap-trading.mjs",
      "docs/architecture/KRAKEN-CREDENTIAL-FAMILY-DECISION-20261006.md"
    ],
    "nextStep": "Dry-Run/Quote-Risk um persistente Idempotency, append-only Audit, frische Preis-Evidence und separates Futures/Perps-Risk-Gate erweitern; Live-Execution bleibt blockiert."
  },
  "AP-AGT-02": {
    "status": "aktiv",
    "evidenceState": "OFFEN",
    "progressPercent": null,
    "evidenceRefs": [
      "src/data/externalComponentInventory.ts",
      "src/data/monetizationRegistry.ts",
      "src/contracts/zeroCostApiThresholds.ts"
    ],
    "nextStep": "Tool-/Komponenten-Inventar mit tatsächlichen Usage-/Kosten-Ledgern verbinden und AP-006-Circuit-Breaker für externe Kosten messbar schließen."
  },
  "AP-QA-01": {
    "status": "aktiv",
    "evidenceState": "VERIFIED",
    "progressPercent": 100,
    "evidenceRefs": [
      "scripts/validate-contract-suites.mjs",
      ".github/workflows/build-security.yml"
    ],
    "nextStep": "Provider-/Contract-Suites bei jeder neuen Execution-/Data-Authority erweitern; die autoritativen Regressionen laufen im Docker Security Gate und den übrigen Required Checks auf GitHub."
  },
  "AP-SOC-01": {
    "status": "aktiv",
    "evidenceState": "OFFEN",
    "progressPercent": null,
    "evidenceRefs": [
      "server/telegram.mjs",
      "src/components/WhaleRadarModal.tsx"
    ],
    "nextStep": "Telegram-Transport und Whale-Radar-Signalquelle nur nach Datenrechten, Nutzer-Opt-in, Rate-Limits und echter Zustell-Evidence zusammenführen."
  },
  "CA-PLATFORM-MARKET-INFRA-BENCH": {
    "status": "aktiv",
    "evidenceState": "OFFEN",
    "progressPercent": null,
    "evidenceRefs": [
      "packages/benchmark-core/index.mjs",
      "server/benchmark-runs.mjs",
      "server/benchmark-store.mjs",
      "CAPITAL-AI-PRODUCT/BENCHMARK-ENGINE-PRODUCT.md"
    ],
    "nextStep": "CAPITAL_AI_EVENT_BACKBONE@1 als reale NATS/Kafka × Node/Rust 4er-Matrix ausführen und jeden Run an Image-/SBOM-Digests sowie Git-SHA binden."
  },
  "CA-PRODUCT-BENCHMARK-MARKETPLACE": {
    "status": "aktiv",
    "evidenceState": "OFFEN",
    "progressPercent": null,
    "evidenceRefs": [
      "packages/benchmark-core/index.mjs",
      "server/benchmark-runs.mjs",
      "server/benchmark-store.mjs",
      "server/cads-commerce.mjs",
      "CAPITAL-AI-PRODUCT/BENCHMARK-ENGINE-PRODUCT.md"
    ],
    "nextStep": "CADS-Web-SaaS-Entitlements gegen reale Starter/Pro/Enterprise-Subscriptions abnehmen und danach GitHub-Marketplace-Plan-/marketplace_purchase-Lifecycle separat implementieren."
  },
  "CA-PRODUCT-CADS-GITHUB-MARKETPLACE": {
    "status": "aktiv",
    "evidenceState": "OFFEN",
    "progressPercent": null,
    "evidenceRefs": [
      "server/cads-commerce.mjs",
      "server/cads-marketplace.mjs",
      "server/cads-marketplace.test.mjs",
      "supabase/migrations/20261006210500_cads_marketplace_paid_entitlements.sql",
      "apps/cads-github-app/marketplace-plans.production.json",
      "apps/cads-github-app/github-app-registration.production.example.json",
      "src/data/cadsCommercialReadiness.ts",
      "src/data/cadsMarketplaceCapabilities.ts"
    ],
    "nextStep": "Paid Billing/Entitlement Runtime ist implementiert. Der initiale Standalone-Handoff nach capital-ai-online/CADS ist gemergt. Nächstes Ziel: den accepted PR-#220-Delta source-bound ins Org-Repo synchronisieren und danach Organization-App, Verified Publisher, Financial Onboarding, aktuelle GitHub-Paid-Listing-Voraussetzungen, reale USD-Preise/Plan-IDs sowie Install/OAuth/Purchase/Changed/Cancelled/Delete-Smokes schließen."
  },
  "CA-PLATFORM-COMPONENT-INVENTORY": {
    "status": "aktiv",
    "evidenceState": "VERIFIED",
    "progressPercent": 100,
    "evidenceRefs": [
      "src/data/externalComponentInventory.ts",
      "src/components/ComponentInventoryDashboard.tsx",
      "docs/governance/COMPONENT-LIFECYCLE-VERSIONING.md"
    ],
    "nextStep": "Verifizierte Registry-/Dashboard-Baseline gegen neue Runtime-/Provider-Readbacks aktuell halten; einzelne CADS Scores bleiben nur nach reproduzierbaren Benchmarks VERIFIED."
  },
  "CA-PLATFORM-OBSERVABILITY-BASELINE": {
    "status": "aktiv",
    "evidenceState": "VERIFIED",
    "progressPercent": 100,
    "evidenceRefs": [
      "server/observability.mjs",
      "server/cads-observability.mjs",
      "server/observability.test.mjs",
      "server/cads-observability.test.mjs"
    ],
    "nextStep": "Runtime-Retention und optionalen externen OTLP-Export getrennt evaluieren; bestehende Redaction-/Metrics-/Audit-Baseline beibehalten."
  },
  "PRODUCTION-WEB-01-PRODUCT": {
    "status": "aktiv",
    "evidenceState": "OFFEN",
    "progressPercent": null,
    "evidenceRefs": [
      "src/features/pricing/MonetizationModal.tsx",
      "server/subscription-checkout.mjs",
      "server/cads-commerce.mjs"
    ],
    "nextStep": "Aktuelle Pricing-, CADS-, Account- und Responsive-Slices auf dem nächsten deploybaren Kandidaten als gemeinsame PRODUCT-Runtime-Evidence abnehmen."
  },
  "PRODUCTION-WEB-01-GROWTH": {
    "status": "aktiv",
    "evidenceState": "OFFEN",
    "progressPercent": null,
    "evidenceRefs": [
      "shared/seo-content-manifest.mjs",
      "shared/seo-metadata.mjs",
      "scripts/seo-content-manifest.test.mjs"
    ],
    "nextStep": "Kanonische Inhalte, strukturierte Metadaten und Social-/Search-Handoffs weiter gegen veröffentlichte Production-Oberflächen korrelieren."
  },
  "PRODUCTION-WEB-01-TRUST": {
    "status": "aktiv",
    "evidenceState": "OFFEN",
    "progressPercent": null,
    "evidenceRefs": [
      "server/auth-security.mjs",
      "server/public-artifact-policy.mjs",
      ".github/workflows/build-security.yml"
    ],
    "nextStep": "Security-, Public-Artifact-, Auth- und Supply-Chain-Gates auf dem nächsten exakten Release-Kandidaten terminal korrelieren; keine Freigabe aus Einzeltests ableiten."
  },
  "PRODUCTION-WEB-01-PLATFORM": {
    "status": "aktiv",
    "evidenceState": "OFFEN",
    "progressPercent": null,
    "evidenceRefs": [
      "server/index.mjs",
      "public/bootstrap-failure.js",
      "vite.config.ts"
    ],
    "nextStep": "Ladezustände, Bundle-Budget, Routing und Runtime-Identität auf dem deploybaren Kandidaten gemeinsam messen und Production-Handoff separat schließen."
  },
  "CA-GROWTH-FIN-SOC-MARKET-MIGRATION": {
    "status": "aktiv",
    "evidenceState": "OFFEN",
    "progressPercent": null,
    "evidenceRefs": [
      "CAPITAL-AI-GROWTH/FINANCE-SOCIAL-MARKET-MIGRATION-WORKPACKAGE-20261005.yaml",
      "CAPITAL-AI-GROWTH/social-engine-completion-gate.json"
    ],
    "nextStep": "Social-Migration anhand des Completion-Gates fortsetzen und MARKET-Scoring-/Daten-Folgepaket erst nach sauberer Rechte-/Runtime-Trennung übernehmen."
  },
  "CA-GROWTH-SOC-MIGRATION": {
    "status": "aktiv",
    "evidenceState": "OFFEN",
    "progressPercent": null,
    "evidenceRefs": [
      "CAPITAL-AI-GROWTH/social-engine-completion-gate.json",
      "scripts/social-engine-completion-gate.test.mjs"
    ],
    "nextStep": "Noch offene Social-Engine-Gates code- und evidence-basiert schließen; kein Kanal-Publishing allein aus vorhandenen Adaptern ableiten."
  },
  "CA-TRUST-SOC-RIGHTS": {
    "status": "aktiv",
    "evidenceState": "OFFEN",
    "progressPercent": null,
    "evidenceRefs": [
      "CAPITAL-AI-GROWTH/social-tool-license-evidence-20261006.json",
      "scripts/social-tool-license-evidence.test.mjs"
    ],
    "nextStep": "Tool-/Modell-/Persona-/Musik-/Distributionsrechte pro tatsächlich ausgeliefertem Asset und Providerpfad abschließen."
  },
  "CA-PLATFORM-SOC-FOUNDATION": {
    "status": "aktiv",
    "evidenceState": "OFFEN",
    "progressPercent": null,
    "evidenceRefs": [
      "CAPITAL-AI-GROWTH/social-engine-completion-gate.json",
      "public/branding/social"
    ],
    "nextStep": "Persistente Content-Jobs, Freigabe-Bindung und Provider-Readbacks vervollständigen; Secrets und Kanal-Credentials bleiben außerhalb öffentlicher Artefakte."
  },
  "PRODUCTION-WEB-01-MARKET": {
    "status": "aktiv",
    "evidenceState": "OFFEN",
    "progressPercent": null,
    "evidenceRefs": [
      "server/private-provider-query.mjs",
      "contracts/private-provider-query-operations.json",
      "server/user-provider-vault.mjs",
      "services/provider-bridge-rs/src/main.rs",
      "supabase/migrations/20261006131500_enable_binance_user_provider_vault.sql"
    ],
    "nextStep": "MARKET-05 Instrumentmanifest fortführen; parallel den in Main integrierten Kraken/Binance Read-only Private-Provider-Pfad über NATS/Rust-Bridge mit echter Runtime-Evidence abnehmen. Mutierende Orders, Shared/Public-Rechte und Score-Promotion bleiben separate Gates."
  }
});

export function reconcileRoadmapPackages<T extends {
  id: string;
  evidenceRefs: string[];
}>(packages: readonly T[]): T[] {
  return packages.map((item) => {
    const patch = ROADMAP_CURRENT_STATE_OVERRIDES[item.id];
    if (!patch) return { ...item };
    const evidenceRefs = patch.evidenceRefs
      ? [...new Set([...(item.evidenceRefs || []), ...patch.evidenceRefs])]
      : [...(item.evidenceRefs || [])];
    return { ...item, ...patch, evidenceRefs } as T;
  });
}
