import {
  CANONICAL_50_COMPONENTS,
  type AnalysisComponentRegistryEntry,
  type DataProvenanceMode,
} from '../../contracts/analysisComponentRegistry';
import { validateAnalysisComponentRegistry } from '../../contracts/analysisComponentRegistryValidator';
import {
  ProductAssetClassSchema,
  type ProductAssetClass,
} from '../../contracts/marketAssetTaxonomy';

export const ASSET_LABELS: Record<ProductAssetClass, string> = {
  stocks: 'Aktien',
  etfs: 'ETFs',
  indices: 'Indizes',
  crypto: 'Krypto',
  forex: 'Devisen',
  commodities: 'Rohstoffe',
  futures: 'Futures',
  options: 'Optionen',
  bonds: 'Anleihen',
};
export const PRODUCT_CLASSES = ProductAssetClassSchema.options;
export const LIFECYCLE_LABELS = {
  planned: 'Geplant',
  mock: 'Demo',
  shadow: 'Shadow',
  active: 'Aktiv',
  degraded: 'Eingeschränkt',
  blocked: 'Gesperrt',
  retired: 'Stillgelegt',
};
export const DATA_LABELS: Record<DataProvenanceMode, string> = {
  live: 'LIVE',
  delayed: 'DELAYED',
  cached: 'CACHED',
  simulated: 'DEMO',
  unavailable: 'UNAVAILABLE',
  degraded: 'DEGRADED',
};
export const ANALYSIS_FAMILIES = [
  {
    id: 'integrity',
    name: 'Integrität & Handelbarkeit',
    start: 0,
    end: 5,
    description:
      'Datenqualität, Liquidität und harte Risikogrenzen vor jeder Bewertung.',
  },
  {
    id: 'technical',
    name: 'Trend & Marktstruktur',
    start: 5,
    end: 15,
    description: 'Trend, Momentum, Volumen, Volatilität und Preisniveaus.',
  },
  {
    id: 'macro',
    name: 'Marktbreite & Makro',
    start: 15,
    end: 21,
    description:
      'Sektorrotation, Diversifikation und marktübergreifende Regime.',
  },
  {
    id: 'news',
    name: 'Nachrichten & Ereignisse',
    start: 21,
    end: 32,
    description:
      'Entitäten, Quellen, Stimmungen, Ereignisse und beobachtete Preisreaktionen.',
  },
  {
    id: 'social',
    name: 'Narrative & Social',
    start: 32,
    end: 37,
    description:
      'Aufmerksamkeit und Engagement mit eigenständiger Manipulationsprüfung.',
  },
  {
    id: 'fundamental',
    name: 'Fundamentaldaten & Bewertung',
    start: 37,
    end: 43,
    description:
      'Bilanzqualität, Wachstum, Vergleichsbewertung und Finanzierungsrisiken.',
  },
  {
    id: 'positioning',
    name: 'Positionierung & On-Chain',
    start: 43,
    end: 49,
    description:
      'Insider, Derivate, Orderflow, Transaktionen und Tokenökonomie.',
  },
  {
    id: 'ranking',
    name: 'Rang & Evidence',
    start: 49,
    end: 50,
    description:
      'Modellausrichtung, Datenkonfidenz und prüfbare Berechnungsnachweise.',
  },
] as const;
// Copy only. Lifecycle, scope, dependencies and policies always come from the canonical registry.
const GERMAN_NAMES: Record<string, string> = {
  market_integrity_gate: 'Marktintegrität',
  data_quality_scorer: 'Datenqualität',
  liquidity_eligibility_scorer: 'Liquidität & Zulässigkeit',
  spread_slippage_risk_scorer: 'Spread- & Slippage-Risiko',
  tradability_gate: 'Handelbarkeit',
  multi_timeframe_trend_regime_scorer: 'Trendregime über Zeitebenen',
  relative_strength_scorer: 'Relative Stärke',
  momentum_persistence_scorer: 'Momentum-Beständigkeit',
  breakout_quality_scorer: 'Ausbruchsqualität',
  mean_reversion_opportunity_scorer: 'Mean-Reversion-Potenzial',
  volume_confirmation_scorer: 'Volumenbestätigung',
  volatility_regime_scorer: 'Volatilitätsregime',
  support_resistance_proximity_scorer: 'Nähe zu Unterstützung & Widerstand',
  pattern_confidence_scorer: 'Musterkonfidenz',
  vwap_location_scorer: 'Position zum VWAP',
  market_breadth_scorer: 'Marktbreite',
  sector_rotation_scorer: 'Sektorrotation',
  correlation_diversification_scorer: 'Korrelation & Diversifikation',
  cross_asset_regime_scorer: 'Cross-Asset-Regime',
  macro_surprise_scorer: 'Makro-Überraschungen',
  economic_calendar_risk_scorer: 'Wirtschaftskalender-Risiko',
  entity_resolution_engine: 'Entitätsauflösung',
  news_relevance_scorer: 'Nachrichtenrelevanz',
  financial_sentiment_scorer: 'Finanzsentiment',
  sentiment_velocity_scorer: 'Sentiment-Geschwindigkeit',
  sentiment_dispersion_scorer: 'Sentiment-Streuung',
  news_novelty_scorer: 'Neuheitswert von Nachrichten',
  source_authority_scorer: 'Quellenautorität',
  event_detection_classification_engine: 'Ereigniserkennung',
  event_impact_scorer: 'Ereignisauswirkung',
  catalyst_strength_scorer: 'Katalysator-Stärke',
  market_reaction_validator: 'Preisreaktionsprüfung',
  narrative_emergence_scorer: 'Entstehende Narrative',
  narrative_saturation_scorer: 'Narrativ-Sättigung',
  social_attention_velocity_scorer: 'Social-Aufmerksamkeitsdynamik',
  social_engagement_quality_scorer: 'Engagement-Qualität',
  bot_manipulation_risk_scorer: 'Bot- & Manipulationsrisiko',
  fundamental_quality_scorer: 'Fundamentale Qualität',
  growth_acceleration_scorer: 'Wachstumsbeschleunigung',
  valuation_peer_comparison_scorer: 'Bewertung im Peer-Vergleich',
  earnings_revision_scorer: 'Gewinnrevisionen',
  earnings_surprise_guidance_scorer: 'Gewinnüberraschung & Ausblick',
  financial_distress_scorer: 'Finanzielle Notlage',
  insider_institutional_flow_scorer: 'Insider- & institutionelle Flows',
  options_positioning_gamma_scorer: 'Optionspositionierung & Gamma',
  open_interest_funding_regime_scorer: 'Open Interest & Funding',
  orderflow_liquidity_imbalance_scorer: 'Orderflow-Ungleichgewicht',
  onchain_flow_holder_behavior_scorer: 'On-Chain-Flows & Halterverhalten',
  protocol_fundamentals_tokenomics_scorer: 'Protokoll & Tokenökonomie',
  final_rank_confidence_evidence_scorer: 'Finaler Rang, Konfidenz & Evidence',
};
export function componentName(entry: AnalysisComponentRegistryEntry) {
  return GERMAN_NAMES[entry.componentId] ?? entry.displayName;
}
export function componentFamily(entry: AnalysisComponentRegistryEntry) {
  const index = CANONICAL_50_COMPONENTS.findIndex(
    (c) => c.componentId === entry.componentId,
  );
  return (
    ANALYSIS_FAMILIES.find((f) => index >= f.start && index < f.end) ??
    ANALYSIS_FAMILIES[7]
  );
}
export function componentHasProductScope(
  entry: AnalysisComponentRegistryEntry,
  value: string,
) {
  if (value === 'all') return true;
  const scopes: Record<string, string[]> = {
    stocks: ['equity_us', 'equity_eu'],
    bonds: ['bonds', 'fixed_income'],
  };
  return (scopes[value] ?? [value]).some((scope) =>
    entry.assetClassScope.includes(scope),
  );
}
export function registrySummary() {
  const counts = Object.fromEntries(
    Object.keys(LIFECYCLE_LABELS).map((status) => [
      status,
      CANONICAL_50_COMPONENTS.filter((c) => c.status === status).length,
    ]),
  );
  return {
    total: CANONICAL_50_COMPONENTS.length,
    counts,
    report: validateAnalysisComponentRegistry(),
  };
}
export interface AnalysisFilters {
  search: string;
  family: string;
  assetClass: string;
  status: string;
  data: string;
}
export function filterAnalysisComponents(filters: AnalysisFilters) {
  const query = filters.search.toLocaleLowerCase('de');
  return CANONICAL_50_COMPONENTS.filter(
    (entry) =>
      (
        componentName(entry) +
        ' ' +
        entry.componentId +
        ' ' +
        entry.displayName +
        ' ' +
        entry.providerDependencies.join(' ')
      )
        .toLocaleLowerCase('de')
        .includes(query) &&
      (filters.family === 'all' ||
        componentFamily(entry).id === filters.family) &&
      componentHasProductScope(entry, filters.assetClass) &&
      (filters.status === 'all' || entry.status === filters.status) &&
      (filters.data === 'all' || entry.provenanceMode === filters.data),
  );
}
