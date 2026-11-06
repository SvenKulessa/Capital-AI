/**
 * Focused password-auth isolation and regression tests for Issue #560.
 * Complements the larger harness in auth.test.mjs.
 * No production settings are mutated; leaked-password protection stays REVIEW_REQUIRED.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from './index.mjs';

async function minimalHarness() {
  const env = {
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    SUPABASE_SECRET_KEY: 'sb_secret_test_0123456789012345678901234567890123456789',
    AUTH_COOKIE_SIGNING_SECRET: 'test-cookie-signing-secret-0123456789abcdef',
    PUBLIC_APP_ORIGIN: 'https://capital.example',
  };

  const state = { subject: 'user-a', tokenCalls: 0 };
  const tokenUsers = new Map();

  const user = () => ({
    id: state.subject,
    email: `${state.subject}@example.test`,
    user_metadata: { full_name: state.subject },
  });

  const upstream = async (url, options = {}) => {
    const target = new URL(String(url));
    if (target.origin !== 'https://project.supabase.co') throw new Error('unexpected origin');

    if (target.pathname === '/auth/v1/token' && target.searchParams.get('grant_type') === 'password') {
      state.tokenCalls += 1;
      const body = JSON.parse(String(options.body || '{}'));
      if (!body.email || !body.password) return Response.json({ error: 'invalid' }, { status: 400 });
      const accessToken = `access-${state.subject}-${state.tokenCalls}`;
      tokenUsers.set(accessToken, structuredClone(user()));
      return Response.json({
        access_token: `access-${state.subject}-${state.tokenCalls}`,
        refresh_token: `refresh-${state.subject}-${state.tokenCalls}`,
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: user(),
      });
    }

    if (target.pathname === '/auth/v1/signup') {
      state.signupCalls = (state.signupCalls || 0) + 1;
      return Response.json(user());
    }

    if (target.pathname === '/auth/v1/user') {
      const subject = tokenUsers.get(String(options.headers?.Authorization || '').replace(/^Bearer /, ''));
      return subject ? Response.json(subject) : Response.json({error:'invalid_token'},{status:401});
    }

    if (target.pathname.startsWith('/rest/v1/profiles')) {
      return Response.json([{ id: state.subject, iam_role: 'user' }]);
    }

    if (target.pathname.startsWith('/rest/v1/subscriptions')) {
      return Response.json([{ user_id: state.subject, tier: 'Free', status: 'free' }]);
    }

    throw new Error(`unhandled: ${target.pathname}`);
  };

  const root = await mkdtemp(path.join(tmpdir(), 'pw-auth-'));
  await writeFile(path.join(root, 'index.html'), '<html></html>');
  const server = createApp(root, { env, fetchImpl: upstream });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;

  const request = (url, options = {}) => fetch(base + url, { redirect: 'manual', ...options });

  const stop = async () => {
    server.closeAllConnections();
    await new Promise(r => server.close(r));
    await rm(root, { recursive: true, force: true });
  };

  return { state, request, stop };
}

function sessionCookie(response) {
  const cookies = new Map();
  for (const value of response.headers.getSetCookie()) {
    const [pair] = value.split(';');
    const split = pair.indexOf('=');
    const name = pair.slice(0, split);
    if (!name.startsWith('__Host-capital_session_') && name !== '__Host-capital_session_count') continue;
    if (/Max-Age=0(?:;|$)/i.test(value)) cookies.delete(name);
    else cookies.set(name, pair);
  }
  return [...cookies.values()].join('; ');
}

test('register rejects new passwords shorter than 14 characters (local gate)', async () => {
  const h = await minimalHarness();
  try {
    const res = await h.request('/api/auth/register', {
      method: 'POST',
      headers: { Origin: 'https://capital.example', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test',
        email: 'user-a@example.test',
        password: 'short',
        passwordConfirm: 'short',
        termsAccepted: true,
        privacyAcknowledged: true,
      }),
    });
    assert.equal(res.status, 400);
    assert.equal(h.state.signupCalls || 0, 0, 'upstream signup must not be called');
  } finally {
    await h.stop();
  }
});

test('password login is same-origin only', async () => {
  const h = await minimalHarness();
  try {
    const res = await h.request('/api/auth/login/email', {
      method: 'POST',
      headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user-a@example.test', password: 'valid-password-14' }),
    });
    assert.equal(res.status, 403);
  } finally {
    await h.stop();
  }
});

test('malformed login passwords are rejected before upstream token exchange', async () => {
  const h = await minimalHarness();
  try {
    for (const password of ['', 'x'.repeat(257)]) {
      const res = await h.request('/api/auth/login/email', {method:'POST',headers:{Origin:'https://capital.example','Content-Type':'application/json'},body:JSON.stringify({email:'user-a@example.test',password})});
      assert.equal(res.status,400);
    }
    assert.equal(h.state.tokenCalls,0);
  } finally { await h.stop(); }
});

test('sessions are isolated by subject', async () => {
  const h = await minimalHarness();
  try {
    h.state.subject = 'user-a';
    const loginA = await h.request('/api/auth/login/email', {
      method: 'POST',
      headers: { Origin: 'https://capital.example', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user-a@example.test', password: 'valid-password-14' }),
    });
    assert.equal(loginA.status, 200);
    const cookieA = sessionCookie(loginA);

    h.state.subject = 'user-b';
    const loginB = await h.request('/api/auth/login/email', {
      method: 'POST',
      headers: { Origin: 'https://capital.example', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user-b@example.test', password: 'valid-password-14' }),
    });
    assert.equal(loginB.status, 200);
    const cookieB = sessionCookie(loginB);

    assert.ok(cookieA.includes('__Host-capital_session_0='));
    assert.ok(cookieB.includes('__Host-capital_session_0='));
    assert.notEqual(cookieA, cookieB);
    const sessionB = await h.request('/api/auth/session?userId=user-a', {headers:{cookie:cookieB}});
    assert.equal((await sessionB.json()).user.id, 'user-b');

    const sessionA = await h.request('/api/auth/session', { headers: { cookie: cookieA } });
    const bodyA = await sessionA.json();
    assert.equal(bodyA.authenticated, true);
    assert.equal(bodyA.user.id, 'user-a');

    // Switching subject in the mock does not retroactively change an existing cookie
    h.state.subject = 'user-b';
    const sessionStillA = await h.request('/api/auth/session', { headers: { cookie: cookieA } });
    const bodyStillA = await sessionStillA.json();
    assert.equal(bodyStillA.user.id, 'user-a', 'cookie must remain bound to original subject');
  } finally {
    await h.stop();
  }
});
