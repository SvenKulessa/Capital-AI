// No network I/O during the build. Market observations remain unavailable until verified.
const allowed = new Set((process.env.MARKET_SYMBOLS || 'BTCUSDT,BTCUSD,AAPL').split(',').map(x => x.trim()).filter(Boolean));
const observations = new Map();
const throttledUntil = new Map();
const pending = new Map();
const failedUntil = new Map();
const fresh = x => x && Date.now() - x.observedAt >= 0 && Date.now() - x.observedAt < 30_000;

function observation(symbol, provider, price, time, quote, mode) {
  const p = Number(price), t = Number(time);
  if (!allowed.has(symbol) || !Number.isFinite(p) || p <= 0 || !Number.isFinite(t) || t <= 0 || t > Date.now() + 10_000) return null;
  return { symbol, provider, price: p, quote, observedAt: t, receivedAt: Date.now(), mode, isDemo: false };
}
function accept(value) { if (value && (!observations.has(value.symbol) || observations.get(value.symbol).observedAt <= value.observedAt)) observations.set(value.symbol, value); }

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
  if (allowed.has('BTCUSDT')) stops.push(stream('wss://stream.binance.com:9443/ws/btcusdt@ticker', d => d.s === 'BTCUSDT' ? observation('BTCUSDT', 'binance', d.c, d.E, 'USDT', 'websocket') : null));
  if (allowed.has('BTCUSD')) stops.push(stream('wss://ws.kraken.com/v2', d => {
    const tick = d.channel === 'ticker' && d.type === 'update' && d.data?.[0];
    return tick?.symbol === 'BTC/USD' ? observation('BTCUSD', 'kraken', tick.last, Date.parse(tick.timestamp), 'USD', 'websocket') : null;
  }, ws => ws.send(JSON.stringify({ method: 'subscribe', params: { channel: 'ticker', symbol: ['BTC/USD'] } }))));
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

async function twelve(symbol) {
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key || symbol === 'BTCUSDT') return null;
  const name = symbol === 'BTCUSD' ? 'BTC/USD' : symbol;
  const url = new URL('https://api.twelvedata.com/quote');
  url.searchParams.set('symbol', name); url.searchParams.set('apikey', key);
  const d = await get(url, 'twelvedata');
  return d?.symbol === name && d.status !== 'error' ? observation(symbol, 'twelvedata', d.close, Date.parse(d.last_update_at || d.datetime || ''), 'USD', 'rest') : null;
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
  return d?.ticker?.ticker === ticker ? observation(symbol, 'polygon', d.ticker.lastTrade?.p, millis, 'USD', 'rest') : null;
}

export async function quote(symbol) {
  if (!allowed.has(symbol)) return [400, { error: 'unsupported_symbol' }];
  const cached = observations.get(symbol);
  if (fresh(cached)) return [200, cached];
  if (pending.has(symbol)) return pending.get(symbol);
  if ((failedUntil.get(symbol) || 0) > Date.now()) return [503, { error: 'market_data_unavailable', symbol }];
  const request = fallbackQuote(symbol);
  pending.set(symbol, request);
  try { return await request; } finally { pending.delete(symbol); }
}

async function fallbackQuote(symbol) {
  // USDT and USD are distinct instruments: never substitute one quote currency for the other.
  const primaryFallback = await twelve(symbol);
  const fallback = fresh(primaryFallback) ? primaryFallback : await polygon(symbol);
  if (fresh(fallback)) { accept(fallback); return [200, fallback]; }
  failedUntil.set(symbol, Date.now() + 5000);
  return [503, { error: 'market_data_unavailable', symbol }];
}
export function health() { return { status: 'ok', ingress: 'fail_closed', symbols: [...allowed] }; }
