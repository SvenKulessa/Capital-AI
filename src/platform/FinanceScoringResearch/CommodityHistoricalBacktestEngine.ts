import { createHash } from 'node:crypto';
import {
  COMMODITY_POINT_IN_TIME_POLICY_VERSION,
  buildCommodityBacktestResult,
  validateCommodityBacktestCostAssumptions,
  validateCommodityBacktestRequest,
  validateCommodityPointInTimeSnapshot,
  type CommodityBacktestCostAssumptions,
  type CommodityBacktestMetrics,
  type CommodityBacktestRequest,
  type CommodityBacktestRequestValidation,
  type CommodityBacktestResult,
  type CommodityPointInTimeFeatureSnapshot,
  type CommodityPointInTimeValidation,
} from './CommodityBacktestingContracts';
import {
  validateCommodityCandidateWeightProfile,
  type CommodityCandidateWeightProfile,
} from './CommodityModelValidation';
import {
  COMMODITY_RESEARCH_MODEL_CONTRACTS,
  type CommodityResearchDomain,
  type CommodityResearchModelContract,
  type CommodityResearchModelId,
} from './CommodityResearchModelContracts';

export const COMMODITY_HISTORICAL_DATASET_CONTRACT_VERSION =
  'commodity-historical-dataset/1.0.0' as const;
export const COMMODITY_WALK_FORWARD_EXECUTION_VERSION =
  'commodity-walk-forward-validation/1.0.0' as const;

export type CommodityHistoricalBenchmarkKind =
  | 'CURRENT_CHAMPION'
  | 'NAIVE_BASELINE'
  | 'CUSTOM_RESEARCH';

export interface CommodityHistoricalBenchmarkDefinition {
  readonly benchmarkId: string;
  readonly kind: CommodityHistoricalBenchmarkKind;
  readonly version: string;
  readonly description: string;
}

export interface CommodityHistoricalBenchmarkReturn {
  readonly benchmarkId: string;
  readonly decisionAt: string;
  readonly realizedAt: string;
  readonly return: number;
  readonly evidenceId: string;
}

/**
 * Historical observation used by the validation engine.
 *
 * Factor values are already transformed, dimensionless latent-factor values. Normalization stays a
 * separate versioned research concern and is bound by `normalizationEvidenceId`. Each factor is also
 * bound to PIT-eligible raw feature evidence; one raw feature cannot authorize multiple factors.
 */
export interface CommodityHistoricalObservation {
  readonly observationId: string;
  readonly assetId: string;
  readonly symbol: string;
  readonly domain: CommodityResearchDomain;
  readonly decisionAt: string;
  readonly realizedAt: string;
  readonly realizedReturn: number;
  readonly confidence: number;
  readonly universeMembershipEvidenceId: string;
  readonly normalizationEvidenceId: string;
  readonly pointInTimeSnapshot: CommodityPointInTimeFeatureSnapshot;
  readonly normalizedFactorValues: Readonly<Record<string, number | null | undefined>>;
  readonly factorEvidenceFeatureKeys: Readonly<Record<string, readonly string[]>>;
  readonly regime?: string | null;
}

export interface CommodityHistoricalDataset {
  readonly contractVersion: typeof COMMODITY_HISTORICAL_DATASET_CONTRACT_VERSION;
  readonly datasetId: string;
  readonly datasetVersion: string;
  readonly createdAt: string;
  readonly modelId: CommodityResearchModelId;
  readonly modelVersion: '0.1.0';
  readonly universeId: string;
  readonly normalizationContractVersion: string;
  readonly observations: readonly CommodityHistoricalObservation[];
  readonly benchmarks: readonly CommodityHistoricalBenchmarkDefinition[];
  readonly benchmarkReturns: readonly CommodityHistoricalBenchmarkReturn[];
  readonly immutable: true;
  readonly authority: 'VALIDATION_ONLY';
}

export interface CommodityHistoricalDatasetValidation {
  readonly contractVersion: typeof COMMODITY_HISTORICAL_DATASET_CONTRACT_VERSION;
  readonly datasetFingerprint: string;
  readonly valid: boolean;
  readonly blockers: readonly string[];
  readonly pointInTimeValid: boolean;
  readonly pointInTimeBlockers: readonly string[];
  readonly eligibleFeatureKeys: readonly string[];
  readonly rejectedFeatureKeys: readonly string[];
  readonly expectedLatentFactors: readonly string[];
  readonly decisionTimestamps: readonly string[];
  readonly canonical: false;
  readonly scoreEligible: false;
}

export interface CommodityOosSplit {
  readonly splitId: string;
  readonly mode: CommodityBacktestRequest['windowMode'];
  readonly testDecisionAt: string;
  readonly trainingObservationIds: readonly string[];
  readonly testObservationIds: readonly string[];
  readonly trainingStartAt: string;
  readonly trainingEndAt: string;
  readonly trainingObservations: number;
  readonly testObservations: number;
}

export interface CommodityOosSplitPlan {
  readonly executionVersion: typeof COMMODITY_WALK_FORWARD_EXECUTION_VERSION;
  readonly valid: boolean;
  readonly splits: readonly CommodityOosSplit[];
  readonly skippedDecisionTimestamps: readonly string[];
  readonly blockers: readonly string[];
  readonly canonical: false;
  readonly scoreEligible: false;
}

