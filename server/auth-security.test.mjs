import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthSecurity } from './auth-security.mjs';

const UUID = '11111111-1111-1111-1111-111111111111';
const UUID2 = '22222222-2222-2222-2222-222222222222';
const TOKEN_HASH = 'abcdefghijklmnopqrstuvwxyz0123456789';

function responseHarness() {
  return {
    headers: new Map(),
    status: null,
    payload: null,
    redirectStatus: null,
    redirectHeaders: null,
    ended: false,
    setHeader(name, value) { this.headers.set(String(name).toLowerCase(), value); },
    writeHead(status, headers) {
      this.redirectStatus = status;
      this.redirectHeaders = headers;
    },
    end() { this.ended = true; },
  };
}

function json(res, status, payload) {
  res.status = status;
  res.payload = payload;
}

function request(method = 'GET', body = {}, sameOrigin = true) {
  return { method, body, sameOrigin, headers: sameOrigin ? { origin: 'https://capital-ai.online' } : { origin: 'https://attacker.example' } };
}

function harness(overrides = {}) {
  const calls = [];
  const audits = [];
  let writes = 0;
  let clears = 0;
  const stored = {
    accessToken: 'access-aal1',
    refreshToken: 'refresh-aal1',
    user: { id: UUID, name: 'User' },
  };

  const authRequest = overrides.authRequest || (async (_config, path, options = {}) => {
    calls.push({ path, options });
    if (path === '/user') {
      return {
        response: { ok: true, status: 200 },
        data: {
          id: UUID,
          factors: [
            { id: UUID2, factor_type: 'totp', status: 'verified', friendly_name: 'Authenticator' },
          ],
        },
      };
    }
    throw new Error('UNEXPECTED_AUTH_REQUEST:' + path);
  });

  const security = createAuthSecurity({
    getConfig: () => ({ origin: 'https://capital-ai.online' }),
    authRequest,
    resolveSession: overrides.resolveSession || (async () => stored),
    writeSessionCookies: (_req, _res, _config, token) => {
      writes += 1;
      return { user: { id: token.user.id, name: token.user.name || 'User' } };
    },
    clearSessionCookies: () => { clears += 1; },
    readRequestJson: async req => req.body || {},
    sameOrigin: req => req.sameOrigin === true,
    resolveMfaRequirement: overrides.resolveMfaRequirement || (async () => false),
    audit: message => audits.push(String(message)),
  });

  return {
    security,
    calls,
    audits,
    counters: () => ({ writes, clears }),
  };
}

test('read-only factor listing does not require an Origin header and projects verified TOTP only', async () => {
  const h = harness();
  const res = responseHarness();
  const req = { method: 'GET', body: {}, sameOrigin: false, headers: {} };
  const handled = await h.security.handle(req, res, new URL('https://capital-ai.online/api/auth/mfa/factors'), json);
  assert.equal(handled, true);
  assert.equal(res.status, 200);
  assert.deepEqual(res.payload.factors, [{
    id: UUID2,
    type: 'totp',
    friendlyName: 'Authenticator',
    createdAt: null,
    updatedAt: null,
  }]);
});

test('cross-origin passkey challenge request is rejected before upstream I/O', async () => {
  let upstreamCalls = 0;
  const h = harness({
    authRequest: async () => {
      upstreamCalls += 1;
      throw new Error('must not run');
    },
  });
  const res = responseHarness();
  await h.security.handle(
    request('POST', {}, false),
    res,
    new URL('https://capital-ai.online/api/auth/passkey/options'),
    json,
  );
  assert.equal(res.status, 403);
  assert.equal(upstreamCalls, 0);
});

test('passkey login fails closed when MFA state cannot be read', async () => {
  const h = harness({
    resolveMfaRequirement: async () => null,
    authRequest: async (_config, path) => {
      assert.equal(path, '/passkeys/authentication/verify');
      return {
        response: { ok: true, status: 200 },
        data: {
          access_token: 'access-passkey',
          refresh_token: 'refresh-passkey',
          user: { id: UUID, name: 'Passkey User' },
        },
      };
    },
  });
  const res = responseHarness();
  await h.security.handle(
    request('POST', {
      challengeId: UUID2,
      credential: { id: 'credential', type: 'public-key', response: {} },
    }),
    res,
    new URL('https://capital-ai.online/api/auth/passkey/verify'),
    json,
  );
  assert.equal(res.status, 503);
  assert.equal(res.payload.error, 'mfa_state_unavailable');
  assert.equal(h.counters().writes, 0);
});

test('passkey login routes through TOTP when a verified factor exists', async () => {
  const h = harness({
    resolveMfaRequirement: async () => true,
    authRequest: async (_config, path) => {
      assert.equal(path, '/passkeys/authentication/verify');
      return {
        response: { ok: true, status: 200 },
        data: {
          access_token: 'access-passkey',
          refresh_token: 'refresh-passkey',
          user: { id: UUID, name: 'Passkey User' },
        },
      };
    },
  });
  const res = responseHarness();
  await h.security.handle(
    request('POST', {
      challengeId: UUID2,
      credential: { id: 'credential', type: 'public-key', response: {} },
    }),
    res,
    new URL('https://capital-ai.online/api/auth/passkey/verify'),
    json,
  );
  assert.equal(res.status, 200);
  assert.equal(res.payload.mfaRequired, true);
  assert.match(res.payload.next, /mfa=1/);
  assert.equal(h.counters().writes, 1);
});

