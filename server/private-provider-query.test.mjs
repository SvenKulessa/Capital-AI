import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  assertNotReplayed,
  executeGuardedProviderQuery,
  createPrivateProviderQuery,
  createProviderBridgeProbeEnvelope,
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



test('runtime bridge probe is signed and performs no state, vault or provider I/O', async () => {
  const now = Date.now();
  const envelope = createProviderBridgeProbeEnvelope('bridge-probe-1', env, now);
  assert.equal(verifyProviderQueryEnvelope(envelope, env, now + 100), true);
  let stateCalls = 0;
  let vaultCalls = 0;
  const result = await executeGuardedProviderQuery({
    envelope,
    env,
    state: { claimProviderQuery: async () => { stateCalls += 1; } },
    vault: { executePrivateQuery: async () => { vaultCalls += 1; return {}; } },
  });
  assert.deepEqual(result, {
    bridgeProbe: true,
    stateIo: false,
    vaultIo: false,
    providerIo: false,
  });
  assert.equal(stateCalls, 0);
  assert.equal(vaultCalls, 0);
});

test('probe-only mode never enables the customer provider-query surface', () => {
  const providerQuery = createPrivateProviderQuery({
    env: {
      ...env,
      PRIVATE_PROVIDER_BRIDGE_ENABLED: 'false',
      PRIVATE_PROVIDER_BRIDGE_PROBE_ENABLED: 'true',
    },
    auth: {},
    vault: {},
    state: {},
  });
  assert.deepEqual(providerQuery.status(), {
    enabled: false,
    probeEnabled: true,
    requestConnection: 'DISCONNECTED',
    executorConnection: 'DISCONNECTED',
    readiness: {
      status: 'NOT_PROVEN',
      observedAt: null,
      latencyMs: null,
      error: null,
    },
    proofScope: 'APP_NATS_RUST_BRIDGE_EXECUTOR_ONLY',
    stateIoProven: false,
    vaultIoProven: false,
    providerIoProven: false,
  });
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

test('private BYOK market snapshots require exact provider and symbol without public privileges',async()=>{
  for (const [provider,symbol] of [['binance','BTCUSDT'],['kraken','BTCUSD']]){
    assert.deepEqual(validateProviderQueryRequest({provider,operation:'market.spot_trade',params:{symbol}}),
      {provider,operation:'market.spot_trade',params:{symbol}});
    assert.throws(()=>validateProviderQueryRequest({provider,operation:'market.spot_trade',params:{symbol:'ETHUSD'}}),
      /INVALID_PARAM_VALUE/);
    assert.throws(()=>validateProviderQueryRequest({provider,operation:'market.spot_trade',params:{symbol,apiKey:'leak'}}),
      /PARAM_NOT_ADMITTED/);
    assert.throws(()=>validateProviderQueryRequest({provider,operation:'market.spot_trade',params:{}}),
      /REQUIRED_PARAM_MISSING/);
  }
  const userRef='11111111-1111-4111-8111-111111111111';
  const envelope=createProviderQueryEnvelope({
    userRef,requestId:'private-market-test-1',provider:'kraken',
    operation:'market.spot_trade',params:{symbol:'BTCUSD'},
  },env);
  let claims=0,seenUser=null;
  const state={claimProviderQuery:async claim=>{claims++;assert.equal(claim.envelope.userRef,userRef);}};
  const vault={executePrivateQuery:async(u,p,o,params)=>{
    seenUser=u;assert.equal(p,'kraken');assert.equal(o,'market.spot_trade');
    assert.deepEqual(params,{symbol:'BTCUSD'});
    return {price:84000,dataScope:'USER_PRIVATE_MARKET_DATA',publicDisplayAllowed:false};
  }};
  const row=await executeGuardedProviderQuery({envelope,env,state,vault});
  assert.equal(row.price,84000);
  assert.equal(claims,1);
  assert.equal(seenUser,userRef);
  await assert.rejects(executeGuardedProviderQuery({
    envelope:{...envelope,userRef:'22222222-2222-4222-8222-222222222222'},env,state,vault,
  }),/INVALID_QUERY_PROOF/);
  assert.equal(claims,1);
});

test('user-scoped WebSocket snapshot request requires fixed symbol and separately signed operation',()=>{
  for (const [provider,symbol] of [['kraken','BTCUSD'],['binance','BTCUSDT']]) {
    const valid={provider,operation:'market.spot_ws_snapshot',params:{symbol}};
    assert.deepEqual(validateProviderQueryRequest(valid),valid);
    assert.throws(()=>validateProviderQueryRequest({...valid,params:{symbol:'XBTGBP'}}),/INVALID_PARAM_VALUE/);
    assert.throws(()=>validateProviderQueryRequest({...valid,params:{symbol,apiSecret:'forbidden'}}),/PARAM_NOT_ADMITTED/);
    assert.throws(()=>validateProviderQueryRequest({...valid,params:{}}),/REQUIRED_PARAM_MISSING/);
    const envelope=createProviderQueryEnvelope({
      userRef:'11111111-1111-4111-8111-111111111111',requestId:'ws-private-1',
      ...valid,
    },env);
    assert.equal(verifyProviderQueryEnvelope(envelope,env),true);
    assert.equal(verifyProviderQueryEnvelope({...envelope,operation:'market.spot_trade'},env),false);
    assert.equal(verifyProviderQueryEnvelope({...envelope,userRef:'22222222-2222-4222-8222-222222222222'},env),false);
  }
});

test('two signed users keep REST and WS query claims and results isolated', async () => {
  const users = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'];
  const claims = [];
  const executions = [];
  const state = { claimProviderQuery: async ({ envelope }) => { claims.push(envelope.userRef); } };
  const vault = { executePrivateQuery: async (userRef, provider, operation) => {
    executions.push({ userRef, operation });
    assert.equal(provider, 'kraken');
    return { owner: userRef, price: users.indexOf(userRef) + 80000 };
  } };
  for (const operation of ['market.spot_trade', 'market.spot_ws_snapshot']) {
    const envelopes = users.map((userRef, index) => createProviderQueryEnvelope({
      userRef, requestId: `tenant-${operation}-${index}`, provider: 'kraken', operation, params: { symbol: 'BTCUSD' },
    }, env));
    const rows = await Promise.all(envelopes.map(envelope => executeGuardedProviderQuery({ envelope, env, state, vault })));
    assert.deepEqual(rows.map(row => row.owner), users);
    assert.deepEqual(rows.map(row => row.price), [80000, 80001]);
    const before = executions.length;
    await assert.rejects(executeGuardedProviderQuery({
      envelope: { ...envelopes[0], userRef: users[1] }, env, state, vault,
    }), /INVALID_QUERY_PROOF/);
    assert.equal(executions.length, before);
    assert.equal(claims.length, before);
  }
  assert.deepEqual(claims, [...users, ...users]);
});

test('five private class batches use the existing signed broker contract without browser symbol/credential injection', () => {
  for (const [provider, category] of [['kraken', 'KRYPTO'], ['massive', 'AKTIEN'],
    ['massive', 'INDIZIES'], ['massive', 'FOREX'], ['massive', 'ROHSTOFFE']]) {
    assert.deepEqual(validateProviderQueryRequest({ provider, operation: 'market.asset_class_snapshot',
      params: { category } }), { provider, operation: 'market.asset_class_snapshot', params: { category } });
  }
  for (const params of [{ category: 'AKTIEN', apiKey: 'forbidden' }, { category: 'AKTIEN', symbols: 'evil' },
    { category: 'UNLISTED' }, {}]) {
    assert.throws(() => validateProviderQueryRequest({ provider: 'massive', operation: 'market.asset_class_snapshot', params }));
  }
  assert.throws(() => validateProviderQueryRequest({ provider: 'kraken', operation: 'market.asset_class_snapshot',
    params: { category: 'AKTIEN' } }), /INVALID_PARAM_VALUE/);
});

test('broker pause overrides both customer and diagnostic bridge enablement', async () => {
  const bridge = createPrivateProviderQuery({
    env: { ...env, MARKET_BROKER_PAUSED: 'true', PRIVATE_PROVIDER_BRIDGE_ENABLED: 'true', PRIVATE_PROVIDER_BRIDGE_PROBE_ENABLED: 'true' },
    auth: {}, vault: {}, state: {},
  });
  assert.equal(bridge.status().enabled, false);
  assert.equal(bridge.status().probeEnabled, false);
  assert.equal(await bridge.start(), false);
  assert.equal((await bridge.probe('paused-bridge')).status, 'DISABLED');
  assert.equal(bridge.status().requestConnection, 'DISCONNECTED');
  assert.equal(bridge.status().executorConnection, 'DISCONNECTED');
});
