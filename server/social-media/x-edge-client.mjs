// CAPITAL_AI_X_EDGE_CLIENT@1 — user-JWT-to-Supabase edge transport.
// Render never sends a service-role/secret key on this path. Access tokens stay
// server-side and are not reflected into HTML, responses, logs or redirects.
import { createHmac } from 'node:crypto';
import { createSocialOAuthState, socialOAuthStateDigest } from './provider-adapter.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CALLBACK = '/api/social-media/auth/callback';
function must(test, code) { if (!test) throw new Error(code); }
export function socialXEdgeMode(env = process.env) {
  return env.SOCIAL_X_EDGE_STORE_ENABLED === 'true';
}
function setup(env, userAccessToken) {
  must(socialXEdgeMode(env), 'SOCIAL_X_EDGE_DISABLED');
  const base = new URL(env.SUPABASE_URL);
  must(base.protocol === 'https:' && base.pathname === '/' && !base.search
    && !base.hash && !base.username && !base.password, 'SOCIAL_X_EDGE_URL_INVALID');
  const app = new URL(env.PUBLIC_APP_ORIGIN);
  must(app.protocol === 'https:' && app.pathname === '/' && !app.search
    && !app.hash && !app.username && !app.password, 'SOCIAL_X_EDGE_ORIGIN_INVALID');
  const publishable = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY
    || env.SUPABASE_ANON_KEY;
  // Prove that the owner request originated from the trusted Render workload.
  const workloadKey = env.SOCIAL_X_EDGE_WORKLOAD_SECRET;
  must(typeof workloadKey === 'string' && /^[a-fA-F0-9]{64}$/.test(workloadKey),
    'SOCIAL_X_EDGE_WORKLOAD_UNCONFIGURED');
  must(typeof publishable === 'string' && publishable.length > 12
    && typeof userAccessToken === 'string' && userAccessToken.length > 50
    && userAccessToken.length < 8192, 'SOCIAL_X_EDGE_AUTH_UNAVAILABLE');
  return {
    target: new URL('/functions/v1/capital-social-x-vault', base).toString(),
    publishable, userAccessToken,
    workloadKey: Buffer.from(workloadKey, 'hex'),
    redirectUri: new URL(CALLBACK, app).toString(),
  };
}
export function createSocialXEdgeClient({ env = process.env, fetchImpl = fetch,
  userAccessToken } = {}) {
  const cfg = setup(env, userAccessToken);
  async function invoke(operation, body) {
    const payload = JSON.stringify({ operation, ...body });
    const timestamp = String(Date.now());
    const signature = createHmac('sha256', cfg.workloadKey)
      .update(timestamp + '\n' + cfg.userAccessToken + '\n' + payload).digest('hex');
    let response;
    try {
      response = await fetchImpl(cfg.target, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(9500),
        headers: { apikey: cfg.publishable, Authorization: 'Bearer ' + cfg.userAccessToken,
          'x-capital-edge-timestamp': timestamp, 'x-capital-edge-signature': signature,
          'Content-Type': 'application/json', Accept: 'application/json' },
        body: payload,
      });
    } catch { throw Error('SOCIAL_X_EDGE_UNAVAILABLE'); }
    must(response.ok, 'SOCIAL_X_EDGE_REJECTED');
    const text = await response.text();
    must(text.length > 0 && text.length < 16384, 'SOCIAL_X_EDGE_RESPONSE_INVALID');
    try { return JSON.parse(text); }
    catch { throw Error('SOCIAL_X_EDGE_RESPONSE_INVALID'); }
  }
  function assertOwner(userId) { must(UUID.test(userId || ''), 'SOCIAL_X_EDGE_USER_INVALID'); }
  async function beginOAuth({ userId, channel, redirectUri, allowedRedirectUris,
    codeVerifier, now = Date.now() }) {
    assertOwner(userId);
    must(channel === 'X' && redirectUri === cfg.redirectUri
      && allowedRedirectUris?.includes(cfg.redirectUri), 'SOCIAL_X_EDGE_REDIRECT_DENIED');
    const { state, row } = createSocialOAuthState({
      userId, channel, redirectUri, allowedRedirectUris, codeVerifier, now,
    });
    const result = await invoke('begin', { userId, stateHash: row.state_token,
      codeVerifier, redirectUri });
    must(result?.prepared === true, 'SOCIAL_X_EDGE_BEGIN_INVALID');
    return Object.freeze({ state, expiresAt: row.expires_at });
  }
  async function consumeOAuthCallback({ userId, channel, redirectUri,
    allowedRedirectUris, state, code, exchangeCode }) {
    assertOwner(userId);
    must(channel === 'X' && redirectUri === cfg.redirectUri
      && allowedRedirectUris?.includes(cfg.redirectUri)
      && typeof code === 'string' && code.length >= 1 && code.length <= 2048
      && typeof exchangeCode === 'function', 'SOCIAL_X_EDGE_CALLBACK_INVALID');
    const stateHash = socialOAuthStateDigest({ state, userId, channel, redirectUri });
    const row = await invoke('consume', { userId, stateHash, redirectUri });
    must(row?.consumed === true && typeof row.codeVerifier === 'string'
      && /^[A-Za-z0-9._~-]{43,128}$/.test(row.codeVerifier),
      'SOCIAL_X_EDGE_CONSUMPTION_INVALID');
    await exchangeCode({ channel: 'X', code, redirectUri, userId,
      codeVerifier: row.codeVerifier, userAccessToken: cfg.userAccessToken });
    return Object.freeze({ consumed: true, platform: 'x' });
  }
  async function persistAccount(userId, account) {
    assertOwner(userId);
    const saved = await invoke('persist', { userId, account });
    must(saved?.connected === true && saved.accountId === account.external_account_id
      && saved.handle === account.handle, 'SOCIAL_X_EDGE_PERSIST_INVALID');
    return saved;
  }
  async function status(userId) {
    assertOwner(userId);
    const data = await invoke('status', { userId });
    must(data?.channel === 'X' && typeof data.connected === 'boolean'
      && typeof data.status === 'string'
      && (data.handle === null || /^@[A-Za-z0-9_]{1,15}$/.test(data.handle)),
      'SOCIAL_X_EDGE_STATUS_INVALID');
    return data;
  }
  return Object.freeze({ beginOAuth, consumeOAuthCallback, persistAccount,
    status, invoke });
}
