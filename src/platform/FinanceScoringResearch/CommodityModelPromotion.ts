import { createHash } from 'node:crypto';
import {
  FINANCE_SOURCE_MODEL_CATALOG as DEFAULT_SCORING_MODELS,
  type ScoringModelDescriptor,
} from './FinanceSourceModelCatalog';
const RESEARCH_ONLY_CHALLENGER_EXECUTOR_KEY = 'research-only:not-executable' as const;
import {
  COMMODITY_RESEARCH_DQ_POLICY_VERSION,
  COMMODITY_RESEARCH_MODEL_CONTRACTS,
  type CommodityResearchModelContract,
  type CommodityResearchModelId,
} from './CommodityResearchModelContracts';
import {
  COMMODITY_CORRELATION_POLICY_VERSION,
  COMMODITY_WEIGHT_STABILITY_VERSION,
  COMMODITY_WEIGHT_VALIDATION_CONTRACT_VERSION,
  assessCommodityWeightPromotionEvidence,
  validateCommodityCandidateWeightProfile,
  type CommodityCandidateWeightProfile,
  type CommodityCandidateWeightValidation,
  type CommodityCorrelationReport,
  type CommodityWeightPromotionEvidenceAssessment,
  type CommodityWeightStabilityReport,
} from './CommodityModelValidation';
import {
  COMMODITY_BACKTEST_CONTRACT_VERSION,
  validateCommodityBacktestRequest,
  type CommodityBacktestResult,
} from './CommodityBacktestingContracts';
import { COMMODITY_HISTORICAL_VINTAGE_CONTRACT_VERSION } from './CommodityHistoricalVintage';

export const COMMODITY_MODEL_DESCRIPTOR_CONTRACT_VERSION = 'commodity-model-descriptor/1.0.0' as const;
export const COMMODITY_PROVIDER_RESILIENCE_CONTRACT_VERSION = 'commodity-provider-resilience/1.0.0' as const;
export const COMMODITY_STRESS_EVIDENCE_CONTRACT_VERSION = 'commodity-model-stress-evidence/1.0.0' as const;
export const COMMODITY_PROMOTION_PACKAGE_CONTRACT_VERSION = 'commodity-model-promotion-package/1.0.0' as const;
export const COMMODITY_OWNER_PROMOTION_DECISION_CONTRACT_VERSION = 'commodity-owner-promotion-decision/1.0.0' as const;

export type CommodityPromotionSupportedSource =
  | 'twelvedata'
  | 'eia'
  | 'usda-fas-psd'
  | 'cftc-cot'
  | 'usgs-mcs'
  | 'eu-crma'
  | 'governed-futures-curve-evidence'
  | 'governed-official-supply-evidence';

export interface CommodityModelCalibrationLineage {
  readonly datasetId: string;
  readonly datasetVersion: string;
  /** Raw 64-char SHA-256 hex, matching CommodityHistoricalDatasetValidation. */
  readonly datasetFingerprint: string;
  readonly normalizationContractVersion: string;
  readonly calibrationEvidenceId: string;
  readonly backtestRunId: string;
  readonly outOfSampleEvidenceId: string;
  readonly correlationEvidenceId: string;
  readonly sensitivityEvidenceId: string;
}

export interface CommodityImmutableModelDescriptor {
  readonly contractVersion: typeof COMMODITY_MODEL_DESCRIPTOR_CONTRACT_VERSION;
  readonly descriptorId: string;
  readonly descriptorVersion: string;
  readonly modelId: CommodityResearchModelId;
  readonly modelVersion: '0.1.0';
  readonly featureContractVersion: string;
  readonly weightContractVersion: typeof COMMODITY_WEIGHT_VALIDATION_CONTRACT_VERSION;
  readonly evidenceContractVersions: Readonly<{
    dq: typeof COMMODITY_RESEARCH_DQ_POLICY_VERSION;
    correlation: typeof COMMODITY_CORRELATION_POLICY_VERSION;
    weightStability: typeof COMMODITY_WEIGHT_STABILITY_VERSION;
    backtest: typeof COMMODITY_BACKTEST_CONTRACT_VERSION;
    historicalVintage: typeof COMMODITY_HISTORICAL_VINTAGE_CONTRACT_VERSION;
  }>;
  readonly weightProfileId: string;
  readonly weightProfileVersion: string;
  /** Raw 64-char SHA-256 hex, matching scoringFingerprint.ts. */
  readonly effectiveWeightFingerprint: string;
  readonly supportedSources: readonly CommodityPromotionSupportedSource[];
  readonly validFrom: string;
  readonly validUntil: string | null;
  readonly createdAt: string;
  readonly lineage: CommodityModelCalibrationLineage;
  readonly lifecycle: 'challenger';
  readonly immutable: true;
  readonly runtimeExecutable: false;
  readonly canonical: false;
  readonly scoreEligible: false;
  readonly descriptorFingerprint: string;
}

export interface CommodityModelDescriptorValidation {
  readonly valid: boolean;
  readonly blockers: readonly string[];
  readonly descriptorFingerprint: string;
  readonly canonical: false;
  readonly scoreEligible: false;
  readonly runtimeExecutable: false;
}

export interface CommodityProviderResiliencePolicy {
  readonly policyId: string;
  readonly policyVersion: string;
  readonly minimumAvailabilityRate: number;
  readonly minimumFreshnessPassRate: number;
  readonly maximumErrorRate: number;
  readonly maximumCircuitOpenEvents: number;
  readonly maximumP95LatencyMs: number | null;
}

export interface CommodityProviderResilienceObservation {
  readonly providerId: CommodityPromotionSupportedSource;
  readonly required: boolean;
  readonly sampleCount: number;
  readonly availabilityRate: number;
  readonly freshnessPassRate: number;
  readonly errorRate: number;
  readonly circuitOpenEvents: number;
  readonly p95LatencyMs: number | null;
  readonly evidenceId: string;
}

