import { randomBytes, createHash } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify, customFetch } from 'jose';
import { secureUrl, boundedJson, createLimiter } from './http-security.mjs';

const random = () => randomBytes(32).toString('base64url');
const cookie = (name, value, age, sameSite = 'Strict') => `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=${sameSite}; Max-Age=${age}`;
const cookieValue = (req, name) => {
  const matches = (req.headers.cookie || '').split(';').map(x => x.trim()).filter(x => x.startsWith(name + '='));
  return matches.length === 1 ? matches[0].slice(name.length + 1) : '';
};

export function createAuth({ env = process.env, fetchImpl = fetch, now = Date.now } = {}) {
  const transactions = new Map(), sessions = new Map();
  const allow = createLimiter(20, 60_000, 1, now);
  let metadata, keys;
  const configured = () => {
    try {
      secureUrl(env.OIDC_ISSUER);
      const issuer = env.OIDC_ISSUER;
      const origin = secureUrl(env.PUBLIC_APP_ORIGIN);
      if (origin.href !== origin.origin + '/' || !env.OIDC_CLIENT_ID || !env.OIDC_CLIENT_SECRET) return false;
      return { issuer, origin: origin.origin, clientId: env.OIDC_CLIENT_ID };
    } catch { return false; }
  };
  const prune = map => { for (const [key, value] of map) if (value.expires <= now()) map.delete(key); };
  async function discovery(config) {
    if (metadata) return metadata;
    const candidate = await boundedJson(await fetchImpl(config.issuer.replace(/\/$/, '') + '/.well-known/openid-configuration', { signal: AbortSignal.timeout(5000), redirect: 'error' }));
    if (candidate.issuer !== config.issuer || !candidate.code_challenge_methods_supported?.includes('S256')) throw new Error('unsupported_provider');
    for (const name of ['authorization_endpoint', 'token_endpoint', 'jwks_uri']) secureUrl(candidate[name]);
    if (candidate.token_endpoint_auth_methods_supported && !candidate.token_endpoint_auth_methods_supported.includes('client_secret_basic')) throw new Error('unsupported_provider');
    keys = createRemoteJWKSet(secureUrl(candidate.jwks_uri), {
      timeoutDuration: 5000,
      [customFetch]: async (url, options) => {
        const response = await fetchImpl(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(5000) });
        return Response.json(await boundedJson(response));
      },
    });
    metadata = candidate; return metadata;
  }
  function session(req) {
    prune(sessions);
    return sessions.get(cookieValue(req, '__Host-capital_session')) || null;
  }
  function sameOrigin(req) { const config = configured(); return !!config && req.headers.origin === config.origin; }
  async function handle(req, res, url, json) {
    if (!url.pathname.startsWith('/api/auth/')) return false;
    const action = url.pathname.slice('/api/auth/'.length);
    if (!['login', 'callback', 'session', 'logout'].includes(action)) { json(res, 404, { error: 'not_found' }); return true; }
    if (req.method !== (action === 'logout' ? 'POST' : 'GET')) { json(res, 405, { error: 'method_not_allowed' }); return true; }
    if (action === 'session') {
      const value = session(req);
      json(res, 200, { configured: !!configured(), authenticated: !!value, user: value ? { subject: value.subject, name: value.name } : null }); return true;
    }
    if (action === 'logout') {
      if (!sameOrigin(req)) { json(res, 403, { error: 'forbidden_origin' }); return true; }
      sessions.delete(cookieValue(req, '__Host-capital_session'));
      res.setHeader('Set-Cookie', cookie('__Host-capital_session', '', 0));
      json(res, 200, { authenticated: false }); return true;
    }
    if (!allow()) { res.setHeader('Retry-After', '60'); json(res, 429, { error: 'rate_limited' }); return true; }
    const config = configured();
    if (!config) { json(res, 503, { error: 'authentication_not_configured' }); return true; }
    let phase = 'callback_validation';
    try {
      if (action === 'login') {
        // Do not permit cross-site subresource initiation. Top-level provider redirects remain possible.
        if (req.headers['sec-fetch-site'] === 'cross-site' && req.headers['sec-fetch-mode'] !== 'navigate') { json(res, 403, { error: 'forbidden_origin' }); return true; }
        prune(transactions);
        if (transactions.size >= 100) { json(res, 503, { error: 'busy' }); return true; }
        phase = 'discovery';
        const meta = await discovery(config);
        const state = random(), nonce = random(), verifier = random(), browser = random();
        transactions.set(state, { nonce, verifier, browser, expires: now() + 300000 });
        const target = secureUrl(meta.authorization_endpoint);
        for (const [key, value] of Object.entries({ response_type: 'code', client_id: config.clientId, redirect_uri: config.origin + '/api/auth/callback', scope: 'openid profile', state, nonce, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' })) target.searchParams.set(key, value);
        res.setHeader('Set-Cookie', cookie('__Host-capital_oidc', browser, 300, 'Lax'));
        res.writeHead(303, { Location: target.href, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }); res.end(); return true;
      }
      prune(transactions);
      const state = url.searchParams.get('state'), transaction = transactions.get(state);
      if (!transaction || transaction.browser !== cookieValue(req, '__Host-capital_oidc') || url.searchParams.getAll('state').length !== 1) { json(res, 400, { error: 'invalid_authentication_state' }); return true; }
      transactions.delete(state); // Consume once, including failed callbacks.
      res.setHeader('Set-Cookie', cookie('__Host-capital_oidc', '', 0, 'Lax'));
      const code = url.searchParams.get('code');
      if (!code || code.length > 2048 || url.searchParams.getAll('code').length !== 1 || url.searchParams.has('error')) throw new Error('invalid_callback');
      phase = 'discovery';
      const meta = await discovery(config);
      const body = new URLSearchParams({ grant_type: 'authorization_code', code, code_verifier: transaction.verifier, redirect_uri: config.origin + '/api/auth/callback' });
      const basic = Buffer.from(`${encodeURIComponent(config.clientId)}:${encodeURIComponent(env.OIDC_CLIENT_SECRET)}`).toString('base64');
      phase = 'token_exchange';
      const token = await boundedJson(await fetchImpl(meta.token_endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${basic}` }, body, signal: AbortSignal.timeout(5000), redirect: 'error' }));
      if (typeof token.id_token !== 'string') throw new Error('missing_id_token');
      phase = 'token_validation';
      const { payload } = await jwtVerify(token.id_token, keys, { issuer: config.issuer, audience: config.clientId, algorithms: ['RS256', 'PS256', 'ES256'], requiredClaims: ['exp', 'iat', 'sub', 'nonce'], currentDate: new Date(now()) });
      if (payload.nonce !== transaction.nonce || typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 255 || payload.iat > now() / 1000 + 60 || (payload.azp !== undefined && payload.azp !== config.clientId) || (Array.isArray(payload.aud) && payload.aud.length > 1 && payload.azp !== config.clientId)) throw new Error('invalid_claims');
      phase = 'session_creation';
      prune(sessions);
      if (sessions.size >= 1000) throw new Error('busy');
      const id = random(), age = Math.min(1800, Math.floor(payload.exp - now() / 1000));
      if (age <= 0) throw new Error('expired');
      sessions.delete(cookieValue(req, '__Host-capital_session'));
      sessions.set(id, { subject: payload.sub, issuer: payload.iss, name: typeof payload.name === 'string' ? payload.name.slice(0, 100) : 'Benutzer', expires: now() + age * 1000 });
      res.setHeader('Set-Cookie', [cookie('__Host-capital_oidc', '', 0, 'Lax'), cookie('__Host-capital_session', id, age)]);
      res.writeHead(303, { Location: '/login', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }); res.end(); return true;
    } catch {
      // Fixed phase only: never log URLs, exceptions, codes, tokens or credentials.
      console.warn(`OIDC authentication failed at ${phase}`);
      json(res, 400, { error: 'authentication_failed' }); return true;
    }
  }
  return { handle, session, sameOrigin };
}
