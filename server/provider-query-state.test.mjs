import test from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseProviderState } from './provider-query-state.mjs';

const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_test-only' };
const claim = { envelope: { userRef: '11111111-1111-4111-8111-111111111111', requestId: 'req-1', expiresAt: Date.now() + 10000 }, rateLimit: 30, scopes: [] };
const response = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });

test('one bounded server RPC sends only guard metadata with modern secret authentication', async () => {
  let calls = 0;
  const state = createSupabaseProviderState({ env, fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, 'https://example.supabase.co/rest/v1/rpc/capital_ai_claim_provider_query');
    assert.equal(options.headers.apikey, env.SUPABASE_SECRET_KEY);
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    assert.deepEqual(JSON.parse(options.body), { _user_id: claim.envelope.userRef, _request_id: 'req-1',
      _expires_at_ms: claim.envelope.expiresAt, _rate_limit: 30, _cost_scopes: [] });
    return response({ allowed: true });
  } });
  assert.equal(await state.claimProviderQuery(claim), true);
  assert.equal(calls, 1);
});

test('replay/rate/cost denials remain explicit and retry-after is bounded', async () => {
  for (const code of ['QUERY_REPLAY_REJECTED', 'PROVIDER_QUERY_RATE_LIMITED', 'PROVIDER_QUERY_COST_THROTTLED']) {
    const state = createSupabaseProviderState({ env, fetchImpl: async () => response({ allowed: false, code, retryAfterSeconds: 99999 }) });
    await assert.rejects(state.claimProviderQuery(claim), error => error.code === code && error.retryAfterSeconds === 3600);
  }
});

test('unavailable, malformed, oversized and uncertain results fail closed without retry', async () => {
  for (const impl of [async () => { throw new Error('timeout'); }, async () => new Response('', { status: 401 }),
    async () => response({}), async () => response({ allowed: 'true' }),
    async () => response({ allowed: false, code: 'provider-secret-value' }),
    async () => response({ padding: 'x'.repeat(5000) })]) {
    let calls = 0;
    const state = createSupabaseProviderState({ env, fetchImpl: (...args) => { calls++; return impl(...args); } });
    await assert.rejects(state.claimProviderQuery(claim), /PROVIDER_STATE_UNAVAILABLE/);
    assert.equal(calls, 1);
  }
});

test('public keys and non-origin or insecure URLs are rejected before I/O', async () => {
  for (const bad of [{ ...env, SUPABASE_SECRET_KEY: 'sb_publishable_test' },
    { ...env, SUPABASE_URL: 'http://example.supabase.co' },
    { ...env, SUPABASE_URL: 'https://example.supabase.co/path' }]) {
    const state = createSupabaseProviderState({ env: bad, fetchImpl: () => { throw new Error('unexpected I/O'); } });
    await assert.rejects(state.claimProviderQuery(claim), /PROVIDER_STATE_UNAVAILABLE/);
  }
});
