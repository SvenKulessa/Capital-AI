import { useSyncExternalStore } from 'react';
import { QuoteDeliverySchema, instrumentCatalog, isFresh } from '../../shared/market-contracts.mjs';
import type { MarketAsset } from '../types';

export let MARKET_ASSETS: MarketAsset[] = [];
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;
let controller: AbortController | undefined;
let users = 0;
let marketReady = false;
let marketStatusValidUntil = 0;
const MARKET_STATUS_BLOCKED_RECHECK_MS = 30_000;
const MARKET_STATUS_READY_RECHECK_MS = 5_000;

function emit() { listeners.forEach(fn => fn()); }

async function marketQuotesReady(signal: AbortSignal) {
  if (Date.now() < marketStatusValidUntil) return marketReady;
  try {
    const response = await fetch('/api/market/status', {
      cache: 'no-store',
      signal: AbortSignal.any([signal, AbortSignal.timeout(4000)]),
    });
    if (!response.ok) throw new Error('MARKET_STATUS_UNAVAILABLE');
    const state = await response.json() as { quotesEnabled?: boolean; quoteAdmittedSources?: number };
    marketReady = state.quotesEnabled === true && Number(state.quoteAdmittedSources || 0) > 0;
    marketStatusValidUntil = Date.now() + (marketReady ? MARKET_STATUS_READY_RECHECK_MS : MARKET_STATUS_BLOCKED_RECHECK_MS);
    return marketReady;
  } catch {
    marketReady = false;
    marketStatusValidUntil = signal.aborted ? 0 : Date.now() + MARKET_STATUS_BLOCKED_RECHECK_MS;
    return false;
  }
}
export function toMarketAsset(value: unknown): MarketAsset {
  const f = QuoteDeliverySchema.parse(value);
  if (!isFresh(f)) throw new Error('QUOTE_EXPIRED');
  const i = instrumentCatalog[f.symbol];
  return { id: f.symbol, symbol: f.symbol, name: i.name, mainCategory: i.category as MarketAsset['mainCategory'],
    value: `${f.price.toLocaleString('de-DE', { maximumFractionDigits: 8 })} ${f.quote}`,
    change: 'Nicht verfügbar', isPositive: false, category: i.category,
    iconType: i.category === 'KRYPTO' ? 'bitcoin' : 'stock', sparklinePath: '',
    glowColor: '#F9BF21', borderColor: '#F9BF21', waveColor: '#F9BF21',
    high24h: 'Nicht verfügbar', low24h: 'Nicht verfügbar',
    volume24h: f.volume24h === null ? 'Nicht verfügbar' : String(f.volume24h),
    aiScore: null, aiRating: 'Pflichtdaten fehlen', description: `${f.provider} · ${f.venue} · ${f.quote}`,
    evidenceId: f.evidenceId, observedAt: f.observedAt, provider: f.provider,
    dataAvailability: f.availability, quoteCurrency: f.quote, price: f.price, actionable: false };
}
async function refresh() {
  controller = new AbortController();
  const signal = controller.signal;
  if (!(await marketQuotesReady(signal))) {
    if (signal.aborted || !users) return;
    MARKET_ASSETS = [];
    emit();
    timer = setTimeout(() => void refresh(), Math.max(1000, marketStatusValidUntil - Date.now()));
    return;
  }

  const results = await Promise.allSettled(Object.keys(instrumentCatalog).map(async symbol => {
    const response = await fetch(`/api/market/quote?symbol=${encodeURIComponent(symbol)}`, { cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(6000)]) });
    if (!response.ok) throw new Error('QUOTE_UNAVAILABLE');
    const value = QuoteDeliverySchema.parse(await response.json());
    if (value.symbol !== symbol) throw new Error('SYMBOL_MISMATCH');
    return toMarketAsset(value);
  }));
  if (signal.aborted || !users) return;
  MARKET_ASSETS = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []).filter(asset => asset.observedAt !== undefined && Date.now() - asset.observedAt < 30000);
  emit();
  timer = setTimeout(() => void refresh(), 5000);
}
function subscribe(listener: () => void) {
  listeners.add(listener); users++;
  if (users === 1) void refresh();
  return () => { listeners.delete(listener); users--; if (!users) { clearTimeout(timer); controller?.abort(); } };
}
export function useMarketAssets() { return useSyncExternalStore(subscribe, () => MARKET_ASSETS, () => MARKET_ASSETS); }
