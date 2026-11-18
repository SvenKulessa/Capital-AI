import test from 'node:test';
import assert from 'node:assert/strict';
import { createAgentOperationsPilotStore } from './agent-operations-pilot-store.mjs';

const JWT = [
  Buffer.from('{"alg":"HS256"}').toString('base64url'),
  Buffer.from('{"role":"service_role"}').toString('base64url'),
  'placeholder',
].join('.');
const env = { SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: JWT };

test('store fails closed with unconfigured/unsafe Supabase admin credentials', () => {
  for (const bad of [{}, { ...env, SUPABASE_URL: 'http://localhost:3000' },
    { ...env, SUPABASE_SERVICE_ROLE_KEY: 'sb_publishable_public' },
    { ...env, SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.xx' },
    { ...env, SUPABASE_URL: 'https://user:password@example.supabase.co/' }]) {
    assert.equal(createAgentOperationsPilotStore({ env: bad }), null);
  }
});

test('store uses only bounded server-side Supabase RPC, tenant ID derived by caller', async () => {
  const requests = [];
  const store = createAgentOperationsPilotStore({ env, fetchImpl: async (url, init) => {
    requests.push({ url: String(url), ...init });
    return new Response(JSON.stringify({ state: 'quota_exceeded', used: 2, dailyLimit: 2 }),
      { status: 200, headers: { 'content-type': 'application/json' } });
  } });
  const result = await store.create({
    id: '11111111-1111-4111-8111-111111111111',
    userId: '22222222-2222-4222-8222-222222222222', tier: 'starter',
    workflowId: 'media-rights', idempotencyKey: 'stable-client-001',
    requestHash: 'a'.repeat(64), receipt: { receiptSha256: 'b'.repeat(64) },
  });
  assert.equal(result.state, 'quota_exceeded');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://example.supabase.co/rest/v1/rpc/capital_ai_create_agent_pilot_run');
  assert.equal(requests[0].redirect, 'error');
  assert.equal(requests[0].headers.Authorization, 'Bearer ' + JWT);
  assert.equal(requests[0].headers.apikey, JWT);
  assert.equal(requests[0].headers['Content-Type'], 'application/json');
  assert.equal(JSON.parse(requests[0].body)._user_id, '22222222-2222-4222-8222-222222222222');
  await store.getById('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');
  assert.equal(requests[1].url, 'https://example.supabase.co/rest/v1/rpc/capital_ai_get_agent_pilot_run');
  assert.equal(JSON.parse(requests[1].body)._user_id, '22222222-2222-4222-8222-222222222222');
});

test('RPC errors never echo upstream body, provider error or secret', async () => {
  const store = createAgentOperationsPilotStore({ env, fetchImpl: async () =>
    new Response('secret-from-provider-xyz', { status: 500 }) });
  await assert.rejects(() => store.getById('a', 'b'), error => {
    assert.equal(error.message, 'PILOT_LEDGER_UNAVAILABLE');
    assert.ok(!String(error).includes('secret-from-provider-xyz'));
    return true;
  });
});

test('PostgREST returns null for missing or foreign rows without leaking tenant metadata', async () => {
  const store = createAgentOperationsPilotStore({ env,
    fetchImpl: async () => new Response('null', { status: 200 }) });
  assert.equal(await store.getById('foreign', 'random'), null);
});
