export const COMMODITY_ENERGY_RESEARCH_FEATURE_CONTRACT_VERSION =
  'commodity-energy-research-features/1.0.0' as const;
export const COMMODITY_INDUSTRIAL_METALS_RESEARCH_FEATURE_CONTRACT_VERSION =
  'commodity-industrial-metals-research-features/1.0.0' as const;
export const COMMODITY_PRECIOUS_METALS_RESEARCH_FEATURE_CONTRACT_VERSION =
  'commodity-precious-metals-research-features/1.0.0' as const;
export const COMMODITY_AGRICULTURE_RESEARCH_FEATURE_CONTRACT_VERSION =
  'commodity-agriculture-research-features/1.0.0' as const;
export const COMMODITY_RESEARCH_DQ_POLICY_VERSION = 'commodity-research-dq/1.1.0' as const;

export const COMMODITY_RESEARCH_INSTRUMENT_KINDS = [
  'commodity-energy-benchmark',
  'commodity-industrial-metal-benchmark',
  'commodity-precious-metal-benchmark',
  'commodity-agriculture-benchmark',
] as const;

export type CommodityResearchInstrumentKind = typeof COMMODITY_RESEARCH_INSTRUMENT_KINDS[number];
export type CommodityResearchDomain = 'energy' | 'industrial-metals' | 'precious-metals' | 'agriculture';
export type CommodityResearchFeatureStatus = 'VALID' | 'MISSING' | 'STALE' | 'INVALID';
export type CommodityResearchFeatureDirection = 'higher_is_better' | 'lower_is_better' | 'context_only';
export type CommodityResearchFeatureRole = 'RAW_EVIDENCE' | 'HARD_GATE';
export type CommodityResearchModelId =
  | 'commodity-energy-hybrid'
  | 'commodity-industrial-metals-hybrid'
  | 'commodity-precious-metals-hybrid'
  | 'commodity-agriculture-hybrid';

export interface CommodityResearchFeatureBinding {
  readonly key: string;
  readonly source: string;
  readonly latentFactor: string;
  readonly correlationGroup: string;
  readonly direction: CommodityResearchFeatureDirection;
  readonly unit: string;
  readonly role: CommodityResearchFeatureRole;
  readonly requiredForResearch: boolean;
  readonly maxAgeMs: number;
}

export interface CommodityResearchFeatureObservation {
  readonly featureKey: string;
  readonly rawValue: number | null;
  readonly unit: string;
  readonly source: string;
  readonly observedAt: string | null;
  readonly retrievedAt: string;
  readonly evidenceId: string | null;
  readonly confidence?: number;
  readonly revisionId?: string;
}

export interface CommodityResearchFeatureValue extends CommodityResearchFeatureObservation {
  readonly status: CommodityResearchFeatureStatus;
  readonly confidence: number;
  readonly reason?: string;
}

export interface CommodityResearchHardGateResult {
  readonly gateId: string;
  readonly passed: boolean;
  readonly severity: 'block' | 'warn';
  readonly reason: string;
}

export interface CommodityResearchFeatureSnapshot {
  readonly contractVersion:
    | typeof COMMODITY_ENERGY_RESEARCH_FEATURE_CONTRACT_VERSION
    | typeof COMMODITY_INDUSTRIAL_METALS_RESEARCH_FEATURE_CONTRACT_VERSION
    | typeof COMMODITY_PRECIOUS_METALS_RESEARCH_FEATURE_CONTRACT_VERSION
    | typeof COMMODITY_AGRICULTURE_RESEARCH_FEATURE_CONTRACT_VERSION;
  readonly dqPolicyVersion: typeof COMMODITY_RESEARCH_DQ_POLICY_VERSION;
  readonly assetId: string;
  readonly symbol: string;
  readonly domain: CommodityResearchDomain;
  readonly instrumentKind: CommodityResearchInstrumentKind;
  readonly capturedAt: string;
  readonly features: readonly CommodityResearchFeatureValue[];
  readonly coverage: number;
  readonly requiredCoverage: number;
  readonly dataQualityScore: number;
  readonly hardGates: readonly CommodityResearchHardGateResult[];
  readonly researchReady: boolean;
  readonly canonical: false;
  readonly scoreEligible: false;
}

