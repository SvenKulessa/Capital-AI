import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthSecurity } from './auth-security.mjs';

const tokenHash = 'A'.repeat(48);
const factorId = '11111111-1111-4111-8111-111111111111';
const challengeId = '22222222-2222-4222-8222-222222222222';

function responseHarness() {
  return {
    status: 0,
    headers: new Map(),
    ended: false,
    setHeader(name, value) { this.headers.set(String(name).toLowerCase(), value); },
    getHeader(name) { return this.headers.get(String(name).toLowerCase()); },
    writeHead(status, headers = {}) {
      this.status = status;
      for (const [key, value] of Object.entries(headers)) this.headers.set(key.toLowerCase(), value);
    },
    end() { this.ended = true; },
  };
}

function json(res, status, payload) {
  res.status = status;
  res.payload = payload;
  res.ended = true;
}

function securityHarness({ factor = true, factorStatus = 'verified' } = {}) {
  const writes = [];
  const calls = [];
  const user = {
    id: 'user-1',
    email: 'user@example.test',
    factors: factor
      ? [{ id: factorId, factor_type: 'totp', status: factorStatus, friendly_name: factorStatus === 'verified' ? 'Authenticator' : 'CAPITAL-AI Authenticator' }]
      : [],
  };
  const token = {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    user: { id: 'user-1', email: 'user@example.test' },
  };

  const authRequest = async (_config, path, options = {}) => {
    calls.push({ path, options });
    if (path === '/verify') return { response: new Response('{}', { status: 200 }), data: structuredClone(token) };
    if (path === '/user') return { response: new Response('{}', { status: 200 }), data: structuredClone(user) };
    if (path === '/passkeys/authentication/options') {
      return {
        response: new Response('{}', { status: 200 }),
        data: { challenge_id: challengeId, options: { challenge: 'abc' }, expires_at: 9999999999 },
      };
    }
    if (path === '/passkeys/authentication/verify') {
      return { response: new Response('{}', { status: 200 }), data: structuredClone(token) };
    }
    if (path === '/passkeys') {
      return { response: new Response('{}', { status: 200 }), data: [] };
    }
    if (path === `/factors/${factorId}` && options.method === 'DELETE') {
      return { response: new Response(null, { status: 204 }), data: null };
    }
    if (path === '/factors' && options.method === 'POST') {
      return {
        response: new Response('{}', { status: 200 }),
        data: {
          id: challengeId,
          friendly_name: options.body?.friendly_name || 'CAPITAL-AI Authenticator',
          totp: { qr_code: '<svg></svg>', secret: 'TESTSECRET0123456', uri: 'otpauth://totp/test' },
        },
      };
    }
    throw new Error(`Unexpected path: ${path}`);
  };

  const security = createAuthSecurity({
    getConfig: () => ({ url: 'https://project.supabase.co', publishableKey: 'publishable' }),
    authRequest,
    resolveSession: async () => ({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'user-1' },
    }),
    writeSessionCookies: (_req, _res, _config, value) => {
      writes.push(value);
      return { user: { id: value.user.id, name: 'User' } };
    },
    clearSessionCookies: () => {},
    readRequestJson: async req => req.body || {},
    sameOrigin: req => req.headers?.origin === 'https://capital-ai.online',
    audit: () => {},
  });

  return { security, writes, calls };
}

test('magic-link verification with verified TOTP cannot bypass AAL2 challenge', async () => {
  const h = securityHarness({ factor: true });
  const res = responseHarness();
  const handled = await h.security.handle(
    { method: 'GET', headers: {} },
    res,
    new URL(`https://capital-ai.online/api/auth/email/verify?token_hash=${tokenHash}&type=magiclink`),
    json,
  );
  assert.equal(handled, true);
  assert.equal(res.status, 303);
  assert.equal(res.getHeader('location'), '/login?mfa=1');
  assert.equal(h.writes.length, 1);
  assert.deepEqual(h.calls.map(call => call.path), ['/verify', '/user']);
});

