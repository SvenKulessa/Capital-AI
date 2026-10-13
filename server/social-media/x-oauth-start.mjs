// CAPITAL_AI_SOCIAL_X_OAUTH_START@1 — isolated, disabled by default.
// Feature flag and verified IAM-owner access prevent account linkage by default.
import { createHash, randomBytes } from 'node:crypto';
import { createSocialProviderStore } from './provider-store.mjs';
import { createSocialXEdgeClient, socialXEdgeMode } from './x-edge-client.mjs';
import { socialXOAuthConfigured } from './x-oauth-exchange.mjs';

const START_PATH = '/api/social-media/x/auth/start';
const CALLBACK_PATH = '/api/social-media/auth/callback';
const SCOPES = 'tweet.read tweet.write users.read offline.access';
 
// Only ever show an allowlisted error category to a verified IAM owner.
// Never forward provider responses, errors, URLs, credentials, JWTs or verifier
// material into the browser, diagnostics or logs.
const OWNER_SAFE_START_DIAGNOSTICS = Object.freeze({
  SOCIAL_X_EDGE_WORKLOAD_UNCONFIGURED: 'edge_workload_key_invalid',
  SOCIAL_X_EDGE_AUTH_UNAVAILABLE: 'edge_owner_session_token_unavailable',
  SOCIAL_X_EDGE_URL_INVALID: 'edge_project_url_invalid',
  SOCIAL_X_EDGE_ORIGIN_INVALID: 'edge_app_origin_invalid',
  SOCIAL_X_EDGE_DISABLED: 'edge_mode_disabled',
  SOCIAL_X_EDGE_UNAVAILABLE: 'edge_network_unavailable',
  SOCIAL_X_EDGE_REJECTED: 'edge_request_rejected',
  SOCIAL_X_EDGE_RESPONSE_INVALID: 'edge_response_invalid',
  SOCIAL_X_EDGE_BEGIN_INVALID: 'edge_state_not_confirmed',
  SOCIAL_X_EDGE_USER_INVALID: 'edge_owner_id_invalid',
  SOCIAL_X_EDGE_REDIRECT_DENIED: 'edge_callback_denied',
  SOCIAL_PROVIDER_OAUTH_USER_REQUIRED: 'oauth_owner_id_invalid',
  SOCIAL_PROVIDER_OAUTH_REDIRECT_DENIED: 'oauth_callback_denied',
  SOCIAL_PROVIDER_OAUTH_PKCE_REQUIRED: 'oauth_pkce_invalid',
  SOCIAL_X_OAUTH_STATE_INVALID: 'oauth_state_invalid',
});
function safeOwnerFailure(error) {
  return Object.hasOwn(OWNER_SAFE_START_DIAGNOSTICS, error?.message)
    ? OWNER_SAFE_START_DIAGNOSTICS[error.message] : 'internal_unclassified';
}


function originFromEnv(env) {
  const parsed = new URL(env.PUBLIC_APP_ORIGIN);
  if (parsed.protocol !== 'https:' || parsed.pathname !== '/'
    || parsed.search || parsed.hash || parsed.username || parsed.password) {
    throw new Error('SOCIAL_X_OAUTH_ORIGIN_INVALID');
  }
  return parsed.origin;
}

export function createSocialXOAuthStart({ env = process.env, auth,
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
    const clientId = env.SOCIAL_X_OAUTH_CLIENT_ID;
    try {
      if (!socialXOAuthConfigured(env)
        || typeof clientId !== 'string' || clientId.length < 5 || clientId.length > 256
        || /[\s]/.test(clientId)) throw Error();
      origin = originFromEnv(env);
    } catch {
      json(res, 503, { error: 'social_x_oauth_not_configured' });
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
        ? createSocialXEdgeClient({ env, fetchImpl,
          userAccessToken: await auth?.internalAccessToken?.(req, res) })
        : createSocialProviderStore({ env, fetchImpl }));
      const issued = await activeStore.beginOAuth({
        userId: identity.userId, channel: 'X', redirectUri,
        allowedRedirectUris: [redirectUri], codeVerifier: verifier,
      });
      if (!/^[A-Za-z0-9_-]{43}$/.test(issued?.state || '')) {
        throw new Error('SOCIAL_X_OAUTH_STATE_INVALID');
      }
      const authorize = new URL('https://x.com/i/oauth2/authorize');
      authorize.searchParams.set('response_type', 'code');
      authorize.searchParams.set('client_id', clientId);
      authorize.searchParams.set('redirect_uri', redirectUri);
      authorize.searchParams.set('scope', SCOPES);
      authorize.searchParams.set('state', issued.state);
      authorize.searchParams.set('code_challenge', challenge);
      authorize.searchParams.set('code_challenge_method', 'S256');
      res.writeHead(303, { Location: authorize.toString(),
        'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
      res.end();
    } catch (error) {
      // Only the verified, email-confirmed IAM owner reaches this block.
      // Map internal errors to a fixed, token-free diagnostic category.
      json(res, 503, { error: 'social_x_oauth_unavailable',
        diagnostic: safeOwnerFailure(error) });
    }
    return true;
  }
  return Object.freeze({ handle });
}
