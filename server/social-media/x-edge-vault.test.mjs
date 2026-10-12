import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../../supabase/functions/capital-social-x-vault/index.ts';

const env = { get(name) { return ({
  SUPABASE_URL: 'https://example.supabase.co/',
  SUPABASE_ANON_KEY: 'synthetic-publishable-key-for-testing',
  SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-key-for-testing',
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
  const response = await handler(new Request('https://example.supabase.co/functions/v1/capital-social-x-vault', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json',
      Authorization: 'Bearer ' + 'testtoken'.repeat(10) },
    body: JSON.stringify({ operation: 'begin', userId,
      stateHash: 'a'.repeat(64), codeVerifier: 'v'.repeat(43),
      redirectUri: 'https://capital-ai.online/api/social-media/auth/callback' }),
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { prepared: true });
  assert.equal(accesses.length, 3);
  assert.equal(accesses[0].options.headers.apikey, config.get('SUPABASE_ANON_KEY'));
  assert.match(JSON.stringify(accesses[2]), /state_token/);
  assert.ok(!JSON.stringify(await (async () => response.clone().text())()).includes('sb_secret_'));
});

test('Edge denies a non-owner before any privileged database write', async () => {
  const userId = 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
  const config = { get(name) { return ({
    SUPABASE_URL: 'https://example.supabase.co/',
    SUPABASE_ANON_KEY: 'synthetic-publishable-key-for-testing',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_synthetic_only_for_tests',
  })[name] || null; } };
  let reads = 0;
  const handler = createHandler({ env: config, fetchImpl: async (url) => {
    reads++;
    const output = String(url).includes('/auth/v1/user')
      ? { id: userId, email_confirmed_at: '2026-10-01T01:00:00Z' }
      : [{ id: userId, iam_role: 'user' }];
    return { ok: true, text: async () => JSON.stringify(output) };
  } });
  const result = await handler(new Request('https://example.supabase.co/functions/v1/capital-social-x-vault', {
    method: 'POST', headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + 'testtoken'.repeat(10) },
    body: JSON.stringify({ operation: 'begin', userId,
      stateHash: 'a'.repeat(64), codeVerifier: 'v'.repeat(43),
      redirectUri: 'https://capital-ai.online/api/social-media/auth/callback' }),
  }));
  assert.equal(result.status, 503);
  assert.equal(reads, 2);
});
