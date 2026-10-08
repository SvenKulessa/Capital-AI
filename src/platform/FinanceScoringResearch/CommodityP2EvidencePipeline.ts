import {
  analyzeCommodityFeatureCorrelation,
  analyzeCommodityWeightStability,
  validateCommodityCandidateWeightProfile,
  type CommodityCandidateWeightProfile,
  type CommodityCandidateWeightValidation,
  type CommodityCorrelationObservation,
  type CommodityCorrelationReport,
  type CommodityWeightSensitivityVariant,
  type CommodityWeightStabilityReport,
} from './CommodityModelValidation';
import {
  executeCommodityHistoricalBacktest,
  validateCommodityHistoricalDataset,
  type CommodityHistoricalBacktestExecution,
  type CommodityHistoricalDataset,
  type CommodityHistoricalDatasetValidation,
} from './CommodityHistoricalBacktestEngine';
import type {
  CommodityBacktestCostAssumptions,
  CommodityBacktestRequest,
} from './CommodityBacktestingContracts';
import {
  buildCommodityImmutableModelDescriptor,
  buildCommodityPromotionReviewPackage,
  buildCommodityProviderResilienceReport,
  buildCommodityStressEvidenceReport,
  commodityCorrelationReportEvidenceId,
  commodityWeightStabilityEvidenceId,
  type CommodityImmutableModelDescriptor,
  type CommodityPromotionReviewPackage,
  type CommodityPromotionSupportedSource,
  type CommodityProviderResilienceObservation,
  type CommodityProviderResiliencePolicy,
  type CommodityProviderResilienceReport,
  type CommodityStressEvidenceReport,
  type CommodityStressPolicy,
  type CommodityStressScenarioResult,
} from './CommodityModelPromotion';
import type { CommodityResearchModelId } from './CommodityResearchModelContracts';

export const COMMODITY_P2_EVIDENCE_PIPELINE_VERSION =
  'commodity-p2-evidence-pipeline/1.0.0' as const;

export type CommodityP2StressScenarioInput = Omit<CommodityStressScenarioResult, 'outOfSampleEvidenceId'>;

export interface CommodityP2EvidencePipelineInput {
  readonly runId: string;
  readonly modelId: CommodityResearchModelId;
  readonly weightProfile: CommodityCandidateWeightProfile;
  readonly correlation: Readonly<{
    observations: readonly CommodityCorrelationObservation[];
    normalizationContractVersion: string;
    minimumPairedObservations?: number;
    highAbsoluteCorrelation?: number;
  }>;
  readonly sensitivityVariants: readonly CommodityWeightSensitivityVariant[];
  readonly dataset: CommodityHistoricalDataset;
  readonly backtestRequest: CommodityBacktestRequest;
  readonly costAssumptions: CommodityBacktestCostAssumptions;
  readonly calibrationEvidenceId: string;
  readonly descriptor: Readonly<{
    descriptorId: string;
    descriptorVersion: string;
    supportedSources: readonly CommodityPromotionSupportedSource[];
    validFrom: string;
    validUntil?: string | null;
    createdAt: string;
  }>;
  readonly providerResilience: Readonly<{
    windowStart: string;
    windowEnd: string;
    policy: CommodityProviderResiliencePolicy;
    observations: readonly CommodityProviderResilienceObservation[];
  }>;
  readonly stress: Readonly<{
    policy: CommodityStressPolicy;
    scenarios: readonly CommodityP2StressScenarioInput[];
  }>;
  readonly promotionPackage: Readonly<{
    packageId: string;
    packageVersion: string;
    createdAt: string;
  }>;
}

