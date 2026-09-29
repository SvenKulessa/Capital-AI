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
