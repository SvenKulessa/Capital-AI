/**
 * MARKET: Finance factor composition over Capital-AI admitted market-data features.
 * This is only a research analysis. Runtime scores, rankings and orders remain managed by
 * ScoringEngineService, whose production authority is deliberately not granted here.
 */
import { z } from 'zod';
import {
  inspectFinanceFeatureMapping, FINANCE_PINNED_SOURCE_SHA,
  type FinanceSourceFeature,
} from '../../contracts/financeResearchFeatureBridge.ts';
import type { PipelineSnapshot } from '../../contracts/pipelineExecution.ts';
import {
  composeFinanceResearchFactors,
  STOCK_SCORING_WEIGHTS,
  FX_SCORING_WEIGHTS,
  COMMODITY_SOURCE_WEIGHTS,
  SOVEREIGN_SOURCE_WEIGHTS,
} from './FinanceFactorWeights.ts';

export const FINANCE_ADMITTED_FACTOR_MAPPING_VERSION = 'CAPITAL_AI_FINANCE_ADMITTED_FACTORS@1' as const;
export const FinanceFactorBindingSchema = z.strictObject({
  factor: z.string().min(1).max(128),
  sourceField: z.string().min(1).max(256),
});
export type FinanceFactorBinding = z.infer<typeof FinanceFactorBindingSchema>;
export type FinanceFactorAssetModel = 'stock' | 'forex' | 'index' | 'commodity' | 'sovereign';
export type FinanceFactorEvaluationInput = {
  snapshot: PipelineSnapshot;
  candidates: readonly FinanceSourceFeature[];
  model: FinanceFactorAssetModel;
  bindings: readonly FinanceFactorBinding[];
};

const scopes: Record<FinanceFactorAssetModel, readonly string[]> = {
  stock: ['equity_us', 'equity_eu'],
  forex: ['forex'],
  index: [], // No canonical index asset class exists in the current target taxonomy.
  commodity: ['commodities'],
  sovereign: ['fixed_income'],
};
const requiredFields: Record<FinanceFactorAssetModel, Readonly<Record<string, number>>> = {
  stock: STOCK_SCORING_WEIGHTS,
  forex: FX_SCORING_WEIGHTS,
  index: FX_SCORING_WEIGHTS,
  commodity: COMMODITY_SOURCE_WEIGHTS,
  sovereign: SOVEREIGN_SOURCE_WEIGHTS,
};

export function composeFinanceAdmittedResearchFactors(input: FinanceFactorEvaluationInput) {
  const mapping = inspectFinanceFeatureMapping({
    snapshot: input.snapshot, candidates: input.candidates,
  });
  const bindings = z.array(FinanceFactorBindingSchema).min(1).max(50).parse(input.bindings);
  const reasons = new Set<string>(mapping.reasons);
  const asset = input.snapshot.asset;
  if (!scopes[input.model].includes(asset.assetClass)) reasons.add('FINANCE_ASSET_CLASS_MODEL_MISMATCH');
  if (input.model === 'sovereign'
    && !['sovereign_yield_10y_2y','german_bund'].includes(asset.subclass ?? '')) {
    reasons.add('FINANCE_SOVEREIGN_BENCHMARK_SUBCLASS_REQUIRED');
  }
  const factors = bindings.map(b => b.factor);
  const fields = bindings.map(b => b.sourceField);
  if (new Set(factors).size !== factors.length) reasons.add('FINANCE_DUPLICATE_FACTOR_BINDING');
  if (new Set(fields).size !== fields.length) reasons.add('FINANCE_DUPLICATE_SOURCE_FIELD_BINDING');
  const modelKeys = Object.keys(requiredFields[input.model]);
  if (factors.some(f => !modelKeys.includes(f))) reasons.add('FINANCE_FACTOR_NOT_IN_SOURCE_WEIGHTS');
  const candidates = new Map(input.candidates.map(c => [c.sourceField, c]));
  if (bindings.some(b => !candidates.has(b.sourceField))) reasons.add('FINANCE_BINDING_SOURCE_MISSING');
  if (input.candidates.some(c => !fields.includes(c.sourceField))) reasons.add('FINANCE_SOURCE_FEATURE_UNBOUND');
  if (mapping.state !== 'RESEARCH_MAPPABLE') reasons.add('FINANCE_SOURCE_EVIDENCE_NOT_ADMITTED');
  const failure = (codes: readonly string[]) => Object.freeze({
    contractVersion: FINANCE_ADMITTED_FACTOR_MAPPING_VERSION,
    state: 'BLOCKED' as const, model: input.model, assetId: asset.assetId,
    reasons: Object.freeze([...codes].sort()),
    research: null,
    scoreEligible: false as const, rankEligible: false as const,
    decisionEligible: false as const, productionEligible: false as const,
  });
  if (reasons.size) return failure([...reasons]);

  const values: Record<string, number | null> = Object.fromEntries(
    bindings.map(({factor,sourceField}) => [factor, candidates.get(sourceField)!.feature.normalizedValue]),
  );
  const research = composeFinanceResearchFactors({
    assetId: asset.assetId, model: input.model, values,
    evidenceRefs: input.candidates.map(c => c.sourceEvidenceRef),
    sourceSha: FINANCE_PINNED_SOURCE_SHA,
  });
  return Object.freeze({
    contractVersion: FINANCE_ADMITTED_FACTOR_MAPPING_VERSION,
    state: 'RESEARCH_FACTORS_EVALUATED' as const,
    model: input.model, assetId: asset.assetId, reasons: Object.freeze([] as string[]),
    research, scoreEligible: false as const, rankEligible: false as const,
    decisionEligible: false as const, productionEligible: false as const,
  });
}
