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

const DIAGNOSTICS = new URL('/api/social-media/x/account/diagnostics', 'https://capital-ai.online');
const EDGE_ENV = {
  ...ENV,
  PUBLIC_APP_ORIGIN: 'https://capital-ai.online',
  SOCIAL_OAUTH_CALLBACK_ENABLED: 'true',
  SOCIAL_X_OAUTH_CLIENT_ID: 'public-client-id-for-fixtures',
  SOCIAL_X_OAUTH_CLIENT_SECRET: 'synthetic-confidential-secret-do-not-use',
  SOCIAL_X_TOKEN_ENCRYPTION_KEY: 'ab'.repeat(32),
  SOCIAL_X_EDGE_STORE_ENABLED: 'true',
  SOCIAL_X_EDGE_WORKLOAD_SECRET: 'cd'.repeat(32),
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic_public_fixture',
};

test('owner-only diagnostics report boolean config checks without API calls or secret leakage', async () => {
  let calls = 0;
  const handler = createSocialXAccountStatus({ env: EDGE_ENV, auth,
    fetchImpl: async () => { calls++; throw Error('no network permitted'); } });
  const r = res();
  assert.equal(await handler.handle(req(), r, DIAGNOSTICS, json), true);
  assert.equal(r.status, 200);
  assert.equal(r.body.schema, 'CAPITAL_SOCIAL_X_OWNER_DIAGNOSTICS@1');
  assert.equal(r.body.mode, 'EDGE');
  assert.equal(r.body.ready, true);
  assert.deepEqual(Object.values(r.body.checks), Array(9).fill(true));
  assert.equal(r.headers['Cache-Control'], 'private, no-store, max-age=0');
  assert.equal(r.headers['Vary'], 'Cookie');
  assert.equal(calls, 0);
  const serialized = JSON.stringify(r.body);
  for (const secret of [
    EDGE_ENV.SOCIAL_X_OAUTH_CLIENT_ID, EDGE_ENV.SOCIAL_X_OAUTH_CLIENT_SECRET,
    EDGE_ENV.SOCIAL_X_TOKEN_ENCRYPTION_KEY, EDGE_ENV.SOCIAL_X_EDGE_WORKLOAD_SECRET,
    EDGE_ENV.SUPABASE_SECRET_KEY, EDGE_ENV.SUPABASE_PUBLISHABLE_KEY,
  ]) assert.ok(!serialized.includes(secret));
});

test('diagnostics precisely identify rejected X OAuth prerequisites without exposing values', async () => {
  const invalid = [
    ['SOCIAL_X_OAUTH_CLIENT_ID', 'contains spaces', 'xClientId'],
    ['SOCIAL_X_OAUTH_CLIENT_ID', 'id:with-colon', 'xClientId'],
    ['SOCIAL_X_OAUTH_CLIENT_SECRET', '', 'xClientSecret'],
    ['SOCIAL_X_TOKEN_ENCRYPTION_KEY', 'short-random-render-string', 'tokenEncryptionKey'],
    ['SOCIAL_X_EDGE_WORKLOAD_SECRET', 'short-render-secret', 'edgeWorkloadKey'],
    ['SUPABASE_PUBLISHABLE_KEY', '', 'supabaseCredential'],
    ['PUBLIC_APP_ORIGIN', 'https://capital-ai.online/extra', 'appOrigin'],
    ['SUPABASE_URL', 'http://fixture.supabase.co/', 'supabaseUrl'],
    ['SOCIAL_X_OAUTH_CONNECT_ENABLED', 'false', 'oauthConnectEnabled'],
    ['SOCIAL_OAUTH_CALLBACK_ENABLED', 'false', 'oauthCallbackEnabled'],
  ];
  for (const [name, value, check] of invalid) {
    const env = { ...EDGE_ENV, [name]: value };
    if (name === 'SUPABASE_PUBLISHABLE_KEY') {
      delete env.SUPABASE_PUBLISHABLE_KEY;
    }
    const handler = createSocialXAccountStatus({ env, auth,
      fetchImpl: async () => { throw Error('must not fetch'); } });
    const r = res();
    await handler.handle(req(), r, DIAGNOSTICS, json);
    assert.equal(r.status, 200, name);
    assert.equal(r.body.ready, false, name);
    assert.equal(r.body.checks[check], false, name);
    // The empty string is present in every string; boolean false is a valid response field.
    if (value !== '' && value !== 'false') {
      assert.ok(!JSON.stringify(r.body).includes(String(value)), name);
    }
  }
});

test('diagnostics support canonical Render-generated 256-bit Base64 credentials', async () => {
  const env = { ...EDGE_ENV,
    SOCIAL_X_TOKEN_ENCRYPTION_KEY: Buffer.from('ab'.repeat(32), 'hex').toString('base64'),
    SOCIAL_X_EDGE_WORKLOAD_SECRET: Buffer.from('cd'.repeat(32), 'hex').toString('base64') };
  const handler = createSocialXAccountStatus({ env, auth });
  const r = res();
  await handler.handle(req(), r, DIAGNOSTICS, json);
  assert.equal(r.status, 200);
  assert.equal(r.body.ready, true);
  assert.equal(r.body.checks.tokenEncryptionKey, true);
  assert.equal(r.body.checks.edgeWorkloadKey, true);
});

test('diagnostics fail closed and conceal the endpoint from anonymous and nonowners', async () => {
  const denied = [
    { verify: async () => null, authorizeIamRole: async () => true },
    { verify: async () => ({ userId: USER, emailVerified: false }),
      authorizeIamRole: async () => true },
    { verify: async () => ({ userId: USER, emailVerified: true }),
      authorizeIamRole: async () => false },
    { verify: async () => ({ userId: 'not-a-uuid', emailVerified: true }),
      authorizeIamRole: async () => true },
  ];
  for (const a of denied) {
    let requests = 0;
    const handler = createSocialXAccountStatus({ env: EDGE_ENV, auth: a,
      fetchImpl: async () => { requests++; throw Error(); } });
    const r = res();
    await handler.handle(req(), r, DIAGNOSTICS, json);
    assert.equal(r.status, 404);
    assert.deepEqual(r.body, { error: 'not_found' });
    assert.equal(requests, 0);
  }
  const handler = createSocialXAccountStatus({ env: EDGE_ENV, auth });
  const r = res();
  await handler.handle(req('POST'), r, DIAGNOSTICS, json);
  assert.equal(r.status, 405);
  assert.equal(r.body.error, 'method_not_allowed');
});

test('owner diagnostics can report disabled X OAuth even when account status is closed', async () => {
  const handler = createSocialXAccountStatus({ env: {}, auth,
    fetchImpl: async () => { throw Error('no DB'); } });
  const r = res();
  await handler.handle(req(), r, DIAGNOSTICS, json);
  assert.equal(r.status, 200);
  assert.equal(r.body.mode, 'LEGACY');
  assert.equal(r.body.ready, false);
  assert.equal(r.body.checks.oauthConnectEnabled, false);
});