export interface CommodityResearchWeightHypothesis {
  readonly status: 'research-hypothesis';
  readonly executable: false;
  readonly source: 'owner-drive-documentation-2026-08-23';
  readonly weights: Readonly<{
    commodityFundamentals: number;
    technicalStructure: number;
    macroRegime: number;
    sentimentPositioning: number;
    riskLiquidity: number;
  }>;
}

export interface CommodityResearchModelContract {
  readonly modelId: CommodityResearchModelId;
  readonly modelVersion: '0.1.0';
  readonly domain: CommodityResearchDomain;
  readonly instrumentKind: CommodityResearchInstrumentKind;
  readonly featureContractVersion: CommodityResearchFeatureSnapshot['contractVersion'];
  readonly lifecycle: 'challenger';
  readonly scoreEligible: false;
  readonly executableWeights: false;
  readonly features: readonly CommodityResearchFeatureBinding[];
  readonly weightHypothesis: CommodityResearchWeightHypothesis;
  readonly antiCorrelationRules: readonly string[];
  readonly promotionRequirements: readonly string[];
}

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const ANNUAL_OFFICIAL = 450 * DAY;
const REGULATORY_REFERENCE = 3 * 366 * DAY;
const FUTURE_TOLERANCE_MS = 60_000;

const feature = (
  key: string,
  source: string,
  latentFactor: string,
  correlationGroup: string,
  direction: CommodityResearchFeatureDirection,
  unit: string,
  requiredForResearch: boolean,
  maxAgeMs: number,
  role: CommodityResearchFeatureRole = 'RAW_EVIDENCE',
): CommodityResearchFeatureBinding => Object.freeze({
  key,
  source,
  latentFactor,
  correlationGroup,
  direction,
  unit,
  role,
  requiredForResearch,
  maxAgeMs,
});

const hypothesis = (
  commodityFundamentals: number,
  technicalStructure: number,
  macroRegime: number,
  sentimentPositioning: number,
  riskLiquidity: number,
): CommodityResearchWeightHypothesis => Object.freeze({
  status: 'research-hypothesis',
  executable: false,
  source: 'owner-drive-documentation-2026-08-23',
  weights: Object.freeze({ commodityFundamentals, technicalStructure, macroRegime, sentimentPositioning, riskLiquidity }),
});

const PROMOTION_REQUIREMENTS = Object.freeze([
  'verified provider coverage with field-specific freshness and provenance',
  'point-in-time out-of-sample backtesting without future-revision or lookahead leakage',
  'correlation and double-counting review across latent factors and downstream signals',
  'versioned executable weights with effective-feature/effective-weight fingerprints',
  'stress and regime validation with documented rollback target',
  'explicit Owner promotion through the existing ScoringModelRegistry/ScoringDispatcher',
  'no parallel commodity dispatcher, model registry, DQ service, persistence or ranking authority',
]);

const BASE_ANTI_CORRELATION_RULES = Object.freeze([
  'Price trend, momentum, breakout and volatility are one market-structure family and MUST NOT be re-added independently after composition.',
  'Inventory, supply/demand balance, production and trade observations may share a latent physical-balance factor and MUST be decorrelated before executable weighting.',
  'Supply concentration, import reliance, substitution and recycling describe overlapping supply-risk exposure and MUST NOT be counted twice through criticality and generic risk.',
  'CFTC positioning is context/positioning evidence and MUST NOT duplicate price momentum or become a trade-ready gate by itself.',
  'Missing, stale, invalid, duplicate or unverified evidence remains non-computable; no neutral 0/50/PASS substitution is permitted in a canonical or promotion-eligible snapshot.',
]);

