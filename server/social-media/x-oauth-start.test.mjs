import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createSocialXOAuthStart } from './x-oauth-start.mjs';

const USER = 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
const PATH = '/api/social-media/x/auth/start';
const ENV = {
  SOCIAL_X_OAUTH_CONNECT_ENABLED: 'true',
  SOCIAL_X_OAUTH_CLIENT_ID: 'test-public-client-id',
  PUBLIC_APP_ORIGIN: 'https://capital-ai.online/',
  SOCIAL_X_OAUTH_CLIENT_SECRET: 'test-confidential-secret',
  SOCIAL_X_TOKEN_ENCRYPTION_KEY: 'aa'.repeat(32),
  SOCIAL_OAUTH_CALLBACK_ENABLED: 'true',
  SUPABASE_URL: 'https://fixture.supabase.co/',
  SUPABASE_SECRET_KEY: 'sb_secret_synthetic_fixture_only',
};
const url = () => new URL(PATH, 'https://capital-ai.online');
const req = (site = 'same-origin', method = 'GET') =>
  ({ method, headers: { 'sec-fetch-site': site } });
const json = (res, status, data) => { res.status = status; res.body = data; };
function res() {
  return {
    status: null, headers: {}, body: null,
    setHeader(k, v) { this.headers[k] = v; },
    writeHead(status, extra = {}) { this.status = status; Object.assign(this.headers, extra); },
    end() { this.body = ''; },
  };
}

test('X OAuth remains disabled and never generates provider states by default', async () => {
  let issued = 0;
  const handler = createSocialXOAuthStart({
    env: {}, auth: { verify() { issued++; return { userId: USER }; } },
    store: { beginOAuth() { issued++; } },
  });
  const r = res();
  assert.equal(await handler.handle(req(), r, url(), json), true);
  assert.equal(r.status, 503);
  assert.equal(issued, 0);
  assert.equal(r.headers['Cache-Control'], 'no-store');
});

