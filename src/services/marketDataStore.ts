import { useSyncExternalStore } from 'react';
import { startMarketDelivery } from './marketDeliveryClient';
import { QuoteDeliverySchema, instrumentCatalog, isFresh } from '../../shared/market-contracts.mjs';
import type { MarketAsset } from '../types';

export let MARKET_ASSETS: MarketAsset[] = [];
const listeners = new Set<() => void>();
let stop: (() => void) | undefined;
let users = 0;
function emit() { listeners.forEach(fn => fn()); }
export function toMarketAsset(value: unknown): MarketAsset {
  const f = QuoteDeliverySchema.parse(value);
  if (!isFresh(f)) throw new Error('QUOTE_EXPIRED');
  const i = f.instrument || instrumentCatalog[f.symbol as keyof typeof instrumentCatalog];
  return { id: f.instrument?.assetId || f.symbol, symbol: f.symbol, name: i.name, mainCategory: i.category as MarketAsset['mainCategory'],
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
export function subscribeMarketAssets(listener: () => void) {
  listeners.add(listener); users++;
  if (users === 1) stop = startMarketDelivery(values => {
    MARKET_ASSETS = values.map(toMarketAsset); emit();
  });
  return () => {
    listeners.delete(listener); users--;
    if (!users) { stop?.(); stop = undefined; MARKET_ASSETS = []; }
  };
}
export function useMarketAssets() { return useSyncExternalStore(subscribeMarketAssets, () => MARKET_ASSETS, () => MARKET_ASSETS); }