export interface CommodityHistoricalPrediction {
  readonly observationId: string;
  readonly assetId: string;
  readonly symbol: string;
  readonly domain: CommodityResearchDomain;
  readonly decisionAt: string;
  readonly signal: number;
  readonly realizedReturn: number;
  readonly factorContributions: Readonly<Record<string, number>>;
  readonly regime: string | null;
}

export interface CommodityOosPeriodReturn {
  readonly decisionAt: string;
  readonly selectedAssetIds: readonly string[];
  readonly grossReturn: number;
  readonly turnover: number;
  readonly costRate: number;
  readonly netReturn: number;
}

export interface CommodityBenchmarkSummary {
  readonly benchmarkId: string;
  readonly kind: CommodityHistoricalBenchmarkKind;
  readonly periods: number;
  readonly annualizedReturn: number | null;
  readonly annualizedVolatility: number | null;
  readonly maxDrawdown: number | null;
}

export interface CommodityHistoricalBacktestExecution {
  readonly executionVersion: typeof COMMODITY_WALK_FORWARD_EXECUTION_VERSION;
  readonly datasetValidation: CommodityHistoricalDatasetValidation;
  readonly splitPlan: CommodityOosSplitPlan;
  readonly predictions: readonly CommodityHistoricalPrediction[];
  readonly periodReturns: readonly CommodityOosPeriodReturn[];
  readonly benchmarkSummaries: readonly CommodityBenchmarkSummary[];
  readonly outOfSampleEvidenceId: string | null;
  readonly blockers: readonly string[];
  readonly result: CommodityBacktestResult;
  readonly authority: 'VALIDATION_ONLY';
  readonly canonical: false;
  readonly scoreEligible: false;
}

function modelForId(modelId: CommodityResearchModelId): CommodityResearchModelContract {
  const model = COMMODITY_RESEARCH_MODEL_CONTRACTS.find(item => item.modelId === modelId);
  if (!model) throw new Error(`COMMODITY_RESEARCH_MODEL_NOT_FOUND:${modelId}`);
  return model;
}

function finite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function timestamp(value: string): number {
  return Date.parse(value);
}

function round(value: number, digits = 12): number {
  return Number(value.toFixed(digits));
}

function mean(values: readonly number[]): number | null {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: readonly number[]): number | null {
  const average = mean(values);
  if (average === null || values.length < 2) return null;
  return Math.sqrt(values.reduce((sum, value) => sum + ((value - average) ** 2), 0) / values.length);
}

function periodsPerYear(frequency: CommodityBacktestRequest['rebalanceFrequency']): number {
  switch (frequency) {
    case 'daily': return 252;
    case 'weekly': return 52;
    case 'monthly': return 12;
  }
}

function annualizedReturn(returns: readonly number[], frequency: CommodityBacktestRequest['rebalanceFrequency']): number | null {
  if (returns.length === 0 || returns.some(value => !finite(value) || value <= -1)) return null;
  const growth = returns.reduce((value, periodReturn) => value * (1 + periodReturn), 1);
  return growth > 0 ? round((growth ** (periodsPerYear(frequency) / returns.length)) - 1) : null;
}

function annualizedVolatility(returns: readonly number[], frequency: CommodityBacktestRequest['rebalanceFrequency']): number | null {
  const deviation = standardDeviation(returns);
  return deviation === null ? null : round(deviation * Math.sqrt(periodsPerYear(frequency)));
}

function maxDrawdownFromReturns(returns: readonly number[]): number | null {
  if (returns.length === 0) return null;
  let value = 1;
  let peak = 1;
  let maxDrawdown = 0;
  for (const periodReturn of returns) {
    if (!finite(periodReturn) || periodReturn <= -1) return null;
    value *= 1 + periodReturn;
    peak = Math.max(peak, value);
    maxDrawdown = Math.min(maxDrawdown, (value / peak) - 1);
  }
  return round(maxDrawdown);
}

function profitFactor(returns: readonly number[]): number | null {
  const positive = returns.filter(value => value > 0).reduce((sum, value) => sum + value, 0);
  const negative = Math.abs(returns.filter(value => value < 0).reduce((sum, value) => sum + value, 0));
  if (negative === 0) return positive > 0 ? null : 0;
  return round(positive / negative);
}

function averageRanks(values: readonly number[]): number[] {
  const indexed = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value || a.index - b.index);
  const ranks = new Array<number>(values.length);
  let cursor = 0;
  while (cursor < indexed.length) {
    let end = cursor + 1;
    while (end < indexed.length && indexed[end].value === indexed[cursor].value) end += 1;
    const averageRank = ((cursor + 1) + end) / 2;
    for (let position = cursor; position < end; position += 1) ranks[indexed[position].index] = averageRank;
    cursor = end;
  }
  return ranks;
}

function pearson(left: readonly number[], right: readonly number[]): number | null {
  if (left.length !== right.length || left.length < 2) return null;
  const leftMean = mean(left);
  const rightMean = mean(right);
  if (leftMean === null || rightMean === null) return null;
  let numerator = 0;
  let leftSquared = 0;
  let rightSquared = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftDelta = left[index] - leftMean;
    const rightDelta = right[index] - rightMean;
    numerator += leftDelta * rightDelta;
    leftSquared += leftDelta * leftDelta;
    rightSquared += rightDelta * rightDelta;
  }
  const denominator = Math.sqrt(leftSquared * rightSquared);
  return denominator > 0 ? round(numerator / denominator) : null;
}

