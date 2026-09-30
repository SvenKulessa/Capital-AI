import { instrumentCatalog, QuoteFactSchema, isFresh } from '../shared/market-contracts.mjs';
import { infrastructure, payloadHash } from './infrastructure.mjs';
// No network I/O during the build. Market observations remain unavailable until verified.
const allowed = new Set((process.env.MARKET_SYMBOLS || 'BTCUSDT,BTCUSD,AAPL').split(',').map(x => x.trim()).filter(Boolean));
const persisting = new Set();
const quotesEnabled = process.env.MARKET_QUOTES_ENABLED !== 'false';
const throttledUntil = new Map();
const pending = new Map();
const failedUntil = new Map();

export function observation(symbol, provider, price, time, quote, mode, rawPayload, details = {}) {
  const receivedAt = Date.now();
  const candidate = { schemaVersion: '1.0.0', symbol, venue: instrumentCatalog[symbol]?.venue,
    provider, price: Number(price), quote, observedAt: Number(time), receivedAt, mode,
    isDemo: false, licenseScope: 'unverified', payloadHash: payloadHash(rawPayload),
    bid: details.bid == null ? null : Number(details.bid), ask: details.ask == null ? null : Number(details.ask),
    volume24h: details.volume24h == null ? null : Number(details.volume24h) };
  const parsed = QuoteFactSchema.safeParse(candidate);
  return allowed.has(symbol) && parsed.success && isFresh(parsed.data) ? { fact: parsed.data, rawPayload } : null;
}
async function accept(value) {
  if (!value || persisting.has(value.fact.symbol)) return null;
  persisting.add(value.fact.symbol);
  try { return await infrastructure.persist(value.fact, value.rawPayload); }
  catch { return null; }
  finally { persisting.delete(value.fact.symbol); }
}

function stream(url, parse, subscribe) {
  let socket, retry = 0, stopped = false;
  const open = () => {
    if (stopped) return;
    socket = new WebSocket(url);
    socket.addEventListener('open', () => { retry = 0; subscribe?.(socket); });
    socket.addEventListener('message', e => { try { if (typeof e.data === 'string' && e.data.length <= 65536) accept(parse(JSON.parse(e.data))); } catch { /* malformed provider frame */ } });
    socket.addEventListener('error', () => socket.close());
    socket.addEventListener('close', () => { if (!stopped) setTimeout(open, Math.min(30_000, 1000 * 2 ** Math.min(++retry, 5)) + Math.random() * 1000); });
  };
  open();
  return () => { stopped = true; socket?.close(); };
}

export function startStreams() {
  const stops = [];
  if (!quotesEnabled) return () => {};
  if (allowed.has('BTCUSDT')) stops.push(stream('wss://stream.binance.com:9443/ws/btcusdt@ticker', d => d.s === 'BTCUSDT' ? observation('BTCUSDT', 'binance', d.c, d.E, 'USDT', 'websocket', d, { bid: d.b, ask: d.a, volume24h: d.v }) : null));
  if (allowed.has('BTCUSD')) stops.push(stream('wss://ws.kraken.com/v2', d => {
    const tick = d.channel === 'trade' && d.type === 'update' && Array.isArray(d.data) && d.data.filter(t => t.symbol === 'BTC/USD').reduce((latest, t) => !latest || Date.parse(t.timestamp) > Date.parse(latest.timestamp) ? t : latest, null);
    return tick?.symbol === 'BTC/USD' ? observation('BTCUSD', 'kraken', tick.price, Date.parse(tick.timestamp), 'USD', 'websocket', d) : null;
  }, ws => ws.send(JSON.stringify({ method: 'subscribe', params: { channel: 'trade', symbol: ['BTC/USD'], snapshot: false } }))));
  return () => stops.forEach(stop => stop());
}

