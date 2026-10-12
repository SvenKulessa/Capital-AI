import test from 'node:test';
import assert from 'node:assert/strict';
import { createSocialXAccountStatus } from './x-account-status.mjs';

const USER = 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
const ENV = {
  SOCIAL_X_OAUTH_CONNECT_ENABLED: 'true',
  SUPABASE_URL: 'https://fixture.supabase.co/',
  SUPABASE_SECRET_KEY: 'sb_secret_synthetic_only',
};
const ROUTE = new URL('/api/social-media/x/account/status', 'https://capital-ai.online');
const auth = { verify: async () => ({ userId: USER, emailVerified: true }),
  authorizeIamRole: async () => true };
const json = (res, status, body) => { res.status = status; res.body = body; };
function req(method = 'GET') { return { method, headers: {} }; }
function res() {
  return { status: null, headers: {}, body: undefined,
    setHeader(k, v) { this.headers[k] = v; } };
}
function fixture(overrides = {}) {
  return { platform: 'x', status: 'connected',
    handle: 'testOwner', external_account_id: '123456789',
    scopes: ['tweet.read', 'users.read', 'tweet.write', 'offline.access'],
    token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), ...overrides };
}
test('X status defaults disabled and never reads database', async () => {
  let n = 0;
  const handler = createSocialXAccountStatus({ env: {}, auth,
    fetchImpl: async () => { n++; } });
  const r = res();
  assert.equal(await handler.handle(req(), r, ROUTE, json), true);
  assert.equal(r.status, 503);
  assert.equal(n, 0);
  assert.equal(r.headers['Cache-Control'], 'no-store');
});
test('X status only reads safe columns for exact owner and never exposes secrets', async () => {
  const recorded = [];
  const handler = createSocialXAccountStatus({ env: ENV, auth,
    fetchImpl: async (target, options) => {
      recorded.push({ url: String(target), options });
      return { ok: true, text: async () => JSON.stringify([fixture()]) };
    } });
  const r = res();
  await handler.handle(req(), r, ROUTE, json);
  assert.equal(r.status, 200);
  assert.equal(r.body.connected, true);
  assert.equal(r.body.handle, '@testOwner');
  assert.equal(r.body.accountId, '123456789');
  assert.equal(recorded.length, 1);
  const u = new URL(recorded[0].url);
  assert.equal(u.origin, 'https://fixture.supabase.co');
  assert.equal(u.searchParams.get('user_id'), 'eq.' + USER);
  assert.equal(u.searchParams.get('platform'), 'eq.x');
  const selected = u.searchParams.get('select');
  assert.ok(!selected.includes('token_encrypted'));
  assert.ok(!JSON.stringify(r.body).includes('sb_secret'));
  assert.equal(recorded[0].options.method, 'GET');
  assert.equal(recorded[0].options.redirect, 'error');
});
test('X status rejects unauthenticated, non-owner or unverified email before database read', async () => {
  for (const a of [
    { verify: async () => null, authorizeIamRole: async () => true },
    { verify: async () => ({ userId: USER, emailVerified: false }),
      authorizeIamRole: async () => true },
    { verify: async () => ({ userId: USER, emailVerified: true }),
      authorizeIamRole: async () => false },
  ]) {
    let requests = 0;
    const handler = createSocialXAccountStatus({ env: ENV, auth: a,
      fetchImpl: async () => { requests++; } });
    const r = res();
    await handler.handle(req(), r, ROUTE, json);
    assert.equal(r.status, 403);
    assert.equal(requests, 0);
  }
});
test('X status expired or disconnected accounts are not represented as active', async () => {
  for (const [account, expected] of [
    [fixture({ token_expires_at: new Date(Date.now() - 3600e3).toISOString() }), 'token_expired'],
    [fixture({ status: 'disconnected' }), 'disconnected'],
  ]) {
    const handler = createSocialXAccountStatus({ env: ENV, auth,
      fetchImpl: async () => ({ ok: true, text: async () => JSON.stringify([account]) }) });
    const r = res();
    await handler.handle(req(), r, ROUTE, json);
    assert.equal(r.status, 200);
    assert.equal(r.body.connected, false);
    assert.equal(r.body.status, expected);
  }
});
test('X status requires all four explicit user OAuth scopes to report a connected account', async () => {
  for (const scopes of [
    ['tweet.read', 'users.read', 'offline.access'],
    ['tweet.read', 'users.read', 'tweet.write'],
    [],
  ]) {
    const handler = createSocialXAccountStatus({ env: ENV, auth,
      fetchImpl: async () => ({ ok: true,
        text: async () => JSON.stringify([fixture({ scopes })]) }) });
    const r = res();
    await handler.handle(req(), r, ROUTE, json);
    assert.equal(r.status, 200);
    assert.equal(r.body.connected, false);
    assert.equal(r.body.status, 'permissions_missing');
    assert.deepEqual(r.body.scopes, []);
  }
});
test('X status fails closed for malformed DB result and unsafe methods', async () => {
  const handler = createSocialXAccountStatus({ env: ENV, auth,
    fetchImpl: async () => ({ ok: true, text: async () => JSON.stringify([
      fixture({ external_account_id: 'bad' })]) }) });
  const bad = res();
  await handler.handle(req(), bad, ROUTE, json);
  assert.equal(bad.status, 503);
  const method = res();
  await handler.handle(req('POST'), method, ROUTE, json);
  assert.equal(method.status, 405);
  assert.equal(await handler.handle(req(), res(),
    new URL('/api/social-media/auth/callback', ROUTE), json), false);
});