function spearman(left: readonly number[], right: readonly number[]): number | null {
  return left.length === right.length && left.length >= 2
    ? pearson(averageRanks(left), averageRanks(right))
    : null;
}

function rankMonotonicity(predictions: readonly CommodityHistoricalPrediction[]): number | null {
  if (predictions.length < 3) return null;
  const sorted = [...predictions].sort((a, b) => a.signal - b.signal || a.assetId.localeCompare(b.assetId));
  const bucketCount = Math.min(5, sorted.length);
  const buckets: number[][] = Array.from({ length: bucketCount }, () => []);
  sorted.forEach((prediction, index) => {
    const bucket = Math.min(bucketCount - 1, Math.floor(index * bucketCount / sorted.length));
    buckets[bucket].push(prediction.realizedReturn);
  });
  const bucketMeans = buckets.map(bucket => mean(bucket));
  if (bucketMeans.some(value => value === null)) return null;
  return spearman(bucketMeans.map((_, index) => index + 1), bucketMeans as number[]);
}

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function sortedRecord(record: Readonly<Record<string, unknown>>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).sort(([left], [right]) => left.localeCompare(right)));
}

function expectedLatentFactors(model: CommodityResearchModelContract): string[] {
  return [...new Set(model.features.filter(feature => feature.role === 'RAW_EVIDENCE').map(feature => feature.latentFactor))]
    .sort((left, right) => left.localeCompare(right));
}

function benchmarkKey(benchmarkId: string, decisionAt: string): string {
  return `${benchmarkId}::${decisionAt}`;
}

function datasetFingerprint(dataset: CommodityHistoricalDataset): string {
  const observations = [...dataset.observations]
    .sort((a, b) => a.observationId.localeCompare(b.observationId))
    .map(observation => ({
      observationId: observation.observationId,
      assetId: observation.assetId,
      symbol: observation.symbol,
      domain: observation.domain,
      decisionAt: observation.decisionAt,
      realizedAt: observation.realizedAt,
      realizedReturn: observation.realizedReturn,
      confidence: observation.confidence,
      universeMembershipEvidenceId: observation.universeMembershipEvidenceId,
      normalizationEvidenceId: observation.normalizationEvidenceId,
      normalizedFactorValues: sortedRecord(observation.normalizedFactorValues),
      factorEvidenceFeatureKeys: Object.fromEntries(Object.entries(observation.factorEvidenceFeatureKeys)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([factor, keys]) => [factor, [...keys].sort()])),
      pointInTimeSnapshot: {
        policyVersion: observation.pointInTimeSnapshot.policyVersion,
        assetId: observation.pointInTimeSnapshot.assetId,
        decisionAt: observation.pointInTimeSnapshot.decisionAt,
        values: [...observation.pointInTimeSnapshot.values]
          .sort((a, b) => a.featureKey.localeCompare(b.featureKey))
          .map(value => ({ ...value })),
      },
      regime: observation.regime ?? null,
    }));
  const benchmarks = [...dataset.benchmarks].sort((a, b) => a.benchmarkId.localeCompare(b.benchmarkId));
  const benchmarkReturns = [...dataset.benchmarkReturns]
    .sort((a, b) => benchmarkKey(a.benchmarkId, a.decisionAt).localeCompare(benchmarkKey(b.benchmarkId, b.decisionAt)));
  return sha256({
    contractVersion: dataset.contractVersion,
    datasetId: dataset.datasetId,
    datasetVersion: dataset.datasetVersion,
    modelId: dataset.modelId,
    modelVersion: dataset.modelVersion,
    universeId: dataset.universeId,
    normalizationContractVersion: dataset.normalizationContractVersion,
    observations,
    benchmarks,
    benchmarkReturns,
  });
}

