import { evaluateDataQualityGate } from './scoringIntegrity';
import { buildEffectiveScoringFingerprintMetadata } from './scoringFingerprint';
import {
  COMMODITY_RESEARCH_DQ_POLICY_VERSION,
  commodityResearchModelForInstrumentKind,
  type CommodityResearchFeatureSnapshot,
  type CommodityResearchHardGateResult,
  type CommodityResearchWeightHypothesis,
} from './CommodityResearchModelContracts';

export const COMMODITY_CATEGORY_RESEARCH_EVALUATION_VERSION =
  'commodity-category-research-evaluation/1.0.0' as const;
export const COMMODITY_NON_EXECUTABLE_WEIGHTS_VERSION =
  'commodity-research-non-executable-weights/1.0.0' as const;

export type CommodityCategoryResearchEvaluationStatus = 'RESEARCH_READY' | 'BLOCKED';

export interface CommodityCategoryLatentFactorCoverage {
  readonly factor: string;
  readonly valid: number;
  readonly total: number;
  readonly coverage: number;
}

export interface CommodityCategoryResearchLineage {
  readonly effectiveFeatureFingerprint: string;
  readonly nonExecutableWeightFingerprint: string;
  readonly nominalWeightsVersion: typeof COMMODITY_NON_EXECUTABLE_WEIGHTS_VERSION;
  readonly evidenceContractVersion: typeof COMMODITY_RESEARCH_DQ_POLICY_VERSION;
  readonly weightFingerprintSemantic: 'NON_EXECUTABLE_ZERO_WEIGHT';
}

export interface CommodityCategoryResearchEvaluation {
  readonly evaluationVersion: typeof COMMODITY_CATEGORY_RESEARCH_EVALUATION_VERSION;
  readonly modelId: string;
  readonly modelVersion: '0.1.0';
  readonly domain: CommodityResearchFeatureSnapshot['domain'];
  readonly instrumentKind: CommodityResearchFeatureSnapshot['instrumentKind'];
  readonly featureContractVersion: CommodityResearchFeatureSnapshot['contractVersion'];
  readonly status: CommodityCategoryResearchEvaluationStatus;
  readonly researchCompositeScore: null;
  readonly dataQualityScore: number;
  readonly requiredCoverage: number;
  readonly validFeatures: readonly string[];
  readonly missingFeatures: readonly string[];
  readonly staleFeatures: readonly string[];
  readonly invalidFeatures: readonly string[];
  readonly latentFactorCoverage: readonly CommodityCategoryLatentFactorCoverage[];
  readonly hardGates: readonly CommodityResearchHardGateResult[];
  readonly blockers: readonly string[];
  readonly weightHypothesis: CommodityResearchWeightHypothesis;
  readonly lineage: CommodityCategoryResearchLineage;
  readonly canonical: false;
  readonly scoreEligible: false;
  readonly executionEligible: false;
  readonly authority: 'RESEARCH_ONLY_SCORING_DISPATCHER_PROMOTION_REQUIRED';
}

function latentFactorCoverage(snapshot: CommodityResearchFeatureSnapshot): CommodityCategoryLatentFactorCoverage[] {
  const model = commodityResearchModelForInstrumentKind(snapshot.instrumentKind);
  const featureByKey = new Map(snapshot.features.map(feature => [feature.featureKey, feature]));
  const grouped = new Map<string, { valid: number; total: number }>();

  for (const definition of model.features) {
    const current = grouped.get(definition.latentFactor) ?? { valid: 0, total: 0 };
    current.total += 1;
    if (featureByKey.get(definition.key)?.status === 'VALID') current.valid += 1;
    grouped.set(definition.latentFactor, current);
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([factor, coverage]) => ({
      factor,
      valid: coverage.valid,
      total: coverage.total,
      coverage: coverage.total === 0 ? 0 : Number((coverage.valid / coverage.total).toFixed(4)),
    }));
}

/**
 * Deterministic P1 challenger evaluator.
 *
 * Field-specific freshness/unit/provenance is classified by the Commodity Feature Contract first.
 * The shared scoring-integrity DataQualityGate is then reused as the final provider/coverage gate,
 * without applying a second global freshness limit. The evaluator deliberately does NOT normalize
 * heterogeneous raw units or execute owner-document weight hypotheses. Numeric challenger
 * calibration belongs to P2 (correlation, point-in-time backtesting and weight validation).
 */
