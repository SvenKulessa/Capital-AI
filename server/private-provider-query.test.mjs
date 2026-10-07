import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  assertNotReplayed,
  executeGuardedProviderQuery,
  createProviderQueryEnvelope,
  executorNatsConnectionAuth,
  safeProviderResult,
  validateProviderQueryRequest,
  verifyProviderQueryEnvelope,
} from './private-provider-query.mjs';

const env = { PRIVATE_PROVIDER_QUERY_SIGNING_SECRET: 'private-query-signing-secret-0123456789abcdef' };

test('read-only Kraken/Binance operations are admitted with bounded parameters', () => {
  assert.deepEqual(
    validateProviderQueryRequest({ provider: 'kraken', operation: 'orders.open', params: { trades: true } }),
    { provider: 'kraken', operation: 'orders.open', params: { trades: true } },
  );
  assert.deepEqual(
    validateProviderQueryRequest({ provider: 'binance', operation: 'spot.open_orders', params: { symbol: 'BTCUSDT' } }),
    { provider: 'binance', operation: 'spot.open_orders', params: { symbol: 'BTCUSDT' } },
  );
});

test('mutating and unknown operations fail closed before broker I/O', () => {
  assert.throws(() => validateProviderQueryRequest({ provider: 'kraken', operation: 'orders.create', params: {} }), /OPERATION_NOT_ADMITTED/);
  assert.throws(() => validateProviderQueryRequest({ provider: 'binance', operation: 'withdraw', params: {} }), /OPERATION_NOT_ADMITTED/);
  assert.throws(() => validateProviderQueryRequest({ provider: 'binance', operation: 'spot.open_orders', params: { apiKey: 'x' } }), /PARAM_NOT_ADMITTED/);
});

test('query proof binds user, operation, expiry and params', () => {
  const now = 1_800_000_000_000;
  const envelope = createProviderQueryEnvelope({
    userRef: '11111111-1111-1111-1111-111111111111',
    requestId: 'req-1',
    provider: 'binance',
    operation: 'spot.open_orders',
    params: { symbol: 'BTCUSDT' },
  }, env, now);
  assert.equal(verifyProviderQueryEnvelope(envelope, env, now + 100), true);
  assert.equal(verifyProviderQueryEnvelope({ ...envelope, userRef: '22222222-2222-2222-2222-222222222222' }, env, now + 100), false);
  assert.equal(verifyProviderQueryEnvelope({ ...envelope, operation: 'spot.all_orders' }, env, now + 100), false);
  assert.equal(verifyProviderQueryEnvelope(envelope, env, envelope.expiresAt + 1), false);
});

test('provider result refuses credential-shaped fields', () => {
  assert.deepEqual(safeProviderResult({ balances: [{ asset: 'BTC', free: '0.1' }] }), { balances: [{ asset: 'BTC', free: '0.1' }] });
  assert.throws(() => safeProviderResult({ apiSecret: 'never' }), /SECRET_MATERIAL_IN_PROVIDER_RESULT/);
});


test('executor NATS credentials are separate and fail closed', () => {
  assert.deepEqual(
    executorNatsConnectionAuth({
      NATS_EXECUTOR_USER: 'capital-ai-provider-executor',
      NATS_EXECUTOR_PASSWORD: 'executor-password-0123456789012345',
    }),
    {
      user: 'capital-ai-provider-executor',
      pass: 'executor-password-0123456789012345',
      mode: 'scoped_executor',
    },
  );
  assert.throws(
    () => executorNatsConnectionAuth({ NATS_EXECUTOR_USER: 'executor', NATS_EXECUTOR_PASSWORD: 'short' }),
    /NATS_EXECUTOR_CREDENTIALS_REQUIRED/,
  );
});

test('Binance snapshot contract requires bounded high-cost parameters', () => {
  assert.deepEqual(
    validateProviderQueryRequest({
      provider: 'binance',
      operation: 'account.snapshot',
      params: { type: 'SPOT', limit: 7 },
    }),
    {
      provider: 'binance',
      operation: 'account.snapshot',
      params: { type: 'SPOT', limit: 7 },
    },
  );
  assert.throws(
    () => validateProviderQueryRequest({ provider: 'binance', operation: 'account.snapshot', params: {} }),
    /REQUIRED_PARAM_MISSING/,
  );
  assert.throws(
    () => validateProviderQueryRequest({ provider: 'binance', operation: 'account.snapshot', params: { type: 'SPOT', limit: 31 } }),
    /INVALID_PARAM_VALUE/,
  );
  assert.throws(
    () => validateProviderQueryRequest({
      provider: 'binance',
      operation: 'account.snapshot',
      params: { type: 'SPOT', startTime: 1, endTime: 2_592_000_002 },
    }),
    /QUERY_WINDOW_TOO_LARGE/,
  );
});


