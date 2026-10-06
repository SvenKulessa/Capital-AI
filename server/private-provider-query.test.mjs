import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createProviderQueryEnvelope,
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
