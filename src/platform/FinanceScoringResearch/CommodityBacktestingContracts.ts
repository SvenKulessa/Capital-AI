import {
  COMMODITY_RESEARCH_MODEL_CONTRACTS,
  type CommodityResearchDomain,
  type CommodityResearchModelId,
} from './CommodityResearchModelContracts';

export const COMMODITY_BACKTEST_CONTRACT_VERSION = 'commodity-backtest-contract/1.0.0' as const;
export const COMMODITY_POINT_IN_TIME_POLICY_VERSION = 'commodity-point-in-time-policy/1.0.0' as const;
export const COMMODITY_COST_ASSUMPTION_CONTRACT_VERSION = 'commodity-backtest-costs/1.0.0' as const;

export type CommodityBacktestRebalanceFrequency = 'daily' | 'weekly' | 'monthly';
export type CommodityBacktestWindowMode = 'walk-forward' | 'expanding-window';

export interface CommodityBacktestRequest {
  readonly contractVersion: typeof COMMODITY_BACKTEST_CONTRACT_VERSION;
  readonly modelId: CommodityResearchModelId;
  readonly modelVersion: '0.1.0';
  readonly universeId: string;
  readonly assetClass: 'commodity';
  readonly domains: readonly CommodityResearchDomain[];
  readonly startDate: string;
  readonly endDate: string;
  readonly rebalanceFrequency: CommodityBacktestRebalanceFrequency;
  readonly holdingPeriodDays: number;
  readonly topN: number;
  readonly minConfidence: number;
  readonly windowMode: CommodityBacktestWindowMode;
  readonly minimumTrainingObservations: number;
  readonly costAssumptionContractVersion: typeof COMMODITY_COST_ASSUMPTION_CONTRACT_VERSION;
  readonly costAssumptionId: string;
  readonly costAssumptionVersion: string;
  readonly pointInTimePolicyVersion: typeof COMMODITY_POINT_IN_TIME_POLICY_VERSION;
}

export interface CommodityBacktestCostAssumptions {
  readonly contractVersion: typeof COMMODITY_COST_ASSUMPTION_CONTRACT_VERSION;
  readonly assumptionId: string;
  readonly assumptionVersion: string;
  readonly effectiveFrom: string;
  readonly commissionBps: number;
  readonly slippageBps: number;
  readonly spreadBps: number;
  readonly source: string;
  readonly executable: false;
}

/**
 * `availableAt` is the first timestamp at which THIS EXACT VALUE/VINTAGE could have been known to
 * the strategy. It is intentionally separate from the economic observation period (`observedAt`)
 * and the later retrieval timestamp (`retrievedAt`). This is required for CFTC Friday releases of
 * Tuesday observations and for revision-aware USDA/EIA fundamentals.
 */
export interface CommodityPointInTimeFeatureValue {
  readonly featureKey: string;
  readonly value: number | null;
  readonly source: string;
  readonly observedAt: string;
  readonly availableAt: string;
  readonly retrievedAt: string;
  readonly evidenceId: string;
  readonly releaseId: string | null;
  readonly revisionId: string | null;
}

export interface CommodityPointInTimeFeatureSnapshot {
  readonly policyVersion: typeof COMMODITY_POINT_IN_TIME_POLICY_VERSION;
  readonly assetId: string;
  readonly decisionAt: string;
  readonly values: readonly CommodityPointInTimeFeatureValue[];
}

export interface CommodityPointInTimeValidation {
  readonly policyVersion: typeof COMMODITY_POINT_IN_TIME_POLICY_VERSION;
  readonly valid: boolean;
  readonly blockers: readonly string[];
  readonly eligibleFeatureKeys: readonly string[];
  readonly rejectedFeatureKeys: readonly string[];
  readonly canonical: false;
  readonly scoreEligible: false;
}

export interface CommodityBacktestMetrics {
  readonly rankInformationCoefficient: number | null;
  readonly rankMonotonicity: number | null;
  readonly hitRateTopN: number | null;
  readonly annualizedReturn: number | null;
  readonly annualizedVolatility: number | null;
  readonly maxDrawdown: number | null;
  readonly profitFactor: number | null;
  readonly turnover: number | null;
  readonly averageHoldingPeriodDays: number | null;
}

