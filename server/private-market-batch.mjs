// SPDX-License-Identifier: MIT
// User-private REST batches. Does not publish market facts or grant data rights.
import { boundedJson } from './http-security.mjs';
export const PRIVATE_MARKET_CLASSES = Object.freeze(['KRYPTO', 'AKTIEN', 'INDIZIES', 'FOREX', 'ROHSTOFFE']);
export const PRIVATE_MARKET_TARGET = 50;
const MASSIVE_MARKETS = Object.freeze({ AKTIEN: 'stocks', INDIZIES: 'indices', FOREX: 'fx' });
const validId = v => typeof v === 'string' && /^[A-Za-z0-9_.:/-]{1,64}$/.test(v);
const positive = v => typeof v === 'number' && Number.isFinite(v) && v > 0;
const currency = v => typeof v === 'string' && /^[A-Z]{3}$/.test(v);
function assert(ok, code) { if (!ok) throw new Error(code); }
function timestamp(ns) {
  // Provider timestamps are ns; divide before checking safe integer ms.
  const ms = Math.floor(Number(ns) / 1e6);
  return Number.isSafeInteger(ms) && ms > 0 ? ms : null;
}
function result(provider, category, assets, receivedAt, discovered, requests) {
  assert(Number.isSafeInteger(receivedAt) && receivedAt > 0, 'PRIVATE_MARKET_INVALID_TIME');
  return Object.freeze({ provider, category, target: PRIVATE_MARKET_TARGET,
    status: assets.length === PRIVATE_MARKET_TARGET ? 'TARGET_RETURNED' : 'BELOW_TARGET',
    returned: assets.length, shortfall: PRIVATE_MARKET_TARGET - assets.length, discovered,
    assets, receivedAt, expiresAt: receivedAt + 30000, upstreamRequests: requests,
    dataScope: 'USER_PRIVATE_MARKET_DATA', publicDisplayAllowed: false,
    redistributionAllowed: false, sharedCacheAllowed: false,
    jetStreamPublicationAllowed: false, actionable: false, scoreEligible: false });
}
async function request(url, { token, fetchImpl, signal, consume, maxBytes = 524288 }) {
  if (consume) await consume();
  let res;
  try { res = await fetchImpl(url, { method: 'GET', redirect: 'error', signal,
    headers: { Accept: 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) } }); }
  catch { throw new Error('PRIVATE_MARKET_UPSTREAM_UNAVAILABLE'); }
  if (res.status === 429) { await res.body?.cancel(); throw new Error('PRIVATE_MARKET_PROVIDER_RATE_LIMITED'); }
  if (res.status === 401 || res.status === 403) { await res.body?.cancel(); throw new Error('PRIVATE_MARKET_ENTITLEMENT_REQUIRED'); }
  try { return await boundedJson(res, maxBytes); }
  catch { throw new Error('PRIVATE_MARKET_UPSTREAM_INVALID'); }
}
function massiveUrl(path, params) {
  const url = new URL(path, 'https://api.massive.com');
  url.search = new URLSearchParams(params).toString(); return url;
}
function rows(body) {
  assert(body?.status === 'OK' && Array.isArray(body.results), 'PRIVATE_MARKET_PROVIDER_ERROR');
  return body.results;
}
export async function verifyMassiveKey({ token, fetchImpl = fetch, consume }) {
  assert(typeof token === 'string' && /^[A-Za-z0-9_-]{8,512}$/.test(token), 'MASSIVE_INVALID_KEY');
  const body = await request(massiveUrl('/v3/reference/tickers', { limit: '1', active: 'true' }),
    { token, fetchImpl, consume, signal: AbortSignal.timeout(2500) });
  rows(body); // Key works for reference data; never infer snapshot entitlements from this.
  return { referenceVerified: true, snapshotEntitlements: 'NOT_PROVEN', trading: false };
}

