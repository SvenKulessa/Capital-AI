import { z } from 'zod';
import { AssetClassSchema } from './common';
import { AssetIdentitySchema, type AssetIdentity } from './canonicalContracts';

/**
 * Product presentation classes are deliberately NOT synonymous with the
 * narrower scorer taxonomy. This mapper cannot grant instrument admission.
 */
export const ProductAssetClassSchema = z.enum([
  'stocks', 'etfs', 'indices', 'crypto', 'forex', 'commodities',
  'futures', 'options', 'bonds',
]);
export type ProductAssetClass = z.infer<typeof ProductAssetClassSchema>;

export const ProductAssetMappingInputSchema = z.strictObject({
  assetId: z.string().min(1),
  symbol: z.string().min(1),
  name: z.string().min(1),
  productAssetClass: ProductAssetClassSchema,
  venue: z.string().min(1),
  currency: z.string().regex(/^[A-Z0-9]{3,8}$/),
  region: z.enum(['US', 'EU']).nullable().default(null),
  subclass: z.string().min(1).nullable().default(null),
  status: z.enum(['active', 'halted', 'delisted', 'unverified']),
}).superRefine((value, ctx) => {
  if (value.productAssetClass !== 'crypto' && !/^[A-Z]{3}$/.test(value.currency))
    ctx.addIssue({ code: 'custom', message: 'FIAT_PRODUCT_CURRENCY_INVALID' });
});
export type ProductAssetMappingInput = z.infer<typeof ProductAssetMappingInputSchema>;

export interface ProductAssetMappingResult {
  schemaVersion: 'CAPITAL_AI_PRODUCT_ASSET_MAPPING@1';
  productAssetClass: ProductAssetClass;
  canonicalAssetClass: z.infer<typeof AssetClassSchema> | null;
  asset: AssetIdentity | null;
  mappingStatus: 'MAPPED_NOT_ADMITTED' | 'BLOCKED';
  instrumentVerified: false;
  scoringEligible: false;
  rankingEligible: false;
  reasonCodes: string[];
}

/**
 * A class can be structurally mapped without ever being marked "verified".
 * ETFs, indices, futures and options have no exact engine class yet; mapping
 * any of these to stocks or commodities would lose instrument semantics.
 */
export function resolveProductAssetMapping(input: unknown): ProductAssetMappingResult {
  const value = ProductAssetMappingInputSchema.parse(input);
  const reasons: string[] = [];
  let canonical: z.infer<typeof AssetClassSchema> | null = null;
  switch (value.productAssetClass) {
    case 'stocks':
      if (value.region === 'US') canonical = 'equity_us';
      else if (value.region === 'EU') canonical = 'equity_eu';
      else reasons.push('STOCK_REGION_NOT_VERIFIED');
      break;
    case 'crypto': canonical = 'crypto'; break;
    case 'forex': canonical = 'forex'; break;
    case 'commodities': canonical = 'commodities'; break;
    case 'bonds': canonical = 'fixed_income'; break;
    case 'etfs':
    case 'indices':
    case 'futures':
    case 'options':
      reasons.push('CANONICAL_INSTRUMENT_CLASS_UNIMPLEMENTED');
      break;
  }
  if (value.status !== 'active') reasons.push('ASSET_NOT_ACTIVE');
  // Region is a mandatory disambiguator for stocks, not an implicit classifier.
  if (value.productAssetClass !== 'stocks' && value.region !== null) reasons.push('REGION_NOT_APPLICABLE');
  const asset = canonical && reasons.length === 0
    ? AssetIdentitySchema.parse({
      assetId: value.assetId, symbol: value.symbol, name: value.name,
      assetClass: canonical, venue: value.venue, currency: value.currency,
      status: value.status, ...(value.subclass ? { subclass: value.subclass } : {}),
    })
    : null;

  if (asset) reasons.push('INSTRUMENT_SOURCE_PROVENANCE_NOT_VERIFIED');
  return {
    schemaVersion: 'CAPITAL_AI_PRODUCT_ASSET_MAPPING@1',
    productAssetClass: value.productAssetClass,
    canonicalAssetClass: canonical,
    asset,
    mappingStatus: asset ? 'MAPPED_NOT_ADMITTED' : 'BLOCKED',
    instrumentVerified: false,
    scoringEligible: false,
    rankingEligible: false,
    reasonCodes: reasons,
  };
}