/** Validates a historical dataset without consulting a live provider. */
export function validateCommodityHistoricalDataset(
  dataset: CommodityHistoricalDataset,
): CommodityHistoricalDatasetValidation {
  const model = modelForId(dataset.modelId);
  const blockers: string[] = [];
  const pointInTimeBlockers: string[] = [];
  const eligibleFeatureKeys = new Set<string>();
  const rejectedFeatureKeys = new Set<string>();
  const factors = expectedLatentFactors(model);

  if (dataset.contractVersion !== COMMODITY_HISTORICAL_DATASET_CONTRACT_VERSION) blockers.push('HISTORICAL_DATASET_CONTRACT_VERSION_MISMATCH');
  if (!dataset.datasetId.trim()) blockers.push('HISTORICAL_DATASET_ID_REQUIRED');
  if (!dataset.datasetVersion.trim()) blockers.push('HISTORICAL_DATASET_VERSION_REQUIRED');
  if (!Number.isFinite(timestamp(dataset.createdAt))) blockers.push('HISTORICAL_DATASET_CREATED_AT_INVALID');
  if (dataset.immutable !== true) blockers.push('HISTORICAL_DATASET_MUST_BE_IMMUTABLE');
  if (dataset.authority !== 'VALIDATION_ONLY') blockers.push('HISTORICAL_DATASET_AUTHORITY_INVALID');
  if (dataset.modelVersion !== model.modelVersion) blockers.push('HISTORICAL_DATASET_MODEL_VERSION_MISMATCH');
  if (!dataset.universeId.trim()) blockers.push('HISTORICAL_DATASET_UNIVERSE_REQUIRED');
  if (!dataset.normalizationContractVersion.trim()) blockers.push('HISTORICAL_NORMALIZATION_CONTRACT_REQUIRED');
  if (dataset.observations.length === 0) blockers.push('HISTORICAL_OBSERVATIONS_REQUIRED');

  const benchmarkIds = new Set<string>();
  let championBenchmark = false;
  let naiveBenchmark = false;
  for (const benchmark of dataset.benchmarks) {
    if (!benchmark.benchmarkId.trim()) blockers.push('BENCHMARK_ID_REQUIRED');
    if (benchmarkIds.has(benchmark.benchmarkId)) blockers.push(`BENCHMARK_ID_DUPLICATE:${benchmark.benchmarkId}`);
    benchmarkIds.add(benchmark.benchmarkId);
    if (!benchmark.version.trim()) blockers.push(`BENCHMARK_VERSION_REQUIRED:${benchmark.benchmarkId}`);
    if (!benchmark.description.trim()) blockers.push(`BENCHMARK_DESCRIPTION_REQUIRED:${benchmark.benchmarkId}`);
    championBenchmark ||= benchmark.kind === 'CURRENT_CHAMPION';
    naiveBenchmark ||= benchmark.kind === 'NAIVE_BASELINE';
  }
  if (!championBenchmark) blockers.push('CURRENT_CHAMPION_BENCHMARK_REQUIRED');
  if (!naiveBenchmark) blockers.push('NAIVE_BASELINE_REQUIRED');

  const benchmarkReturnKeys = new Set<string>();
  for (const item of dataset.benchmarkReturns) {
    if (!benchmarkIds.has(item.benchmarkId)) blockers.push(`BENCHMARK_RETURN_UNKNOWN_ID:${item.benchmarkId}`);
    const key = benchmarkKey(item.benchmarkId, item.decisionAt);
    if (benchmarkReturnKeys.has(key)) blockers.push(`BENCHMARK_RETURN_DUPLICATE:${key}`);
    benchmarkReturnKeys.add(key);
    const decisionMs = timestamp(item.decisionAt);
    const realizedMs = timestamp(item.realizedAt);
    if (!Number.isFinite(decisionMs) || !Number.isFinite(realizedMs) || realizedMs <= decisionMs) blockers.push(`BENCHMARK_RETURN_TIME_INVALID:${key}`);
    if (!finite(item.return) || item.return <= -1) blockers.push(`BENCHMARK_RETURN_INVALID:${key}`);
    if (!item.evidenceId.trim()) blockers.push(`BENCHMARK_RETURN_EVIDENCE_REQUIRED:${key}`);
  }

  const observationIds = new Set<string>();
  const membershipKeys = new Set<string>();
  const decisionTimestamps = new Set<string>();
  for (const observation of dataset.observations) {
    const prefix = observation.observationId || `${observation.assetId}@${observation.decisionAt}`;
    if (!observation.observationId.trim()) blockers.push('HISTORICAL_OBSERVATION_ID_REQUIRED');
    if (observationIds.has(observation.observationId)) blockers.push(`HISTORICAL_OBSERVATION_ID_DUPLICATE:${observation.observationId}`);
    observationIds.add(observation.observationId);
    if (!observation.assetId.trim()) blockers.push(`${prefix}:ASSET_ID_REQUIRED`);
    if (!observation.symbol.trim()) blockers.push(`${prefix}:SYMBOL_REQUIRED`);
    if (observation.domain !== model.domain) blockers.push(`${prefix}:DOMAIN_MISMATCH`);

    const decisionMs = timestamp(observation.decisionAt);
    const realizedMs = timestamp(observation.realizedAt);
    if (!Number.isFinite(decisionMs)) blockers.push(`${prefix}:DECISION_AT_INVALID`);
    else decisionTimestamps.add(observation.decisionAt);
    if (!Number.isFinite(realizedMs) || (Number.isFinite(decisionMs) && realizedMs <= decisionMs)) blockers.push(`${prefix}:REALIZED_AT_INVALID`);
    if (!finite(observation.realizedReturn) || observation.realizedReturn <= -1) blockers.push(`${prefix}:REALIZED_RETURN_INVALID`);
    if (!finite(observation.confidence) || observation.confidence < 0 || observation.confidence > 1) blockers.push(`${prefix}:CONFIDENCE_INVALID`);
    if (!observation.universeMembershipEvidenceId.trim()) blockers.push(`${prefix}:UNIVERSE_MEMBERSHIP_EVIDENCE_REQUIRED`);
    if (!observation.normalizationEvidenceId.trim()) blockers.push(`${prefix}:NORMALIZATION_EVIDENCE_REQUIRED`);

    const membershipKey = `${observation.assetId}::${observation.decisionAt}`;
    if (membershipKeys.has(membershipKey)) blockers.push(`${prefix}:ASSET_DECISION_DUPLICATE`);
    membershipKeys.add(membershipKey);

    if (observation.pointInTimeSnapshot.assetId !== observation.assetId) blockers.push(`${prefix}:PIT_ASSET_ID_MISMATCH`);
    if (observation.pointInTimeSnapshot.decisionAt !== observation.decisionAt) blockers.push(`${prefix}:PIT_DECISION_AT_MISMATCH`);
    const pit = validateCommodityPointInTimeSnapshot(observation.pointInTimeSnapshot);
    pit.eligibleFeatureKeys.forEach(key => eligibleFeatureKeys.add(key));
    pit.rejectedFeatureKeys.forEach(key => rejectedFeatureKeys.add(key));
    pit.blockers.forEach(blocker => pointInTimeBlockers.push(`${prefix}:${blocker}`));

    const suppliedFactors = Object.keys(observation.normalizedFactorValues).sort();
    const unknownFactors = suppliedFactors.filter(factor => !factors.includes(factor));
    if (unknownFactors.length > 0) blockers.push(`${prefix}:UNKNOWN_FACTORS:${unknownFactors.join(',')}`);
    const evidenceOwners = new Map<string, string>();
    for (const factor of factors) {
      if (!finite(observation.normalizedFactorValues[factor])) blockers.push(`${prefix}:FACTOR_VALUE_REQUIRED:${factor}`);
      const evidenceKeys = observation.factorEvidenceFeatureKeys[factor] ?? [];
      if (evidenceKeys.length === 0) blockers.push(`${prefix}:FACTOR_EVIDENCE_REQUIRED:${factor}`);
      for (const featureKey of evidenceKeys) {
        const definition = model.features.find(feature => feature.key === featureKey && feature.role === 'RAW_EVIDENCE');
        if (!definition) {
          blockers.push(`${prefix}:FACTOR_EVIDENCE_UNKNOWN_FEATURE:${factor}:${featureKey}`);
          continue;
        }
        if (definition.latentFactor !== factor) blockers.push(`${prefix}:FACTOR_EVIDENCE_LATENT_FACTOR_MISMATCH:${factor}:${featureKey}`);
        if (!pit.eligibleFeatureKeys.includes(featureKey)) blockers.push(`${prefix}:FACTOR_EVIDENCE_NOT_PIT_ELIGIBLE:${factor}:${featureKey}`);
        const existingOwner = evidenceOwners.get(featureKey);
        if (existingOwner && existingOwner !== factor) blockers.push(`${prefix}:FACTOR_EVIDENCE_REUSED_CROSS_FACTOR:${featureKey}:${existingOwner}:${factor}`);
        evidenceOwners.set(featureKey, factor);
      }
    }
  }

  blockers.push(...pointInTimeBlockers);
  return Object.freeze({
    contractVersion: COMMODITY_HISTORICAL_DATASET_CONTRACT_VERSION,
    datasetFingerprint: datasetFingerprint(dataset),
    valid: blockers.length === 0,
    blockers: Object.freeze(blockers),
    pointInTimeValid: pointInTimeBlockers.length === 0,
    pointInTimeBlockers: Object.freeze(pointInTimeBlockers),
    eligibleFeatureKeys: Object.freeze([...eligibleFeatureKeys].sort()),
    rejectedFeatureKeys: Object.freeze([...rejectedFeatureKeys].sort()),
    expectedLatentFactors: Object.freeze(factors),
    decisionTimestamps: Object.freeze([...decisionTimestamps].sort((a, b) => timestamp(a) - timestamp(b))),
    canonical: false,
    scoreEligible: false,
  });
}