export interface CommodityP2EvidencePipelineResult {
  readonly version: typeof COMMODITY_P2_EVIDENCE_PIPELINE_VERSION;
  readonly modelId: CommodityResearchModelId;
  readonly weightValidation: CommodityCandidateWeightValidation;
  readonly correlationReport: CommodityCorrelationReport;
  readonly correlationEvidenceId: string;
  readonly stabilityReport: CommodityWeightStabilityReport;
  readonly sensitivityEvidenceId: string;
  readonly datasetValidation: CommodityHistoricalDatasetValidation;
  readonly backtestExecution: CommodityHistoricalBacktestExecution;
  readonly providerResilience: CommodityProviderResilienceReport;
  readonly stressEvidence: CommodityStressEvidenceReport;
  readonly descriptor: CommodityImmutableModelDescriptor;
  readonly promotionPackage: CommodityPromotionReviewPackage;
  readonly blockers: readonly string[];
  readonly readyForOwnerReview: boolean;
  readonly authority: 'VALIDATION_ONLY';
  readonly registryMutationPerformed: false;
  readonly canonical: false;
  readonly scoreEligible: false;
  readonly executionEligible: false;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

/**
 * Canonical P2-A -> P2-B -> P2-C validation composition boundary.
 *
 * This function deliberately performs no provider I/O and accepts only already acquired,
 * evidence-bound inputs. Correlation and sensitivity evidence identifiers are derived from the
 * reports produced in this call and then injected into the historical backtest. The OOS evidence
 * identifier produced by that backtest is likewise injected into every stress scenario and the
 * immutable model descriptor. Callers therefore cannot independently assert mismatching P2
 * lineage IDs across the review package.
 *
 * Even a fully complete result is validation-only. It cannot mutate ScoringModelRegistry,
 * dispatch a canonical score, rank assets, trade, execute, or promote a challenger.
 */
export function runCommodityP2EvidencePipeline(
  input: CommodityP2EvidencePipelineInput,
): CommodityP2EvidencePipelineResult {
  const blockers: string[] = [];

  if (input.weightProfile.modelId !== input.modelId) blockers.push('PIPELINE_WEIGHT_MODEL_MISMATCH');
  if (input.dataset.modelId !== input.modelId) blockers.push('PIPELINE_DATASET_MODEL_MISMATCH');
  if (input.backtestRequest.modelId !== input.modelId) blockers.push('PIPELINE_BACKTEST_MODEL_MISMATCH');
  if (!input.runId.trim()) blockers.push('PIPELINE_RUN_ID_REQUIRED');
  if (!input.calibrationEvidenceId.trim()) blockers.push('PIPELINE_CALIBRATION_EVIDENCE_REQUIRED');

  const weightValidation = validateCommodityCandidateWeightProfile(input.weightProfile);
  const correlationReport = analyzeCommodityFeatureCorrelation({
    modelId: input.modelId,
    observations: input.correlation.observations,
    normalizationContractVersion: input.correlation.normalizationContractVersion,
    minimumPairedObservations: input.correlation.minimumPairedObservations,
    highAbsoluteCorrelation: input.correlation.highAbsoluteCorrelation,
  });
  const correlationEvidenceId = commodityCorrelationReportEvidenceId(correlationReport);

  const stabilityReport = analyzeCommodityWeightStability({
    reference: input.weightProfile,
    variants: input.sensitivityVariants,
  });
  const sensitivityEvidenceId = commodityWeightStabilityEvidenceId(stabilityReport);

  const datasetValidation = validateCommodityHistoricalDataset(input.dataset);
  const backtestExecution = executeCommodityHistoricalBacktest({
    runId: input.runId,
    request: input.backtestRequest,
    dataset: input.dataset,
    weightProfile: input.weightProfile,
    costAssumptions: input.costAssumptions,
    correlationEvidenceId,
    sensitivityEvidenceId,
  });

  const providerResilience = buildCommodityProviderResilienceReport({
    modelId: input.modelId,
    windowStart: input.providerResilience.windowStart,
    windowEnd: input.providerResilience.windowEnd,
    policy: input.providerResilience.policy,
    observations: input.providerResilience.observations,
  });

  const outOfSampleEvidenceId = backtestExecution.outOfSampleEvidenceId ?? '';
  const stressEvidence = buildCommodityStressEvidenceReport({
    modelId: input.modelId,
    policy: input.stress.policy,
    scenarios: input.stress.scenarios.map(scenario => Object.freeze({
      ...scenario,
      outOfSampleEvidenceId,
    })),
  });

  const descriptor = buildCommodityImmutableModelDescriptor({
    descriptorId: input.descriptor.descriptorId,
    descriptorVersion: input.descriptor.descriptorVersion,
    modelId: input.modelId,
    weightProfile: input.weightProfile,
    supportedSources: input.descriptor.supportedSources,
    validFrom: input.descriptor.validFrom,
    validUntil: input.descriptor.validUntil,
    createdAt: input.descriptor.createdAt,
    lineage: {
      datasetId: input.dataset.datasetId,
      datasetVersion: input.dataset.datasetVersion,
      datasetFingerprint: datasetValidation.datasetFingerprint,
      normalizationContractVersion: input.dataset.normalizationContractVersion,
      calibrationEvidenceId: input.calibrationEvidenceId,
      backtestRunId: input.runId,
      outOfSampleEvidenceId,
      correlationEvidenceId,
      sensitivityEvidenceId,
    },
  });

  const promotionPackage = buildCommodityPromotionReviewPackage({
    packageId: input.promotionPackage.packageId,
    packageVersion: input.promotionPackage.packageVersion,
    createdAt: input.promotionPackage.createdAt,
    descriptor,
    weightProfile: input.weightProfile,
    correlationReport,
    stabilityReport,
    backtestResult: backtestExecution.result,
    providerResilience,
    stressEvidence,
  });

  if (!weightValidation.valid) blockers.push(...weightValidation.blockers.map(item => `P2A_WEIGHT:${item}`));
  if (!correlationReport.evidenceComplete) blockers.push(...correlationReport.blockingFindings.map(item => `P2A_CORRELATION:${item}`));
  if (!stabilityReport.valid) blockers.push(...stabilityReport.blockers.map(item => `P2A_SENSITIVITY:${item}`));
  if (!datasetValidation.valid) blockers.push(...datasetValidation.blockers.map(item => `P2B_DATASET:${item}`));
  if (backtestExecution.blockers.length > 0) blockers.push(...backtestExecution.blockers.map(item => `P2B_BACKTEST:${item}`));
  if (!backtestExecution.result.promotionEvidenceEligible) blockers.push('P2B_PROMOTION_EVIDENCE_INCOMPLETE');
  if (!providerResilience.evidenceComplete) blockers.push(...providerResilience.blockers.map(item => `P2C_RESILIENCE:${item}`));
  if (!stressEvidence.evidenceComplete) blockers.push(...stressEvidence.blockers.map(item => `P2C_STRESS:${item}`));
  if (!promotionPackage.readyForOwnerReview) blockers.push(...promotionPackage.blockers.map(item => `P2C_PACKAGE:${item}`));

  const consolidatedBlockers = unique(blockers);
  return Object.freeze({
    version: COMMODITY_P2_EVIDENCE_PIPELINE_VERSION,
    modelId: input.modelId,
    weightValidation,
    correlationReport,
    correlationEvidenceId,
    stabilityReport,
    sensitivityEvidenceId,
    datasetValidation,
    backtestExecution,
    providerResilience,
    stressEvidence,
    descriptor,
    promotionPackage,
    blockers: Object.freeze(consolidatedBlockers),
    readyForOwnerReview: consolidatedBlockers.length === 0 && promotionPackage.readyForOwnerReview,
    authority: 'VALIDATION_ONLY',
    registryMutationPerformed: false,
    canonical: false,
    scoreEligible: false,
    executionEligible: false,
  });
}
