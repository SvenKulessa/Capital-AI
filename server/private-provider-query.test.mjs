import test from 'node:test';
import assert from 'node:assert/strict';

import {
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