function selectWalkForwardTraining(
  observations: readonly CommodityHistoricalObservation[],
  minimumTrainingObservations: number,
): CommodityHistoricalObservation[] {
  const byDecision = new Map<string, CommodityHistoricalObservation[]>();
  for (const observation of observations) {
    const group = byDecision.get(observation.decisionAt) ?? [];
    group.push(observation);
    byDecision.set(observation.decisionAt, group);
  }
  const decisions = [...byDecision.keys()].sort((a, b) => timestamp(b) - timestamp(a));
  const selected: CommodityHistoricalObservation[] = [];
  for (const decision of decisions) {
    selected.push(...(byDecision.get(decision) ?? []));
    if (selected.length >= minimumTrainingObservations) break;
  }
  return selected.sort((a, b) => timestamp(a.decisionAt) - timestamp(b.decisionAt) || a.assetId.localeCompare(b.assetId));
}

/** Builds temporal OOS splits and excludes targets that were not yet realized at test time. */
export function buildCommodityOosSplitPlan(
  dataset: CommodityHistoricalDataset,
  request: CommodityBacktestRequest,
): CommodityOosSplitPlan {
  const requestValidation = validateCommodityBacktestRequest(request);
  const datasetValidation = validateCommodityHistoricalDataset(dataset);
  const blockers = [...requestValidation.blockers, ...datasetValidation.blockers];
  const splits: CommodityOosSplit[] = [];
  const skippedDecisionTimestamps: string[] = [];

  if (dataset.modelId !== request.modelId) blockers.push('BACKTEST_DATASET_MODEL_MISMATCH');
  if (dataset.modelVersion !== request.modelVersion) blockers.push('BACKTEST_DATASET_MODEL_VERSION_MISMATCH');
  if (dataset.universeId !== request.universeId) blockers.push('BACKTEST_DATASET_UNIVERSE_MISMATCH');
  if (!request.domains.includes(modelForId(dataset.modelId).domain)) blockers.push('BACKTEST_DATASET_DOMAIN_NOT_REQUESTED');

  if (blockers.length === 0) {
    const startMs = timestamp(request.startDate);
    const endMs = timestamp(request.endDate);
    const inRange = dataset.observations.filter(observation => {
      const decisionMs = timestamp(observation.decisionAt);
      return decisionMs >= startMs && decisionMs <= endMs && observation.confidence >= request.minConfidence;
    });
    const decisionTimestamps = [...new Set(inRange.map(observation => observation.decisionAt))]
      .sort((a, b) => timestamp(a) - timestamp(b));

    for (const testDecisionAt of decisionTimestamps) {
      const testMs = timestamp(testDecisionAt);
      const test = inRange.filter(observation => observation.decisionAt === testDecisionAt);
      const eligibleTraining = inRange.filter(observation => (
        timestamp(observation.decisionAt) < testMs
        && timestamp(observation.realizedAt) <= testMs
      ));
      if (eligibleTraining.length < request.minimumTrainingObservations) {
        skippedDecisionTimestamps.push(testDecisionAt);
        continue;
      }
      const training = request.windowMode === 'expanding-window'
        ? eligibleTraining
        : selectWalkForwardTraining(eligibleTraining, request.minimumTrainingObservations);
      const trainingStartAt = training[0]?.decisionAt;
      const trainingEndAt = training.at(-1)?.decisionAt;
      if (!trainingStartAt || !trainingEndAt || test.length === 0) continue;
      splits.push(Object.freeze({
        splitId: `split:${sha256({ datasetFingerprint: datasetValidation.datasetFingerprint, mode: request.windowMode, testDecisionAt, training: training.map(item => item.observationId), test: test.map(item => item.observationId) }).slice(0, 24)}`,
        mode: request.windowMode,
        testDecisionAt,
        trainingObservationIds: Object.freeze(training.map(item => item.observationId)),
        testObservationIds: Object.freeze(test.map(item => item.observationId)),
        trainingStartAt,
        trainingEndAt,
        trainingObservations: training.length,
        testObservations: test.length,
      }));
    }
    if (splits.length < 2) blockers.push(`OOS_TEST_PERIODS_INSUFFICIENT:${splits.length}`);
  }

  return Object.freeze({
    executionVersion: COMMODITY_WALK_FORWARD_EXECUTION_VERSION,
    valid: blockers.length === 0,
    splits: Object.freeze(splits),
    skippedDecisionTimestamps: Object.freeze(skippedDecisionTimestamps),
    blockers: Object.freeze(blockers),
    canonical: false,
    scoreEligible: false,
  });
}

