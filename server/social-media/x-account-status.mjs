// CAPITAL_AI_SOCIAL_X_ACCOUNT_STATUS@1 — read-only owner-bound connection status.
// Never select or return encrypted access/refresh tokens.
const PATH = '/api/social-media/x/account/status';
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
export function createSocialXAccountStatus({ env = process.env, auth, fetchImpl = fetch } = {}) {
  async function handle(req, res, url, json) {
    if (url.pathname !== PATH) return false;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      jsonError(json, res, 405, 'method_not_allowed');
      return true;
    }
    if (env.SOCIAL_X_OAUTH_CONNECT_ENABLED !== 'true') {
      jsonError(json, res, 503, 'social_x_account_unavailable');
      return true;
    }
    const identity = await auth?.verify?.(req, res);
    if (!ID.test(identity?.userId || '') || identity.emailVerified !== true
      || await auth?.authorizeIamRole?.(req, res, 'owner') !== true) {
      jsonError(json, res, 403, 'owner_authorization_required');
      return true;
    }
    try {
      const cfg = config(env);
      const target = new URL('/rest/v1/social_media_accounts', cfg.origin);
      target.searchParams.set('user_id', 'eq.' + identity.userId);
      target.searchParams.set('platform', 'eq.x');
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
      if (row && (row.platform !== 'x'
        || typeof row.external_account_id !== 'string'
        || !/^[0-9]{1,25}$/.test(row.external_account_id)
        || !/^[A-Za-z0-9_]{1,15}$/.test(row.handle || ''))) throw Error();
      const expiresAt = Date.parse(row?.token_expires_at || '');
      const requiredScopes = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'];
      const permissionsComplete = Array.isArray(row?.scopes)
        && requiredScopes.every(scope => row.scopes.includes(scope));
      const tokenValid = Number.isFinite(expiresAt) && expiresAt > Date.now() + 60000;
      const connected = row?.status === 'connected' && permissionsComplete && tokenValid;
      json(res, 200, {
        channel: 'X', connected,
        status: connected ? 'connected'
          : (row?.status === 'connected'
            ? (permissionsComplete ? 'token_expired' : 'permissions_missing')
            : (row?.status || 'not_connected')),
        handle: row ? '@' + row.handle : null,
        accountId: row?.external_account_id || null,
        scopes: connected && Array.isArray(row.scopes)
          ? row.scopes.filter(x => ['tweet.read', 'tweet.write', 'users.read', 'offline.access'].includes(x))
          : [],
        expiresAt: connected ? row.token_expires_at : null,
      });
    } catch {
      jsonError(json, res, 503, 'social_x_account_unavailable');
    }
    return true;
  }
  return Object.freeze({ handle });
}
