import { createHash, createHmac } from 'node:crypto';
import { boundedJson, secureUrl } from './http-security.mjs';


const MAX_BODY_BYTES = 16 * 1024;
const KRAKEN_BALANCE_PATH = '/0/private/Balance';
const KRAKEN_API_KEY_INFO_PATH = '/0/private/GetApiKeyInfo';
const KRAKEN_FUTURES_KEY_INFO_PATH = '/api/auth/v1/api-keys/v3/check';
const KRAKEN_SPOT_QUERY_PATHS = Object.freeze({
  'account.key_info': '/0/private/GetApiKeyInfo',
  'account.balance': '/0/private/Balance',
  'account.trade_balance': '/0/private/TradeBalance',
  'orders.open': '/0/private/OpenOrders',
  'orders.closed': '/0/private/ClosedOrders',
  'orders.query': '/0/private/QueryOrders',
  'trades.history': '/0/private/TradesHistory',
  'trades.query': '/0/private/QueryTrades',
  'positions.open': '/0/private/OpenPositions',
  'ledgers.list': '/0/private/Ledgers',
  'ledgers.query': '/0/private/QueryLedgers',
  'trade.volume': '/0/private/TradeVolume',
});
const KRAKEN_FUTURES_QUERY_PATHS = Object.freeze({
  'futures.account': '/derivatives/api/v3/accounts',
  'futures.open_positions': '/derivatives/api/v3/openpositions',
  'futures.open_orders': '/derivatives/api/v3/openorders',
  'futures.fills': '/derivatives/api/v3/fills',
  'futures.position_events': '/api/history/v3/positions',
});
const BINANCE_QUERY_PATHS = Object.freeze({
  'account.permissions': ['https://api.binance.com', '/sapi/v1/account/apiRestrictions'],
  'account.info': ['https://api.binance.com', '/sapi/v1/account/info'],
  'account.status': ['https://api.binance.com', '/sapi/v1/account/status'],
  'account.snapshot': ['https://api.binance.com', '/sapi/v1/accountSnapshot'],
  'spot.account': ['https://api.binance.com', '/api/v3/account'],
  'spot.open_orders': ['https://api.binance.com', '/api/v3/openOrders'],
  'spot.all_orders': ['https://api.binance.com', '/api/v3/allOrders'],
  'spot.my_trades': ['https://api.binance.com', '/api/v3/myTrades'],
  'futures.account': ['https://fapi.binance.com', '/fapi/v3/account'],
  'futures.balance': ['https://fapi.binance.com', '/fapi/v3/balance'],
  'futures.position_risk': ['https://fapi.binance.com', '/fapi/v3/positionRisk'],
  'futures.open_orders': ['https://fapi.binance.com', '/fapi/v1/openOrders'],
  'futures.all_orders': ['https://fapi.binance.com', '/fapi/v1/allOrders'],
  'futures.user_trades': ['https://fapi.binance.com', '/fapi/v1/userTrades'],
  'futures.income': ['https://fapi.binance.com', '/fapi/v1/income'],
});
let lastKrakenNonce = 0n;

const KRAKEN_FORBIDDEN_FUNDING_PERMISSIONS = new Set([
  'add-funds',
  'withdraw-funds',
  'earn-funds',
  'add-withdraw-address',
  'update-withdraw-address',
]);

function serviceRoleJwt(key) {
  if (!key.startsWith('eyJ')) return false;
  const parts = key.split('.');
  if (parts.length !== 3) return false;
  try {
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return claims?.role === 'service_role';
  } catch {
    return false;
  }
}

function adminConfig(env) {
  try {
    const url = secureUrl(env.SUPABASE_URL || env.VITE_SUPABASE_URL);
    const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
    const fingerprintKey = env.AUTH_COOKIE_SIGNING_SECRET || '';
    const supportedAdminKey = key.startsWith('sb_secret_') || serviceRoleJwt(key);
    if (url.href !== url.origin + '/' || !supportedAdminKey || fingerprintKey.length < 32) return null;
    return { url: url.origin, key, fingerprintKey };
  } catch {
    return null;
  }
}

async function readJson(req) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > MAX_BODY_BYTES) throw new Error('REQUEST_TOO_LARGE');
    chunks.push(chunk);
  }
  try {
    return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
  } catch {
    throw new Error('INVALID_JSON');
  }
}

function normalizeCredential(value, min, max) {
  return typeof value === 'string' && value.trim().length >= min && value.trim().length <= max
    ? value.trim()
    : '';
}

function rpcHeaders(key) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    apikey: key,
  };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  return headers;
}

async function rpc(fetchImpl, config, name, body) {
  const response = await fetchImpl(new URL(`/rest/v1/rpc/${name}`, config.url), {
    method: 'POST',
    headers: rpcHeaders(config.key),
    body: JSON.stringify(body),
    redirect: 'error',
    signal: AbortSignal.timeout(7000),
  });
  let payload = null;
  if (response.status !== 204) {
    try { payload = await boundedJson(response); } catch { payload = null; }
  }
  if (!response.ok) {
    const error = new Error('SUPABASE_RPC_FAILED');
    error.status = response.status;
    throw error;
  }
  return payload;
}

export function krakenSignature(urlPath, payload, apiSecret) {
  const encoded = new URLSearchParams(payload).toString();
  const nonce = String(payload.nonce || '');
  const digest = createHash('sha256').update(nonce + encoded).digest();
  const message = Buffer.concat([Buffer.from(urlPath, 'utf8'), digest]);
  return createHmac('sha512', Buffer.from(apiSecret, 'base64')).update(message).digest('base64');
}

