import test from 'node:test';
import assert from 'node:assert/strict';
import { publicSecurityHeaderReadback, assessSecurityHeaders, validatePublicOrigin } from './public-security-header-readback.mjs';

const validHeaders = {
  'strict-transport-security': 'max-age=31536000',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'content-security-policy': "default-src 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'",
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
};
const response = (overrides = {}, status = 200) => new Response('TOP_SECRET_RESPONSE_BODY', {
  status, headers: { ...validHeaders, 'set-cookie': 'secret-session=SHOULD_NOT_LEAK', ...overrides },
});
const fixture = (url, options) => {
  assert.equal(options.method, 'GET');
  assert.equal(options.redirect, 'manual');
  assert.equal(options.headers.Authorization, undefined);
  assert.equal(options.headers.Cookie, undefined);
  assert.ok(['/', '/healthz'].includes(new URL(url).pathname));
  return Promise.resolve(response());
};

test('two anonymized HTTPS responses satisfy enforceable headers without retaining secrets', async () => {
  const result = await publicSecurityHeaderReadback({ fetchImpl: fixture, now: () => '2026-11-12T00:00:00Z' });
  assert.equal(result.status, 'PASS');
  assert.equal(result.paths.length, 2);
  assert.equal(result.sourceCommitCorrelated, false);
  assert.equal(result.rawHeadersRetained, false);
  assert.equal(result.responseBodiesRetained, false);
  assert.equal(result.paths[0].styleInlineAllowed, true, 'existing style policy is a separate hardening task');
  assert.ok(!JSON.stringify(result).includes('SHOULD_NOT_LEAK'));
  assert.ok(!JSON.stringify(result).includes('TOP_SECRET'));
});

test('missing HSTS, unsafe script, permissive frames and redirects fail closed', async () => {
  const cases = [
    { 'strict-transport-security': 'max-age=60' },
    { 'content-security-policy': "default-src 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self' 'unsafe-inline'" },
    { 'content-security-policy': "default-src 'self'; object-src 'none'; script-src 'self'" },
    { 'x-frame-options': 'SAMEORIGIN' },
  ];
  for (const headers of cases) {
    const result = await publicSecurityHeaderReadback({ fetchImpl: async () => response(headers) });
    assert.equal(result.status, 'FAIL');
    assert.ok(result.paths.some(p => p.checks.some(c => c.status === 'FAIL')));
  }
  const redirected = await publicSecurityHeaderReadback({ fetchImpl: async () => response({}, 302) });
  assert.equal(redirected.status, 'FAIL');
});

test('network errors remain NOT_PROVEN and never authorize a PASS', async () => {
  const result = await publicSecurityHeaderReadback({ fetchImpl: async () => { throw new Error('sensitive remote reason'); } });
  assert.equal(result.status, 'NOT_PROVEN');
  assert.equal(result.paths[0].httpStatus, null);
  assert.ok(!JSON.stringify(result).includes('sensitive remote reason'));
});

test('only pinned HTTPS origins are admissible, with no credentials or paths', () => {
  for (const origin of ['http://capital-ai.online', 'https://attacker.example', 'https://user:password@capital-ai.online', 'https://capital-ai.online/profile', 'https://capital-ai.online/?token=a']) {
    assert.throws(() => validatePublicOrigin(origin), /unapproved_https_origin/);
  }
  assert.equal(validatePublicOrigin('https://capital-ai.online'), 'https://capital-ai.online');
  assert.equal(assessSecurityHeaders(new Headers(validHeaders)).checks.every(c => c.status === 'PASS'), true);
});
