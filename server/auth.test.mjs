import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from './index.mjs';

function sessionCookieHeader(response) {
  return response.headers.getSetCookie()
    .filter(value => value.startsWith('__Host-capital_session_'))
    .map(value => value.split(';')[0])
    .join('; ');
}

async function harness(envOverrides = {}) {
  const env = {
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    SUPABASE_SECRET_KEY: 'sb_secret_test_0123456789012345678901234567890123456789',
    AUTH_COOKIE_SIGNING_SECRET: 'test-cookie-signing-secret-0123456789abcdef',
    PUBLIC_APP_ORIGIN: 'https://capital.example',
    TELEGRAM_BOT_TOKEN: '12345:offline_test_placeholder_only',
    TELEGRAM_CHAT_ID: '-100123',
    TELEGRAM_ALLOWED_SUBJECTS: 'owner-subject',
    ...envOverrides,
  };
  const state = {
    subject: 'owner-subject',
    tokenCalls: 0,
    signupCalls: 0,
    refreshCalls: 0,
    challenge: '',
    deliveries: [],
    authAudit: [],
    consentWrites: [],
    rejectConsentWrites: false,
  };

  const user = () => ({
    id: state.subject,
    email: `${state.subject}@example.test`,
    user_metadata: { full_name: state.subject === 'owner-subject' ? 'Test Owner' : 'Second User' },
  });

  const tokenPayload = () => ({
    access_token: `access-${state.subject}-${state.tokenCalls}`,
    refresh_token: `refresh-${state.subject}-${state.tokenCalls}`,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: user(),
  });

  const upstream = async (url, options = {}) => {
    assert.equal(options.redirect, 'error');
    const target = new URL(String(url));

    if (target.origin === 'https://project.supabase.co' && target.pathname === '/auth/v1/token') {
      const grant = target.searchParams.get('grant_type');
      state.tokenCalls += 1;
      if (grant === 'password') {
        const body = JSON.parse(String(options.body || '{}'));
        if (body.password === 'wrong') return Response.json({ error: 'invalid_credentials' }, { status: 400 });
        return Response.json(tokenPayload());
      }
      if (grant === 'pkce') {
        const body = JSON.parse(String(options.body || '{}'));
        assert.equal(body.auth_code, 'test-code');
        assert.equal(createHash('sha256').update(body.code_verifier).digest('base64url'), state.challenge);
        return Response.json(tokenPayload());
      }
      if (grant === 'refresh_token') {
        state.refreshCalls += 1;
        return Response.json(tokenPayload());
      }
      throw new Error(`Unexpected grant: ${grant}`);
    }

    if (target.origin === 'https://project.supabase.co' && target.pathname === '/auth/v1/signup') {
      state.signupCalls += 1;
      const body = JSON.parse(String(options.body || '{}'));
      assert.match(target.searchParams.get('redirect_to') || '', /^https:\/\/capital\.example\/$/);
      assert.equal(body.email, `${state.subject}@example.test`);
      assert.equal(body.data?.full_name, 'Test Owner');
      if (body.password === 'rejected-password') {
        return Response.json({ error: 'signup_rejected' }, { status: 422 });
      }
      return Response.json(tokenPayload());
    }

    if (target.origin === 'https://project.supabase.co' && target.pathname === '/auth/v1/user') {
      assert.match(String(options.headers.Authorization || ''), /^Bearer access-/);
      return Response.json(user());
    }

    if (target.origin === 'https://project.supabase.co' && target.pathname === '/auth/v1/logout') {
      return new Response(null, { status: 204 });
    }

    if (target.origin === 'https://api.telegram.org') {
      state.deliveries.push(JSON.parse(options.body));
      return Response.json({ ok: true });
    }

    if (target.origin === 'https://project.supabase.co' && target.pathname === '/rest/v1/user_consents') {
      assert.equal(options.method, 'POST');
      assert.match(String(options.headers.Authorization || ''), /^Bearer sb_secret_/);
      assert.equal(options.headers.Prefer, 'resolution=ignore-duplicates,return=minimal');
      assert.equal(target.searchParams.get('on_conflict'), 'user_id,consent_type,document_version');
      state.consentWrites.push(JSON.parse(String(options.body)));
      return new Response(null, { status: state.rejectConsentWrites ? 503 : 201 });
    }

    if (target.origin === 'https://project.supabase.co' && target.pathname === '/rest/v1/profiles') {
      assert.match(String(options.headers.Authorization || ''), /^Bearer access-/);
      assert.equal(options.headers.apikey, 'sb_publishable_test');
      assert.equal(target.searchParams.get('id'), `eq.${state.subject}`);
      return Response.json([{ id: state.subject, iam_role: state.subject === 'owner-subject' ? 'owner' : 'user' }]);
    }

    if (target.origin === 'https://project.supabase.co' && target.pathname === '/rest/v1/subscriptions') {
      assert.match(String(options.headers.Authorization || ''), /^Bearer access-/);
      assert.equal(options.headers.apikey, 'sb_publishable_test');
      assert.equal(target.searchParams.get('user_id'), `eq.${state.subject}`);
      return Response.json([{
        user_id: state.subject,
        tier: state.subject === 'owner-subject' ? 'Enterprise' : 'Free',
        status: state.subject === 'owner-subject' ? 'active' : 'free',
        current_period_end: state.subject === 'owner-subject' ? '2026-12-31T00:00:00+00:00' : null,
      }]);
    }

    throw new Error(`Unexpected network access: ${target.href}`);
  };

  const root = await mkdtemp(path.join(tmpdir(), 'capital-auth-'));
  await writeFile(path.join(root, 'index.html'), '<html>offline</html>');
  const server = createApp(root, {
    env,
    fetchImpl: upstream,
    audit: message => state.authAudit.push(String(message)),
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  const request = (url, options = {}) => fetch(base + url, { redirect: 'manual', ...options });

  const completeEmail = async (password = 'valid-password') => {
    const response = await request('/api/auth/login/email', {
      method: 'POST',
      headers: {
        Origin: 'https://capital.example',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: `${state.subject}@example.test`, password }),
    });
    assert.equal(response.status, 200);
    const cookie = sessionCookieHeader(response);
    assert.match(cookie, /__Host-capital_session_count=/);
    assert.match(response.headers.getSetCookie().join('\n'), /HttpOnly; Secure; SameSite=Lax/);
    return cookie;
  };

  const beginGoogle = async (route = '/api/auth/login/google?next=%2F', options = {}) => {
    const response = await request(route, options);
    assert.equal(response.status, 303);
    const target = new URL(response.headers.get('location'));
    assert.equal(target.origin, 'https://project.supabase.co');
    assert.equal(target.pathname, '/auth/v1/authorize');
    assert.equal(target.searchParams.get('provider'), 'google');
    assert.equal(target.searchParams.get('code_challenge_method'), 's256');
    state.challenge = target.searchParams.get('code_challenge');
    const callback = new URL(target.searchParams.get('redirect_to'));
    const pkceCookie = response.headers.getSetCookie()
      .find(value => value.startsWith('__Host-capital_pkce='))
      .split(';')[0];
    return { callback, pkceCookie, target };
  };

  const completeGoogle = async () => {
    const start = await beginGoogle();
    const response = await request(
      `/api/auth/callback?flow=${encodeURIComponent(start.callback.searchParams.get('flow'))}&code=test-code`,
      { headers: { cookie: start.pkceCookie } },
    );
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('location'), '/');
    return sessionCookieHeader(response);
  };

  const stop = async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  };

  return { env, state, request, completeEmail, beginGoogle, completeGoogle, stop };
}

