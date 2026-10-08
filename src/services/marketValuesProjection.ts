import {
  CanonicalAssetValueSchema,
  REFERENCE_RATE_MAX_AGE_MS,
  instrumentCatalog,
} from '../../shared/market-contracts.mjs';
import type { MarketAsset } from '../types';

/**
 * Only project replay-verified, admitted canonical values to the UI.
 * A reference rate is informational, never a live trade price or score.
 */
export function projectCanonicalAssetValue(raw: unknown, now = Date.now()): MarketAsset {
  const value = CanonicalAssetValueSchema.parse(raw);
  const instrument = instrumentCatalog[value.symbol as keyof typeof instrumentCatalog];
  if (!instrument || value.instrumentId !== instrument.instrumentId ||
      !instrument.providers.includes(value.provider) || value.venue !== instrument.venue ||
      value.quoteCurrency !== instrument.quote || value.timeSemantics !== instrument.timeSemantics) {
    throw new Error('MARKET_INSTRUMENT_MISMATCH');
  }
  if (value.observedAt > now ||
      (value.timeSemantics === 'reference'
        ? value.publishedAt === null || value.publishedAt > now ||
          now - value.publishedAt >= REFERENCE_RATE_MAX_AGE_MS
        : now - value.observedAt >= 30_000)) {
    throw new Error('MARKET_VALUE_EXPIRED');
  }
  const category = instrument.category as MarketAsset['mainCategory'];
  const color = category === 'FOREX' ? '#E879F9' : '#F9BF21';
  return {
    id: value.instrumentId,
    symbol: value.symbol,
    name: instrument.name,
    mainCategory: category,
    value: `${value.value.toLocaleString('de-DE', { maximumFractionDigits: 8 })} ${value.quoteCurrency}`,
    change: 'Nicht verfügbar',
    isPositive: false,
    category,
    iconType: category === 'FOREX' ? 'forex' : category === 'KRYPTO' ? 'bitcoin' : 'stock',
    sparklinePath: '',
    glowColor: color,
    borderColor: color,
    waveColor: color,
    high24h: 'Nicht verfügbar',
    low24h: 'Nicht verfügbar',
    volume24h: 'Nicht verfügbar',
    aiScore: null,
    aiRating: 'Pflichtdaten fehlen',
    description: `${value.provider} · ${value.venue} · ${value.timeSemantics === 'reference' ? 'Täglicher Referenzkurs (kein Handelspreis)' : 'Marktdaten'}`,
    evidenceId: value.evidenceId,
    observedAt: value.observedAt,
    observedAtPrecision: value.observedAtPrecision,
    publishedAt: value.publishedAt,
    referenceDate: value.referenceDate,
    timeSemantics: value.timeSemantics,
    provider: value.provider,
    dataAvailability: value.timeSemantics === 'reference' ? 'reference' : 'cached',
    quoteCurrency: value.quoteCurrency,
    price: value.value,
    actionable: false,
  };
}
