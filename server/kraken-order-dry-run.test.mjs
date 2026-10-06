import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createKrakenOrderDryRun } from './kraken-order-dry-run.mjs';

const env = {
  TRADING_CONFIRMATION_SECRET: '0123456789abcdef0123456789abcdef',
  KRAKEN_DRY_RUN_MAX_QUOTE_NOTIONAL: '1000',
};

function req(body, origin = 'https://capital-ai.online') {
  const stream = Readable.from(body == null ? [] : [Buffer.from(JSON.stringify(body))]);
  stream.method = 'POST';
  stream.headers = { origin, 'content-type': 'application/json' };
  return stream;
}
function res() {
  return { setHeader(){}, writeHead(){}, end(){} };
}
function json(response, status, body) {
  response.status = status;
  response.payload = body;
}
const auth = {
  sameOrigin: request => request.headers.origin === 'https://capital-ai.online',
  verify: async () => ({ userId: '00000000-0000-4000-8000-000000000001' }),
};
const baseOrder = {
  idempotencyKey: 'order-test-0001',
  pair: 'XBTEUR',
  quoteCurrency: 'EUR',
  side: 'buy',
  orderType: 'limit',
  volume: '0.01',
  price: '30000',
  riskQuoteAmount: '350',
};

async function invoke(handler, path, body, origin) {
  const response = res();
  await handler.handle(req(body, origin), response, new URL('https://capital-ai.online' + path), json, 'req-test-1');
  return response;
}

test('preview creates bounded confirmation and never calls provider', async () => {
  let calls = 0;
  const handler = createKrakenOrderDryRun({
    env,
    auth,
    vault: { readKrakenSpotTradingCredential: async () => { calls++; throw new Error('must not call'); } },
    fetchImpl: async () => { calls++; throw new Error('must not call'); },
    now: () => 1_800_000_000_000,
  });
  const result = await invoke(handler, '/api/market/trading/kraken/spot/preview', baseOrder);
  assert.equal(result.status, 200);
  assert.equal(result.payload.risk.decision, 'PASS_DRY_RUN_ONLY');
  assert.equal(result.payload.risk.liveExecutionEligible, false);
  assert.equal(result.payload.risk.calculatedLimitNotional, '300');
  assert.match(result.payload.confirmationToken, /^1800000120000\.[0-9a-f]{64}\./);
  assert.equal(calls, 0);
});

test('risk gate rejects limit exposure above declared bound before provider I/O', async () => {
  let calls = 0;
  const handler = createKrakenOrderDryRun({
    env,
    auth,
    vault: { readKrakenSpotTradingCredential: async () => { calls++; } },
    fetchImpl: async () => { calls++; },
  });
  const result = await invoke(handler, '/api/market/trading/kraken/spot/preview', {
    ...baseOrder,
    riskQuoteAmount: '250',
  });
  assert.equal(result.status, 400);
  assert.equal(calls, 0);
});

test('confirm calls Kraken AddOrder only with validate=true and replays idempotently', async () => {
  let upstreamCalls = 0;
  const nowValue = 1_800_000_000_000;
  const vault = {
    readKrakenSpotTradingCredential: async () => ({
      credentials: {
        apiKey: 'kraken-api-key-test',
        apiSecret: Buffer.from('dry-run-secret-for-tests').toString('base64'),
      },
      capabilities: { orderCreate: true, orderCancel: true, withdrawals: false },
    }),
  };
  const handler = createKrakenOrderDryRun({
    env,
    auth,
    vault,
    now: () => nowValue,
    fetchImpl: async (url, options) => {
      upstreamCalls++;
      assert.equal(String(url), 'https://api.kraken.com/0/private/AddOrder');
      assert.equal(options.method, 'POST');
      const form = new URLSearchParams(String(options.body));
      assert.equal(form.get('validate'), 'true');
      assert.equal(form.get('ordertype'), 'limit');
      assert.equal(form.get('type'), 'buy');
      assert.equal(form.get('volume'), '0.01');
      assert.equal(form.get('price'), '30000');
      assert.match(form.get('cl_ord_id'), /^ca-[0-9a-f]{15}$/);
      assert.equal(new Date(form.get('deadline')).getTime(), nowValue + 10_000);
      assert.ok(options.headers['API-Sign']);
      return Response.json({ error: [], result: { descr: { order: 'buy 0.01 XBTEUR @ limit 30000' } } });
    },
  });
  const preview = await invoke(handler, '/api/market/trading/kraken/spot/preview', baseOrder);
  const confirmBody = { ...baseOrder, confirmationToken: preview.payload.confirmationToken };
  const first = await invoke(handler, '/api/market/trading/kraken/spot/confirm', confirmBody);
  assert.equal(first.status, 200);
  assert.equal(first.payload.status, 'VALIDATED_NOT_SUBMITTED');
  assert.equal(first.payload.provider.providerMode, 'validate_only');
  assert.equal(first.payload.liveExecutionEnabled, false);
  assert.equal(first.payload.persistentIdempotencyReady, false);

  const second = await invoke(handler, '/api/market/trading/kraken/spot/confirm', confirmBody);
  assert.equal(second.status, 200);
  assert.equal(second.payload.idempotentReplay, true);
  assert.equal(upstreamCalls, 1);
});

test('same idempotency key cannot be reused for a different order', async () => {
  const nowValue = 1_800_000_000_000;
  const handler = createKrakenOrderDryRun({
    env,
    auth,
    now: () => nowValue,
    vault: {
      readKrakenSpotTradingCredential: async () => ({
        credentials: {
          apiKey: 'kraken-api-key-test',
          apiSecret: Buffer.from('dry-run-secret-for-tests').toString('base64'),
        },
        capabilities: { orderCreate: true },
      }),
    },
    fetchImpl: async () => Response.json({ error: [], result: { descr: { order: 'validated' } } }),
  });
  const firstPreview = await invoke(handler, '/api/market/trading/kraken/spot/preview', baseOrder);
  await invoke(handler, '/api/market/trading/kraken/spot/confirm', {
    ...baseOrder,
    confirmationToken: firstPreview.payload.confirmationToken,
  });

  const changed = { ...baseOrder, volume: '0.02', riskQuoteAmount: '700' };
  const changedPreview = await invoke(handler, '/api/market/trading/kraken/spot/preview', changed);
  const conflict = await invoke(handler, '/api/market/trading/kraken/spot/confirm', {
    ...changed,
    confirmationToken: changedPreview.payload.confirmationToken,
  });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.payload.error, 'idempotency_key_conflict');
});

test('market dry-run requires explicit quote-risk bound and remains non-executable', async () => {
  const handler = createKrakenOrderDryRun({ env, auth });
  const result = await invoke(handler, '/api/market/trading/kraken/spot/preview', {
    ...baseOrder,
    orderType: 'market',
    price: undefined,
    riskQuoteAmount: '500',
  });
  assert.equal(result.status, 200);
  assert.equal(result.payload.risk.marketPriceBounded, false);
  assert.equal(result.payload.liveExecutionEnabled, false);
});

test('cross-origin confirmation is denied before credential or provider access', async () => {
  let calls = 0;
  const handler = createKrakenOrderDryRun({
    env,
    auth,
    vault: { readKrakenSpotTradingCredential: async () => { calls++; } },
    fetchImpl: async () => { calls++; },
  });
  const result = await invoke(handler, '/api/market/trading/kraken/spot/confirm', {
    ...baseOrder,
    confirmationToken: 'x',
  }, 'https://evil.example');
  assert.equal(result.status, 403);
  assert.equal(calls, 0);
});