export async function fetchMassiveClass({ category, token, fetchImpl = fetch, now = Date.now, consume }) {
  assert(Object.hasOwn(MASSIVE_MARKETS, category) || category === 'ROHSTOFFE', 'PRIVATE_MARKET_CLASS_UNSUPPORTED');
  assert(typeof token === 'string' && /^[A-Za-z0-9_-]{8,512}$/.test(token), 'MASSIVE_INVALID_KEY');
  const signal = AbortSignal.timeout(4500);
  let instruments, snapshot, requests;
  if (category === 'ROHSTOFFE') {
    const products = rows(await request(massiveUrl('/futures/v1/products', {
      asset_class: 'commodity', type: 'single', limit: '50', sort: 'product_code.asc',
    }), { token, fetchImpl, signal, consume })).filter(p => p.asset_class === 'commodity'
      && p.type === 'single' && validId(p.product_code) && currency(p.trade_currency_code));
    const productMap = new Map(products.map(p => [p.product_code, p]));
    if (!productMap.size) return result('massive', category, [], now(), 0, 1);
    instruments = rows(await request(massiveUrl('/futures/v1/contracts', {
      'product_code.any_of': [...productMap.keys()].join(','), active: 'true', type: 'single',
      limit: '50', sort: 'ticker.asc',
    }), { token, fetchImpl, signal, consume })).filter(c => c.active === true && c.type === 'single'
      && validId(c.ticker) && productMap.has(c.product_code))
      .map(c => ({ ...c, market: 'futures', currency_symbol: productMap.get(c.product_code).trade_currency_code,
        priceUnit: String(productMap.get(c.product_code).price_quotation || '').slice(0, 160) }));
    requests = 2;
  } else {
    const market = MASSIVE_MARKETS[category];
    instruments = rows(await request(massiveUrl('/v3/reference/tickers', {
      market, active: 'true', limit: '50', sort: 'ticker', order: 'asc',
      ...(category === 'AKTIEN' ? { type: 'CS' } : {}),
    }), { token, fetchImpl, signal, consume })).filter(t => t.active === true && t.market === market
      && validId(t.ticker) && (category !== 'AKTIEN' || t.type === 'CS')
      && (market !== 'fx' || /^C:[A-Z]{6}$/.test(t.ticker))
      && (market !== 'indices' || t.ticker.startsWith('I:')));
    requests = 1;
  }
  const selected = [...new Map(instruments.map(i => [i.ticker, i])).values()].slice(0, 50);
  if (!selected.length) return result('massive', category, [], now(), 0, requests);
  snapshot = rows(await request(massiveUrl(category === 'ROHSTOFFE' ? '/futures/v1/snapshot'
    : category === 'INDIZIES' ? '/v3/snapshot/indices' : '/v3/snapshot', {
    'ticker.any_of': selected.map(i => i.ticker).join(','), limit: '50',
    sort: category === 'ROHSTOFFE' ? 'ticker.asc' : 'ticker',
    ...(category !== 'ROHSTOFFE' ? { order: 'asc' } : {}),
  }), { token, fetchImpl, signal, consume }));
  const byTicker = new Map(selected.map(i => [i.ticker, i]));
  const receivedAt = now(), assets = [], seen = new Set();
  for (const row of snapshot) {
    const instrument = byTicker.get(row?.ticker);
    if (!instrument || seen.has(row.ticker) || row.error || row.message
      || category !== 'ROHSTOFFE' && row.type !== MASSIVE_MARKETS[category]
      || category === 'ROHSTOFFE' && row.product_code !== instrument.product_code) continue;
    const price = category === 'INDIZIES' ? row.value
      : category === 'ROHSTOFFE' ? row.last_trade?.price : row.session?.price;
    const observedAt = timestamp(category === 'INDIZIES' ? row.last_updated
      : category === 'ROHSTOFFE' ? row.last_trade?.last_updated : row.session?.last_updated);
    const quote = category === 'INDIZIES' ? null : category === 'FOREX' ? row.ticker.slice(-3)
      : String(instrument.currency_symbol || '').toUpperCase();
    // Overnight / weekend snapshots can be old; keep provider time and never label them live.
    if (!positive(price) || !observedAt || observedAt > receivedAt + 5000
      || receivedAt - observedAt > 8 * 86400000 || category !== 'INDIZIES' && !currency(quote)) continue;
    seen.add(row.ticker);
    assets.push({ symbol: row.ticker, name: String(instrument.name || row.ticker).slice(0, 160),
      category, provider: 'massive', price, quote, observedAt, receivedAt, mode: 'rest',
      timeSemantics: (category === 'INDIZIES' ? row.timeframe : category === 'ROHSTOFFE'
        ? row.last_trade?.timeframe : undefined) === 'REAL-TIME' ? 'realtime'
        : (category === 'INDIZIES' ? row.timeframe : category === 'ROHSTOFFE'
          ? row.last_trade?.timeframe : undefined) === 'DELAYED' ? 'delayed' : 'provider_snapshot',
      instrumentType: category === 'ROHSTOFFE' ? 'commodity_future' : MASSIVE_MARKETS[category],
      ...(category === 'ROHSTOFFE' ? { productCode: instrument.product_code,
        settlementDate: instrument.settlement_date || null, priceUnit: instrument.priceUnit } : {}),
      dataScope: 'USER_PRIVATE_MARKET_DATA' });
    if (assets.length === 50) break;
  }
  return result('massive', category, assets, receivedAt, selected.length, requests + 1);
}

