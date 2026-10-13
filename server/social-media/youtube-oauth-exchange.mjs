import { createSocialXEdgeClient, socialXEdgeMode } from './x-edge-client.mjs';
// CAPITAL_AI_SOCIAL_YOUTUBE_OAUTH_EXCHANGE@1 — server-only user-bound YouTube OAuth.
import { createCipheriv, randomBytes } from 'node:crypto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUIRED_SCOPES = ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/youtube.upload'];
const CALLBACK = '/api/social-media/auth/callback';
const TEXT_MAX = 16 * 1024;

function assert(condition, reason) { if (!condition) throw new Error(reason); }
export function youtubeOAuthConfig(env) {
  assert(env?.SOCIAL_YOUTUBE_OAUTH_CONNECT_ENABLED === 'true'
    && env?.SOCIAL_OAUTH_CALLBACK_ENABLED === 'true', 'SOCIAL_YOUTUBE_OAUTH_DISABLED');
  const origin = new URL(env.PUBLIC_APP_ORIGIN);
  assert(origin.protocol === 'https:' && origin.pathname === '/' && !origin.search
    && !origin.hash && !origin.username && !origin.password, 'SOCIAL_YOUTUBE_OAUTH_ORIGIN_INVALID');
  const clientId = env.SOCIAL_YOUTUBE_OAUTH_CLIENT_ID || env.YOUTUBE_CLIENT_ID;
  const clientSecret = env.SOCIAL_YOUTUBE_OAUTH_CLIENT_SECRET || env.YOUTUBE_CLIENT_SECRET;
  assert(typeof clientId === 'string' && clientId.length <= 256
    && /^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId)
    && typeof clientSecret === 'string' && clientSecret.length >= 8
    && clientSecret.length <= 2048, 'SOCIAL_YOUTUBE_OAUTH_CLIENT_UNCONFIGURED');
  // Render's generated 256-bit secrets are canonical padded base64. Keep the
  // original 64-character hex format compatible with previously sealed tokens.
  const encodedKey = env.SOCIAL_YOUTUBE_TOKEN_ENCRYPTION_KEY;
  let encryptionKey = null;
  if (typeof encodedKey === 'string' && /^[a-fA-F0-9]{64}$/.test(encodedKey)) {
    encryptionKey = Buffer.from(encodedKey, 'hex');
  } else if (typeof encodedKey === 'string'
    && /^[A-Za-z0-9+/]{43}=$/.test(encodedKey)) {
    const decoded = Buffer.from(encodedKey, 'base64');
    if (decoded.length === 32 && decoded.toString('base64') === encodedKey) {
      encryptionKey = decoded;
    }
  }
  assert(encryptionKey?.length === 32, 'SOCIAL_YOUTUBE_OAUTH_KEY_UNCONFIGURED');
  const edgeMode = socialXEdgeMode(env);
  const publishable = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabase = new URL(env.SUPABASE_URL);
  assert(supabase.protocol === 'https:' && supabase.pathname === '/'
    && !supabase.search && !supabase.hash && !supabase.username && !supabase.password
    && (edgeMode ? typeof publishable === 'string' && publishable.length > 12
      : serviceKey.startsWith('sb_secret_') || isServiceRoleJwt(serviceKey)),
    'SOCIAL_YOUTUBE_STORE_UNCONFIGURED');
  return Object.freeze({
    redirectUri: new URL(CALLBACK, origin).toString(),
    clientId, clientSecret, key: encryptionKey,
    supabaseOrigin: supabase.origin, serviceKey,
  });
}
function isServiceRoleJwt(key) {
  if (!key.startsWith('eyJ')) return false;
  try {
    return JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role === 'service_role';
  } catch { return false; }
}
export function socialYouTubeOAuthConfigured(env = process.env) {
  try { youtubeOAuthConfig(env); return true; } catch { return false; }
}
export function sealYouTubeToken(value, key, { userId, kind }) {
  assert(typeof value === 'string' && value.length >= 10 && value.length <= 8192,
    'SOCIAL_YOUTUBE_TOKEN_INVALID');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(JSON.stringify(['capital-social-youtube-v1', userId, kind])));
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return 'v1.' + [iv, cipher.getAuthTag(), ciphertext].map(v => v.toString('base64url')).join('.');
}
async function jsonResponse(response) {
  const body = await response.text();
  assert(body.length <= TEXT_MAX, 'SOCIAL_YOUTUBE_RESPONSE_TOO_LARGE');
  try { return JSON.parse(body); } catch { throw Error('SOCIAL_YOUTUBE_RESPONSE_INVALID'); }
}
async function request(fetchImpl, target, options) {
  try {
    return await fetchImpl(target, {
      ...options, redirect: 'error', signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw Error('SOCIAL_YOUTUBE_PROVIDER_UNAVAILABLE');
  }
}
function serviceHeaders(key) {
  const headers = { apikey: key, Accept: 'application/json',
    'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' };
  if (key.startsWith('eyJ')) headers.Authorization = 'Bearer ' + key;
  return headers;
}

export function createSocialYouTubeOAuthExchange({ env = process.env, fetchImpl = fetch } = {}) {
  return async function exchangeCode(trusted) {
    // No HTTP-supplied user/account identifiers are accepted by this boundary.
    assert(trusted?.channel === 'YOUTUBE' && UUID.test(trusted.userId || '')
      && typeof trusted.code === 'string' && trusted.code.length > 0 && trusted.code.length <= 2048
      && /^[A-Za-z0-9_~-]{43,128}$/.test(trusted.codeVerifier || ''),
      'SOCIAL_YOUTUBE_OAUTH_CONTEXT_INVALID');
    const cfg = youtubeOAuthConfig(env);
    assert(trusted.redirectUri === cfg.redirectUri, 'SOCIAL_YOUTUBE_OAUTH_REDIRECT_DENIED');
    const body = new URLSearchParams({
      grant_type: 'authorization_code', client_id: cfg.clientId,
      client_secret: cfg.clientSecret, code: trusted.code,
      redirect_uri: cfg.redirectUri, code_verifier: trusted.codeVerifier,
    });
    const tokenRes = await request(fetchImpl, 'https://oauth2.googleapis.com/token', {
      method: 'POST', headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });
    assert(tokenRes.ok, 'SOCIAL_YOUTUBE_TOKEN_EXCHANGE_REJECTED');
    const tokens = await jsonResponse(tokenRes);
    const scopes = typeof tokens.scope === 'string' ? tokens.scope.split(' ').filter(Boolean) : [];
    assert(REQUIRED_SCOPES.every(s => scopes.includes(s)), 'SOCIAL_YOUTUBE_OAUTH_SCOPES_MISSING');
    assert(Number.isSafeInteger(tokens.expires_in) && tokens.expires_in >= 60
      && tokens.expires_in <= 86400, 'SOCIAL_YOUTUBE_OAUTH_EXPIRY_INVALID');
    assert(typeof tokens.token_type === 'string' && tokens.token_type.toLowerCase() === 'bearer',
      'SOCIAL_YOUTUBE_OAUTH_TOKEN_TYPE_INVALID');
    assert(typeof tokens.access_token === 'string' && tokens.access_token.length >= 10
      && typeof tokens.refresh_token === 'string' && tokens.refresh_token.length >= 10,
      'SOCIAL_YOUTUBE_OAUTH_TOKENS_MISSING');
    // Verify the actual authenticated YouTube channel before persisting any credential.
    const meRes = await request(fetchImpl, 'https://www.googleapis.com/youtube/v3/channels?part=id%2Csnippet&mine=true', {
      method: 'GET', headers: { Authorization: 'Bearer ' + tokens.access_token,
        Accept: 'application/json' },
    });
    assert(meRes.ok, 'SOCIAL_YOUTUBE_ACCOUNT_READBACK_REJECTED');
    const accounts = (await jsonResponse(meRes)).items;
    assert(Array.isArray(accounts) && accounts.length === 1, 'SOCIAL_YOUTUBE_CHANNEL_SELECTION_REQUIRED');
    const account = accounts[0];
    const handle = account?.snippet?.customUrl || account?.id;
    assert(!env.SOCIAL_YOUTUBE_EXPECTED_CHANNEL_ID
      || account?.id === env.SOCIAL_YOUTUBE_EXPECTED_CHANNEL_ID, 'SOCIAL_YOUTUBE_WRONG_CHANNEL');
    assert(account && /^UC[A-Za-z0-9_-]{22}$/.test(account.id || '')
      && typeof account?.snippet?.title === 'string' && account.snippet.title.trim()
      && typeof handle === 'string' && handle.length <= 140,
      'SOCIAL_YOUTUBE_ACCOUNT_IDENTITY_INVALID');
    const record = {
      user_id: trusted.userId, platform: 'youtube', status: 'connected',
      account_name: account.snippet.title.slice(0, 140),
      handle: handle, external_account_id: account.id,
      scopes: REQUIRED_SCOPES,
      access_token_encrypted: sealYouTubeToken(tokens.access_token, cfg.key, { userId: trusted.userId, kind: 'access' }),
      refresh_token_encrypted: sealYouTubeToken(tokens.refresh_token, cfg.key, { userId: trusted.userId, kind: 'refresh' }),
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      connected_at: new Date().toISOString(),
    };
    if (socialXEdgeMode(env)) {
      const edge = createSocialXEdgeClient({ env, fetchImpl, channel: 'YOUTUBE', userAccessToken: trusted.userAccessToken });
      const saved = await edge.persistAccount(trusted.userId, record);
      assert(saved?.connected === true && saved.accountId === account.id, 'SOCIAL_YOUTUBE_ACCOUNT_PERSIST_READBACK_FAILED');
      return Object.freeze({ connected: true, channel: 'YOUTUBE', handle });
    }
    // Explicit upsert keyed by (user_id,platform). Service key never reaches a browser.
    const endpoint = cfg.supabaseOrigin
      + '/rest/v1/social_media_accounts?on_conflict=user_id%2Cplatform';
    const savedRes = await request(fetchImpl, endpoint, {
      method: 'POST', headers: serviceHeaders(cfg.serviceKey),
      body: JSON.stringify(record),
    });
    assert(savedRes.ok, 'SOCIAL_YOUTUBE_ACCOUNT_PERSIST_FAILED');
    const readback = await jsonResponse(savedRes);
    const row = Array.isArray(readback) && readback.length === 1 ? readback[0] : null;
    assert(row?.user_id === trusted.userId && row?.platform === 'youtube'
      && row?.external_account_id === account.id && row?.handle === handle
      && row?.status === 'connected'
      && row?.access_token_encrypted === record.access_token_encrypted
      && row?.refresh_token_encrypted === record.refresh_token_encrypted,
      'SOCIAL_YOUTUBE_ACCOUNT_PERSIST_READBACK_FAILED');
    return Object.freeze({ connected: true, channel: 'YOUTUBE', handle: handle });
  };
}
