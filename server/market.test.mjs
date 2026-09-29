import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { quote } from './market.mjs';

test('unsupported symbols are rejected before any provider request', async () => {
  const [status, body] = await quote('https://attacker.example');
  assert.equal(status, 400);
  assert.equal(body.error, 'unsupported_symbol');
});
test('missing feed and keys produce no fabricated price', async () => {
  delete process.env.TWELVE_DATA_API_KEY;
  delete process.env.POLYGON_API_KEY;
  const [status, body] = await quote('AAPL');
  assert.equal(status, 503);
  assert.equal(body.error, 'market_data_unavailable');
  assert.equal(body.price, undefined);
});

test('oversized provider responses are rejected', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.TWELVE_DATA_API_KEY;
  process.env.TWELVE_DATA_API_KEY = 'offline-test-key';
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.redirect, 'error');
    return new Response('x'.repeat(262145));
  };
  try { assert.equal((await quote('BTCUSD'))[0], 503); }
  finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.TWELVE_DATA_API_KEY;
    else process.env.TWELVE_DATA_API_KEY = originalKey;
  }
});

test('stale Twelve Data response continues to a fresh Polygon fallback', async () => {
  const originalFetch = globalThis.fetch;
  const previous = [process.env.TWELVE_DATA_API_KEY, process.env.POLYGON_API_KEY];
  process.env.TWELVE_DATA_API_KEY = 'offline-test-key';
  process.env.POLYGON_API_KEY = 'offline-test-key';
  const calls = [];
  globalThis.fetch = async (url, options) => {
    assert.equal(options.redirect, 'error');
    calls.push(url.hostname);
    return Response.json(url.hostname === 'api.twelvedata.com'
      ? { symbol: 'AAPL', close: 100, datetime: new Date(Date.now() - 60000).toISOString() }
      : { ticker: { ticker: 'AAPL', lastTrade: { p: 101, t: Date.now() } } });
  };
  try {
    const [status, body] = await quote('AAPL');
    assert.equal(status, 200);
    assert.equal(body.provider, 'polygon');
    assert.deepEqual(calls, ['api.twelvedata.com', 'api.polygon.io']);
  } finally {
    globalThis.fetch = originalFetch;
    ['TWELVE_DATA_API_KEY', 'POLYGON_API_KEY'].forEach((key, i) => {
      if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i];
    });
  }
});
