import { createHash } from 'node:crypto';
import {
  COMMODITY_POINT_IN_TIME_POLICY_VERSION,
  type CommodityPointInTimeFeatureSnapshot,
  type CommodityPointInTimeFeatureValue,
} from './CommodityBacktestingContracts';
import {
  COMMODITY_HISTORICAL_DATASET_CONTRACT_VERSION,
  validateCommodityHistoricalDataset,
  type CommodityHistoricalBenchmarkDefinition,
  type CommodityHistoricalBenchmarkReturn,
  type CommodityHistoricalDataset,
  type CommodityHistoricalDatasetValidation,
  type CommodityHistoricalObservation,
} from './CommodityHistoricalBacktestEngine';
import {
  COMMODITY_RESEARCH_MODEL_CONTRACTS,
  type CommodityResearchDomain,
  type CommodityResearchModelId,
} from './CommodityResearchModelContracts';

export const COMMODITY_HISTORICAL_VINTAGE_CONTRACT_VERSION =
  'commodity-historical-vintage/1.0.0' as const;
export const COMMODITY_HISTORICAL_DATASET_ASSEMBLY_VERSION =
  'commodity-historical-dataset-assembly/1.0.0' as const;

export type CommodityHistoricalSourceId =
  | 'eia'
  | 'usda-fas-psd'
  | 'cftc-cot'
  | 'usgs-mcs'
  | 'eu-crma'
  | 'commodity-market-evidence'
  | 'governed-futures-curve-evidence'
  | 'governed-official-supply-evidence';

export type CommodityHistoricalAcquisitionMode =
  | 'LIVE_API_CURRENT_HISTORY'
  | 'ARCHIVED_RELEASE_CAPTURE'
  | 'VERSIONED_ANNUAL_RELEASE'
  | 'REGULATORY_ASSESSMENT_RELEASE'
  | 'GOVERNED_MARKET_CAPTURE';

export type CommodityHistoricalEvidenceGrade =
  | 'PIT_VERIFIED'
  | 'CURRENT_HISTORY_ONLY'
  | 'REFERENCE_STATIC'
  | 'INVALID';

export interface CommodityHistoricalSourcePolicy {
  readonly providerId: CommodityHistoricalSourceId;
  readonly retroactiveApiHistoryIsPitEligible: false;
  readonly pitRequiresAvailabilityEvidence: true;
  readonly pitRequiresReleaseId: boolean;
  readonly pitRequiresRevisionId: boolean;
  readonly supportedPitModes: readonly CommodityHistoricalAcquisitionMode[];
  readonly note: string;
}

const pitModes = (
  ...values: CommodityHistoricalAcquisitionMode[]
): readonly CommodityHistoricalAcquisitionMode[] => Object.freeze(values);