export interface CommodityProviderResilienceReport {
  readonly contractVersion: typeof COMMODITY_PROVIDER_RESILIENCE_CONTRACT_VERSION;
  readonly modelId: CommodityResearchModelId;
  readonly modelVersion: '0.1.0';
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly policy: CommodityProviderResiliencePolicy;
  readonly observations: readonly CommodityProviderResilienceObservation[];
  readonly blockers: readonly string[];
  readonly evidenceComplete: boolean;
  readonly evidenceId: string;
  readonly canonical: false;
  readonly scoreEligible: false;
}

export interface CommodityStressPolicy {
  readonly policyId: string;
  readonly policyVersion: string;
  readonly requiredScenarioIds: readonly string[];
  readonly minimumRankInformationCoefficient: number | null;
  readonly maximumAbsoluteDrawdown: number | null;
  readonly maximumTurnover: number | null;
}

export interface CommodityStressScenarioResult {
  readonly scenarioId: string;
  readonly regime: string;
  readonly outOfSampleEvidenceId: string;
  readonly leakageFree: boolean;
  readonly rankInformationCoefficient: number | null;
  readonly maxDrawdown: number | null;
  readonly turnover: number | null;
  readonly evidenceId: string;
}

export interface CommodityStressEvidenceReport {
  readonly contractVersion: typeof COMMODITY_STRESS_EVIDENCE_CONTRACT_VERSION;
  readonly modelId: CommodityResearchModelId;
  readonly modelVersion: '0.1.0';
  readonly policy: CommodityStressPolicy;
  readonly scenarios: readonly CommodityStressScenarioResult[];
  readonly blockers: readonly string[];
  readonly evidenceComplete: boolean;
  readonly evidenceId: string;
  readonly canonical: false;
  readonly scoreEligible: false;
}

export interface CommodityChampionChallengerDiff {
  readonly currentChampion: Readonly<{
    modelId: string;
    version: string;
    featureContractVersion: string;
    resultContractVersion: string;
    executorKey: string;
  }>;
  readonly challenger: Readonly<{
    modelId: CommodityResearchModelId;
    version: '0.1.0';
    featureContractVersion: string;
    executorKey: string;
  }>;
  readonly changedDimensions: readonly string[];
  readonly rollbackTarget: Readonly<{ modelId: string; version: string }>;
}

export interface CommodityPromotionReviewPackage {
  readonly contractVersion: typeof COMMODITY_PROMOTION_PACKAGE_CONTRACT_VERSION;
  readonly packageId: string;
  readonly packageVersion: string;
  readonly createdAt: string;
  readonly descriptor: CommodityImmutableModelDescriptor;
  readonly descriptorValidation: CommodityModelDescriptorValidation;
  readonly weightEvidence: CommodityWeightPromotionEvidenceAssessment;
  readonly providerResilience: CommodityProviderResilienceReport;
  readonly stressEvidence: CommodityStressEvidenceReport;
  readonly backtestResult: CommodityBacktestResult | null;
  readonly correlationEvidenceId: string | null;
  readonly sensitivityEvidenceId: string | null;
  readonly championChallengerDiff: CommodityChampionChallengerDiff | null;
  readonly blockers: readonly string[];
  readonly readyForOwnerReview: boolean;
  readonly packageFingerprint: string;
  readonly ownerDecisionRequired: true;
  readonly registryMutationPerformed: false;
  readonly canonical: false;
  readonly scoreEligible: false;
}

export interface CommodityOwnerPromotionDecisionEvidence {
  readonly contractVersion: typeof COMMODITY_OWNER_PROMOTION_DECISION_CONTRACT_VERSION;
  readonly packageFingerprint: string;
  readonly decision: 'APPROVE' | 'REJECT';
  readonly principalType: 'HUMAN_OWNER';
  readonly principalId: string;
  readonly decidedAt: string;
  readonly evidenceId: string;
  readonly explicit: true;
}

export interface CommodityOwnerPromotionDecisionAssessment {
  readonly contractVersion: typeof COMMODITY_OWNER_PROMOTION_DECISION_CONTRACT_VERSION;
  readonly valid: boolean;
  readonly approvedForControlledPromotion: boolean;
  readonly blockers: readonly string[];
  readonly packageFingerprint: string;
  readonly registryMutationPerformed: false;
  readonly canonical: false;
  readonly scoreEligible: false;
}

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function prefixedSha256(value: unknown): string {
  return `sha256:${sha256(value)}`;
}

function isSha256Hex(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(value.trim());
}

