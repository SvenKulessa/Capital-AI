import { z } from 'zod';
import { AssetClassSchema } from './common';
import { AssetIdentitySchema, FeatureValueSchema } from './canonicalContracts';
import { MarketDataRightsEvidenceSchema } from './marketDataRightsEligibility';

export const SCORE_FAMILIES = ['momentum', 'technical', 'fundamental', 'sentiment', 'event', 'positioning'] as const;
export const RISK_FAMILIES = ['liquidity', 'spread', 'volatility', 'event', 'integrity', 'manipulation'] as const;
export const PIPELINE_STAGE_IDS = ['stage_01_ingestion', 'stage_02_normalization', 'stage_03_validation',
  'stage_04_feature_engineering', 'stage_05_scoring', 'stage_06_ranking', 'stage_07_evidence', 'stage_08_delivery'] as const;
const version = z.string().regex(/^\d+\.\d+\.\d+$/);
const id = z.string().min(1).max(256);
const ratio = z.number().finite().min(0).max(1);
export const WeightProfileSchema = z.strictObject({
  assetClass: AssetClassSchema, subclass: id.nullable(), horizon: id, regime: id,
  weights: z.record(z.enum(SCORE_FAMILIES), ratio),
}).refine(p => Math.abs(Object.values(p.weights).reduce((s, n) => s + n, 0) - 1) < 1e-9, 'WEIGHTS_MUST_SUM_TO_ONE');

/** Execution policy extends existing canonical contracts; it cannot activate production. */
export const ShadowPipelineConfigSchema = z.strictObject({
  configId: id, version, modelVersion: version, weightVersion: version,
  mode: z.literal('shadow'), productionApproved: z.literal(false),
  stages: z.array(z.enum(PIPELINE_STAGE_IDS)).length(8),
  providers: z.array(z.strictObject({ providerId: id, enabled: z.boolean(), priority: z.number().int().nonnegative(),
    featureFamilies: z.array(z.enum(SCORE_FAMILIES)), refreshIntervalMs: z.number().int().positive(),
    maxStalenessMs: z.number().int().positive(), retryCount: z.number().int().min(0).max(5),
    timeoutMs: z.number().int().positive(), fallbackProviderIds: z.array(id),
  })).max(100),
  profiles: z.array(WeightProfileSchema).min(1),
  featureIds: z.record(z.enum(SCORE_FAMILIES), id),
  riskFeatureIds: z.record(z.enum(RISK_FAMILIES), id),
  riskWeights: z.record(z.enum(RISK_FAMILIES), ratio),
  hardGateFeatureIds: z.array(id).min(1),
  minimumConfidence: ratio.refine(n => n >= .9, 'CONFIDENCE_POLICY_CANNOT_BE_WEAKENED'),
  minQualityScore: z.number().finite().min(90).max(100),
  minimumProvidersPerFeature: z.number().int().min(2).max(100),
  maxNormalizedDisagreement: z.number().finite().min(0).max(100),
  maxRiskScore: z.number().finite().min(0).max(100),
  riskPenaltyCeiling: z.number().finite().min(0).max(100),
  componentIds: z.array(id).min(1).max(50),
}).superRefine((c, ctx) => {
  const reject = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (new Set(c.stages).size !== 8 || c.stages.some((s, i) => s !== PIPELINE_STAGE_IDS[i])) reject('STAGE_ORDER_INVALID');
  if (new Set(c.componentIds).size !== c.componentIds.length) reject('DUPLICATE_COMPONENT');
  const providers = new Set(c.providers.map(p => p.providerId));
  if (providers.size !== c.providers.length) reject('DUPLICATE_PROVIDER');
  for (const p of c.providers) if (p.fallbackProviderIds.some(id => id === p.providerId || !providers.has(id))) reject('FALLBACK_REFERENCE_INVALID');
  const keys = c.profiles.map(p => JSON.stringify([p.assetClass, p.subclass, p.horizon, p.regime]));
  if (new Set(keys).size !== keys.length) reject('DUPLICATE_WEIGHT_PROFILE');
  if (Math.abs(Object.values(c.riskWeights).reduce((s, n) => s + n, 0) - 1) >= 1e-9) reject('RISK_WEIGHTS_MUST_SUM_TO_ONE');
});
export type ShadowPipelineConfig = z.infer<typeof ShadowPipelineConfigSchema>;

export const PipelineSnapshotSchema = z.strictObject({
  runId: id, evaluatedAt: z.number().int().positive(), horizon: id, regime: id,
  isDemo: z.boolean(), asset: AssetIdentitySchema,
  features: z.array(FeatureValueSchema).max(10000),
  rights: z.array(MarketDataRightsEvidenceSchema).max(100),
  rawInputReferences: z.array(id).max(10000),
});
export type PipelineSnapshot = z.infer<typeof PipelineSnapshotSchema>;

export interface ComponentExecutionResult {
  componentId: string;
  status: 'shadow_computed' | 'blocked';
  score: number | null;
  reasonCodes: string[];
  calculationVersion: string;
  inputFeatureIds: string[];
}
export interface ShadowScoreResult {
  assetId: string; computedAt: number; modelVersion: string; weightVersion: string;
  mode: 'shadow'; isDemo: boolean; eligibility: false; rank: null; publishable: false;
  candidateScore: number | null; confidence: number; riskPenalty: number;
  subScores: Record<typeof SCORE_FAMILIES[number], number | null>;
  drivers: { family: string; contribution: number }[];
  reasonCodes: string[]; components: ComponentExecutionResult[];
}