export const COMMODITY_ENERGY_RESEARCH_MODEL_CONTRACT: CommodityResearchModelContract = Object.freeze({
  modelId: 'commodity-energy-hybrid',
  modelVersion: '0.1.0',
  domain: 'energy',
  instrumentKind: 'commodity-energy-benchmark',
  featureContractVersion: COMMODITY_ENERGY_RESEARCH_FEATURE_CONTRACT_VERSION,
  lifecycle: 'challenger',
  scoreEligible: false,
  executableWeights: false,
  features: Object.freeze([
    feature('market.priceHistory', 'commodity-market-evidence/1.0.0', 'marketStructure', 'commodity-market-structure', 'context_only', 'price-series', true, WEEK),
    feature('fundamentals.inventoryLevel', 'eia-official-evidence', 'physicalBalance', 'energy-physical-balance', 'lower_is_better', 'source-unit', true, WEEK),
    feature('fundamentals.production', 'eia-official-evidence', 'physicalBalance', 'energy-physical-balance', 'context_only', 'source-unit', true, 45 * DAY),
    feature('fundamentals.supplyDemandBalance', 'eia-official-evidence', 'physicalBalance', 'energy-physical-balance', 'higher_is_better', 'source-unit', false, 45 * DAY),
    feature('market.termStructure', 'governed-futures-curve-evidence', 'carryStructure', 'energy-carry', 'higher_is_better', 'percent', false, DAY),
    feature('positioning.managedMoneyNetPctOi', 'cftc-cot-official-evidence', 'positioning', 'energy-positioning', 'context_only', 'percent-open-interest', false, WEEK),
    feature('risk.supplyConcentration', 'governed-official-supply-evidence', 'supplyRisk', 'energy-supply-risk', 'lower_is_better', 'percent', false, ANNUAL_OFFICIAL),
  ]),
  weightHypothesis: hypothesis(35, 20, 15, 10, 20),
  antiCorrelationRules: BASE_ANTI_CORRELATION_RULES,
  promotionRequirements: PROMOTION_REQUIREMENTS,
});

export const COMMODITY_INDUSTRIAL_METALS_RESEARCH_MODEL_CONTRACT: CommodityResearchModelContract = Object.freeze({
  modelId: 'commodity-industrial-metals-hybrid',
  modelVersion: '0.1.0',
  domain: 'industrial-metals',
  instrumentKind: 'commodity-industrial-metal-benchmark',
  featureContractVersion: COMMODITY_INDUSTRIAL_METALS_RESEARCH_FEATURE_CONTRACT_VERSION,
  lifecycle: 'challenger',
  scoreEligible: false,
  executableWeights: false,
  features: Object.freeze([
    feature('market.priceHistory', 'commodity-market-evidence/1.0.0', 'marketStructure', 'commodity-market-structure', 'context_only', 'price-series', true, WEEK),
    feature('fundamentals.mineProduction', 'usgs-mcs-official-evidence', 'physicalSupply', 'metals-physical-supply', 'context_only', 'source-unit', true, ANNUAL_OFFICIAL),
    feature('fundamentals.netImportReliance', 'usgs-mcs-official-evidence', 'supplyRisk', 'metals-supply-risk', 'lower_is_better', 'percent', true, ANNUAL_OFFICIAL),
    feature('fundamentals.recyclingRate', 'usgs-mcs-official-evidence', 'supplyRisk', 'metals-supply-risk', 'higher_is_better', 'percent', false, ANNUAL_OFFICIAL),
    feature('fundamentals.substitutionDifficulty', 'usgs-mcs-official-evidence', 'supplyRisk', 'metals-supply-risk', 'lower_is_better', 'index', false, ANNUAL_OFFICIAL),
    feature('risk.supplyConcentration', 'usgs-mcs-official-evidence', 'supplyRisk', 'metals-supply-risk', 'lower_is_better', 'percent', false, ANNUAL_OFFICIAL),
    feature('criticality.economicImportance', 'eu-crma-official-evidence', 'criticality', 'metals-criticality', 'context_only', 'index', false, REGULATORY_REFERENCE),
    feature('criticality.supplyRisk', 'eu-crma-official-evidence', 'criticality', 'metals-criticality', 'context_only', 'index', false, REGULATORY_REFERENCE),
    feature('positioning.managedMoneyNetPctOi', 'cftc-cot-official-evidence', 'positioning', 'metals-positioning', 'context_only', 'percent-open-interest', false, WEEK),
  ]),
  weightHypothesis: hypothesis(35, 20, 20, 10, 15),
  antiCorrelationRules: BASE_ANTI_CORRELATION_RULES,
  promotionRequirements: PROMOTION_REQUIREMENTS,
});