function isTimestamp(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function isSemver(value: string): boolean {
  return /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(value.trim());
}

function finiteRatio(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function modelForId(modelId: CommodityResearchModelId): CommodityResearchModelContract {
  const model = COMMODITY_RESEARCH_MODEL_CONTRACTS.find(item => item.modelId === modelId);
  if (!model) throw new Error(`COMMODITY_RESEARCH_MODEL_NOT_FOUND:${modelId}`);
  return model;
}

function registryChallenger(modelId: CommodityResearchModelId): ScoringModelDescriptor | null {
  return DEFAULT_SCORING_MODELS.find(model => model.modelId === modelId && model.lifecycle === 'challenger') ?? null;
}

function currentCommodityChampion(): ScoringModelDescriptor | null {
  return DEFAULT_SCORING_MODELS
    .filter(model => model.assetClasses.includes('commodity')
      && model.lifecycle === 'canonical'
      && model.alias === 'champion'
      && model.scoreEligible !== false)
    .sort((a, b) => b.priority - a.priority || a.modelId.localeCompare(b.modelId))[0] ?? null;
}

function descriptorIdentity(input: Omit<CommodityImmutableModelDescriptor, 'descriptorFingerprint'>): unknown {
  return {
    contractVersion: input.contractVersion,
    descriptorId: input.descriptorId,
    descriptorVersion: input.descriptorVersion,
    modelId: input.modelId,
    modelVersion: input.modelVersion,
    featureContractVersion: input.featureContractVersion,
    weightContractVersion: input.weightContractVersion,
    evidenceContractVersions: input.evidenceContractVersions,
    weightProfileId: input.weightProfileId,
    weightProfileVersion: input.weightProfileVersion,
    effectiveWeightFingerprint: input.effectiveWeightFingerprint,
    supportedSources: [...input.supportedSources].sort(),
    validFrom: input.validFrom,
    validUntil: input.validUntil,
    createdAt: input.createdAt,
    lineage: input.lineage,
    lifecycle: input.lifecycle,
    immutable: input.immutable,
    runtimeExecutable: input.runtimeExecutable,
    canonical: input.canonical,
    scoreEligible: input.scoreEligible,
  };
}

export function commodityCorrelationReportEvidenceId(report: CommodityCorrelationReport): string {
  return `commodity-correlation-review:${sha256({
    contractVersion: report.contractVersion,
    modelId: report.modelId,
    modelVersion: report.modelVersion,
    method: report.method,
    inputSemantic: report.inputSemantic,
    normalizationContractVersion: report.normalizationContractVersion,
    minimumPairedObservations: report.minimumPairedObservations,
    highAbsoluteCorrelation: report.highAbsoluteCorrelation,
    observations: report.observations,
    pairs: report.pairs,
    blockingFindings: report.blockingFindings,
    evidenceComplete: report.evidenceComplete,
  })}`;
}

export function commodityWeightStabilityEvidenceId(report: CommodityWeightStabilityReport): string {
  return `commodity-sensitivity-review:${sha256({
    contractVersion: report.contractVersion,
    referenceProfileId: report.referenceProfileId,
    findings: report.findings,
    valid: report.valid,
    blockers: report.blockers,
  })}`;
}

export function buildCommodityImmutableModelDescriptor(input: {
  readonly descriptorId: string;
  readonly descriptorVersion: string;
  readonly modelId: CommodityResearchModelId;
  readonly weightProfile: CommodityCandidateWeightProfile;
  readonly supportedSources: readonly CommodityPromotionSupportedSource[];
  readonly validFrom: string;
  readonly validUntil?: string | null;
  readonly createdAt: string;
  readonly lineage: CommodityModelCalibrationLineage;
}): CommodityImmutableModelDescriptor {
  const model = modelForId(input.modelId);
  const weightValidation = validateCommodityCandidateWeightProfile(input.weightProfile);
  const base: Omit<CommodityImmutableModelDescriptor, 'descriptorFingerprint'> = {
    contractVersion: COMMODITY_MODEL_DESCRIPTOR_CONTRACT_VERSION,
    descriptorId: input.descriptorId.trim(),
    descriptorVersion: input.descriptorVersion.trim(),
    modelId: model.modelId,
    modelVersion: model.modelVersion,
    featureContractVersion: model.featureContractVersion,
    weightContractVersion: COMMODITY_WEIGHT_VALIDATION_CONTRACT_VERSION,
    evidenceContractVersions: Object.freeze({
      dq: COMMODITY_RESEARCH_DQ_POLICY_VERSION,
      correlation: COMMODITY_CORRELATION_POLICY_VERSION,
      weightStability: COMMODITY_WEIGHT_STABILITY_VERSION,
      backtest: COMMODITY_BACKTEST_CONTRACT_VERSION,
      historicalVintage: COMMODITY_HISTORICAL_VINTAGE_CONTRACT_VERSION,
    }),
    weightProfileId: input.weightProfile.profileId,
    weightProfileVersion: input.weightProfile.profileVersion,
    effectiveWeightFingerprint: weightValidation.valid ? weightValidation.factorWeightFingerprint ?? '' : '',
    supportedSources: Object.freeze([...new Set(input.supportedSources)].sort()) as readonly CommodityPromotionSupportedSource[],
    validFrom: input.validFrom,
    validUntil: input.validUntil ?? null,
    createdAt: input.createdAt,
    lineage: Object.freeze({ ...input.lineage }),
    lifecycle: 'challenger',
    immutable: true,
    runtimeExecutable: false,
    canonical: false,
    scoreEligible: false,
  };
  return Object.freeze({ ...base, descriptorFingerprint: prefixedSha256(descriptorIdentity(base)) });
}

export function validateCommodityImmutableModelDescriptor(
  descriptor: CommodityImmutableModelDescriptor,
): CommodityModelDescriptorValidation {
  const blockers: string[] = [];
  const model = modelForId(descriptor.modelId);
  const challenger = registryChallenger(descriptor.modelId);

  if (descriptor.contractVersion !== COMMODITY_MODEL_DESCRIPTOR_CONTRACT_VERSION) blockers.push('MODEL_DESCRIPTOR_CONTRACT_VERSION_MISMATCH');
  if (!descriptor.descriptorId.trim()) blockers.push('MODEL_DESCRIPTOR_ID_REQUIRED');
  if (!isSemver(descriptor.descriptorVersion)) blockers.push('MODEL_DESCRIPTOR_VERSION_INVALID');
  if (descriptor.modelVersion !== model.modelVersion) blockers.push('MODEL_DESCRIPTOR_MODEL_VERSION_MISMATCH');
  if (descriptor.featureContractVersion !== model.featureContractVersion) blockers.push('MODEL_DESCRIPTOR_FEATURE_CONTRACT_MISMATCH');
  if (!descriptor.weightProfileId.trim()) blockers.push('MODEL_DESCRIPTOR_WEIGHT_PROFILE_ID_REQUIRED');
  if (!isSemver(descriptor.weightProfileVersion)) blockers.push('MODEL_DESCRIPTOR_WEIGHT_PROFILE_VERSION_INVALID');
  if (!isSha256Hex(descriptor.effectiveWeightFingerprint)) blockers.push('MODEL_DESCRIPTOR_WEIGHT_FINGERPRINT_INVALID');
  if (descriptor.supportedSources.length === 0) blockers.push('MODEL_DESCRIPTOR_SUPPORTED_SOURCE_REQUIRED');
  if (new Set(descriptor.supportedSources).size !== descriptor.supportedSources.length) blockers.push('MODEL_DESCRIPTOR_SUPPORTED_SOURCE_DUPLICATE');
  if (!isTimestamp(descriptor.validFrom) || !isTimestamp(descriptor.createdAt)) blockers.push('MODEL_DESCRIPTOR_TIMESTAMP_INVALID');
  if (descriptor.validUntil !== null) {
    if (!isTimestamp(descriptor.validUntil)) blockers.push('MODEL_DESCRIPTOR_VALID_UNTIL_INVALID');
    else if (isTimestamp(descriptor.validFrom) && Date.parse(descriptor.validUntil) <= Date.parse(descriptor.validFrom)) blockers.push('MODEL_DESCRIPTOR_VALIDITY_RANGE_INVALID');
  }
  if (!isSha256Hex(descriptor.lineage.datasetFingerprint)) blockers.push('MODEL_DESCRIPTOR_DATASET_FINGERPRINT_INVALID');
  for (const [key, value] of Object.entries(descriptor.lineage)) {
    if (!String(value ?? '').trim()) blockers.push(`MODEL_DESCRIPTOR_LINEAGE_REQUIRED:${key}`);
  }
  if (descriptor.lifecycle !== 'challenger' || descriptor.immutable !== true || descriptor.runtimeExecutable !== false || descriptor.canonical !== false || descriptor.scoreEligible !== false) {
    blockers.push('MODEL_DESCRIPTOR_MUST_REMAIN_NON_EXECUTABLE_CHALLENGER');
  }
  if (!challenger) blockers.push('MODEL_DESCRIPTOR_REGISTRY_CHALLENGER_MISSING');
  else {
    if (challenger.version !== descriptor.modelVersion) blockers.push('MODEL_DESCRIPTOR_REGISTRY_VERSION_MISMATCH');
    if (challenger.featureContractVersion !== descriptor.featureContractVersion) blockers.push('MODEL_DESCRIPTOR_REGISTRY_FEATURE_CONTRACT_MISMATCH');
    if (challenger.executorKey !== RESEARCH_ONLY_CHALLENGER_EXECUTOR_KEY) blockers.push('MODEL_DESCRIPTOR_REGISTRY_EXECUTOR_NOT_RESEARCH_ONLY');
    if (challenger.scoreEligible !== false) blockers.push('MODEL_DESCRIPTOR_REGISTRY_CHALLENGER_SCORE_ELIGIBLE');
  }

  const { descriptorFingerprint: _ignored, ...base } = descriptor;
  if (descriptor.descriptorFingerprint !== prefixedSha256(descriptorIdentity(base))) blockers.push('MODEL_DESCRIPTOR_FINGERPRINT_MISMATCH');

  return Object.freeze({
    valid: blockers.length === 0,
    blockers: Object.freeze(blockers),
    descriptorFingerprint: descriptor.descriptorFingerprint,
    canonical: false,
    scoreEligible: false,
    runtimeExecutable: false,
  });
}

export function buildCommodityProviderResilienceReport(input: {
  readonly modelId: CommodityResearchModelId;
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly policy: CommodityProviderResiliencePolicy;
  readonly observations: readonly CommodityProviderResilienceObservation[];
}): CommodityProviderResilienceReport {
  const model = modelForId(input.modelId);
  const blockers: string[] = [];
  const policy = input.policy;

  if (!policy.policyId.trim() || !isSemver(policy.policyVersion)) blockers.push('PROVIDER_RESILIENCE_POLICY_INVALID');
  if (!finiteRatio(policy.minimumAvailabilityRate)) blockers.push('PROVIDER_RESILIENCE_AVAILABILITY_THRESHOLD_INVALID');
  if (!finiteRatio(policy.minimumFreshnessPassRate)) blockers.push('PROVIDER_RESILIENCE_FRESHNESS_THRESHOLD_INVALID');
  if (!finiteRatio(policy.maximumErrorRate)) blockers.push('PROVIDER_RESILIENCE_ERROR_THRESHOLD_INVALID');
  if (!Number.isInteger(policy.maximumCircuitOpenEvents) || policy.maximumCircuitOpenEvents < 0) blockers.push('PROVIDER_RESILIENCE_CIRCUIT_THRESHOLD_INVALID');
  if (policy.maximumP95LatencyMs !== null && (!Number.isFinite(policy.maximumP95LatencyMs) || policy.maximumP95LatencyMs <= 0)) blockers.push('PROVIDER_RESILIENCE_LATENCY_THRESHOLD_INVALID');
  if (!isTimestamp(input.windowStart) || !isTimestamp(input.windowEnd) || Date.parse(input.windowStart) >= Date.parse(input.windowEnd)) blockers.push('PROVIDER_RESILIENCE_WINDOW_INVALID');
  if (input.observations.length === 0) blockers.push('PROVIDER_RESILIENCE_OBSERVATION_REQUIRED');

  const seen = new Set<string>();
  for (const item of input.observations) {
    if (seen.has(item.providerId)) blockers.push(`PROVIDER_RESILIENCE_DUPLICATE_PROVIDER:${item.providerId}`);
    seen.add(item.providerId);
    if (!Number.isInteger(item.sampleCount) || item.sampleCount < 1) blockers.push(`PROVIDER_RESILIENCE_SAMPLE_COUNT_INVALID:${item.providerId}`);
    if (!finiteRatio(item.availabilityRate)) blockers.push(`PROVIDER_RESILIENCE_AVAILABILITY_INVALID:${item.providerId}`);
    if (!finiteRatio(item.freshnessPassRate)) blockers.push(`PROVIDER_RESILIENCE_FRESHNESS_INVALID:${item.providerId}`);
    if (!finiteRatio(item.errorRate)) blockers.push(`PROVIDER_RESILIENCE_ERROR_RATE_INVALID:${item.providerId}`);
    if (!Number.isInteger(item.circuitOpenEvents) || item.circuitOpenEvents < 0) blockers.push(`PROVIDER_RESILIENCE_CIRCUIT_EVENTS_INVALID:${item.providerId}`);
    if (item.p95LatencyMs !== null && (!Number.isFinite(item.p95LatencyMs) || item.p95LatencyMs < 0)) blockers.push(`PROVIDER_RESILIENCE_LATENCY_INVALID:${item.providerId}`);
    if (!item.evidenceId.trim()) blockers.push(`PROVIDER_RESILIENCE_EVIDENCE_REQUIRED:${item.providerId}`);
    if (item.required) {
      if (item.availabilityRate < policy.minimumAvailabilityRate) blockers.push(`PROVIDER_RESILIENCE_AVAILABILITY_BELOW_POLICY:${item.providerId}`);
      if (item.freshnessPassRate < policy.minimumFreshnessPassRate) blockers.push(`PROVIDER_RESILIENCE_FRESHNESS_BELOW_POLICY:${item.providerId}`);
      if (item.errorRate > policy.maximumErrorRate) blockers.push(`PROVIDER_RESILIENCE_ERROR_ABOVE_POLICY:${item.providerId}`);
      if (item.circuitOpenEvents > policy.maximumCircuitOpenEvents) blockers.push(`PROVIDER_RESILIENCE_CIRCUIT_ABOVE_POLICY:${item.providerId}`);
      if (policy.maximumP95LatencyMs !== null && item.p95LatencyMs !== null && item.p95LatencyMs > policy.maximumP95LatencyMs) blockers.push(`PROVIDER_RESILIENCE_LATENCY_ABOVE_POLICY:${item.providerId}`);
    }
  }

  return Object.freeze({
    contractVersion: COMMODITY_PROVIDER_RESILIENCE_CONTRACT_VERSION,
    modelId: model.modelId,
    modelVersion: model.modelVersion,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    policy: Object.freeze({ ...policy }),
    observations: Object.freeze(input.observations.map(item => Object.freeze({ ...item }))),
    blockers: Object.freeze(blockers),
    evidenceComplete: blockers.length === 0 && input.observations.some(item => item.required),
    evidenceId: `commodity-provider-resilience:${sha256({ modelId: model.modelId, windowStart: input.windowStart, windowEnd: input.windowEnd, policy, observations: input.observations })}`,
    canonical: false,
    scoreEligible: false,
  });
}

function validateProviderResilienceReport(report: CommodityProviderResilienceReport): readonly string[] {
  const rebuilt = buildCommodityProviderResilienceReport({
    modelId: report.modelId,
    windowStart: report.windowStart,
    windowEnd: report.windowEnd,
    policy: report.policy,
    observations: report.observations,
  });
  const blockers = [...rebuilt.blockers];
  if (report.contractVersion !== COMMODITY_PROVIDER_RESILIENCE_CONTRACT_VERSION) blockers.push('PROVIDER_RESILIENCE_CONTRACT_VERSION_MISMATCH');
  if (report.modelVersion !== rebuilt.modelVersion) blockers.push('PROVIDER_RESILIENCE_MODEL_VERSION_MISMATCH');
  if (report.evidenceId !== rebuilt.evidenceId) blockers.push('PROVIDER_RESILIENCE_EVIDENCE_FINGERPRINT_MISMATCH');
  if (report.evidenceComplete !== rebuilt.evidenceComplete) blockers.push('PROVIDER_RESILIENCE_COMPLETENESS_MISMATCH');
  if (report.canonical !== false || report.scoreEligible !== false) blockers.push('PROVIDER_RESILIENCE_MUST_REMAIN_NON_AUTHORIZING');
  return Object.freeze([...new Set(blockers)]);
}

export function buildCommodityStressEvidenceReport(input: {
  readonly modelId: CommodityResearchModelId;
  readonly policy: CommodityStressPolicy;
  readonly scenarios: readonly CommodityStressScenarioResult[];
}): CommodityStressEvidenceReport {
  const model = modelForId(input.modelId);
  const blockers: string[] = [];
  const policy = input.policy;
  if (!policy.policyId.trim() || !isSemver(policy.policyVersion)) blockers.push('STRESS_POLICY_INVALID');
  if (policy.requiredScenarioIds.length === 0) blockers.push('STRESS_REQUIRED_SCENARIO_REQUIRED');
  if (new Set(policy.requiredScenarioIds).size !== policy.requiredScenarioIds.length) blockers.push('STRESS_REQUIRED_SCENARIO_DUPLICATE');
  if (policy.minimumRankInformationCoefficient !== null && (!Number.isFinite(policy.minimumRankInformationCoefficient) || policy.minimumRankInformationCoefficient < -1 || policy.minimumRankInformationCoefficient > 1)) blockers.push('STRESS_RANK_IC_THRESHOLD_INVALID');
  if (policy.maximumAbsoluteDrawdown !== null && !finiteRatio(policy.maximumAbsoluteDrawdown)) blockers.push('STRESS_DRAWDOWN_THRESHOLD_INVALID');
  if (policy.maximumTurnover !== null && (!Number.isFinite(policy.maximumTurnover) || policy.maximumTurnover < 0)) blockers.push('STRESS_TURNOVER_THRESHOLD_INVALID');

  const byScenario = new Map<string, CommodityStressScenarioResult>();
  for (const item of input.scenarios) {
    if (!item.scenarioId.trim()) blockers.push('STRESS_SCENARIO_ID_REQUIRED');
    if (byScenario.has(item.scenarioId)) blockers.push(`STRESS_SCENARIO_DUPLICATE:${item.scenarioId}`);
    byScenario.set(item.scenarioId, item);
    if (!item.regime.trim()) blockers.push(`STRESS_REGIME_REQUIRED:${item.scenarioId}`);
    if (!item.outOfSampleEvidenceId.trim()) blockers.push(`STRESS_OOS_EVIDENCE_REQUIRED:${item.scenarioId}`);
    if (!item.evidenceId.trim()) blockers.push(`STRESS_EVIDENCE_REQUIRED:${item.scenarioId}`);
    if (!item.leakageFree) blockers.push(`STRESS_LEAKAGE_BLOCKER:${item.scenarioId}`);
    if (item.rankInformationCoefficient !== null && (!Number.isFinite(item.rankInformationCoefficient) || item.rankInformationCoefficient < -1 || item.rankInformationCoefficient > 1)) blockers.push(`STRESS_RANK_IC_INVALID:${item.scenarioId}`);
    if (item.maxDrawdown !== null && (!Number.isFinite(item.maxDrawdown) || item.maxDrawdown < -1 || item.maxDrawdown > 0)) blockers.push(`STRESS_DRAWDOWN_INVALID:${item.scenarioId}`);
    if (item.turnover !== null && (!Number.isFinite(item.turnover) || item.turnover < 0)) blockers.push(`STRESS_TURNOVER_INVALID:${item.scenarioId}`);
  }

  for (const scenarioId of policy.requiredScenarioIds) {
    const item = byScenario.get(scenarioId);
    if (!item) {
      blockers.push(`STRESS_REQUIRED_SCENARIO_MISSING:${scenarioId}`);
      continue;
    }
    if (policy.minimumRankInformationCoefficient !== null && (item.rankInformationCoefficient === null || item.rankInformationCoefficient < policy.minimumRankInformationCoefficient)) blockers.push(`STRESS_RANK_IC_BELOW_POLICY:${scenarioId}`);
    if (policy.maximumAbsoluteDrawdown !== null && (item.maxDrawdown === null || Math.abs(item.maxDrawdown) > policy.maximumAbsoluteDrawdown)) blockers.push(`STRESS_DRAWDOWN_ABOVE_POLICY:${scenarioId}`);
    if (policy.maximumTurnover !== null && (item.turnover === null || item.turnover > policy.maximumTurnover)) blockers.push(`STRESS_TURNOVER_ABOVE_POLICY:${scenarioId}`);
  }

  return Object.freeze({
    contractVersion: COMMODITY_STRESS_EVIDENCE_CONTRACT_VERSION,
    modelId: model.modelId,
    modelVersion: model.modelVersion,
    policy: Object.freeze({ ...policy, requiredScenarioIds: Object.freeze([...policy.requiredScenarioIds]) }),
    scenarios: Object.freeze(input.scenarios.map(item => Object.freeze({ ...item }))),
    blockers: Object.freeze(blockers),
    evidenceComplete: blockers.length === 0,
    evidenceId: `commodity-stress:${sha256({ modelId: model.modelId, policy, scenarios: input.scenarios })}`,
    canonical: false,
    scoreEligible: false,
  });
}

function validateStressEvidenceReport(report: CommodityStressEvidenceReport): readonly string[] {
  const rebuilt = buildCommodityStressEvidenceReport({
    modelId: report.modelId,
    policy: report.policy,
    scenarios: report.scenarios,
  });
  const blockers = [...rebuilt.blockers];
  if (report.contractVersion !== COMMODITY_STRESS_EVIDENCE_CONTRACT_VERSION) blockers.push('STRESS_CONTRACT_VERSION_MISMATCH');
  if (report.modelVersion !== rebuilt.modelVersion) blockers.push('STRESS_MODEL_VERSION_MISMATCH');
  if (report.evidenceId !== rebuilt.evidenceId) blockers.push('STRESS_EVIDENCE_FINGERPRINT_MISMATCH');
  if (report.evidenceComplete !== rebuilt.evidenceComplete) blockers.push('STRESS_COMPLETENESS_MISMATCH');
  if (report.canonical !== false || report.scoreEligible !== false) blockers.push('STRESS_EVIDENCE_MUST_REMAIN_NON_AUTHORIZING');
  return Object.freeze([...new Set(blockers)]);
}

function buildChampionChallengerDiff(descriptor: CommodityImmutableModelDescriptor): CommodityChampionChallengerDiff | null {
  const champion = currentCommodityChampion();
  const challenger = registryChallenger(descriptor.modelId);
  if (!champion || !challenger) return null;
  const changedDimensions = [
    champion.modelId !== challenger.modelId ? 'modelId' : null,
    champion.version !== challenger.version ? 'modelVersion' : null,
    champion.featureContractVersion !== challenger.featureContractVersion ? 'featureContractVersion' : null,
    champion.resultContractVersion !== challenger.resultContractVersion ? 'resultContractVersion' : null,
    champion.executorKey !== challenger.executorKey ? 'executorKey' : null,
    champion.evidencePolicy !== challenger.evidencePolicy ? 'evidencePolicy' : null,
  ].filter((value): value is string => value !== null);
  return Object.freeze({
    currentChampion: Object.freeze({
      modelId: champion.modelId,
      version: champion.version,
      featureContractVersion: champion.featureContractVersion,
      resultContractVersion: champion.resultContractVersion,
      executorKey: champion.executorKey,
    }),
    challenger: Object.freeze({
      modelId: descriptor.modelId,
      version: descriptor.modelVersion,
      featureContractVersion: descriptor.featureContractVersion,
      executorKey: challenger.executorKey,
    }),
    changedDimensions: Object.freeze(changedDimensions),
    rollbackTarget: Object.freeze({ modelId: champion.modelId, version: champion.version }),
  });
}

function backtestStructuralBlockers(result: CommodityBacktestResult): string[] {
  const blockers: string[] = [];
  const requestValidation = validateCommodityBacktestRequest(result.request);
  blockers.push(...requestValidation.blockers.map(item => `BACKTEST_REQUEST:${item}`));
  if (result.contractVersion !== COMMODITY_BACKTEST_CONTRACT_VERSION) blockers.push('BACKTEST_CONTRACT_VERSION_MISMATCH');
  if (result.authority !== 'VALIDATION_ONLY' || result.canonical !== false || result.scoreEligible !== false) blockers.push('BACKTEST_RESULT_MUST_REMAIN_VALIDATION_ONLY');
  if (result.leakageBlockers.length > 0) blockers.push(...result.leakageBlockers.map(item => `BACKTEST_LEAKAGE:${item}`));
  if (!result.pointInTimeValidated) blockers.push('BACKTEST_POINT_IN_TIME_NOT_VALIDATED');
  if (!result.costAssumptionsValidated) blockers.push('BACKTEST_COSTS_NOT_VALIDATED');
  if (!result.outOfSampleValidated || !result.outOfSampleEvidenceId?.trim()) blockers.push('BACKTEST_OOS_NOT_VALIDATED');
  if (!result.correlationEvidenceId?.trim()) blockers.push('BACKTEST_CORRELATION_EVIDENCE_REQUIRED');
  if (!result.sensitivityEvidenceId?.trim()) blockers.push('BACKTEST_SENSITIVITY_EVIDENCE_REQUIRED');
  if (!result.promotionEvidenceEligible) blockers.push('BACKTEST_PROMOTION_EVIDENCE_INCOMPLETE');
  const championId = currentCommodityChampion();
  if (!championId || !result.benchmarkIds.includes(`${championId.modelId}@${championId.version}`)) blockers.push('BACKTEST_CURRENT_CHAMPION_BENCHMARK_REQUIRED');
  if (result.benchmarkIds.length < 2) blockers.push('BACKTEST_NAIVE_BASELINE_REQUIRED');
  return blockers;
}

export function buildCommodityPromotionReviewPackage(input: {
  readonly packageId: string;
  readonly packageVersion: string;
  readonly createdAt: string;
  readonly descriptor: CommodityImmutableModelDescriptor;
  readonly weightProfile: CommodityCandidateWeightProfile;
  readonly correlationReport: CommodityCorrelationReport | null;
  readonly stabilityReport: CommodityWeightStabilityReport | null;
  readonly backtestResult: CommodityBacktestResult | null;
  readonly providerResilience: CommodityProviderResilienceReport;
  readonly stressEvidence: CommodityStressEvidenceReport;
}): CommodityPromotionReviewPackage {
  const blockers: string[] = [];
  const descriptorValidation = validateCommodityImmutableModelDescriptor(input.descriptor);
  const weightValidation = validateCommodityCandidateWeightProfile(input.weightProfile);

  if (!input.packageId.trim()) blockers.push('PROMOTION_PACKAGE_ID_REQUIRED');
  if (!isSemver(input.packageVersion)) blockers.push('PROMOTION_PACKAGE_VERSION_INVALID');
  if (!isTimestamp(input.createdAt)) blockers.push('PROMOTION_PACKAGE_CREATED_AT_INVALID');
  if (!descriptorValidation.valid) blockers.push(...descriptorValidation.blockers.map(item => `DESCRIPTOR:${item}`));
  if (input.weightProfile.modelId !== input.descriptor.modelId) blockers.push('WEIGHT_PROFILE_MODEL_MISMATCH');
  if (input.weightProfile.profileId !== input.descriptor.weightProfileId) blockers.push('WEIGHT_PROFILE_ID_MISMATCH');
  if (input.weightProfile.profileVersion !== input.descriptor.weightProfileVersion) blockers.push('WEIGHT_PROFILE_VERSION_MISMATCH');
  if (weightValidation.factorWeightFingerprint !== input.descriptor.effectiveWeightFingerprint) blockers.push('WEIGHT_PROFILE_FINGERPRINT_MISMATCH');

  const correlationEvidenceId = input.correlationReport ? commodityCorrelationReportEvidenceId(input.correlationReport) : null;
  const sensitivityEvidenceId = input.stabilityReport ? commodityWeightStabilityEvidenceId(input.stabilityReport) : null;
  if (input.correlationReport) {
    if (input.correlationReport.contractVersion !== COMMODITY_CORRELATION_POLICY_VERSION) blockers.push('CORRELATION_CONTRACT_VERSION_MISMATCH');
    if (input.correlationReport.modelId !== input.descriptor.modelId || input.correlationReport.modelVersion !== input.descriptor.modelVersion) blockers.push('CORRELATION_MODEL_MISMATCH');
    if (input.correlationReport.normalizationContractVersion !== input.descriptor.lineage.normalizationContractVersion) blockers.push('CORRELATION_NORMALIZATION_LINEAGE_MISMATCH');
    if (!input.correlationReport.evidenceComplete || input.correlationReport.blockingFindings.length > 0) blockers.push('CORRELATION_EVIDENCE_INCOMPLETE');
    if (correlationEvidenceId !== input.descriptor.lineage.correlationEvidenceId) blockers.push('CORRELATION_REPORT_LINEAGE_MISMATCH');
  }
  if (input.stabilityReport) {
    if (input.stabilityReport.contractVersion !== COMMODITY_WEIGHT_STABILITY_VERSION) blockers.push('SENSITIVITY_CONTRACT_VERSION_MISMATCH');
    if (input.stabilityReport.referenceProfileId !== input.descriptor.weightProfileId) blockers.push('SENSITIVITY_PROFILE_LINEAGE_MISMATCH');
    if (!input.stabilityReport.valid || input.stabilityReport.blockers.length > 0) blockers.push('SENSITIVITY_EVIDENCE_INCOMPLETE');
    if (sensitivityEvidenceId !== input.descriptor.lineage.sensitivityEvidenceId) blockers.push('SENSITIVITY_REPORT_LINEAGE_MISMATCH');
  }

  const weightEvidence = assessCommodityWeightPromotionEvidence({
    weightValidation,
    correlationReport: input.correlationReport,
    stabilityReport: input.stabilityReport,
    backtestResult: input.backtestResult,
  });
  if (!weightEvidence.readyForOwnerReview) blockers.push(...weightEvidence.blockers.map(item => `WEIGHT_EVIDENCE:${item}`));

  const resilienceBlockers = validateProviderResilienceReport(input.providerResilience);
  blockers.push(...resilienceBlockers.map(item => `PROVIDER_RESILIENCE:${item}`));
  const stressBlockers = validateStressEvidenceReport(input.stressEvidence);
  blockers.push(...stressBlockers.map(item => `STRESS_EVIDENCE:${item}`));

  if (!input.backtestResult) blockers.push('BACKTEST_RESULT_REQUIRED');
  else {
    blockers.push(...backtestStructuralBlockers(input.backtestResult));
    if (input.backtestResult.request.modelId !== input.descriptor.modelId) blockers.push('BACKTEST_MODEL_ID_MISMATCH');
    if (input.backtestResult.request.modelVersion !== input.descriptor.modelVersion) blockers.push('BACKTEST_MODEL_VERSION_MISMATCH');
    if (input.backtestResult.runId !== input.descriptor.lineage.backtestRunId) blockers.push('BACKTEST_RUN_LINEAGE_MISMATCH');
    if (input.backtestResult.outOfSampleEvidenceId !== input.descriptor.lineage.outOfSampleEvidenceId) blockers.push('BACKTEST_OOS_LINEAGE_MISMATCH');
    if (input.backtestResult.correlationEvidenceId !== correlationEvidenceId) blockers.push('BACKTEST_CORRELATION_REPORT_MISMATCH');
    if (input.backtestResult.sensitivityEvidenceId !== sensitivityEvidenceId) blockers.push('BACKTEST_SENSITIVITY_REPORT_MISMATCH');
  }

  if (input.providerResilience.modelId !== input.descriptor.modelId) blockers.push('PROVIDER_RESILIENCE_MODEL_MISMATCH');
  if (input.stressEvidence.modelId !== input.descriptor.modelId) blockers.push('STRESS_EVIDENCE_MODEL_MISMATCH');
  const resilienceSources = new Set(input.providerResilience.observations.filter(item => item.required).map(item => item.providerId));
  for (const source of input.descriptor.supportedSources) {
    if (!resilienceSources.has(source)) blockers.push(`PROVIDER_RESILIENCE_REQUIRED_SOURCE_MISSING:${source}`);
  }

  const diff = buildChampionChallengerDiff(input.descriptor);
  if (!diff) blockers.push('CHAMPION_CHALLENGER_DIFF_UNAVAILABLE');
  else if (diff.rollbackTarget.modelId !== 'commodity-evidence-scoring') blockers.push('ROLLBACK_TARGET_NOT_CURRENT_COMMODITY_CHAMPION');

  const uniqueBlockers = [...new Set(blockers)];
  const packageFingerprint = prefixedSha256({
    contractVersion: COMMODITY_PROMOTION_PACKAGE_CONTRACT_VERSION,
    packageId: input.packageId.trim(),
    packageVersion: input.packageVersion.trim(),
    createdAt: input.createdAt,
    descriptorFingerprint: input.descriptor.descriptorFingerprint,
    weightFingerprint: weightValidation.factorWeightFingerprint,
    backtestRunId: input.backtestResult?.runId ?? null,
    outOfSampleEvidenceId: input.backtestResult?.outOfSampleEvidenceId ?? null,
    correlationEvidenceId,
    sensitivityEvidenceId,
    providerResilienceEvidenceId: input.providerResilience.evidenceId,
    stressEvidenceId: input.stressEvidence.evidenceId,
    currentChampion: diff?.currentChampion ?? null,
    rollbackTarget: diff?.rollbackTarget ?? null,
    blockers: [...uniqueBlockers].sort(),
  });

  return Object.freeze({
    contractVersion: COMMODITY_PROMOTION_PACKAGE_CONTRACT_VERSION,
    packageId: input.packageId.trim(),
    packageVersion: input.packageVersion.trim(),
    createdAt: input.createdAt,
    descriptor: input.descriptor,
    descriptorValidation,
    weightEvidence,
    providerResilience: input.providerResilience,
    stressEvidence: input.stressEvidence,
    backtestResult: input.backtestResult,
    correlationEvidenceId,
    sensitivityEvidenceId,
    championChallengerDiff: diff,
    blockers: Object.freeze(uniqueBlockers),
    readyForOwnerReview: uniqueBlockers.length === 0,
    packageFingerprint,
    ownerDecisionRequired: true,
    registryMutationPerformed: false,
    canonical: false,
    scoreEligible: false,
  });
}

/**
 * Binds a Human/Owner decision to the exact review-package fingerprint. This assessment still never
 * mutates ScoringModelRegistry/ScoringDispatcher; controlled promotion requires a separate fresh
 * branch and Human merge decision after all P2/P3 gates are satisfied.
 */
export function assessCommodityOwnerPromotionDecision(
  reviewPackage: CommodityPromotionReviewPackage,
  decision: CommodityOwnerPromotionDecisionEvidence,
): CommodityOwnerPromotionDecisionAssessment {
  const blockers: string[] = [];
  if (decision.contractVersion !== COMMODITY_OWNER_PROMOTION_DECISION_CONTRACT_VERSION) blockers.push('OWNER_DECISION_CONTRACT_VERSION_MISMATCH');
  if (!reviewPackage.readyForOwnerReview) blockers.push('PROMOTION_PACKAGE_NOT_READY_FOR_OWNER_REVIEW');
  if (decision.packageFingerprint !== reviewPackage.packageFingerprint) blockers.push('OWNER_DECISION_PACKAGE_FINGERPRINT_MISMATCH');
  if (decision.principalType !== 'HUMAN_OWNER') blockers.push('OWNER_DECISION_PRINCIPAL_TYPE_INVALID');
  if (!decision.principalId.trim()) blockers.push('OWNER_DECISION_PRINCIPAL_REQUIRED');
  if (!isTimestamp(decision.decidedAt)) blockers.push('OWNER_DECISION_TIMESTAMP_INVALID');
  if (!decision.evidenceId.trim()) blockers.push('OWNER_DECISION_EVIDENCE_REQUIRED');
  if (decision.explicit !== true) blockers.push('OWNER_DECISION_MUST_BE_EXPLICIT');

  return Object.freeze({
    contractVersion: COMMODITY_OWNER_PROMOTION_DECISION_CONTRACT_VERSION,
    valid: blockers.length === 0,
    approvedForControlledPromotion: blockers.length === 0 && decision.decision === 'APPROVE',
    blockers: Object.freeze(blockers),
    packageFingerprint: reviewPackage.packageFingerprint,
    registryMutationPerformed: false,
    canonical: false,
    scoreEligible: false,
  });
}