function scoreObservation(
  observation: CommodityHistoricalObservation,
  profile: CommodityCandidateWeightProfile,
): CommodityHistoricalPrediction {
  const factorContributions: Record<string, number> = Object.fromEntries(
    Object.entries(profile.factorWeights)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([factor, weight]) => {
        const value = observation.normalizedFactorValues[factor];
        if (!finite(value)) throw new Error(`COMMODITY_BACKTEST_FACTOR_VALUE_MISSING:${observation.observationId}:${factor}`);
        return [factor, round(weight * value)];
      }),
  );
  return Object.freeze({
    observationId: observation.observationId,
    assetId: observation.assetId,
    symbol: observation.symbol,
    domain: observation.domain,
    decisionAt: observation.decisionAt,
    signal: round(Object.values(factorContributions).reduce((sum, value) => sum + value, 0)),
    realizedReturn: observation.realizedReturn,
    factorContributions: Object.freeze(factorContributions),
    regime: observation.regime?.trim() || null,
  });
}

function turnover(previous: readonly string[], current: readonly string[]): number {
  if (current.length === 0) return 0;
  if (previous.length === 0) return 1;
  const previousSet = new Set(previous);
  const overlap = current.filter(assetId => previousSet.has(assetId)).length;
  return round(1 - (overlap / Math.max(previous.length, current.length)));
}

function computeMetrics(
  predictionsByDecision: ReadonlyMap<string, readonly CommodityHistoricalPrediction[]>,
  periods: readonly CommodityOosPeriodReturn[],
  request: CommodityBacktestRequest,
): CommodityBacktestMetrics {
  const informationCoefficients: number[] = [];
  const monotonicities: number[] = [];
  let topNPositive = 0;
  let topNTotal = 0;
  for (const predictions of predictionsByDecision.values()) {
    const ic = spearman(predictions.map(item => item.signal), predictions.map(item => item.realizedReturn));
    if (ic !== null) informationCoefficients.push(ic);
    const monotonicity = rankMonotonicity(predictions);
    if (monotonicity !== null) monotonicities.push(monotonicity);
    const selected = [...predictions].sort((a, b) => b.signal - a.signal || a.assetId.localeCompare(b.assetId)).slice(0, request.topN);
    topNPositive += selected.filter(item => item.realizedReturn > 0).length;
    topNTotal += selected.length;
  }
  const netReturns = periods.map(period => period.netReturn);
  return Object.freeze({
    rankInformationCoefficient: informationCoefficients.length > 0 ? round(mean(informationCoefficients) ?? 0) : null,
    rankMonotonicity: monotonicities.length > 0 ? round(mean(monotonicities) ?? 0) : null,
    hitRateTopN: topNTotal > 0 ? round(topNPositive / topNTotal) : null,
    annualizedReturn: annualizedReturn(netReturns, request.rebalanceFrequency),
    annualizedVolatility: annualizedVolatility(netReturns, request.rebalanceFrequency),
    maxDrawdown: maxDrawdownFromReturns(netReturns),
    profitFactor: profitFactor(netReturns),
    turnover: periods.length > 0 ? round(mean(periods.map(period => period.turnover)) ?? 0) : null,
    averageHoldingPeriodDays: request.holdingPeriodDays,
  });
}

