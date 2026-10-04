import { instrumentCatalog, QuoteFactSchema, isFresh } from '../shared/market-contracts.mjs';
import { infrastructure, payloadHash } from './infrastructure.mjs';
import { MARKET_SOURCE_POLICY, admittedMarketSourcesFor, isAdmittedMarketSource } from './open-source-market-policy.mjs';

// No network I/O during build or runtime until an Open-Source + Open-Data source is admitted.
const allowed = new Set((process.env.MARKET_SYMBOLS || 'BTCUSDT,BTCUSD,AAPL').split(',').map(x => x.trim()).filter(Boolean));
const quoteAdmittedSources = admittedMarketSourcesFor('marketQuotes');
const scoringAdmittedSources = admittedMarketSourcesFor('scoringPriceInput');
const sourceAdmissionAvailable = quoteAdmittedSources.length > 0;
const quotesEnabled = sourceAdmissionAvailable && process.env.MARKET_QUOTES_ENABLED === 'true';

export function observation(symbol, provider, price, time, quote, mode, rawPayload, details = {}) {
  if(!isAdmittedMarketSource(provider, 'marketQuotes')) return null;
  const receivedAt = Date.now();
  const candidate = { schemaVersion: '1.0.0', symbol, venue: instrumentCatalog[symbol]?.venue,
    provider, price: Number(price), quote, observedAt: Number(time), receivedAt, mode,
    isDemo: false, licenseScope: 'unverified', payloadHash: payloadHash(rawPayload),
    bid: details.bid == null ? null : Number(details.bid), ask: details.ask == null ? null : Number(details.ask),
    volume24h: details.volume24h == null ? null : Number(details.volume24h) };
  const parsed = QuoteFactSchema.safeParse(candidate);
  return allowed.has(symbol) && parsed.success && isFresh(parsed.data) ? { fact: parsed.data, rawPayload } : null;
}

export function startStreams() {
  // Legacy Binance/Kraken/Twelve Data/Polygon paths are intentionally disabled.
  // A future source needs immutable Open-Source + Open-Data admission evidence first.
  return () => {};
}

export async function quote(symbol) {
  if (!allowed.has(symbol)) return [400, { error: 'unsupported_symbol' }];
  if (!sourceAdmissionAvailable) return [503, {
    error: 'open_data_source_not_configured',
    symbol,
    sourcePolicy: MARKET_SOURCE_POLICY.mode,
  }];
  if (!quotesEnabled) return [503, { error: 'pipeline_disabled', symbol }];

  const cached = await infrastructure.read(symbol);
  if (cached && isAdmittedMarketSource(cached.provider, 'marketQuotes')) return [200, cached];

  return [503, {
    error: 'open_data_source_not_configured',
    symbol,
    sourcePolicy: MARKET_SOURCE_POLICY.mode,
  }];
}

export function health() {
  return {
    status: 'ok',
    ingress: 'fail_closed',
    symbols: [...allowed],
    quotesEnabled,
    infrastructure: infrastructure.status(),
    sourcePolicy: MARKET_SOURCE_POLICY.mode,
    admittedSources: MARKET_SOURCE_POLICY.admittedSources.length,
    quoteAdmittedSources: quoteAdmittedSources.length,
    scoringAdmittedSources: scoringAdmittedSources.length,
    scoreDisplayEnabled: scoringAdmittedSources.length > 0,
  };
}