test('OAuth start uses verified user, server-only PKCE and exact callback origin', async () => {
  const saved = [];
  const handler = createSocialXOAuthStart({
    env: ENV, auth: { verify: async () => ({ userId: USER, emailVerified: true }),
      authorizeIamRole: async () => true },
    store: { beginOAuth: async input => {
      saved.push(input);
      return { state: 'a'.repeat(43) };
    } },
  });
  const r = res();
  await handler.handle(req(), r, url(), json);
  assert.equal(r.status, 303);
  const authorize = new URL(r.headers.Location);
  assert.equal(authorize.origin, 'https://x.com');
  assert.equal(authorize.pathname, '/i/oauth2/authorize');
  assert.equal(authorize.searchParams.get('response_type'), 'code');
  assert.equal(authorize.searchParams.get('client_id'), ENV.SOCIAL_X_OAUTH_CLIENT_ID);
  assert.equal(authorize.searchParams.get('redirect_uri'),
    'https://capital-ai.online/api/social-media/auth/callback');
  assert.equal(authorize.searchParams.get('scope'),
    'tweet.read tweet.write users.read offline.access');
  assert.equal(authorize.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(authorize.searchParams.get('state'), 'a'.repeat(43));
  assert.equal(saved.length, 1);
  assert.equal(saved[0].userId, USER);
  assert.equal(saved[0].channel, 'X');
  assert.ok(/^[A-Za-z0-9_-]{43}$/.test(saved[0].codeVerifier));
  const expected = createHash('sha256').update(saved[0].codeVerifier).digest('base64url');
  assert.equal(authorize.searchParams.get('code_challenge'), expected);
  assert.ok(!r.headers.Location.includes(saved[0].codeVerifier));
});

test('cross-site request, missing login and unsafe method do not issue state', async () => {
  let stateCount = 0;
  const handler = createSocialXOAuthStart({
    env: ENV, auth: { verify: async () => null },
    store: { beginOAuth: async () => { stateCount++; } },
  });
  for (const [request, status] of [[req('cross-site'), 403], [req('same-origin', 'POST'), 405],
    [req(), 401], [req(null), 403]]) {
    const r = res();
    await handler.handle(request, r, url(), json);
    assert.equal(r.status, status);
  }
  assert.equal(stateCount, 0);
});

test('untrusted origin or failed state persistence never redirects', async () => {
  for (const env of [
    { ...ENV, PUBLIC_APP_ORIGIN: 'http://capital-ai.online/' },
    { ...ENV, PUBLIC_APP_ORIGIN: 'https://capital-ai.online/redirect' },
    { ...ENV, PUBLIC_APP_ORIGIN: 'https://capital-ai.online/?x=1' },
    ENV,
  ]) {
    const handler = createSocialXOAuthStart({
      env, auth: { verify: async () => ({ userId: USER, emailVerified: true }),
        authorizeIamRole: async () => true },
      store: { beginOAuth: async () => { throw new Error('do not reflect secrets'); } },
    });
    const r = res();
    await handler.handle(req(), r, url(), json);
    assert.equal(r.status, 503);
    assert.ok(!JSON.stringify(r.body).includes('secrets'));
    assert.equal(r.headers.Location, undefined);
  }
});

test('X OAuth start denies non-owner role or unverified email before state issuance', async () => {
  let issued = 0;
  for (const identity of [
    { userId: USER, emailVerified: false },
    { userId: USER, emailVerified: true },
  ]) {
    const handler = createSocialXOAuthStart({
      env: ENV, auth: { verify: async () => identity,
        authorizeIamRole: async () => false },
      store: { beginOAuth: async () => { issued++; } },
    });
    const r = res();
    await handler.handle(req(), r, url(), json);
    assert.equal(r.status, 403);
  }
  assert.equal(issued, 0);
});

test('no route interception outside the explicit X OAuth start path', async () => {
  const handler = createSocialXOAuthStart({ env: ENV });
  assert.equal(await handler.handle(req(), res(),
    new URL('/api/social-media/auth/callback', 'https://capital-ai.online'), json), false);
});


 
test('verified owner sees only a sanitized diagnostic if Render Edge workload key is absent', async () => {
  let fetched = 0;
  const env = { ...ENV, SOCIAL_X_EDGE_STORE_ENABLED: 'true',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic_only_for_tests',
    SUPABASE_SECRET_KEY: undefined };
  const handler = createSocialXOAuthStart({
    env,
    auth: { verify: async () => ({ userId: USER, emailVerified: true }),
      authorizeIamRole: async () => true,
      internalAccessToken: async () => 'synthetic-token-' + 'j'.repeat(90) },
    fetchImpl: async () => { fetched++; throw Error('internal-only-provider-secret'); },
  });
  const r = res();
  await handler.handle(req(), r, url(), json);
  assert.equal(r.status, 503);
  assert.deepEqual(r.body, { error: 'social_x_oauth_unavailable',
    diagnostic: 'edge_workload_key_invalid' });
  assert.equal(fetched, 0);
  assert.equal(r.headers.Location, undefined);
});

test('verified owner distinguishes unavailable session token from Edge request rejection', async () => {
  const env = { ...ENV, SOCIAL_X_EDGE_STORE_ENABLED: 'true',
    SOCIAL_X_EDGE_WORKLOAD_SECRET: 'ab'.repeat(32),
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic_only_for_tests',
    SUPABASE_SECRET_KEY: undefined };
  for (const scenario of [
    { token: null, diagnostic: 'edge_owner_session_token_unavailable', expectedFetches: 0 },
    { token: 'synthetic-token-' + 'j'.repeat(90),
      diagnostic: 'edge_request_rejected', expectedFetches: 1 },
  ]) {
    let fetched = 0;
    const handler = createSocialXOAuthStart({
      env,
      auth: { verify: async () => ({ userId: USER, emailVerified: true }),
        authorizeIamRole: async () => true,
        internalAccessToken: async () => scenario.token },
      fetchImpl: async () => { fetched++; return { ok: false, status: 403,
        text: async () => 'Sensitive provider response must never be exposed' }; },
    });
    const r = res();
    await handler.handle(req(), r, url(), json);
    assert.equal(r.status, 503);
    assert.deepEqual(r.body, { error: 'social_x_oauth_unavailable',
      diagnostic: scenario.diagnostic });
    assert.equal(fetched, scenario.expectedFetches);
    assert.ok(!JSON.stringify(r.body).includes('Sensitive'));
    assert.ok(!JSON.stringify(r.body).includes('synthetic-token'));
  }
});

test('owner start hides arbitrary exception contents and blocks non-owner diagnostics', async () => {
  const secret = 'internal-only-provider-secret';
  const elevated = createSocialXOAuthStart({
    env: ENV,
    auth: { verify: async () => ({ userId: USER, emailVerified: true }),
      authorizeIamRole: async () => true },
    store: { beginOAuth: async () => { throw new Error(secret); } },
  });
  const a = res();
  await elevated.handle(req(), a, url(), json);
  assert.deepEqual(a.body, { error: 'social_x_oauth_unavailable',
    diagnostic: 'internal_unclassified' });
  assert.ok(!JSON.stringify(a.body).includes(secret));

  let called = 0;
  const nonowner = createSocialXOAuthStart({
    env: ENV,
    auth: { verify: async () => ({ userId: USER, emailVerified: true }),
      authorizeIamRole: async () => false,
      internalAccessToken: async () => { called++; return secret; } },
    store: { beginOAuth: async () => { called++; } },
  });
  const b = res();
  await nonowner.handle(req(), b, url(), json);
  assert.equal(b.status, 403);
  assert.equal(b.body.diagnostic, undefined);
  assert.equal(called, 0);
});
