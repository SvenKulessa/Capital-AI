/**
 * CAPITAL AI — ROADMAP & WORK PACKAGES DATA REPOSITORY
 * 
 * Filterbar nach:
 * 1. Projektowner: Governance, Operation, Frontend, Dokumente, SEO, SOCIAL, Security,
 *    Compliance, Fintech, Agent-Client, Qualitätmanagement
 * 2. Nachweiszustand: VERIFIED, OFFEN, GEHALTEN, UNGEKLÄRT
 * 3. Phase / Stage: 5 geplante Phasen bis zum Version 1.0 Production Go-Live
 */

export type ProjectOwner =
  | 'Governance'
  | 'Operation'
  | 'Frontend'
  | 'Dokumente'
  | 'SEO'
  | 'SOCIAL'
  | 'Security'
  | 'Compliance'
  | 'Fintech'
  | 'Agent-Client'
  | 'Qualitätmanagement';

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
    name: 'Phase 1: Foundation, Core Engine & Ingestion Pipeline',
    shortTitle: '1. Foundation',
    description: 'Architektur-Fundament mit Ringpuffer, Provider Gateways (TwelveData, FRED) und Sub-45ms Tick-Normalisierung.',
    targetRelease: 'v0.8-alpha',
    completionPercent: null,
    status: 'in_progress',
  },
  {
    phase: 2,
    id: 'phase-2',
    name: 'Phase 2: Multi-Asset Screener & BaFin Compliance Hardening',
    shortTitle: '2. Screener & Compliance',
    description: '16 kanonische Datenkonzepte, 50-Faktoren Multi-Asset Scorer, WORM Audit Logs nach WpHG § 83 & MaRisk.',
    targetRelease: 'v0.9-beta',
    completionPercent: null,
    status: 'in_progress',
  },
  {
    phase: 3,
    id: 'phase-3',
    name: 'Phase 3: AI Agent-Client & Studio Hub Synthesizer',
    shortTitle: '3. AI Agent & Studio Hub',
    description: 'Gemini-gestützter Kaufberater mit Scientist Reasoning, 7 Blueprints, modularer Pipeline Builder und AP-006 Budget Cap.',
    targetRelease: 'v0.9.5-rc1',
    completionPercent: null,
    status: 'in_progress',
  },
  {
    phase: 4,
    id: 'phase-4',
    name: 'Phase 4: Security, Evidence Merkle Trees, SEO & Social',
    shortTitle: '4. Security & Ecosystem',
    description: 'SHA-256 Merkle Proofs, On-Chain Whale Radar, Schema.org SEO Structured Data, Telegram Whale Alert Bot Integration.',
    targetRelease: 'v0.9.9-rc2',
    completionPercent: null,
    status: 'in_progress',
  },
  {
    phase: 5,
    id: 'phase-5',
    name: 'Phase 5: Release Candidate & Production Go-Live v1.0',
    shortTitle: '5. v1.0 Production Launch',
    description: 'Ziel: Release-Abnahme für Render mit Sicherheits-, Lizenz-, Identitäts-, Domain- und Wiederherstellungsnachweisen.',
    targetRelease: 'v1.0.0-final',
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
    id: 'Governance',
    label: 'Governance',
    lead: 'Projektinhaber',
    badgeColor: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
    description: 'Projektentscheidungen, Freigaben und nachvollziehbare Verantwortungszuordnung.',
  },
  {
    id: 'Operation',
    label: 'Operation',
    lead: 'DevOps & Site Reliability Team',
    badgeColor: 'border-blue-400/40 bg-blue-400/10 text-blue-300',
    description: 'Render-Dienste, Deployment, Infrastrukturprüfung und Wiederherstellung.',
  },
  {
    id: 'Frontend',
    label: 'Frontend',
    lead: 'Lead UI/UX Engineer',
    badgeColor: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300',
    description: 'Dark-Terminal UI, Tailwind CSS, Responsive Viewports, Micro-Interactions & Screener Visuals.',
  },
  {
    id: 'Dokumente',
    label: 'Dokumente',
    lead: 'Technical Documentation & Legal Docs',
    badgeColor: 'border-indigo-400/40 bg-indigo-400/10 text-indigo-300',
    description: 'Architektur-Blueprints, BaFin Prüfhandbuch, API-Referenzen, PDF Evidence & WORM Dokumentation.',
  },
  {
    id: 'SEO',
    label: 'SEO',
    lead: 'Search Growth & Crawlability Lead',
    badgeColor: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
    description: 'Schema.org JSON-LD Structured Data, OpenGraph Share Cards, Canonical URLs & Keyword-Indexierung.',
  },
  {
    id: 'SOCIAL',
    label: 'SOCIAL',
    lead: 'Community & Ecosystem Relations',
    badgeColor: 'border-pink-400/40 bg-pink-400/10 text-pink-300',
    description: 'Telegram Whale Radar Alerts Bot, Twitter/X Card Sharing, Community Feed & On-Chain Broadcasts.',
  },
  {
    id: 'Security',
    label: 'Security',
    lead: 'Chief Information Security Officer (CISO)',
    badgeColor: 'border-rose-400/40 bg-rose-400/10 text-rose-300',
    description: 'SHA-256 Merkle-Chain Proofs, Zero-Trust RBAC, TLS 1.3 Strict, API Masking & OWASP Hardening.',
  },
  {
    id: 'Compliance',
    label: 'Compliance',
    lead: 'Chief Compliance Officer (CCO)',
    badgeColor: 'border-purple-400/40 bg-purple-400/10 text-purple-300',
    description: 'BaFin MaRisk Mindestanforderungen, WpHG § 83 Aufzeichnungspflichten & MiCA Krypto-Regulierung.',
  },
  {
    id: 'Fintech',
    label: 'Fintech',
    lead: 'Quantitative Financial Engineer',
    badgeColor: 'border-yellow-400/40 bg-yellow-400/10 text-yellow-300',
    description: 'Echtzeit-Scoring, Buffett DCF Algorithmen, Volatilitäts-Filter, Outlier-Erkennung & Provider-Fleet.',
  },
  {
    id: 'Agent-Client',
    label: 'Agent-Client',
    lead: 'AI Systems Architect',
    badgeColor: 'border-violet-400/40 bg-violet-400/10 text-violet-300',
    description: 'Gemini-3.8-Flash Kaufberater, Scientist Reasoning Engine, BOM Tool Catalog & Revenue Assurance.',
  },
  {
    id: 'Qualitätmanagement',
    label: 'Qualitätmanagement',
    lead: 'Quality Assurance & Audit Team',
    badgeColor: 'border-teal-400/40 bg-teal-400/10 text-teal-300',
    description: 'End-to-End Testautomatisierung, Schema Validation Suites, Contract Verifikation & Stresstests.',
  },
];

