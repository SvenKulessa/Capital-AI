import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createHandler } from '../../supabase/functions/capital-social-x-vault/index.ts';

const WORKLOAD = 'ab'.repeat(32);
const EDGE_URL = 'https://example.supabase.co/functions/v1/capital-social-x-vault';
const JWT = 'testtoken'.repeat(10);
function signedRequest(data, { key = WORKLOAD, jwt = JWT, at = Date.now(),
  tamperBody = null, omitSignature = false } = {}) {
  const body = JSON.stringify(data);
  const timestamp = String(at);
  const signature = createHmac('sha256', Buffer.from(key, 'hex'))
    .update(timestamp + '\n' + jwt + '\n' + body).digest('hex');
  return new Request(EDGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt,
      'x-capital-edge-timestamp': timestamp,
      ...(omitSignature ? {} : { 'x-capital-edge-signature': signature }) },
    body: tamperBody || body,
  });
}
const env = { get(name) { return ({
  SUPABASE_URL: 'https://example.supabase.co/',
  SUPABASE_ANON_KEY: 'synthetic-publishable-key-for-testing',
  SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-key-for-testing',
  SOCIAL_X_EDGE_WORKLOAD_SECRET: WORKLOAD,
})[name] || null; } };
test('X Edge rejects anonymous traffic before any network calls', async () => {
  let calls = 0;
  const handler = createHandler({ env, fetchImpl: async () => { calls++; throw Error(); } });
  const response = await handler(new Request('https://example.supabase.co/functions/v1/capital-social-x-vault', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation: 'status' }),
  }));
  assert.equal(response.status, 401);
  assert.equal(calls, 0);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});
test('X Edge denies non-POST methods and incorrect content type', async () => {
  const handler = createHandler({ env });
  const u = 'https://example.supabase.co/functions/v1/capital-social-x-vault';
  assert.equal((await handler(new Request(u))).status, 405);
  assert.equal((await handler(new Request(u, { method: 'POST',
    body: '{}' }))).status, 415);
});

test('Edge accepts only verified owner and performs a scoped state insertion', async () => {
  const userId = 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
  const config = { get(name) { return ({
    SUPABASE_URL: 'https://example.supabase.co/',
    SUPABASE_ANON_KEY: 'synthetic-publishable-key-for-testing',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_synthetic_only_for_tests',
    SOCIAL_X_EDGE_WORKLOAD_SECRET: WORKLOAD,
  })[name] || null; } };
  const accesses = [];
  const handler = createHandler({ env: config, fetchImpl: async (url, options) => {
    accesses.push({ url: String(url), options });
    const path = String(url);
    const output = path.includes('/auth/v1/user')
      ? { id: userId, email_confirmed_at: '2026-10-01T01:00:00Z' }
      : path.includes('/profiles') ? [{ id: userId, iam_role: 'owner' }] : null;
    return { ok: true, text: async () => JSON.stringify(output) };
  } });
  const response = await handler(signedRequest({ operation: 'begin', userId,
    stateHash: 'a'.repeat(64), codeVerifier: 'v'.repeat(43),
    redirectUri: 'https://capital-ai.online/api/social-media/auth/callback' }));
  assert.equal(response.status, 200);
  const responseText = await response.text();
  assert.deepEqual(JSON.parse(responseText), { prepared: true });
  assert.equal(accesses.length, 3);
  assert.equal(accesses[0].options.headers.apikey, config.get('SUPABASE_ANON_KEY'));
  assert.match(JSON.stringify(accesses[2]), /state_token/);
  assert.ok(!responseText.includes('sb_secret_'));
});

test('Edge denies a non-owner before any privileged database write', async () => {
  const userId = 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
  const config = { get(name) { return ({
    SUPABASE_URL: 'https://example.supabase.co/',
    SUPABASE_ANON_KEY: 'synthetic-publishable-key-for-testing',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_synthetic_only_for_tests',
    SOCIAL_X_EDGE_WORKLOAD_SECRET: WORKLOAD,
  })[name] || null; } };
  let reads = 0;
  const handler = createHandler({ env: config, fetchImpl: async (url) => {
    reads++;
    const output = String(url).includes('/auth/v1/user')
      ? { id: userId, email_confirmed_at: '2026-10-01T01:00:00Z' }
      : [{ id: userId, iam_role: 'user' }];
    return { ok: true, text: async () => JSON.stringify(output) };
  } });
  const result = await handler(signedRequest({ operation: 'begin', userId,
    stateHash: 'a'.repeat(64), codeVerifier: 'v'.repeat(43),
    redirectUri: 'https://capital-ai.online/api/social-media/auth/callback' }));
  assert.equal(result.status, 503);
  assert.equal(reads, 2);
});

test('stolen owner JWT cannot create an account without Render workload proof', async () => {
  let calls = 0;
  const handler = createHandler({ env, fetchImpl: async () => { calls++; throw Error(); } });
  const data = { operation: 'persist', userId: 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101',
    account: { external_account_id: '123', handle: 'attacker' } };
  for (const request of [
    signedRequest(data, { omitSignature: true }),
    signedRequest(data, { key: 'ff'.repeat(32) }),
    signedRequest(data, { at: Date.now() - 120000 }),
    signedRequest(data, { tamperBody: JSON.stringify({ ...data, operation: 'consume' }) }),
  ]) {
    const result = await handler(request);
    assert.equal(result.status, 503);
  }
  assert.equal(calls, 0, 'invalid workload proof must cause no Auth or DB calls');
});

test('Edge denies requests when workload key was not provisioned', async () => {
  const noKey = { get(name) { return name === 'SOCIAL_X_EDGE_WORKLOAD_SECRET'
    ? null : env.get(name); } };
  let calls = 0;
  const handler = createHandler({ env: noKey, fetchImpl: async () => { calls++; throw Error(); } });
  const result = await handler(signedRequest({ operation: 'status',
    userId: 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101' }));
  assert.equal(result.status, 503);
  assert.equal(calls, 0);
});
