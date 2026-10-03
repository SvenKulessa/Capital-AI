import { FeatureValueSchema, type AssetIdentity, type FeatureValue } from '../contracts/canonicalContracts';
import type { RawObservation } from './providerAdapters';
export interface FeatureExtractionContext { asset: AssetIdentity; observation: RawObservation; historicalPrices?: number[]; macroContext?: Record<string, number>; }
export interface FeatureSnapshotStore {
  putImmutable(snapshotId: string, features: readonly FeatureValue[]): Promise<void>;
  get(snapshotId: string): Promise<readonly FeatureValue[] | null>;
}
/** Isolated validation/research store, explicitly volatile and non-production. */
export class InMemoryFeatureSnapshotStore implements FeatureSnapshotStore {
  private snapshots = new Map<string, FeatureValue[]>();
  async putImmutable(snapshotId: string, input: readonly FeatureValue[]) {
    if (!snapshotId || this.snapshots.has(snapshotId)) throw new Error('SNAPSHOT_ID_REUSE');
    this.snapshots.set(snapshotId, input.map(f => FeatureValueSchema.parse(f)));
  }
  async get(snapshotId: string) { return structuredClone(this.snapshots.get(snapshotId) ?? null); }
}
/** A last trade alone cannot establish RSI, fundamentals, sentiment or institutional flows. */
export class FeatureStoreService {
 extractFeatures(context: FeatureExtractionContext): Map<string, FeatureValue> {
  if (context.observation.provenance.isDemo) throw new Error('PRODUCTION_DEMO_DISABLED');
  if (context.observation.assetId !== context.asset.assetId) throw new Error('ASSET_MAPPING_MISMATCH');
  return new Map();
 }
}
