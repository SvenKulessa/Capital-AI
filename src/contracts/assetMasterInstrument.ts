import { z } from 'zod';
import { DataProvenanceSchema } from './canonicalContracts';
import { resolveProductAssetMapping } from './marketAssetTaxonomy';

const id = z.string().trim().min(1).max(256);
const currency = z.string().regex(/^[A-Z]{3}$/);
const instant = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const positive = z.number().finite().positive();
// Format validation only, never issuer/source verification or an ISIN checksum claim.
const isin = z.string().regex(/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/);
const base = {
  schemaVersion: z.literal('CAPITAL_AI_INSTRUMENT_MASTER@1'),
  assetId: id, symbol: id, name: id, venue: id, currency,
  status: z.enum(['active', 'halted', 'delisted', 'unverified']),
  subclass: id.nullable().default(null), evaluatedAt: instant,
  identityProvenance: DataProvenanceSchema,
};
const derivative = {
  underlyingAssetId: id, expiryAt: instant, contractMultiplier: positive,
  settlement: z.enum(['cash', 'physical']),
};

/** Additive instrument metadata. It does not expand or replace the six-class scoring engine. */
export const InstrumentMasterSchema = z.discriminatedUnion('productAssetClass', [
  z.strictObject({ ...base, productAssetClass: z.literal('stocks'), region: z.enum(['US', 'EU']), isin: isin.nullable() }),
  z.strictObject({ ...base, productAssetClass: z.literal('etfs'), isin, shareClassId: id }),
  z.strictObject({ ...base, productAssetClass: z.literal('indices'), administrator: id,
    methodologyReference: id, returnConvention: z.enum(['price', 'net_total_return', 'gross_total_return']) }),
  z.strictObject({ ...base, productAssetClass: z.literal('crypto'), baseAsset: id, quoteAsset: id }),
  z.strictObject({ ...base, productAssetClass: z.literal('forex'), baseCurrency: currency, quoteCurrency: currency }),
  z.strictObject({ ...base, productAssetClass: z.literal('commodities'), commodityId: id, quotationUnit: id }),
  z.strictObject({ ...base, ...derivative, productAssetClass: z.literal('futures'), deliveryUnit: id }),
  z.strictObject({ ...base, ...derivative, productAssetClass: z.literal('options'), strike: positive,
    optionType: z.enum(['call', 'put']), exerciseStyle: z.enum(['american', 'european', 'bermudan']) }),
  z.strictObject({ ...base, productAssetClass: z.literal('bonds'), isin, maturityAt: instant,
    couponPercent: z.number().finite().nonnegative(), faceValue: positive }),
]).superRefine((instrument, ctx) => {
  const reject = (message: string) => ctx.addIssue({ code: 'custom', message });
  const p = instrument.identityProvenance;
  if ([p.observedAt, p.receivedAt, p.publishedAt].some(t => t > instrument.evaluatedAt) ||
      p.observedAt > p.receivedAt || p.receivedAt > p.publishedAt || p.latencyMs !== p.receivedAt - p.observedAt)
    reject('INSTRUMENT_IDENTITY_TIMESTAMP_INVALID');
  if (instrument.productAssetClass === 'forex' &&
      (instrument.baseCurrency === instrument.quoteCurrency || instrument.currency !== instrument.quoteCurrency))
    reject('INSTRUMENT_FX_CURRENCY_MISMATCH');
  if (instrument.productAssetClass === 'crypto' && instrument.baseAsset === instrument.quoteAsset)
    reject('INSTRUMENT_CRYPTO_PAIR_INVALID');
  if ('underlyingAssetId' in instrument && instrument.underlyingAssetId === instrument.assetId)
    reject('INSTRUMENT_SELF_REFERENCING_UNDERLYING');
  const expiry = 'expiryAt' in instrument ? instrument.expiryAt : 'maturityAt' in instrument ? instrument.maturityAt : null;
  if (expiry !== null && instrument.status === 'active' && expiry <= instrument.evaluatedAt)
    reject('INSTRUMENT_ACTIVE_AFTER_EXPIRY');
  if (p.isDemo !== (p.licenseScope === 'sandbox_demo')) reject('INSTRUMENT_DEMO_PROVENANCE_MISMATCH');
});
export type InstrumentMaster = z.infer<typeof InstrumentMasterSchema>;

/** Structurally valid source metadata remains unverified and cannot grant scoring or display rights. */
export function inspectInstrumentMaster(input: unknown) {
  const instrument = InstrumentMasterSchema.parse(input);
  const mapping = resolveProductAssetMapping({
    assetId: instrument.assetId, symbol: instrument.symbol, name: instrument.name,
    productAssetClass: instrument.productAssetClass, venue: instrument.venue,
    currency: instrument.currency, status: instrument.status, subclass: instrument.subclass,
    region: instrument.productAssetClass === 'stocks' ? instrument.region : null,
  });
  return { instrument, mapping, identityVerified: false as const, productionEligible: false as const };
}