const SOURCE_POLICIES: Readonly<Record<CommodityHistoricalSourceId, CommodityHistoricalSourcePolicy>> = Object.freeze({
  eia: Object.freeze({
    providerId: 'eia',
    retroactiveApiHistoryIsPitEligible: false,
    pitRequiresAvailabilityEvidence: true,
    pitRequiresReleaseId: true,
    pitRequiresRevisionId: true,
    supportedPitModes: pitModes('ARCHIVED_RELEASE_CAPTURE'),
    note: 'A current EIA API response for an old period does not prove the exact historical vintage that was available at a past decision time.',
  }),
  'usda-fas-psd': Object.freeze({
    providerId: 'usda-fas-psd',
    retroactiveApiHistoryIsPitEligible: false,
    pitRequiresAvailabilityEvidence: true,
    pitRequiresReleaseId: true,
    pitRequiresRevisionId: true,
    supportedPitModes: pitModes('ARCHIVED_RELEASE_CAPTURE'),
    note: 'PSD forecasts can revise multiple market years; historical promotion evidence therefore requires an archived release-specific capture.',
  }),
  'cftc-cot': Object.freeze({
    providerId: 'cftc-cot',
    retroactiveApiHistoryIsPitEligible: false,
    pitRequiresAvailabilityEvidence: true,
    pitRequiresReleaseId: true,
    pitRequiresRevisionId: false,
    supportedPitModes: pitModes('ARCHIVED_RELEASE_CAPTURE'),
    note: 'Report date alone is not release availability. Promotion-grade history requires evidence for the released report artifact and publication time.',
  }),
  'usgs-mcs': Object.freeze({
    providerId: 'usgs-mcs',
    retroactiveApiHistoryIsPitEligible: false,
    pitRequiresAvailabilityEvidence: true,
    pitRequiresReleaseId: true,
    pitRequiresRevisionId: true,
    supportedPitModes: pitModes('ARCHIVED_RELEASE_CAPTURE', 'VERSIONED_ANNUAL_RELEASE'),
    note: 'Each annual/versioned MCS release becomes usable only from its publication/version availability time; old statistic years do not imply earlier availability.',
  }),
  'eu-crma': Object.freeze({
    providerId: 'eu-crma',
    retroactiveApiHistoryIsPitEligible: false,
    pitRequiresAvailabilityEvidence: true,
    pitRequiresReleaseId: true,
    pitRequiresRevisionId: true,
    supportedPitModes: pitModes('ARCHIVED_RELEASE_CAPTURE', 'REGULATORY_ASSESSMENT_RELEASE'),
    note: 'Economic Importance and Supply Risk values require a versioned assessment/release artifact; the regulation methodology alone is not a numerical historical vintage.',
  }),
  'commodity-market-evidence': Object.freeze({
    providerId: 'commodity-market-evidence',
    retroactiveApiHistoryIsPitEligible: false,
    pitRequiresAvailabilityEvidence: true,
    pitRequiresReleaseId: false,
    pitRequiresRevisionId: false,
    supportedPitModes: pitModes('ARCHIVED_RELEASE_CAPTURE', 'GOVERNED_MARKET_CAPTURE'),
    note: 'Historical market observations require a governed capture/source timestamp and may not be reconstructed from a later mutable payload without lineage.',
  }),
  'governed-futures-curve-evidence': Object.freeze({
    providerId: 'governed-futures-curve-evidence',
    retroactiveApiHistoryIsPitEligible: false,
    pitRequiresAvailabilityEvidence: true,
    pitRequiresReleaseId: false,
    pitRequiresRevisionId: false,
    supportedPitModes: pitModes('ARCHIVED_RELEASE_CAPTURE', 'GOVERNED_MARKET_CAPTURE'),
    note: 'Historical curve legs require governed contract identity and capture-time evidence.',
  }),
  'governed-official-supply-evidence': Object.freeze({
    providerId: 'governed-official-supply-evidence',
    retroactiveApiHistoryIsPitEligible: false,
    pitRequiresAvailabilityEvidence: true,
    pitRequiresReleaseId: true,
    pitRequiresRevisionId: true,
    supportedPitModes: pitModes('ARCHIVED_RELEASE_CAPTURE', 'VERSIONED_ANNUAL_RELEASE', 'REGULATORY_ASSESSMENT_RELEASE'),
    note: 'Generic supply evidence is PIT-eligible only when the exact underlying official release/version is bound.',
  }),
});

export function commodityHistoricalSourcePolicy(
  providerId: CommodityHistoricalSourceId,
): CommodityHistoricalSourcePolicy {
  return SOURCE_POLICIES[providerId];
}

export interface CommodityHistoricalVintageInput {
  readonly providerId: CommodityHistoricalSourceId;
  readonly assetId: string;
  readonly symbol: string;
  readonly domain: CommodityResearchDomain;
  readonly featureKey: string;
  readonly value: number;
  readonly unit: string;
  readonly source: string;
  readonly sourceVersion: string;
  readonly sourcePath: string;
  readonly observedAt: string;
  readonly availableAt: string;
  readonly retrievedAt: string;
  readonly evidenceId: string;
  readonly releaseId?: string | null;
  readonly revisionId?: string | null;
  readonly availabilityEvidenceId?: string | null;
  readonly acquisitionMode: CommodityHistoricalAcquisitionMode;
  readonly periodLabel?: string | null;
}

