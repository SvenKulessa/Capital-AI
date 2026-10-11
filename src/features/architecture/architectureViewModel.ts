import { CANONICAL_50_COMPONENTS, type AnalysisComponentRegistryEntry } from '../../contracts/analysisComponentRegistry';
import { STUDIO_BLUEPRINTS, type StudioBlueprint } from '../../data/studioData';
import { BLUEPRINT_EVIDENCE_CONTRACTS } from '../../data/blueprintEvidenceContracts';

/** Canonical registry data is the source of truth; this module adds read-only projections. */
export const ARCHITECTURE_COMPONENTS = CANONICAL_50_COMPONENTS;
export const ARCHITECTURE_BLUEPRINTS = STUDIO_BLUEPRINTS;

export type ArchitectureView = 'overview' | 'catalogs' | 'blueprints' | 'components' | 'learning' | 'explainability';

/** Public documentation links only: the files on main are not private buyer artifacts. */
export const ARCHITECTURE_CATALOGS = [
  { id: 'components', title: 'Komponentenkatalog', file: 'COMPONENT-CATALOG.md', scope: '50 Analyseverträge: Input, Output, Features, Gewichte und Qualitätsgrenzen' },
  { id: 'providers', title: 'Providerkatalog', file: 'PROVIDER-CATALOG.md', scope: 'Datenquellen, Rechte, Instrumente und getrennte private BYOK-Grenzen' },
  { id: 'scoring', title: 'Scoringkatalog', file: 'SCORING-CATALOG.md', scope: 'Formeln, Gewichtungsprofile, Research- und Risiko-Gates' },
  { id: 'blueprints', title: 'Blueprintkatalog', file: 'BLUEPRINT-CATALOG.md', scope: 'Sieben Architekturentwürfe, Evidenzverträge und Auslieferungsgrenzen' },
  { id: 'learning', title: 'Learning-Pfade', file: 'LEARNING-PATHS.md', scope: 'Sechs bestehende Lernschritte und geplante Vertiefungen' },
] as const;

const CATALOG_REPOSITORY_ROOT = 'https://github.com/SvenKulessa/Capital-AI/blob/main/CAPITAL-AI-MARKET/';
export function architectureCatalogUrl(file: string): string | null {
  return ARCHITECTURE_CATALOGS.some((entry) => entry.file === file)
    ? CATALOG_REPOSITORY_ROOT + file : null;
}
export function filterArchitectureCatalogs(query: string) {
  const needle = query.trim().toLocaleLowerCase('de');
  return ARCHITECTURE_CATALOGS.filter((item) =>
    !needle || [item.title, item.file, item.scope].join(' ').toLocaleLowerCase('de').includes(needle));
}

/** Discovery links, not purchase grants. The server remains the entitlement authority. */
export const ARCHITECTURE_PRODUCT_PATHS = [
  { id: 'free', title: 'Finanzmethodik kostenlos lernen', path: '/learning', state: 'PUBLIC_EDUCATION', detail: 'Sechs kostenlose Grundlagen; alle Übungszahlen synthetisch.' },
  { id: 'learning', title: 'Bestehendes Learning-Angebot', path: '/learning?tab=glossar#learning-offer', state: 'SERVER_ENTITLEMENT_REQUIRED', detail: 'Zugang, Preis und Kaufbedingungen im Learning Portal prüfen; keine automatische Freischaltung.' },
  { id: 'blueprint', title: 'Blueprint-Konzept entdecken', path: '/marketscreener/dokumentation', state: 'DELIVERY_BLOCKED', detail: 'Öffentliche Konzeptvorschau. Kein bezahlbarer Download und keine enthaltenen Marktdatenrechte.' },
  { id: 'inquiry', title: 'Individuelle Blueprint-Anfrage', path: '/kontakt', state: 'INQUIRY_ONLY', detail: 'Anforderungen unverbindlich besprechen; Anfrage ist kein Kauf oder Liefervertrag.' },
] as const;
export type EvidenceLabel = 'BLOCKED' | 'NOT_PROVEN';

