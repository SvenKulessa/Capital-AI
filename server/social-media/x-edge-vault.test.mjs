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