export async function fetchKrakenClass({ category, fetchImpl = fetch, now = Date.now, consume }) {
  assert(category === 'KRYPTO', 'PRIVATE_MARKET_CLASS_UNSUPPORTED');
  const signal = AbortSignal.timeout(4500);
  const pairs = await request(new URL('https://api.kraken.com/0/public/AssetPairs?aclass_base=currency'), { fetchImpl, signal, consume, maxBytes: 2097152 });
  assert(Array.isArray(pairs.error) && pairs.error.length === 0 && pairs.result
    && typeof pairs.result === 'object', 'PRIVATE_MARKET_PROVIDER_ERROR');
  const seenBases = new Set();
  const selected = Object.entries(pairs.result).sort(([a], [b]) => a.localeCompare(b)).filter(([, p]) => {
    if (p?.quote !== 'ZUSD' && p?.quote !== 'USD' || p?.status !== 'online'
      || p?.aclass_base !== 'currency' || !validId(p?.altname) || !validId(p?.wsname)
      || !validId(p?.base) || ['ZUSD','ZEUR','ZGBP','ZJPY','ZCAD','ZAUD','ZCHF','USD','EUR','GBP','JPY','CAD','AUD','CHF'].includes(p.base) || seenBases.has(p.base) || p.altname.endsWith('.d')) return false;
    seenBases.add(p.base); return true;
  }).slice(0, 50);
  if (!selected.length) return result('kraken', category, [], now(), 0, 1);
  const url = new URL('https://api.kraken.com/0/public/Ticker');
  url.searchParams.set('pair', selected.map(([, p]) => p.altname).join(','));
  const ticks = await request(url, { fetchImpl, signal, consume });
  assert(Array.isArray(ticks.error) && ticks.error.length === 0 && ticks.result,
    'PRIVATE_MARKET_PROVIDER_ERROR');
  const receivedAt = now();
  const assets = selected.flatMap(([id, p]) => {
    const price = Number(ticks.result[id]?.c?.[0]);
    return positive(price) ? [{ symbol: p.wsname, provider: 'kraken', category,
      name: p.wsname, price, quote: 'USD', observedAt: null, receivedAt,
      timeSemantics: 'provider_snapshot', timestampSource: 'receipt_only', mode: 'rest',
      instrumentType: 'crypto_pair', dataScope: 'USER_PRIVATE_MARKET_DATA' }] : [];
  });
  // Ticker has no exchange timestamp. Never substitute receivedAt as observedAt.
  return result('kraken', category, assets, receivedAt, selected.length, 2);
}