export function krakenFuturesSignature(endpointPath, postData, nonce, apiSecret) {
  const digest = createHash('sha256')
    .update(String(postData || '') + String(nonce || '') + endpointPath)
    .digest();
  return createHmac('sha512', Buffer.from(apiSecret, 'base64')).update(digest).digest('base64');
}

export function nextKrakenNonce() {
  const now = BigInt(Date.now());
  lastKrakenNonce = now > lastKrakenNonce ? now : lastKrakenNonce + 1n;
  return String(lastKrakenNonce);
}

async function krakenPrivatePost(fetchImpl, path, { apiKey, apiSecret }, params = {}, timeoutMs = 7000) {
  const nonce = nextKrakenNonce();
  const form = { nonce, ...params };
  const body = new URLSearchParams(form).toString();
  const signature = krakenSignature(path, form, apiSecret);
  const response = await fetchImpl(new URL(path, 'https://api.kraken.com'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'API-Key': apiKey,
      'API-Sign': signature,
    },
    body,
    redirect: 'error',
    signal: AbortSignal.timeout(timeoutMs),
  });
  const payload = await boundedJson(response);
  if (!response.ok || !Array.isArray(payload?.error) || payload.error.length > 0 || typeof payload?.result !== 'object') {
    const code = Array.isArray(payload?.error) && payload.error.length
      ? String(payload.error[0]).slice(0, 120)
      : `HTTP_${response.status}`;
    const error = new Error('KRAKEN_VERIFICATION_FAILED');
    error.code = code;
    throw error;
  }
  return payload.result;
}

function krakenSpotCapabilities(info) {
  const permissions = Array.isArray(info?.permissions)
    ? info.permissions.filter(value => typeof value === 'string').map(value => value.slice(0, 80))
    : [];
  const forbiddenPermissions = permissions.filter(permission => KRAKEN_FORBIDDEN_FUNDING_PERMISSIONS.has(permission));
  return {
    permissions,
    fundsQuery: permissions.includes('query-funds'),
    websocketToken: permissions.includes('create-ws-token'),
    orderCreate: permissions.includes('modify-trades'),
    orderCancel: permissions.includes('close-trades'),
    trading: permissions.includes('modify-trades') || permissions.includes('close-trades'),
    forbiddenPermissions,
  };
}

async function krakenKeyInfo(fetchImpl, credentials, timeoutMs = 7000) {
  const result = await krakenPrivatePost(fetchImpl, KRAKEN_API_KEY_INFO_PATH, credentials, {}, timeoutMs);
  return { info: result, capabilities: krakenSpotCapabilities(result) };
}

async function krakenBalance(fetchImpl, credentials) {
  return krakenPrivatePost(fetchImpl, KRAKEN_BALANCE_PATH, credentials);
}

async function krakenFuturesKeyInfo(fetchImpl, { apiKey, apiSecret }) {
  const nonce = nextKrakenNonce();
  const authent = krakenFuturesSignature(KRAKEN_FUTURES_KEY_INFO_PATH, '', nonce, apiSecret);
  const response = await fetchImpl(new URL(KRAKEN_FUTURES_KEY_INFO_PATH, 'https://futures.kraken.com'), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      APIKey: apiKey,
      Authent: authent,
      Nonce: nonce,
    },
    redirect: 'error',
    signal: AbortSignal.timeout(7000),
  });
  const payload = await boundedJson(response);
  if (!response.ok) {
    const error = new Error('KRAKEN_FUTURES_VERIFICATION_FAILED');
    error.code = `HTTP_${response.status}`;
    throw error;
  }
  const permissions = payload?.apiKey?.permissions || payload?.result?.permissions || payload?.permissions;
  const general = String(permissions?.general || 'NO_ACCESS').toUpperCase();
  const transfer = String(permissions?.transfer || 'NO_ACCESS').toUpperCase();
  if (!['NO_ACCESS', 'READ_ONLY', 'FULL_ACCESS'].includes(general) ||
      !['NO_ACCESS', 'READ_ONLY', 'FULL_ACCESS'].includes(transfer)) {
    const error = new Error('KRAKEN_FUTURES_VERIFICATION_FAILED');
    error.code = 'INVALID_PERMISSION_READBACK';
    throw error;
  }
  return {
    general,
    transfer,
    configured: general !== 'NO_ACCESS',
    trading: general === 'FULL_ACCESS',
    perpetuals: general !== 'NO_ACCESS',
  };
}

function normalizeProviderParams(params) {
  if (params == null) return {};
  if (!params || typeof params !== 'object' || Array.isArray(params)) throw new Error('INVALID_PROVIDER_QUERY_PARAMS');
  const out = {};
  for (const [key, value] of Object.entries(params)) {
    if (!/^[A-Za-z0-9_.-]{1,40}$/.test(key)) throw new Error('INVALID_PROVIDER_QUERY_PARAM');
    if (!['string', 'number', 'boolean'].includes(typeof value)) throw new Error('INVALID_PROVIDER_QUERY_PARAM');
    if (typeof value === 'string' && value.length > 256) throw new Error('INVALID_PROVIDER_QUERY_PARAM');
    if (typeof value === 'number' && !Number.isSafeInteger(value)) throw new Error('INVALID_PROVIDER_QUERY_PARAM');
    out[key] = value;
  }
  return out;
}

function queryString(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(normalizeProviderParams(params))) query.set(key, String(value));
  return query.toString();
}

