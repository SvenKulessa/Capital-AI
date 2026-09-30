import type { AssetIdentity, FeatureValue } from '../contracts/canonicalContracts';
import type { RawObservation } from './providerAdapters';
export interface FeatureExtractionContext { asset: AssetIdentity; observation: RawObservation; historicalPrices?: number[]; macroContext?: Record<string, number>; }
/** A last trade alone cannot establish RSI, fundamentals, sentiment or institutional flows. */
export class FeatureStoreService {
 extractFeatures(context: FeatureExtractionContext): Map<string, FeatureValue> {
  if (context.observation.provenance.isDemo) throw new Error('PRODUCTION_DEMO_DISABLED');
  if (context.observation.assetId !== context.asset.assetId) throw new Error('ASSET_MAPPING_MISMATCH');
  return new Map();
 }
}
