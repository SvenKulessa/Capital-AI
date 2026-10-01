/**
 * CAPITAL AI — RELEASE-ORIENTIERTE ROADMAP
 *
 * Primäre Domains: PRODUCT, MARKET, PLATFORM, TRUST, GROWTH.
 * Domain = fachliche Orientierung, keine künstliche Teamgrenze.
 * Release-Ziele verwenden SemVer; Betriebsfreigaben bleiben evidenzgebunden.
 */

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
  description: string;
}[] = [
  {
    id: 'PRODUCT',
    label: 'CAPITAL-AI-PRODUCT',
    lead: 'Owner + AI Apps',
    badgeColor: 'border-pink-400/40 bg-rose-950/40 text-pink-300',
    description: 'Frontend, Agent Client, UX, Konto/Profil und produktnahe Nutzerflüsse.',
  },
  {
    id: 'MARKET',
    label: 'CAPITAL-AI-MARKET',
    lead: 'Owner + AI Apps',
    badgeColor: 'border-teal-400/40 bg-teal-950/40 text-teal-300',
    description: 'Fintech, Provider, Scoring, Screener, Market Data und Daten-Evidence.',
  },
  {
    id: 'PLATFORM',
    label: 'CAPITAL-AI-PLATFORM',
    lead: 'Owner + AI Apps',
    badgeColor: 'border-violet-400/40 bg-violet-950/40 text-violet-300',
    description: 'Render, Docker/OCI, GHCR, NATS, Valkey, CI/CD, Observability und Release Automation.',
  },
  {
    id: 'TRUST',
    label: 'CAPITAL-AI-TRUST',
    lead: 'Owner + AI Apps',
    badgeColor: 'border-slate-300/40 bg-slate-800/40 text-slate-200',
    description: 'Security, Compliance, Governance, QA, Supply Chain und Evidenz-Gates.',
  },
  {
    id: 'GROWTH',
    label: 'CAPITAL-AI-GROWTH',
    lead: 'Owner + AI Apps',
    badgeColor: 'border-amber-400/40 bg-amber-950/40 text-amber-300',
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
    description: 'Geplantes Ziel, Abnahme offen: Generierung hochauflösender Vorschaubilder (1200x630) bei Teilung von Scre…10534 tokens truncated…m Login und Logout auf dem Zielhost abnehmen."
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
    "server/auth.test.mjs"
  ],
  "nextStep": "Login, Logout, Wiederanmeldung und Sessionbindung auf capital-ai.online dokumentieren.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Nicht terminiert",
  "description": "Authorization Code mit PKCE, Tokenprüfung und geschützte serverseitige Sitzungen sind implementiert. Repo-Nachweis und erfolgreiche produktive Anmeldung sind getrennte Prüfungen.",
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
  "description": "Clients, Verträge, Evidence-Replay und Pub/Sub sind integriert. Dieser Eintrag bestätigt die Implementierung, keine produktiv funktionierende NATS-Verbindung.",
  "deliverables": [
    "Produktive Verbindung, dauerhaftes Replay und Fehlerfälle prüfen."
  ]
},
{
  "id": "AP-OPS-CURRENT",
  "title": "Main und Capital-AI-Deployment korrelieren",
  "owner": "PLATFORM",
  "status": "aktiv",
  "phase": 1,
  "phaseName": "Phase 1: Foundation",
  "progressPercent": 100,
  "evidenceState": "VERIFIED",
  "evidenceRefs": [
    "https://dashboard.render.com/web/srv-dau1rp893c1s73cdhm1g"
  ],
  "nextStep": "Nach Merge dieser Roadmap den neuen Main mit dem Deployment abgleichen.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Nicht terminiert",
  "description": "Beim Render-Readback am 30.09.2026 entsprach das Live-Deployment dep-daugip893c1s73e5rgug dem Main 090b00bb432e329daf62129d10d2c5ca041662b6. Dies ist ein Snapshot, keine laufende Synchronisation.",
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
    "docs/security/DIGEST-LIVE-READBACK-20261001.md"
  ],
  "nextStep": "Owner-Lizenzabnahme und aktuelle Runtime-/Analyse-Evidence schließen; anschließend freigegebenen Kandidaten am finalen Main einmal publishen und denselben Digest abnehmen.",
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
  "title": "Produktive NATS-Verbindung und Replay abnehmen",
  "owner": "PLATFORM",
  "status": "pending",
  "phase": 1,
  "phaseName": "Phase 1: Foundation",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "evidenceRefs": [
    "deploy/VALKEY-PUBSUB-NATS-HANDOFF.md",
    "deploy/render-nats.yaml"
  ],
  "nextStep": "Dienste und Verbindung frisch lesen; Token nur im Secret Store setzen; PubAck, Restart und Replay prüfen.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Nicht terminiert",
  "description": "NATS ist im Repository vorbereitet. Der letzte HTTP-Readback um 15:33 Uhr Berlin meldete NATS unavailable und Infrastruktur degraded; dies ist kein aktueller Verbindungstest.",
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
    "docs/security/DOMAIN-MIGRATION.md"
  ],
  "nextStep": "Read-only Bestandsaufnahme und Cutover-/Rollback-Plan vorbereiten. Umschaltung erst nach AP-SEC-IMAGE, Lizenz-, Domain-/Auth-/Mail-Abnahme; Finance erhalten.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Nach Digest-/Lizenzabnahme; abgestimmtes Migrationsfenster",
  "description": "Der letzte HTTPS-Readback um 15:33 Uhr Berlin zeigte auf capital-ai.online noch Finance mit Supabase. Ein vorhandener Login im neuen Dienst belegt keinen Domaintransfer.",
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
    "CA-PLATFORM-IONOS-SMTP"
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
    "docs/compliance/ZITADEL-PRIVACY-CUTOVER-20260930.md",
    "deploy/DNS-CUTOVER.md"
  ],
  "nextStep": "Echten Login, eigenen Export, Logout und anschließendes 401 auf capital-ai.online prüfen.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Nicht terminiert",
  "description": "Eine vom Nutzer gemeldete erfolgreiche Anmeldung wird nicht als vollständig geprüfter Login-/Logout-/Export-Ablauf auf der migrierten Hauptdomain ausgegeben.",
  "deliverables": [
    "Echten Login, eigenen Export, Logout und anschließendes 401 auf capital-ai.online prüfen."
  ]
},
...BACKLOG_TARGETS,
];
