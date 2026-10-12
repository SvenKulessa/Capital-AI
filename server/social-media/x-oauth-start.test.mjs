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
    env: ENV, auth: { verify: async () => ({ userId: USER }) },
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
    [req(), 401], [req(undefined), 403]]) {
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
      env, auth: { verify: async () => ({ userId: USER }) },
      store: { beginOAuth: async () => { throw new Error('do not reflect secrets'); } },
    });
    const r = res();
    await handler.handle(req(), r, url(), json);
    assert.equal(r.status, 503);
    assert.ok(!JSON.stringify(r.body).includes('secrets'));
    assert.equal(r.headers.Location, undefined);
  }
});

test('no route interception outside the explicit X OAuth start path', async () => {
  const handler = createSocialXOAuthStart({ env: ENV });
  assert.equal(await handler.handle(req(), res(),
    new URL('/api/social-media/auth/callback', 'https://capital-ai.online'), json), false);
});
