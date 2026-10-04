import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QuoteFactSchema, QuoteDeliverySchema, isFresh } from '../shared/market-contracts.mjs';
import { observation } from './market.mjs';
import { MarketInfrastructure, payloadHash } from './infrastructure.mjs';
const raw = { testHarness: true };
const sample = () => ({ schemaVersion: '1.0.0', symbol: 'BTCUSD', venue: 'KRAKEN', provider: 'kraken', quote: 'USD',
 price: 100, bid: null, ask: null, volume24h: null, observedAt: Date.now() - 1000, receivedAt: Date.now(),
 mode: 'websocket', isDemo: false, licenseScope: 'unverified', payloadHash: payloadHash(raw) });
test('provider facts reject simulations, invalid instrument mappings and crossed books', () => {
 for (const patch of [{ isDemo: true }, { quote: 'USDT' }, { venue: 'BINANCE' }, { provider: 'binance' },
  { price: 0 }, { bid: 102, ask: 101 }, { volume24h: -1 }, { receivedAt: 1 }]) {
  assert.equal(QuoteFactSchema.safeParse({ ...sample(), ...patch }).success, false);
 }
});
test('freshness rejects old and future timestamps, not just a provider label', () => {
 assert.equal(isFresh(sample()), true);
 assert.equal(isFresh({ ...sample(), observedAt: Date.now() - 31000 }), false);
 assert.equal(isFresh({ ...sample(), observedAt: Date.now() + 1000 }), false);
 assert.equal(observation('BTCUSD', 'kraken', 100, Date.now() + 1000, 'USD', 'websocket', raw), null);
});
test('legacy provider observation is blocked before persistence', () => {
 assert.equal(observation('BTCUSD', 'kraken', 100, Date.now(), 'USD', 'websocket', raw), null);
 const parsed=QuoteFactSchema.parse(sample());
 assert.equal(parsed.bid, null); assert.equal(parsed.ask, null); assert.equal(parsed.volume24h, null);
});
test('quote delivery requires durable reference and cannot become actionable', () => {
 const value = { ...sample(), evidenceId: 'CAPITAL_FACTS:1:' + 'a'.repeat(64), availability: 'cached', validated: true, actionable: false, reasonCodes: ['PROVIDER_RIGHTS_UNVERIFIED'] };
 assert.equal(QuoteDeliverySchema.safeParse(value).success, true);
 assert.equal(QuoteDeliverySchema.safeParse({ ...value, evidenceId: 'verified' }).success, false);
 assert.equal(QuoteDeliverySchema.safeParse({ ...value, actionable: true }).success, false);
});
test('missing infrastructure cannot accept real or invented facts', async () => {
 const service = new MarketInfrastructure({});
 assert.equal(await service.start(), false);
 await assert.rejects(service.persist(sample(), raw), /INFRASTRUCTURE_UNAVAILABLE/);
 await assert.rejects(service.persist(sample(), {}), /INVALID_FACT/);
 assert.equal(await service.read('BTCUSD'), null);
});
