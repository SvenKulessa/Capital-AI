// CAPITAL_AI_SOCIAL_OWNER_TOKEN_REFRESH@1
// Server-only, manually initiated owner token refresh. No scheduler, browser
// secrets, publishing side effects or unaudited retry of a rotating grant.
import { createDecipheriv, createCipheriv, randomBytes, randomUUID } from 'node:crypto';
import { createSocialXEdgeClient, socialXEdgeMode } from './x-edge-client.mjs';
import { socialXOAuthConfigured } from './x-oauth-exchange.mjs';
import { socialYouTubeOAuthConfigured } from './youtube-oauth-exchange.mjs';

const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CIPHER = /^v1\.([A-Za-z0-9_-]{16})\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{14,11000})$/;
const SCOPES = Object.freeze({
  X: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
  YOUTUBE: ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/youtube.upload'],
});
const ENDPOINTS = Object.freeze({
  X: '/api/social-media/x/account/refresh',
  YOUTUBE: '/api/social-media/youtube/account/refresh',
});
const AAD = Object.freeze({ X: 'capital-social-x-v1', YOUTUBE: 'capital-social-youtube-v1' });
function must(ok, code) { if (!ok) throw Error(code); }
function keyFromEnv(env, channel) {
  const value = env['SOCIAL_' + channel + '_TOKEN_ENCRYPTION_KEY'];
  if (typeof value === 'string' && /^[a-fA-F0-9]{64}$/.test(value)) {
    return Buffer.from(value, 'hex');
  }
  if (typeof value === 'string' && /^[A-Za-z0-9+/]{43}=$/.test(value)) {
    const bytes = Buffer.from(value, 'base64');
    if (bytes.length === 32 && bytes.toString('base64') === value) return bytes;
  }
  throw Error('SOCIAL_REFRESH_KEY_UNCONFIGURED');
}
function unseal(ciphertext, key, userId, channel) {
  must(typeof ciphertext === 'string' && CIPHER.test(ciphertext),
    'SOCIAL_REFRESH_CIPHER_INVALID');
  const [, iv, tag, data] = CIPHER.exec(ciphertext);
  const decrypt = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decrypt.setAAD(Buffer.from(JSON.stringify([AAD[channel], userId, 'refresh'])));
  decrypt.setAuthTag(Buffer.from(tag, 'base64url'));
  const value = Buffer.concat([
    decrypt.update(Buffer.from(data, 'base64url')), decrypt.final(),
  ]).toString('utf8');
  must(value.length >= 10 && value.length <= 8192, 'SOCIAL_REFRESH_TOKEN_INVALID');
  return value;
}
function seal(value, key, userId, channel, kind) {
  must(typeof value === 'string' && value.length >= 10 && value.length <= 8192,
    'SOCIAL_REFRESH_NEW_TOKEN_INVALID');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(JSON.stringify([AAD[channel], userId, kind])));
  const bytes = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return 'v1.' + [iv, cipher.getAuthTag(), bytes].map(x => x.toString('base64url')).join('.');
}
async function boundedJson(response) {
  const data = await response.text();
  must(data.length <= 16384, 'SOCIAL_REFRESH_RESPONSE_TOO_LARGE');
  try { return JSON.parse(data); } catch { throw Error('SOCIAL_REFRESH_RESPONSE_INVALID'); }
}
async function safeFetch(fetchImpl, uri, options) {
  try {
    return await fetchImpl(uri, { ...options, redirect: 'error',
      signal: AbortSignal.timeout(8000) });
  } catch { throw Error('SOCIAL_REFRESH_PROVIDER_AMBIGUOUS'); }
}
function oauthClient(env, channel) {
  const clientId = channel === 'X' ? env.SOCIAL_X_OAUTH_CLIENT_ID
    : env.SOCIAL_YOUTUBE_OAUTH_CLIENT_ID || env.YOUTUBE_CLIENT_ID;
  const clientSecret = channel === 'X' ? env.SOCIAL_X_OAUTH_CLIENT_SECRET
    : env.SOCIAL_YOUTUBE_OAUTH_CLIENT_SECRET || env.YOUTUBE_CLIENT_SECRET;
  must(typeof clientId === 'string' && clientId.length >= 5
    && typeof clientSecret === 'string' && clientSecret.length >= 8,
    'SOCIAL_REFRESH_CLIENT_UNCONFIGURED');
  return { clientId, clientSecret };
}
async function providerRefresh(fetchImpl, env, channel, oldToken, accountId) {
  const { clientId, clientSecret } = oauthClient(env, channel);
  const form = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: oldToken });
  let url, headers;
  if (channel === 'X') {
    url = 'https://api.x.com/2/oauth2/token';
    headers = { Authorization: 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
  } else {
    url = 'https://oauth2.googleapis.com/token';
    form.set('client_id', clientId); form.set('client_secret', clientSecret);
    headers = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
  }
  const response = await safeFetch(fetchImpl, url, {
    method: 'POST', headers, body: form.toString(),
  });
  if (response.status === 429) return { outcome: 'rate_limited' };
  if (!response.ok) {
    // No verbatim response/error returned to browser or logs.
    const data = await boundedJson(response).catch(() => ({}));
    return { outcome: data?.error === 'invalid_grant' ? 'reconnect' : 'ambiguous' };
  }
  const result = await boundedJson(response);
  must(typeof result.access_token === 'string' && result.access_token.length >= 10
    && typeof result.token_type === 'string' && result.token_type.toLowerCase() === 'bearer'
    && Number.isSafeInteger(result.expires_in) && result.expires_in >= 60
    && result.expires_in <= 86400, 'SOCIAL_REFRESH_TOKEN_RESPONSE_INVALID');
  if (channel === 'X') {
    must(typeof result.refresh_token === 'string' && result.refresh_token.length >= 10,
      'SOCIAL_REFRESH_ROTATING_TOKEN_MISSING');
  }
  if (result.refresh_token != null) {
    must(typeof result.refresh_token === 'string' && result.refresh_token.length >= 10,
      'SOCIAL_REFRESH_NEW_TOKEN_INVALID');
  }
  const scopes = typeof result.scope === 'string' ? result.scope.split(' ').filter(Boolean) : null;
  must(!scopes || SCOPES[channel].every(x => scopes.includes(x)),
    'SOCIAL_REFRESH_SCOPE_DOWNGRADE');
  // Account binding must be checked after refresh, before rotating stored tokens.
  const accountRes = await safeFetch(fetchImpl,
    channel === 'X' ? 'https://api.x.com/2/users/me'
      : 'https://www.googleapis.com/youtube/v3/channels?part=id&mine=true',
    { method: 'GET', headers: { Authorization: 'Bearer ' + result.access_token,
      Accept: 'application/json' } });
  must(accountRes.ok, 'SOCIAL_REFRESH_ACCOUNT_READBACK_FAILED');
  const verified = await boundedJson(accountRes);
  must(channel === 'X'
    ? verified?.data?.id === accountId
    : Array.isArray(verified?.items) && verified.items.length === 1
      && verified.items[0]?.id === accountId,
  'SOCIAL_REFRESH_ACCOUNT_MISMATCH');
  return { outcome: 'success', accessToken: result.access_token,
    refreshToken: result.refresh_token || oldToken, expiresIn: result.expires_in };
}

