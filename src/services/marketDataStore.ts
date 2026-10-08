import { useSyncExternalStore } from 'react';
import { MarketAssetCatalogSchema, QuoteDeliverySchema, instrumentCatalog, isFresh } from '../../shared/market-contracts.mjs';
import type { MarketAsset } from '../types';

export type MarketAssetCatalog = ReturnType<typeof MarketAssetCatalogSchema.parse>;
export type MarketCatalogAsset = MarketAssetCatalog['assets'][number];

export let MARKET_ASSETS: MarketAsset[] = [];
export let MARKET_ASSET_CATALOG: MarketAssetCatalog = {
  schema: 'CAPITAL_AI_MARKET_ASSET_CATALOG@1',
  sourcePolicy: 'OPEN_SOURCE_AND_OPEN_DATA_ONLY',
  quotesEnabled: false,
  assets: [],
};

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;
let controller: AbortController | undefined;
let users = 0;

function emit() { listeners.forEach(fn => fn()); }

export function toMarketAsset(value: unknown): MarketAsset {
  const f = QuoteDeliverySchema.parse(value);
  if (!isFresh(f)) throw new Error('QUOTE_EXPIRED');
  const catalog = instrumentCatalog as Record<string, (typeof instrumentCatalog)[keyof typeof instrumentCatalog]>;
  const i = catalog[f.symbol];
  if (!i) throw new Error('INSTRUMENT_UNKNOWN');
  return {
    id: f.symbol,
    symbol: f.symbol,
    name: i.name,
    mainCategory: i.category as MarketAsset['mainCategory'],
    value: `${f.price.toLocaleString('de-DE', { maximumFractionDigits: 8 })} ${f.quote}`,
    change: 'Nicht verfügbar',
    isPositive: false,
    category: i.category,
    iconType: i.category === 'KRYPTO' ? 'bitcoin' : i.category === 'FOREX' ? 'forex' : 'stock',
    sparklinePath: '',
    glowColor: '#F9BF21',
    borderColor: '#F9BF21',
    waveColor: '#F9BF21',
    high24h: 'Nicht verfügbar',
    low24h: 'Nicht verfügbar',
    volume24h: f.volume24h === null ? 'Nicht verfügbar' : String(f.volume24h),
    aiScore: null,
    aiRating: 'Pflichtdaten fehlen',
    description: `${f.provider} · ${f.venue} · ${f.quote} · ${f.timeSemantics === 'reference' ? 'Referenzkurs' : 'Marktdaten'}`,
    evidenceId: f.evidenceId,
    observedAt: f.observedAt,
    observedAtPrecision: f.observedAtPrecision,
    publishedAt: f.publishedAt,
    referenceDate: f.referenceDate,
    timeSemantics: f.timeSemantics,
    provider: f.provider,
    dataAvailability: f.availability,
    quoteCurrency: f.quote,
    price: f.price,
    actionable: false,
  };
}

function scheduleRefresh(delayMs: number) {
  clearTimeout(timer);
  timer = setTimeout(() => void refresh(), delayMs);
}

async function refresh() {
  controller?.abort();
  controller = new AbortController();
  const signal = controller.signal;
  try {
    const catalogResponse = await fetch('/api/market/assets', {
      cache: 'no-store',
      signal: AbortSignal.any([signal, AbortSignal.timeout(6000)]),
    });
    if (!catalogResponse.ok) throw new Error('ASSET_CATALOG_UNAVAILABLE');
    const catalog = MarketAssetCatalogSchema.parse(await catalogResponse.json());

    const runtimeAssets = catalog.assets.filter(asset => asset.runtimeEnabled);
    // Catalog identity must survive a failed data-read. Never request an unadmitted instrument.
    let verified: MarketAsset[] = [];
    if (catalog.quotesEnabled && runtimeAssets.length) {
      try {
        const valuesResponse = await fetch('/api/market/values', {
          cache: 'no-store',
          signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
        });
        if (!valuesResponse.ok) throw new Error('MARKET_VALUES_UNAVAILABLE');
        const body: unknown = await valuesResponse.json();
        if (!body || typeof body !== 'object' ||
            !('schema' in body) || body.schema !== 'CAPITAL_AI_ASSET_VALUES@1' ||
            !('status' in body) || body.status !== 'READY' ||
            !('values' in body) || !Array.isArray(body.values) ||
            body.values.length > runtimeAssets.length) {
          throw new Error('MARKET_VALUES_INVALID');
        }
        // Keep the initial bundle below its strict 500 kB cap; load quote projection on demand.
        const { projectCanonicalAssetValue } = await import('./marketValuesProjection');
        const eligible = new Map(runtimeAssets.map(asset => [asset.symbol, asset]));
        verified = body.values.map(raw => {
          const item = projectCanonicalAssetValue(raw);
          const catalogItem = eligible.get(item.symbol);
          if (!catalogItem || item.id !== catalogItem.instrumentId ||
              item.provider !== catalogItem.provider) {
            throw new Error('MARKET_VALUE_NOT_IN_RUNTIME_CATALOG');
          }
          return item;
        });
        if (new Set(verified.map(item => item.symbol)).size !== verified.length) {
          throw new Error('MARKET_VALUES_DUPLICATED');
        }
      } catch {
        if (signal.aborted || !users) return;
        // No partial promotion: every displayed value must be valid and backed by evidence.
        verified = [];
      }
    }
    if (signal.aborted || !users) return;
    MARKET_ASSET_CATALOG = catalog;
    MARKET_ASSETS = verified;
    emit();
    scheduleRefresh(catalog.quotesEnabled ? 60_000 : 15_000);
  } catch {
    if (signal.aborted || !users) return;
    MARKET_ASSET_CATALOG = {
      schema: 'CAPITAL_AI_MARKET_ASSET_CATALOG@1',
      sourcePolicy: 'OPEN_SOURCE_AND_OPEN_DATA_ONLY',
      quotesEnabled: false,
      assets: [],
    };
    MARKET_ASSETS = [];
    emit();
    scheduleRefresh(15000);
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  users++;
  if (users === 1) void refresh();
  return () => {
    listeners.delete(listener);
    users--;
    if (!users) {
      clearTimeout(timer);
      controller?.abort();
    }
  };
}

export function useMarketAssets() {
  return useSyncExternalStore(subscribe, () => MARKET_ASSETS, () => MARKET_ASSETS);
}

export function useMarketAssetCatalog() {
  return useSyncExternalStore(subscribe, () => MARKET_ASSET_CATALOG, () => MARKET_ASSET_CATALOG);
}
