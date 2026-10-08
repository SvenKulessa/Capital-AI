/**
 * Finance -> Capital-AI provenance-bound feature mapping (research only).
 * No Finance ScoringModelRegistry/Dispatcher, scoring formula, score/rank or production route.
 * Existing ScoringEngineService remains the only execution boundary.
 */
import { z } from 'zod';
import { FeatureValueSchema, type FeatureValue } from './canonicalContracts.ts';
import { PipelineSnapshotSchema, type PipelineSnapshot } from './pipelineExecution.ts';
import { evaluateMarketDataRights, MarketDataRightsEvidenceSchema } from './marketDataRightsEligibility.ts';

export const FINANCE_RESEARCH_FEATURE_BRIDGE_VERSION = 'CAPITAL_AI_FINANCE_FEATURE_BRIDGE@1' as const;
export const FINANCE_PINNED_SOURCE_SHA = 'dcef421fe6e350a3a2ade61d0299aad9ecca213c' as const;
export const FinanceSourceFeatureSchema = z.strictObject({
  sourceRepository: z.literal('SvenKulessa/Finance'),
  sourceCommit: z.literal(FINANCE_PINNED_SOURCE_SHA),
  sourceField: z.string().min(1).max(256),
  sourceEvidenceRef: z.string().min(1).max(500),
  feature: FeatureValueSchema,
});
export type FinanceSourceFeature = z.infer<typeof FinanceSourceFeatureSchema>;

export function inspectFinanceFeatureMapping(input: {
  snapshot: PipelineSnapshot;
  candidates: readonly FinanceSourceFeature[];
  maxAgeMs?: number;
}) {
  const snapshot = PipelineSnapshotSchema.parse(input.snapshot);
  const candidates = z.array(FinanceSourceFeatureSchema).min(1).max(100).parse(input.candidates);
  const maxAgeMs = z.number().int().positive().max(900_000).parse(input.maxAgeMs ?? 60_000);
  const reasons = new Set<string>();
  const sourceFields = new Set<string>();
  const featureKeys = new Set<string>();
  const copied: FeatureValue[] = [];
  if (snapshot.isDemo) reasons.add('DEMO_SNAPSHOT_NOT_ADMITTED');
  for (const candidate of candidates) {
    const feature = candidate.feature;
    const provenance = feature.provenance;
    const featureKey = feature.featureId + ':' + provenance.providerId;
    if (sourceFields.has(candidate.sourceField)) reasons.add('DUPLICATE_FINANCE_SOURCE_FIELD');
    if (featureKeys.has(featureKey)) reasons.add('DUPLICATE_TARGET_FEATURE_PROVIDER');
    sourceFields.add(candidate.sourceField);
    featureKeys.add(featureKey);
    if (feature.assetId !== snapshot.asset.assetId) reasons.add('ASSET_IDENTITY_MISMATCH');
    if (!snapshot.rawInputReferences.includes(candidate.sourceEvidenceRef)
      || provenance.sourceReference !== candidate.sourceEvidenceRef) reasons.add('RAW_EVIDENCE_REFERENCE_MISSING');
    if (provenance.isDemo || provenance.licenseScope === 'sandbox_demo'
      || provenance.licenseScope === 'unverified' || provenance.isDelayed) reasons.add('PROVIDER_PROVENANCE_INELIGIBLE');
    if ([feature.observedAt, provenance.observedAt, provenance.receivedAt, provenance.publishedAt]
      .some(t => t > snapshot.evaluatedAt)
      || provenance.receivedAt < provenance.observedAt
      || provenance.publishedAt < provenance.receivedAt
      || provenance.latencyMs !== provenance.receivedAt - provenance.observedAt) {
      reasons.add('PROVENANCE_TIMESTAMP_INVALID');
    }
    if (snapshot.evaluatedAt - Math.min(feature.observedAt, provenance.observedAt) > maxAgeMs) {
      reasons.add('FEATURE_STALE');
    }
    if (feature.qualityScore < 90) reasons.add('FEATURE_QUALITY_BELOW_RESEARCH_FLOOR');
    const rawRights = snapshot.rights.find(r => r.providerId === provenance.providerId);
    if (!rawRights) {
      reasons.add('PROVIDER_RIGHTS_MISSING');
    } else {
      const rights = MarketDataRightsEvidenceSchema.parse(rawRights);
      const feed = provenance.providerDataset + ':' + snapshot.asset.symbol + ':' + snapshot.asset.venue;
      const decision = evaluateMarketDataRights(rights, [
        'internal_analysis', 'derived_scoring_research', 'cache_retention',
      ], new Date(snapshot.evaluatedAt));
      if (!decision.eligible || decision.obligations.length > 0
        || !rights.feedsSymbolsAndVenues?.includes(feed)
        || !rights.reviewedAt || Date.parse(rights.reviewedAt) > snapshot.evaluatedAt) {
        reasons.add('PROVIDER_RIGHTS_NOT_ADMITTED');
      }
    }
    // Copy only validated data; no synthetic feature generation, reweighting or scoring.
    copied.push(feature);
  }
  const blocked = reasons.size > 0;
  return Object.freeze({
    contractVersion: FINANCE_RESEARCH_FEATURE_BRIDGE_VERSION,
    sourceCommit: FINANCE_PINNED_SOURCE_SHA,
    assetId: snapshot.asset.assetId,
    state: blocked ? 'BLOCKED' as const : 'RESEARCH_MAPPABLE' as const,
    reasons: Object.freeze([...reasons].sort()),
    features: Object.freeze(blocked ? [] as FeatureValue[] : copied),
    scoreEligible: false as const,
    rankEligible: false as const,
    decisionEligible: false as const,
    productionEligible: false as const,
    executedByCanonicalScorer: false as const,
  });
}