export const COMMODITY_PRECIOUS_METALS_RESEARCH_MODEL_CONTRACT: CommodityResearchModelContract = Object.freeze({
  modelId: 'commodity-precious-metals-hybrid',
  modelVersion: '0.1.0',
  domain: 'precious-metals',
  instrumentKind: 'commodity-precious-metal-benchmark',
  featureContractVersion: COMMODITY_PRECIOUS_METALS_RESEARCH_FEATURE_CONTRACT_VERSION,
  lifecycle: 'challenger',
  scoreEligible: false,
  executableWeights: false,
  features: Object.freeze([
    feature('market.priceHistory', 'commodity-market-evidence/1.0.0', 'marketStructure', 'commodity-market-structure', 'context_only', 'price-series', true, WEEK),
    feature('market.termStructure', 'governed-futures-curve-evidence', 'carryStructure', 'precious-carry', 'higher_is_better', 'percent', false, DAY),
    feature('positioning.managedMoneyNetPctOi', 'cftc-cot-official-evidence', 'positioning', 'precious-positioning', 'context_only', 'percent-open-interest', false, WEEK),
    feature('fundamentals.mineProduction', 'usgs-mcs-official-evidence', 'physicalSupply', 'precious-physical-supply', 'context_only', 'source-unit', false, ANNUAL_OFFICIAL),
    feature('fundamentals.recyclingRate', 'usgs-mcs-official-evidence', 'physicalSupply', 'precious-physical-supply', 'higher_is_better', 'percent', false, ANNUAL_OFFICIAL),
  ]),
  weightHypothesis: hypothesis(25, 20, 25, 15, 15),
  antiCorrelationRules: Object.freeze([
    ...BASE_ANTI_CORRELATION_RULES,
    'Ore grade, project tonnage, capex, opex and mine-life metrics belong to resource-project valuation and MUST NOT enter a precious-metal benchmark model.',
  ]),
  promotionRequirements: PROMOTION_REQUIREMENTS,
});

export const COMMODITY_AGRICULTURE_RESEARCH_MODEL_CONTRACT: CommodityResearchModelContract = Object.freeze({
  modelId: 'commodity-agriculture-hybrid',
  modelVersion: '0.1.0',
  domain: 'agriculture',
  instrumentKind: 'commodity-agriculture-benchmark',
  featureContractVersion: COMMODITY_AGRICULTURE_RESEARCH_FEATURE_CONTRACT_VERSION,
  lifecycle: 'challenger',
  scoreEligible: false,
  executableWeights: false,
  features: Object.freeze([
    feature('market.priceHistory', 'commodity-market-evidence/1.0.0', 'marketStructure', 'commodity-market-structure', 'context_only', 'price-series', true, WEEK),
    feature('fundamentals.production', 'usda-fas-psd-official-evidence', 'physicalBalance', 'agriculture-physical-balance', 'context_only', 'source-unit', true, 45 * DAY),
    feature('fundamentals.consumption', 'usda-fas-psd-official-evidence', 'physicalBalance', 'agriculture-physical-balance', 'context_only', 'source-unit', true, 45 * DAY),
    feature('fundamentals.endingStocks', 'usda-fas-psd-official-evidence', 'physicalBalance', 'agriculture-physical-balance', 'higher_is_better', 'source-unit', true, 45 * DAY),
    feature('fundamentals.stocksToUse', 'derived-from-usda-psd', 'physicalBalance', 'agriculture-physical-balance', 'higher_is_better', 'percent', false, 45 * DAY),
    feature('fundamentals.tradeBalance', 'usda-fas-psd-official-evidence', 'physicalBalance', 'agriculture-physical-balance', 'context_only', 'source-unit', false, 45 * DAY),
    feature('positioning.managedMoneyNetPctOi', 'cftc-cot-official-evidence', 'positioning', 'agriculture-positioning', 'context_only', 'percent-open-interest', false, WEEK),
    feature('fundamentals.seasonality', 'point-in-time-market-history', 'seasonality', 'agriculture-seasonality', 'context_only', 'zscore', false, WEEK),
  ]),
  weightHypothesis: hypothesis(45, 15, 10, 10, 20),
  antiCorrelationRules: Object.freeze([
    ...BASE_ANTI_CORRELATION_RULES,
    'Production, consumption, ending stocks, stocks-to-use and trade balance share one balance-sheet family; derived ratios cannot be weighted again without de-duplication.',
    'Seasonality must be computed only from information available at the historical observation date.',
  ]),
  promotionRequirements: PROMOTION_REQUIREMENTS,
});

export const COMMODITY_RESEARCH_MODEL_CONTRACTS: readonly CommodityResearchModelContract[] = Object.freeze([
  COMMODITY_ENERGY_RESEARCH_MODEL_CONTRACT,
  COMMODITY_INDUSTRIAL_METALS_RESEARCH_MODEL_CONTRACT,
  COMMODITY_PRECIOUS_METALS_RESEARCH_MODEL_CONTRACT,
  COMMODITY_AGRICULTURE_RESEARCH_MODEL_CONTRACT,
]);