test('unconfigured Supabase auth fails closed without fake authentication', async () => {
  const h = await harness({ SUPABASE_PUBLISHABLE_KEY: '' });
  try {
    assert.equal((await h.request('/api/auth/login')).status, 503);
    assert.deepEqual(await (await h.request('/api/auth/session')).json(), {
      configured: false,
      authenticated: false,
      user: null,
    });
  } finally {
    await h.stop();
  }
});

test('Supabase email login is same-origin, backend-owned and returns a landing-page session', async () => {
  const h = await harness();
  try {
    assert.equal((await h.request('/api/auth/login/email', {
      method: 'POST',
      headers: { Origin: 'https://attacker.example', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner-subject@example.test', password: 'valid-password' }),
    })).status, 403);

    const cookie = await h.completeEmail();
    const sessionResponse = await h.request('/api/auth/session', { headers: { cookie } });
    assert.equal(sessionResponse.status, 200);
    const session = await sessionResponse.json();
    assert.equal(session.authenticated, true);
    assert.equal(session.user.id, 'owner-subject');
    assert.equal(session.user.subject, 'owner-subject');
    assert.equal(session.account.available, true);
    assert.equal(session.account.iamRole, 'owner');
    assert.equal(session.account.subscription.tier, 'Enterprise');
    assert.equal(session.account.subscription.status, 'active');
    assert.deepEqual(session.account.badges, [
      { id: 'enterprise', label: 'ENTERPRISE', asset: '/branding/badges/enterprise.svg' },
      { id: 'owner', label: 'OWNER', asset: '/branding/badges/owner.svg' },
    ]);
    assert.equal(JSON.stringify(session).includes('access-'), false);
    assert.equal(JSON.stringify(session).includes('refresh-'), false);
    assert.deepEqual(h.state.authAudit, ['Supabase authentication verified at password_login']);
  } finally {
    await h.stop();
  }
});

test('Control Center is server-side owner-only and fails closed', async () => {
  const h = await harness();
  try {
    assert.equal((await h.request('/control-center')).status, 404);
    assert.equal((await h.request('/roadmap')).status, 404);

    const ownerCookie = await h.completeEmail();
    assert.equal((await h.request('/control-center', { headers: { cookie: ownerCookie } })).status, 200);
    assert.equal((await h.request('/roadmap', { headers: { cookie: ownerCookie } })).status, 200);

    h.state.subject = 'user-subject';
    const userCookie = await h.completeEmail();
    assert.equal((await h.request('/control-center', { headers: { cookie: userCookie } })).status, 404);
    assert.equal((await h.request('/admin', { headers: { cookie: userCookie } })).status, 404);
    assert.equal((await h.request('/cost-center', { headers: { cookie: userCookie } })).status, 404);
  } finally {
    await h.stop();
  }
});

test('Supabase registration validates new passwords and creates a backend-owned session', async () => {
  const h = await harness();
  try {
    const invalid = await h.request('/api/auth/register', {
      method: 'POST',
      headers: {
        Origin: 'https://capital.example',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Owner',
        email: 'owner-subject@example.test',
        password: 'short',
        passwordConfirm: 'short',
        termsAccepted: true,
        privacyAcknowledged: true,
        marketingConsent: false,
      }),
    });
    assert.equal(invalid.status, 400);
    assert.equal(h.state.signupCalls, 0);

    const mismatch = await h.request('/api/auth/register', {
      method: 'POST',
      headers: {
        Origin: 'https://capital.example',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Owner',
        email: 'owner-subject@example.test',
        password: 'valid-password',
        passwordConfirm: 'different-password',
        termsAccepted: true,
        privacyAcknowledged: true,
        marketingConsent: false,
      }),
    });
    assert.equal(mismatch.status, 400);
    assert.equal((await mismatch.json()).error, 'passwords_do_not_match');
    assert.equal(h.state.signupCalls, 0);

    const missingConsent = await h.request('/api/auth/register', {
      method: 'POST',
      headers: {
        Origin: 'https://capital.example',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Owner',
        email: 'owner-subject@example.test',
        password: 'valid-password',
        passwordConfirm: 'valid-password',
        termsAccepted: false,
        privacyAcknowledged: true,
        marketingConsent: false,
      }),
    });
    assert.equal(missingConsent.status, 400);
    assert.equal((await missingConsent.json()).error, 'registration_consents_required');
    assert.equal(h.state.signupCalls, 0);

    const registered = await h.request('/api/auth/register', {
      method: 'POST',
      headers: {
        Origin: 'https://capital.example',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Owner',
        email: 'owner-subject@example.test',
        password: 'valid-password',
        passwordConfirm: 'valid-password',
        termsAccepted: true,
        privacyAcknowledged: true,
        marketingConsent: false,
      }),
    });
    assert.equal(registered.status, 200);
    const body = await registered.json();
    assert.equal(body.authenticated, true);
    assert.equal(h.state.signupCalls, 1);
    assert.match(sessionCookieHeader(registered), /__Host-capital_session_count=/);
  } finally {
    await h.stop();
  }
});