export interface CommodityBacktestEquityPoint {
  readonly timestamp: string;
  readonly value: number;
}

export interface CommodityBacktestResult {
  readonly contractVersion: typeof COMMODITY_BACKTEST_CONTRACT_VERSION;
  readonly runId: string;
  readonly request: CommodityBacktestRequest;
  readonly metrics: CommodityBacktestMetrics;
  readonly equityCurve: readonly CommodityBacktestEquityPoint[];
  readonly leakageBlockers: readonly string[];
  readonly benchmarkIds: readonly string[];
  readonly regimeDiagnostics: Readonly<Record<string, number | null>>;
  readonly domainDiagnostics: Readonly<Record<string, number | null>>;
  readonly pointInTimeValidated: boolean;
  readonly costAssumptionsValidated: boolean;
  readonly outOfSampleValidated: boolean;
  readonly outOfSampleEvidenceId: string | null;
  readonly correlationEvidenceId: string | null;
  readonly sensitivityEvidenceId: string | null;
  readonly promotionEvidenceEligible: boolean;
  readonly authority: 'VALIDATION_ONLY';
  readonly canonical: false;
  readonly scoreEligible: false;
}

export interface CommodityBacktestRequestValidation {
  readonly valid: boolean;
  readonly blockers: readonly string[];
}

const RELEASE_AWARE_SOURCES = Object.freeze([
  'cftc-cot',
]);

const REVISION_AWARE_SOURCES = Object.freeze([
  'usda-fas-psd',
  'eia',
]);