async function get(url, provider) {
  if ((throttledUntil.get(provider) || 0) > Date.now()) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000), redirect: 'error' });
    if (res.status === 429) throttledUntil.set(provider, Date.now() + 60_000);
    if (!res.ok || Number(res.headers.get('content-length')) > 262144 || !res.body) { await res.body?.cancel(); return null; }
    const reader = res.body.getReader();
    const chunks = [];
    let bytes = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 262144) return null;
        chunks.push(value);
      }
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } finally { await reader.cancel(); }
  } catch { return null; }
}

async function krakenTrades(symbol) {
  if (symbol !== 'BTCUSD') return null;
  const d = await get(new URL('https://api.kraken.com/0/public/Trades?pair=XBTUSD&count=1'), 'kraken');
  const trades = d?.error?.length === 0 && d.result?.XXBTZUSD;
  const trade = Array.isArray(trades) && trades.at(-1);
  return trade ? observation(symbol, 'kraken', trade[0], Math.floor(Number(trade[2]) * 1000), 'USD', 'rest', d) : null;
}

async function twelve(symbol) {
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key || symbol === 'BTCUSDT') return null;
  const name = symbol === 'BTCUSD' ? 'BTC/USD' : symbol;
  const url = new URL('https://api.twelvedata.com/quote');
  url.searchParams.set('symbol', name); url.searchParams.set('apikey', key);
  const d = await get(url, 'twelvedata');
  return d?.symbol === name && d.status !== 'error' ? observation(symbol, 'twelvedata', d.close, Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/.test(d.last_update_at || d.datetime || '') ? (d.last_update_at || d.datetime) : ''), 'USD', 'rest', d) : null;
}

async function polygon(symbol) {
  const key = process.env.POLYGON_API_KEY;
  if (!key || symbol === 'BTCUSDT') return null;
  const crypto = symbol === 'BTCUSD', ticker = crypto ? 'X:BTCUSD' : symbol;
  const url = new URL(`https://api.polygon.io/v2/snapshot/locale/${crypto ? 'global/markets/crypto' : 'us/markets/stocks'}/tickers/${ticker}`);
  url.searchParams.set('apiKey', key);
  const d = await get(url, 'polygon');
  const stamp = Number(d?.ticker?.lastTrade?.t);
  const millis = stamp > 1e17 ? Math.floor(stamp / 1e6) : stamp > 1e14 ? Math.floor(stamp / 1e3) : stamp;
  return d?.ticker?.ticker === ticker ? observation(symbol, 'polygon', d.ticker.lastTrade?.p, millis, 'USD', 'rest', d) : null;
}

export async function quote(symbol) {
  if (!quotesEnabled) return [503, { error: 'pipeline_disabled', symbol }];
  if (!allowed.has(symbol)) return [400, { error: 'unsupported_symbol' }];
  const cached = await infrastructure.read(symbol);
  if (cached) return [200, cached];
  if (pending.has(symbol)) return pending.get(symbol);
  if ((failedUntil.get(symbol) || 0) > Date.now()) return [503, { error: 'market_data_unavailable', symbol }];
  const request = fallbackQuote(symbol);
  pending.set(symbol, request);
  try { return await request; } finally { pending.delete(symbol); }
}

async function fallbackQuote(symbol) {
  // USDT and USD are distinct instruments: never substitute one quote currency for the other.
  if (infrastructure.status().status !== 'connected') return [503, { error: 'infrastructure_unavailable', symbol }];
  const publicQuote = await krakenTrades(symbol);
  if (publicQuote) { const confirmed = await accept(publicQuote); if (confirmed) return [200, confirmed]; }
  const primaryFallback = await twelve(symbol);
  const fallback = primaryFallback && isFresh(primaryFallback.fact) ? primaryFallback : await polygon(symbol);
  if (fallback && isFresh(fallback.fact)) { const confirmed = await accept(fallback); if (confirmed) return [200, confirmed]; }
  failedUntil.set(symbol, Date.now() + 5000);
  return [503, { error: 'market_data_unavailable', symbol }];
}
export function health() { return { status: 'ok', ingress: 'fail_closed', symbols: [...allowed], quotesEnabled, infrastructure: infrastructure.status() }; }
