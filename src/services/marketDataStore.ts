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

    const runtimeSymbols = catalog.assets
      .filter(asset => asset.runtimeEnabled)
      .map(asset => asset.symbol);

    const results = catalog.quotesEnabled
      ? await Promise.allSettled(runtimeSymbols.map(async symbol => {
          const response = await fetch(`/api/market/quote?symbol=${encodeURIComponent(symbol)}`, {
            cache: 'no-store',
            signal: AbortSignal.any([signal, AbortSignal.timeout(6000)]),
          });
          if (!response.ok) throw new Error('QUOTE_UNAVAILABLE');
          const value = QuoteDeliverySchema.parse(await response.json());
          if (value.symbol !== symbol) throw new Error('SYMBOL_MISMATCH');
          return toMarketAsset(value);
        }))
      : [];

    if (signal.aborted || !users) return;
    MARKET_ASSET_CATALOG = catalog;
    MARKET_ASSETS = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
    emit();
    scheduleRefresh(catalog.quotesEnabled ? 5000 : 15000);
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
