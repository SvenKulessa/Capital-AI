import { createSocialXEdgeClient, socialXEdgeMode } from './x-edge-client.mjs';
// CAPITAL_AI_SOCIAL_YOUTUBE_ACCOUNT_STATUS@1 — read-only owner-bound connection status.
// Never select or return encrypted access/refresh tokens.
import { socialYouTubeOAuthConfigured } from './youtube-oauth-exchange.mjs';
const PATH = '/api/social-media/youtube/account/status';
const CONNECT = '/api/social-media/youtube/account/connect';
const DIAGNOSTICS = '/api/social-media/youtube/account/diagnostics';
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FIELDS = 'status,platform,external_account_id,handle,scopes,token_expires_at,connected_at';
function jsonError(json, res, code, message) {
  json(res, code, { error: message });
}
function serviceRoleJwt(s) {
  if (!s.startsWith('eyJ') || s.split('.').length !== 3) return false;
  try { return JSON.parse(Buffer.from(s.split('.')[1], 'base64url')).role === 'service_role'; }
  catch { return false; }
}
function config(env) {
  const key = env?.SUPABASE_SECRET_KEY || env?.SUPABASE_SERVICE_ROLE_KEY || '';
  const origin = new URL(env?.SUPABASE_URL);
  if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search
    || origin.hash || origin.username || origin.password
    || !(key.startsWith('sb_secret_') || serviceRoleJwt(key))) throw Error();
  return { origin: origin.origin, key };
}
// No secret, key length, value, or token is ever returned. These checks reflect
// the exact fail-closed prerequisites of X OAuth's providerConfig and Edge transport.
function isHttpsOrigin(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.pathname === '/' && !url.search
      && !url.hash && !url.username && !url.password;
  } catch { return false; }
}
function isRandom256Bit(value) {
  if (typeof value !== 'string') return false;
  if (/^[a-fA-F0-9]{64}$/.test(value)) return true;
  if (!/^[A-Za-z0-9+/]{43}=$/.test(value)) return false;
  const bytes = Buffer.from(value, 'base64');
  return bytes.length === 32 && bytes.toString('base64') === value;
}
function isAdminServiceKey(value) {
  if (typeof value !== 'string') return false;
  return value.startsWith('sb_secret_') || serviceRoleJwt(value);
}
function ownerOnlyDiagnostics(env) {
  const edgeMode = socialXEdgeMode(env);
  const pub = env?.SUPABASE_PUBLISHABLE_KEY || env?.VITE_SUPABASE_PUBLISHABLE_KEY
    || env?.SUPABASE_ANON_KEY;
  const clientId = env?.SOCIAL_YOUTUBE_OAUTH_CLIENT_ID || env?.YOUTUBE_CLIENT_ID;
  const clientSecret = env?.SOCIAL_YOUTUBE_OAUTH_CLIENT_SECRET || env?.YOUTUBE_CLIENT_SECRET;
  const checks = Object.freeze({
    oauthConnectEnabled: env?.SOCIAL_YOUTUBE_OAUTH_CONNECT_ENABLED === 'true',
    oauthCallbackEnabled: env?.SOCIAL_OAUTH_CALLBACK_ENABLED === 'true',
    appOrigin: isHttpsOrigin(env?.PUBLIC_APP_ORIGIN),
    youtubeClientId: typeof clientId === 'string' && clientId.length <= 256
      && /^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId),
    youtubeClientSecret: typeof clientSecret === 'string' && clientSecret.length >= 8
      && clientSecret.length <= 2048,
    tokenEncryptionKey: isRandom256Bit(env?.SOCIAL_YOUTUBE_TOKEN_ENCRYPTION_KEY),
    supabaseUrl: isHttpsOrigin(env?.SUPABASE_URL),
    supabaseCredential: edgeMode
      ? typeof pub === 'string' && pub.length > 12
      : isAdminServiceKey(env?.SUPABASE_SECRET_KEY || env?.SUPABASE_SERVICE_ROLE_KEY),
    edgeWorkloadKey: !edgeMode || isRandom256Bit(env?.SOCIAL_X_EDGE_WORKLOAD_SECRET),
  });
  // The actual OAuth validator remains authoritative; the workload check
  // covers the subsequent Edge client prerequisite before any network call.
  return Object.freeze({
    schema: 'CAPITAL_SOCIAL_YOUTUBE_OWNER_DIAGNOSTICS@1',
    mode: edgeMode ? 'EDGE' : 'LEGACY',
    ready: socialYouTubeOAuthConfigured(env) && Object.values(checks).every(Boolean),
    checks,
  });
}