const PRECIOUS_PATTERN = /(?:^|_)(GOLD|SILVER|PLATINUM|PALLADIUM|RHODIUM|IRIDIUM|RUTHENIUM)(?:_|$)/i;
const ENERGY_PATTERN = /(?:^|_)(WTI|BRENT|DUBAI|OMAN|MARS|WCS|URALS|ESPO|HENRYHUB|TTF|JKM|PROPANE|BUTANE|RBOB|ULSD|GASOIL|JETFUEL|ETHANOL|METHANOL|NAPHTHA|COAL|URANIUM)(?:_|$)/i;
const AGRICULTURE_PATTERN = /(?:^|_)(CORN|WHEAT|SOY|OATS|RICE|CANOLA|RAPESEED|BARLEY|MAIZE|SUGAR|COFFEE|COCOA|COTTON|CATTLE|HOG|PORK|MILK|DAIRY|ORANGE|JUICE|RUBBER|WOOL|PALM|OLIVE|COCONUT|TEA|TOBACCO)(?:_|$)/i;

export function isCommodityResearchInstrumentKind(value: string | undefined): value is CommodityResearchInstrumentKind {
  return Boolean(value && (COMMODITY_RESEARCH_INSTRUMENT_KINDS as readonly string[]).includes(value));
}

export function classifyCommodityResearchInstrumentKind(
  symbolInput: string,
  nameInput?: string,
  existingInstrumentKind?: string,
): CommodityResearchInstrumentKind {
  if (isCommodityResearchInstrumentKind(existingInstrumentKind)) return existingInstrumentKind;
  const symbol = String(symbolInput ?? '').toUpperCase().trim();
  const name = String(nameInput ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  const target = `${symbol}_${name}`;
  if (PRECIOUS_PATTERN.test(target)) return 'commodity-precious-metal-benchmark';
  if (ENERGY_PATTERN.test(target)) return 'commodity-energy-benchmark';
  if (AGRICULTURE_PATTERN.test(target)) return 'commodity-agriculture-benchmark';
  return 'commodity-industrial-metal-benchmark';
}

export function commodityResearchDomainFromInstrumentKind(
  instrumentKind: CommodityResearchInstrumentKind,
): CommodityResearchDomain {
  switch (instrumentKind) {
    case 'commodity-energy-benchmark': return 'energy';
    case 'commodity-industrial-metal-benchmark': return 'industrial-metals';
    case 'commodity-precious-metal-benchmark': return 'precious-metals';
    case 'commodity-agriculture-benchmark': return 'agriculture';
  }
}

export function commodityResearchModelForInstrumentKind(
  instrumentKind: CommodityResearchInstrumentKind,
): CommodityResearchModelContract {
  const model = COMMODITY_RESEARCH_MODEL_CONTRACTS.find(item => item.instrumentKind === instrumentKind);
  if (!model) throw new Error(`COMMODITY_RESEARCH_MODEL_NOT_FOUND:${instrumentKind}`);
  return model;
}

function isIsoTimestamp(value: string | null | undefined): value is string {
  return Boolean(value && Number.isFinite(Date.parse(value)));
}

function classifyObservation(
  definition: CommodityResearchFeatureBinding,
  observation: CommodityResearchFeatureObservation | undefined,
  duplicate: boolean,
  nowMs: number,
): CommodityResearchFeatureValue {
  const retrievedAt = observation?.retrievedAt ?? new Date(nowMs).toISOString();
  if (duplicate) {
    return {
      featureKey: definition.key,
      rawValue: null,
      unit: definition.unit,
      source: definition.source,
      observedAt: null,
      retrievedAt,
      evidenceId: null,
      confidence: 0,
      status: 'INVALID',
      reason: 'Multiple observations were supplied for one feature without an upstream governed merge decision.',
    };
  }
  if (!observation) {
    return {
      featureKey: definition.key,
      rawValue: null,
      unit: definition.unit,
      source: definition.source,
      observedAt: null,
      retrievedAt,
      evidenceId: null,
      confidence: 0,
      status: 'MISSING',
      reason: 'No verified observation supplied.',
    };
  }
  if (observation.rawValue === null || !Number.isFinite(observation.rawValue)) {
    return { ...observation, confidence: 0, status: 'MISSING', reason: 'Feature value is missing or non-finite.' };
  }
  if (!observation.source.trim() || !observation.evidenceId?.trim() || !isIsoTimestamp(observation.observedAt) || !isIsoTimestamp(observation.retrievedAt)) {
    return { ...observation, confidence: 0, status: 'INVALID', reason: 'Verified source, evidence id and valid timestamps are required.' };
  }
  if (observation.unit !== definition.unit && definition.unit !== 'source-unit') {
    return { ...observation, confidence: 0, status: 'INVALID', reason: `Expected unit ${definition.unit}, received ${observation.unit}.` };
  }
  const observedMs = Date.parse(observation.observedAt);
  const retrievedMs = Date.parse(observation.retrievedAt);
  if (observedMs > nowMs + FUTURE_TOLERANCE_MS || retrievedMs > nowMs + FUTURE_TOLERANCE_MS || observedMs > retrievedMs + FUTURE_TOLERANCE_MS) {
    return { ...observation, confidence: 0, status: 'INVALID', reason: 'Observation/retrieval timestamps violate point-in-time temporal ordering.' };
  }
  const ageMs = nowMs - observedMs;
  if (ageMs > definition.maxAgeMs) {
    return {
      ...observation,
      confidence: Math.max(0, Math.min(1, observation.confidence ?? 1)),
      status: 'STALE',
      reason: `Observation age ${ageMs}ms exceeds feature policy ${definition.maxAgeMs}ms.`,
    };
  }
  return {
    ...observation,
    confidence: Math.max(0, Math.min(1, observation.confidence ?? 1)),
    status: 'VALID',
  };
}

export function buildCommodityResearchFeatureSnapshot(input: Readonly<{
  assetId: string;
  symbol: string;
  instrumentKind: CommodityResearchInstrumentKind;
  observations: readonly CommodityResearchFeatureObservation[];
  nowMs?: number;
}>): CommodityResearchFeatureSnapshot {
  const model = commodityResearchModelForInstrumentKind(input.instrumentKind);
  const nowMs = input.nowMs ?? Date.now();
  const grouped = new Map<string, CommodityResearchFeatureObservation[]>();
  for (const observation of input.observations) {
    const items = grouped.get(observation.featureKey) ?? [];
    items.push(observation);
    grouped.set(observation.featureKey, items);
  }
  const features = model.features.map(definition => {
    const candidates = grouped.get(definition.key) ?? [];
    return classifyObservation(definition, candidates[0], candidates.length > 1, nowMs);
  });
  const requiredKeys = new Set(model.features.filter(item => item.requiredForResearch).map(item => item.key));
  const validRequired = features.filter(item => requiredKeys.has(item.featureKey) && item.status === 'VALID').length;
  const requiredCoverage = requiredKeys.size === 0 ? 1 : validRequired / requiredKeys.size;
  const validAll = features.filter(item => item.status === 'VALID').length;
  const coverage = features.length === 0 ? 0 : validAll / features.length;
  const hardGates: CommodityResearchHardGateResult[] = features
    .filter(item => requiredKeys.has(item.featureKey))
    .map(item => ({
      gateId: `required:${item.featureKey}`,
      passed: item.status === 'VALID',
      severity: 'block' as const,
      reason: item.status === 'VALID'
        ? 'Required feature has verified, fresh evidence.'
        : item.reason ?? `Required feature is ${item.status}.`,
    }));
  hardGates.push({
    gateId: 'required-feature-coverage',
    passed: requiredCoverage === 1,
    severity: 'block',
    reason: requiredCoverage === 1
      ? 'All required Commodity research features are verified and fresh.'
      : `Required feature coverage is ${(requiredCoverage * 100).toFixed(1)}%; 100% is required for research-ready status.`,
  });

  return {
    contractVersion: model.featureContractVersion,
    dqPolicyVersion: COMMODITY_RESEARCH_DQ_POLICY_VERSION,
    assetId: input.assetId,
    symbol: input.symbol.toUpperCase().trim(),
    domain: model.domain,
    instrumentKind: model.instrumentKind,
    capturedAt: new Date(nowMs).toISOString(),
    features: Object.freeze(features),
    coverage: Number(coverage.toFixed(4)),
    requiredCoverage: Number(requiredCoverage.toFixed(4)),
    dataQualityScore: Number((coverage * 100).toFixed(2)),
    hardGates: Object.freeze(hardGates),
    researchReady: hardGates.every(gate => gate.passed || gate.severity !== 'block'),
    canonical: false,
    scoreEligible: false,
  };
}
