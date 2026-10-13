// CAPITAL_AI_SOCIAL_OAUTH_CALLBACK@1 — strict fail-closed HTTP boundary.
// No authorization-start route and no built-in token exchanger are activated.
import { createSocialProviderStore } from './provider-store.mjs';
import { createSocialXEdgeClient, socialXEdgeMode } from './x-edge-client.mjs';
import { socialPlatformForChannel } from './provider-adapter.mjs';

// Only the authenticated, email-confirmed IAM owner can receive these fixed
// categories. Never reflect provider bodies, codes, state, tokens or exceptions.
const OWNER_SAFE_CALLBACK_DIAGNOSTICS = Object.freeze({
  SOCIAL_X_EDGE_REJECTED: 'edge_request_rejected',
  SOCIAL_X_EDGE_UNAVAILABLE: 'edge_network_unavailable',
  SOCIAL_X_EDGE_AUTH_UNAVAILABLE: 'edge_owner_session_token_unavailable',
  SOCIAL_X_EDGE_CONSUMPTION_INVALID: 'edge_state_not_confirmed',
  SOCIAL_X_EDGE_PERSIST_INVALID: 'vault_persistence_not_confirmed',
  SOCIAL_X_TOKEN_EXCHANGE_REJECTED: 'provider_token_exchange_rejected',
  SOCIAL_X_OAUTH_SCOPES_MISSING: 'provider_scopes_missing',
  SOCIAL_X_ACCOUNT_READBACK_REJECTED: 'provider_identity_readback_rejected',
  SOCIAL_X_ACCOUNT_PERSIST_FAILED: 'vault_persistence_not_confirmed',
  SOCIAL_X_ACCOUNT_PERSIST_READBACK_FAILED: 'vault_persistence_not_confirmed',
  SOCIAL_YOUTUBE_TOKEN_EXCHANGE_REJECTED: 'provider_token_exchange_rejected',
  SOCIAL_YOUTUBE_OAUTH_SCOPES_MISSING: 'provider_scopes_missing',
  SOCIAL_YOUTUBE_ACCOUNT_READBACK_REJECTED: 'provider_identity_readback_rejected',
  SOCIAL_YOUTUBE_ACCOUNT_PERSIST_READBACK_FAILED: 'vault_persistence_not_confirmed',
  SOCIAL_OAUTH_CONSUME_NOT_CONFIRMED: 'oauth_state_not_confirmed',
  SOCIAL_OAUTH_PKCE_MISSING: 'oauth_pkce_invalid',
  SOCIAL_OAUTH_CALLBACK_READBACK_MISMATCH: 'vault_persistence_not_confirmed',
});
function safeOwnerCallbackFailure(error) {
  return Object.hasOwn(OWNER_SAFE_CALLBACK_DIAGNOSTICS, error?.message)
    ? OWNER_SAFE_CALLBACK_DIAGNOSTICS[error.message] : 'internal_unclassified';
}

export function createSocialOAuthCallback({ env = process.env, auth, store = null,
  exchangeCode = null, fetchImpl = fetch } = {}) {
  const path = '/api/social-media/auth/callback';
  const allowed = ['YOUTUBE', 'TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'X'];

  async function handle(req, res, url, json) {
    if (url.pathname !== path) return false;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      json(res, 405, { error: 'method_not_allowed' });
      return true;
    }
    // Do not even consume a state without a configured provider-specific
    // exchanger. The exchanger must persist ciphertext before success.
    if (env.SOCIAL_OAUTH_CALLBACK_ENABLED !== 'true'
      || typeof exchangeCode !== 'function') {
      json(res, 503, { error: 'social_oauth_not_configured' });
      return true;
    }
    let origin;
    try {
      origin = new URL(env.PUBLIC_APP_ORIGIN);
      if (origin.protocol !== 'https:' || origin.href !== origin.origin + '/') throw Error();
    } catch {
      json(res, 503, { error: 'social_oauth_not_configured' });
      return true;
    }
    // X supplies only state and code; channel is verified against the DB-bound state.
    const state = url.searchParams.get('state');
    const youtubeState = /(?:^|;\s*)capital_youtube_oauth_state=([A-Za-z0-9_-]{43})(?:;|$)/
      .exec(req.headers?.cookie || '')?.[1];
    const channel = url.searchParams.get('channel')
      ?? (youtubeState && youtubeState === state ? 'YOUTUBE' : 'X');
    const code = url.searchParams.get('code');
    if (!allowed.includes(channel) || url.searchParams.has('error')
      || !/^[A-Za-z0-9_-]{43}$/.test(state || '')
      || typeof code !== 'string' || code.length < 1 || code.length > 2048) {
      json(res, 400, { error: 'invalid_social_oauth_callback' });
      return true;
    }
    const identity = await auth?.verify?.(req, res);
    if (!identity?.userId) {
      json(res, 401, { error: 'authentication_required' });
      return true;
    }
    if (['X', 'YOUTUBE'].includes(channel) && (identity.emailVerified !== true
      || await auth?.authorizeIamRole?.(req, res, 'owner') !== true)) {
      json(res, 403, { error: 'owner_authorization_required' });
      return true;
    }
    // Enforce the exact callback URI; the user-controlled query must never be
    // accepted as a redirect destination or token endpoint.
    const redirectUri = new URL(path, origin).toString();
    try {
      const activeStore = store ?? (['X', 'YOUTUBE'].includes(channel) && socialXEdgeMode(env)
        ? createSocialXEdgeClient({ env, fetchImpl, channel,
          userAccessToken: await auth?.internalAccessToken?.(req, res) })
        : createSocialProviderStore({ env, fetchImpl }));
      const result = await activeStore.consumeOAuthCallback({
        userId: identity.userId, channel, redirectUri,
        allowedRedirectUris: [redirectUri], state, code,
        exchangeCode: async trusted => {
          if (trusted.userId !== identity.userId || trusted.channel !== channel
            || socialPlatformForChannel(trusted.channel) !== channel.toLowerCase()) {
            throw new Error('SOCIAL_OAUTH_EXCHANGE_IDENTITY_MISMATCH');
          }
          // Allow injection only from internal server-side code; never from HTTP.
          await exchangeCode(trusted);
        },
      });
      if (result?.consumed !== true || result.platform !== channel.toLowerCase()) {
        throw new Error('SOCIAL_OAUTH_CALLBACK_READBACK_MISMATCH');
      }
      if (channel === 'YOUTUBE') {
        const existingCookies = res.getHeader?.('Set-Cookie');
        res.setHeader('Set-Cookie', [
          ...(Array.isArray(existingCookies) ? existingCookies : existingCookies ? [existingCookies] : []),
          'capital_youtube_oauth_state=; Path=/api/social-media/auth/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
        ]);
      }
      if (channel === 'YOUTUBE') {
        res.writeHead(303, { Location: '/api/social-media/youtube/account/status', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
        res.end();
        return true;
      }
      // The exchanger has confirmed encrypted persistence/readback. Point the
      // authenticated owner to the read-only status instead of a blank 204.
      res.writeHead(303, {
        Location: '/api/social-media/x/account/status',
        'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer',
      });
      res.end();
    } catch (error) {
      // Identity and IAM owner role have already been checked above.
      json(res, 503, { error: 'social_oauth_callback_unavailable',
        diagnostic: safeOwnerCallbackFailure(error) });
    }
    return true;
  }

  return Object.freeze({ handle });
}