export function createSocialOwnerTokenRefresh({ env = process.env, auth,
  fetchImpl = fetch, edgeFactory = createSocialXEdgeClient } = {}) {
  async function handle(req, res, url, json) {
    const channel = Object.entries(ENDPOINTS)
      .find(([, path]) => url.pathname === path)?.[0];
    if (!channel) return false;
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      json(res, 405, { error: 'method_not_allowed' });
      return true;
    }
    let origin;
    try {
      origin = new URL(env.PUBLIC_APP_ORIGIN).origin;
      must(origin.startsWith('https://'), 'SOCIAL_REFRESH_ORIGIN_INVALID');
    } catch {
      json(res, 503, { error: 'social_refresh_unavailable' }); return true;
    }
    if (req.headers?.origin !== origin || req.headers?.['sec-fetch-site'] !== 'same-origin') {
      json(res, 403, { error: 'same_origin_required' }); return true;
    }
    const identity = await auth?.verify?.(req, res);
    if (!identity?.userId) { json(res, 401, { error: 'authentication_required' }); return true; }
    if (identity.emailVerified !== true
      || await auth?.authorizeIamRole?.(req, res, 'owner') !== true) {
      json(res, 403, { error: 'owner_authorization_required' }); return true;
    }
    if (!USER_ID.test(identity.userId) || !socialXEdgeMode(env)
      || !(channel === 'X' ? socialXOAuthConfigured(env)
        : socialYouTubeOAuthConfigured(env))) {
      json(res, 503, { error: 'social_refresh_unavailable' }); return true;
    }
    let edge, claim = null;
    const leaseId = randomUUID();
    try {
      const jwt = await auth?.internalAccessToken?.(req, res);
      edge = edgeFactory({ env, fetchImpl, channel, userAccessToken: jwt });
      claim = await edge.refreshClaim(identity.userId, leaseId);
      must(claim?.leaseId === leaseId && SCOPES[channel].every(s => claim.scopes?.includes(s)),
        'SOCIAL_REFRESH_SCOPE_DOWNGRADE');
      const key = keyFromEnv(env, channel);
      const oldToken = unseal(claim.refreshCipher, key, identity.userId, channel);
      const tokens = await providerRefresh(fetchImpl, env, channel, oldToken, claim.accountId);
      if (tokens.outcome !== 'success') {
        const disposition = tokens.outcome === 'rate_limited' ? 'rate_limited' : 'reconnect';
        await edge.refreshEnd(identity.userId, leaseId, disposition);
        json(res, tokens.outcome === 'rate_limited' ? 429 : 409, {
          channel, status: disposition === 'rate_limited'
            ? 'retry_later' : 'reconnect_required',
        });
        return true;
      }
      const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString();
      const rotated = await edge.refreshFinish(identity.userId, leaseId, claim.refreshCipher,
        seal(tokens.accessToken, key, identity.userId, channel, 'access'),
        seal(tokens.refreshToken, key, identity.userId, channel, 'refresh'),
        expiresAt);
      json(res, 200, { channel, status: 'connected', refreshed: rotated.refreshed === true,
        expiresAt: rotated.expiresAt });
    } catch {
      if (claim && edge) {
        // A token could have rotated before an ambiguous network/write error;
        // never automatically replay the previous refresh grant.
        try { await edge.refreshEnd(identity.userId, leaseId, 'reconnect'); } catch {}
      }
      json(res, 503, { error: 'social_refresh_unavailable',
        status: claim ? 'reconnect_required' : 'not_refreshed' });
    }
    return true;
  }
  return Object.freeze({ handle });
}