test('replay window rejects duplicate request IDs until expiry', () => {
  const state = new Map();
  const envelope = { requestId: 'req-replay-1', expiresAt: 1_800_000_010_000 };
  assert.doesNotThrow(() => assertNotReplayed(state, envelope, 1_800_000_000_000));
  assert.throws(() => assertNotReplayed(state, envelope, 1_800_000_000_100), /QUERY_REPLAY_REJECTED/);
  assert.doesNotThrow(() => assertNotReplayed(state, { requestId: 'req-replay-2', expiresAt: 1_800_000_020_000 }, 1_800_000_011_000));
  assert.equal(state.has('req-replay-1'), false);
});

test('provider result payload is bounded', () => {
  assert.throws(
    () => safeProviderResult({ payload: 'x'.repeat(300_000) }),
    /PROVIDER_RESULT_TOO_LARGE/,
  );
});


test('executor claims all durable guards before any provider I/O', async () => {
  const envelope = createProviderQueryEnvelope({ userRef: '11111111-1111-4111-8111-111111111111',
    requestId: 'req-guard', provider: 'binance', operation: 'account.snapshot', params: { type: 'SPOT' } }, env);
  const order = [];
  const state = { claimProviderQuery: async claim => {
    order.push('claim');
    assert.equal(claim.rateLimit, 30);
    assert.deepEqual(claim.scopes, [
      { key: `user:${envelope.userRef}:binance:account.snapshot`, intervalMs: 60000 },
      { key: 'global:binance:account.snapshot', intervalMs: 60000 },
    ]);
  } };
  const vault = { executePrivateQuery: async () => { order.push('provider'); return { balances: [] }; } };
  assert.deepEqual(await executeGuardedProviderQuery({ envelope, env, state, vault }), { balances: [] });
  assert.deepEqual(order, ['claim', 'provider']);
});

test('invalid proof, denied guard and storage failure never invoke provider', async () => {
  const envelope = createProviderQueryEnvelope({ userRef: '11111111-1111-4111-8111-111111111111',
    requestId: 'req-denied', provider: 'kraken', operation: 'account.balance', params: {} }, env);
  let providerCalls = 0, claims = 0;
  const vault = { executePrivateQuery: async () => { providerCalls++; return {}; } };
  const state = { claimProviderQuery: async () => { claims++; throw new Error('PROVIDER_STATE_UNAVAILABLE'); } };
  await assert.rejects(executeGuardedProviderQuery({ envelope: { ...envelope, proof: '0'.repeat(64) }, env, state, vault }), /INVALID_QUERY_PROOF/);
  assert.equal(claims, 0);
  await assert.rejects(executeGuardedProviderQuery({ envelope, env, state, vault }), /PROVIDER_STATE_UNAVAILABLE/);
  await assert.rejects(executeGuardedProviderQuery({ envelope, env, state: {}, vault }), /PROVIDER_STATE_UNAVAILABLE/);
  assert.equal(providerCalls, 0);
});

test('proof that expires during durable claim is rejected before provider I/O', async () => {
  const original = Date.now;
  const now = original();
  const envelope = createProviderQueryEnvelope({ userRef: '11111111-1111-4111-8111-111111111111',
    requestId: 'req-expired', provider: 'kraken', operation: 'account.balance', params: {} }, env, now);
  let providerCalls = 0;
  try {
    Date.now = () => now;
    const state = { claimProviderQuery: async () => { Date.now = () => envelope.expiresAt + 1; } };
    await assert.rejects(executeGuardedProviderQuery({ envelope, env, state,
      vault: { executePrivateQuery: async () => { providerCalls++; } } }), /INVALID_QUERY_PROOF/);
    assert.equal(providerCalls, 0);
  } finally { Date.now = original; }
});
