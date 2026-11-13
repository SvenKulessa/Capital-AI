import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createOAuthConsent } from './oauth-consent.mjs';

const id = 'authid_0123456789012';
const clientId = 'client_123456789';
const baseEnv = {
  CAPITAL_AI_OAUTH_SERVER_CONSENT_ENABLED: 'true',
  CAPITAL_AI_OAUTH_ALLOWED_CLIENT_IDS: clientId,
  PUBLIC_APP_ORIGIN: 'https://capital-ai.online',
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_123',
};

async function harness({ env = {}, loggedIn = true, verify = true, details = null, fail = false, target = 'https://client.example/callback?code=a' } = {}) {
  const calls = [];
  const auth = {
    verify: async () => loggedIn && verify ? { userId: 'test-user' } : null,
    internalAccessToken: async () => loggedIn ? 'test-user-access-token' : null,
  };
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), method: options.method, body: options.body, jwt: options.headers.Authorization });
    if (fail) return new Response('{}', { status: 404 });
    if (options.method === 'POST') return Response.json({ redirect_url: target });
    return Response.json(details ?? {
      authorization_id: id,
      client: { id: clientId, name: '<script>alert(1)</script>' },
      redirect_uri: 'https://client.example/cb',
      scope: 'openid email',
    });
  };
  const bridge = createOAuthConsent({ env: { ...baseEnv, ...env }, auth, fetchImpl });
  const server = createServer((req, res) => bridge.handle(req, res, new URL(req.url, 'http://localhost')));
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  return { calls, request: (path, opts = {}) => fetch(url + path, { redirect: 'manual', ...opts }), close: () => new Promise(resolve => server.close(resolve)) };
}

test('disabled means no consent UI or upstream requests', async () => {
  const h = await harness({ env: { CAPITAL_AI_OAUTH_SERVER_CONSENT_ENABLED: 'false' } });
  try { assert.equal((await h.request(`/oauth/consent?authorization_id=${id}`)).status, 404); assert.equal(h.calls.length, 0); } finally { await h.close(); }
});

test('missing client allowlist fails closed', async () => {
  const h = await harness({ env: { CAPITAL_AI_OAUTH_ALLOWED_CLIENT_IDS: '' } });
  try { assert.equal((await h.request(`/oauth/consent?authorization_id=${id}`)).status, 503); assert.equal(h.calls.length, 0); } finally { await h.close(); }
});

test('invalid authorization_id rejects before using user token', async () => {
  const h = await harness();
  try { assert.equal((await h.request('/oauth/consent?authorization_id=%2F%2Fbad')).status, 400); assert.equal(h.calls.length, 0); } finally { await h.close(); }
});

test('unauthenticated GET redirects only to same origin login with opaque id', async () => {
  const h = await harness({ loggedIn: false });
  try {
    const r = await h.request(`/oauth/consent?authorization_id=${id}`);
    assert.equal(r.status, 303);
    assert.equal(r.headers.get('location'), `/login?next=${encodeURIComponent('/oauth/consent?authorization_id=' + id)}`);
    assert.equal(h.calls.length, 0);
  } finally { await h.close(); }
});

test('GET renders sanitized consent only for allowlisted client', async () => {
  const h = await harness();
  try {
    const r = await h.request(`/oauth/consent?authorization_id=${id}`);
    const body = await r.text();
    assert.equal(r.status, 200);
    assert.match(body, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.doesNotMatch(body, /<script>/);
    assert.match(body, /openid/);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.equal(h.calls[0].jwt, 'Bearer test-user-access-token');
    assert.doesNotMatch(body, /test-user-access-token/);
  } finally { await h.close(); }
});

test('unlisted OAuth client denied without allowing approval', async () => {
  const h = await harness({ details: { authorization_id: id, client: { id: 'unknown_client_1234', name: 'Unknown' }, scope: 'openid' } });
  try { assert.equal((await h.request(`/oauth/consent?authorization_id=${id}`)).status, 403); assert.equal(h.calls.length, 1); } finally { await h.close(); }
});

test('POST checks exact browser Origin and rejects cross-origin consent', async () => {
  const h = await harness();
  try {
    const r = await h.request('/oauth/consent', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', origin: 'https://attacker.example' }, body: `authorization_id=${id}&decision=approve` });
    assert.equal(r.status, 403);
    assert.equal(h.calls.length, 0);
  } finally { await h.close(); }
});

test('POST approve rechecks client and redirects only after upstream consent', async () => {
  const h = await harness();
  try {
    const r = await h.request('/oauth/consent', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', origin: 'https://capital-ai.online' }, body: `authorization_id=${id}&decision=approve` });
    assert.equal(r.status, 303);
    assert.equal(r.headers.get('location'), 'https://client.example/callback?code=a');
    assert.deepEqual(h.calls.map(x => x.method), ['GET','POST']);
    assert.equal(JSON.parse(h.calls[1].body).action, 'approve');
  } finally { await h.close(); }
});

test('POST deny is sent as deny; malformed decision gets rejected without granting', async () => {
  const h = await harness();
  try {
    for (const decision of ['deny', 'surprise']) {
      const r = await h.request('/oauth/consent', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', origin: 'https://capital-ai.online' }, body: `authorization_id=${id}&decision=${decision}` });
      assert.equal(r.status, decision === 'deny' ? 303 : 400);
    }
    assert.deepEqual(h.calls.map(x => x.method), ['GET','POST','GET']);
    assert.equal(JSON.parse(h.calls[1].body).action, 'deny');
  } finally { await h.close(); }
});

test('backend rejects unsafe HTTP redirect, even on apparently successful response', async () => {
  const h = await harness({ target: 'http://attacker.example/capture' });
  try {
    const r = await h.request('/oauth/consent', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', origin: 'https://capital-ai.online' }, body: `authorization_id=${id}&decision=approve` });
    assert.equal(r.status, 502);
    assert.equal(r.headers.get('location'), null);
  } finally { await h.close(); }
});

test('already consented direct redirect is accepted only from trusted provider response', async () => {
  const h = await harness({ details: { redirect_url: 'https://client.example/cb?code=abc' } });
  try {
    const r = await h.request(`/oauth/consent?authorization_id=${id}`);
    assert.equal(r.status, 303);
    assert.equal(r.headers.get('location'), 'https://client.example/cb?code=abc');
  } finally { await h.close(); }
});

test('upstream failure cannot become consent or a successful authorization', async () => {
  const h = await harness({ fail: true });
  try { assert.equal((await h.request(`/oauth/consent?authorization_id=${id}`)).status, 502); } finally { await h.close(); }
});