test('Supabase Google PKCE binds callback to HttpOnly flow state and ends at landing page', async () => {
  const h = await harness();
  try {
    const start = await h.beginGoogle();
    const callbackUrl = `/api/auth/callback?flow=${encodeURIComponent(start.callback.searchParams.get('flow'))}&code=test-code`;
    assert.equal((await h.request(callbackUrl)).status, 400);

    const completed = await h.request(callbackUrl, { headers: { cookie: start.pkceCookie } });
    assert.equal(completed.status, 303);
    assert.equal(completed.headers.get('location'), '/');
    const cookie = sessionCookieHeader(completed);
    assert.match(cookie, /__Host-capital_session_count=/);
    assert.deepEqual(h.state.authAudit, ['Supabase authentication verified at oauth_callback']);
  } finally {
    await h.stop();
  }
});

test('Google OAuth provider denial returns to a safe login error without leaking provider params', async () => {
  const h = await harness();
  try {
    const start = await h.beginGoogle();
    const response = await h.request(
      '/api/auth/callback?error=access_denied&error_description=' + encodeURIComponent('private upstream detail'),
      { headers: { cookie: start.pkceCookie } },
    );
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('location'), '/login?oauth_error=provider_rejected');
    assert.equal(sessionCookieHeader(response), '');
  } finally {
    await h.stop();
  }
});