export function evaluateCommodityCategoryResearchSnapshot(
  snapshot: CommodityResearchFeatureSnapshot,
): CommodityCategoryResearchEvaluation {
  const model = commodityResearchModelForInstrumentKind(snapshot.instrumentKind);
  if (model.featureContractVersion !== snapshot.contractVersion || model.domain !== snapshot.domain) {
    throw new Error('COMMODITY_RESEARCH_CONTRACT_MISMATCH');
  }

  const validFeatures = snapshot.features.filter(feature => feature.status === 'VALID').map(feature => feature.featureKey);
  const missingFeatures = snapshot.features.filter(feature => feature.status === 'MISSING').map(feature => feature.featureKey);
  const staleFeatures = snapshot.features.filter(feature => feature.status === 'STALE').map(feature => feature.featureKey);
  const invalidFeatures = snapshot.features.filter(feature => feature.status === 'INVALID').map(feature => feature.featureKey);
  const requiredFeatureNames = model.features.filter(feature => feature.requiredForResearch).map(feature => feature.key);
  const featureByKey = new Map(snapshot.features.map(feature => [feature.featureKey, feature]));
  const sharedGate = evaluateDataQualityGate({
    assetId: snapshot.assetId,
    providers: [...new Set(snapshot.features.filter(feature => feature.status === 'VALID').map(feature => feature.source))],
    featureNames: requiredFeatureNames,
    values: Object.fromEntries(requiredFeatureNames.map(key => {
      const feature = featureByKey.get(key);
      return [key, feature?.status === 'VALID' ? feature.rawValue : null];
    })),
    retrievedAt: snapshot.capturedAt,
    minimumCoverage: 1,
    requireEvidence: false,
    scoringVersion: COMMODITY_CATEGORY_RESEARCH_EVALUATION_VERSION,
  });

  const sharedGateResult: CommodityResearchHardGateResult = {
    gateId: 'shared-data-quality-gate',
    passed: sharedGate.ready,
    severity: 'block',
    reason: sharedGate.ready
      ? 'Shared scoring-integrity provider/coverage gate passed after field-specific Commodity DQ checks.'
      : sharedGate.integrity.reason ?? 'Shared scoring-integrity gate rejected the Commodity research snapshot.',
  };
  const hardGates = Object.freeze([...snapshot.hardGates, sharedGateResult]);
  const blockers = hardGates
    .filter(gate => gate.severity === 'block' && !gate.passed)
    .map(gate => `${gate.gateId}: ${gate.reason}`);

  const presenceValues = Object.fromEntries(
    snapshot.features.map(feature => [feature.featureKey, feature.status === 'VALID' ? 1 : null]),
  );
  const nonExecutableWeights = Object.fromEntries(snapshot.features.map(feature => [feature.featureKey, 0]));
  const fingerprint = buildEffectiveScoringFingerprintMetadata({
    modelVersion: model.modelVersion,
    featureContractVersion: model.featureContractVersion,
    nominalWeightsVersion: COMMODITY_NON_EXECUTABLE_WEIGHTS_VERSION,
    evidenceContractVersion: COMMODITY_RESEARCH_DQ_POLICY_VERSION,
    values: presenceValues,
    nominalWeights: nonExecutableWeights,
  });

  return Object.freeze({
    evaluationVersion: COMMODITY_CATEGORY_RESEARCH_EVALUATION_VERSION,
    modelId: model.modelId,
    modelVersion: model.modelVersion,
    domain: model.domain,
    instrumentKind: model.instrumentKind,
    featureContractVersion: model.featureContractVersion,
    status: snapshot.researchReady && sharedGate.ready && blockers.length === 0 ? 'RESEARCH_READY' : 'BLOCKED',
    researchCompositeScore: null,
    dataQualityScore: snapshot.dataQualityScore,
    requiredCoverage: snapshot.requiredCoverage,
    validFeatures: Object.freeze(validFeatures),
    missingFeatures: Object.freeze(missingFeatures),
    staleFeatures: Object.freeze(staleFeatures),
    invalidFeatures: Object.freeze(invalidFeatures),
    latentFactorCoverage: Object.freeze(latentFactorCoverage(snapshot)),
    hardGates,
    blockers: Object.freeze(blockers),
    weightHypothesis: model.weightHypothesis,
    lineage: Object.freeze({
      effectiveFeatureFingerprint: fingerprint.effectiveFeatureFingerprint,
      nonExecutableWeightFingerprint: fingerprint.effectiveWeightFingerprint,
      nominalWeightsVersion: COMMODITY_NON_EXECUTABLE_WEIGHTS_VERSION,
      evidenceContractVersion: COMMODITY_RESEARCH_DQ_POLICY_VERSION,
      weightFingerprintSemantic: 'NON_EXECUTABLE_ZERO_WEIGHT' as const,
    }),
    canonical: false,
    scoreEligible: false,
    executionEligible: false,
    authority: 'RESEARCH_ONLY_SCORING_DISPATCHER_PROMOTION_REQUIRED',
  });
}