export interface CommodityHistoricalVintageArtifact extends CommodityHistoricalVintageInput {
  readonly contractVersion: typeof COMMODITY_HISTORICAL_VINTAGE_CONTRACT_VERSION;
  readonly vintageId: string;
  readonly releaseId: string | null;
  readonly revisionId: string | null;
  readonly availabilityEvidenceId: string | null;
  readonly periodLabel: string | null;
  readonly evidenceGrade: CommodityHistoricalEvidenceGrade;
  readonly blockers: readonly string[];
  readonly contentFingerprint: string;
  readonly canonical: false;
  readonly scoreEligible: false;
}

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function validTimestamp(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function nonEmpty(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function normalizedText(value: string): string {
  return value.trim();
}

function determineEvidenceGrade(
  input: CommodityHistoricalVintageInput,
  blockers: string[],
): CommodityHistoricalEvidenceGrade {
  if (blockers.length > 0) return 'INVALID';
  if (input.acquisitionMode === 'LIVE_API_CURRENT_HISTORY') return 'CURRENT_HISTORY_ONLY';

  const policy = commodityHistoricalSourcePolicy(input.providerId);
  if (!policy.supportedPitModes.includes(input.acquisitionMode)) {
    return input.acquisitionMode === 'REGULATORY_ASSESSMENT_RELEASE'
      || input.acquisitionMode === 'VERSIONED_ANNUAL_RELEASE'
      ? 'REFERENCE_STATIC'
      : 'CURRENT_HISTORY_ONLY';
  }
  if (policy.pitRequiresAvailabilityEvidence && !nonEmpty(input.availabilityEvidenceId)) return 'REFERENCE_STATIC';
  if (policy.pitRequiresReleaseId && !nonEmpty(input.releaseId)) return 'REFERENCE_STATIC';
  if (policy.pitRequiresRevisionId && !nonEmpty(input.revisionId)) return 'REFERENCE_STATIC';
  return 'PIT_VERIFIED';
}

/**
 * Builds one immutable source vintage. Evidence grade is derived by policy; callers cannot promote a
 * current-history row to PIT merely by setting a boolean. The content fingerprint binds the source,
 * value, temporal lineage and release/capture evidence.
 */
export function buildCommodityHistoricalVintage(
  input: CommodityHistoricalVintageInput,
): CommodityHistoricalVintageArtifact {
  const blockers: string[] = [];
  const observedMs = Date.parse(input.observedAt);
  const availableMs = Date.parse(input.availableAt);
  const retrievedMs = Date.parse(input.retrievedAt);

  if (!input.assetId.trim()) blockers.push('ASSET_ID_REQUIRED');
  if (!input.symbol.trim()) blockers.push('SYMBOL_REQUIRED');
  if (!input.featureKey.trim()) blockers.push('FEATURE_KEY_REQUIRED');
  if (!Number.isFinite(input.value)) blockers.push('VALUE_INVALID');
  if (!input.unit.trim()) blockers.push('UNIT_REQUIRED');
  if (!input.source.trim()) blockers.push('SOURCE_REQUIRED');
  if (!input.sourceVersion.trim()) blockers.push('SOURCE_VERSION_REQUIRED');
  if (!input.sourcePath.trim()) blockers.push('SOURCE_PATH_REQUIRED');
  if (!input.evidenceId.trim()) blockers.push('EVIDENCE_ID_REQUIRED');
  if (!validTimestamp(input.observedAt) || !validTimestamp(input.availableAt) || !validTimestamp(input.retrievedAt)) {
    blockers.push('TIMESTAMP_INVALID');
  } else {
    if (observedMs > availableMs) blockers.push('OBSERVED_AFTER_AVAILABLE');
    if (availableMs > retrievedMs) blockers.push('AVAILABLE_AFTER_RETRIEVED');
  }

  const releaseId = input.releaseId?.trim() || null;
  const revisionId = input.revisionId?.trim() || null;
  const availabilityEvidenceId = input.availabilityEvidenceId?.trim() || null;
  const periodLabel = input.periodLabel?.trim() || null;
  const evidenceGrade = determineEvidenceGrade({
    ...input,
    releaseId,
    revisionId,
    availabilityEvidenceId,
    periodLabel,
  }, blockers);

  const canonical = {
    contractVersion: COMMODITY_HISTORICAL_VINTAGE_CONTRACT_VERSION,
    providerId: input.providerId,
    assetId: normalizedText(input.assetId),
    symbol: normalizedText(input.symbol).toUpperCase(),
    domain: input.domain,
    featureKey: normalizedText(input.featureKey),
    value: input.value,
    unit: normalizedText(input.unit),
    source: normalizedText(input.source),
    sourceVersion: normalizedText(input.sourceVersion),
    sourcePath: normalizedText(input.sourcePath),
    observedAt: input.observedAt,
    availableAt: input.availableAt,
    retrievedAt: input.retrievedAt,
    evidenceId: normalizedText(input.evidenceId),
    releaseId,
    revisionId,
    availabilityEvidenceId,
    acquisitionMode: input.acquisitionMode,
    periodLabel,
    evidenceGrade,
  };
  const contentFingerprint = sha256(canonical);

  return Object.freeze({
    ...canonical,
    vintageId: `commodity-vintage:${contentFingerprint}`,
    blockers: Object.freeze(blockers),
    contentFingerprint,
    canonical: false,
    scoreEligible: false,
  });
}

export function commodityHistoricalVintageToPointInTimeValue(
  vintage: CommodityHistoricalVintageArtifact,
): CommodityPointInTimeFeatureValue | null {
  if (vintage.evidenceGrade !== 'PIT_VERIFIED' || vintage.blockers.length > 0) return null;
  return Object.freeze({
    featureKey: vintage.featureKey,
    value: vintage.value,
    source: vintage.providerId,
    observedAt: vintage.observedAt,
    availableAt: vintage.availableAt,
    retrievedAt: vintage.retrievedAt,
    evidenceId: vintage.evidenceId,
    releaseId: vintage.releaseId,
    revisionId: vintage.revisionId,
  });
}

export interface CommodityHistoricalNormalizationArtifact {
  readonly contractVersion: string;
  readonly evidenceId: string;
  readonly createdAt: string;
  readonly normalizedFactorValues: Readonly<Record<string, number | null | undefined>>;
  readonly factorEvidenceFeatureKeys: Readonly<Record<string, readonly string[]>>;
}

export interface CommodityHistoricalDecisionAssemblyInput {
  readonly observationId: string;
  readonly assetId: string;
  readonly symbol: string;
  readonly domain: CommodityResearchDomain;
  readonly decisionAt: string;
  readonly realizedAt: string;
  readonly realizedReturn: number;
  readonly confidence: number;
  readonly universeMembershipEvidenceId: string;
  readonly vintages: readonly CommodityHistoricalVintageArtifact[];
  readonly normalization: CommodityHistoricalNormalizationArtifact;
  readonly regime?: string | null;
}

export interface CommodityHistoricalDatasetAssemblyInput {
  readonly datasetId: string;
  readonly datasetVersion: string;
  readonly createdAt: string;
  readonly modelId: CommodityResearchModelId;
  readonly universeId: string;
  readonly normalizationContractVersion: string;
  readonly decisions: readonly CommodityHistoricalDecisionAssemblyInput[];
  readonly benchmarks: readonly CommodityHistoricalBenchmarkDefinition[];
  readonly benchmarkReturns: readonly CommodityHistoricalBenchmarkReturn[];
}

export interface CommodityHistoricalDatasetAssemblyResult {
  readonly assemblyVersion: typeof COMMODITY_HISTORICAL_DATASET_ASSEMBLY_VERSION;
  readonly valid: boolean;
  readonly dataset: CommodityHistoricalDataset | null;
  readonly validation: CommodityHistoricalDatasetValidation | null;
  readonly blockers: readonly string[];
  readonly rejectedVintageIds: readonly string[];
  readonly authority: 'VALIDATION_ONLY';
  readonly canonical: false;
  readonly scoreEligible: false;
}

function validateDecisionAssembly(
  decision: CommodityHistoricalDecisionAssemblyInput,
  modelId: CommodityResearchModelId,
  normalizationContractVersion: string,
): { blockers: string[]; rejectedVintageIds: string[] } {
  const blockers: string[] = [];
  const rejectedVintageIds: string[] = [];
  const model = COMMODITY_RESEARCH_MODEL_CONTRACTS.find(item => item.modelId === modelId);
  if (!model) return { blockers: [`${decision.observationId}:MODEL_NOT_FOUND`], rejectedVintageIds };

  if (!decision.observationId.trim()) blockers.push('OBSERVATION_ID_REQUIRED');
  if (!decision.assetId.trim()) blockers.push('ASSET_ID_REQUIRED');
  if (!decision.symbol.trim()) blockers.push('SYMBOL_REQUIRED');
  if (decision.domain !== model.domain) blockers.push(`DOMAIN_MISMATCH:${decision.domain}:${model.domain}`);
  if (!validTimestamp(decision.decisionAt)) blockers.push('DECISION_AT_INVALID');
  if (!validTimestamp(decision.realizedAt)) blockers.push('REALIZED_AT_INVALID');
  else if (validTimestamp(decision.decisionAt) && Date.parse(decision.realizedAt) <= Date.parse(decision.decisionAt)) {
    blockers.push('REALIZED_AT_NOT_AFTER_DECISION');
  }
  if (!Number.isFinite(decision.realizedReturn) || decision.realizedReturn <= -1) blockers.push('REALIZED_RETURN_INVALID');
  if (!Number.isFinite(decision.confidence) || decision.confidence < 0 || decision.confidence > 1) blockers.push('CONFIDENCE_INVALID');
  if (!decision.universeMembershipEvidenceId.trim()) blockers.push('UNIVERSE_MEMBERSHIP_EVIDENCE_REQUIRED');
  if (decision.vintages.length === 0) blockers.push('PIT_VINTAGE_REQUIRED');
  if (!decision.normalization.contractVersion.trim()
    || decision.normalization.contractVersion !== normalizationContractVersion) {
    blockers.push('NORMALIZATION_CONTRACT_VERSION_MISMATCH');
  }
  if (!decision.normalization.evidenceId.trim()) blockers.push('NORMALIZATION_EVIDENCE_REQUIRED');
  if (!validTimestamp(decision.normalization.createdAt)) blockers.push('NORMALIZATION_TIMESTAMP_INVALID');

  const seenFeatures = new Set<string>();
  for (const vintage of decision.vintages) {
    if (vintage.assetId !== decision.assetId) blockers.push(`VINTAGE_ASSET_MISMATCH:${vintage.vintageId}`);
    if (vintage.domain !== decision.domain) blockers.push(`VINTAGE_DOMAIN_MISMATCH:${vintage.vintageId}`);
    if (seenFeatures.has(vintage.featureKey)) blockers.push(`DUPLICATE_VINTAGE_FEATURE:${vintage.featureKey}`);
    seenFeatures.add(vintage.featureKey);
    if (vintage.evidenceGrade !== 'PIT_VERIFIED' || vintage.blockers.length > 0) {
      blockers.push(`VINTAGE_NOT_PIT_VERIFIED:${vintage.featureKey}:${vintage.evidenceGrade}`);
      rejectedVintageIds.push(vintage.vintageId);
      continue;
    }
    if (validTimestamp(decision.decisionAt) && Date.parse(vintage.availableAt) > Date.parse(decision.decisionAt)) {
      blockers.push(`VINTAGE_AVAILABLE_AFTER_DECISION:${vintage.featureKey}`);
      rejectedVintageIds.push(vintage.vintageId);
    }
  }

  for (const [factor, value] of Object.entries(decision.normalization.normalizedFactorValues)) {
    if (value !== null && value !== undefined && !Number.isFinite(value)) blockers.push(`NORMALIZED_FACTOR_VALUE_INVALID:${factor}`);
  }
  for (const [factor, featureKeys] of Object.entries(decision.normalization.factorEvidenceFeatureKeys)) {
    if (featureKeys.length === 0) blockers.push(`FACTOR_EVIDENCE_REQUIRED:${factor}`);
    for (const featureKey of featureKeys) {
      if (!seenFeatures.has(featureKey)) blockers.push(`NORMALIZATION_REFERENCES_UNKNOWN_FEATURE:${factor}:${featureKey}`);
    }
  }

  return { blockers, rejectedVintageIds };
}

/**
 * Assembles the immutable validation dataset consumed by PR #519's walk-forward engine.
 * Any non-PIT vintage blocks the corresponding assembly; current-history rows are never silently
 * dropped or upgraded because that would make the resulting backtest appear cleaner than its source evidence.
 */
export function assembleCommodityHistoricalDataset(
  input: CommodityHistoricalDatasetAssemblyInput,
): CommodityHistoricalDatasetAssemblyResult {
  const blockers: string[] = [];
  const rejectedVintageIds: string[] = [];
  const model = COMMODITY_RESEARCH_MODEL_CONTRACTS.find(item => item.modelId === input.modelId);

  if (!input.datasetId.trim()) blockers.push('DATASET_ID_REQUIRED');
  if (!input.datasetVersion.trim()) blockers.push('DATASET_VERSION_REQUIRED');
  if (!validTimestamp(input.createdAt)) blockers.push('DATASET_CREATED_AT_INVALID');
  if (!model) blockers.push('MODEL_NOT_FOUND');
  if (!input.universeId.trim()) blockers.push('UNIVERSE_ID_REQUIRED');
  if (!input.normalizationContractVersion.trim()) blockers.push('NORMALIZATION_CONTRACT_VERSION_REQUIRED');
  if (input.decisions.length === 0) blockers.push('HISTORICAL_DECISIONS_REQUIRED');

  const observationIds = new Set<string>();
  for (const decision of input.decisions) {
    if (observationIds.has(decision.observationId)) blockers.push(`DUPLICATE_OBSERVATION_ID:${decision.observationId}`);
    observationIds.add(decision.observationId);
    const validation = validateDecisionAssembly(decision, input.modelId, input.normalizationContractVersion);
    blockers.push(...validation.blockers.map(reason => `${decision.observationId}:${reason}`));
    rejectedVintageIds.push(...validation.rejectedVintageIds);
  }

  if (blockers.length > 0 || !model) {
    return Object.freeze({
      assemblyVersion: COMMODITY_HISTORICAL_DATASET_ASSEMBLY_VERSION,
      valid: false,
      dataset: null,
      validation: null,
      blockers: Object.freeze(blockers),
      rejectedVintageIds: Object.freeze([...new Set(rejectedVintageIds)]),
      authority: 'VALIDATION_ONLY',
      canonical: false,
      scoreEligible: false,
    });
  }

  const observations: CommodityHistoricalObservation[] = input.decisions.map(decision => {
    const pointInTimeValues = decision.vintages
      .map(commodityHistoricalVintageToPointInTimeValue)
      .filter((value): value is CommodityPointInTimeFeatureValue => value !== null);
    const pointInTimeSnapshot: CommodityPointInTimeFeatureSnapshot = Object.freeze({
      policyVersion: COMMODITY_POINT_IN_TIME_POLICY_VERSION,
      assetId: decision.assetId,
      decisionAt: decision.decisionAt,
      values: Object.freeze(pointInTimeValues),
    });
    return Object.freeze({
      observationId: decision.observationId,
      assetId: decision.assetId,
      symbol: decision.symbol,
      domain: decision.domain,
      decisionAt: decision.decisionAt,
      realizedAt: decision.realizedAt,
      realizedReturn: decision.realizedReturn,
      confidence: decision.confidence,
      universeMembershipEvidenceId: decision.universeMembershipEvidenceId,
      normalizationEvidenceId: decision.normalization.evidenceId,
      pointInTimeSnapshot,
      normalizedFactorValues: Object.freeze({ ...decision.normalization.normalizedFactorValues }),
      factorEvidenceFeatureKeys: Object.freeze(Object.fromEntries(
        Object.entries(decision.normalization.factorEvidenceFeatureKeys)
          .map(([factor, featureKeys]) => [factor, Object.freeze([...featureKeys])]),
      )),
      regime: decision.regime ?? null,
    });
  });

  const dataset: CommodityHistoricalDataset = Object.freeze({
    contractVersion: COMMODITY_HISTORICAL_DATASET_CONTRACT_VERSION,
    datasetId: input.datasetId,
    datasetVersion: input.datasetVersion,
    createdAt: input.createdAt,
    modelId: input.modelId,
    modelVersion: model.modelVersion,
    universeId: input.universeId,
    normalizationContractVersion: input.normalizationContractVersion,
    observations: Object.freeze(observations),
    benchmarks: Object.freeze([...input.benchmarks]),
    benchmarkReturns: Object.freeze([...input.benchmarkReturns]),
    immutable: true,
    authority: 'VALIDATION_ONLY',
  });
  const validation = validateCommodityHistoricalDataset(dataset);

  return Object.freeze({
    assemblyVersion: COMMODITY_HISTORICAL_DATASET_ASSEMBLY_VERSION,
    valid: validation.valid,
    dataset,
    validation,
    blockers: Object.freeze([...validation.blockers]),
    rejectedVintageIds: Object.freeze([]),
    authority: 'VALIDATION_ONLY',
    canonical: false,
    scoreEligible: false,
  });
}
