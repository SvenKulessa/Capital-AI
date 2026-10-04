import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getMarketplaceSubscription, githubJson } from './github.mjs';

function base64urlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function sign(value, secret) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function createOAuthState({ installationId, marketplacePlanId = null, secret, now = Date.now() }) {
  if (!secret) throw new Error('OAuth state secret is required');
  const payload = base64urlJson({
    nonce: randomBytes(18).toString('base64url'),
    installationId: Number(installationId),
    marketplacePlanId: marketplacePlanId == null ? null : Number(marketplacePlanId),
    exp: Math.floor(now / 1000) + 10 * 60,
  });
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyOAuthState(state, secret, now = Date.now()) {
  if (!state || !secret) return null;
  const [payload, signature, extra] = String(state).split('.');
  if (!payload || !signature || extra) return null;
  const expected = Buffer.from(sign(payload, secret));
  const supplied = Buffer.from(signature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  let decoded;
  try {
    decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!Number.isInteger(decoded.installationId) || decoded.installationId <= 0) return null;
  if (!Number.isInteger(decoded.exp) || decoded.exp < Math.floor(now / 1000)) return null;
  return decoded;
}

export function oauthAuthorizeUrl({ clientId, redirectUri, state }) {
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  return url.toString();
}

export async function exchangeOAuthCode({ clientId, clientSecret, code, redirectUri, fetchImpl = fetch }) {
  const response = await fetchImpl('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json', 'user-agent': 'legal-policy-github-app/0.1' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
  });
  const body = await response.json();
  if (!response.ok || !body.access_token) throw new Error('GitHub OAuth token exchange failed');
  return body.access_token;
}

export async function verifyBuyerInstallation({ userToken, installationId, appJwt, fetchImpl = fetch }) {
  const result = await githubJson('/user/installations?per_page=100', { token: userToken, fetchImpl });
  const installation = (result.installations ?? []).find((item) => Number(item.id) === Number(installationId));
  if (!installation?.account?.id) throw new Error('OAuth user is not authorized for the requested installation');
  const subscription = await getMarketplaceSubscription({ accountId: installation.account.id, appJwt, fetchImpl });
  return { installation, subscription };
}
