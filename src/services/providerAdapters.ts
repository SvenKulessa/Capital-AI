import type { AssetIdentity, DataProvenance } from '../contracts/canonicalContracts';

export interface RawObservation {
  assetId: string; symbol: string; sourceProvider: string; price: number; bid: number; ask: number;
  volume24h: number; observedAt: number; receivedAt: number; rawPayload: Record<string, unknown>;
  provenance: DataProvenance;
}
export interface ProviderHealthReport {
  providerId: string; isOnline: boolean; pingMs: number; lastMessageAt: number;
  errorRateLastHour: number; activeSockets: number; isDemoMode: boolean;
}
export interface ProviderAdapter {
  providerId: string; displayName: string; isDemo: boolean; supportedAssetClasses: string[];
  fetchObservation(asset: AssetIdentity): Promise<RawObservation>;
  healthCheck(): Promise<ProviderHealthReport>;
}

async function verifiedQuote(asset: AssetIdentity, expectedProvider: string): Promise<RawObservation> {
  const symbol = asset.symbol.toUpperCase().replace('/', '');
  const res = await fetch(`/api/market/quote?symbol=${encodeURIComponent(symbol)}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Market data unavailable (${res.status})`);
  const data = await res.json();
  if (data.isDemo || data.provider !== expectedProvider || data.symbol !== symbol ||
      !Number.isFinite(data.price) || data.price <= 0 || Date.now() - data.observedAt > 30_000 ||
      (asset.currency === 'USD' && data.quote !== 'USD')) throw new Error('Provider, currency or freshness mismatch');
  const provenance: DataProvenance = {
    providerId: expectedProvider, providerDataset: `${data.mode}_quote`, observedAt: data.observedAt,
    receivedAt: data.receivedAt, publishedAt: data.observedAt,
    latencyMs: data.receivedAt - data.observedAt, isDelayed: false, isDemo: false,
    sourceReference: `/api/market/quote?symbol=${encodeURIComponent(symbol)}`, licenseScope: 'unverified',
  };
  return { assetId: asset.assetId, symbol: asset.symbol, sourceProvider: expectedProvider,
    price: data.price, bid: data.price, ask: data.price, volume24h: 0,
    observedAt: data.observedAt, receivedAt: data.receivedAt, rawPayload: { provider: expectedProvider }, provenance };
}

abstract class LiveAdapter implements ProviderAdapter {
  abstract providerId: string; abstract displayName: string; abstract supportedAssetClasses: string[];
  readonly isDemo = false;
  fetchObservation(asset: AssetIdentity) { return verifiedQuote(asset, this.providerId); }
  async healthCheck(): Promise<ProviderHealthReport> {
    return { providerId: this.providerId, isOnline: false, pingMs: 0, lastMessageAt: 0,
      errorRateLastHour: 0, activeSockets: 0, isDemoMode: false };
  }
}
export class BinanceProviderAdapter extends LiveAdapter {
  providerId = 'binance'; displayName = 'Binance Spot WebSocket'; supportedAssetClasses = ['crypto'];
}
export class KrakenProviderAdapter extends LiveAdapter {
  providerId = 'kraken'; displayName = 'Kraken WebSocket v2'; supportedAssetClasses = ['crypto'];
}
export class TwelveDataProviderAdapter extends LiveAdapter {
  providerId = 'twelvedata'; displayName = 'Twelve Data REST';
  supportedAssetClasses = ['equity_us', 'equity_eu', 'forex', 'indices', 'crypto'];
}
export class PolygonProviderAdapter extends LiveAdapter {
  providerId = 'polygon'; displayName = 'Polygon REST'; supportedAssetClasses = ['equity_us', 'crypto'];
}
export class SecEdgarProviderAdapter extends LiveAdapter {
  providerId = 'sec_edgar_filings'; displayName = 'SEC EDGAR (not configured)'; supportedAssetClasses = ['equity_us'];
  async fetchObservation(_asset: AssetIdentity): Promise<RawObservation> { throw new Error('SEC EDGAR ingestion not configured'); }
}
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
export class ProviderAdapterRegistry {
  private adapters = new Map<string, ProviderAdapter>();
  constructor() { [new BinanceProviderAdapter(), new KrakenProviderAdapter(), new TwelveDataProviderAdapter(),
    new PolygonProviderAdapter(), new SecEdgarProviderAdapter(), new ExplicitDemoAdapter()]
      .forEach(adapter => this.adapters.set(adapter.providerId, adapter)); }
  register(adapter: ProviderAdapter) { this.adapters.set(adapter.providerId, adapter); }
  getAdapter(id: string): ProviderAdapter { const adapter = this.adapters.get(id);
    if (!adapter) throw new Error(`Unknown provider: ${id}`); return adapter; }
  getAllAdapters() { return [...this.adapters.values()]; }
}
