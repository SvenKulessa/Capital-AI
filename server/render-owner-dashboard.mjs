// CAPITAL_AI_RENDER_OWNER_DASHBOARD@1
// Strictly owner-private, opt-in read-only provider probes. No secret or price publication.
import { boundedJson } from './http-security.mjs';
import { verifyMassiveKey } from './private-market-batch.mjs';
import { krakenKeyInfo } from './user-provider-vault.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COOLDOWN_MS = 60_000;
const PATH = '/api/profile/render-owner-dashboard';
const SAMPLES = Object.freeze({
  'X:BTCUSD': 'Krypto: BTC / USD (Vortag)',
  AAPL: 'Aktie: AAPL (Vortag)',
  'C:EURUSD': 'Forex: EUR / USD (Vortag)',
});

const PROVIDER_BINDINGS = Object.freeze([
  { id: 'kraken', label: 'Kraken', pairs: [['KRAKEN_API_KEY', 'KRAKEN_API_SECRET'], ['KRAKEN_SPOT_API_KEY', 'KRAKEN_SPOT_API_SECRET']], probe: true },
  { id: 'massive', label: 'Massive / Polygon', keys: ['MASSIVE_API_KEY', 'POLYGON_API_KEY', 'POLYGON_MASSIVE_API_KEY'], probe: true },
  { id: 'binance', label: 'Binance', pairs: [['BINANCE_API_KEY', 'BINANCE_API_SECRET']], probe: false },
  { id: 'alpaca', label: 'Alpaca', pairs: [['ALPACA_API_KEY', 'ALPACA_SECRET_KEY']], probe: false },
  { id: 'coingecko', label: 'CoinGecko', keys: ['COINGECKO_API_KEY'], probe: false },
  { id: 'coinmarketcap', label: 'CoinMarketCap', keys: ['COINMARKETCAP_API_KEY'], probe: false },
  { id: 'finnhub', label: 'Finnhub', keys: ['FINNHUB_API_KEY'], probe: false },
  { id: 'twelve_data', label: 'Twelve Data', keys: ['TWELVE_DATA_API_KEY', 'TWELVEDATA_API_KEY'], probe: false },
  { id: 'alpha_vantage', label: 'Alpha Vantage', keys: ['ALPHA_VANTAGE_API_KEY'], probe: false },
  { id: 'fred', label: 'FRED', keys: ['FRED_API_KEY'], probe: false },
  { id: 'eodhd', label: 'EODHD', keys: ['EODHD_API_KEY'], probe: false },
]);

function configuredValue(env, names) {
  for (const name of names || []) {
    if (typeof env[name] === 'string' && env[name].trim()) return env[name].trim();
  }
  return null;
}

function credentialsFor(env, provider) {
  if (provider.pairs) {
    for (const [keyName, secretName] of provider.pairs) {
      const apiKey = configuredValue(env, [keyName]);
      const apiSecret = configuredValue(env, [secretName]);
      if (apiKey && apiSecret) return { apiKey, apiSecret };
    }
    return null;
  }
  const apiKey = configuredValue(env, provider.keys);
  return apiKey ? { apiKey } : null;
}

async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk);
    if (size > 1024) throw new Error('BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  const parsed = JSON.parse(Buffer.concat(chunks.map(value => Buffer.from(value))).toString('utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('INVALID_BODY');
  return parsed;
}

