// CAPITAL_AI_SOCIAL_OAUTH_CALLBACK@1 — strict fail-closed HTTP boundary.
// No authorization-start route and no built-in token exchanger are activated.
import { createSocialProviderStore } from './provider-store.mjs';
import { socialPlatformForChannel } from './provider-adapter.mjs';

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
    const channel = url.searchParams.get('channel');
    const state = url.searchParams.get('state');
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
    // Enforce the exact callback URI; the user-controlled query must never be
    // accepted as a redirect destination or token endpoint.
    const redirectUri = new URL(path, origin).toString();
    try {
      const activeStore = store ?? createSocialProviderStore({ env, fetchImpl });
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
      // 204 deliberately does not assert that a provider account is linked.
      res.writeHead(204, { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
      res.end();
    } catch {
      json(res, 503, { error: 'social_oauth_callback_unavailable' });
    }
    return true;
  }

  return Object.freeze({ handle });
}
