import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { createHash } from 'node:crypto';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from './index.mjs';

async function harness(envOverrides = {}) {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = { ...await exportJWK(publicKey), kid: 'test-key', alg: 'RS256', use: 'sig' };
  const env = { OIDC_ISSUER: 'https://identity.example', PUBLIC_APP_ORIGIN: 'https://capital.example', OIDC_CLIENT_ID: 'test-client', OIDC_CLIENT_SECRET: 'test-only-secret', TELEGRAM_BOT_TOKEN: '12345:offline_test_placeholder_only', TELEGRAM_CHAT_ID: '-100123', TELEGRAM_ALLOWED_SUBJECTS: 'owner-subject', ...envOverrides };
  const state = { subject: 'owner-subject', nonce: '', challenge: '', invalidNonce: false, invalidAudience: false, invalidIssuer: false, invalidSignature: false, expired: false, tokenCalls: 0, deliveries: [] };
  const upstream = async (url, options) => {
    assert.equal(options.redirect, 'error');
    const href = String(url);
    if (href.endsWith('/.well-known/openid-configuration') && state.discoveryFailure) throw new Error('upstream reflected test-only-secret');
    if (href.endsWith('/.well-known/openid-configuration')) return Response.json({ issuer: env.OIDC_ISSUER, authorization_endpoint: 'https://identity.example/authorize', token_endpoint: 'https://identity.example/token', jwks_uri: 'https://identity.example/keys', code_challenge_methods_supported: ['S256'], token_endpoint_auth_methods_supported: ['client_secret_basic'] });
    if (href.endsWith('/keys')) return Response.json({ keys: [jwk] });
    if (href.endsWith('/token')) {
      state.tokenCalls++;
      assert.equal(createHash('sha256').update(options.body.get('code_verifier')).digest('base64url'), state.challenge);
      assert.equal(options.body.get('redirect_uri'), 'https://capital.example/api/auth/callback');
      const token = await new SignJWT({ nonce: state.invalidNonce ? 'wrong' : state.nonce, name: 'Test Owner' }).setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setIssuer(state.invalidIssuer ? 'https://other.example' : env.OIDC_ISSUER).setAudience(state.invalidAudience ? 'wrong' : env.OIDC_CLIENT_ID).setSubject(state.subject).setIssuedAt().setExpirationTime(state.expired ? Math.floor(Date.now() / 1000) - 10 : '10m').sign(privateKey);
      const tampered = token.split('.');
      if (state.invalidSignature) tampered[2] = (tampered[2][0] === 'A' ? 'B' : 'A') + tampered[2].slice(1);
      return Response.json({ id_token: tampered.join('.'), access_token: 'never-return-to-browser' });
    }
    if (href.startsWith('https://api.telegram.org/')) { state.deliveries.push(JSON.parse(options.body)); return Response.json({ ok: true }); }
    throw new Error('Unexpected network access');
  };
  const root = await mkdtemp(path.join(tmpdir(), 'capital-auth-'));
  await writeFile(path.join(root, 'index.html'), '<html>offline</html>');
  const server = createApp(root, { env, fetchImpl: upstream });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (url, options = {}) => fetch(base + url, { redirect: 'manual', ...options });
  const begin = async () => {
    const res = await request('/api/auth/login');
    assert.equal(res.status, 303);
    const target = new URL(res.headers.get('location'));
    state.nonce = target.searchParams.get('nonce'); state.challenge = target.searchParams.get('code_challenge');
    assert.equal(target.searchParams.get('code_challenge_method'), 'S256');
    return { state: target.searchParams.get('state'), browserCookie: res.headers.getSetCookie()[0].split(';')[0] };
  };
  const complete = async () => {
    const start = await begin();
    const res = await request(`/api/auth/callback?state=${start.state}&code=test-code`, { headers: { cookie: start.browserCookie } });
    assert.equal(res.status, 303);
    const cookies = res.headers.getSetCookie();
    const sessionCookie = cookies.find(x => x.startsWith('__Host-capital_session='));
    assert.match(sessionCookie, /HttpOnly; Secure; SameSite=Strict/);
    return sessionCookie.split(';')[0];
  };
  const stop = async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(root, { recursive: true, force: true }); };
  return { state, request, begin, complete, stop };
}

