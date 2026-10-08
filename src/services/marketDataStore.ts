import { useSyncExternalStore } from 'react';
import { QuoteDeliverySchema, instrumentCatalog, isFresh } from '../../shared/market-contracts.mjs';
import type { MarketAsset } from '../types';
import { projectCanonicalAssetValue } from './marketValuesProjection';

export let MARKET_ASSETS: MarketAsset[] = [];
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
  return { id: f.symbol, symbol: f.symbol, name: i.name, mainCategory: i.category as MarketAsset['mainCategory'],
    value: `${f.price.toLocaleString('de-DE', { maximumFractionDigits: 8 })} ${f.quote}`,
    change: 'Nicht verfügbar', isPositive: false, category: i.category,
    iconType: i.category === 'KRYPTO' ? 'bitcoin' : 'stock', sparklinePath: '',
    glowColor: '#F9BF21', borderColor: '#F9BF21', waveColor: '#F9BF21',
    high24h: 'Nicht verfügbar', low24h: 'Nicht verfügbar',
    volume24h: f.volume24h === null ? 'Nicht verfügbar' : String(f.volume24h),
    aiScore: null, aiRating: 'Pflichtdaten fehlen',
    description: `${f.provider} · ${f.venue} · ${f.quote} · ${f.timeSemantics === 'reference' ? 'Referenzkurs' : 'Marktdaten'}`,
    evidenceId: f.evidenceId, observedAt: f.observedAt, observedAtPrecision: f.observedAtPrecision,
    publishedAt: f.publishedAt, referenceDate: f.referenceDate, timeSemantics: f.timeSemantics, provider: f.provider,
    dataAvailability: f.availability, quoteCurrency: f.quote, price: f.price, actionable: false };
}
async function refresh() {
  controller = new AbortController();
  const signal = controller.signal;
  try {
    // One bounded batch replaces a request per instrument every five seconds.
    const response = await fetch('/api/market/values', {
      cache: 'no-store',
      signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
    });
    if (!response.ok) throw new Error('MARKET_VALUES_UNAVAILABLE');
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || !('schema' in body) ||
        body.schema !== 'CAPITAL_AI_ASSET_VALUES@1' ||
        !('status' in body) || body.status !== 'READY' ||
        !('values' in body) || !Array.isArray(body.values) ||
        body.values.length > Object.keys(instrumentCatalog).length) {
      throw new Error('MARKET_VALUES_INVALID');
    }
    const next = body.values.map(value => projectCanonicalAssetValue(value));
    if (new Set(next.map(value => value.symbol)).size !== next.length) {
      throw new Error('MARKET_VALUES_DUPLICATED');
    }
    if (signal.aborted || !users) return;
    MARKET_ASSETS = next;
    emit();
  } catch {
    if (signal.aborted || !users) return;
    // Stale or unverifiable market values must never remain visible.
    MARKET_ASSETS = [];
    emit();
  } finally {
    if (!signal.aborted && users > 0) timer = setTimeout(() => void refresh(), 60_000);
  }
}
function subscribe(listener: () => void) {
  listeners.add(listener); users++;
  if (users === 1) void refresh();
  return () => { listeners.delete(listener); users--; if (!users) { clearTimeout(timer); controller?.abort(); } };
}
export function useMarketAssets() { return useSyncExternalStore(subscribe, () => MARKET_ASSETS, () => MARKET_ASSETS); }
