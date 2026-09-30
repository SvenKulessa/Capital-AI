import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MarketInfrastructure, payloadHash } from './infrastructure.mjs';
import { QuoteDeliverySchema } from '../shared/market-contracts.mjs';

const configured = Boolean(process.env.REDIS_URL && process.env.NATS_URL);
test('cache-only connection remains usable while evidence and delivery fail closed', { skip: !process.env.REDIS_URL }, async () => {
 const service = new MarketInfrastructure({ REDIS_URL: process.env.REDIS_URL });
 const raw = { testHarness: true, cacheOnly: true };
 const fact = { schemaVersion: '1.0.0', symbol: 'BTCUSD', venue: 'KRAKEN', provider: 'kraken', price: 100,
  quote: 'USD', bid: null, ask: null, volume24h: null, observedAt: Date.now(), receivedAt: Date.now(),
  mode: 'websocket', isDemo: false, licenseScope: 'unverified', payloadHash: payloadHash(raw) };
 try {
  assert.equal(await service.start(), false, 'full ingress is not ready');
  assert.equal(service.status().redis, 'connected');
  assert.equal(service.status().nats, 'unavailable');
  assert.equal(service.status().status, 'degraded');
  const connection = service.redis;
  assert.equal(await service.start(), false);
  assert.equal(service.redis, connection, 'retry reuses the healthy cache connection');
  await assert.rejects(service.persist(fact, raw), /INFRASTRUCTURE_UNAVAILABLE/);
  assert.equal(await service.read('BTCUSD'), null, 'cache does not replace durable evidence');
  await assert.rejects(service.replay('CAPITAL_FACTS:1:' + 'a'.repeat(64)), /INVALID_EVIDENCE_ID/);
 } finally { await service.close(); }
});
test('real Redis / JetStream: acknowledged fact, replay, cache integrity, ordering, restart and outage', { skip: !configured }, async () => {
 const service = new MarketInfrastructure();
 const raw = { testHarness: true, tick: Date.now() };
 const fact = { schemaVersion: '1.0.0', symbol: 'BTCUSD', venue: 'KRAKEN', provider: 'kraken', price: 100,
  quote: 'USD', bid: 99, ask: 101, volume24h: null, observedAt: Date.now() - 1000, receivedAt: Date.now(),
  mode: 'websocket', isDemo: false, licenseScope: 'unverified', payloadHash: payloadHash(raw) };
 try {
  assert.equal(await service.start(), true);
  const confirmed = await service.persist(fact, raw);
  assert.ok(QuoteDeliverySchema.safeParse(confirmed).success);
  assert.equal(confirmed.actionable, false);
  assert.deepEqual((await service.replay(confirmed.evidenceId)).rawPayload, raw);
  const duplicate = await service.persist(fact, raw);
  assert.equal(duplicate.evidenceId, confirmed.evidenceId);
  assert.equal((await service.read('BTCUSD')).price, 100);
  await service.persist({ ...fact, observedAt: fact.observedAt - 1000, price: 90 }, raw);
  assert.equal((await service.read('BTCUSD')).price, 100, 'late tick cannot overwrite newer quote');
  await service.redis.set('capital:quote:v1:BTCUSD', JSON.stringify({ ...confirmed, price: 999 }));
  assert.equal(await service.read('BTCUSD'), null, 'manipulated cache is not provider evidence');
  await service.persist(fact, raw);
  await service.close();
  assert.equal(await service.start(), true);
  assert.equal((await service.replay(confirmed.evidenceId)).fact.price, 100);
  assert.equal((await service.read('BTCUSD')).price, 100);
  const badHash = confirmed.evidenceId.slice(0, -64) + '0'.repeat(64);
  await assert.rejects(service.replay(badHash), /EVIDENCE_HASH_MISMATCH/);
  await assert.rejects(service.persist({ ...fact, observedAt: Date.now() - 31000 }, raw), /INVALID_FACT/);
  const info = await service.manager.streams.info('CAPITAL_FACTS');
  assert.equal(info.config.storage, 'file'); assert.equal(info.config.deny_delete, true); assert.equal(info.config.deny_purge, true);
  service.redis.destroy();
  await assert.rejects(service.persist(fact, raw), /INFRASTRUCTURE_UNAVAILABLE/);
  assert.equal(await service.read('BTCUSD'), null);
 } finally { await service.close(); }
});