function safePrice(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

export function createRenderOwnerDashboard({ env = process.env, auth, fetchImpl = fetch, now = Date.now } = {}) {
  const ownerId = String(env.CAPITAL_AI_RENDER_OWNER_USER_ID || '').trim();
  const ownerEmail = String(env.CAPITAL_AI_RENDER_OWNER_EMAIL || '').trim().toLowerCase();
  const ownerConfigured = UUID.test(ownerId) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail);
  const lastProbe = new Map();

  async function authorized(req, res) {
    if (!ownerConfigured) return false;
    const user = await auth?.verify?.(req, res);
    if (!user?.userId || user.userId !== ownerId ||
        user.emailVerified !== true || String(user.email || '').trim().toLowerCase() !== ownerEmail) return false;
    return await auth?.authorizeIamRole?.(req, res, 'owner') === true;
  }

  function projection() {
    return PROVIDER_BINDINGS.map(provider => ({
      id: provider.id,
      label: provider.label,
      status: credentialsFor(env, provider) ? 'CONFIGURED_UNVERIFIED' : 'NOT_CONFIGURED',
      verificationAvailable: provider.probe,
    }));
  }

  async function handle(req, res, url, json) {
    if (url.pathname !== PATH && url.pathname !== PATH + '/probe' && url.pathname !== PATH + '/sample') return false;
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Vary', 'Cookie');
    if (!await authorized(req, res)) { json(res, 404, { error: 'not_found' }); return true; }

    if (url.pathname === PATH) {
      if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); json(res, 405, { error: 'method_not_allowed' }); return true; }
      json(res, 200, {
        schema: 'CAPITAL_AI_RENDER_OWNER_DASHBOARD@1',
        private: true,
        executionEnabled: false,
        providers: projection(),
        sampleSymbols: Object.entries(SAMPLES).map(([symbol, label]) => ({ symbol, label })),
      });
      return true;
    }

    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); json(res, 405, { error: 'method_not_allowed' }); return true; }
    if (!auth.sameOrigin(req)) { json(res, 403, { error: 'forbidden_origin' }); return true; }

    let input;
    try { input = await readBody(req); }
    catch { json(res, 400, { error: 'invalid_request' }); return true; }
    const provider = PROVIDER_BINDINGS.find(item => item.id === input.provider && item.probe);
    if (!provider || (url.pathname === PATH + '/sample' && provider.id !== 'massive')) {
      json(res, 422, { error: 'unsupported_read_only_operation' }); return true;
    }
    if (url.pathname === PATH + '/sample' && !Object.hasOwn(SAMPLES, input.symbol)) {
      json(res, 422, { error: 'unsupported_symbol' }); return true;
    }

    const credentials = credentialsFor(env, provider);
    if (!credentials) { json(res, 503, { error: 'provider_credentials_not_configured' }); return true; }
    const rateKey = provider.id + ':' + (url.pathname.endsWith('/sample') ? 'sample' : 'probe');
    const timestamp = now();
    if (timestamp - (lastProbe.get(rateKey) || 0) < COOLDOWN_MS) {
      res.setHeader('Retry-After', '60');
      json(res, 429, { error: 'readback_rate_limited' }); return true;
    }
    lastProbe.set(rateKey, timestamp);

    try {
      if (url.pathname.endsWith('/probe')) {
        if (provider.id === 'massive') await verifyMassiveKey({ token: credentials.apiKey, fetchImpl });
        else {
          const checked = await krakenKeyInfo(fetchImpl, credentials);
          if (checked.capabilities?.forbiddenPermissions?.length) throw new Error('UNSAFE_KEY_PERMISSIONS');
        }
        json(res, 200, {
          provider: provider.id, status: 'REFERENCE_VERIFIED',
          readOnly: true, marketDataEntitlement: 'NOT_PROVEN', checkedAt: new Date(timestamp).toISOString(),
        });
        return true;
      }

      // Only explicitly allowlisted previous-day bars, never the provider's raw response.
      const endpoint = new URL('/v2/aggs/ticker/' + encodeURIComponent(input.symbol) + '/prev', 'https://api.massive.com');
      const response = await fetchImpl(endpoint, {
        method: 'GET', redirect: 'error', signal: AbortSignal.timeout(4000),
        headers: { Accept: 'application/json', Authorization: 'Bearer ' + credentials.apiKey },
      });
      const payload = await boundedJson(response, 16384);
      const bar = payload?.results?.[0];
      if (!response.ok || payload?.status !== 'OK' || !bar ||
          !safePrice(bar.c) || !Number.isSafeInteger(bar.t) || bar.t <= 0) throw new Error('INVALID_MARKET_READBACK');
      json(res, 200, {
        provider: 'massive', symbol: input.symbol, close: bar.c,
        open: safePrice(bar.o), high: safePrice(bar.h), low: safePrice(bar.l),
        observedAt: new Date(bar.t).toISOString(), checkedAt: new Date(timestamp).toISOString(),
        timeSemantics: 'previous_day', dataScope: 'OWNER_PRIVATE', publicDisplayAllowed: false,
        scoreEligible: false, tradingEnabled: false,
      });
    } catch {
      json(res, 502, { error: 'provider_readback_not_verified' });
    }
    return true;
  }

  return { authorized, handle };
}
