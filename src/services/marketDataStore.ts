import { useSyncExternalStore } from 'react';
import { QuoteDeliverySchema, instrumentCatalog, isFresh } from '../../shared/market-contracts.mjs';
import type { MarketAsset } from '../types';

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
  const results = await Promise.allSettled(Object.keys(instrumentCatalog).map(async symbol => {
    const response = await fetch(`/api/market/quote?symbol=${encodeURIComponent(symbol)}`, { cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(6000)]) });
    if (!response.ok) throw new Error('QUOTE_UNAVAILABLE');
    const value = QuoteDeliverySchema.parse(await response.json());
    if (value.symbol !== symbol) throw new Error('SYMBOL_MISMATCH');
    return toMarketAsset(value);
  }));
  if (signal.aborted || !users) return;
  MARKET_ASSETS = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
  emit();
  timer = setTimeout(() => void refresh(), 5000);
}
function subscribe(listener: () => void) {
  listeners.add(listener); users++;
  if (users === 1) void refresh();
  return () => { listeners.delete(listener); users--; if (!users) { clearTimeout(timer); controller?.abort(); } };
}
export function useMarketAssets() { return useSyncExternalStore(subscribe, () => MARKET_ASSETS, () => MARKET_ASSETS); }
