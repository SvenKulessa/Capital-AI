import { createHash, createHmac } from 'node:crypto';
import { boundedJson, secureUrl } from './http-security.mjs';

const MAX_BODY_BYTES = 16 * 1024;
const KRAKEN_BALANCE_PATH = '/0/private/Balance';

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
    if (
      url.href !== url.origin + '/' ||
      !supportedAdminKey ||
      fingerprintKey.length < 32
    ) return null;
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
    try {
      payload = await boundedJson(response);
    } catch {
      payload = null;
    }
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

async function krakenBalance(fetchImpl, { apiKey, apiSecret }) {
  const nonce = String(Date.now());
  const body = new URLSearchParams({ nonce }).toString();
  const signature = krakenSignature(KRAKEN_BALANCE_PATH, { nonce }, apiSecret);
  const response = await fetchImpl(new URL(KRAKEN_BALANCE_PATH, 'https://api.kraken.com'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'API-Key': apiKey,
      'API-Sign': signature,
    },
    body,
    redirect: 'error',
    signal: AbortSignal.timeout(7000),
  });
  const payload = await boundedJson(response);
  if (!response.ok || !Array.isArray(payload?.error) || payload.error.length > 0 || typeof payload?.result !== 'object') {
    const code = Array.isArray(payload?.error) && payload.error.length ? String(payload.error[0]).slice(0, 120) : `HTTP_${response.status}`;
    const error = new Error('KRAKEN_VERIFICATION_FAILED');
    error.code = code;
    throw error;
  }
  return payload.result;
}

function parseStoredSecret(payload) {
  if (typeof payload !== 'string' || payload.length > 8192) throw new Error('VAULT_SECRET_INVALID');
  let parsed;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new Error('VAULT_SECRET_INVALID');
  }
  const apiKey = normalizeCredential(parsed?.apiKey, 8, 512);
  const apiSecret = normalizeCredential(parsed?.apiSecret, 16, 1024);
  if (!apiKey || !apiSecret) throw new Error('VAULT_SECRET_INVALID');
  return { apiKey, apiSecret };
}

function publicBalanceProjection(balance) {
  return Object.entries(balance || {})
    .filter(([asset, value]) => /^[A-Za-z0-9.:-]{1,32}$/.test(asset) && /^-?\d+(?:\.\d+)?$/.test(String(value)))
    .map(([asset, value]) => ({ asset, balance: String(value) }))
    .slice(0, 500);
}

export function createUserProviderVault({ env = process.env, fetchImpl = fetch, auth } = {}) {
  const config = adminConfig(env);

  async function requireUser(req, res, json) {
    const verified = await auth?.verify?.(req, res);
    if (!verified?.userId) {
      json(res, 401, { error: 'authentication_required' });
      return null;
    }
    return verified;
  }

  async function markStatus(userId, status, errorCode = null) {
    if (!config) return;
    await rpc(fetchImpl, config, 'capital_ai_mark_user_provider_status', {
      _user_id: userId,
      _provider: 'kraken',
      _status: status,
      _error_code: errorCode,
    });
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
      try {
        body = await readJson(req);
      } catch (error) {
        json(res, error.message === 'REQUEST_TOO_LARGE' ? 413 : 400, { error: 'invalid_request' });
        return true;
      }
      const apiKey = normalizeCredential(body.apiKey, 8, 512);
      const apiSecret = normalizeCredential(body.apiSecret, 16, 1024);
      if (!apiKey || !apiSecret) {
        json(res, 400, { error: 'invalid_kraken_credentials_format' });
        return true;
      }

      const fingerprint = createHmac('sha256', config.fingerprintKey)
        .update('capital-ai/byok-fingerprint/v1\0')
        .update(apiKey)
        .digest('hex')
        .slice(0, 24);
      const secretPayload = JSON.stringify({ apiKey, apiSecret });
      try {
        await rpc(fetchImpl, config, 'capital_ai_upsert_user_provider_secret', {
          _user_id: user.userId,
          _provider: 'kraken',
          _secret_payload: secretPayload,
          _credential_fingerprint: fingerprint,
          _permissions: {
            fundsQuery: true,
            trading: false,
            withdrawals: false,
            publicMarketDataAdmission: false,
          },
        });

        try {
          const balance = await krakenBalance(fetchImpl, { apiKey, apiSecret });
          await markStatus(user.userId, 'VERIFIED', null);
          json(res, 200, {
            provider: 'kraken',
            status: 'VERIFIED',
            credentialFingerprint: fingerprint,
            dataScope: 'USER_PRIVATE_ACCOUNT_DATA',
            redistributionAllowed: false,
            publicDisplayAllowed: false,
            holdings: publicBalanceProjection(balance),
          });
        } catch (error) {
          const code = typeof error?.code === 'string' ? error.code : 'KRAKEN_VERIFICATION_FAILED';
          await markStatus(user.userId, 'INVALID', code).catch(() => {});
          json(res, 422, {
            provider: 'kraken',
            status: 'INVALID',
            error: 'kraken_verification_failed',
            code,
          });
        }
      } catch (error) {
        json(res, 503, {
          error: error?.status === 401
            ? 'provider_vault_admin_credential_rejected'
            : 'provider_vault_write_failed',
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
        const stored = await rpc(fetchImpl, config, 'capital_ai_get_user_provider_secret', {
          _user_id: user.userId,
          _provider: 'kraken',
        });
        if (!stored?.secretPayload) {
          json(res, 404, { error: 'provider_connection_not_found' });
          return true;
        }
        const credentials = parseStoredSecret(stored.secretPayload);
        const balance = await krakenBalance(fetchImpl, credentials);
        await markStatus(user.userId, 'VERIFIED', null);
        json(res, 200, {
          provider: 'kraken',
          status: 'VERIFIED',
          dataScope: 'USER_PRIVATE_ACCOUNT_DATA',
          redistributionAllowed: false,
          publicDisplayAllowed: false,
          sharedCacheAllowed: false,
          jetStreamPublicationAllowed: false,
          holdings: publicBalanceProjection(balance),
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

  return { handle };
}