export const DATA_FLOW_STAGES = [
  { id: 'provider', title: 'Provider', description: 'Quellendaten mit Lizenzumfang, Instrument-Identität und Zeitstempel. Provider im Registry-Vertrag sind nur Kandidaten – keine aktuell benutzte Datenquelle.', contract: 'DataProvenance' },
  { id: 'data', title: 'Data Layer', description: 'Normalisierung, Quality Gate und Freshness; abgelehnte oder unzureichende Daten werden nicht still als Null-Score interpretiert.', contract: 'FeatureValue' },
  { id: 'analysis', title: 'Analysis Layer', description: 'Versionierte Features pro Instrument und Rechenmodell; keine Vermischung mit Provider-Secrets.', contract: 'AnalysisComponentRegistryEntry' },
  { id: 'scoring', title: 'Scoring Layer', description: 'Gewichtungen, Veto, Konfidenz und Risiko-Penalty. Eine registrierte Gewichtung ist keine bestätigte reale Score-Berechnung.', contract: 'FinalRankResult' },
  { id: 'evidence', title: 'Evidence Layer', description: 'Provenienz, Ergebnisstatus, Reproduzierbarkeit und Eligibility. Fehlende oder veraltete Nachweise sperren eine handlungsrelevante Veröffentlichung.', contract: 'ScoreResult / evidenceId' },
] as const;

export const ARCHITECTURE_LESSONS = [
  { id: 'sources', title: '1 · Woher kommen Daten?', goal: 'Datenquelle, Lizenz und Verfügbarkeit unterscheiden', detail: 'Provider-Abhängigkeiten im Katalog sind Designangaben. Erst die Provenienz einer tatsächlich beobachteten FeatureValue weist die genutzte Quelle aus.', stage: 'provider' },
  { id: 'quality', title: '2 · Wann sind Daten brauchbar?', goal: 'Freshness, Sufficiency und Gate verstehen', detail: 'Fehlende Pflichtdaten, ungeprüfte Rechte oder ein Veto erzeugen BLOCKED/NOT_PROVEN statt eines erfundenen Scores.', stage: 'data' },
  { id: 'factors', title: '3 · Was beeinflusst einen Score?', goal: 'Features und Gewichtung interpretieren', detail: 'DefaultWeight ist eine Modellrichtlinie. Die tatsächlich angewendeten Familiengewichte stammen ausschließlich aus dem konkreten FinalRankResult.', stage: 'scoring' },
  { id: 'explain', title: '4 · Wie überprüfe ich einen Score?', goal: 'Quellen, Gründe und Evidence reproduzieren', detail: 'Vergleiche Features, Provider-Provenienz, Reason Codes, Modelversion und Evidence-ID. Ohne Ergebnisvertrag kein Runtime-Score.', stage: 'evidence' },
] as const;

export function filterArchitectureComponents(query: string, domain: string): AnalysisComponentRegistryEntry[] {
  const needle = query.trim().toLocaleLowerCase('de');
  return ARCHITECTURE_COMPONENTS.filter((component) =>
    (domain === 'all' || component.domain === domain) &&
    (!needle || [
      component.componentId, component.displayName, component.domain, component.outputContract,
      ...component.featureDependencies, ...component.providerDependencies,
    ].join(' ').toLocaleLowerCase('de').includes(needle))
  );
}

export function filterArchitectureBlueprints(query: string): StudioBlueprint[] {
  const needle = query.trim().toLocaleLowerCase('de');
  if (!needle) return ARCHITECTURE_BLUEPRINTS;
  return ARCHITECTURE_BLUEPRINTS.filter((blueprint) =>
    [blueprint.id, blueprint.name, blueprint.category, blueprint.primaryUseCase, ...blueprint.dataConceptsUsed]
      .join(' ').toLocaleLowerCase('de').includes(needle));
}

/** Configured/known must never be mistaken for actual runtime source or licensed delivery. */
export function componentEvidenceLabel(component: AnalysisComponentRegistryEntry): EvidenceLabel {
  return component.status === 'blocked' ? 'BLOCKED' : 'NOT_PROVEN';
}

export function blueprintEvidenceLabel(blueprintId: string): EvidenceLabel {
  return BLUEPRINT_EVIDENCE_CONTRACTS[blueprintId]?.state === 'BLOCKED' ? 'BLOCKED' : 'NOT_PROVEN';
}
