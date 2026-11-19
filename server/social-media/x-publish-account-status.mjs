// CAPITAL_AI_X_PUBLISH_ACCOUNT_STATUS@1 — owner-only, no billable X API read.
import { createSocialXEdgeClient, socialXEdgeMode } from './x-edge-client.mjs';
import { socialXOAuthConfigured } from './x-oauth-exchange.mjs';

const PATH = '/api/social-media/x/publish/account/status';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createXPublishAccountStatus({ env = process.env, auth,
  fetchImpl = fetch, edgeFactory = createSocialXEdgeClient } = {}) {
  async function handle(req, res, url, json) {
    if (url.pathname !== PATH) return false;
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      json(res, 405, { error: 'method_not_allowed' });
      return true;
    }
    const identity = await auth?.verify?.(req, res);
    if (!UUID.test(identity?.userId || '') || identity.emailVerified !== true
      || await auth?.authorizeIamRole?.(req, res, 'owner') !== true) {
      json(res, 403, { error: 'owner_authorization_required' });
      return true;
    }
    if (!socialXEdgeMode(env) || !socialXOAuthConfigured(env, 'X_PUBLISH')) {
      json(res, 503, { error: 'x_publish_oauth_not_configured' });
      return true;
    }
    try {
      const jwt = await auth?.internalAccessToken?.(req, res);
      const edge = edgeFactory({ env, fetchImpl, channel: 'X_PUBLISH',
        userAccessToken: jwt });
      const result = await edge.status(identity.userId);
      if (result.channel !== 'X_PUBLISH'
        || (result.handle !== null && result.handle.toLowerCase() !== '@capitalaionline')
        || typeof result.connected !== 'boolean') throw Error('X_PUBLISH_STATUS_INVALID');
      json(res, 200, { channel: 'X_PUBLISH', status: result.status,
        connected: result.connected, handle: result.handle,
        mediaWriteApproved: result.connected === true
          && Array.isArray(result.scopes) && result.scopes.includes('media.write'),
        expiresAt: result.expiresAt ?? null });
    } catch {
      json(res, 503, { error: 'x_publish_status_unavailable' });
    }
    return true;
  }
  return Object.freeze({ handle });
}
