import { createSocialXEdgeClient, socialXEdgeMode } from './x-edge-client.mjs';
// CAPITAL_AI_SOCIAL_YOUTUBE_OAUTH_START@1 — isolated, disabled by default.
// Feature flag and verified IAM-owner access prevent account linkage by default.
import { createHash, randomBytes } from 'node:crypto';
import { createSocialProviderStore } from './provider-store.mjs';
import { socialYouTubeOAuthConfigured } from './youtube-oauth-exchange.mjs';

const START_PATH = '/api/social-media/youtube/auth/start';
const CALLBACK_PATH = '/api/social-media/auth/callback';
const SCOPES = 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload';

function originFromEnv(env) {
  const parsed = new URL(env.PUBLIC_APP_ORIGIN);
  if (parsed.protocol !== 'https:' || parsed.pathname !== '/'
    || parsed.search || parsed.hash || parsed.username || parsed.password) {
    throw new Error('SOCIAL_YOUTUBE_OAUTH_ORIGIN_INVALID');
  }
  return parsed.origin;
}

export function createSocialYouTubeOAuthStart({ env = process.env, auth,
  store = null, fetchImpl = fetch } = {}) {
  async function handle(req, res, url, json) {
    if (url.pathname !== START_PATH) return false;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      json(res, 405, { error: 'method_not_allowed' });
      return true;
    }
    // Prevent third-party top-level navigations from initiating a connection.
    if (!['none', 'same-origin'].includes(req.headers?.['sec-fetch-site'])) {
      json(res, 403, { error: 'same_origin_required' });
      return true;
    }
    let origin;
    const clientId = env.SOCIAL_YOUTUBE_OAUTH_CLIENT_ID || env.YOUTUBE_CLIENT_ID;
    try {
      if (!socialYouTubeOAuthConfigured(env)
        || typeof clientId !== 'string' || clientId.length < 5 || clientId.length > 256
        || /[\s]/.test(clientId)) throw Error();
      origin = originFromEnv(env);
    } catch {
      json(res, 503, { error: 'social_youtube_oauth_not_configured' });
      return true;
    }
    const identity = await auth?.verify?.(req, res);
    if (!identity?.userId) {
      json(res, 401, { error: 'authentication_required' });
      return true;
    }
    if (identity.emailVerified !== true
      || await auth?.authorizeIamRole?.(req, res, 'owner') !== true) {
      json(res, 403, { error: 'owner_authorization_required' });
      return true;
    }
    const redirectUri = new URL(CALLBACK_PATH, origin).toString();
    // The verifier and state are generated server-side and must be stored for
    // exactly this authenticated user and redirect before sending the 303.
    try {
      const verifier = randomBytes(32).toString('base64url');
      const challenge = createHash('sha256').update(verifier).digest('base64url');
      const activeStore = store ?? (socialXEdgeMode(env)
        ? createSocialXEdgeClient({ env, fetchImpl, channel: 'YOUTUBE',
          userAccessToken: await auth?.internalAccessToken?.(req, res) })
        : createSocialProviderStore({ env, fetchImpl }));
      const issued = await activeStore.beginOAuth({
        userId: identity.userId, channel: 'YOUTUBE', redirectUri,
        allowedRedirectUris: [redirectUri], codeVerifier: verifier,
      });
      if (!/^[A-Za-z0-9_-]{43}$/.test(issued?.state || '')) {
        throw new Error('SOCIAL_YOUTUBE_OAUTH_STATE_INVALID');
      }
      const authorize = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authorize.searchParams.set('response_type', 'code');
      authorize.searchParams.set('access_type', 'offline');
      authorize.searchParams.set('prompt', 'consent');
      authorize.searchParams.set('client_id', clientId);
      authorize.searchParams.set('redirect_uri', redirectUri);
      authorize.searchParams.set('scope', SCOPES);
      authorize.searchParams.set('state', issued.state);
      authorize.searchParams.set('code_challenge', challenge);
      authorize.searchParams.set('code_challenge_method', 'S256');
      res.setHeader('Set-Cookie', 'capital_youtube_oauth_state=' + issued.state
        + '; Path=/api/social-media/auth/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=600');
      res.writeHead(303, { Location: authorize.toString(),
        'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
      res.end();
    } catch {
      // Errors must not disclose the PKCE verifier, OAuth state or provider data.
      json(res, 503, { error: 'social_youtube_oauth_unavailable' });
    }
    return true;
  }
  return Object.freeze({ handle });
}
