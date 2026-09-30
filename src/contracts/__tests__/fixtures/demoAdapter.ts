import type { AssetIdentity } from '../../canonicalContracts';
import type { ProviderAdapter, RawObservation, ProviderHealthReport } from '../../../services/providerAdapters';
export class ExplicitDemoAdapter implements ProviderAdapter {
  providerId = 'capital_ai_demo_engine'; displayName = 'Explicit Demo'; isDemo = true;
  supportedAssetClasses = ['crypto', 'equity_us', 'equity_eu', 'forex', 'indices'];
  async fetchObservation(asset: AssetIdentity): Promise<RawObservation> {
    const now = Date.now(), price = asset.symbol.charCodeAt(0) * 12.5 + 40;
    return { assetId: asset.assetId, symbol: asset.symbol, sourceProvider: this.providerId, price,
      bid: price, ask: price, volume24h: 0, observedAt: now, receivedAt: now,
      rawPayload: { simulated: true }, provenance: { providerId: this.providerId, providerDataset: 'sandbox_seed_fixture',
        observedAt: now, receivedAt: now, publishedAt: now, latencyMs: 0, isDelayed: true, isDemo: true,
        sourceReference: 'local://explicit-demo', licenseScope: 'sandbox_demo' } };
  }
  async healthCheck(): Promise<ProviderHealthReport> { return { providerId: this.providerId, isOnline: true,
    pingMs: 0, lastMessageAt: Date.now(), errorRateLastHour: 0, activeSockets: 0, isDemoMode: true }; }
}
