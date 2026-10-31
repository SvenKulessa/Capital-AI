/**
 * Source-bound, read-only routing between the existing Roadmap, domain skills and
 * checked repository entrypoints. This is not a license grant or runtime executor.
 */
export type RoadmapDomain = 'PRODUCT' | 'GROWTH' | 'PLATFORM' | 'TRUST';
export type RoadmapWorkstream = {
  id: 'learning' | 'blueprints' | 'social' | 'seo' | 'security';
  label: string;
  priority: 'P0' | 'P1' | 'P2';
  domain: RoadmapDomain;
  roadmapId: string;
  purpose: string;
  skills: readonly string[];
  sourcePaths: readonly string[];
  destination: string;
  destinationLabel: string;
  nextGate: string;
  revenuePath: string;
};
export type OrchestratorCandidate = {
  id: string;
  name: string;
  role: string;
  license: string;
  licenseUrl: string;
  mode: 'EXISTING_REPO' | 'CANDIDATE_NOT_INSTALLED';
  costBoundary: string;
  scope: readonly RoadmapWorkstream['id'][];
};

export const ROADMAP_TOOL_WORKSTREAMS: readonly RoadmapWorkstream[] = [
  {
    id: 'learning', label: 'Learning Portal & Benutzerisolation', priority: 'P0', domain: 'PRODUCT',
    roadmapId: 'COMMERCE-LEARNING',
    purpose: 'Entitlements, private Notizen und nachvollziehbare Lern-Conversion prüfen',
    skills: ['product-engineering', 'trust-engineering', 'accessibility-engineering', 'revenue-engineering'],
    sourcePaths: ['src/features/learning/LearningPortalPage.tsx', 'src/features/account/PrivateDashboardPage.tsx', 'server/vocabulary-checkout.mjs'],
    destination: '/learning', destinationLabel: 'Learning Hub öffnen',
    nextGate: 'Server-Entitlement, Cross-User-Tests und realen Checkout nachweisen',
    revenuePath: 'Bestehende Learning-Angebote; keine neuen SKU- oder Zertifikatsclaims',
  },
  {
    id: 'blueprints', label: 'Blueprints & 50 Analysekomponenten', priority: 'P0', domain: 'PRODUCT',
    roadmapId: 'CA-PRODUCT-BLUEPRINT-COMMERCE-EVIDENCE',
    purpose: 'Lizenz- und Entitlement-gebundene Blueprint-Auslieferung',
    skills: ['product-engineering', 'market-engineering', 'legal-compliance'],
    sourcePaths: ['src/features/analysis/AnalysisComponentExplorer.tsx', 'server/blueprint-commerce.mjs'],
    destination: '/architecture-hub', destinationLabel: 'Architektur-Hub öffnen',
    nextGate: 'SKU, Rechte, Kundenauslieferung und Checkout-Evidence vor Verkauf verifizieren',
    revenuePath: 'Blueprint-Anfrage, bis SKU-/Lizenz-/Lieferrechte nachgewiesen sind',
  },
  {
    id: 'social', label: 'PR-Merges → Social Drafts → CADS', priority: 'P1', domain: 'GROWTH',
    roadmapId: 'CONTENT-SOCIAL-PIPELINE',
    purpose: 'Quellengebundene Nachrichten, Branding und veröffentlichungsgetrennte Draft-Pipeline',
    skills: ['growth-engineering', 'ai-engineering', 'accessibility-engineering', 'legal-compliance'],
    sourcePaths: ['scripts/growth/pr-merge-social-batch.mjs', 'src/features/studio/ContentStudioPanel.tsx'],
    destination: '/studio?tab=content', destinationLabel: 'Content Studio öffnen',
    nextGate: 'Providerrechte, CADS-Asset-Evidence, API-Kosten und Publisher-Receipt getrennt prüfen',
    revenuePath: 'Learning-Leads und quellengebundene Inhalte; Veröffentlichung niemals aus diesem Katalog',
  },
  {
    id: 'seo', label: 'SEO, Canonicals & Discovery', priority: 'P1', domain: 'GROWTH',
    roadmapId: 'SEARCH-SEO',
    purpose: 'Search-Intent, kanonische Seiten und consent-basierte Attribution',
    skills: ['seo-engineering', 'growth-engineering', 'analytics-intelligence'],
    sourcePaths: ['shared/seo-content-manifest.mjs', 'scripts/seo-source-provenance-drift.test.mjs'],
    destination: '/learning', destinationLabel: 'Öffentlichen Learning-Einstieg öffnen',
    nextGate: 'GSC-Crawl-Readback und GA4-Konsent vor Performance-Aussagen verifizieren',
    revenuePath: 'Organische Learning-Discovery mit belegten Kaufereignissen',
  },
  {
    id: 'security', label: 'Security, Supply Chain & Recovery', priority: 'P0', domain: 'PLATFORM',
    roadmapId: 'WEBSITE-CORRECTNESS',
    purpose: 'CI, SHA-provenance, Restore und technische Trust-Grenzen',
    skills: ['platform-engineering', 'trust-engineering', 'incident-response'],
    sourcePaths: ['AGENTS.md', '.github/workflows/build-security.yml'],
    destination: '/control-center/observability', destinationLabel: 'Observability öffnen',
    nextGate: 'Required Checks, Backup-/Restore-Evidence und Production-Readback nachweisen',
    revenuePath: 'Betriebsverlässlichkeit, keine ungeprüften Security-Zertifikate',
  },
] as const;