function buildBenchmarkSummaries(
  dataset: CommodityHistoricalDataset,
  testDecisionTimestamps: readonly string[],
  frequency: CommodityBacktestRequest['rebalanceFrequency'],
): CommodityBenchmarkSummary[] {
  const lookup = new Map(dataset.benchmarkReturns.map(item => [benchmarkKey(item.benchmarkId, item.decisionAt), item]));
  return dataset.benchmarks.map(benchmark => {
    const returns = testDecisionTimestamps
      .map(decisionAt => lookup.get(benchmarkKey(benchmark.benchmarkId, decisionAt))?.return)
      .filter(finite);
    return Object.freeze({
      benchmarkId: benchmark.benchmarkId,
      kind: benchmark.kind,
      periods: returns.length,
      annualizedReturn: annualizedReturn(returns, frequency),
      annualizedVolatility: annualizedVolatility(returns, frequency),
      maxDrawdown: maxDrawdownFromReturns(returns),
    });
  });
}

function aggregatePointInTimeValidation(validation: CommodityHistoricalDatasetValidation): CommodityPointInTimeValidation {
  return Object.freeze({
    policyVersion: COMMODITY_POINT_IN_TIME_POLICY_VERSION,
    valid: validation.pointInTimeValid,
    blockers: validation.pointInTimeBlockers,
    eligibleFeatureKeys: validation.eligibleFeatureKeys,
    rejectedFeatureKeys: validation.rejectedFeatureKeys,
    canonical: false,
    scoreEligible: false,
  });
}

function combineCostValidation(
  request: CommodityBacktestRequest,
  assumptions: CommodityBacktestCostAssumptions,
): CommodityBacktestRequestValidation {
  const validation = validateCommodityBacktestCostAssumptions(assumptions);
  const blockers = [...validation.blockers];
  if (request.costAssumptionId !== assumptions.assumptionId) blockers.push('COST_ASSUMPTION_ID_MISMATCH');
  if (request.costAssumptionVersion !== assumptions.assumptionVersion) blockers.push('COST_ASSUMPTION_VERSION_MISMATCH');
  if (timestamp(assumptions.effectiveFrom) > timestamp(request.startDate)) blockers.push('COST_ASSUMPTION_NOT_EFFECTIVE_AT_BACKTEST_START');
  return Object.freeze({ valid: blockers.length === 0, blockers: Object.freeze(blockers) });
}