test('Google signup rejects unconsented or cross-origin requests and records signed consent after verified PKCE', async () => {
  const h = await harness();
  const route = '/api/auth/login/google?next=%2F';
  const data = new URLSearchParams({ registration: 'true', termsAccepted: 'true', privacyAcknowledged: 'true', marketingConsent: 'false' });
  const options = { method: 'POST', headers: { Origin: 'https://capital.example', 'Content-Type': 'application/x-www-form-urlencoded' }, body: data.toString() };
  try {
    assert.equal((await h.request(route, { ...options, headers: { ...options.headers, Origin: 'https://attacker.example' } })).status, 403);
    assert.equal((await h.request(route, { ...options, body: new URLSearchParams({ registration: 'true', termsAccepted: 'false', privacyAcknowledged: 'true' }).toString() })).status, 400);
    assert.equal(h.state.consentWrites.length, 0);

    const start = await h.beginGoogle(route, options);
    const callback = '/api/auth/callback?flow=' + encodeURIComponent(start.callback.searchParams.get('flow')) + '&code=test-code';
    const completed = await h.request(callback, { headers: { cookie: start.pkceCookie } });
    assert.equal(completed.status, 303);
    assert.match(sessionCookieHeader(completed), /__Host-capital_session_count=/);
    assert.deepEqual(h.state.consentWrites[0].map(row => [row.consent_type, row.granted, row.evidence_kind]), [
      ['terms', true, 'contract_acceptance'],
      ['privacy', true, 'acknowledgement'],
      ['marketing', false, 'consent'],
    ]);
    assert.equal(h.state.consentWrites[0].every(row => row.user_id === h.state.subject), true);
  } finally {
    await h.stop();
  }
});

test('Google signup stays fail-closed if consent storage is unavailable', async () => {
  const h = await harness();
  const data = new URLSearchParams({ registration: 'true', termsAccepted: 'true', privacyAcknowledged: 'true' });
  try {
    const start = await h.beginGoogle('/api/auth/login/google', { method: 'POST', headers: { Origin: 'https://capital.example', 'Content-Type': 'application/x-www-form-urlencoded' }, body: data.toString() });
    h.state.rejectConsentWrites = true;
    const callback = '/api/auth/callback?flow=' + encodeURIComponent(start.callback.searchParams.get('flow')) + '&code=test-code';
    const completed = await h.request(callback, { headers: { cookie: start.pkceCookie } });
    assert.equal(completed.status, 503);
    assert.equal((await completed.json()).error, 'registration_consent_persistence_failed');
    assert.equal(sessionCookieHeader(completed), '');
  } finally {
    await h.stop();
  }
});

test('logout rejects cross-origin mutation and clears the backend session', async () => {
  const h = await harness();
  try {
    const cookie = await h.completeEmail();
    assert.equal((await h.request('/api/auth/logout', {
      method: 'POST',
      headers: { cookie, Origin: 'https://attacker.example', 'Content-Type': 'application/json' },
      body: '{}',
    })).status, 403);
    assert.equal((await h.request('/api/auth/logout', {
      method: 'POST',
      headers: { cookie, Origin: 'https://capital.example', 'Content-Type': 'application/json' },
      body: '{}',
    })).status, 200);
  } finally {
    await h.stop();
  }
});

