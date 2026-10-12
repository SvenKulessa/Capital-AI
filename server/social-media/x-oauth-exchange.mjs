// CAPITAL_AI_SOCIAL_X_OAUTH_EXCHANGE@1 — server-only user-bound X OAuth.
import { createCipheriv, randomBytes } from 'node:crypto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUIRED_SCOPES = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'];
const CALLBACK = '/api/social-media/auth/callback';
const TEXT_MAX = 16 * 1024;

function assert(condition, reason) { if (!condition) throw new Error(reason); }
function providerConfig(env) {
  assert(env?.SOCIAL_X_OAUTH_CONNECT_ENABLED === 'true'
    && env?.SOCIAL_OAUTH_CALLBACK_ENABLED === 'true', 'SOCIAL_X_OAUTH_DISABLED');
  const origin = new URL(env.PUBLIC_APP_ORIGIN);
  assert(origin.protocol === 'https:' && origin.pathname === '/' && !origin.search
    && !origin.hash && !origin.username && !origin.password, 'SOCIAL_X_OAUTH_ORIGIN_INVALID');
  const clientId = env.SOCIAL_X_OAUTH_CLIENT_ID;
  const clientSecret = env.SOCIAL_X_OAUTH_CLIENT_SECRET;
  assert(typeof clientId === 'string' && clientId.length >= 5 && clientId.length <= 256
    && !/[\s:]/.test(clientId)
    && typeof clientSecret === 'string' && clientSecret.length >= 8
    && clientSecret.length <= 2048, 'SOCIAL_X_OAUTH_CLIENT_UNCONFIGURED');
  const keyHex = env.SOCIAL_X_TOKEN_ENCRYPTION_KEY;
  assert(typeof keyHex === 'string' && /^[a-fA-F0-9]{64}$/.test(keyHex),
    'SOCIAL_X_OAUTH_KEY_UNCONFIGURED');
  const serviceKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabase = new URL(env.SUPABASE_URL);
  assert(supabase.protocol === 'https:' && supabase.pathname === '/'
    && !supabase.search && !supabase.hash && !supabase.username && !supabase.password
    && (serviceKey.startsWith('sb_secret_') || isServiceRoleJwt(serviceKey)),
    'SOCIAL_X_STORE_UNCONFIGURED');
  return Object.freeze({
    redirectUri: new URL(CALLBACK, origin).toString(),
    clientId, clientSecret, key: Buffer.from(keyHex, 'hex'),
    supabaseOrigin: supabase.origin, serviceKey,
  });
}
function isServiceRoleJwt(key) {
  if (!key.startsWith('eyJ')) return false;
  try {
    return JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role === 'service_role';
  } catch { return false; }
}
export function socialXOAuthConfigured(env = process.env) {
  try { providerConfig(env); return true; } catch { return false; }
}
function seal(value, key, { userId, kind }) {
  assert(typeof value === 'string' && value.length >= 10 && value.length <= 8192,
    'SOCIAL_X_TOKEN_INVALID');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(JSON.stringify(['capital-social-x-v1', userId, kind])));
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return 'v1.' + [iv, cipher.getAuthTag(), ciphertext].map(v => v.toString('base64url')).join('.');
}
async function jsonResponse(response) {
  const body = await response.text();
  assert(body.length <= TEXT_MAX, 'SOCIAL_X_RESPONSE_TOO_LARGE');
  try { return JSON.parse(body); } catch { throw Error('SOCIAL_X_RESPONSE_INVALID'); }
}
async function request(fetchImpl, target, options) {
  try {
    return await fetchImpl(target, {
      ...options, redirect: 'error', signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw Error('SOCIAL_X_PROVIDER_UNAVAILABLE');
  }
}
function serviceHeaders(key) {
  const headers = { apikey: key, Accept: 'application/json',
    'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' };
  if (key.startsWith('eyJ')) headers.Authorization = 'Bearer ' + key;
  return headers;
}

export function createSocialXOAuthExchange({ env = process.env, fetchImpl = fetch } = {}) {
  return async function exchangeCode(trusted) {
    // No HTTP-supplied user/account identifiers are accepted by this boundary.
    assert(trusted?.channel === 'X' && UUID.test(trusted.userId || '')
      && typeof trusted.code === 'string' && trusted.code.length > 0 && trusted.code.length <= 2048
      && /^[A-Za-z0-9_~-]{43,128}$/.test(trusted.codeVerifier || ''),
      'SOCIAL_X_OAUTH_CONTEXT_INVALID');
    const cfg = providerConfig(env);
    assert(trusted.redirectUri === cfg.redirectUri, 'SOCIAL_X_OAUTH_REDIRECT_DENIED');
    const body = new URLSearchParams({
      grant_type: 'authorization_code', code: trusted.code,
      redirect_uri: cfg.redirectUri, code_verifier: trusted.codeVerifier,
    });
    const tokenRes = await request(fetchImpl, 'https://api.x.com/2/oauth2/token', {
      method: 'POST', headers: {
        Authorization: 'Basic ' + Buffer.from(cfg.clientId + ':' + cfg.clientSecret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });
    assert(tokenRes.ok, 'SOCIAL_X_TOKEN_EXCHANGE_REJECTED');
    const tokens = await jsonResponse(tokenRes);
    const scopes = typeof tokens.scope === 'string' ? tokens.scope.split(' ').filter(Boolean) : [];
    assert(REQUIRED_SCOPES.every(s => scopes.includes(s)), 'SOCIAL_X_OAUTH_SCOPES_MISSING');
    assert(Number.isSafeInteger(tokens.expires_in) && tokens.expires_in >= 60
      && tokens.expires_in <= 86400, 'SOCIAL_X_OAUTH_EXPIRY_INVALID');
    assert(typeof tokens.token_type === 'string' && tokens.token_type.toLowerCase() === 'bearer',
      'SOCIAL_X_OAUTH_TOKEN_TYPE_INVALID');
    assert(typeof tokens.access_token === 'string' && tokens.access_token.length >= 10
      && typeof tokens.refresh_token === 'string' && tokens.refresh_token.length >= 10,
      'SOCIAL_X_OAUTH_TOKENS_MISSING');
    // Verify the actual authenticated X owner before persisting any credential.
    const meRes = await request(fetchImpl, 'https://api.x.com/2/users/me', {
      method: 'GET', headers: { Authorization: 'Bearer ' + tokens.access_token,
        Accept: 'application/json' },
    });
    assert(meRes.ok, 'SOCIAL_X_ACCOUNT_READBACK_REJECTED');
    const account = (await jsonResponse(meRes)).data;
    assert(account && /^[0-9]{1,25}$/.test(account.id || '')
      && /^[A-Za-z0-9_]{1,15}$/.test(account.username || ''),
      'SOCIAL_X_ACCOUNT_IDENTITY_INVALID');
    const record = {
      user_id: trusted.userId, platform: 'x', status: 'connected',
      account_name: typeof account.name === 'string' ? account.name.slice(0, 140) : account.username,
      handle: account.username, external_account_id: account.id,
      scopes: REQUIRED_SCOPES,
      access_token_encrypted: seal(tokens.access_token, cfg.key, { userId: trusted.userId, kind: 'access' }),
      refresh_token_encrypted: seal(tokens.refresh_token, cfg.key, { userId: trusted.userId, kind: 'refresh' }),
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      connected_at: new Date().toISOString(),
    };
    // Explicit upsert keyed by (user_id,platform). Service key never reaches a browser.
    const endpoint = cfg.supabaseOrigin
      + '/rest/v1/social_media_accounts?on_conflict=user_id%2Cplatform';
    const savedRes = await request(fetchImpl, endpoint, {
      method: 'POST', headers: serviceHeaders(cfg.serviceKey),
      body: JSON.stringify(record),
    });
    assert(savedRes.ok, 'SOCIAL_X_ACCOUNT_PERSIST_FAILED');
    const readback = await jsonResponse(savedRes);
    const row = Array.isArray(readback) && readback.length === 1 ? readback[0] : null;
    assert(row?.user_id === trusted.userId && row?.platform === 'x'
      && row?.external_account_id === account.id && row?.handle === account.username
      && row?.status === 'connected'
      && row?.access_token_encrypted === record.access_token_encrypted
      && row?.refresh_token_encrypted === record.refresh_token_encrypted,
      'SOCIAL_X_ACCOUNT_PERSIST_READBACK_FAILED');
    return Object.freeze({ connected: true, channel: 'X', handle: account.username });
  };
}