test('unconfigured OIDC fails closed without fake authentication', async () => {
  const h = await harness({ OIDC_CLIENT_ID: '' });
  try {
    assert.equal((await h.request('/api/auth/login')).status, 503);
    assert.deepEqual(await (await h.request('/api/auth/session')).json(), { configured: false, authenticated: false, user: null });
  } finally { await h.stop(); }
});

test('OIDC binds callback to browser, rejects replay, rotates session and protects logout', async () => {
  const h = await harness();
  try {
    const start = await h.begin();
    const url = `/api/auth/callback?state=${start.state}&code=test-code`;
    assert.equal((await h.request(url)).status, 400);
    assert.equal(h.state.tokenCalls, 0);
    const result = await h.request(url, { headers: { cookie: start.browserCookie } });
    assert.equal(result.status, 303);
    let cookie = result.headers.getSetCookie().find(x => x.startsWith('__Host-capital_session=')).split(';')[0];
    assert.equal((await h.request(url, { headers: { cookie: start.browserCookie } })).status, 400);
    const session = await (await h.request('/api/auth/session', { headers: { cookie } })).json();
    assert.equal(session.authenticated, true); assert.equal(session.user.subject, 'owner-subject');
    assert.equal(JSON.stringify(session).includes('access_token'), false);
    const oldCookie = cookie;
    const second = await h.begin();
    const rotated = await h.request(`/api/auth/callback?state=${second.state}&code=test-code`, { headers: { cookie: `${second.browserCookie}; ${oldCookie}` } });
    assert.equal(rotated.status, 303);
    cookie = rotated.headers.getSetCookie().find(x => x.startsWith('__Host-capital_session=')).split(';')[0];
    assert.notEqual(cookie, oldCookie);
    assert.equal((await (await h.request('/api/auth/session', { headers: { cookie: oldCookie } })).json()).authenticated, false);
    assert.equal((await h.request('/api/auth/logout', { method: 'POST', headers: { cookie, origin: 'https://attacker.example' } })).status, 403);
    assert.equal((await h.request('/api/auth/logout', { method: 'POST', headers: { cookie, origin: 'https://capital.example' } })).status, 200);
    assert.equal((await (await h.request('/api/auth/session', { headers: { cookie } })).json()).authenticated, false);
  } finally { await h.stop(); }
});

for (const field of ['invalidNonce', 'invalidAudience', 'invalidIssuer', 'invalidSignature', 'expired']) {
  test(`OIDC rejects signed token with ${field}`, async () => {
    const h = await harness();
    try {
      h.state[field] = true;
      const start = await h.begin();
      assert.equal((await h.request(`/api/auth/callback?state=${start.state}&code=test-code`, { headers: { cookie: start.browserCookie } })).status, 400);
      assert.equal((await (await h.request('/api/auth/session')).json()).authenticated, false);
    } finally { await h.stop(); }
  });
}