export function createSocialYouTubeAccountStatus({ env = process.env, auth, fetchImpl = fetch } = {}) {
  async function handle(req, res, url, json) {
    if (![PATH, DIAGNOSTICS, CONNECT].includes(url.pathname)) return false;
    const diagnostics = url.pathname === DIAGNOSTICS;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      jsonError(json, res, 405, 'method_not_allowed');
      return true;
    }
    if (!diagnostics && env.SOCIAL_YOUTUBE_OAUTH_CONNECT_ENABLED !== 'true') {
      jsonError(json, res, 503, 'social_youtube_account_unavailable');
      return true;
    }
    const identity = await auth?.verify?.(req, res);
    if (!ID.test(identity?.userId || '') || identity.emailVerified !== true
      || await auth?.authorizeIamRole?.(req, res, 'owner') !== true) {
      jsonError(json, res, diagnostics ? 404 : 403,
        diagnostics ? 'not_found' : 'owner_authorization_required');
      return true;
    }
    if (url.pathname === CONNECT) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', 'Vary': 'Cookie' });
      res.end('<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>YouTube verbinden | CAPITAL AI</title><body><main><h1>YouTube mit CAPITAL AI verbinden</h1><p>Wähle bei Google das Konto und den Kanal, die du für CAPITAL AI verwenden möchtest. Diese Verbindung veröffentlicht noch kein Video.</p><p><a href="/api/social-media/youtube/auth/start">Mit Google verbinden</a></p><p><a href="/api/social-media/youtube/account/status">Verbindung prüfen</a></p></main></body></html>');
      return true;
    }
    if (diagnostics) {
      res.setHeader('Cache-Control', 'private, no-store, max-age=0');
      res.setHeader('Vary', 'Cookie');
      json(res, 200, ownerOnlyDiagnostics(env));
      return true;
    }
    try {
      if (socialXEdgeMode(env)) {
        const edge = createSocialXEdgeClient({ env, fetchImpl, channel: 'YOUTUBE',
          userAccessToken: await auth?.internalAccessToken?.(req, res) });
        json(res, 200, await edge.status(identity.userId));
        return true;
      }
      const cfg = config(env);
      const target = new URL('/rest/v1/social_media_accounts', cfg.origin);
      target.searchParams.set('user_id', 'eq.' + identity.userId);
      target.searchParams.set('platform', 'eq.youtube');
      target.searchParams.set('select', FIELDS);
      target.searchParams.set('limit', '1');
      const headers = { apikey: cfg.key, Accept: 'application/json' };
      if (cfg.key.startsWith('eyJ')) headers.Authorization = 'Bearer ' + cfg.key;
      const response = await fetchImpl(target, {
        method: 'GET', headers, redirect: 'error', signal: AbortSignal.timeout(7000),
      });
      if (!response.ok) throw Error();
      const body = await response.text();
      if (body.length > 8192) throw Error();
      const data = JSON.parse(body);
      if (!Array.isArray(data) || data.length > 1) throw Error();
      const row = data[0];
      if (row && (row.platform !== 'youtube'
        || typeof row.external_account_id !== 'string'
        || !/^UC[A-Za-z0-9_-]{22}$/.test(row.external_account_id)
        || (typeof row.handle !== 'string' || row.handle.length > 140))) throw Error();
      const expiresAt = Date.parse(row?.token_expires_at || '');
      const requiredScopes = ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/youtube.upload'];
      const permissionsComplete = Array.isArray(row?.scopes)
        && requiredScopes.every(scope => row.scopes.includes(scope));
      const tokenValid = Number.isFinite(expiresAt) && expiresAt > Date.now() + 60000;
      const connected = row?.status === 'connected' && permissionsComplete && tokenValid;
      json(res, 200, {
        channel: 'YOUTUBE', connected,
        status: connected ? 'connected'
          : (row?.status === 'connected'
            ? (permissionsComplete ? 'token_expired' : 'permissions_missing')
            : (row?.status || 'not_connected')),
        handle: row ? row.handle : null,
        accountId: row?.external_account_id || null,
        scopes: connected && Array.isArray(row.scopes)
          ? row.scopes.filter(x => ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/youtube.upload'].includes(x))
          : [],
        expiresAt: connected ? row.token_expires_at : null,
      });
    } catch {
      jsonError(json, res, 503, 'social_youtube_account_unavailable');
    }
    return true;
  }
  return Object.freeze({ handle });
}
