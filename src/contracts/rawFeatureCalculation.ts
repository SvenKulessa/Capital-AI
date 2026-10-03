import { z } from 'zod';
import { AssetIdentitySchema, DataProvenanceSchema } from './canonicalContracts';
import { MarketDataRightsEvidenceSchema } from './marketDataRightsEligibility';

const positiveTime = z.number().int().positive();
const observation = {
  assetId: z.string().min(1), venue: z.string().min(1),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'NZD']),
  provenance: DataProvenanceSchema,
};
/** Close timestamps are exclusive interval boundaries; only finalized bars are accepted. */
export const ClosedPriceBarSchema = z.strictObject({
  ...observation, openAt: positiveTime, closeAt: positiveTime,
  close: z.number().finite().positive(), finalized: z.literal(true),
});
export const QuotedTopBookSchema = z.strictObject({
  ...observation, bid: z.number().finite().positive(), ask: z.number().finite().positive(),
});
const context = {
  asset: AssetIdentitySchema, evaluatedAt: positiveTime, maxStalenessMs: positiveTime,
  mode: z.enum(['research', 'demo']), rights: MarketDataRightsEvidenceSchema,
};
export const PriceHistoryCalculationSchema = z.strictObject({
  ...context, intervalMs: positiveTime, bars: z.array(ClosedPriceBarSchema).min(20).max(10000),
});
export const QuotedSpreadCalculationSchema = z.strictObject({ ...context, quote: QuotedTopBookSchema });
export type PriceHistoryCalculation = z.infer<typeof PriceHistoryCalculationSchema>;
export type QuotedSpreadCalculation = z.infer<typeof QuotedSpreadCalculationSchema>;

/** Mathematical raw values are deliberately not normalized FeatureValues or admitted scores. */
export interface RawCalculatedFeature {
  featureId: string; assetId: string; value: number | null; unit: string;
  normalizedValue: null; qualityScore: null; scoreEligible: false;
  calculationVersion: '1.0.0'; evaluatedAt: number; observedAt: number;
  isDemo: boolean; reasonCodes: string[];
}
export interface RawFeatureCalculationEvidence<T> {
  schemaVersion: '1.0.0'; input: T; features: RawCalculatedFeature[];
}