function isTimestamp(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function finiteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

export function validateCommodityBacktestRequest(
  request: CommodityBacktestRequest,
): CommodityBacktestRequestValidation {
  const blockers: string[] = [];
  const model = COMMODITY_RESEARCH_MODEL_CONTRACTS.find(item => item.modelId === request.modelId);
  if (request.contractVersion !== COMMODITY_BACKTEST_CONTRACT_VERSION) blockers.push('BACKTEST_CONTRACT_VERSION_MISMATCH');
  if (request.assetClass !== 'commodity') blockers.push('BACKTEST_ASSET_CLASS_MISMATCH');
  if (!model) blockers.push('BACKTEST_MODEL_NOT_FOUND');
  else {
    if (request.modelVersion !== model.modelVersion) blockers.push('BACKTEST_MODEL_VERSION_MISMATCH');
    if (!request.domains.includes(model.domain)) blockers.push('BACKTEST_MODEL_DOMAIN_NOT_INCLUDED');
  }
  if (!request.universeId.trim()) blockers.push('BACKTEST_UNIVERSE_REQUIRED');
  if (request.domains.length === 0) blockers.push('BACKTEST_DOMAIN_REQUIRED');
  if (new Set(request.domains).size !== request.domains.length) blockers.push('BACKTEST_DOMAIN_DUPLICATE');
  if (!isTimestamp(request.startDate) || !isTimestamp(request.endDate)) blockers.push('BACKTEST_DATE_INVALID');
  else if (Date.parse(request.startDate) >= Date.parse(request.endDate)) blockers.push('BACKTEST_DATE_RANGE_INVALID');
  if (!Number.isInteger(request.holdingPeriodDays) || request.holdingPeriodDays < 1) blockers.push('BACKTEST_HOLDING_PERIOD_INVALID');
  if (!Number.isInteger(request.topN) || request.topN < 1) blockers.push('BACKTEST_TOP_N_INVALID');
  if (!Number.isFinite(request.minConfidence) || request.minConfidence < 0 || request.minConfidence > 1) blockers.push('BACKTEST_MIN_CONFIDENCE_INVALID');
  if (!Number.isInteger(request.minimumTrainingObservations) || request.minimumTrainingObservations < 20) {
    blockers.push('BACKTEST_MIN_TRAINING_OBSERVATIONS_INVALID');
  }
  if (request.pointInTimePolicyVersion !== COMMODITY_POINT_IN_TIME_POLICY_VERSION) blockers.push('POINT_IN_TIME_POLICY_VERSION_MISMATCH');
  if (request.costAssumptionContractVersion !== COMMODITY_COST_ASSUMPTION_CONTRACT_VERSION) blockers.push('COST_ASSUMPTION_CONTRACT_VERSION_MISMATCH');
  if (!request.costAssumptionId.trim()) blockers.push('COST_ASSUMPTION_ID_REQUIRED');
  if (!request.costAssumptionVersion.trim()) blockers.push('COST_ASSUMPTION_VERSION_REQUIRED');

  return Object.freeze({ valid: blockers.length === 0, blockers: Object.freeze(blockers) });
}

export function validateCommodityBacktestCostAssumptions(
  assumptions: CommodityBacktestCostAssumptions,
): CommodityBacktestRequestValidation {
  const blockers: string[] = [];
  if (assumptions.contractVersion !== COMMODITY_COST_ASSUMPTION_CONTRACT_VERSION) blockers.push('COST_CONTRACT_VERSION_MISMATCH');
  if (!assumptions.assumptionId.trim()) blockers.push('COST_ASSUMPTION_ID_REQUIRED');
  if (!assumptions.assumptionVersion.trim()) blockers.push('COST_ASSUMPTION_VERSION_REQUIRED');
  if (!isTimestamp(assumptions.effectiveFrom)) blockers.push('COST_ASSUMPTION_EFFECTIVE_FROM_INVALID');
  if (!finiteNonNegative(assumptions.commissionBps)) blockers.push('COMMISSION_BPS_INVALID');
  if (!finiteNonNegative(assumptions.slippageBps)) blockers.push('SLIPPAGE_BPS_INVALID');
  if (!finiteNonNegative(assumptions.spreadBps)) blockers.push('SPREAD_BPS_INVALID');
  if (!assumptions.source.trim()) blockers.push('COST_ASSUMPTION_SOURCE_REQUIRED');
  if (assumptions.executable !== false) blockers.push('COST_ASSUMPTIONS_MUST_REMAIN_VALIDATION_ONLY');
  return Object.freeze({ valid: blockers.length === 0, blockers: Object.freeze(blockers) });
}

/**
 * Fail-closed point-in-time gate. The exact data vintage must have been public/available no later
 * than decisionAt. Later retrieval is allowed only when release/revision lineage identifies the
 * historical vintage; this supports reproducible research without pretending a current API fetch
 * was historically available.
 */
export function validateCommodityPointInTimeSnapshot(
  snapshot: CommodityPointInTimeFeatureSnapshot,
): CommodityPointInTimeValidation {
  const blockers: string[] = [];
  const eligibleFeatureKeys: string[] = [];
  const rejectedFeatureKeys: string[] = [];
  const decisionMs = Date.parse(snapshot.decisionAt);

  if (snapshot.policyVersion !== COMMODITY_POINT_IN_TIME_POLICY_VERSION) blockers.push('POINT_IN_TIME_POLICY_VERSION_MISMATCH');
  if (!Number.isFinite(decisionMs)) blockers.push('POINT_IN_TIME_DECISION_TIMESTAMP_INVALID');

  const seen = new Set<string>();
  for (const feature of snapshot.values) {
    const featureBlockers: string[] = [];
    if (seen.has(feature.featureKey)) featureBlockers.push('DUPLICATE_FEATURE_VINTAGE');
    seen.add(feature.featureKey);

    const observedMs = Date.parse(feature.observedAt);
    const availableMs = Date.parse(feature.availableAt);
    const retrievedMs = Date.parse(feature.retrievedAt);
    if (!Number.isFinite(observedMs) || !Number.isFinite(availableMs) || !Number.isFinite(retrievedMs)) {
      featureBlockers.push('TIMESTAMP_INVALID');
    } else {
      if (observedMs > availableMs) featureBlockers.push('OBSERVED_AFTER_AVAILABLE');
      if (Number.isFinite(decisionMs) && availableMs > decisionMs) featureBlockers.push('LOOKAHEAD_VALUE_NOT_YET_AVAILABLE');
      if (retrievedMs < availableMs) featureBlockers.push('RETRIEVED_BEFORE_AVAILABLE');
    }

    if (!feature.evidenceId.trim()) featureBlockers.push('EVIDENCE_ID_REQUIRED');
    const normalizedSource = feature.source.trim().toLowerCase();
    const revisionAware = REVISION_AWARE_SOURCES.some(source => normalizedSource.startsWith(source));
    const releaseAware = revisionAware
      || RELEASE_AWARE_SOURCES.some(source => normalizedSource.startsWith(source));
    if (releaseAware && !feature.releaseId?.trim()) featureBlockers.push('RELEASE_ID_REQUIRED');
    if (revisionAware && !feature.revisionId?.trim()) featureBlockers.push('REVISION_AWARE_REVISION_ID_REQUIRED');

    if (featureBlockers.length > 0) {
      rejectedFeatureKeys.push(feature.featureKey);
      blockers.push(...featureBlockers.map(reason => `${feature.featureKey}:${reason}`));
    } else {
      eligibleFeatureKeys.push(feature.featureKey);
    }
  }

  return Object.freeze({
    policyVersion: COMMODITY_POINT_IN_TIME_POLICY_VERSION,
    valid: blockers.length === 0,
    blockers: Object.freeze(blockers),
    eligibleFeatureKeys: Object.freeze(eligibleFeatureKeys),
    rejectedFeatureKeys: Object.freeze(rejectedFeatureKeys),
    canonical: false,
    scoreEligible: false,
  });
}

/**
 * Result constructor keeps validation output non-authorizing. Even a complete evidence package is
 * only eligible for an Owner review; it cannot promote a Registry challenger or create a
 * CanonicalScoreResult. The constructor consumes the actual PIT/cost validation results rather than
 * caller-supplied booleans; OOS is represented by a versioned/evidence identifier instead of a flag.
 */
export function buildCommodityBacktestResult(input: {
  readonly runId: string;
  readonly request: CommodityBacktestRequest;
  readonly metrics: CommodityBacktestMetrics;
  readonly equityCurve: readonly CommodityBacktestEquityPoint[];
  readonly leakageBlockers: readonly string[];
  readonly benchmarkIds: readonly string[];
  readonly regimeDiagnostics?: Readonly<Record<string, number | null>>;
  readonly domainDiagnostics?: Readonly<Record<string, number | null>>;
  readonly pointInTimeValidation: CommodityPointInTimeValidation;
  readonly costAssumptionValidation: CommodityBacktestRequestValidation;
  readonly outOfSampleEvidenceId: string | null;
  readonly correlationEvidenceId: string | null;
  readonly sensitivityEvidenceId: string | null;
}): CommodityBacktestResult {
  const requestValidation = validateCommodityBacktestRequest(input.request);
  const pointInTimeValidated = input.pointInTimeValidation.valid;
  const costAssumptionsValidated = input.costAssumptionValidation.valid;
  const outOfSampleValidated = Boolean(input.outOfSampleEvidenceId?.trim());
  const promotionEvidenceEligible = requestValidation.valid
    && input.leakageBlockers.length === 0
    && pointInTimeValidated
    && costAssumptionsValidated
    && outOfSampleValidated
    && input.benchmarkIds.length > 0
    && Boolean(input.correlationEvidenceId?.trim())
    && Boolean(input.sensitivityEvidenceId?.trim());

  return Object.freeze({
    contractVersion: COMMODITY_BACKTEST_CONTRACT_VERSION,
    runId: input.runId,
    request: input.request,
    metrics: input.metrics,
    equityCurve: Object.freeze([...input.equityCurve]),
    leakageBlockers: Object.freeze([...input.leakageBlockers]),
    benchmarkIds: Object.freeze([...input.benchmarkIds]),
    regimeDiagnostics: Object.freeze({ ...(input.regimeDiagnostics ?? {}) }),
    domainDiagnostics: Object.freeze({ ...(input.domainDiagnostics ?? {}) }),
    pointInTimeValidated,
    costAssumptionsValidated,
    outOfSampleValidated,
    outOfSampleEvidenceId: input.outOfSampleEvidenceId,
    correlationEvidenceId: input.correlationEvidenceId,
    sensitivityEvidenceId: input.sensitivityEvidenceId,
    promotionEvidenceEligible,
    authority: 'VALIDATION_ONLY',
    canonical: false,
    scoreEligible: false,
  });
}
