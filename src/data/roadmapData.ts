/**
 * CAPITAL AI — RELEASE-ORIENTIERTE ROADMAP
 *
 * Primäre Domains: PRODUCT, MARKET, PLATFORM, TRUST, GROWTH.
 * Domain = fachliche Orientierung, keine künstliche Teamgrenze.
 * Release-Ziele verwenden SemVer; Betriebsfreigaben bleiben evidenzgebunden.
 */

import { SOCIAL_CONTENT_WORK_PACKAGES } from './socialContentRoadmap';

export type ProjectOwner =
  | 'PRODUCT'
  | 'MARKET'
  | 'PLATFORM'
  | 'TRUST'
  | 'GROWTH';

export type WorkPackageStatus = 'aktiv' | 'pending' | 'planning';
export type RoadmapEvidenceState = 'VERIFIED' | 'OFFEN' | 'GEHALTEN' | 'UNGEKLÄRT';

export interface StagePhaseInfo {
  phase: number;
  id: string;
  name: string;
  shortTitle: string;
  description: string;
  targetRelease: string;
  completionPercent: number | null;
  status: 'completed' | 'in_progress' | 'upcoming';
}

export interface WorkPackage {
  id: string;
  title: string;
  owner: ProjectOwner;
  status: WorkPackageStatus;
  phase: number;
  phaseName: string;
  progressPercent: number | null;
  evidenceState: RoadmapEvidenceState;
  evidenceRefs: string[];
  nextStep: string;
  priority: 'Kritisch' | 'Hoch' | 'Mittel';
  leadName: string;
  targetSprint: string;
  description: string;
  deliverables: string[];
  bafinStandard?: string;
  costImpactEur?: number;
  dependencies?: string[];
}

export const ROADMAP_STAGES: StagePhaseInfo[] = [
  {
    phase: 1,
    id: 'phase-1',
    name: 'Phase 1: Versioned Platform Foundation',
    shortTitle: '1. Platform Foundation',
    description: 'Repo-weite SemVer-Baseline, fünf Domains, image-backed Render Runtime, ZITADEL-Basis sowie NATS/Valkey-Transport mit nachweisbaren Identitäten.',
    targetRelease: 'v0.8.0-alpha.1',
    completionPercent: null,
    status: 'in_progress',
  },
  {
    phase: 2,
    id: 'phase-2',
    name: 'Phase 2: Verified Market Intelligence Beta',
    shortTitle: '2. Market Intelligence',
    description: 'Echte Providerdaten, kanonische Market-Data-Verträge, Scoring-Eligibility, Screener und Evidence ohne Demo-Fallbacks in produktiven Pfaden.',
    targetRelease: 'v0.9.0-beta.1',
    completionPercent: null,
    status: 'in_progress',
  },
  {
    phase: 3,
    id: 'phase-3',
    name: 'Phase 3: Product, Account & Agent Integration',
    shortTitle: '3. Product Integration',
    description: 'Profil, Abonnement-Badge, Passkey/MFA, Agent-Client, mobile UX und konsistente Navigation auf verifizierter Auth- und Datenbasis.',
    targetRelease: 'v0.9.5-rc.1',
    completionPercent: null,
    status: 'in_progress',
  },
  {
    phase: 4,
    id: 'phase-4',
    name: 'Phase 4: DevSecOps, Supply Chain & Release Candidate',
    shortTitle: '4. DevSecOps & RC',
    description: 'Tägliche Versions-/CVE-Prüfung, SBOM/Attestations, Release Controller, Component-Diff, bounded Self-Healing, Lizenz- und Runtime-Handoff.',
    targetRelease: 'v0.9.9-rc.1',
    completionPercent: null,
    status: 'in_progress',
  },
  {
    phase: 5,
    id: 'phase-5',
    name: 'Phase 5: Production Go-Live',
    shortTitle: '5. Production',
    description: 'Domain-/DNS-Cutover, verifizierter Login, Backup/Restore, Runtime-Digest-Korrelation und Production-Handoff für die stabile Version.',
    targetRelease: 'v1.0.0',
    completionPercent: null,
    status: 'upcoming',
  },
];

export const PROJECT_OWNERS: {
  id: ProjectOwner;
  label: string;
  lead: string;
  badgeColor: string;
  badgeAsset: string;
  badgeSha256: string;
  licensePath: string;
  description: string;
}[] = [
  {
    id: 'PRODUCT',
    label: 'CAPITAL-AI-PRODUCT',
    lead: 'Owner + AI Apps',
    badgeColor: 'border-pink-400/40 bg-rose-950/40 text-pink-300',
    badgeAsset: new URL('../../CAPITAL-AI-PRODUCT/badge.svg', import.meta.url).href,
    badgeSha256: 'fc343ec0fc91d6da1e335be7d72bbaeea988f6dead418dbb5ea03105d47432ce',
    licensePath: 'CAPITAL-AI-PRODUCT/produkt.LICENSE.md',
    description: 'Frontend, Agent Client, UX, Konto/Profil und produktnahe Nutzerflüsse.',
  },
  {
    id: 'MARKET',
    label: 'CAPITAL-AI-MARKET',
    lead: 'Owner + AI Apps',
    badgeColor: 'border-teal-400/40 bg-teal-950/40 text-teal-300',
    badgeAsset: new URL('../../CAPITAL-AI-MARKET/badge.svg', import.meta.url).href,
    badgeSha256: '22655ab6a7f19e5d100832dd39126ea661f41abe5609dca6db58b00fd1462c13',
    licensePath: 'CAPITAL-AI-MARKET/market.LICENSE.md',
    description: 'Fintech, Provider, Scoring, Screener, Market Data und Daten-Evidence.',
  },
  {
    id: 'PLATFORM',
    label: 'CAPITAL-AI-PLATFORM',
    lead: 'Owner + AI Apps',
    badgeColor: 'border-violet-400/40 bg-violet-950/40 text-violet-300',
    badgeAsset: new URL('../../CAPITAL-AI-PLATFORM/badge.svg', import.meta.url).href,
    badgeSha256: '2e4807c864195781f314452f4aa5f285e0feb71c408f467d3610a20d5b7292f0',
    licensePath: 'CAPITAL-AI-PLATFORM/plattform.LICENSE.md',
    description: 'Render, Docker/OCI, GHCR, NATS, Valkey, CI/CD, Observability und Release Automation.',
  },
  {
    id: 'TRUST',
    label: 'CAPITAL-AI-TRUST',
    lead: 'Owner + AI Apps',
    badgeColor: 'border-slate-300/40 bg-slate-800/40 text-slate-200',
    badgeAsset: new URL('../../CAPITAL-AI-TRUST/badge.svg', import.meta.url).href,
    badgeSha256: '2b037fd897c592931c94fcee8781af398d2ac6564e3575d4cf3ee62c770e7dad',
    licensePath: 'CAPITAL-AI-TRUST/trust.LICENSE.md',
    description: 'Security, Compliance, Governance, QA, Supply Chain und Evidenz-Gates.',
  },
  {
    id: 'GROWTH',
    label: 'CAPITAL-AI-GROWTH',
    lead: 'Owner + AI Apps',
    badgeColor: 'border-amber-400/40 bg-amber-950/40 text-amber-300',
    badgeAsset: new URL('../../CAPITAL-AI-GROWTH/badge.svg', import.meta.url).href,
    badgeSha256: '9020b03cb8cc8c82c715d566c0065b8725647c06f0340615c825b221a563c76f',
    licensePath: 'CAPITAL-AI-GROWTH/growth.LICENSE.md',
    description: 'Dokumentation, SEO, Social, Branding und releasebezogene Kommunikation.',
  },
];

