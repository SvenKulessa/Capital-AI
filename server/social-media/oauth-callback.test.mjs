import test from 'node:test';
import assert from 'node:assert/strict';
import { createSocialOAuthCallback } from './oauth-callback.mjs';

const USER = 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
const STATE = 's'.repeat(43);
const env = { SOCIAL_OAUTH_CALLBACK_ENABLED: 'true', PUBLIC_APP_ORIGIN: 'https://capital-ai.online/' };
function req(method = 'GET') { return { method, headers: {} }; }
function res() {
  return { status: null, body: null, headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    writeHead(status, headers = {}) { this.status = status; Object.assign(this.headers, headers); },
    end(content) { this.body = content ?? ''; },
  };
}
const json = (r, status, body) => { r.status = status; r.body = body; };
function url(q = '') { return new URL('/api/social-media/auth/callback' + q, 'https://capital-ai.online'); }

test('default disabled callback returns 503 without verifying or consuming state', async () => {
  let calls = 0;
  const handler = createSocialOAuthCallback({ env: {}, auth: { verify: () => { calls++; } } });
  const r = res();
  assert.equal(await handler.handle(req(), r, url(), json), true);
  assert.equal(r.status, 503);
  assert.equal(calls, 0);
  assert.equal(r.headers['Referrer-Policy'], 'no-referrer');
});
test('callbacks reject methods, error query and missing state before authentication', async () => {
  let calls = 0;
  const handler = createSocialOAuthCallback({ env,
    exchangeCode: async () => { calls++; }, auth: { verify: () => { calls++; } } });
  for (const [request, target, status] of [
    [req('POST'), url(), 405],
    [req(), url('?channel=X&error=denied'), 400],
    [req(), url('?channel=X&state=weak&code=123'), 400],
  ]) {
    const r = res();
    await handler.handle(request, r, target, json);
    assert.equal(r.status, status);
  }
  assert.equal(calls, 0);
});
test('OAuth requires verified user from existing Supabase auth, not query-string user', async () => {
  let called = 0;
  const handler = createSocialOAuthCallback({ env,
    auth: { verify: async () => null },
    store: { consumeOAuthCallback: async () => { called++; } },
    exchangeCode: async () => { called++; } });
  const r = res();
  await handler.handle(req(), r,
    url('?channel=X&state=' + STATE + '&code=abc&userId=' + USER), json);
  assert.equal(r.status, 401);
  assert.equal(called, 0);
});
test('verified callback enforces exact identity and endpoint; no token in reply', async () => {
  const records = [];
  const handler = createSocialOAuthCallback({ env,
    auth: { verify: async () => ({ userId: USER }) },
    store: { consumeOAuthCallback: async args => {
      records.push(args);
      await args.exchangeCode({ userId: USER, channel: 'X',
        redirectUri: args.redirectUri, code: 'secret', codeVerifier: 'v'.repeat(43) });
      return { consumed: true, platform: 'x' };
    } },
    exchangeCode: async args => { records.push({ exchanged: args.channel }); } });
  const r = res();
  await handler.handle(req(), r, url('?channel=X&state=' + STATE + '&code=confidential'), json);
  assert.equal(r.status, 204);
  assert.equal(r.body, '');
  assert.equal(records[0].userId, USER);
  assert.equal(records[0].redirectUri, 'https://capital-ai.online/api/social-media/auth/callback');
  assert.deepEqual(records[0].allowedRedirectUris, [records[0].redirectUri]);
  assert.deepEqual(records[1], { exchanged: 'X' });
});
test('callback fail-closed on exchange/storage failures without reflecting code', async () => {
  const handler = createSocialOAuthCallback({ env,
    auth: { verify: async () => ({ userId: USER }) },
    store: { consumeOAuthCallback: async () => { throw Error('confidential token'); } },
    exchangeCode: async () => {} });
  const r = res();
  await handler.handle(req(), r, url('?channel=YOUTUBE&state=' + STATE + '&code=SECRET_CODE'), json);
  assert.equal(r.status, 503);
  assert.ok(!JSON.stringify(r.body).includes('SECRET'));
});