async function krakenFuturesPrivateGet(fetchImpl, path, { apiKey, apiSecret }, params = {}) {
  const nonce = nextKrakenNonce();
  const postData = queryString(params);
  const authent = krakenFuturesSignature(path, postData, nonce, apiSecret);
  const url = new URL(path, 'https://futures.kraken.com');
  if (postData) url.search = postData;
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: { Accept: 'application/json', APIKey: apiKey, Authent: authent, Nonce: nonce },
    redirect: 'error',
    signal: AbortSignal.timeout(7000),
  });
  const payload = await boundedJson(response);
  if (!response.ok || payload?.error) {
    const error = new Error('KRAKEN_FUTURES_QUERY_FAILED');
    error.code = payload?.error ? String(payload.error).slice(0, 120) : `HTTP_${response.status}`;
    throw error;
  }
  return payload;
}

export function binanceSignature(query, apiSecret) {
  return createHmac('sha256', apiSecret).update(query).digest('hex');
}

async function binancePrivateGet(fetchImpl, origin, path, { apiKey, apiSecret }, params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(normalizeProviderParams(params))) query.set(key, String(value));
  query.set('recvWindow', '5000');
  query.set('timestamp', String(Date.now()));
  const unsigned = query.toString();
  query.set('signature', binanceSignature(unsigned, apiSecret));
  const url = new URL(path, origin);
  url.search = query.toString();
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: { Accept: 'application/json', 'X-MBX-APIKEY': apiKey },
    redirect: 'error',
    signal: AbortSignal.timeout(7000),
  });
  const payload = await boundedJson(response);
  if (!response.ok || (typeof payload?.code === 'number' && payload.code < 0)) {
    const error = new Error('BINANCE_PRIVATE_QUERY_FAILED');
    error.code = typeof payload?.code === 'number' ? `BINANCE_${payload.code}` : `HTTP_${response.status}`;
    throw error;
  }
  return payload;
}

async function binanceKeyInfo(fetchImpl, credentials) {
  const info = await binancePrivateGet(fetchImpl, 'https://api.binance.com', '/sapi/v1/account/apiRestrictions', credentials);
  const reading = info?.enableReading === true;
  const forbiddenTransfers = info?.enableWithdrawals === true ||
    info?.enableInternalTransfer === true ||
    info?.permitsUniversalTransfer === true;
  const spotTrading = info?.enableSpotAndMarginTrading === true;
  const futures = info?.enableFutures === true;
  const trading = spotTrading || futures || info?.enablePortfolioMarginTrading === true;
  return {
    raw: info,
    reading,
    forbiddenTransfers,
    spotTrading,
    futures,
    trading,
    withdrawals: info?.enableWithdrawals === true,
    internalTransfers: info?.enableInternalTransfer === true,
    universalTransfers: info?.permitsUniversalTransfer === true,
  };
}

function normalizePair(value) {
  const apiKey = normalizeCredential(value?.apiKey, 8, 512);
  const apiSecret = normalizeCredential(value?.apiSecret, 16, 1024);
  return apiKey && apiSecret ? { apiKey, apiSecret } : null;
}

function parseStoredVaultPayload(payload) {
  if (typeof payload !== 'string' || payload.length > 8192) throw new Error('VAULT_SECRET_INVALID');
  let parsed;
  try { parsed = JSON.parse(payload); } catch { throw new Error('VAULT_SECRET_INVALID'); }

  const legacy = normalizePair(parsed);
  if (legacy) return { version: 2, spot: legacy, futures: null };

  const spot = parsed?.spot == null ? null : normalizePair(parsed.spot);
  const futures = parsed?.futures == null ? null : normalizePair(parsed.futures);
  if (parsed?.version !== 2 || (parsed?.spot != null && !spot) || (parsed?.futures != null && !futures)) {
    throw new Error('VAULT_SECRET_INVALID');
  }
  return { version: 2, spot, futures };
}

function emptyVaultPayload() {
  return { version: 2, spot: null, futures: null };
}

function publicBalanceProjection(balance) {
  return Object.entries(balance || {})
    .filter(([asset, value]) => /^[A-Za-z0-9.:-]{1,32}$/.test(asset) && /^-?\d+(?:\.\d+)?$/.test(String(value)))
    .map(([asset, value]) => ({ asset, balance: String(value) }))
    .slice(0, 500);
}

function combinePermissions(spot, futures) {
  const spotState = spot || {};
  const futuresState = futures || {};
  const trading = spotState.trading === true || futuresState.trading === true;
  return {
    fundsQuery: spotState.fundsQuery === true,
    websocketToken: spotState.websocketToken === true,
    trading,
    withdrawals: false,
    spotTrading: spotState.trading === true,
    spotOrderCreate: spotState.orderCreate === true,
    spotOrderCancel: spotState.orderCancel === true,
    futuresConfigured: futuresState.configured === true,
    futuresTrading: futuresState.trading === true,
    perpetuals: futuresState.perpetuals === true,
    futuresAccess: futuresState.general || 'NO_ACCESS',
    orderTypes: trading ? ['market', 'limit'] : [],
    executionEnabled: false,
    publicMarketDataAdmission: false,
    spot: spotState,
    futures: futuresState,
  };
}

function combineBinancePermissions(spot, futures) {
  const spotState = spot || {};
  const futuresState = futures || {};
  return {
    reading: spotState.reading === true || futuresState.reading === true,
    trading: spotState.trading === true || futuresState.trading === true,
    withdrawals: false,
    internalTransfers: false,
    universalTransfers: false,
    spotConfigured: spotState.configured === true,
    spotTrading: spotState.trading === true,
    futuresConfigured: futuresState.configured === true,
    futuresTrading: futuresState.trading === true,
    executionEnabled: false,
    publicMarketDataAdmission: false,
    spot: spotState,
    futures: futuresState,
  };
}