const BACKLOG_TARGETS: WorkPackage[] = [
  // =========================================================================
  // 1. GOVERNANCE (GF & Founder)
  // =========================================================================
  {
    id: 'AP-GOV-01',
    title: 'BaFin MaRisk Governance & GF Freigabe-Matrix',
    owner: 'TRUST',
    status: 'pending',
    phase: 3,
    phaseName: 'Phase 3: AI Agent-Client & Studio Hub Synthesizer',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Kritisch',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Festlegung der rechtsverbindlichen Freigabeprozesse für automatisierte Signale und Algorithmen-Einsatz durch die Geschäftsführung.',
    deliverables: [
      'Geschäftsführer-Prüfmatrix für Multi-Asset Signale',
      'Dokumentierte Eskalationsstufen bei Anomalien',
      'Formelle Zeichnung der Risikostrategie nach MaRisk AT 4.2',
    ],
    bafinStandard: 'BaFin MaRisk AT 4.2 / WpHG § 83',
    dependencies: ['AP-CMP-01'],
  },
  {
    id: 'AP-GOV-02',
    title: 'Revenue Assurance & Budget-Obergrenze (AP-006 Durchsetzung)',
    owner: 'TRUST',
    status: 'pending',
    phase: 3,
    phaseName: 'Phase 3: AI Agent-Client & Studio Hub Synthesizer',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Kritisch',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Strikte Durchsetzung des monatlichen 40,00 € Budget-Deckels für externe Datenprovider & AI-Tokens zur Sicherung der Profitabilität.',
    deliverables: [
      'Automatisches Hard-Limit bei 40,00 € Provider-Kosten',
      'GF-Alert bei Erreichen von 80% Budgetausschöpfung',
      'TCO-Controlling Dashboard im Control Center',
    ],
    bafinStandard: 'Finanzielle Resilienz & Kostenkontrolle AP-006',
  },
  {
    id: 'AP-GOV-03',
    title: 'v1.0 Production Launch Readiness & Notar-Audit Vorbereitung',
    owner: 'TRUST',
    status: 'planning',
    phase: 5,
    phaseName: 'Phase 5: Release Candidate & Production Go-Live v1.0',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Hoch',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Vorbereitung der finalen Freigabe für den kommerziellen Echtbetrieb der Webanwendung v1.0 inklusive Notariatstestate der Tokenomics.',
    deliverables: [
      'Finales Management Sign-Off Dokument v1.0',
      'Go-Live Kommunikationsplan für B2B & institutionelle Partner',
      'Freigabe der SLA-Garantien für 99.9% Uptime',
    ],
    bafinStandard: 'MaRisk AT 7.3 Notfallkonzept',
    dependencies: ['AP-GOV-01', 'AP-QA-03'],
  },

  // =========================================================================
  // 2. OPERATION (DevOps & SRE)
  // =========================================================================
  {
    id: 'AP-OPS-01',
    title: 'Render Image Runtime, Release Controller & bounded Self-Healing',
    owner: 'PLATFORM',
    status: 'pending',
    phase: 2,
    phaseName: 'Phase 2: Multi-Asset Screener & BaFin Compliance Hardening',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Kritisch',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Betrieb des image-backed Render-Webservice mit attestierten GHCR-Digests, Release Controller, Health-Readback und begrenzter automatischer Wiederherstellung.',
    deliverables: [
      'Docker Multi-Stage Build (<120MB Image)',
      'Bounded Rollback/Redeploy ausschließlich auf attestierte Digests',
      'Sub-45ms Latenz-Proxy Routen zu Gemini & Ingestion-Feeds',
    ],
    bafinStandard: 'BaFin BAIT Auslagerungsmanagement',
  },
  {
    id: 'AP-OPS-02',
    title: 'Echtzeit-Fleet Monitoring & Latenz-Telemetrie Dashboard',
    owner: 'PLATFORM',
    status: 'pending',
    phase: 3,
    phaseName: 'Phase 3: AI Agent-Client & Studio Hub Synthesizer',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Hoch',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Live-Überwachung der 6 Gateway-Provider (TwelveData, FRED, Binance, Kraken, Alchemy, CCXT) mit Health-Alerting.',
    deliverables: [
      'Provider Fleet Health Terminal (/provider-status)',
      'Latenz-Histogramme mit 95th Percentile Warnschwellen',
      'Fallback-Routing bei Provider-Downtime in <200ms',
    ],
    bafinStandard: 'BaFin BAIT 8 IT-Betrieb',
  },
  {
    id: 'AP-OPS-03',
    title: 'Backup/Restore & Disaster-Recovery-Abnahme für v1.0',
    owner: 'PLATFORM',
    status: 'planning',
    phase: 5,
    phaseName: 'Phase 5: Release Candidate & Production Go-Live v1.0',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Hoch',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Nachweisbarer Wiederherstellungsplan für App, NATS JetStream und kritische Konfigurationen mit getesteten RTO/RPO-Zielen, ohne unbelegte Multi-Region-Behauptung.',
    deliverables: [
      'Realistische RTO/RPO-Ziele aus gemessenen Restore-Tests ableiten',
      'Simulierter Ausfalltest im Benchmark Lab',
      'Disaster Recovery Protokoll für den BaFin Prüfer',
    ],
    bafinStandard: 'MaRisk AT 7.3 Notfallkonzept',
    dependencies: ['AP-OPS-01'],
  },

  // =========================================================================
  // 3. FRONTEND (UI & Responsive Terminal)
  // =========================================================================
  {
    id: 'AP-FE-01',
    title: '4-Reiter Architektur & Globaler Hub Header Navigation',
    owner: 'PRODUCT',
    status: 'pending',
    phase: 3,
    phaseName: 'Phase 3: AI Agent-Client & Studio Hub Synthesizer',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Kritisch',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Implementierung der vier Hauptreiter: Marketscreener, Studio Hub, Learning Portal und Control Center mit konsistenter State-Verwaltung.',
    deliverables: [
      'Zentraler Desktop- und Mobile-Reiter Tabbar im Header',
      'Entfernung redundanter Sub-Tabs im Footer (Clean Footer)',
      'URL-Synchronisation über getNormalizedPath & resolveAppRoute',
    ],
  },
  {
    id: 'AP-FE-02',
    title: 'Learning Portal UI mit interaktivem Glossar & Such-Terminal',
    owner: 'PRODUCT',
    status: 'pending',
    phase: 3,
    phaseName: 'Phase 3: AI Agent-Client & Studio Hub Synthesizer',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Hoch',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Dediziertes Learning Portal für Fachtermini, Quant-Formeln, Faustformeln und interaktive Definitionen mit Copy-to-Clipboard.',
    deliverables: [
      'Vollständiges Glossar Terminal nach Kategorien & Skill-Level',
      'Suchfunktion mit Instant-Highlighting',
      'Spickzettel-Karten (Cheat-Sheets) für Trader & Institutionelle',
    ],
  },
  {
    id: 'AP-FE-03',
    title: 'Control Center Cockpit & Interactive Roadmap Component',
    owner: 'PRODUCT',
    status: 'pending',
    phase: 3,
    phaseName: 'Phase 3: AI Agent-Client & Studio Hub Synthesizer',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Kritisch',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Entwicklung der Management-Konsole mit filterbarer Roadmap nach 5 Domains, 3 Status und 5 Phasen bis v1.0.',
    deliverables: [
      'Filter-Matrix nach Owner, Status und Phase',
      'Executive Cockpit für Geschäftsführer und Team',
      'Visuelle Phasen-Pipeline mit Fortschrittsanzeige',
    ],
  },
  {
    id: 'AP-FE-04',
    title: 'PWA Offline Caching & Mobile Touch Gestures für v1.0',
    owner: 'PRODUCT',
    status: 'planning',
    phase: 4,
    phaseName: 'Phase 4: Security, Evidence Merkle Trees, SEO & Social',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Mittel',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Installation als Progressive Web App auf iOS/Android mit Offline-Zugriff auf das Learning Portal & letzte Cache-Stände.',
    deliverables: [
      'Service Worker Cache-First Strategie für statische Assets',
      'App Manifest mit High-DPI Icons',
      'In-App Install Prompt Banner',
    ],
  },

  // =========================================================================
  // 4. DOKUMENTE (Docs & Technical Whitepapers)
  // =========================================================================
  {
    id: 'AP-DOC-01',
    title: 'Fintech Pipeline & Screener Architektur-Whitepaper (16 Konzepte)',
    owner: 'GROWTH',
    status: 'pending',
    phase: 2,
    phaseName: 'Phase 2: Multi-Asset Screener & BaFin Compliance Hardening',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Hoch',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Vollständige mathematische und technische Dokumentation der 16 Datenkonzepte von Ringpuffer bis Zero-Copy Arrow Flight.',
    deliverables: [
      'Interaktive Architektur-Seite (/architecture)',
      'PDF-Download für institutionelle Audits',
      'Code-Beispiele in TypeScript, Python und Rust',
    ],
    bafinStandard: 'BaFin BAIT Dokumentationspflicht',
  },
  {
    id: 'AP-DOC-02',
    title: 'BaFin MaRisk & WpHG § 83 Konformitäts-Handbuch',
    owner: 'GROWTH',
    status: 'pending',
    phase: 3,
    phaseName: 'Phase 3: AI Agent-Client & Studio Hub Synthesizer',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Kritisch',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Prüffähiges Handbuch für externe Wirtschaftsprüfer zur Darlegung der unveränderbaren WORM-Archivierung und Signal-Historie.',
    deliverables: [
      'Kapitel: Datenintegrität & Hashing-Verfahren',
      'Kapitel: Algorithmische Entscheidungswege (Buffett DCF)',
      'Prüfprotokoll-Vorlage für Jahresabschlussprüfungen',
    ],
    bafinStandard: 'WpHG § 83 Abs. 1 / MaRisk AT 4.3.2',
  },
  {
    id: 'AP-DOC-03',
    title: 'REST / WebSocket API Dokumentation & OpenAPI 3.1 Spec',
    owner: 'GROWTH',
    status: 'pending',
    phase: 4,
    phaseName: 'Phase 4: Security, Evidence Merkle Trees, SEO & Social',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Mittel',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Bereitstellung maschinenlesbarer Swagger / OpenAPI Spezifikationen für B2B-Kunden und Broker-Schnittstellen.',
    deliverables: [
      'OpenAPI 3.1 JSON / YAML Endpunkt-Katalog',
      'Interaktive Try-it-Out Sandbox im Studio Hub',
      'SDK Quickstarts für JavaScript und Python',
    ],
  },

  // =========================================================================
  // 5. SEO (Search Engine Optimization & Structured Data)
  // =========================================================================
  {
    id: 'AP-SEO-01',
    title: 'Schema.org JSON-LD Structured Data für FinancialService & SoftwareApplication',
    owner: 'GROWTH',
    status: 'pending',
    phase: 2,
    phaseName: 'Phase 2: Multi-Asset Screener & BaFin Compliance Hardening',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Hoch',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Strukturierte Daten nach Google Rich Snippet Richtlinien zur Auszeichnung von Finanzanalysen, Screener und Glossar-Definitionen.',
    deliverables: [
      'SoftwareApplication Schema in index.html',
      'FinancialService Entity Markup mit BAFIN MaRisk Verweisen',
      'DefinedTerm Schema für das Learning Portal Vocabulary',
    ],
  },
  {
    id: 'AP-SEO-02',
    title: 'Dynamische OpenGraph & Twitter Card Social Share Generator',
    owner: 'GROWTH',
    status: 'pending',
    phase: 3,
    phaseName: 'Phase 3: AI Agent-Client & Studio Hub Synthesizer',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Mittel',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Generierung hochauflösender Vorschaubilder (1200x630) bei Teilung von Screener-Analysen, Pipeline-Blueprints oder Glossar-Einträgen.',
    deliverables: [
      'OG:Title und OG:Description Sync in metadata.json & HTML',
      'Klickbare Social Previews für WhatsApp, LinkedIn, X',
      'Twitter Large Image Card Metatags',
    ],
  },
  {
    id: 'AP-SEO-03',
    title: 'XML Sitemap & Google Search Console Indexierungs-Strategie',
    owner: 'GROWTH',
    status: 'planning',
    phase: 4,
    phaseName: 'Phase 4: Security, Evidence Merkle Trees, SEO & Social',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Mittel',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Bereitstellung einer automatisierten Sitemap für alle Glossarbegriffe, Markt-Asset-Profile und öffentliche Studio-Blueprints.',
    deliverables: [
      'Dynamische sitemap.xml Route mit wöchentlicher Priorität',
      'Robots.txt mit gezielter Freigabe für Googlebot und Perplexity AI',
      'Lighthouse SEO Score 100/100 Audit',
    ],
  },

  // =========================================================================
  // 6. SOCIAL (Community, Telegram Bot & Social Signals)
  // =========================================================================
  {
    id: 'AP-SOC-01',
    title: 'Telegram Whale Radar Alerts & Smart Money Broadcast Engine',
    owner: 'GROWTH',
    status: 'pending',
    phase: 3,
    phaseName: 'Phase 3: AI Agent-Client & Studio Hub Synthesizer',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Hoch',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Automatisierte Telegram-Benachrichtigungen bei großen Transaktionen (>1.000.000 $) auf Ethereum, Bitcoin und Solana.',
    deliverables: [
      'Telegram Bot Webhook Schnittstelle (/whale-radar)',
      'Sofortiger Alert bei On-Chain Whale Transaktionen',
      'Ein-Klick Beitritts-Link für die VIP Signal-Gruppe',
    ],
  },
  {
    id: 'AP-SOC-02',
    title: 'One-Click Social Share & Pipeline Blueprint Link-Sharing',
    owner: 'GROWTH',
    status: 'pending',
    phase: 3,
    phaseName: 'Phase 3: AI Agent-Client & Studio Hub Synthesizer',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Mittel',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Direktes Teilen von konfigurierten Pipelines und Screener-Ergebnissen über native Web Share API & Twitter/X Intent Links.',
    deliverables: [
      'Kompakter Share-Link mit Hash-Parametern (#share=...)',
      'Vorgefertigte Tweets mit $CPT Tokenomics und Performance-Metriken',
      'LinkedIn Post Vorlage für B2B CTOs & FinTech Entscheider',
    ],
  },
  {
    id: 'AP-SOC-03',
    title: 'Discord Community Bot & Alpha Caller Integration für v1.0',
    owner: 'GROWTH',
    status: 'planning',
    phase: 5,
    phaseName: 'Phase 5: Release Candidate & Production Go-Live v1.0',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Mittel',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Verbindung der Trading Community über einen interaktiven Discord Bot mit /score und /buffett Slash-Commands.',
    deliverables: [
      'Discord Bot Token Setup mit Role-Gating ($CPT Staker)',
      'Live-Feed der Top 5 Tagesgewinner und Whale Akkumulationen',
      'Automatischer Willkommens-Guide mit Verweis aufs Learning Portal',
    ],
  },

  // =========================================================================
  // 7. SECURITY (CISO, Cryptography & Hardening)
  // =========================================================================
  {
    id: 'AP-SEC-01',
    title: 'SHA-256 Merkle-Tree Hashketten für Signal-Integrität',
    owner: 'TRUST',
    status: 'pending',
    phase: 2,
    phaseName: 'Phase 2: Multi-Asset Screener & BaFin Compliance Hardening',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Kritisch',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Kryptografische Signierung jedes generierten Scores in einer unveränderbaren Merkle-Baum-Struktur zur Beweissicherung.',
    deliverables: [
      'Client- und Server-seitige SHA-256 Hashing-Routine',
      'Merkle Root Export im PDF Evidence Report',
      'Unveränderbare WORM-Verifikation im Benchmark Lab',
    ],
    bafinStandard: 'WpHG § 83 / NIST FIPS 180-4',
  },
  {
    id: 'AP-SEC-02',
    title: 'Zero-Trust RBAC & Session Security im Control Center',
    owner: 'TRUST',
    status: 'pending',
    phase: 3,
    phaseName: 'Phase 3: AI Agent-Client & Studio Hub Synthesizer',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Kritisch',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Rollenbasierte Zugriffskontrolle (GF, Founder, Tech Lead, Compliance Officer) mit Audit Logging aller Admin-Aktionen.',
    deliverables: [
      'Granulare Rollenmatrix im Control Center',
      'Maskierung aller sensiblen Provider-API Keys',
      'Automatische Session-Invalidierung bei Inaktivität',
    ],
    bafinStandard: 'BaFin BAIT 4 Berechtigungsmanagement',
  },
  {
    id: 'AP-SEC-03',
    title: 'OWASP Top 10 Audit & Penetration Testing vor v1.0 Go-Live',
    owner: 'TRUST',
    status: 'planning',
    phase: 5,
    phaseName: 'Phase 5: Release Candidate & Production Go-Live v1.0',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Kritisch',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Umfassende Sicherheitsüberprüfung gegen XSS, CSRF, Injection, Prototype Pollution und API-Key Exfiltration vor dem v1.0 Start.',
    deliverables: [
      'Offizieller Penetration Test Report ohne kritische Befunde',
      'Content Security Policy (CSP) Level 3 Konfiguration',
      'Automatische GitHub Dependabot & CodeQL Scans',
    ],
    bafinStandard: 'BSI IT-Grundschutz / ISO 27001',
    dependencies: ['AP-SEC-01', 'AP-SEC-02'],
  },

  {
    id: 'AP-SEC-04',
    title: 'Zusätzliche Login-Provider: Kraken und Apple ID',
    owner: 'TRUST',
    status: 'planning',
    phase: 3,
    phaseName: 'Phase 3: Product, Account & Agent Integration',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Providerfähigkeit, OAuth/OIDC-Vertrag, Redirect-URIs, Account-Linking, AAL/MFA-Verhalten, Datenschutz und Branding getrennt für Kraken und Apple prüfen; erst danach produktiv aktivieren.',
    priority: 'Mittel',
    leadName: 'Owner + TRUST/PRODUCT',
    targetSprint: 'Nach Supabase-Auth-Cutover und MFA-Abnahme',
    description: 'Backlog-Ziel: Kraken und Apple ID als zusätzliche Anmeldemöglichkeiten evaluieren und nur mit verifiziertem Account-Linking, Redirect-Schutz, MFA-/AAL2-Kompatibilität und reproduzierbarer Logout-/Recovery-Semantik aktivieren.',
    deliverables: [
      'Kraken Login: offiziell unterstützten OAuth/OIDC- oder alternativen Auth-Vertrag und Scopes nachweisen',
      'Apple ID Login über Supabase Social Auth mit exakten Redirect-URIs, Private-Key-Rotation und Sign in with Apple Anforderungen validieren',
      'Provider-Linking ohne E-Mail-basierte Identitätsfusion; bestehende Supabase User-ID bleibt Autorität',
      'E2E-Tests für Login, Logout, Recovery, Provider-Link/Unlink und MFA/AAL2',
    ],
    dependencies: ['AP-SEC-02'],
  },

  // =========================================================================
  // 8. COMPLIANCE (Regulatory, BaFin & MiCA)
  // =========================================================================
  {
    id: 'AP-CMP-01',
    title: 'BaFin MaRisk Mindestanforderungen an das Risikomanagement',
    owner: 'TRUST',
    status: 'pending',
    phase: 2,
    phaseName: 'Phase 2: Multi-Asset Screener & BaFin Compliance Hardening',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Kritisch',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Verankerung der qualitativen und quantitativen MaRisk-Anforderungen an Finanzsoftware mit Auslagerungsprüfung.',
    deliverables: [
      'MaRisk AT 4.3.1 Datenmanagement-Validierung',
      'Dokumentierte Schnittstellen-SLA aller Fremddatenanbieter',
      'Audit-Trail Viewer im Control Center',
    ],
    bafinStandard: 'BaFin Rundschreiben 10/2021 (BA) - MaRisk',
  },
  {
    id: 'AP-CMP-02',
    title: 'MiCA Kryptowerte-Verordnung & Whitepaper Revisionssicherheit',
    owner: 'TRUST',
    status: 'pending',
    phase: 3,
    phaseName: 'Phase 3: AI Agent-Client & Studio Hub Synthesizer',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Hoch',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Prüfung der $CPT Tokenomics und Staking-Mechaniken nach der EU-Verordnung über Märkte für Kryptowerte (MiCA).',
    deliverables: [
      'MiCA Art. 6 Krypto-Asset Whitepaper Konformität',
      'Risikohinweise für Utility Token Staking und Buyback-Burn',
      'Ausschluss unzulässiger Einlagengeschäfte nach KWG',
    ],
    bafinStandard: 'EU MiCA Verordnung 2023/1114',
  },
  {
    id: 'AP-CMP-03',
    title: 'WpHG § 83 Aufzeichnungs- und Aufbewahrungspflichten Audit',
    owner: 'TRUST',
    status: 'pending',
    phase: 4,
    phaseName: 'Phase 4: Security, Evidence Merkle Trees, SEO & Social',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Kritisch',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Sicherstellung der 5-jährigen lückenlosen und manipulationssicheren Aufbewahrung aller berechneten Scores und Signale.',
    deliverables: [
      'WORM (Write Once Read Many) Cloud Storage Bucket Regelwerk',
      'Exportfunktion für BaFin Sonderprüfer in CSV/JSON/PDF',
      'Revisionsprotokoll aller manuellen Override-Versuche',
    ],
    bafinStandard: 'WpHG § 83 Abs. 1 & 2 / Delegierte VO (EU) 2017/565',
    dependencies: ['AP-CMP-01', 'AP-SEC-01'],
  },

  // =========================================================================
  // 9. FINTECH (Quantitative Finance & Scoring Engine)
  // =========================================================================
  {
    id: 'AP-FIN-01',
    title: 'Multi-Asset Screener & 50-Faktoren Quantitative Ranking Engine',
    owner: 'MARKET',
    status: 'pending',
    phase: 2,
    phaseName: 'Phase 2: Multi-Asset Screener & BaFin Compliance Hardening',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Kritisch',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Vollständige Berechnung von fundamentalen, technischen und Sentiment-Scores über Aktien, Krypto, Forex und Rohstoffe.',
    deliverables: [
      'Berechnung von PE, PB, ROE, FCF-Yield, Debt/Equity',
      'Z-Score Normalisierung & Outlier-Winsorizing',
      'Sektor-Aggregations-Matrix mit 11 Kernsektoren',
    ],
    bafinStandard: 'Quantitative Methodik & Backtesting Standards',
  },
  {
    id: 'AP-FIN-02',
    title: 'Buffett Value Check & Margin of Safety DCF Algorithmus',
    owner: 'MARKET',
    status: 'pending',
    phase: 2,
    phaseName: 'Phase 2: Multi-Asset Screener & BaFin Compliance Hardening',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Hoch',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Rechnerische Ermittlung des intrinsischen Werts mit 10-Jahres FCF-Projektion, WACC-Diskontierung und Sicherheitsmarge.',
    deliverables: [
      'Discounted Cash Flow (DCF) Modell mit 3 Szenarien (Bear, Base, Bull)',
      'Eigenkapitalrendite (ROE) > 15% Konsistenzfilter',
      'Interaktiver Buffett Score in Asset-Detailkarten',
    ],
  },
  {
    id: 'AP-FIN-03',
    title: 'High-Frequency Slippage Model & Order Execution Simulator',
    owner: 'MARKET',
    status: 'pending',
    phase: 4,
    phaseName: 'Phase 4: Security, Evidence Merkle Trees, SEO & Social',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Mittel',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Simulation von Ausführungskosten und Slippage bei institutionellen Ordervolumina über aggregierte Orderbücher.',
    deliverables: [
      'Almgren-Chriss Slippage Impact Funktion',
      'Orderbuch-Tiefe Indikator im Benchmark Lab',
      'TCO-Kostenrechner für Arbitrage & Market Making',
    ],
  },

  // =========================================================================
  // 10. AGENT-CLIENT (Gemini-3.8-Flash & Reasoning Architecture)
  // =========================================================================
  {
    id: 'AP-AGT-01',
    title: 'Gemini-3.8-Flash Kaufberater & Dual Scientist Reasoning Mode',
    owner: 'PRODUCT',
    status: 'pending',
    phase: 3,
    phaseName: 'Phase 3: AI Agent-Client & Studio Hub Synthesizer',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Kritisch',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Kopplung des Gemini Reasoning Modells mit Scientist Thought Process für Latenz, Monotone Sequenzierung und BaFin MaRisk.',
    deliverables: [
      'Streaming & Fallback Engine mit User-Agent Header',
      'Dual-Pane UI: Scientist Thought Process vs. Kaufberater Output',
      'Live-Bestandsabgleich mit der ausgewählten Pipeline',
    ],
  },
  {
    id: 'AP-AGT-02',
    title: 'Pipeline Tool Inventory & Revenue Assurance Catalog (AP-006)',
    owner: 'PRODUCT',
    status: 'pending',
    phase: 3,
    phaseName: 'Phase 3: AI Agent-Client & Studio Hub Synthesizer',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Kritisch',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Vollständiger Katalog aller Werkzeuge, Indikatoren, Chartmuster und News-APIs mit SKU-Vergabe und Budget-Zählung.',
    deliverables: [
      'Katalog mit über 50 quantitativen Indikatoren & Pattern SKUs',
      'Automatische Preisberechnung mit Restbudget-Anzeige',
      'Echtzeit-Validierung vor Blueprint-Export',
    ],
  },
  {
    id: 'AP-AGT-03',
    title: 'Autonome Multi-Agent Feedback-Loop für Portfolio-Rebalancing',
    owner: 'PRODUCT',
    status: 'planning',
    phase: 5,
    phaseName: 'Phase 5: Release Candidate & Production Go-Live v1.0',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Hoch',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Erweiterung des Agenten zur kontinuierlichen Überwachung von Marktregimen und automatischen Rebalancing-Empfehlungen.',
    deliverables: [
      'Marktregime-Erkennung (Bull, Bear, Choppy, Liquidity Crisis)',
      'Generierung von vorschlagsbasierten Portfolio-Umschichtungen',
      'Human-in-the-Loop Bestätigungsdialog für den Nutzer',
    ],
    dependencies: ['AP-AGT-01', 'AP-FIN-01'],
  },

  // =========================================================================
  // 11. QUALITÄTMANAGEMENT (QA, Testing & Verification)
  // =========================================================================
  {
    id: 'AP-QA-01',
    title: 'Automatisierte Contract & Provider Validation Test Suite',
    owner: 'TRUST',
    status: 'pending',
    phase: 2,
    phaseName: 'Phase 2: Multi-Asset Screener & BaFin Compliance Hardening',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Kritisch',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Validierung aller Datenverträge, Enterprise Scorer Berechnungen und Provider Registry Schemata via npm test.',
    deliverables: [
      'Provider Registry Validierungssuite (100% Pass)',
      'Enterprise Scoring Konsistenztests',
      'Typensicherheit mit tsc --noEmit ohne Warnungen',
    ],
  },
  {
    id: 'AP-QA-02',
    title: 'Cross-Browser & Responsive Breakpoint Validation (Mobile, Tablet, 4K)',
    owner: 'TRUST',
    status: 'pending',
    phase: 3,
    phaseName: 'Phase 3: AI Agent-Client & Studio Hub Synthesizer',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Hoch',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Verifikation des fehlerfreien Renderings auf Chrome, Safari iOS, Firefox und Edge auf Mobilgeräten bis zu Ultrawide Monitoren.',
    deliverables: [
      'Testmatrix für iOS Safari, Android Chrome und Desktop',
      'Keine Layout-Shifts (CLS < 0.05)',
      'Barrierefreie Bedienbarkeit mit Tastatur (Tab-Navigation & WAI-ARIA)',
    ],
  },
  {
    id: 'AP-QA-03',
    title: 'v1.0 Production Stresstest & Notfall-Szenario Simulation',
    owner: 'TRUST',
    status: 'planning',
    phase: 5,
    phaseName: 'Phase 5: Release Candidate & Production Go-Live v1.0',
    progressPercent: null,
    evidenceState: 'UNGEKLÄRT',
    evidenceRefs: [],
    nextStep: 'Zielumfang und Nachweise gegen den aktuellen Main prüfen; danach einen begrenzten Umsetzungsschritt festlegen.',
    priority: 'Kritisch',
    leadName: 'Verantwortung zuzuordnen',
    targetSprint: 'Nicht terminiert',
    description: 'Geplantes Ziel, Abnahme offen: Lasttests mit 10.000 simulierten gleichzeitigen Websocket-Verbindungen und Flash-Crash Marktdatenszenarien.',
    deliverables: [
      'Lasttest-Zertifikat mit 99.95% erfolgreichen Requests',
      'Erholungszeit nach Netzwerktrennung < 2 Sekunden',
      'Freigabezertifikat für den v1.0 Live-Launch',
    ],
    dependencies: ['AP-QA-01', 'AP-QA-02', 'AP-OPS-03'],
  },
];