const BACKLOG_TARGETS: WorkPackage[] = [
  // =========================================================================
  // 1. GOVERNANCE (GF & Founder)
  // =========================================================================
  {
    id: 'AP-GOV-01',
    title: 'BaFin MaRisk Governance & GF Freigabe-Matrix',
    owner: 'Governance',
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
    owner: 'Governance',
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
    owner: 'Governance',
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
    title: 'Cloud Run Auto-Healing & Container Zero-Scale Optimization',
    owner: 'Operation',
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
    description: 'Geplantes Ziel, Abnahme offen: Betrieb der Next-Gen Containerlandschaft auf Cloud Run (Region europe-west2) mit automatischem Health-Check und Sub-Second Kaltstart.',
    deliverables: [
      'Docker Multi-Stage Build (<120MB Image)',
      'Automatisches Rollback bei ungesunden Pods',
      'Sub-45ms Latenz-Proxy Routen zu Gemini & Ingestion-Feeds',
    ],
    bafinStandard: 'BaFin BAIT Auslagerungsmanagement',
  },
  {
    id: 'AP-OPS-02',
    title: 'Echtzeit-Fleet Monitoring & Latenz-Telemetrie Dashboard',
    owner: 'Operation',
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
    title: 'Multi-Region Failover & Disaster Recovery Plan für v1.0',
    owner: 'Operation',
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
    description: 'Geplantes Ziel, Abnahme offen: Automatisierte Umschaltung auf Standby-Knoten in Frankfurt (europe-west3) bei Rechenzentrumsausfall in London.',
    deliverables: [
      'RTO < 30 Sekunden / RPO = 0 Sekunden Spezifikation',
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
    owner: 'Frontend',
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
    owner: 'Frontend',
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
    owner: 'Frontend',
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
    description: 'Geplantes Ziel, Abnahme offen: Entwicklung der Management-Konsole mit filterbarer Roadmap nach 11 Projektownern, 3 Status und 5 Phasen bis v1.0.',
    deliverables: [
      'Filter-Matrix nach Owner, Status und Phase',
      'Executive Cockpit für Geschäftsführer und Team',
      'Visuelle Phasen-Pipeline mit Fortschrittsanzeige',
    ],
  },
  {
    id: 'AP-FE-04',
    title: 'PWA Offline Caching & Mobile Touch Gestures für v1.0',
    owner: 'Frontend',
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
    owner: 'Dokumente',
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
    owner: 'Dokumente',
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
    owner: 'Dokumente',
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
    owner: 'SEO',
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
    owner: 'SEO',
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
    owner: 'SEO',
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
    owner: 'SOCIAL',
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
    owner: 'SOCIAL',
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
    owner: 'SOCIAL',
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
    owner: 'Security',
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
    owner: 'Security',
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
    owner: 'Security',
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

  // =========================================================================
  // 8. COMPLIANCE (Regulatory, BaFin & MiCA)
  // =========================================================================
  {
    id: 'AP-CMP-01',
    title: 'BaFin MaRisk Mindestanforderungen an das Risikomanagement',
    owner: 'Compliance',
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
    owner: 'Compliance',
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
    owner: 'Compliance',
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
    owner: 'Fintech',
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
    owner: 'Fintech',
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
    owner: 'Fintech',
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
    owner: 'Agent-Client',
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
    owner: 'Agent-Client',
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
    owner: 'Agent-Client',
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
    owner: 'Qualitätmanagement',
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
    owner: 'Qualitätmanagement',
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
    owner: 'Qualitätmanagement',
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
  "sourceSha": "090b00bb432e329daf62129d10d2c5ca041662b6",
  "reviewDate": "2026-09-30",
  "scope": "Repository-Implementierung; Betriebsabnahmen separat",
  "securitySourceSha": "46ee077dea184a5defa84ef028fb93e3ac73fad5",
  "openPullRequests": [
    38,
    39
  ]
} as const;

export const WORK_PACKAGES: WorkPackage[] = [
{
  "id": "AP-CMP-LEGAL",
  "title": "Rechtstexte aus Finance übernommen und an ZITADEL angepasst",
  "owner": "Compliance",
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
  "owner": "Compliance",
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
  "owner": "Compliance",
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
  "owner": "Frontend",
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
  "owner": "Frontend",
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
  "owner": "Security",
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
  "owner": "Fintech",
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
  "owner": "Fintech",
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
  "owner": "Operation",
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
  "owner": "Security",
  "status": "pending",
  "phase": 4,
  "phaseName": "Phase 4: Security & Ecosystem",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "evidenceRefs": [
    "https://github.com/SvenKulessa/Capital-AI/actions/runs/36715472658",
    "docs/security/RENDER-IMAGE-REVIEW.md"
  ],
  "nextStep": "Freigegebenen Sicherheitsworkflow auf dem finalen Main ausführen und Imageidentität korrelieren.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Nicht terminiert",
  "description": "Der letzte erfolgreiche Dockerlauf 36715472658 gehört zu 46ee077dea184a5defa84ef028fb93e3ac73fad5. Für den gelesenen aktuellen Main fehlt ein gleichwertiger exakter Image-/SBOM-/CVE-Nachweis.",
  "deliverables": [
    "Freigegebenen Sicherheitsworkflow auf dem finalen Main ausführen und Imageidentität korrelieren."
  ]
},
{
  "id": "AP-CMP-RIGHTS",
  "title": "Container-, Asset- und Marktdatenrechte abschließen",
  "owner": "Compliance",
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
  "owner": "Compliance",
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
  "owner": "Operation",
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
  "owner": "Operation",
  "status": "pending",
  "phase": 5,
  "phaseName": "Phase 5: Production Go-Live",
  "progressPercent": null,
  "evidenceState": "OFFEN",
  "evidenceRefs": [
    "deploy/DNS-CUTOVER.md",
    "docs/security/DOMAIN-MIGRATION.md"
  ],
  "nextStep": "Domainbindungen und DNS frisch sichern, ZITADEL-Callback prüfen, gezielt umstellen und HTTPS/Login/Export abnehmen.",
  "priority": "Hoch",
  "leadName": "Projektowner",
  "targetSprint": "Nicht terminiert",
  "description": "Der letzte HTTPS-Readback um 15:33 Uhr Berlin zeigte auf capital-ai.online noch Finance mit Supabase. Ein vorhandener Login im neuen Dienst belegt keinen Domaintransfer.",
  "deliverables": [
    "Domainbindungen und DNS frisch sichern, ZITADEL-Callback prüfen, gezielt umstellen und HTTPS/Login/Export abnehmen."
  ]
},
{
  "id": "AP-CMP-OLD-DATA",
  "title": "Finance-Altdaten und bestehende Verträge weiter bearbeitbar halten",
  "owner": "Compliance",
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
  "owner": "Operation",
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
  "targetSprint": "Nicht terminiert",
  "description": "Finance bleibt bis zur Abnahme von Domain, TLS, Login, Datenauszug, erforderlichem Datenzugriff und Altdatenbearbeitung aktiv.",
  "deliverables": [
    "Nach dokumentierter Abnahme nur den vorgesehenen Finance-Service suspendieren; Rückweg prüfen."
  ]
},
{
  "id": "AP-SEC-AUTH-LIVE",
  "title": "ZITADEL-Login und eigener Export auf der Hauptdomain abnehmen",
  "owner": "Security",
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