export const ROADMAP_ORCHESTRATORS: readonly OrchestratorCandidate[] = [
  {
    id: 'node-existing', name: 'Node.js Promise.all (bestehender Worker)',
    role: 'Deterministische parallele, begrenzte PR-/Social-Draft-Aufgaben',
    license: 'Bestehende Runtime – keine neue Drittanbieter-Komponente',
    licenseUrl: 'https://nodejs.org/en/about',
    mode: 'EXISTING_REPO', costBoundary: 'Keine neue Lizenzgebühr; GitHub-Actions-Minuten und externe Worker-APIs kostenabhängig',
    scope: ['social', 'seo', 'security'],
  },
  {
    id: 'langgraph', name: 'LangGraph JS',
    role: 'Agent-/Skill-Graphen und nachvollziehbare Zwischenschritte, nicht als Publisher',
    license: 'MIT (Core)', licenseUrl: 'https://github.com/langchain-ai/langgraphjs/blob/main/LICENSE',
    mode: 'CANDIDATE_NOT_INSTALLED',
    costBoundary: 'Open-Source-Code ohne Lizenzgebühr; Hosting, LLM-Token und externe Integrationen separat',
    scope: ['social', 'learning', 'blueprints'],
  },
  {
    id: 'temporal', name: 'Temporal TypeScript SDK',
    role: 'Dauerhafte, wiederaufnehmbare Worker-Abläufe mit Retry-/Timeout-Grenzen',
    license: 'MIT (SDK und Server)', licenseUrl: 'https://github.com/temporalio/sdk-typescript/blob/main/LICENSE',
    mode: 'CANDIDATE_NOT_INSTALLED',
    costBoundary: 'Self-Hosting benötigt Server, Speicher, Worker und Monitoring; Cloud-Angebote kostenpflichtig',
    scope: ['social', 'blueprints', 'security'],
  },
  {
    id: 'flowise', name: 'Flowise Community',
    role: 'Optionales visuelles Design für Lern-/Content-Agent-Flows',
    license: 'Apache-2.0 (Community-Code; Enterprise separat)',
    licenseUrl: 'https://github.com/FlowiseAI/Flowise/blob/main/LICENSE.md',
    mode: 'CANDIDATE_NOT_INSTALLED',
    costBoundary: 'Self-Hosting/LLM-APIs und Enterprise-Funktionen separat; exakte Paket-/Lizenzversion prüfen',
    scope: ['social', 'learning'],
  },
] as const;

export function routeRoadmapTools(id: RoadmapWorkstream['id']) {
  const workstream = ROADMAP_TOOL_WORKSTREAMS.find(item => item.id === id);
  if (!workstream) throw new Error('UNKNOWN_ROADMAP_WORKSTREAM');
  return { workstream, candidates: ROADMAP_ORCHESTRATORS.filter(item => item.scope.includes(id)) };
}

export function repoPathsPresent(paths: readonly string[], entryPaths: readonly string[]): number {
  return paths.filter(path => entryPaths.some(entry => entry === path || entry.startsWith(path + ' → '))).length;
}
