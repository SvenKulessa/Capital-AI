import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROVIDER_REGISTRY, ProviderRegistryService } from '../../config/providers/providerRegistry';
import { spotWireRequest } from '../../../server/spot-provider-wire.mjs';

test('Binance registry does not refer to retired March 2026 all-market ticker', () => {
  const binance = PROVIDER_REGISTRY.binance_market_data;
  assert.equal(binance.endpoints.websocketUrl,
    'wss://stream.binance.com:9443/ws/!miniTicker@arr');
  assert.doesNotMatch(JSON.stringify(binance.endpoints), /!ticker@arr/i);
  assert.equal(binance.productionAdmission, 'BLOCKED');
  assert.equal(ProviderRegistryService.isProviderProductionAdmitted('binance_market_data'), false);
});

test('source-bound BTCUSDT trade adapter remains independent from generic snapshot registry', () => {
  const request = spotWireRequest({ provider: 'binance', symbol: 'BTCUSDT', transport: 'websocket' });
  assert.equal(request.url, 'wss://stream.binance.com:9443/ws');
  const subscription = JSON.parse(request.subscribe);
  assert.deepEqual(subscription.params, ['btcusdt@trade']);
  assert.equal(subscription.method, 'SUBSCRIBE');
});