test('recovery token hash becomes a server-owned session and redirects to password reset UI', async () => {
  const h = harness({
    authRequest: async (_config, path, options) => {
      assert.equal(path, '/verify');
      assert.deepEqual(options.body, { token_hash: TOKEN_HASH, type: 'recovery' });
      return {
        response: { ok: true, status: 200 },
        data: {
          access_token: 'access-recovery',
          refresh_token: 'refresh-recovery',
          user: { id: UUID, name: 'Recovery User' },
        },
      };
    },
  });
  const res = responseHarness();
  await h.security.handle(
    request('GET'),
    res,
    new URL('https://capital-ai.online/api/auth/email/verify?token_hash=' + TOKEN_HASH + '&type=recovery'),
    json,
  );
  assert.equal(res.redirectStatus, 303);
  assert.equal(res.redirectHeaders.Location, '/login?mode=reset');
  assert.equal(h.counters().writes, 1);
});

test('password reset updates the authenticated user, revokes sessions and clears cookies', async () => {
  const calls = [];
  const h = harness({
    authRequest: async (_config, path, options) => {
      calls.push({ path, options });
      return { response: { ok: true, status: 200 }, data: path === '/user' ? { id: UUID } : null };
    },
  });
  const res = responseHarness();
  await h.security.handle(
    request('POST', { password: 'correct-horse-battery-staple' }),
    res,
    new URL('https://capital-ai.online/api/auth/password/reset'),
    json,
  );
  assert.equal(res.status, 200);
  assert.equal(res.payload.reset, true);
  assert.equal(h.counters().clears, 1);
  assert.equal(calls[0].path, '/user');
  assert.equal(calls[0].options.method, 'PUT');
  assert.equal(calls[1].path, '/logout?scope=global');
});

test('TOTP enrollment returns QR/manual setup material without logging the secret', async () => {
  const secret = 'JBSWY3DPEHPK3PXP';
  const h = harness({
    authRequest: async (_config, path, options) => {
      assert.equal(path, '/factors');
      assert.equal(options.body.factor_type, 'totp');
      return {
        response: { ok: true, status: 200 },
        data: {
          id: UUID2,
          friendly_name: 'Phone Authenticator',
          totp: {
            qr_code: 'data:image/svg+xml;base64,PHN2Zy8+',
            secret,
            uri: 'otpauth://totp/CAPITAL-AI',
          },
        },
      };
    },
  });
  const res = responseHarness();
  await h.security.handle(
    request('POST', { friendlyName: 'Phone Authenticator' }),
    res,
    new URL('https://capital-ai.online/api/auth/mfa/totp/enroll'),
    json,
  );
  assert.equal(res.status, 200);
  assert.equal(res.payload.secret, secret);
  assert.equal(h.audits.some(entry => entry.includes(secret)), false);
});

test('TOTP challenge verification replaces the AAL1 session with verified tokens', async () => {
  const paths = [];
  const h = harness({
    authRequest: async (_config, path, options) => {
      paths.push(path);
      if (path.endsWith('/challenge')) {
        return { response: { ok: true, status: 200 }, data: { id: UUID } };
      }
      if (path.endsWith('/verify')) {
        assert.equal(options.body.code, '123456');
        return {
          response: { ok: true, status: 200 },
          data: {
            access_token: 'access-aal2',
            refresh_token: 'refresh-aal2',
            user: { id: UUID, name: 'AAL2 User' },
          },
        };
      }
      throw new Error('unexpected');
    },
  });
  const res = responseHarness();
  await h.security.handle(
    request('POST', { factorId: UUID2, code: '123456' }),
    res,
    new URL('https://capital-ai.online/api/auth/mfa/totp/verify'),
    json,
  );
  assert.equal(res.status, 200);
  assert.equal(res.payload.verified, true);
  assert.equal(h.counters().writes, 1);
  assert.equal(paths.length, 2);
});

test('passkey registration remains successful when only friendly-name PATCH fails', async () => {
  const paths = [];
  const h = harness({
    authRequest: async (_config, path, options) => {
      paths.push(path);
      if (path === '/passkeys/registration/verify') {
        return {
          response: { ok: true, status: 200 },
          data: { id: UUID2, friendly_name: 'Authenticator default', created_at: '2026-10-05T00:00:00Z' },
        };
      }
      if (path === '/passkeys/' + UUID2) {
        assert.equal(options.method, 'PATCH');
        return { response: { ok: false, status: 500 }, data: { error_code: 'rename_failed' } };
      }
      throw new Error('unexpected');
    },
  });
  const res = responseHarness();
  await h.security.handle(
    request('POST', {
      challengeId: UUID,
      credential: { id: 'credential', type: 'public-key', response: {} },
      friendlyName: 'Work phone',
    }),
    res,
    new URL('https://capital-ai.online/api/auth/passkeys/register/verify'),
    json,
  );
  assert.equal(res.status, 200);
  assert.equal(res.payload.registered, true);
  assert.equal(res.payload.renameApplied, false);
  assert.equal(res.payload.passkey.friendlyName, 'Authenticator default');
  assert.equal(paths.length, 2);
});