/** Executes a validation-only historical replay for a research candidate profile. */
export function executeCommodityHistoricalBacktest(input: {
  readonly runId: string;
  readonly request: CommodityBacktestRequest;
  readonly dataset: CommodityHistoricalDataset;
  readonly weightProfile: CommodityCandidateWeightProfile;
  readonly costAssumptions: CommodityBacktestCostAssumptions;
  readonly correlationEvidenceId: string | null;
  readonly sensitivityEvidenceId: string | null;
}): CommodityHistoricalBacktestExecution {
  const datasetValidation = validateCommodityHistoricalDataset(input.dataset);
  const requestValidation = validateCommodityBacktestRequest(input.request);
  const weightValidation = validateCommodityCandidateWeightProfile(input.weightProfile);
  const costValidation = combineCostValidation(input.request, input.costAssumptions);
  const splitPlan = buildCommodityOosSplitPlan(input.dataset, input.request);
  const blockers = [
    ...datasetValidation.blockers,
    ...requestValidation.blockers,
    ...weightValidation.blockers,
    ...costValidation.blockers,
    ...splitPlan.blockers,
  ];

  if (input.weightProfile.modelId !== input.request.modelId) blockers.push('BACKTEST_WEIGHT_PROFILE_MODEL_MISMATCH');
  if (input.weightProfile.modelVersion !== input.request.modelVersion) blockers.push('BACKTEST_WEIGHT_PROFILE_MODEL_VERSION_MISMATCH');

  const observationById = new Map(input.dataset.observations.map(observation => [observation.observationId, observation]));
  const benchmarkLookup = new Map(input.dataset.benchmarkReturns.map(item => [benchmarkKey(item.benchmarkId, item.decisionAt), item]));
  const predictions: CommodityHistoricalPrediction[] = [];
  const predictionsByDecision = new Map<string, CommodityHistoricalPrediction[]>();
  const periodReturns: CommodityOosPeriodReturn[] = [];
  let previousSelection: string[] = [];
  const oneTurnCostRate = round((input.costAssumptions.commissionBps + input.costAssumptions.slippageBps + input.costAssumptions.spreadBps) / 10_000);

  if (blockers.length === 0) {
    for (const split of splitPlan.splits) {
      const testObservations = split.testObservationIds
        .map(id => observationById.get(id))
        .filter((item): item is CommodityHistoricalObservation => Boolean(item));
      if (testObservations.length < input.request.topN) {
        blockers.push(`OOS_TEST_UNIVERSE_BELOW_TOP_N:${split.testDecisionAt}:${testObservations.length}`);
        continue;
      }
      const currentPredictions = testObservations
        .map(observation => scoreObservation(observation, input.weightProfile))
        .sort((a, b) => b.signal - a.signal || a.assetId.localeCompare(b.assetId));
      predictions.push(...currentPredictions);
      predictionsByDecision.set(split.testDecisionAt, currentPredictions);

      for (const benchmark of input.dataset.benchmarks) {
        if (!benchmarkLookup.has(benchmarkKey(benchmark.benchmarkId, split.testDecisionAt))) {
          blockers.push(`BENCHMARK_RETURN_MISSING:${benchmark.benchmarkId}:${split.testDecisionAt}`);
        }
      }

      const selected = currentPredictions.slice(0, input.request.topN);
      const selectedAssetIds = selected.map(item => item.assetId);
      const grossReturn = round(mean(selected.map(item => item.realizedReturn)) ?? 0);
      const currentTurnover = turnover(previousSelection, selectedAssetIds);
      const costRate = round(oneTurnCostRate * currentTurnover);
      periodReturns.push(Object.freeze({
        decisionAt: split.testDecisionAt,
        selectedAssetIds: Object.freeze(selectedAssetIds),
        grossReturn,
        turnover: currentTurnover,
        costRate,
        netReturn: round(grossReturn - costRate),
      }));
      previousSelection = selectedAssetIds;
    }
  }

  const testDecisionTimestamps = periodReturns.map(period => period.decisionAt);
  const benchmarkSummaries = buildBenchmarkSummaries(input.dataset, testDecisionTimestamps, input.request.rebalanceFrequency);
  for (const summary of benchmarkSummaries) {
    if (summary.periods !== testDecisionTimestamps.length) blockers.push(`BENCHMARK_COVERAGE_INCOMPLETE:${summary.benchmarkId}:${summary.periods}/${testDecisionTimestamps.length}`);
  }

  const metrics = computeMetrics(predictionsByDecision, periodReturns, input.request);
  let equityValue = 1;
  const equityCurve = periodReturns.map(period => {
    equityValue *= 1 + period.netReturn;
    return Object.freeze({ timestamp: period.decisionAt, value: round(equityValue) });
  });
  const regimeAccumulator = new Map<string, number[]>();
  for (const period of periodReturns) {
    const selected = predictionsByDecision.get(period.decisionAt)?.filter(prediction => period.selectedAssetIds.includes(prediction.assetId)) ?? [];
    for (const prediction of selected) {
      if (!prediction.regime) continue;
      const values = regimeAccumulator.get(prediction.regime) ?? [];
      values.push(prediction.realizedReturn);
      regimeAccumulator.set(prediction.regime, values);
    }
  }
  const regimeDiagnostics = Object.fromEntries([...regimeAccumulator.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([regime, values]) => [regime, round(mean(values) ?? 0)]));
  const domainDiagnostics = Object.freeze({
    [modelForId(input.request.modelId).domain]: periodReturns.length > 0 ? round(mean(periodReturns.map(period => period.netReturn)) ?? 0) : null,
  });

  const oosEvidenceId = blockers.length === 0 && periodReturns.length >= 2
    ? `commodity-oos:${sha256({
      executionVersion: COMMODITY_WALK_FORWARD_EXECUTION_VERSION,
      datasetFingerprint: datasetValidation.datasetFingerprint,
      request: input.request,
      weightProfile: [input.weightProfile.profileId, input.weightProfile.profileVersion, sortedRecord(input.weightProfile.factorWeights)],
      costAssumptions: input.costAssumptions,
      splits: splitPlan.splits.map(split => ({ splitId: split.splitId, testDecisionAt: split.testDecisionAt })),
      periods: periodReturns,
      benchmarks: benchmarkSummaries,
    })}`
    : null;

  const result = buildCommodityBacktestResult({
    runId: input.runId,
    request: input.request,
    metrics,
    equityCurve,
    leakageBlockers: blockers,
    benchmarkIds: input.dataset.benchmarks.map(benchmark => benchmark.benchmarkId),
    regimeDiagnostics,
    domainDiagnostics,
    pointInTimeValidation: aggregatePointInTimeValidation(datasetValidation),
    costAssumptionValidation: costValidation,
    outOfSampleEvidenceId: oosEvidenceId,
    correlationEvidenceId: input.correlationEvidenceId,
    sensitivityEvidenceId: input.sensitivityEvidenceId,
  });

  return Object.freeze({
    executionVersion: COMMODITY_WALK_FORWARD_EXECUTION_VERSION,
    datasetValidation,
    splitPlan,
    predictions: Object.freeze(predictions),
    periodReturns: Object.freeze(periodReturns),
    benchmarkSummaries: Object.freeze(benchmarkSummaries),
    outOfSampleEvidenceId: oosEvidenceId,
    blockers: Object.freeze(blockers),
    result,
    authority: 'VALIDATION_ONLY',
    canonical: false,
    scoreEligible: false,
  });
}
