import test from 'node:test';
import assert from 'node:assert/strict';
import { MarketInfrastructure, natsConnectionAuth, validateStreamConfig } from './infrastructure.mjs';

const safe = { storage: 'file', discard: 'new', deny_delete: true, deny_purge: true,
  max_age: 0, num_replicas: 1, max_bytes: 1073741824, max_msg_size: 262144,
  subjects: ['capital.facts.quote.*'] };
test('stream drift cannot remove resource bounds or widen the event subject', () => {
  assert.doesNotThrow(() => validateStreamConfig(safe, 1));
  for (const change of [{ max_bytes: -1 }, { max_msg_size: -1 }, { subjects: ['capital.facts.quote.*', '>'] },
    { subjects: ['>'] }, { storage: 'memory' }, { deny_delete: false }, { deny_purge: false },
    { max_age: 1 }, { num_replicas: 3 }]) {
    assert.throws(() => validateStreamConfig({ ...safe, ...change }, 1), /UNSAFE_STREAM_CONFIG/);
  }
});
test('scoped NATS credentials are preferred and incomplete credentials fail closed', () => {
  assert.deepEqual(natsConnectionAuth({ NATS_APP_USER: 'capital-ai-market-runtime', NATS_APP_PASSWORD: 'secret', NATS_TOKEN: 'legacy' }),
    { user: 'capital-ai-market-runtime', pass: 'secret', mode: 'scoped_user' });
  assert.deepEqual(natsConnectionAuth({ NATS_TOKEN: 'legacy' }), { token: 'legacy', mode: 'legacy_token' });
  assert.throws(() => natsConnectionAuth({ NATS_APP_USER: 'capital-ai-market-runtime' }), /NATS_SCOPED_CREDENTIALS_INCOMPLETE/);
  assert.throws(() => natsConnectionAuth({}), /NATS_CREDENTIALS_REQUIRED/);
});
test('missing broker credentials fail closed before contacting Redis or NATS', async () => {
  const service = new MarketInfrastructure({ REDIS_URL: 'redis://127.0.0.1:1', NATS_URL: 'nats://127.0.0.1:1' });
  assert.equal(await service.start(), false);
  assert.equal(service.redis, null);
  assert.equal(service.nc, null);
  assert.equal(service.status().status, 'unavailable');
});


test('provider replay state is centralized in Valkey with NX and bounded TTL', async () => {
  const calls = [];
  const service = new MarketInfrastructure({});
  service.redis = {
    isReady: true,
    async set(key, value, options) {
      calls.push({ key, value, options });
      return calls.length === 1 ? 'OK' : null;
    },
  };

  const first = await service.claimProviderReplay('req-central-1', 1_800_000_010_000, 1_800_000_000_000);
  assert.equal(first.claimed, true);
  assert.equal(first.ttlMs, 10_000);
  assert.equal(calls[0].options.NX, true);
  assert.equal(calls[0].options.PX, 10_000);
  assert.doesNotMatch(calls[0].key, /req-central-1/);
  await assert.rejects(
    service.claimProviderReplay('req-central-1', 1_800_000_010_000, 1_800_000_000_100),
    /QUERY_REPLAY_REJECTED/,
  );
});

test('provider request rate and cost gates use atomic Valkey scripts and fail closed without Valkey', async () => {
  const service = new MarketInfrastructure({});
  await assert.rejects(service.consumeProviderRate('user-1', 30), /PROVIDER_STATE_UNAVAILABLE/);
  await assert.rejects(
    service.claimProviderCostScopes([{ key: 'global:binance:account.snapshot', intervalMs: 60_000 }]),
    /PROVIDER_STATE_UNAVAILABLE/,
  );

  const scripts = [];
  service.redis = {
    isReady: true,
    async eval(script, options) {
      scripts.push({ script, options });
      if (script.includes("INCR")) return scripts.length === 1 ? [1, 60_000] : [31, 42_000];
      return scripts.length === 3 ? [0] : [28_000];
    },
  };

  assert.deepEqual(await service.consumeProviderRate('user-1', 30), { limit: 30, remaining: 29, ttlMs: 60_000 });
  await assert.rejects(service.consumeProviderRate('user-1', 30), error => {
    assert.equal(error.code, 'PRIVATE_PROVIDER_RATE_LIMITED');
    assert.equal(error.retryAfterSeconds, 42);
    return true;
  });

  assert.deepEqual(
    await service.claimProviderCostScopes([{ key: 'global:binance:account.snapshot', intervalMs: 60_000 }]),
    { claimed: true },
  );
  await assert.rejects(
    service.claimProviderCostScopes([{ key: 'global:binance:account.snapshot', intervalMs: 60_000 }]),
    error => {
      assert.equal(error.code, 'PROVIDER_QUERY_COST_THROTTLED');
      assert.equal(error.retryAfterSeconds, 28);
      return true;
    },
  );
});