test('Telegram requires session and same origin; fixed recipient, plain text, no browser secrets and rate limit', async () => {
  const h = await harness();
  try {
    const send = (body, cookie = '', origin = 'https://capital.example') => h.request('/api/telegram/send', { method: 'POST', headers: { cookie, origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal((await send({ text: 'offline' })).status, 401);
    const cookie = await h.complete();
    assert.equal((await send({ text: 'offline' }, cookie, 'https://attacker.example')).status, 403);
    assert.equal((await send({ text: 'offline', chat_id: 'attacker' }, cookie)).status, 400);
    const result = await send({ text: '<b>Plain text only</b>' }, cookie);
    assert.equal(result.status, 200);
    assert.deepEqual(h.state.deliveries[0], { chat_id: '-100123', text: '<b>Plain text only</b>', disable_web_page_preview: true });
    for (let i = 0; i < 3; i++) assert.equal((await send({ text: 'offline' }, cookie)).status, 200);
    const limited = await send({ text: 'offline' }, cookie);
    assert.equal(limited.status, 429); assert.equal(limited.headers.get('retry-after'), '60');
  } finally { await h.stop(); }
});

test('Telegram authorization is separate from login', async () => {
  const h = await harness({ TELEGRAM_ALLOWED_SUBJECTS: 'other-subject' });
  try {
    const cookie = await h.complete();
    assert.equal((await h.request('/api/telegram/send', { method: 'POST', headers: { cookie, origin: 'https://capital.example', 'Content-Type': 'application/json' }, body: '{"text":"offline"}' })).status, 403);
    assert.equal(h.state.deliveries.length, 0);
  } finally { await h.stop(); }
});

test('Market API has time-based rate limits independent of concurrency and spoofed proxy headers', async () => {
  const h = await harness();
  try {
    for (let i = 0; i < 120; i++) assert.equal((await h.request('/api/market/quote?symbol=INVALID', { headers: { 'X-Forwarded-For': `192.0.2.${i}` } })).status, 400);
    assert.equal((await h.request('/api/market/quote?symbol=INVALID')).status, 429);
  } finally { await h.stop(); }
});

test('privacy export requires verified OIDC, isolates users and never exports credentials', async () => {
  const h = await harness();
  try {
    assert.equal((await h.request('/api/privacy/export')).status, 401);
    assert.equal((await h.request('/api/privacy/export', { headers: { cookie: '__Host-capital_session=forged' } })).status, 401);
    const first = await h.complete();
    h.state.subject = 'second-subject';
    const second = await h.complete();
    for (const [cookie, subject] of [[first, 'owner-subject'], [second, 'second-subject']]) {
      const response = await h.request('/api/privacy/export', { headers: { cookie } });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.match(response.headers.get('content-disposition'), /attachment/);
      const body = await response.json();
      assert.equal(body.subject.subject, subject);
      assert.equal(body.subject.issuer, 'https://identity.example');
      assert.equal(body.unavailableSources.length, 3);
      assert.doesNotMatch(JSON.stringify(body), /test-only-secret|never-return-to-browser|__Host-capital|id_token|access_token|nonce/);
    }
    assert.equal((await h.request('/api/privacy/export?subject=second-subject', { headers: { cookie: first } })).status, 400);
    await h.request('/api/auth/logout', { method: 'POST', headers: { cookie: first, origin: 'https://capital.example' } });
    assert.equal((await h.request('/api/privacy/export', { headers: { cookie: first } })).status, 401);
  } finally { await h.stop(); }
});

test('privacy request is a bounded email draft, never a stored or executed request', async () => {
  const h = await harness();
  try {
    const cookie = await h.complete();
    const send = (body, origin = 'https://capital.example') => h.request('/api/privacy/requests', {
      method: 'POST', headers: { cookie, origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    assert.equal((await send({ requestType: 'erasure' }, 'https://attacker.example')).status, 403);
    assert.equal((await send({ requestType: 'erasure', subject: 'other' })).status, 400);
    assert.equal((await send({ requestType: ['access'] })).status, 400);
    assert.equal((await send({ requestType: 'invalid' })).status, 400);
    assert.equal((await send({ requestType: 'access', details: 'a'.repeat(2001) })).status, 400);
    const response = await send({ requestType: 'erasure', details: 'Text & ?\nkeine Geheimnisse' });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.status, 'email_draft');
    assert.equal(body.persisted, false); assert.equal(body.sent, false);
    const draft = new URL(body.mailto);
    assert.equal(draft.protocol, 'mailto:');
    assert.equal(draft.pathname, 'sven.kulessa@capital-ai.online');
    assert.match(draft.searchParams.get('body'), /owner-subject/);
    assert.ok(draft.searchParams.get('body').includes('Text & ?\nkeine Geheimnisse'));
    assert.equal(h.state.deliveries.length, 0);
    assert.equal((await h.request('/api/privacy/requests', { headers: { cookie } })).status, 405);
    // Four invalid bodies and one valid draft have consumed five attempts.
    // Ten attempts are allowed; the eleventh must be rejected.
    for (let i = 0; i < 5; i++) assert.equal((await send({ requestType: 'access' })).status, 200);
    assert.equal((await send({ requestType: 'access' })).status, 429);
  } finally { await h.stop(); }
});

test('OIDC operational diagnosis reports only a fixed phase without upstream secrets', async () => {
  const h = await harness();
  const original = console.warn, messages = [];
  console.warn = (...args) => messages.push(args.join(' '));
  try {
    h.state.discoveryFailure = true;
    const response = await h.request('/api/auth/login');
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'authentication_failed' });
    assert.deepEqual(messages, ['OIDC authentication failed at discovery']);
    assert.ok(!messages.join('').includes('test-only-secret'));
  } finally { console.warn = original; await h.stop(); }
});