test('recovery token creates bounded reset session without forcing profile navigation', async () => {
  const h = securityHarness({ factor: true });
  const res = responseHarness();
  await h.security.handle(
    { method: 'GET', headers: {} },
    res,
    new URL(`https://capital-ai.online/api/auth/email/verify?token_hash=${tokenHash}&type=recovery`),
    json,
  );
  assert.equal(res.status, 303);
  assert.equal(res.getHeader('location'), '/login?mode=reset');
  assert.equal(h.writes.length, 1);
});

test('passkey login performs fresh user-factor readback before deciding MFA requirement', async () => {
  const h = securityHarness({ factor: true });
  const res = responseHarness();
  await h.security.handle(
    {
      method: 'POST',
      headers: { origin: 'https://capital-ai.online' },
      body: {
        challengeId,
        credential: { id: 'credential', type: 'public-key', response: { clientDataJSON: 'abc' } },
      },
    },
    res,
    new URL('https://capital-ai.online/api/auth/passkey/verify'),
    json,
  );
  assert.equal(res.status, 200);
  assert.equal(res.payload.authenticated, true);
  assert.equal(res.payload.mfaRequired, true);
  assert.equal(res.payload.next, '/login?mfa=1');
  assert.deepEqual(h.calls.map(call => call.path), ['/passkeys/authentication/verify', '/user']);
  assert.doesNotMatch(JSON.stringify(res.payload), /access-token|refresh-token/);
});

test('passkey and TOTP mutations remain same-origin protected', async () => {
  const h = securityHarness({ factor: false });
  const res = responseHarness();
  await h.security.handle(
    { method: 'POST', headers: { origin: 'https://attacker.example' }, body: {} },
    res,
    new URL('https://capital-ai.online/api/auth/passkey/options'),
    json,
  );
  assert.equal(res.status, 403);
  assert.equal(h.calls.length, 0);
});

test('authenticated factor and passkey reads tolerate missing Origin but reject explicit cross-site reads', async () => {
  const h = securityHarness({ factor: true });

  for (const path of ['/api/auth/mfa/factors', '/api/auth/passkeys']) {
    const allowed = responseHarness();
    await h.security.handle(
      { method: 'GET', headers: { 'sec-fetch-site': 'same-origin' } },
      allowed,
      new URL('https://capital-ai.online' + path),
      json,
    );
    assert.equal(allowed.status, 200, path);

    const blocked = responseHarness();
    await h.security.handle(
      { method: 'GET', headers: { origin: 'https://attacker.example', 'sec-fetch-site': 'cross-site' } },
      blocked,
      new URL('https://capital-ai.online' + path),
      json,
    );
    assert.equal(blocked.status, 403, path);
    assert.equal(blocked.payload.error, 'forbidden_origin');
  }
});

test('TOTP factor projection exposes pending state so incomplete enrollment can be removed', async () => {
  const h = securityHarness({ factor: true, factorStatus: 'unverified' });
  const res = responseHarness();
  await h.security.handle(
    { method: 'GET', headers: { 'sec-fetch-site': 'same-origin' } },
    res,
    new URL('https://capital-ai.online/api/auth/mfa/factors'),
    json,
  );
  assert.equal(res.status, 200);
  assert.equal(res.payload.factors.length, 1);
  assert.equal(res.payload.factors[0].status, 'unverified');
});

test('TOTP reenrollment removes only same-name pending factor before creating replacement', async () => {
  const h = securityHarness({ factor: true, factorStatus: 'unverified' });
  const res = responseHarness();
  await h.security.handle(
    {
      method: 'POST',
      headers: { origin: 'https://capital-ai.online' },
      body: { friendlyName: 'CAPITAL-AI Authenticator' },
    },
    res,
    new URL('https://capital-ai.online/api/auth/mfa/totp/enroll'),
    json,
  );
  assert.equal(res.status, 200);
  assert.deepEqual(
    h.calls.map(call => [call.path, call.options.method || 'GET']),
    [
      ['/user', 'GET'],
      [`/factors/${factorId}`, 'DELETE'],
      ['/factors', 'POST'],
    ],
  );
  assert.equal(res.payload.secret, 'TESTSECRET0123456');
});