test('Telegram still requires an authenticated Supabase session, same origin and fixed recipient', async () => {
  const h = await harness();
  try {
    const send = (body, cookie = '', origin = 'https://capital.example') => h.request('/api/telegram/send', {
      method: 'POST',
      headers: { cookie, Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    assert.equal((await send({ text: 'offline' })).status, 401);
    const cookie = await h.completeEmail();
    assert.equal((await send({ text: 'offline' }, cookie, 'https://attacker.example')).status, 403);
    assert.equal((await send({ text: 'offline', chat_id: 'attacker' }, cookie)).status, 400);
    assert.equal((await send({ text: '<b>Plain text only</b>' }, cookie)).status, 200);
    assert.deepEqual(h.state.deliveries[0], {
      chat_id: '-100123',
      text: '<b>Plain text only</b>',
      disable_web_page_preview: true,
    });
  } finally {
    await h.stop();
  }
});

test('Telegram authorization remains separate from login identity', async () => {
  const h = await harness({ TELEGRAM_ALLOWED_SUBJECTS: 'other-subject' });
  try {
    const cookie = await h.completeEmail();
    assert.equal((await h.request('/api/telegram/send', {
      method: 'POST',
      headers: { cookie, Origin: 'https://capital.example', 'Content-Type': 'application/json' },
      body: '{"text":"offline"}',
    })).status, 403);
    assert.equal(h.state.deliveries.length, 0);
  } finally {
    await h.stop();
  }
});

test('privacy export is isolated by the verified Supabase user and never exports session credentials', async () => {
  const h = await harness();
  try {
    assert.equal((await h.request('/api/privacy/export')).status, 401);
    const first = await h.completeEmail();
    h.state.subject = 'second-subject';
    const second = await h.completeEmail();

    for (const [cookie, subject] of [[first, 'owner-subject'], [second, 'second-subject']]) {
      const response = await h.request('/api/privacy/export', { headers: { cookie } });
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.subject.subject, subject);
      assert.equal(body.subject.issuer, 'https://project.supabase.co/auth/v1');
      assert.doesNotMatch(JSON.stringify(body), /access-|refresh-|sb_secret|__Host-capital/);
    }
  } finally {
    await h.stop();
  }
});

test('privacy request remains bounded and same-origin after Supabase migration', async () => {
  const h = await harness();
  try {
    const cookie = await h.completeEmail();
    const send = (body, origin = 'https://capital.example') => h.request('/api/privacy/requests', {
      method: 'POST',
      headers: { cookie, Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    assert.equal((await send({ requestType: 'erasure' }, 'https://attacker.example')).status, 403);
    assert.equal((await send({ requestType: 'access', details: 'a'.repeat(2001) })).status, 400);
    const response = await send({ requestType: 'erasure', details: 'Keine Geheimnisse' });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.status, 'email_draft');
    assert.equal(body.persisted, false);
    assert.equal(body.sent, false);
  } finally {
    await h.stop();
  }
});

test('mobile login keeps one-time verifier-bound transfer while using Supabase OAuth', async () => {
  const h = await harness();
  try {
    const verifier = 'm'.repeat(43);
    const transferChallenge = createHash('sha256').update(verifier).digest('base64url');
    const start = await h.beginGoogle('/api/auth/mobile-login?challenge=' + encodeURIComponent(transferChallenge));
    const callback = await h.request(
      `/api/auth/callback?flow=${encodeURIComponent(start.callback.searchParams.get('flow'))}&code=test-code`,
      { headers: { cookie: start.pkceCookie } },
    );
    assert.equal(callback.status, 303);
    const appRedirect = new URL(callback.headers.get('location'));
    assert.equal(appRedirect.protocol, 'capitalai-private:');
    assert.equal(appRedirect.hostname, 'auth');
    assert.equal(appRedirect.pathname, '/callback');
    const code = appRedirect.searchParams.get('code');
    assert.match(code, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(sessionCookieHeader(callback), '');

    const exchange = await h.request('/api/auth/mobile-exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, verifier }).toString(),
    });
    assert.equal(exchange.status, 303);
    assert.equal(exchange.headers.get('location'), '/mobile-scorer');
    const cookie = sessionCookieHeader(exchange);
    assert.match(cookie, /__Host-capital_session_count=/);

    const replay = await h.request('/api/auth/mobile-exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, verifier }).toString(),
    });
    assert.equal(replay.status, 400);
  } finally {
    await h.stop();
  }
});

test('Market API rate limiting remains independent of spoofed forwarding headers', async () => {
  const h = await harness();
  try {
    for (let i = 0; i < 120; i += 1) {
      assert.equal((await h.request('/api/market/quote?symbol=INVALID', {
        headers: { 'X-Forwarded-For': `192.0.2.${i}` },
      })).status, 400);
    }
    assert.equal((await h.request('/api/market/quote?symbol=INVALID')).status, 429);
  } finally {
    await h.stop();
  }
});

test('web Google login ignores caller-controlled next targets and returns to landing page', async () => {
  const h = await harness();
  try {
    const start = await h.beginGoogle('/api/auth/login/google?next=%2Fcontrol-center');
    const response = await h.request(
      `/api/auth/callback?flow=${encodeURIComponent(start.callback.searchParams.get('flow'))}&code=test-code`,
      { headers: { cookie: start.pkceCookie } },
    );
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('location'), '/');
  } finally {
    await h.stop();
  }
});

test('registration consent migration keeps optional marketing consent boolean and non-null', async () => {
  const sql = await readFile(
    new URL('../supabase/migrations/20261005155500_fix_registration_consent_null.sql', import.meta.url),
    'utf8',
  );
  assert.match(
    sql,
    /coalesce\(new\.raw_user_meta_data->>'marketing_consent', 'false'\) = 'true'/,
  );
  assert.match(
    sql,
    /coalesce\(new\.raw_user_meta_data->>'terms_accepted', 'false'\) = 'true'/,
  );
  assert.match(
    sql,
    /coalesce\(new\.raw_user_meta_data->>'privacy_acknowledged', 'false'\) = 'true'/,
  );
  assert.doesNotMatch(
    sql,
    /new\.raw_user_meta_data->>'marketing_consent' = 'true'/,
  );
});

test('Google login preserves only the allowlisted CADS Marketplace setup return path', async () => {
  const h = await harness();
  try {
    const safeNext = '/api/cads/marketplace/setup?installation_id=77';
    const safe = await h.beginGoogle('/api/auth/login/google?next=' + encodeURIComponent(safeNext));
    assert.equal(safe.callback.searchParams.get('next'), safeNext);
    const safeResponse = await h.request(
      '/api/auth/callback?flow=' + encodeURIComponent(safe.callback.searchParams.get('flow')) + '&code=test-code',
      { headers: { cookie: safe.pkceCookie } },
    );
    assert.equal(safeResponse.status, 303);
    assert.equal(safeResponse.headers.get('location'), safeNext);

    const unsafe = await h.beginGoogle('/api/auth/login/google?next=' + encodeURIComponent('https://evil.example/steal'));
    assert.equal(unsafe.callback.searchParams.get('next'), '/');
  } finally {
    await h.stop();
  }
});


test('all eleven Control Center subpages enforce owner identity on direct document requests', async () => {
  const h = await harness();
  const paths = [
    '/control-center/roadmap',
    '/control-center/components',
    '/control-center/tools',
    '/control-center/observability',
    '/control-center/news',
    '/control-center/console',
    '/control-center/cockpit',
    '/control-center/team',
    '/control-center/cost_center',
    '/control-center/system',
    '/control-center/licenses',
  ];
  try {
    for (const page of paths) {
      assert.equal((await h.request(page)).status, 404, page + ' anonymous');
    }

    const ownerCookie = await h.completeEmail();
    for (const page of paths) {
      assert.equal((await h.request(page, { headers: { cookie: ownerCookie } })).status, 200, page + ' owner');
    }

    h.state.subject = 'user-subject';
    const userCookie = await h.completeEmail();
    for (const page of paths) {
      assert.equal((await h.request(page, { headers: { cookie: userCookie } })).status, 404, page + ' non-owner');
    }
  } finally {
    await h.stop();
  }
});