function fingerprintForPayload(config, payload) {
  return createHmac('sha256', config.fingerprintKey)
    .update('capital-ai/byok-fingerprint/v2\0')
    .update(JSON.stringify({
      spot: payload.spot?.apiKey || null,
      futures: payload.futures?.apiKey || null,
    }))
    .digest('hex')
    .slice(0, 24);
}

export function createUserProviderVault({ env = process.env, fetchImpl = fetch, auth, privateMarketCache = null } = {}) {
  const config = adminConfig(env);

  async function requireUser(req, res, json) {
    const verified = await auth?.verify?.(req, res);
    if (!verified?.userId) {
      json(res, 401, { error: 'authentication_required' });
      return null;
    }
    return verified;
  }

  async function markProviderStatus(userId, provider, status, errorCode = null) {
    if (!config) return;
    await rpc(fetchImpl, config, 'capital_ai_mark_user_provider_status', {
      _user_id: userId,
      _provider: provider,
      _status: status,
      _error_code: errorCode,
    });
  }

  async function markStatus(userId, status, errorCode = null) {
    return markProviderStatus(userId, 'kraken', status, errorCode);
  }

  async function readProviderStored(userId, provider) {
    try {
      return await rpc(fetchImpl, config, 'capital_ai_get_user_provider_secret', {
        _user_id: userId,
        _provider: provider,
      });
    } catch (error) {
      if (error?.status === 404) return null;
      throw error;
    }
  }

  async function readStored(userId) {
    return readProviderStored(userId, 'kraken');
  }

  async function readKrakenSpotTradingCredential(userId) {
    if (!config) {
      const error = new Error('PROVIDER_VAULT_NOT_CONFIGURED');
      error.code = 'PROVIDER_VAULT_NOT_CONFIGURED';
      throw error;
    }
    const stored = await readStored(userId);
    if (!stored?.secretPayload) {
      const error = new Error('KRAKEN_SPOT_CONNECTION_NOT_FOUND');
      error.code = 'KRAKEN_SPOT_CONNECTION_NOT_FOUND';
      throw error;
    }
    const vaultPayload = parseStoredVaultPayload(stored.secretPayload);
    if (!vaultPayload.spot) {
      const error = new Error('KRAKEN_SPOT_CONNECTION_NOT_FOUND');
      error.code = 'KRAKEN_SPOT_CONNECTION_NOT_FOUND';
      throw error;
    }
    const verification = await krakenKeyInfo(fetchImpl, vaultPayload.spot);
    if (verification.capabilities.forbiddenPermissions.length > 0) {
      const error = new Error('KRAKEN_FUNDING_OR_WITHDRAWAL_PERMISSIONS_FORBIDDEN');
      error.code = 'KRAKEN_FUNDING_OR_WITHDRAWAL_PERMISSIONS_FORBIDDEN';
      throw error;
    }
    if (stored?.permissions?.spotTrading !== true ||
        stored?.permissions?.spotOrderCreate !== true ||
        verification.capabilities.orderCreate !== true) {
      const error = new Error('KRAKEN_SPOT_ORDER_CREATE_NOT_AUTHORIZED');
      error.code = 'KRAKEN_SPOT_ORDER_CREATE_NOT_AUTHORIZED';
      throw error;
    }
    return {
      credentials: { ...vaultPayload.spot },
      credentialFingerprint: String(stored?.credentialFingerprint || '').slice(0, 64) || null,
      capabilities: {
        orderCreate: true,
        orderCancel: stored?.permissions?.spotOrderCancel === true && verification.capabilities.orderCancel === true,
        withdrawals: false,
      },
    };
  }

  async function executePrivateQuery(userId, provider, operation, params = {}) {
    if (!config) {
      const error = new Error('PROVIDER_VAULT_NOT_CONFIGURED');
      error.code = 'PROVIDER_VAULT_NOT_CONFIGURED';
      throw error;
    }
    if (!['kraken', 'binance', 'massive'].includes(provider)) {
      const error = new Error('UNSUPPORTED_PROVIDER');
      error.code = 'UNSUPPORTED_PROVIDER';
      throw error;
    }
    const stored = await readProviderStored(userId, provider);
    if (!stored?.secretPayload) {
      const error = new Error('PROVIDER_CONNECTION_NOT_FOUND');
      error.code = 'PROVIDER_CONNECTION_NOT_FOUND';
      throw error;
    }
    if (provider === 'massive') {
      if (stored.status !== 'VERIFIED' || stored.permissions?.marketAccessApproved !== true
        || !privateMarketCache) throw new Error('MASSIVE_PRIVATE_ACCESS_REQUIRED');
      let payload;
      try { payload = JSON.parse(stored.secretPayload); } catch { throw new Error('VAULT_SECRET_INVALID'); }
      if (payload?.version !== 3 || typeof payload.apiKey !== 'string') throw new Error('VAULT_SECRET_INVALID');
      const identity = { userId, provider, fingerprint: stored.credentialFingerprint, category: params.category };
      if (operation !== 'market.asset_class_snapshot') throw new Error('OPERATION_NOT_ADMITTED');
      const cached = await privateMarketCache.read(identity);
      if (cached) return cached;
      const { fetchMassiveClass } = await import('./private-market-batch.mjs');
      const data = await fetchMassiveClass({ category: params.category, token: payload.apiKey, fetchImpl,
        consume: () => privateMarketCache.consumeBudget(identity) });
      await privateMarketCache.write(identity, data);
      return data;
    }
    const payload = parseStoredVaultPayload(stored.secretPayload);
    const cleanParams = normalizeProviderParams(params);

    if (provider === 'kraken') {
      if (operation.startsWith('futures.')) {
        if (!payload.futures) {
          const error = new Error('KRAKEN_FUTURES_CONNECTION_NOT_FOUND');
          error.code = 'KRAKEN_FUTURES_CONNECTION_NOT_FOUND';
          throw error;
        }
        const permissions = await krakenFuturesKeyInfo(fetchImpl, payload.futures);
        if (permissions.transfer !== 'NO_ACCESS') {
          const error = new Error('KRAKEN_FUTURES_TRANSFER_PERMISSION_FORBIDDEN');
          error.code = 'KRAKEN_FUTURES_TRANSFER_PERMISSION_FORBIDDEN';
          throw error;
        }
        if (!permissions.configured) {
          const error = new Error('KRAKEN_FUTURES_READ_ACCESS_REQUIRED');
          error.code = 'KRAKEN_FUTURES_READ_ACCESS_REQUIRED';
          throw error;
        }
        const path = KRAKEN_FUTURES_QUERY_PATHS[operation];
        if (!path) {
          const error = new Error('OPERATION_NOT_ADMITTED');
          error.code = 'OPERATION_NOT_ADMITTED';
          throw error;
        }
        return krakenFuturesPrivateGet(fetchImpl, path, payload.futures, cleanParams);
      }

      if (!payload.spot) {
        const error = new Error('KRAKEN_SPOT_CONNECTION_NOT_FOUND');
        error.code = 'KRAKEN_SPOT_CONNECTION_NOT_FOUND';
        throw error;
      }
      const batchIdentity = operation === 'market.asset_class_snapshot'
        ? { userId, provider, fingerprint: stored.credentialFingerprint, category: cleanParams.category } : null;
      if (batchIdentity) {
        if (stored.status !== 'VERIFIED' || !privateMarketCache) throw new Error('PRIVATE_MARKET_ACCESS_REQUIRED');
        await privateMarketCache.consumeBudget(batchIdentity);
      }
      const verification = await krakenKeyInfo(fetchImpl, payload.spot, batchIdentity ? 2500 : 7000);
      if (verification.capabilities.forbiddenPermissions.length > 0) {
        const error = new Error('KRAKEN_FUNDING_OR_WITHDRAWAL_PERMISSIONS_FORBIDDEN');
        error.code = 'KRAKEN_FUNDING_OR_WITHDRAWAL_PERMISSIONS_FORBIDDEN';
        throw error;
      }
      if (operation === 'account.key_info') {
        const info = verification.info || {};
        return {
          info: {
            apiKeyName: typeof info.apiKeyName === 'string' ? info.apiKeyName.slice(0, 160) : null,
            permissions: verification.capabilities.permissions,
            ibanPresent: typeof info.iban === 'string' && info.iban.length > 0,
            validUntil: String(info.validUntil || '0').slice(0, 40),
            queryFrom: String(info.queryFrom || '0').slice(0, 40),
            queryTo: String(info.queryTo || '0').slice(0, 40),
            createdTime: String(info.createdTime || '0').slice(0, 40),
          },
          capabilities: verification.capabilities,
        };
      }
      if (operation === 'market.asset_class_snapshot') {
        const cached = await privateMarketCache.read(batchIdentity);
        if (cached) return cached;
        const { fetchKrakenClass } = await import('./private-market-batch.mjs');
        const data = await fetchKrakenClass({ category: cleanParams.category, fetchImpl,
          consume: () => privateMarketCache.consumeBudget(batchIdentity) });
        await privateMarketCache.write(batchIdentity, data);
        return data;
      }
      if (operation === 'market.spot_trade') {
        const { fetchPrivateUserSpotTrade } = await import('./spot-provider-wire.mjs');
        return fetchPrivateUserSpotTrade({provider:'kraken',symbol:cleanParams.symbol,fetchImpl});
      }
      if (operation === 'market.spot_ws_snapshot') {
        const { fetchPrivateUserSpotWsSnapshot } = await import('./spot-provider-wire.mjs');
        return fetchPrivateUserSpotWsSnapshot({provider:'kraken',symbol:cleanParams.symbol});
      }

      const path = KRAKEN_SPOT_QUERY_PATHS[operation];
      if (!path) {
        const error = new Error('OPERATION_NOT_ADMITTED');
        error.code = 'OPERATION_NOT_ADMITTED';
        throw error;
      }
      return krakenPrivatePost(fetchImpl, path, payload.spot, cleanParams);
    }

    const isFutures = operation.startsWith('futures.');
    const credentials = isFutures ? payload.futures : payload.spot;
    if (!credentials) {
      const error = new Error(isFutures ? 'BINANCE_FUTURES_CONNECTION_NOT_FOUND' : 'BINANCE_SPOT_CONNECTION_NOT_FOUND');
      error.code = error.message;
      throw error;
    }
    const permissions = await binanceKeyInfo(fetchImpl, credentials);
    if (!permissions.reading) {
      const error = new Error('BINANCE_READING_PERMISSION_REQUIRED');
      error.code = 'BINANCE_READING_PERMISSION_REQUIRED';
      throw error;
    }
    if (permissions.forbiddenTransfers) {
      const error = new Error('BINANCE_TRANSFER_OR_WITHDRAWAL_PERMISSION_FORBIDDEN');
      error.code = 'BINANCE_TRANSFER_OR_WITHDRAWAL_PERMISSION_FORBIDDEN';
      throw error;
    }
    if (isFutures && !permissions.futures) {
      const error = new Error('BINANCE_FUTURES_ACCESS_REQUIRED');
      error.code = 'BINANCE_FUTURES_ACCESS_REQUIRED';
      throw error;
    }
    if (operation === 'market.spot_trade') {
      const { fetchPrivateUserSpotTrade } = await import('./spot-provider-wire.mjs');
      return fetchPrivateUserSpotTrade({provider:'binance',symbol:cleanParams.symbol,fetchImpl});
    }
    if (operation === 'market.spot_ws_snapshot') {
      const { fetchPrivateUserSpotWsSnapshot } = await import('./spot-provider-wire.mjs');
      return fetchPrivateUserSpotWsSnapshot({provider:'binance',symbol:cleanParams.symbol});
    }

    const target = BINANCE_QUERY_PATHS[operation];
    if (!target) {
      const error = new Error('OPERATION_NOT_ADMITTED');
      error.code = 'OPERATION_NOT_ADMITTED';
      throw error;
    }
    return binancePrivateGet(fetchImpl, target[0], target[1], credentials, cleanParams);
  }

  async function handle(req, res, url, json) {
    if (!url.pathname.startsWith('/api/profile/provider-connections')) return false;

    if (!config) {
      json(res, 503, { error: 'provider_vault_not_configured' });
      return true;
    }

    const user = await requireUser(req, res, json);
    if (!user) return true;

    if (url.pathname === '/api/profile/provider-connections') {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      try {
        const connections = await rpc(fetchImpl, config, 'capital_ai_list_user_provider_connections', {
          _user_id: user.userId,
        });
        json(res, 200, { connections: Array.isArray(connections) ? connections : [] });
      } catch (error) {
        json(res, 503, {
          error: error?.status === 401
            ? 'provider_vault_admin_credential_rejected'
            : 'provider_vault_unavailable',
        });
      }
      return true;
    }

    if (url.pathname === '/api/profile/provider-connections/massive') {
      if (!['PUT', 'DELETE'].includes(req.method)) {
        res.setHeader('Allow', 'PUT, DELETE'); json(res, 405, { error: 'method_not_allowed' }); return true;
      }
      if (!auth.sameOrigin(req)) { json(res, 403, { error: 'forbidden_origin' }); return true; }
      try {
        if (req.method === 'DELETE') {
          await rpc(fetchImpl, config, 'capital_ai_delete_user_provider_secret', {
            _user_id: user.userId, _provider: 'massive' });
          json(res, 200, { deleted: true, provider: 'massive' }); return true;
        }
        const body = await readJson(req);
        const token = normalizeCredential(body.apiKey, 8, 512);
        if (!/^[A-Za-z0-9_-]{8,512}$/.test(token) || body.marketAccessApproved !== true
          || body.allowTrading === true || body.apiSecret) {
          json(res, 400, { error: 'massive_private_market_consent_required' }); return true;
        }
        if (!privateMarketCache) throw new Error('PRIVATE_MARKET_CACHE_UNAVAILABLE');
        const fingerprint = createHmac('sha256', config.fingerprintKey)
          .update('capital-ai/massive-key/v1\0').update(token).digest('hex').slice(0, 24);
        const { verifyMassiveKey } = await import('./private-market-batch.mjs');
        const capabilities = await verifyMassiveKey({ token, fetchImpl,
          consume: () => privateMarketCache.consumeBudget({ userId: user.userId,
            provider: 'massive', fingerprint, category: 'AKTIEN' }) });
        await rpc(fetchImpl, config, 'capital_ai_upsert_user_provider_secret', {
          _user_id: user.userId, _provider: 'massive',
          _secret_payload: JSON.stringify({ version: 3, apiKey: token }),
          _credential_fingerprint: fingerprint,
          _permissions: { ...capabilities, marketAccessApproved: true,
            privateCacheTtlMs: 30000, executionEnabled: false, publicMarketDataAdmission: false },
        });
        await markProviderStatus(user.userId, 'massive', 'VERIFIED');
        json(res, 200, { provider: 'massive', status: 'VERIFIED', credentialFingerprint: fingerprint,
          dataScope: 'USER_PRIVATE_MARKET_DATA', capabilities, portfolioAvailable: false,
          publicDisplayAllowed: false, redistributionAllowed: false });
      } catch { json(res, 503, { error: 'massive_connection_unavailable' }); }
      return true;
    }

    if (url.pathname === '/api/profile/provider-connections/binance') {
      if (req.method === 'DELETE') {
        if (!auth.sameOrigin(req)) {
          json(res, 403, { error: 'forbidden_origin' });
          return true;
        }
        try {
          await rpc(fetchImpl, config, 'capital_ai_delete_user_provider_secret', {
            _user_id: user.userId,
            _provider: 'binance',
          });
          json(res, 200, { deleted: true, provider: 'binance' });
        } catch {
          json(res, 503, { error: 'provider_connection_delete_failed' });
        }
        return true;
      }

      if (req.method !== 'PUT') {
        res.setHeader('Allow', 'PUT, DELETE');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      if (!auth.sameOrigin(req)) {
        json(res, 403, { error: 'forbidden_origin' });
        return true;
      }

      let body;
      try { body = await readJson(req); }
      catch (error) {
        json(res, error.message === 'REQUEST_TOO_LARGE' ? 413 : 400, { error: 'invalid_request' });
        return true;
      }

      const credentialFamily = body.credentialFamily === 'futures' ? 'futures' : 'spot';
      const allowTrading = body.allowTrading === true;
      const apiKey = normalizeCredential(body.apiKey, 8, 512);
      const apiSecret = normalizeCredential(body.apiSecret, 16, 1024);
      if (!apiKey || !apiSecret) {
        json(res, 400, { error: 'invalid_binance_credentials_format' });
        return true;
      }

      try {
        const credentials = { apiKey, apiSecret };
        const verification = await binanceKeyInfo(fetchImpl, credentials);
        if (!verification.reading) {
          json(res, 422, { provider: 'binance', status: 'REJECTED', error: 'binance_reading_permission_required' });
          return true;
        }
        if (verification.forbiddenTransfers) {
          json(res, 422, {
            provider: 'binance',
            status: 'REJECTED',
            error: 'binance_transfer_or_withdrawal_permission_forbidden',
            withdrawals: verification.withdrawals,
            internalTransfers: verification.internalTransfers,
            universalTransfers: verification.universalTransfers,
          });
          return true;
        }
        if (verification.trading && !allowTrading) {
          json(res, 422, {
            provider: 'binance',
            status: 'REJECTED',
            error: 'binance_trading_permissions_require_opt_in',
          });
          return true;
        }
        if (credentialFamily === 'futures' && !verification.futures) {
          json(res, 422, {
            provider: 'binance',
            status: 'REJECTED',
            error: 'binance_futures_access_required',
          });
          return true;
        }

        const stored = await readProviderStored(user.userId, 'binance');
        const vaultPayload = stored?.secretPayload ? parseStoredVaultPayload(stored.secretPayload) : emptyVaultPayload();
        let spotState = stored?.permissions?.spot || null;
        let futuresState = stored?.permissions?.futures || null;
        const state = {
          configured: true,
          reading: true,
          trading: allowTrading && verification.trading,
          spotTrading: allowTrading && verification.spotTrading,
          futuresAccess: verification.futures,
        };
        if (credentialFamily === 'spot') {
          vaultPayload.spot = credentials;
          spotState = state;
        } else {
          vaultPayload.futures = credentials;
          futuresState = state;
        }

        const permissions = combineBinancePermissions(spotState, futuresState);
        const fingerprint = fingerprintForPayload(config, vaultPayload);
        await rpc(fetchImpl, config, 'capital_ai_upsert_user_provider_secret', {
          _user_id: user.userId,
          _provider: 'binance',
          _secret_payload: JSON.stringify(vaultPayload),
          _credential_fingerprint: fingerprint,
          _permissions: permissions,
        });
        await markProviderStatus(user.userId, 'binance', 'VERIFIED', null);
        json(res, 200, {
          provider: 'binance',
          credentialFamily,
          status: 'VERIFIED',
          credentialFingerprint: fingerprint,
          dataScope: 'USER_PRIVATE_ACCOUNT_DATA',
          redistributionAllowed: false,
          publicDisplayAllowed: false,
          sharedCacheAllowed: false,
          jetStreamPublicationAllowed: false,
          capabilities: permissions,
          executionEnabled: false,
        });
      } catch (error) {
        const code = typeof error?.code === 'string' ? error.code : 'BINANCE_VERIFICATION_FAILED';
        json(res, error?.status ? 503 : 422, {
          provider: 'binance',
          status: 'INVALID',
          error: error?.status === 401 ? 'provider_vault_admin_credential_rejected' : 'binance_verification_failed',
          code,
        });
      }
      return true;
    }

    if (url.pathname === '/api/profile/provider-connections/kraken') {
      if (req.method === 'DELETE') {
        if (!auth.sameOrigin(req)) {
          json(res, 403, { error: 'forbidden_origin' });
          return true;
        }
        try {
          await rpc(fetchImpl, config, 'capital_ai_delete_user_provider_secret', {
            _user_id: user.userId,
            _provider: 'kraken',
          });
          json(res, 200, { deleted: true, provider: 'kraken' });
        } catch {
          json(res, 503, { error: 'provider_connection_delete_failed' });
        }
        return true;
      }

      if (req.method !== 'PUT') {
        res.setHeader('Allow', 'PUT, DELETE');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      if (!auth.sameOrigin(req)) {
        json(res, 403, { error: 'forbidden_origin' });
        return true;
      }

      let body;
      try { body = await readJson(req); }
      catch (error) {
        json(res, error.message === 'REQUEST_TOO_LARGE' ? 413 : 400, { error: 'invalid_request' });
        return true;
      }

      const credentialFamily = body.credentialFamily === 'futures' ? 'futures' : 'spot';
      const allowTrading = body.allowTrading === true;
      const apiKey = normalizeCredential(body.apiKey, 8, 512);
      const apiSecret = normalizeCredential(body.apiSecret, 16, 1024);
      if (!apiKey || !apiSecret) {
        json(res, 400, { error: 'invalid_kraken_credentials_format' });
        return true;
      }

      try {
        const stored = await readStored(user.userId);
        const vaultPayload = stored?.secretPayload
          ? parseStoredVaultPayload(stored.secretPayload)
          : emptyVaultPayload();
        const credentials = { apiKey, apiSecret };
        let spotState = stored?.permissions?.spot || null;
        let futuresState = stored?.permissions?.futures || null;
        let holdings = [];

        if (credentialFamily === 'spot') {
          const verification = await krakenKeyInfo(fetchImpl, credentials);
          const caps = verification.capabilities;
          if (caps.forbiddenPermissions.length > 0) {
            json(res, 422, {
              provider: 'kraken',
              status: 'REJECTED',
              error: 'kraken_funding_or_withdrawal_permissions_forbidden',
              forbiddenPermissions: caps.forbiddenPermissions,
            });
            return true;
          }
          if (caps.trading && !allowTrading) {
            json(res, 422, {
              provider: 'kraken',
              status: 'REJECTED',
              error: 'kraken_spot_trading_requires_opt_in',
            });
            return true;
          }
          if (allowTrading && !caps.orderCreate) {
            json(res, 422, {
              provider: 'kraken',
              status: 'REJECTED',
              error: 'kraken_spot_order_create_permission_missing',
            });
            return true;
          }
          vaultPayload.spot = credentials;
          spotState = {
            configured: true,
            fundsQuery: caps.fundsQuery,
            websocketToken: caps.websocketToken,
            trading: allowTrading && caps.trading,
            orderCreate: allowTrading && caps.orderCreate,
            orderCancel: allowTrading && caps.orderCancel,
          };
          if (caps.fundsQuery) holdings = publicBalanceProjection(await krakenBalance(fetchImpl, credentials));
        } else {
          const caps = await krakenFuturesKeyInfo(fetchImpl, credentials);
          if (caps.transfer !== 'NO_ACCESS') {
            json(res, 422, {
              provider: 'kraken',
              status: 'REJECTED',
              error: 'kraken_futures_transfer_permission_forbidden',
              transferAccess: caps.transfer,
            });
            return true;
          }
          if (caps.trading && !allowTrading) {
            json(res, 422, {
              provider: 'kraken',
              status: 'REJECTED',
              error: 'kraken_futures_trading_requires_opt_in',
            });
            return true;
          }
          if (allowTrading && !caps.trading) {
            json(res, 422, {
              provider: 'kraken',
              status: 'REJECTED',
              error: 'kraken_futures_full_access_required_for_orders',
              generalAccess: caps.general,
            });
            return true;
          }
          vaultPayload.futures = credentials;
          futuresState = {
            configured: caps.configured,
            trading: allowTrading && caps.trading,
            perpetuals: caps.perpetuals,
            general: caps.general,
            transfer: caps.transfer,
          };
        }

        const permissions = combinePermissions(spotState, futuresState);
        const fingerprint = fingerprintForPayload(config, vaultPayload);
        await rpc(fetchImpl, config, 'capital_ai_upsert_user_provider_secret', {
          _user_id: user.userId,
          _provider: 'kraken',
          _secret_payload: JSON.stringify(vaultPayload),
          _credential_fingerprint: fingerprint,
          _permissions: permissions,
        });
        await markStatus(user.userId, 'VERIFIED', null);

        json(res, 200, {
          provider: 'kraken',
          credentialFamily,
          status: 'VERIFIED',
          credentialFingerprint: fingerprint,
          dataScope: 'USER_PRIVATE_ACCOUNT_DATA',
          redistributionAllowed: false,
          publicDisplayAllowed: false,
          sharedCacheAllowed: false,
          jetStreamPublicationAllowed: false,
          capabilities: permissions,
          executionEnabled: false,
          portfolioAvailable: permissions.fundsQuery,
          holdings,
        });
      } catch (error) {
        if (error?.status) {
          json(res, 503, {
            error: error.status === 401
              ? 'provider_vault_admin_credential_rejected'
              : 'provider_vault_write_failed',
          });
          return true;
        }
        const code = typeof error?.code === 'string' ? error.code : 'KRAKEN_VERIFICATION_FAILED';
        json(res, 422, {
          provider: 'kraken',
          status: 'INVALID',
          error: 'kraken_verification_failed',
          code,
        });
      }
      return true;
    }

    if (url.pathname === '/api/profile/provider-connections/kraken/balance') {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      try {
        const stored = await readStored(user.userId);
        if (!stored?.secretPayload) {
          json(res, 404, { error: 'provider_connection_not_found' });
          return true;
        }
        const vaultPayload = parseStoredVaultPayload(stored.secretPayload);
        if (!vaultPayload.spot) {
          json(res, 404, { error: 'kraken_spot_connection_not_found' });
          return true;
        }
        const verification = await krakenKeyInfo(fetchImpl, vaultPayload.spot);
        if (verification.capabilities.forbiddenPermissions.length > 0) {
          json(res, 403, {
            error: 'kraken_funding_or_withdrawal_permissions_forbidden',
            forbiddenPermissions: verification.capabilities.forbiddenPermissions,
          });
          return true;
        }
        const fundsQuery = verification.capabilities.fundsQuery;
        const holdings = fundsQuery
          ? publicBalanceProjection(await krakenBalance(fetchImpl, vaultPayload.spot))
          : [];
        const spotState = {
          configured: true,
          fundsQuery,
          websocketToken: verification.capabilities.websocketToken,
          trading: stored?.permissions?.spotTrading === true && verification.capabilities.trading,
          orderCreate: stored?.permissions?.spotOrderCreate === true && verification.capabilities.orderCreate,
          orderCancel: stored?.permissions?.spotOrderCancel === true && verification.capabilities.orderCancel,
        };
        const permissions = combinePermissions(spotState, stored?.permissions?.futures || null);
        await markStatus(user.userId, 'VERIFIED', null);
        json(res, 200, {
          provider: 'kraken',
          status: 'VERIFIED',
          dataScope: 'USER_PRIVATE_ACCOUNT_DATA',
          redistributionAllowed: false,
          publicDisplayAllowed: false,
          sharedCacheAllowed: false,
          jetStreamPublicationAllowed: false,
          capabilities: permissions,
          executionEnabled: false,
          portfolioAvailable: fundsQuery,
          holdings,
        });
      } catch (error) {
        const code = typeof error?.code === 'string' ? error.code : 'PRIVATE_CONTEXT_UNAVAILABLE';
        await markStatus(user.userId, 'INVALID', code).catch(() => {});
        json(res, 503, { error: 'private_provider_context_unavailable', code });
      }
      return true;
    }

    json(res, 404, { error: 'not_found' });
    return true;
  }

  return { handle, readKrakenSpotTradingCredential, executePrivateQuery };
}
