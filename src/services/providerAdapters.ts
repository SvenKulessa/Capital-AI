import { QuoteDeliverySchema, isFresh } from '../../shared/market-contracts.mjs';
import type { AssetIdentity, DataProvenance } from '../contracts/canonicalContracts';

export interface RawObservation {
  assetId: string; symbol: string; sourceProvider: string; price: number; bid: number | null; ask: number | null;
  volume24h: number | null; observedAt: number; receivedAt: number; rawPayload: Record<string, unknown>;
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
  const data = QuoteDeliverySchema.parse(await res.json());
  if (!isFresh(data) || data.isDemo || data.provider !== expectedProvider || data.symbol !== symbol ||
      data.venue.toUpperCase() !== asset.venue.toUpperCase() || data.quote !== asset.currency ||
      (asset.currency === 'USD' && data.quote !== 'USD')) throw new Error('Provider, currency or freshness mismatch');
  const provenance: DataProvenance = {
    providerId: expectedProvider, providerDataset: `${data.mode}_quote`, observedAt: data.observedAt,
    receivedAt: data.receivedAt, publishedAt: data.observedAt,
    latencyMs: data.receivedAt - data.observedAt, isDelayed: false, isDemo: false,
    sourceReference: `/api/market/evidence?id=${encodeURIComponent(data.evidenceId)}`, licenseScope: 'unverified',
  };
  return { assetId: asset.assetId, symbol: asset.symbol, sourceProvider: expectedProvider,
    price: data.price, bid: data.bid, ask: data.ask, volume24h: data.volume24h,
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
export class FinancialDataNetProviderAdapter extends LiveAdapter {
  providerId = 'financialdatanet';
  displayName = 'FinancialData.Net REST (rights review required)';
  supportedAssetClasses = ['equity_us', 'equity_eu', 'crypto', 'forex', 'commodities'];
  async fetchObservation(_asset: AssetIdentity): Promise<RawObservation> {
    throw new Error('FINANCIALDATANET_RIGHTS_AND_DATASET_MAPPING_REQUIRED');
  }
}
export class ProviderAdapterRegistry {
  private adapters = new Map<string, ProviderAdapter>();
  constructor() { [new BinanceProviderAdapter(), new KrakenProviderAdapter(), new TwelveDataProviderAdapter(),
    new PolygonProviderAdapter(), new SecEdgarProviderAdapter(), new FinancialDataNetProviderAdapter()]
      .forEach(adapter => this.adapters.set(adapter.providerId, adapter)); }
  register(adapter: ProviderAdapter) { this.adapters.set(adapter.providerId, adapter); }
  getAdapter(id: string): ProviderAdapter { const adapter = this.adapters.get(id);
    if (!adapter) throw new Error(`Unknown provider: ${id}`); return adapter; }
  getAllAdapters() { return [...this.adapters.values()]; }
}
