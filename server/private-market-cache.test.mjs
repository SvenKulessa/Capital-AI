import assert from 'node:assert/strict';
import test from 'node:test';
import { createPrivateMarketCache } from './private-market-cache.mjs';
const USER = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';
const env = { PRIVATE_PROVIDER_QUERY_SIGNING_SECRET: 'fixture-private-query-signing-secret-0123456789' };
const identity = { userId: USER, provider: 'massive', category: 'AKTIEN', fingerprint: 'a'.repeat(24) };
export function memoryRedis(clock) {
  const values = new Map();
  const get = key => { const row = values.get(key); return row && row.expires > clock() ? row.value : null; };
  return { values, async get(key) { return get(key); },
    async set(key, value, options) { values.set(key, { value, expires: clock() + options.PX }); return 'OK'; },
    async eval(_script, { keys, arguments: args }) {
      const count = Number(get(keys[0]) || 0); if (count >= Number(args[0])) return 0;
      values.set(keys[0], { value: String(count + 1), expires: values.get(keys[0])?.expires > clock()
        ? values.get(keys[0]).expires : clock() + 60000 }); return 1;
    },
  };
}
function batch(now) { return { provider: 'massive', category: 'AKTIEN', receivedAt: now,
  expiresAt: now + 30000, assets: [{ symbol: 'AAPL', price: 123 }],
  dataScope: 'USER_PRIVATE_MARKET_DATA', publicDisplayAllowed: false, redistributionAllowed: false,
  sharedCacheAllowed: false, jetStreamPublicationAllowed: false }; }
test('cache uses ciphertext and exact tenant/provider/key/class isolation, expires within 30s', async () => {
  let time = 1000000; const redis = memoryRedis(() => time);
  const cache = createPrivateMarketCache({ env, getRedis: () => redis, now: () => time });
  await cache.write(identity, batch(time));
  const serialized = JSON.stringify([...redis.values]);
  assert.ok(!serialized.includes('AAPL')); assert.ok(!serialized.includes(USER));
  assert.equal((await cache.read(identity)).assets[0].price, 123);
  for (const changed of [{ userId: OTHER }, { provider: 'kraken' }, { fingerprint: 'b'.repeat(24) }, { category: 'FOREX' }]) {
    assert.equal(await cache.read({ ...identity, ...changed }), null);
  }
  time += 30001; assert.equal(await cache.read(identity), null);
});
test('tampering, ciphertext copied between tenants, and stale entries fail closed', async () => {
  let time = 1000000; const redis = memoryRedis(() => time);
  const cache = createPrivateMarketCache({ env, getRedis: () => redis, now: () => time });
  await cache.write(identity, batch(time));
  const [key, encrypted] = [...redis.values][0];
  await cache.write({ ...identity, userId: OTHER }, batch(time));
  const otherKey = [...redis.values.keys()].find(k => k !== key);
  redis.values.set(otherKey, encrypted);
  await assert.rejects(cache.read({ ...identity, userId: OTHER }), /INTEGRITY/);
  redis.values.set(key, { ...encrypted, value: encrypted.value.replace('"data":"', '"data":"A') });
  await assert.rejects(cache.read(identity), /INTEGRITY/);
  await assert.rejects(cache.write(identity, { ...batch(time), expiresAt: time + 60000 }), /VALUE_INVALID/);
  await assert.rejects(cache.write(identity, { ...batch(time), publicDisplayAllowed: true }), /VALUE_INVALID/);
});
test('5 upstream calls per minute apply across categories and replicas, with isolated user/key budgets', async () => {
  let time = 1000000; const redis = memoryRedis(() => time);
  const a = createPrivateMarketCache({ env, getRedis: () => redis, now: () => time });
  const b = createPrivateMarketCache({ env, getRedis: () => redis, now: () => time });
  const outcomes = await Promise.allSettled(Array.from({ length: 6 }, (_, i) =>
    (i % 2 ? a : b).consumeBudget({ ...identity, category: i % 2 ? 'FOREX' : 'AKTIEN' })));
  assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 5);
  assert.equal(outcomes.filter(x => x.status === 'rejected').length, 1);
  await b.consumeBudget({ ...identity, userId: OTHER });
  await b.consumeBudget({ ...identity, fingerprint: 'b'.repeat(24) });
  time += 60001; await a.consumeBudget(identity);
});
test('missing secret, invalid identity and cache outage never produce data', async () => {
  const cache = createPrivateMarketCache({ env: {}, getRedis: () => { throw new Error('must not reach'); } });
  await assert.rejects(cache.read(identity), /KEY_REQUIRED/);
  await assert.rejects(cache.read({ ...identity, userId: 'spoofed' }), /IDENTITY_INVALID/);
  const unavailable = createPrivateMarketCache({ env, getRedis: () => { throw new Error('PRIVATE_MARKET_CACHE_UNAVAILABLE'); } });
  await assert.rejects(unavailable.read(identity), /CACHE_UNAVAILABLE/);
});
