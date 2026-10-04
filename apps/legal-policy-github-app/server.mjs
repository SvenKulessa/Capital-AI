import { createServer } from 'node:http';
import { createAppJwt } from './lib/github.mjs';
import { createOAuthState, exchangeOAuthCode, oauthAuthorizeUrl, verifyBuyerInstallation, verifyOAuthState } from './lib/oauth.mjs';
import { deleteExpiredEvidence, secureTokenEquals } from './lib/evidence-store.mjs';
import { handleGitHubEvent, verifyWebhookSignature } from './lib/webhook.mjs';

const port = Number(process.env.PORT ?? 10020);
const publicUrl = String(process.env.LEGAL_POLICY_PUBLIC_URL ?? '').replace(/\/$/, '');

function cookieValue(request, name) {
  const cookies = String(request.headers.cookie ?? '').split(';').map((part) => part.trim());
  const prefix = `${name}=`;
  const entry = cookies.find((cookie) => cookie.startsWith(prefix));
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
}

function sendJson(response, status, body, extraHeaders = {}) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...extraHeaders });
  response.end(JSON.stringify(body));
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function bearerToken(request) {
  const header = String(request.headers.authorization ?? '');
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url, publicUrl || `http://${request.headers.host ?? 'localhost'}`);

  if (request.method === 'GET' && requestUrl.pathname === '/healthz') {
    sendJson(response, 200, { status: 'ok', service: 'legal-policy-github-app' });
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/maintenance/retention') {
    const expected = process.env.LEGAL_POLICY_MAINTENANCE_SECRET;
    if (!secureTokenEquals(bearerToken(request), expected)) {
      sendJson(response, 401, {error:'unauthorized'});
      return;
    }
    try {
      const result = await deleteExpiredEvidence({env:process.env});
      sendJson(response, 200, {ok:true, result}, {'cache-control':'no-store'});
    } catch (error) {
      console.error('LEGAL_POLICY retention maintenance failed', {message:error.message, status:error.status ?? null});
      sendJson(response, 500, {error:'retention_maintenance_failed'}, {'cache-control':'no-store'});
    }
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/setup') {
    try {
      const installationId = Number(requestUrl.searchParams.get('installation_id'));
      if (!Number.isInteger(installationId) || installationId <= 0) throw new Error('Missing or invalid installation_id');
      const clientId = requiredEnv('LEGAL_POLICY_GITHUB_CLIENT_ID');
      const stateSecret = requiredEnv('LEGAL_POLICY_SESSION_SECRET');
      const baseUrl = requiredEnv('LEGAL_POLICY_PUBLIC_URL').replace(/\/$/, '');
      const redirectUri = `${baseUrl}/auth/github/callback`;
      const state = createOAuthState({installationId, marketplacePlanId: requestUrl.searchParams.get('marketplace_listing_plan_id'), secret: stateSecret});
      const location = oauthAuthorizeUrl({ clientId, redirectUri, state });
      response.writeHead(302, {location, 'set-cookie': `legal_policy_oauth_state=${encodeURIComponent(state)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`, 'cache-control': 'no-store'});
      response.end();
    } catch (error) {
      sendJson(response, 400, { error: 'setup_failed', message: error.message });
    }
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/auth/github/callback') {
    try {
      const state = requestUrl.searchParams.get('state');
      const cookieState = cookieValue(request, 'legal_policy_oauth_state');
      if (!state || state !== cookieState) throw new Error('OAuth state mismatch');
      const statePayload = verifyOAuthState(state, requiredEnv('LEGAL_POLICY_SESSION_SECRET'));
      if (!statePayload) throw new Error('OAuth state is invalid or expired');
      const code = requestUrl.searchParams.get('code');
      if (!code) throw new Error('Missing OAuth code');
      const baseUrl = requiredEnv('LEGAL_POLICY_PUBLIC_URL').replace(/\/$/, '');
      const userToken = await exchangeOAuthCode({clientId: requiredEnv('LEGAL_POLICY_GITHUB_CLIENT_ID'), clientSecret: requiredEnv('LEGAL_POLICY_GITHUB_CLIENT_SECRET'), code, redirectUri: `${baseUrl}/auth/github/callback`});
      const appJwt = createAppJwt({appId: requiredEnv('LEGAL_POLICY_GITHUB_APP_ID'), privateKey: requiredEnv('LEGAL_POLICY_GITHUB_PRIVATE_KEY')});
      const buyer = await verifyBuyerInstallation({ userToken, installationId: statePayload.installationId, appJwt });
      sendJson(response, 200, {status: 'authorized', installationId: buyer.installation.id, account: { id: buyer.installation.account.id, login: buyer.installation.account.login, type: buyer.installation.account.type }, marketplacePlan: buyer.subscription?.marketplace_purchase?.plan?.name ?? 'Free'}, {'set-cookie': 'legal_policy_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0', 'cache-control': 'no-store'});
    } catch (error) {
      sendJson(response, 401, { error: 'oauth_authorization_failed', message: error.message }, { 'cache-control': 'no-store' });
    }
    return;
  }

  if (request.method !== 'POST' || requestUrl.pathname !== '/webhooks/github') {
    response.writeHead(404).end();
    return;
  }

  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks);
  if (!verifyWebhookSignature(rawBody, request.headers['x-hub-signature-256'], process.env.LEGAL_POLICY_GITHUB_WEBHOOK_SECRET)) {
    sendJson(response, 401, { error: 'invalid_signature' });
    return;
  }

  try {
    const payload = JSON.parse(rawBody.toString('utf8'));
    const result = await handleGitHubEvent({ eventName: request.headers['x-github-event'], payload, env: process.env });
    sendJson(response, 200, { ok: true, event: request.headers['x-github-event'], result });
  } catch (error) {
    console.error('LEGAL_POLICY webhook failed', { message: error.message, status: error.status ?? null });
    sendJson(response, 500, { error: 'webhook_processing_failed' });
  }
});

server.listen(port, '0.0.0.0', () => console.log(`LEGAL_POLICY GitHub App listening on ${port}`));
