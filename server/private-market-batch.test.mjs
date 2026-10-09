import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchMassiveClass, fetchKrakenClass, verifyMassiveKey } from './private-market-batch.mjs';
const NOW = Date.parse('2026-10-08T12:00:00Z');
const token = 'fixture-massive-key';
const json = body => new Response(JSON.stringify(body));
function fixture(category) {
  const markets = { AKTIEN: 'stocks', INDIZIES: 'indices', FOREX: 'fx' };
  const refs = Array.from({ length: 50 }, (_, i) => ({
    ticker: category === 'FOREX' ? 'C:EUR' + String.fromCharCode(65 + Math.floor(i / 26)) + 'AA'.slice(0, 1) + String.fromCharCode(65 + i % 26)
      : (category === 'INDIZIES' ? 'I:' : '') + 'FIX' + i,
    active: true, market: markets[category], type: 'CS', currency_name: 'usd', name: 'Fixture ' + i,
  }));
  const prices = refs.map(r => ({ ticker: r.ticker, type: markets[category],
    value: 123, last_updated: NOW * 1e6, timeframe: 'DELAYED',
    session: { price: 123, last_updated: NOW * 1e6 } }));
  return { refs, prices };
}
for (const category of ['AKTIEN', 'INDIZIES', 'FOREX']) {
  test('Massive returns 50 distinct owner-private ' + category + ' snapshots with exact reference binding', async () => {
    const { refs, prices } = fixture(category), calls = [];
    const value = await fetchMassiveClass({ category, token, now: () => NOW,
      fetchImpl: async (url, init) => {
        calls.push(new URL(url));
        assert.equal(new URL(url).origin, 'https://api.massive.com');
        assert.equal(init.method, 'GET'); assert.equal(init.redirect, 'error');
        assert.equal(init.headers.Authorization, 'Bearer ' + token);
        assert.ok(!String(url).includes(token));
        return json({ status: 'OK', results: calls.length === 1 ? refs : prices });
      } });
    assert.equal(value.returned, 50); assert.equal(value.shortfall, 0);
    assert.equal(value.status, 'TARGET_RETURNED'); assert.equal(value.upstreamRequests, 2);
    assert.equal(value.publicDisplayAllowed, false); assert.equal(value.jetStreamPublicationAllowed, false);
    assert.equal(new Set(value.assets.map(x => x.symbol)).size, 50);
    assert.equal(calls[1].searchParams.get('ticker.any_of').split(',').length, 50);
    assert.equal(value.assets[0].observedAt, NOW);
    if (category === 'INDIZIES') assert.equal(value.assets[0].quote, null);
  });
}
test('Massive filters duplicate, foreign, unavailable and future-dated rows without fabricating coverage', async () => {
  const { refs, prices } = fixture('AKTIEN');
  let call = 0;
  const value = await fetchMassiveClass({ category: 'AKTIEN', token, now: () => NOW,
    fetchImpl: async () => json({ status: 'OK', results: ++call === 1 ? refs :
      [prices[0], prices[0], { ...prices[1], ticker: 'FOREIGN' }, { ...prices[2], error: 'NOT_ENTITLED' },
        { ...prices[3], session: { price: 123, last_updated: (NOW + 60000) * 1e6 } }] }) });
  assert.equal(value.returned, 1); assert.equal(value.shortfall, 49);
  assert.equal(value.status, 'BELOW_TARGET');
});
test('Massive commodity futures bind product class, active contract and exact product in three calls', async () => {
  const contracts = Array.from({ length: 50 }, (_, i) => ({ ticker: 'CLFIX' + i,
    product_code: 'CL', active: true, type: 'single', settlement_date: '2026-12-01' }));
  let call = 0;
  const value = await fetchMassiveClass({ category: 'ROHSTOFFE', token, now: () => NOW,
    fetchImpl: async url => {
      const path = new URL(url).pathname; call++;
      if (path.endsWith('/products')) return json({ status: 'OK', results: [
        { product_code: 'CL', asset_class: 'commodity', type: 'single', trade_currency_code: 'USD',
          price_quotation: 'USD per barrel' },
        { product_code: 'ES', asset_class: 'equity', type: 'single', trade_currency_code: 'USD' }] });
      if (path.endsWith('/contracts')) {
        assert.equal(new URL(url).searchParams.get('product_code.any_of'), 'CL');
        return json({ status: 'OK', results: contracts });
      }
      return json({ status: 'OK', results: contracts.map(c => ({ ticker: c.ticker,
        product_code: c.product_code, last_trade: { price: 80, last_updated: NOW * 1e6 } })) });
    } });
  assert.equal(call, 3); assert.equal(value.returned, 50);
  assert.ok(value.assets.every(x => x.instrumentType === 'commodity_future' && x.productCode === 'CL'));
  assert.equal(new Set(value.assets.map(x => x.productCode)).size, 1, '50 contracts do not mean 50 commodities');
});
test('Kraken discovers 50 unique currency bases, fetches one Ticker batch and never invents exchange time', async () => {
  const pairs = Object.fromEntries(Array.from({ length: 60 }, (_, i) => ['K' + i,
    { base: 'COIN' + i, quote: 'ZUSD', altname: 'COIN' + i + 'USD', wsname: 'COIN' + i + '/USD',
      aclass_base: 'currency', status: 'online' }]));
  pairs.DUP = { ...pairs.K0 }; pairs.EQUITY = { ...pairs.K1, base: 'AAPLX', aclass_base: 'tokenized_asset' };
  pairs.FIAT = { ...pairs.K1, base: 'ZEUR' };
  let call = 0;
  const value = await fetchKrakenClass({ category: 'KRYPTO', now: () => NOW,
    fetchImpl: async url => {
      call++;
      if (call === 1) { assert.equal(new URL(url).searchParams.get('aclass_base'), 'currency');
        return json({ error: [], result: pairs }); }
      assert.equal(new URL(url).searchParams.get('pair').split(',').length, 50);
      return json({ error: [], result: Object.fromEntries(Object.keys(pairs).map(k => [k, { c: ['123', '1'] }])) });
    } });
  assert.equal(call, 2); assert.equal(value.returned, 50);
  assert.ok(value.assets.every(x => x.observedAt === null && x.timestampSource === 'receipt_only'));
  assert.ok(!value.assets.some(x => x.symbol === 'AAPLX/USD' || x.symbol === 'EUR/USD'));
});
test('unsupported class, invalid key, entitlement, quota, malformed and oversized responses fail closed', async () => {
  await assert.rejects(fetchMassiveClass({ category: 'KRYPTO', token }), /CLASS_UNSUPPORTED/);
  await assert.rejects(fetchKrakenClass({ category: 'AKTIEN' }), /CLASS_UNSUPPORTED/);
  await assert.rejects(verifyMassiveKey({ token: 'bad\nkey' }), /INVALID_KEY/);
  for (const [status, body, pattern] of [[403, '{}', /ENTITLEMENT/], [429, '{}', /RATE_LIMITED/],
    [200, 'not-json', /UPSTREAM_INVALID/], [200, 'x'.repeat(524289), /UPSTREAM_INVALID/]]) {
    await assert.rejects(fetchMassiveClass({ category: 'AKTIEN', token,
      fetchImpl: async () => new Response(body, { status }) }), pattern);
  }
  let calls = 0;
  await assert.rejects(fetchMassiveClass({ category: 'AKTIEN', token,
    consume: async () => { throw new Error('PRIVATE_MARKET_PROVIDER_RATE_LIMITED'); },
    fetchImpl: async () => { calls++; return json({}); } }), /RATE_LIMITED/);
  assert.equal(calls, 0);
});
