import { z } from 'zod';

export const MARKET_CLAIM_SCHEMA_VERSION = 'MARKET_CLAIM_ELIGIBILITY@1' as const;

export const MarketDataTimeSemanticsSchema = z.enum([
  'realtime',
  'delayed',
  'reference',
  'historical',
  'unavailable',
]);
export type MarketDataTimeSemantics = z.infer<typeof MarketDataTimeSemanticsSchema>;

export const MarketProviderClaimStateSchema = z.object({
  providerId: z.string().min(1),
  selectable: z.boolean(),
  configured: z.boolean(),
  admitted: z.boolean(),
  runtimeReady: z.boolean(),
}).superRefine((provider, ctx) => {
  if (provider.runtimeReady && !provider.configured) {
    ctx.addIssue({ code: 'custom', message: 'RUNTIME_READY_REQUIRES_CONFIGURATION' });
  }
  if (provider.runtimeReady && !provider.admitted) {
    ctx.addIssue({ code: 'custom', message: 'RUNTIME_READY_REQUIRES_ADMISSION' });
  }
});
export type MarketProviderClaimState = z.infer<typeof MarketProviderClaimStateSchema>;

export const MarketClaimEvidenceSchema = z.object({
  schemaVersion: z.literal(MARKET_CLAIM_SCHEMA_VERSION),
  provider: MarketProviderClaimStateSchema,
  timeSemantics: MarketDataTimeSemanticsSchema,
  dataEvidenceVerified: z.boolean(),
  freshnessVerified: z.boolean(),
  instrumentManifestBound: z.boolean(),
  verifiedAssetCount: z.number().int().nonnegative().nullable(),
  scoreEvidenceVerified: z.boolean(),
  rankEvidenceVerified: z.boolean(),
  alertEvidenceVerified: z.boolean(),
  decisionEvidenceVerified: z.boolean(),
  productionEvidenceVerified: z.boolean(),
}).superRefine((evidence, ctx) => {
  if (evidence.verifiedAssetCount !== null && !evidence.instrumentManifestBound) {
    ctx.addIssue({ code: 'custom', message: 'ASSET_COUNT_REQUIRES_MANIFEST' });
  }
});
export type MarketClaimEvidence = z.infer<typeof MarketClaimEvidenceSchema>;

export const MarketClaimProjectionSchema = z.object({
  schemaVersion: z.literal(MARKET_CLAIM_SCHEMA_VERSION),
  providerId: z.string().min(1),
  providerStatus: z.object({
    selectable: z.boolean(),
    configured: z.boolean(),
    admitted: z.boolean(),
    runtimeReady: z.boolean(),
  }),
  dataState: MarketDataTimeSemanticsSchema,
  eligibility: z.object({
    scoreEligible: z.boolean(),
    rankEligible: z.boolean(),
    alertEligible: z.boolean(),
    decisionEligible: z.boolean(),
  }),
  claims: z.object({
    providerReady: z.boolean(),
    realtime: z.boolean(),
    productionReady: z.boolean(),
    verifiedAssetCount: z.number().int().nonnegative().nullable(),
  }),
  reasonCodes: z.array(z.string()),
});
export type MarketClaimProjection = z.infer<typeof MarketClaimProjectionSchema>;

export function evaluateMarketClaimEligibility(input: unknown): MarketClaimProjection {
  const evidence = MarketClaimEvidenceSchema.parse(input);
  const reasons = new Set<string>();
  const providerReady = evidence.provider.configured && evidence.provider.admitted && evidence.provider.runtimeReady;

  if (!evidence.provider.configured) reasons.add('PROVIDER_NOT_CONFIGURED');
  if (!evidence.provider.admitted) reasons.add('PROVIDER_NOT_ADMITTED');
  if (!evidence.provider.runtimeReady) reasons.add('PROVIDER_RUNTIME_NOT_READY');
  if (evidence.timeSemantics === 'unavailable') reasons.add('DATA_UNAVAILABLE');
  if (!evidence.dataEvidenceVerified) reasons.add('DATA_EVIDENCE_UNVERIFIED');
  if (!evidence.freshnessVerified) reasons.add('TIME_SEMANTICS_UNVERIFIED');
  if (!evidence.instrumentManifestBound) reasons.add('INSTRUMENT_MANIFEST_UNBOUND');
  if (!evidence.scoreEvidenceVerified) reasons.add('SCORE_EVIDENCE_UNVERIFIED');
  if (!evidence.rankEvidenceVerified) reasons.add('RANK_EVIDENCE_UNVERIFIED');
  if (!evidence.alertEvidenceVerified) reasons.add('ALERT_EVIDENCE_UNVERIFIED');
  if (!evidence.decisionEvidenceVerified) reasons.add('DECISION_EVIDENCE_UNVERIFIED');
  if (!evidence.productionEvidenceVerified) reasons.add('PRODUCTION_EVIDENCE_UNVERIFIED');
  if (evidence.instrumentManifestBound && evidence.verifiedAssetCount === null) reasons.add('ASSET_COUNT_UNVERIFIED');

  const dataReady = evidence.timeSemantics !== 'unavailable'
    && evidence.dataEvidenceVerified
    && evidence.freshnessVerified;
  const scoreEligible = providerReady
    && dataReady
    && evidence.instrumentManifestBound
    && evidence.scoreEvidenceVerified;
  const rankEligible = scoreEligible && evidence.rankEvidenceVerified;
  const alertEligible = scoreEligible && evidence.alertEvidenceVerified;
  const decisionEligible = scoreEligible && evidence.decisionEvidenceVerified;
  const realtime = providerReady && dataReady && evidence.timeSemantics === 'realtime';
  const verifiedAssetCount = evidence.instrumentManifestBound ? evidence.verifiedAssetCount : null;
  const productionReady = providerReady
    && dataReady
    && evidence.instrumentManifestBound
    && scoreEligible
    && decisionEligible
    && evidence.productionEvidenceVerified;

  return MarketClaimProjectionSchema.parse({
    schemaVersion: MARKET_CLAIM_SCHEMA_VERSION,
    providerId: evidence.provider.providerId,
    providerStatus: {
      selectable: evidence.provider.selectable,
      configured: evidence.provider.configured,
      admitted: evidence.provider.admitted,
      runtimeReady: evidence.provider.runtimeReady,
    },
    dataState: evidence.timeSemantics,
    eligibility: { scoreEligible, rankEligible, alertEligible, decisionEligible },
    claims: { providerReady, realtime, productionReady, verifiedAssetCount },
    reasonCodes: [...reasons].sort(),
  });
}