/** Statischer Repo-Snapshot; wird nach einem belegten Abgleich aktualisiert. */
export const ROADMAP_SNAPSHOT = {
  "repository": "SvenKulessa/Capital-AI",
  "sourceSha": "2150643dae8190fb2f8cd496072a7cc2baa89cfe",
  "reviewDate": "2026-10-01",
  "scope": "Repo-Snapshot und punktuelle Live-Readbacks; Freigaben separat",
  "githubSettingsReviewDate": "2026-10-01",
  "githubSettingsSourceSha": "2150643dae8190fb2f8cd496072a7cc2baa89cfe",
  "domainModelVersion": "2",
  "productVersionBaseline": "0.8.0-alpha.1",
  "securitySourceSha": "07b3ff1785d2306bc743f41c990c975a69365d0b",
  "openPullRequests": [
    60,
    61,
    63,
    64,
    65,
    66,
    67,
    68,
    69
  ]
} as const;

export const WORK_PACKAGES: WorkPackage[] = [
{
  "status": "pending",
  "phase": 4,
  "phaseName": "Phase 4: DevSecOps & RC",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "evidenceRefs": [
    "docs/security/GITHUB-PUBLIC-SETTINGS-20261001.md"
  ],
  "priority": "Hoch",
  "leadName": "Projektowner",
  "id": "CA-TRUST-APP-READ-DESIGN",
  "title": "Eigene Security-App: Leserechte und Einstellungsabdeckung entwerfen",
  "owner": "TRUST",
  "targetSprint": "Nach GHCR-Digest-Abnahme; Vorbereitung vor Enterprise-Transfer",
  "description": "Organisationseigene GitHub App für capital-ai-online/Capital-AI planen. Alle sicherheitsrelevanten Repository-/Org-/Enterprise-Einstellungen je API-Endpunkt inventarisieren; fehlende Lesbarkeit explizit ausweisen. Keine Secretwerte oder pauschalen Schreibrechte.",
  "nextStep": "Endpunkt-/Leserechte-Matrix, geerbte Rulesets, IAM, Actions, CodeQL, Secret Protection, Dependabot und GitGuardian erfassen; Schlüsselrotation und begrenzte Installation planen.",
  "deliverables": [
    "API-/Berechtigungs-/Abdeckungsmatrix mit NICHT_LESBAR/UNGEKLÄRT für Lücken",
    "Kurzlebige Token und Schlüsselverwaltung; kein Bypass",
    "Getrennte spätere PR-Schreibidentität für menschliche Owner-Approval"
  ],
  "dependencies": [
    "AP-SEC-IMAGE"
  ]
},
{
  "status": "pending",
  "phase": 5,
  "phaseName": "Phase 5: Production Go-Live",
  "progressPercent": null,
  "evidenceState": "GEHALTEN",
  "evidenceRefs": [
    "docs/security/GITHUB-PUBLIC-SETTINGS-20261001.md"
  ],
  "priority": "Hoch",
  "leadName": "Projektowner",
  "id": "CA-PLATFORM-APP-READ-CONSUME",
  "title": "Security-App nach Enterprise-Umzug installieren und Readbacks nutzen",
  "owner": "PLATFORM",
  "targetSprint": "Nach Digest-, Domain-, Finance-Abnahme und Enterprise-Transfer",
  "description": "App in der Capital-AI-Enterprise-Umgebung auf ausgewählte Repositories begrenzen. Aktive und geerbte Sicherheitseinstellungen als Evidence in vorhandener Roadmap nutzen; fehlende Enterprise-API-Abdeckung nicht als PASS behandeln.",
  "nextStep": "Berechtigungen konkret freigeben, App installieren und Source-/Owner-/Zeit-/Hash-gebundene Lesebelege samt Soll-/Ist-Abweichungen konsumieren.",
  "deliverables": [
    "Installation auf verifiziertem capital-ai-online/Capital-AI",
    "Nachvollziehbarer Settings-Readback ohne Secrets",
    "Keine zweite Statusautorität und keine automatische Policy-Mutation"
  ],
  "dependencies": [
    "CA-TRUST-APP-READ-DESIGN",
    "CA-PLATFORM-ENTERPRISE-PUBLIC"
  ]
},
{
  "status": "pending",
  "phase": 4,
  "phaseName": "Phase 4: DevSecOps & RC",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "evidenceRefs": [
    "docs/security/GITHUB-PUBLIC-SETTINGS-20261001.md"
  ],
  "priority": "Hoch",
  "leadName": "Projektowner",
  "id": "CA-TRUST-SIGNED-COMMITS",
  "title": "Signierte Commits für alle Schreibwege vorbereiten und verlangen",
  "owner": "TRUST",
  "targetSprint": "Nach GHCR-Digest-Abnahme; vor Durchsetzung Signaturtest",
  "description": "Require signed commits nach Validierung lokaler, Web-, Connector/API-, Workflow- und Dependabot-Commits aktivieren. Unsigned PR-Commits können auch Squash blockieren; offene PRs zuerst prüfen.",
  "nextStep": "Verified-Signaturen inventarisieren, fehlende Arbeitsbranch-Signierung beheben und einen regulären signierten PR vor Ruleset-Aktivierung abnehmen.",
  "deliverables": [
    "Signaturmatrix aller aktiven Schreibwege",
    "Regulärer signierter Test-PR",
    "Ruleset-Readback ohne Bypass oder Main-Historienumschreibung"
  ],
  "dependencies": [
    "AP-SEC-IMAGE",
    "CA-TRUST-LINEAR-HISTORY"
  ]
},
{
  "status": "pending",
  "phase": 4,
  "phaseName": "Phase 4: DevSecOps & RC",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "evidenceRefs": [
    "docs/security/GITHUB-PUBLIC-SETTINGS-20261001.md"
  ],
  "priority": "Hoch",
  "leadName": "Projektowner",
  "id": "CA-TRUST-GITGUARDIAN",
  "title": "GitGuardian-Abdeckung und Merge-Gate verifizieren",
  "owner": "TRUST",
  "targetSprint": "Nach GHCR-Digest-Abnahme; erneut nach Enterprise-Transfer",
  "description": "GitGuardian-Installation, Repo-Abdeckung, Tarif/Kontingente und tatsächliche PR-Checkidentität prüfen. GitHub Secret Scanning/Push Protection bleiben ergänzend; keine automatische kostenlose Enterprise-Abdeckung behaupten.",
  "nextStep": "Installation und Findings lesen, Kosten prüfen; exakten Checknamen/App-Herkunft nach erfolgreicher Scanabdeckung als Required Check anbinden und nach Transfer wiederprüfen.",
  "deliverables": [
    "Aktueller Installations-/Kosten-/Repo-Abdeckungsnachweis",
    "Secret-Findings mit Sperr-/Rotationsweg",
    "Nachgewiesener PR-Check und Post-Transfer-Readback"
  ],
  "dependencies": [
    "AP-SEC-IMAGE"
  ]
},
{
  "status": "pending",
  "phase": 4,
  "phaseName": "Phase 4: DevSecOps & RC",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "evidenceRefs": [
    "docs/security/GITHUB-PUBLIC-SETTINGS-20261001.md"
  ],
  "leadName": "Projektowner",
  "id": "CA-TRUST-GITHUB-FREE",
  "title": "Kostenfreie GitHub-Sicherheitsbaseline prüfen",
  "owner": "TRUST",
  "priority": "Hoch",
  "targetSprint": "01.–03.10.2026; vor Domain-Cutover",
  "description": "Live-Ruleset enthält CodeQL und Code Quality. Vollständige Secret-Scanning-/Push-Protection-/Dependabot-/Kostenabdeckung ist damit nicht belegt und bleibt offen.",
  "nextStep": "Kostenfreie Optionen einschließlich CodeQL einzeln lesen und aktivieren; Standard-Runner und Storage-Budget prüfen; kostenpflichtige Zusatzprodukte ausschließen.",
  "deliverables": [
    "Kostenfreie Optionen einzeln lesen und aktivieren; kostenpflichtige Zusatzprodukte ausschließen."
  ],
  "dependencies": []
},
{
  "status": "aktiv",
  "phase": 4,
  "phaseName": "Phase 4: DevSecOps & RC",
  "progressPercent": 100,
  "evidenceState": "VERIFIED",
  "evidenceRefs": [
    "https://github.com/SvenKulessa/Capital-AI/blob/main/docs/compliance/ROADMAP-RECONCILIATION-20261001.md",
    "https://github.com/SvenKulessa/Capital-AI/rules/24259174"
  ],
  "leadName": "Projektowner",
  "id": "CA-TRUST-LINEAR-HISTORY",
  "title": "Lineare Main-Historie ohne Mergeblockade",
  "owner": "TRUST",
  "priority": "Hoch",
  "targetSprint": "01.10.2026; nächster Settings-Schritt",
  "description": "Ruleset 24259174 am 01.10.2026 aktiv gelesen: required_linear_history; erlaubte Methoden merge und squash. Squash ist damit verfügbar. Required Checks Docker Security Gate und Domain Governance sind an App 15368 gebunden; CodeQL und Code Quality sind weitere aktive Regeln.",
  "nextStep": "Bei zukünftigen Policy-Änderungen effektive Regeln und regulären Squash-Merge erneut prüfen; heutiger Readback ist keine Freigabe eines PR-Heads.",
  "deliverables": [
    "Zuerst Squash erlauben; dann Require linear history aktivieren und vorhandene Gates sowie PR-Mergefähigkeit prüfen."
  ],
  "dependencies": []
},
{
  "status": "pending",
  "phase": 4,
  "phaseName": "Phase 4: DevSecOps & RC",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "evidenceRefs": [
    "docs/security/GITHUB-PUBLIC-SETTINGS-20261001.md"
  ],
  "leadName": "Projektowner",
  "id": "CA-PLATFORM-GITHUB-COSTS",
  "title": "Actions-Policies und GitHub-Kosten begrenzen",
  "owner": "PLATFORM",
  "priority": "Hoch",
  "targetSprint": "01.–03.10.2026; parallel zur Security-Baseline",
  "description": "Standard-Runner für Public sind kostenlos; größere Runner und Storage-Mehrverbrauch können Kosten erzeugen. Budget- und Policies-Readback fehlen.",
  "nextStep": "Read-only Default, SHA-Pinning, Actions-Allow-List, Fork-Freigaben, Artifact-Retention, Cache-Limits und Budget-Stop prüfen.",
  "deliverables": [
    "Read-only Default, SHA-Pinning, Actions-Allow-List, Fork-Freigaben, Artifact-Retention, Cache-Limits und Budget-Stop prüfen."
  ],
  "dependencies": []
},
{
  "status": "pending",
  "phase": 4,
  "phaseName": "Phase 4: DevSecOps & RC",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "evidenceRefs": [
    "docs/security/GITHUB-PUBLIC-SETTINGS-20261001.md"
  ],
  "leadName": "Projektowner",
  "id": "CA-GROWTH-FINANCE-SPONSORS-OFF",
  "title": "Finance-Sponsorships deaktivieren",
  "owner": "GROWTH",
  "priority": "Hoch",
  "targetSprint": "01.10.2026; unabhängig vom DNS-Cutover",
  "description": "Finance-FUNDING.yml verweist auf SvenKulessa; der Repository-Sponsorships-Schalter ist noch nicht deaktiviert. Das persönliche Sponsors-Profil bleibt eigenständig.",
  "nextStep": "Finance Settings / General / Features: Sponsorships deaktivieren und fehlenden Sponsorbutton öffentlich prüfen.",
  "deliverables": [
    "Finance Settings / General / Features: Sponsorships deaktivieren und fehlenden Sponsorbutton öffentlich prüfen."
  ],
  "dependencies": []
},
{
  "status": "pending",
  "phase": 5,
  "phaseName": "Phase 5: Production Go-Live",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "evidenceRefs": [
    "docs/security/GITHUB-PUBLIC-SETTINGS-20261001.md"
  ],
  "leadName": "Projektowner",
  "id": "CA-PLATFORM-IONOS-SMTP",
  "title": "IONOS-Mailfluss vor Finance-Ablösung abnehmen",
  "owner": "PLATFORM",
  "priority": "Hoch",
  "targetSprint": "Migrationstermin; vor Finance-Suspendierung",
  "description": "Web-DNS-Cutover darf MX/SPF/DKIM/DMARC und MTA-STS nicht verändern. SMTP/TLS, Absender und Zustellung für ZITADEL-Mails brauchen eigene Evidence.",
  "nextStep": "Registrierungs-/Bestätigungs- und Passwort-Reset-Mail mit IONOS-Absender, TLS und tatsächlicher Zustellung prüfen.",
  "deliverables": [
    "Registrierungs-/Bestätigungs- und Passwort-Reset-Mail mit IONOS-Absender, TLS und tatsächlicher Zustellung prüfen."
  ],
  "dependencies": [
    "AP-SEC-IMAGE",
    "AP-CMP-RIGHTS"
  ]
},
{
  "status": "pending",
  "phase": 5,
  "phaseName": "Phase 5: Production Go-Live",
  "progressPercent": null,
  "evidenceState": "GEHALTEN",
  "evidenceRefs": [
    "docs/security/GITHUB-PUBLIC-SETTINGS-20261001.md"
  ,
    "https://github.com/SvenKulessa/Capital-AI/blob/main/docs/security/ORG-MIGRATION-PLAN-20261001.md"
  ],
  "leadName": "Projektowner",
  "id": "CA-PLATFORM-ENTERPRISE-PUBLIC",
  "title": "Öffentliches Capital-AI-Repo in Enterprise übertragen",
  "owner": "PLATFORM",
  "priority": "Hoch",
  "targetSprint": "Nach Digest-Abnahme, DNS-Migration und Finance-Ablösung; Termin offen",
  "description": "Transfer erst nach den vorgelagerten Abnahmen. Ziel: capital-ai-online/Capital-AI in der Capital-AI-Enterprise-Umgebung, weiterhin public. Enterprise-Zuordnung und Kontotyp live prüfen; Enterprise Managed Users unterstützen keine öffentlichen Repositories. Public-CodeQL und die genannten Public-Sicherheitsfunktionen bleiben ohne zusätzliche Security-Lizenz nutzbar; Enterprise-Seats separat prüfen.",
  "nextStep": "Migrationsmatrix in docs/security/ORG-MIGRATION-PLAN-20261001.md prüfen; danach capital-ai-online und Capital-AI-Enterprise-Zuordnung/Typ/Kosten prüfen, mit Sichtbarkeit public transferieren und CodeQL, Rulesets, GHCR, Render, OIDC, Apps sowie Secrets-Zugriffe erneut abnehmen.",
  "deliverables": [
    "Zielorganisation/Typ/Kosten prüfen, öffentlich transferieren und Rulesets, GHCR, Render, OIDC, Apps sowie Secrets-Zugriffe erneut abnehmen."
  ],
  "dependencies": [
    "AP-SEC-IMAGE",
    "AP-CMP-RIGHTS",
    "AP-OPS-DOMAIN",
    "AP-OPS-FINANCE-OFF"
  ]
},
{
  "status": "pending",
  "phase": 5,
  "phaseName": "Phase 5: Production Go-Live",
  "progressPercent": null,
  "evidenceState": "GEHALTEN",
  "evidenceRefs": [
    "docs/security/GITHUB-PUBLIC-SETTINGS-20261001.md"
  ],
  "leadName": "Projektowner",
  "id": "CA-GROWTH-CAPITAL-SPONSORS",
  "title": "Capital-AI-Sponsorship nach Enterprise-Umzug aktivieren",
  "owner": "GROWTH",
  "priority": "Mittel",
  "targetSprint": "Nach erfolgreichem Enterprise-Transfer; Termin offen",
  "description": "Empfängerprofil und Sponsorbutton separat verifizieren. FUNDING.yml allein richtet kein Sponsors-Konto ein. Gebühren persönlicher und Organisationssponsoren unterscheiden.",
  "nextStep": "Nach Transfer verifizierten Sponsors-Empfänger in FUNDING.yml eintragen, Sponsorships aktivieren und Button/Ziel prüfen.",
  "deliverables": [
    "Nach Transfer verifizierten Sponsors-Empfänger in FUNDING.yml eintragen, Sponsorships aktivieren und Button/Ziel prüfen."
  ],
  "dependencies": [
    "CA-PLATFORM-ENTERPRISE-PUBLIC",
    "CA-GROWTH-FINANCE-SPONSORS-OFF"
  ]
},
{
  "id": "CA-PLATFORM-VERSIONING",
  "title": "Repo-weite SemVer- und Release-Identität",
  "owner": "PLATFORM",
  "status": "aktiv",
  "phase": 1,
  "phaseName": "Phase 1: Platform Foundation",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "evidenceRefs": [
    "VERSION",
    "CHANGELOG.md",
    "docs/governance/DOMAIN-RELEASE-GOVERNANCE.md"
  ],
  "nextStep": "Release-Manifest und automatischen Release-PR-Controller ergänzen und gegen Branch Rules validieren.",
  "priority": "Hoch",
  "leadName": "Owner + AI Apps",
  "targetSprint": "laufend",
  "description": "SemVer-Baseline, Domain-Konvention und unveränderliche Source-/Digest-/Deploy-Identitäten werden zusammengeführt. Production bleibt evidenzgebunden.",
  "deliverables": [
    "VERSION und Package-Version synchron",
    "SemVer-Ziele in Roadmap",
    "Release-Identität mit Source SHA, OCI Digest und Render Deploy ID"
  ]
},
{
  "id": "CA-TRUST-DAILY-SUPPLY-CHAIN",
  "title": "Täglicher Versions- und CVE-Watch",
  "owner": "TRUST",
  "status": "aktiv",
  "phase": 4,
  "phaseName": "Phase 4: DevSecOps & RC",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "evidenceRefs": [
    ".github/dependabot.yml",
    ".github/workflows/daily-dependency-security-watch.yml",
    ".github/workflows/build-security.yml"
  ],
  "nextStep": "Die offenen Dependency-PRs gegen Main (Dependabot-Governance #72 und Attestation-Konsolidierung #73 bereits gemerged) gegen den jeweiligen Head prüfen; Major-Upgrades nicht allein durch Dependabot-Erfolg freigeben.",
  "priority": "Kritisch",
  "leadName": "Owner + AI Apps",
  "targetSprint": "täglich",
  "description": "npm, GitHub Actions und Docker-Pins werden täglich auf Updates geprüft; HIGH/CRITICAL npm Advisories blockieren den Watch-Lauf. Der bestehende Docker Security Gate läuft zusätzlich täglich mit frischen Trivy-Daten über Source, Build-Image, Runtime-Image und NATS-Image.",
  "deliverables": [
    "Daily Dependabot",
    "npm audit high/critical",
    "Runtime-Pin-Evidence",
    "keine blinden Major-Deployments"
  ]
},
{
  "id": "CA-PLATFORM-COMPONENT-DEPLOY",
  "title": "Component-Diff gesteuerte Render-Deployments",
  "owner": "PLATFORM",
  "status": "pending",
  "phase": 4,
  "phaseName": "Phase 4: DevSecOps & RC",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "evidenceRefs": [
    "deploy/Dockerfile.nats",
    "docs/security/PRODUCTION-HANDOFF.md"
  ],
  "nextStep": "Deterministische Pfad-/Komponentenmatrix implementieren: App, NATS, Docs-only und Security-triggered; Render REST nur für betroffene Komponenten auslösen.",
  "priority": "Kritisch",
  "leadName": "Owner + AI Apps",
  "targetSprint": "vor v0.9.9-rc.1",
  "description": "NATS folgt nicht pauschal jedem Repo-HEAD. App und Broker werden anhand relevanter Dateiänderungen und Security-Trigger unabhängig released.",
  "deliverables": [
    "Component fingerprint",
    "NATS change gate",
    "Render REST deployment",
    "Post-deploy identity verification"
  ]
},
{
  "id": "CA-PLATFORM-SELF-HEAL",
  "title": "Bounded Self-Healing Controller",
  "owner": "PLATFORM",
  "status": "pending",
  "phase": 4,
  "phaseName": "Phase 4: DevSecOps & RC",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "evidenceRefs": [
    "docs/governance/DOMAIN-RELEASE-GOVERNANCE.md"
  ],
  "nextStep": "DETECT → CORRELATE → CLASSIFY → REMEDIATE → VERIFY als fail-closed Controller mit Retry-Budget und Escalation implementieren.",
  "priority": "Hoch",
  "leadName": "Owner + AI Apps",
  "targetSprint": "vor v1.0.0",
  "description": "Automatische Reparaturen bleiben reversibel und komponentenspezifisch. Secrets, destruktive Datenoperationen und Gate-Deaktivierungen sind ausgeschlossen.",
  "deliverables": [
    "Drift detection",
    "bounded remediation",
    "retry budget",
    "verification",
    "escalation evidence"
  ]
},
{
  "id": "CA-GROWTH-DOMAIN-BRANDING",
  "title": "Domain-Farben und Symbole in DevSecOps-Branding integrieren",
  "owner": "GROWTH",
  "status": "aktiv",
  "phase": 1,
  "phaseName": "Phase 1: Platform Foundation",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "evidenceRefs": [
    "CAPITAL-AI-PRODUCT/PROJECT.md",
    "CAPITAL-AI-PRODUCT/produkt.LICENSE.md",
    "CAPITAL-AI-MARKET/PROJECT.md",
    "CAPITAL-AI-MARKET/market.LICENSE.md",
    "CAPITAL-AI-PLATFORM/PROJECT.md",
    "CAPITAL-AI-PLATFORM/plattform.LICENSE.md",
    "CAPITAL-AI-TRUST/PROJECT.md",
    "CAPITAL-AI-TRUST/trust.LICENSE.md",
    "CAPITAL-AI-GROWTH/PROJECT.md",
    "CAPITAL-AI-GROWTH/growth.LICENSE.md"
  ],
  "nextStep": "Die gelieferten Domain-Badges nach Asset-Import in Roadmap und DevSecOps-Oberflächen verwenden; Farben und Symbolik sind bereits kanonisch festgelegt.",
  "priority": "Mittel",
  "leadName": "Owner + AI Apps",
  "targetSprint": "laufend",
  "description": "Die fünf Domain-Namen, Farbrichtungen, Symbole und Lizenznachweise sind anhand der gelieferten Branding-Assets kanonisch festgelegt. Der binäre Asset-Import in die auslieferbare Repository-Struktur ist der verbleibende Schritt.",
  "deliverables": [
    "Domain-Farbmatrix",
    "Symbol-Mapping",
    "GitHub DevSecOps Branding",
    "Roadmap-Darstellung"
  ]
},
{
  "id": "AP-CMP-LEGAL",
  "title": "Rechtstexte aus Finance übernommen und an ZITADEL angepasst",
  "owner": "TRUST",
  "status": "aktiv",
  "phase": 2,
  "phaseName": "Phase 2: Screener & Compliance",
  "progressPercent": 100,
  "evidenceState": "VERIFIED",
  "evidenceRefs": [
    "src/components/LegalAndFaqPages.tsx",
    "src/privacy/privacyPolicy.ts",
    "src/content/legalDocumentVersions.ts"
  ],
  "nextStep": "Rechtstexte nach der Domainumschaltung auf allen Zielhosts prüfen.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Nicht terminiert",
  "description": "Impressum, AGB und Datenschutz sind auf dem gelesenen Main integriert. Die Dokumentversion ist 2026-09-30; die Übernahme ist keine rechtliche Gesamtfreigabe.",
  "deliverables": [
    "Rechtstexte nach der Domainumschaltung auf allen Zielhosts prüfen."
  ]
},
{
  "id": "AP-CMP-PRIVACY",
  "title": "Verifizierte Sitzung für Datenauszug und E-Mail-Entwurf",
  "owner": "TRUST",
  "status": "aktiv",
  "phase": 2,
  "phaseName": "Phase 2: Screener & Compliance",
  "progressPercent": 100,
  "evidenceState": "VERIFIED",
  "evidenceRefs": [
    "server/privacy.mjs",
    "server/auth.test.mjs"
  ],
  "nextStep": "Eigenen Export nach echtem Login und Logout auf dem Zielhost abnehmen.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Nicht terminiert",
  "description": "Export und Anfrageweg akzeptieren die serverseitig verifizierte OIDC-Sitzung. Der Export ist begrenzt; der Anfrageweg speichert und versendet nichts.",
  "deliverables": [
    "Eigenen Export nach echtem Login und Logout auf dem Zielhost abnehmen."
  ]
},
{
  "id": "AP-CMP-ANALYTICS",
  "title": "Optionales Analytics und Werbung deaktiviert",
  "owner": "TRUST",
  "status": "aktiv",
  "phase": 2,
  "phaseName": "Phase 2: Screener & Compliance",
  "progressPercent": 100,
  "evidenceState": "VERIFIED",
  "evidenceRefs": [
    "src/utils/analytics.ts",
    "scripts/privacy-analytics.test.mjs"
  ],
  "nextStep": "Bei jeder neuen Tracking-Integration Verarbeitung und Einwilligung erneut prüfen.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Nicht terminiert",
  "description": "Die Analytics-Funktionen sind im Quellcode deaktiviert. Ein neuer Consent-Dialog wird daraus nicht als umgesetzt abgeleitet.",
  "deliverables": [
    "Bei jeder neuen Tracking-Integration Verarbeitung und Einwilligung erneut prüfen."
  ]
},
{
  "id": "AP-FE-NAV",
  "title": "Hub-Navigation mit Pfad und Tab synchronisiert",
  "owner": "PRODUCT",
  "status": "aktiv",
  "phase": 1,
  "phaseName": "Phase 1: Foundation",
  "progressPercent": 100,
  "evidenceState": "VERIFIED",
  "evidenceRefs": [
    "src/hooks/useHubTab.ts",
    "scripts/navigation.test.mjs"
  ],
  "nextStep": "Mobile Navigation nach dem nächsten Deployment prüfen.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Nicht terminiert",
  "description": "Pfad-/Tab-Verarbeitung und URL-Synchronisation sind auf Main vorhanden; Direktlinks und Browsernavigation haben eigene Regressionstests.",
  "deliverables": [
    "Mobile Navigation nach dem nächsten Deployment prüfen."
  ]
},
{
  "id": "AP-FE-BRAND",
  "title": "Neues führendes Logo und Herkunftshinweis integriert",
  "owner": "PRODUCT",
  "status": "aktiv",
  "phase": 1,
  "phaseName": "Phase 1: Foundation",
  "progressPercent": 100,
  "evidenceState": "VERIFIED",
  "evidenceRefs": [
    "docs/branding/LOGO-20260930.md",
    "docs/licenses/Capital-AI-BRANDING.md",
    "public/branding/capital-ai-logo.jpg"
  ],
  "nextStep": "ZITADEL-Branding und produktive Darstellung separat abnehmen.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Nicht terminiert",
  "description": "Das bereitgestellte Logo ist eingebunden; die drei früheren Logos sind aus dem aktuellen Baum entfernt. Die allgemeine Markenfreigabe bleibt gesondert zu prüfen.",
  "deliverables": [
    "ZITADEL-Branding und produktive Darstellung separat abnehmen."
  ]
},
{
  "id": "AP-SEC-OIDC",
  "title": "ZITADEL-Anmeldung und Sessiongrenzen implementiert",
  "owner": "TRUST",
  "status": "aktiv",
  "phase": 1,
  "phaseName": "Phase 1: Foundation",
  "progressPercent": 100,
  "evidenceState": "VERIFIED",
  "evidenceRefs": [
    "server/auth.mjs",
    "server/auth.test.mjs",
    "https://github.com/SvenKulessa/Capital-AI/blob/main/docs/compliance/ROADMAP-RECONCILIATION-20261001.md"
  ],
  "nextStep": "Login, Logout, Wiederanmeldung und Sessionbindung auf capital-ai.online dokumentieren.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Nicht terminiert",
  "description": "Authorization Code mit PKCE, Tokenprüfung und serverseitige Sitzungen sind implementiert. Live /api/auth/session meldet configured=true, anonymous authenticated=false; öffentliche Discovery antwortet 200 mit S256 und client_secret_basic. Service-Account-Rechte, Policies, Branding und SMTP sind dadurch nicht gelesen.",
  "deliverables": [
    "Login, Logout, Wiederanmeldung und Sessionbindung auf capital-ai.online dokumentieren."
  ]
},
{
  "id": "AP-FIN-BOUNDARY",
  "title": "Demo-Daten von produktivem Scoring getrennt",
  "owner": "MARKET",
  "status": "aktiv",
  "phase": 2,
  "phaseName": "Phase 2: Screener & Compliance",
  "progressPercent": 100,
  "evidenceState": "VERIFIED",
  "evidenceRefs": [
    "docs/architecture/ANALYSIS-FOUNDATION.md",
    "src/contracts/analysisComponentRegistry.ts"
  ],
  "nextStep": "Für jede Komponente Daten, Berechnung und Rechte nachweisen.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Nicht terminiert",
  "description": "Die Registry und Zulassungsprüfungen verhindern die Freigabe unbelegter Komponenten. Eine produktive Score-Freigabe wird nicht behauptet.",
  "deliverables": [
    "Für jede Komponente Daten, Berechnung und Rechte nachweisen."
  ]
},
{
  "id": "AP-FIN-TRANSPORT",
  "title": "Redis, NATS und Pub/Sub im Repository integriert",
  "owner": "MARKET",
  "status": "aktiv",
  "phase": 1,
  "phaseName": "Phase 1: Foundation",
  "progressPercent": 100,
  "evidenceState": "VERIFIED",
  "evidenceRefs": [
    "server/infrastructure.mjs",
    "docs/architecture/REAL-DATA-VALIDATION.md",
    "deploy/VALKEY-PUBSUB-NATS-HANDOFF.md"
  ],
  "nextStep": "Produktive Verbindung, dauerhaftes Replay und Fehlerfälle prüfen.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Nicht terminiert",
  "description": "Clients, Verträge und Pub/Sub sind integriert. Frischer Readback belegt Redis/NATS/PubSub connected. Er ersetzt weder Subscriber-Zustellung noch externen Backup-/Restore-Nachweis.",
  "deliverables": [
    "Produktive Verbindung, dauerhaftes Replay und Fehlerfälle prüfen."
  ]
},
{
  "id": "AP-OPS-CURRENT",
  "title": "Main und Capital-AI-Deployment korrelieren",
  "owner": "PLATFORM",
  "status": "pending",
  "phase": 1,
  "phaseName": "Phase 1: Foundation",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "evidenceRefs": [
    "https://dashboard.render.com/web/srv-dau1rp893c1s73cdhm1g",
    "https://github.com/SvenKulessa/Capital-AI/blob/main/docs/compliance/ROADMAP-RECONCILIATION-20261001.md"
  ],
  "nextStep": "Nach Lizenz-/Security-Abnahme neuen Kandidaten an finalen Main binden und Runtime-Source, Builder, Index und Plattform-Manifest gemeinsam abnehmen.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Nicht terminiert",
  "description": "Historischer Roadmap-Abgleich vom 01.10.2026 auf Source 2150643dae8190fb2f8cd496072a7cc2baa89cfe: Der damalige /healthz-Readback meldete bound=true und Runtime-Source 4fbd1373b07092ed8ef550f60e9cf60f1f3f526d; Render war auf Index-Digest 53c47463 eingestellt. Diese Werte sind historische Evidence und keine Current-Main-/Runtime-Identität. Current Main und Runtime müssen für jede Freigabe frisch korreliert werden.",
  "deliverables": [
    "Nach Merge dieser Roadmap den neuen Main mit dem Deployment abgleichen."
  ]
},
{
  "id": "AP-SEC-IMAGE",
  "title": "Sicherheitsnachweise an aktuellen Main und Live-Image binden",
  "owner": "TRUST",
  "status": "pending",
  "phase": 4,
  "phaseName": "Phase 4: Security & Ecosystem",
  "progressPercent": null,
  "evidenceState": "GEHALTEN",
  "evidenceRefs": [
    "https://github.com/SvenKulessa/Capital-AI/actions/runs/36765644507",
    "docs/security/DIGEST-LIVE-READBACK-20261001.md",
    "docs/security/AP-SEC-IMAGE-ABNAHME-20261001.md",
    "https://github.com/SvenKulessa/Capital-AI/blob/main/docs/compliance/ROADMAP-RECONCILIATION-20261001.md"
  ],
  "nextStep": "Lizenzscope, aktuelle CodeQL-/Code-Quality-Policy-Ergebnisse und finalen Main schließen; neuen Kandidaten einmal veröffentlichen und denselben Digest mit frischem Runtime-/Deploy-Readback abnehmen.",
  "priority": "Kritisch",
  "leadName": "Projektowner",
  "targetSprint": "Jetzt zuerst: GHCR-/Render-Digest-Abnahme; vor weiteren Security-App-Paketen",
  "description": "Am 01.10.2026 ist die technische Index-/Plattform-/Config-/Render-/Runtime-Identität des Kandidaten 4fbd137 mit Index 53c47463 in Deploy dep-dauri23ncjis738243fg belegt. Aktive Instanz lfp5s meldet bound=true und den erwarteten Builder. Production bleibt wegen älterem Source, offener Lizenzabnahme und CodeQL-/Code-Quality-Gates gehalten.",
  "deliverables": [
    "Evidence-Tabelle und Validator-Korrekturen prüfen; neuer Publish/Deploy/Handoff erst nach gesonderter Freigabe."
  ]
},
{
  "id": "AP-CMP-RIGHTS",
  "title": "Container-, Asset- und Marktdatenrechte abschließen",
  "owner": "TRUST",
  "status": "pending",
  "phase": 4,
  "phaseName": "Phase 4: Security & Ecosystem",
  "progressPercent": null,
  "evidenceState": "GEHALTEN",
  "evidenceRefs": [
    "docs/security/LICENSE-RIGHTS.md",
    "docs/security/evidence/license-rights-review.json"
  ],
  "nextStep": "Offene Nachweise und Berechtigungen belegen; Freigabe an die tatsächlich ausgelieferte Identität binden.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Nicht terminiert",
  "description": "Die Lizenznachweise führen REVIEW_OPEN und deployEligible:false. Quellenbereitstellung, verbleibende Asset-/Markenrechte, Font-Identität und Providervertragsumfang sind offen.",
  "deliverables": [
    "Offene Nachweise und Berechtigungen belegen; Freigabe an die tatsächlich ausgelieferte Identität binden."
  ]
},
{
  "id": "AP-CMP-PROVIDERS",
  "title": "Datenschutzverträge, Datenflüsse und Aufbewahrung prüfen",
  "owner": "TRUST",
  "status": "pending",
  "phase": 2,
  "phaseName": "Phase 2: Screener & Compliance",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "evidenceRefs": [
    "src/privacy/privacyPolicy.ts",
    "docs/compliance/ZITADEL-PRIVACY-CUTOVER-20260930.md"
  ],
  "nextStep": "Render, ZITADEL, externe Schriftarten und gegebenenfalls Telegram mit tatsächlich aktiven Datenflüssen abgleichen.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Nicht terminiert",
  "description": "Die Datenschutzhinweise weisen die Prüfung tatsächlicher Providerkonfigurationen und Verträge ausdrücklich aus. Die Texte ersetzen diese Nachweise nicht.",
  "deliverables": [
    "Render, ZITADEL, externe Schriftarten und gegebenenfalls Telegram mit tatsächlich aktiven Datenflüssen abgleichen."
  ]
},
{
  "id": "AP-OPS-NATS-LIVE",
  "title": "NATS-Verbindung, Subscriber-Zustellung und Replay abnehmen",
  "owner": "PLATFORM",
  "status": "pending",
  "phase": 1,
  "phaseName": "Phase 1: Foundation",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "evidenceRefs": [
    "deploy/VALKEY-PUBSUB-NATS-HANDOFF.md",
    "deploy/render-nats.yaml",
    "docs/architecture/PART1-RUNTIME-CLOSEOUT-20260930.md",
    "https://github.com/SvenKulessa/Capital-AI/blob/main/docs/compliance/ROADMAP-RECONCILIATION-20261001.md"
  ],
  "nextStep": "Neuen App-Kandidaten nach Handoff deployen; subscriber=connected und verifiedDeliveries > 0 sowie Zustellung nach Reconnect und Evidence-Replay dokumentieren. Externen Backup-Restore separat abnehmen.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Nicht terminiert",
  "description": "Frischer /healthz- und /api/market/status-Readback am 01.10.2026: Redis, NATS und Pub/Sub connected; CAPITAL_FACTS mit file storage und einer Replica. Archivierter Restart-Bericht nennt 56.118 wiederhergestellte Nachrichten. Aktiver App-Source 4fbd137 enthält die spätere Probe-Subscriber-Änderung noch nicht; Zustellungs-/Replay-Abnahme bleibt offen.",
  "deliverables": [
    "Dienste und Verbindung frisch lesen; Token nur im Secret Store setzen; PubAck, Restart und Replay prüfen."
  ]
},
{
  "id": "AP-OPS-DOMAIN",
  "title": "capital-ai.online auf den neuen Dienst umstellen",
  "owner": "PLATFORM",
  "status": "pending",
  "phase": 5,
  "phaseName": "Phase 5: Production Go-Live",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "evidenceRefs": [
    "deploy/DNS-CUTOVER.md",
    "docs/security/DOMAIN-MIGRATION.md",
    "https://github.com/SvenKulessa/Capital-AI/blob/main/docs/compliance/ROADMAP-RECONCILIATION-20261001.md"
  ],
  "nextStep": "Read-only Bestandsaufnahme und Cutover-/Rollback-Plan vorbereiten. Umschaltung erst nach AP-SEC-IMAGE, Lizenz-, Domain-/Auth-/Mail-Abnahme; Finance erhalten.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Nach Digest-/Lizenzabnahme; abgestimmtes Migrationsfenster",
  "description": "Finance ist laut frischem Render-Readback nicht suspendiert. Aktueller HTTPS-Aufruf der Hauptdomain konnte aus dieser Umgebung nicht ausgewertet werden; die ältere Finance-Zuordnung ist historisch, kein heutiger DNS-Nachweis.",
  "deliverables": [
    "Domainbindungen und DNS frisch sichern, ZITADEL-Callback prüfen, gezielt umstellen und HTTPS/Login/Export abnehmen."
  ],
  "dependencies": [
    "AP-SEC-IMAGE",
    "AP-CMP-RIGHTS"
  ]
},
{
  "id": "AP-CMP-OLD-DATA",
  "title": "Finance-Altdaten und bestehende Verträge weiter bearbeitbar halten",
  "owner": "TRUST",
  "status": "pending",
  "phase": 5,
  "phaseName": "Phase 5: Production Go-Live",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "evidenceRefs": [
    "server/privacy.mjs",
    "deploy/DNS-CUTOVER.md"
  ],
  "nextStep": "Zugriff und Bearbeitung der Altdaten sichern; keine Identitäten allein über gleiche E-Mail-Adressen verbinden.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Nicht terminiert",
  "description": "Die Anwendung übernimmt alte Identitäten oder Daten nicht automatisch. Auskunft, Vertragsverwaltung und zulässige Aufbewahrung benötigen vor Abschaltung einen dokumentierten Weg.",
  "deliverables": [
    "Zugriff und Bearbeitung der Altdaten sichern; keine Identitäten allein über gleiche E-Mail-Adressen verbinden."
  ]
},
{
  "id": "AP-OPS-FINANCE-OFF",
  "title": "Finance nach erfolgreicher Umschaltung suspendieren",
  "owner": "PLATFORM",
  "status": "pending",
  "phase": 5,
  "phaseName": "Phase 5: Production Go-Live",
  "progressPercent": null,
  "evidenceState": "GEHALTEN",
  "evidenceRefs": [
    "deploy/DNS-CUTOVER.md"
  ],
  "nextStep": "Nach dokumentierter Abnahme nur den vorgesehenen Finance-Service suspendieren; Rückweg prüfen.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Nach dokumentierter Domain-, Auth-, Mail- und Altdatenabnahme",
  "description": "Finance bleibt bis zur Abnahme von Domain, TLS, Login, Datenauszug, erforderlichem Datenzugriff und Altdatenbearbeitung aktiv.",
  "deliverables": [
    "Nach dokumentierter Abnahme nur den vorgesehenen Finance-Service suspendieren; Rückweg prüfen."
  ],
  "dependencies": [
    "AP-OPS-DOMAIN",
    "AP-SEC-AUTH-LIVE",
    "AP-CMP-OLD-DATA",
    "CA-PLATFORM-IONOS-SMTP",
    "CA-GROWTH-SOC-PILOT"
  ]
},
{
  "id": "AP-SEC-AUTH-LIVE",
  "title": "ZITADEL-Login und eigener Export auf der Hauptdomain abnehmen",
  "owner": "TRUST",
  "status": "pending",
  "phase": 5,
  "phaseName": "Phase 5: Production Go-Live",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "evidenceRefs": [
    "contracts/trust/OIDC_VERIFICATION_STATE@1.yaml",
    "docs/security/OIDC-VERIFICATION-STATE-20261001.md",
    "docs/compliance/ZITADEL-PRIVACY-CUTOVER-20260930.md",
    "deploy/DNS-CUTOVER.md",
    "https://github.com/SvenKulessa/Capital-AI/blob/main/docs/compliance/ROADMAP-RECONCILIATION-20261001.md"
  ],
  "nextStep": "Credential-Authentifizierung und echten Login/Callback/ID-Token/Session-Ablauf nachweisen; erst danach OIDC-Gesamtgate auf grün setzen. Eigenen Export, Logout und anschließendes 401 auf capital-ai.online zusätzlich prüfen.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Nicht terminiert",
  "description": "OIDC-Verifikation ist fail-closed: vorhandene Konfiguration und Discovery gelten nur als Preflight. Der aktuelle Workflow muss rot bleiben, solange Credential-Authentifizierung und ein echter Login-/Callback-/ID-Token-/Session-Ablauf nicht belegt sind. Frühere grüne Diagnose-Läufe sind keine vollständige OIDC-Abnahme.",
  "deliverables": [
    "Echten Login, eigenen Export, Logout und anschließendes 401 auf capital-ai.online prüfen."
  ]
},
{
  "status": "pending",
  "phase": 4,
  "phaseName": "Phase 4: DevSecOps & RC",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Vor Production-Handoff",
  "id": "CA-TRUST-LICENSE-TOOLS",
  "title": "Open-Source-Werkzeuge für Lizenz- und Vertragsnachweise evaluieren",
  "owner": "TRUST",
  "evidenceRefs": [
    "https://github.com/SvenKulessa/Capital-AI/blob/main/docs/compliance/OSS-EVIDENCE-TOOLS-20261001.md"
  ],
  "description": "ORT und ScanCode für Dependency-/Dateilizenznachweise, FOSSology für manuelle Klärung und Documenso Community für Vertragsunterzeichnung recherchiert. Auswahl dokumentiert; noch keine Installation oder Vertrags-/Lizenzfreigabe.",
  "nextStep": "Kleinen ORT-/ScanCode-Pilot mit festgelegter Toolversion und Hash an vorhandenem Lizenzinventar ausführen; Ergebnisse und Source-/Notice-Lieferung reviewen. Documenso nur bei tatsächlichem Signaturbedarf evaluieren.",
  "deliverables": [
    "Version-/Hash-gebundene Scanergebnisse und Notice-/Source-Paket",
    "Provider-Rechtematrix mit Vertrag, Gültigkeit und Reviewentscheidung",
    "Drei unabhängige positive Validierungen vor dauerhafter Automatisierung"
  ],
  "dependencies": [
    "AP-CMP-RIGHTS",
    "AP-CMP-PROVIDERS"
  ]
},
{
  "status": "pending",
  "phase": 4,
  "phaseName": "Phase 4: DevSecOps & RC",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Vor Production-Handoff",
  "id": "CA-TRUST-ZITADEL-READBACK",
  "title": "ZITADEL-Service-Account und aktive Konfiguration lesen",
  "owner": "TRUST",
  "evidenceRefs": [
    "https://github.com/SvenKulessa/Capital-AI/blob/main/docs/compliance/ROADMAP-RECONCILIATION-20261001.md",
    "scripts/diagnose-oidc.mjs",
    ".github/workflows/render-cli-readonly.yml"
  ],
  "description": "OIDC-Client-Credentials sind im Code getrennt von Service-Account-Zugang. Aktuell kein zugängliches Service-Account-Credential und kein Render-Env-Reader im Connector; Existenz, Gültigkeit und Berechtigungen bleiben UNGEPRÜFT.",
  "nextStep": "Vorhandenen Secret-Zugriff im berechtigten Laufzeit-/CI-Kontext nutzen; Credential-Typ und begrenzte Leserechte feststellen, danach App-Callbacks, Login-/MFA-/Passkey-Policies, Branding und SMTP ohne Secret-/Benutzerdatenexport lesen.",
  "deliverables": [
    "Secretfreier Bericht: Credential-Typ, Authentifizierung und einzelne Lesegates",
    "Callbacks, Policies, Branding und Mailkonfiguration mit Zeitpunkt",
    "Fehlender Zugriff bleibt OFFEN; kein automatischer Rechteausbau"
  ],
  "dependencies": [
    "AP-SEC-OIDC"
  ]
},

{
  "id": "CA-PLATFORM-COMPONENT-INVENTORY",
  "title": "Geschütztes Komponenten-Inventar und CADS-Dashboard konvergieren",
  "owner": "PLATFORM",
  "status": "aktiv",
  "phase": 4,
  "phaseName": "Phase 4: DevSecOps & RC",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "evidenceRefs": [
    "src/data/externalComponentInventory.ts",
    "src/components/ComponentInventoryDashboard.tsx",
    "docs/governance/COMPONENT-LIFECYCLE-VERSIONING.md"
  ],
  "nextStep": "Private Supabase-Registry und public-safe Documentary-Projektion regelmäßig gegen Runtime-/Provider-Readbacks korrelieren; CADS erst nach reproduzierbaren Benchmarks auf VERIFIED promoten.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Phase 4",
  "description": "Architekturrelevante Fremdkomponenten werden ohne Secretwerte inventarisiert, mit drei OSS-Kandidaten verglichen und im Control Center mit CADS, Versionen, Domain und Abhängigkeiten dargestellt.",
  "deliverables": [
    "Private Metadaten-Registry ohne Secretwerte",
    "Public-safe Komponenten-/CADS-Dashboard",
    "DISCOVERED → BENCHMARKED → APPROVED → ACTIVE → SUPERSEDED Lifecycle"
  ]
},
{
  "id": "CA-PLATFORM-OBSERVABILITY-BASELINE",
  "title": "Finance-Logging selektiv als datenschutzgesicherte Observability-Baseline übernehmen",
  "owner": "PLATFORM",
  "status": "aktiv",
  "phase": 4,
  "phaseName": "Phase 4: DevSecOps & RC",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "evidenceRefs": [
    "server/observability.mjs",
    "docs/security/SECRET-IP-DATA-PROTECTION-BASELINE.md"
  ],
  "nextStep": "Strukturierte Logs, W3C-Trace-Korrelation und geschützte Prometheus-Metriken im Preflight testen; Retention und externen Export separat entscheiden.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Phase 4",
  "description": "Operational Telemetry und Security Audit bleiben getrennt; Secret-/Credential-Felder werden vor Ausgabe redigiert, Metriken sind nicht öffentlich.",
  "deliverables": [
    "Structured JSON Logging",
    "Secret-Redaction und W3C Trace Context",
    "Token-geschützter Prometheus-Endpunkt",
    "Separater nicht gesampelter Audit-Kanal"
  ]
},
{
  "id": "CA-PLATFORM-OTEL-COLLECTOR",
  "title": "OpenTelemetry Collector Stack als optionalen Export-Layer benchmarken",
  "owner": "PLATFORM",
  "status": "planning",
  "phase": 4,
  "phaseName": "Phase 4: DevSecOps & RC",
  "progressPercent": null,
  "evidenceState": "UNGEKLÄRT",
  "evidenceRefs": [
    "src/data/openSourceStack.ts",
    "docs/governance/COMPONENT-LIFECYCLE-VERSIONING.md"
  ],
  "nextStep": "OTel Collector gegen Grafana Alloy, Vector und Fluent Bit mit CADS_PROFILE@2 benchmarken; keine Collector-Runtime vor positivem Kosten-/Security-Gate.",
  "priority": "Mittel",
  "leadName": "Projektowner",
  "targetSprint": "Nach Observability-Baseline",
  "description": "Vendor-neutraler OTLP-Export bleibt Backlog; der kleine Render-Webservice erhält zunächst keinen zusätzlichen Collector-Prozess.",
  "deliverables": [
    "Gepinnte Kandidatenversionen und Lizenzen",
    "CPU/RAM/Throughput/Failure Benchmark",
    "Redaction-, TLS-, Auth- und Least-Privilege Review"
  ],
  "dependencies": ["CA-PLATFORM-OBSERVABILITY-BASELINE"]
},
{
  "id": "CA-PLATFORM-MARKET-INFRA-BENCH",
  "title": "Valkey, Redis-Kompatibilität und NATS JetStream Fan-out reproduzierbar benchmarken",
  "owner": "PLATFORM",
  "status": "planning",
  "phase": 2,
  "phaseName": "Phase 2: Market Intelligence",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "evidenceRefs": [
    "docs/architecture/MARKET-EVENT-FANOUT-AND-CACHE.md",
    "server/infrastructure.mjs"
  ],
  "nextStep": "Synthetische 3/100/200/400-Symbol-Last mit identischen Payloads, Clients und Pipeline-Parametern messen; keine Provider-Abfragen auslösen.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Vor 100+ Asset Aktivierung",
  "description": "Aktuell sind im Default nur BTCUSDT, BTCUSD und AAPL erlaubt. Die Kapazität für 100+ Assets wird erst über p50/p95/p99, Durchsatz, CPU/RAM, Recovery und Fan-out Evidence freigegeben.",
  "deliverables": [
    "Valkey/Redis-kompatibler SET/GET/PUBLISH Benchmark",
    "NATS Core/JetStream PubAck/Replay Benchmark",
    "Fan-out Messung 1/10/32 Consumer",
    "Asset-Skalen 3/100/200/400"
  ]
},
{
  "id": "CA-TRUST-WORK-VERIFICATION",
  "title": "WORK_VERIFICATION@1 an GitHub DevSecOps und Release Evidence binden",
  "owner": "TRUST",
  "status": "planning",
  "phase": 4,
  "phaseName": "Phase 4: DevSecOps & RC",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "evidenceRefs": [
    "docs/governance/WORK-VERIFICATION.md",
    "docs/security/PRODUCTION-HANDOFF.md"
  ],
  "nextStep": "Domain-Labels/Project-Views providerseitig anlegen, dann PR→Checks→SBOM→Attestation→GHCR→Render→Runtime-Readback als ein Evidence-Objekt korrelieren.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Phase 4",
  "description": "Work Verification beweist den vollständigen Weg vom Repository bis zur Release Evidence; es ersetzt keine bestehenden Required Checks.",
  "deliverables": [
    "Domain-Labels PRODUCT/MARKET/PLATFORM/TRUST/GROWTH",
    "Projektansichten je Domain",
    "Tested SHA, SBOM, OCI Digest, Attestation, Runtime Source SHA und Deploy-ID"
  ]
},
{
  "id": "CA-PLATFORM-DR-RECOVERY",
  "title": "Infrastruktur-Backup und Disaster-Recovery isoliert verifizieren",
  "owner": "PLATFORM",
  "status": "planning",
  "phase": 5,
  "phaseName": "Phase 5: Production Go-Live",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "evidenceRefs": [
    "docs/architecture/INFRASTRUCTURE-BACKUP-RECOVERY.md"
  ],
  "nextStep": "Datenbankexport, kritische Storage-Objekte, JetStream File Store und einen attestierten GHCR-Digest in isolierter Recovery-Umgebung wiederherstellen und RTO/RPO messen.",
  "priority": "Kritisch",
  "leadName": "Projektowner",
  "targetSprint": "Vor Production-Handoff",
  "description": "Supabase, ZITADEL-Konfiguration, JetStream und Runtime-Artefakte erhalten getrennte Recovery-Pfade; Valkey bleibt rekonstruierbarer Cache.",
  "deliverables": [
    "Extern verifizierter Datenbank-/Storage-Backup",
    "JetStream Backup/Restore + Replay Hashprüfung",
    "Identity-Konfigurations-Recovery ohne Passwort-Export",
    "Known-good GHCR Digest Recovery"
  ]
},
{
  "id": "CA-PLATFORM-EDGE-CACHE",
  "title": "Render Edge Caching für statische Assets kontrolliert evaluieren",
  "owner": "PLATFORM",
  "status": "planning",
  "phase": 4,
  "phaseName": "Phase 4: DevSecOps & RC",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "evidenceRefs": [
    "server/index.mjs"
  ],
  "nextStep": "Render-Profil 'Common static files' gegen no-cache messen; HTML/Auth/API/Session weiterhin no-store halten. Provideränderung erst nach Owner-Freigabe und Readback.",
  "priority": "Mittel",
  "leadName": "Projektowner",
  "targetSprint": "Nach Runtime-Handoff",
  "description": "Aktueller Render-Readback steht auf no-cache. All-files Caching bleibt wegen dynamischer Auth-/API-Pfade ausgeschlossen.",
  "deliverables": [
    "Cache-Control Matrix",
    "Cache hit/miss + Latenzvergleich",
    "Auth-/API-No-Cache Regression",
    "Rollback auf no-cache"
  ]
},
{
  "id": "CA-MARKET-GHCR-BLUEPRINT-APP",
  "title": "[CAPITAL-AI-MARKET]GHCR-DIGEST-BLUEPRINT-MARKETPLACE-APP",
  "owner": "MARKET",
  "status": "planning",
  "phase": 4,
  "phaseName": "Phase 4: DevSecOps & RC",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "evidenceRefs": [
    "docs/product/MONETIZABLE-PRODUCT-REGISTRY.md",
    "docs/governance/WORK-VERIFICATION.md"
  ],
  "nextStep": "Repository→Build→SBOM→Scan→Attestation→Digest→Blueprint→Runtime→Source SHA→Release Evidence als App-Contract und Marketplace-fähige API spezifizieren.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Nach interner Work-Verification Abnahme",
  "description": "Monetarisierbare GitHub App für immutable Release Evidence; Build-once/Promote-many und fail-closed Identity bleiben unverändert.",
  "deliverables": [
    "GitHub App Permission Matrix",
    "Immutable Digest Evidence API",
    "Render Blueprint Adapter",
    "Marketplace Packaging"
  ],
  "dependencies": ["CA-TRUST-WORK-VERIFICATION"]
},

{
  "id": "CA-PLATFORM-TS-APP-BOUNDARY",
  "title": "TypeScript App-Boundary bis sichere native TS7-Migration halten",
  "owner": "PLATFORM",
  "status": "aktiv",
  "phase": 4,
  "phaseName": "Phase 4: DevSecOps & RC",
  "progressPercent": null,
  "evidenceState": "GEHALTEN",
  "evidenceRefs": [
    "docs/architecture/TYPESCRIPT-APP-BOUNDARY-DECISION.md",
    "scripts/verify-browser-boundary.mjs",
    "scripts/benchmark-browser-boundary.mjs"
  ],
  "nextStep": "Neue TS7-Version/native Artefakte erneut auf Provenance, Binary Reachability und Security prüfen; danach Typecheck-Performance und Oxc-Boundary gegen dieselben Fixtures benchmarken.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Bei sicherem TypeScript-Update",
  "description": "Die bestehende TypeScript-6-App-Boundary bleibt aktiv. Der native Go-Compiler von TS7 wird trotz Upstream-Performancevorteil nicht promoted, solange das exakte Binary-TRUST-Gate blockiert.",
  "deliverables": [
    "Boundary-Parität auf positiven/negativen Fixtures",
    "TS6 vs native TS7 Typecheck Benchmark",
    "Oxc/Oxlint Boundary CADS Challenge",
    "Rollback auf stabile Boundary"
  ]
},
...SOCIAL_CONTENT_WORK_PACKAGES,
...BACKLOG_TARGETS,
];
