import { z } from 'zod';

export const CANONICAL_MARKET_STREAM = 'CAPITAL_CANONICAL';
export const CANONICAL_MARKET_SUBJECT_PREFIX = 'capital.market.canonical';
export const CANONICAL_MARKET_SCHEMA_VERSION = '1.0.0';

const AssetClassSchema = z.enum([
  'crypto',
  'equity_us',
  'equity_eu',
  'commodities',
  'forex',
  'fixed_income',
]);

const AssetIdentitySchema = z.strictObject({
  assetId: z.string().min(1).max(128).regex(/^[A-Za-z0-9._:-]+$/),
  symbol: z.string().min(1).max(64),
  name: z.string().min(1).max(256),
  assetClass: AssetClassSchema,
  venue: z.string().min(1).max(128),
  currency: z.string().regex(/^[A-Z]{3}$/),
  status: z.literal('active'),
});

const CanonicalProvenanceSchema = z.strictObject({
  providerId: z.string().min(1).max(128),
  providerDataset: z.string().min(1).max(256),
  observedAt: z.number().int().positive(),
  receivedAt: z.number().int().positive(),
  publishedAt: z.number().int().positive(),
  latencyMs: z.number().int().nonnegative(),
  isDelayed: z.boolean(),
  isDemo: z.literal(false),
  sourceReference: z.string().regex(/^CAPITAL_FACTS:[1-9][0-9]*:[a-f0-9]{64}$/),
  licenseScope: z.enum(['public_realtime', 'commercial_redistribution', 'delayed_15m']),
  rightsEvidenceReference: z.string().min(1).max(1024),
  rightsDecision: z.literal('ALLOW'),
});

const CanonicalQuoteValueSchema = z.strictObject({
  price: z.number().positive().finite(),
  bid: z.number().positive().finite().nullable(),
  ask: z.number().positive().finite().nullable(),
  volume24h: z.number().nonnegative().finite().nullable(),
});

export const CanonicalMarketEventSchema = z.strictObject({
  schemaVersion: z.literal(CANONICAL_MARKET_SCHEMA_VERSION),
  eventType: z.literal('market_observation'),
  normalizationVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  instrumentManifestReference: z.string().min(1).max(1024),
  rawInputEvidenceId: z.string().regex(/^CAPITAL_FACTS:[1-9][0-9]*:[a-f0-9]{64}$/),
  asset: AssetIdentitySchema,
  provenance: CanonicalProvenanceSchema,
  quote: CanonicalQuoteValueSchema,
  scoreEligible: z.literal(false),
  decisionEligible: z.literal(false),
}).superRefine((event, ctx) => {
  const reject = message => ctx.addIssue({ code: 'custom', message });
  if (event.provenance.sourceReference !== event.rawInputEvidenceId) reject('RAW_EVIDENCE_REFERENCE_MISMATCH');
  if (event.provenance.receivedAt < event.provenance.observedAt ||
      event.provenance.publishedAt < event.provenance.receivedAt ||
      event.provenance.latencyMs !== event.provenance.receivedAt - event.provenance.observedAt) {
    reject('CANONICAL_PROVENANCE_TIMELINE_INVALID');
  }
  if (event.quote.bid !== null && event.quote.ask !== null && event.quote.bid > event.quote.ask) reject('CANONICAL_CROSSED_BOOK');
});

export const CanonicalMarketDeliverySchema = CanonicalMarketEventSchema.safeExtend({
  canonicalEvidenceId: z.string().regex(/^CAPITAL_CANONICAL:[1-9][0-9]*:[a-f0-9]{64}$/),
});

export function canonicalMarketSubject(event) {
  const parsed = CanonicalMarketEventSchema.parse(event);
  return `${CANONICAL_MARKET_SUBJECT_PREFIX}.${parsed.asset.assetClass}.${parsed.asset.assetId}`;
}
