import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createRenderOwnerDashboard } from './render-owner-dashboard.mjs';

const ownerId = '11111111-1111-4111-8111-111111111111';
const env = {
  CAPITAL_AI_RENDER_OWNER_USER_ID: ownerId,
  CAPITAL_AI_RENDER_OWNER_EMAIL: 'owner@example.test',
  KRAKEN_API_KEY: 'fixture_public_id',
  KRAKEN_API_SECRET: 'fixture_private_token',
  MASSIVE_API_KEY: 'fixture_massive_token',
};

function harness({ identity = { userId: ownerId, email: 'owner@example.test', emailVerified: true },
  role = true, origin = true, vars = env, fetchImpl = async () => { throw Error('unexpected'); } } = {}) {
  let externalCalls = 0;
  const dashboard = createRenderOwnerDashboard({
    env: vars,
    auth: { verify: async () => identity, authorizeIamRole: async () => role, sameOrigin: () => origin },
    fetchImpl: (...params) => { externalCalls++; return fetchImpl(...params); },
    now: () => 1800000000000,
  });
  async function request(path = '/api/profile/render-owner-dashboard', method = 'GET', payload) {
    const req = Object.assign(Readable.from(payload ? [JSON.stringify(payload)] : []), { method });
    const headers = {};
    const res = { setHeader: (key, value) => { headers[key.toLowerCase()] = value; } };
    let output;
    const handled = await dashboard.handle(req, res, new URL(path, 'https://example.test'),
      (_res, status, body) => { output = { status, body }; });
    return { handled, ...output, headers };
  }
  return { request, externalCalls: () => externalCalls };
}

test('missing owner binding denies all access', async () => {
  const h = harness({ vars: { MASSIVE_API_KEY: 'fixture' } });
  assert.equal((await h.request()).status, 404);
  assert.equal(h.externalCalls(), 0);
});

test('wrong identity, unverified email and missing IAM role are denied', async () => {
  for (const config of [
    { identity: { userId: '22222222-2222-4222-8222-222222222222', email: 'owner@example.test', emailVerified: true } },
    { identity: { userId: ownerId, email: 'other@example.test', emailVerified: true } },
    { identity: { userId: ownerId, email: 'owner@example.test', emailVerified: false } },
    { role: false },
  ]) {
    const h = harness(config);
    assert.equal((await h.request()).status, 404);
    assert.equal((await h.request('/api/profile/render-owner-dashboard/probe', 'POST', { provider: 'massive' })).status, 404);
    assert.equal(h.externalCalls(), 0);
  }
});

test('GET exposes only presence flags, no keys or unrequested upstream calls', async () => {
  const h = harness();
  const res = await h.request();
  assert.equal(res.status, 200);
  assert.equal(res.body.private, true);
  assert.equal(res.body.executionEnabled, false);
  assert.equal(res.body.providers.find(p => p.id === 'massive').status, 'CONFIGURED_UNVERIFIED');
  assert.equal(res.headers['cache-control'], 'private, no-store, max-age=0');
  assert.doesNotMatch(JSON.stringify(res.body), /fixture_/);
  assert.equal(h.externalCalls(), 0);
});

test('read-only preview enforces origin, allowlist, credential header and throttle', async () => {
  const invalidOrigin = harness({ origin: false });
  assert.equal((await invalidOrigin.request('/api/profile/render-owner-dashboard/sample', 'POST',
    { provider: 'massive', symbol: 'AAPL' })).status, 403);
  assert.equal(invalidOrigin.externalCalls(), 0);

  const h = harness({ fetchImpl: async (url, init) => {
    assert.equal(url.origin, 'https://api.massive.com');
    assert.equal(url.pathname, '/v2/aggs/ticker/AAPL/prev');
    assert.equal(init.headers.Authorization, 'Bearer fixture_massive_token');
    assert.equal(url.search.includes('fixture_'), false);
    return Response.json({ status: 'OK', results: [{ t: 1800000000000, c: 100.5, o: 100, h: 101, l: 99 }] });
  } });
  assert.equal((await h.request('/api/profile/render-owner-dashboard/sample', 'GET')).status, 405);
  assert.equal((await h.request('/api/profile/render-owner-dashboard/sample', 'POST',
    { provider: 'massive', symbol: 'https://example.test' })).status, 422);
  const result = await h.request('/api/profile/render-owner-dashboard/sample', 'POST', { provider: 'massive', symbol: 'AAPL' });
  assert.equal(result.status, 200);
  assert.equal(result.body.close, 100.5);
  assert.equal(result.body.dataScope, 'OWNER_PRIVATE');
  assert.equal(result.body.timeSemantics, 'previous_day');
  assert.doesNotMatch(JSON.stringify(result.body), /fixture_/);
  assert.equal((await h.request('/api/profile/render-owner-dashboard/sample', 'POST',
    { provider: 'massive', symbol: 'AAPL' })).status, 429);
  assert.equal(h.externalCalls(), 1);
});
