/**
 * MARKET: single target-owned Finance research composition: source model/UAI identity ->
 * validated Finance DATA -> CAPITAL-AI rights + factor mapping -> source-weight fingerprint.
 *
 * This is not the legacy ScoringDispatcher. No public score, rank, trading decision or
 * independent provider/API activation. Research-only inputs may be examined and replayed.
 */
import type { PipelineSnapshot } from '../../contracts/pipelineExecution.ts';
import {
  resolveFinanceSourceAssetModel, type FinanceSourceAssetModelRequest,
} from './FinanceSourceAssetModelResolution.ts';
import {
  projectFinanceValidatedDataToResearch, type FinanceValidatedDataInput,
} from './FinanceValidatedDataHandoff.ts';
import {
  composeFinanceAdmittedResearchFactors,
  type FinanceFactorAssetModel, type FinanceFactorBinding,
} from './FinanceAdmittedFactorMapping.ts';

export const FINANCE_MODEL_EVALUATION_VERSION = 'CAPITAL_AI_FINANCE_MODEL_EVALUATION@1' as const;
export type FinanceResearchModelEvaluationRequest = {
  snapshot: PipelineSnapshot;
  sourceModel: FinanceSourceAssetModelRequest;
  validatedData: FinanceValidatedDataInput;
  factorModel: FinanceFactorAssetModel;
  bindings: readonly FinanceFactorBinding[];
};
const modelByFactor = Object.freeze({
  stock: 'traditional-scoring', forex: 'traditional-scoring',
  index: 'traditional-scoring', commodity: 'commodity-evidence-scoring',
  sovereign: 'sovereign-benchmark-yield-scoring',
} as const satisfies Record<FinanceFactorAssetModel, string>);

function blocked(reasons: readonly string[], modelId: string) {
  return Object.freeze({
    contractVersion: FINANCE_MODEL_EVALUATION_VERSION,
    state: 'BLOCKED' as const, modelId,
    reasons: Object.freeze([...new Set(reasons)].sort()),
    research: null, sourceIdentityFingerprint: null,
    featureFingerprint: null, effectiveWeightFingerprint: null,
    scoreEligible: false as const, rankEligible: false as const,
    decisionEligible: false as const, productionEligible: false as const,
  });
}

export function evaluateFinanceModelResearch(input: FinanceResearchModelEvaluationRequest) {
  const source = resolveFinanceSourceAssetModel({
    snapshot:input.snapshot,request:input.sourceModel,
  });
  if (source.state === 'BLOCKED') return blocked(source.reasons,input.sourceModel.modelId);
  if (input.sourceModel.modelId !== modelByFactor[input.factorModel]) {
    return blocked(['FINANCE_FACTOR_WEIGHT_PROFILE_MODEL_MISMATCH'],input.sourceModel.modelId);
  }
  const feature = projectFinanceValidatedDataToResearch({
    snapshot:input.snapshot,source:input.validatedData,
  });
  if (feature.state === 'BLOCKED') return blocked(feature.reasons,input.sourceModel.modelId);
  const evaluated = composeFinanceAdmittedResearchFactors({
    snapshot:input.snapshot,candidates:feature.candidates,
    model:input.factorModel,bindings:input.bindings,
  });
  if (evaluated.state === 'BLOCKED') return blocked(evaluated.reasons,input.sourceModel.modelId);
  if (evaluated.research === null || evaluated.research.researchCompositeValue === null) {
    return blocked(['FINANCE_MODEL_RESEARCH_FACTORS_NOT_COMPUTABLE'],input.sourceModel.modelId);
  }
  return Object.freeze({
    contractVersion: FINANCE_MODEL_EVALUATION_VERSION,
    state: 'RESEARCH_EVALUATED' as const,
    modelId: input.sourceModel.modelId,
    sourceModelVersion: input.sourceModel.modelVersion,
    sourceIdentityFingerprint: source.fingerprint,
    featureFingerprint: evaluated.research.featureFingerprint,
    effectiveWeightFingerprint: evaluated.research.effectiveWeightFingerprint,
    research: evaluated.research,
    reasons: Object.freeze([] as string[]),
    scoreEligible: false as const, rankEligible: false as const,
    decisionEligible: false as const, productionEligible: false as const,
  });
}
