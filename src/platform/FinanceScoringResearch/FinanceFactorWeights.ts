/**
 * Source-exact traditional weights and safe deterministic factor composition.
 * No market network calls. All observations must already pass CAPITAL-AI provenance/rights.
 * A result from this module is research context, never a canonical score or trade signal.
 */
import { z } from 'zod';
import { buildEffectiveScoringFingerprintMetadata } from './scoringFingerprint';

export const STOCK_SCORING_WEIGHTS = {
  trend: 0.18,
  momentum: 0.14,
  breakout_quality: 0.10,
  volatility_quality: 0.10,
  relative_strength: 0.13,
  value: 0.15,
  dividend: 0.08,
  quality: 0.12,
} as const;
export const FX_SCORING_WEIGHTS = {
  trend: 0.30,
  momentum: 0.25,
  breakout_quality: 0.15,
  volatility_quality: 0.15,
  relative_strength: 0.15,
} as const;

export const COMMODITY_SOURCE_WEIGHTS = Object.freeze({
  trend: 0.30, momentum: 0.25, breakout_quality: 0.20, volatility_quality: 0.25,
});
export const SOVEREIGN_SOURCE_WEIGHTS = Object.freeze({
  yield_level_percentile: 0.45, yield_trend: 0.30, yield_stability: 0.25,
});
export const FINANCE_TRADITIONAL_RESEARCH_VERSION = 'finance-traditional-research/1.0.0' as const;
const factorInput = z.strictObject({
  assetId: z.string().min(1),
  model: z.enum(['stock','forex','index','commodity','sovereign']),
  values: z.record(z.string(), z.number().finite().min(0).max(100).nullable()),
  evidenceRefs: z.array(z.string().min(1)).min(1),
  sourceSha: z.literal('dcef421fe6e350a3a2ade61d0299aad9ecca213c'),
});
export function composeFinanceResearchFactors(input: z.input<typeof factorInput>) {
  const checked = factorInput.parse(input);
  const weights: Readonly<Record<string,number>> =
    checked.model === 'stock' ? STOCK_SCORING_WEIGHTS :
    (checked.model === 'forex' || checked.model === 'index') ? FX_SCORING_WEIGHTS :
    checked.model === 'commodity' ? COMMODITY_SOURCE_WEIGHTS : SOVEREIGN_SOURCE_WEIGHTS;
  const expectedKeys = Object.keys(weights);
  const unknownKeys = Object.keys(checked.values).filter(key => !expectedKeys.includes(key));
  if (unknownKeys.length) throw new Error('FINANCE_UNKNOWN_FACTOR_KEYS:' + unknownKeys.join(','));
  const available = expectedKeys.filter(key => typeof checked.values[key] === 'number');
  const effectiveWeight = available.reduce((s, key) => s + weights[key], 0);
  const missing = expectedKeys.filter(key => !available.includes(key));
  const qualityReady = available.length === expectedKeys.length && effectiveWeight > 0;
  const lineage = buildEffectiveScoringFingerprintMetadata({
    modelVersion: FINANCE_TRADITIONAL_RESEARCH_VERSION,
    featureContractVersion: 'finance-source-factors/1.0.0',
    nominalWeightsVersion: checked.model + '-source-weight/1.0.0',
    evidenceContractVersion: 'capital-ai-admitted-feature-evidence/1.0.0',
    values: checked.values,
    nominalWeights: weights,
  });
  const value = available.length === 0 ? null : available.reduce((s,key) =>
    s + (checked.values[key] ?? 0) * weights[key], 0) / effectiveWeight;
  return Object.freeze({
    contractVersion: FINANCE_TRADITIONAL_RESEARCH_VERSION,
    assetId: checked.assetId,
    model: checked.model,
    status: qualityReady ? 'RESEARCH_READY' as const : 'RESEARCH_PARTIAL' as const,
    researchCompositeValue: value,
    nominalWeights: weights,
    effectiveWeights: lineage.effectiveWeights,
    effectiveWeightFingerprint: lineage.effectiveWeightFingerprint,
    featureFingerprint: lineage.effectiveFeatureFingerprint,
    missingFactors: Object.freeze(missing),
    evidenceRefs: Object.freeze([...new Set(checked.evidenceRefs)].sort()),
    sourceSha: checked.sourceSha,
    scoreEligible: false as const, rankEligible: false as const,
    decisionEligible: false as const, productionEligible: false as const,
  });
}
