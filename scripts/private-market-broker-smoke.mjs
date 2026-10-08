// Real Core NATS + Valkey. Vault/provider/state fixtures only; never uses live credentials.
import assert from 'node:assert/strict';
import { connect } from '@nats-io/transport-node';
import { createClient } from 'redis';
import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { createPrivateMarketCache } from '../server/private-market-cache.mjs';
import { createPrivateProviderQuery } from '../server/private-provider-query.mjs';
import { createUserProviderVault } from '../server/user-provider-vault.mjs';
if (process.env.PRIVATE_MARKET_SMOKE_MODE !== 'DISPOSABLE_ONLY') throw new Error('Disposable broker acknowledgment required');
const env = { ...process.env, PRIVATE_PROVIDER_BRIDGE_ENABLED: 'true',
  SUPABASE_URL: 'https://fixture.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_fixture_only_01234567890123456789',
  AUTH_COOKIE_SIGNING_SECRET: 'fixture-cookie-signing-secret-0123456789',
  PRIVATE_PROVIDER_QUERY_SIGNING_SECRET: 'fixture-private-query-signing-secret-0123456789' };
for (const url of [env.NATS_URL, env.REDIS_URL]) {
  if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('Only loopback disposable brokers admitted');
}
const redis = createClient({ url: env.REDIS_URL }); redis.on('error', () => {});
const cache = createPrivateMarketCache({ env, getRedis: () => redis });
let user = '11111111-1111-1111-1111-111111111111';
const second = '22222222-2222-2222-2222-222222222222';
const stored = new Map();
let upstream = 0, vaultReads = 0;
const auth = { sameOrigin: () => true, verify: async () => ({ userId: user }) };
const fetchImpl = async (input, init) => {
  const url = new URL(input);
  if (url.hostname === 'fixture.supabase.co') {
    assert.ok(url.pathname.endsWith('capital_ai_get_user_provider_secret'));
    vaultReads++;
    const body = JSON.parse(init.body);
    return Response.json(stored.get(body._user_id + ':' + body._provider) || null);
  }
  upstream++;
  if (url.origin === 'https://api.kraken.com') {
    if (url.pathname.includes('/private/')) return Response.json({ error: [], result: { permissions: ['query-funds'] } });
    const pairs = Object.fromEntries(Array.from({ length: 50 }, (_, i) => ['K' + i, {
      base: 'COIN' + i, quote: 'ZUSD', altname: 'COIN' + i + 'USD', wsname: 'COIN' + i + '/USD',
      aclass_base: 'currency', status: 'online' }]));
    return Response.json({ error: [], result: url.pathname.endsWith('/AssetPairs') ? pairs
      : Object.fromEntries(Object.keys(pairs).map(id => [id, { c: ['123', '1'] }])) });
  }
  assert.equal(url.origin, 'https://api.massive.com');
  assert.equal(init.redirect, 'error');
  assert.ok(!url.href.includes('fixture-key'));
  const mine = init.headers.Authorization === 'Bearer fixture-key-owner-one';
  const price = mine ? 101 : 202;
  const market = url.searchParams.get('market');
  const symbols = Array.from({ length: 50 }, (_, i) => market === 'indices' ? `I:FIX${i}`
    : market === 'fx' ? 'C:EUR' + String.fromCharCode(65 + Math.floor(i / 26)) + 'A' + String.fromCharCode(65 + i % 26) : `FIX${i}`);
  if (url.pathname.endsWith('/tickers')) return Response.json({ status: 'OK', results: symbols.map(ticker =>
    ({ ticker, active: true, market, type: 'CS', currency_name: 'usd' })) });
  if (url.pathname.endsWith('/products')) return Response.json({ status: 'OK', results: [
    { product_code: 'CL', asset_class: 'commodity', type: 'single', trade_currency_code: 'USD', price_quotation: 'USD per barrel' }] });
  if (url.pathname.endsWith('/contracts')) return Response.json({ status: 'OK', results: symbols.map(ticker =>
    ({ ticker, product_code: 'CL', active: true, type: 'single', settlement_date: '2026-12-01' })) });
  const requested = url.searchParams.get('ticker.any_of').split(',');
  return Response.json({ status: 'OK', results: requested.map(ticker => ({ ticker,
    type: ticker.startsWith('I:') ? 'indices' : ticker.startsWith('C:') ? 'fx' : 'stocks',
    product_code: 'CL', value: price, last_updated: Date.now() * 1e6, timeframe: 'DELAYED',
    session: { price, last_updated: Date.now() * 1e6 }, last_trade: { price, last_updated: Date.now() * 1e6 } })) });
};
const vault = createUserProviderVault({ env, auth, fetchImpl, privateMarketCache: cache });
const claims = new Set();
const state = { claimProviderQuery: async ({ envelope }) => {
  if (claims.has(envelope.requestId)) throw new Error('REPLAY'); claims.add(envelope.requestId);
} };
const query = createPrivateProviderQuery({ env, auth, vault, state });
let bridge, sub, loop;
async function request(category) {
  const req = Readable.from([Buffer.from(JSON.stringify({ provider: category === 'KRYPTO' ? 'kraken' : 'massive', operation: 'market.asset_class_snapshot', params: { category } }))]);
  req.method = 'POST'; req.headers = { 'content-type': 'application/json' };
  let status, result;
  await query.handle(req, { setHeader() {} }, new URL('https://fixture.local/api/profile/provider-query'),
    (_res, code, body) => { status = code; result = body; }, randomUUID());
  return { status, result };
}
function provision(owner, token, fingerprint) {
  stored.set(owner + ':massive', { secretPayload: JSON.stringify({ version: 3, apiKey: token }),
    status: 'VERIFIED', credentialFingerprint: fingerprint, permissions: { marketAccessApproved: true } });
}
try {
  await redis.connect();
  // Local mode tests the actual application protocol with a routing fixture.
  // CI requires the real separately started Rust image (no fixture bridge).
  if (process.env.PRIVATE_MARKET_EXTERNAL_RUST_BRIDGE !== 'true') {
    bridge = await connect({ servers: env.NATS_URL, user: env.NATS_BRIDGE_USER, pass: env.NATS_BRIDGE_PASSWORD });
    sub = bridge.subscribe('capital.private.provider.query.v1');
    loop = (async () => { for await (const message of sub) {
      assert.ok(!Buffer.from(message.data).toString().includes('fixture-key'));
      const answer = await bridge.request('capital.private.provider.execute.v1', message.data, { timeout: 8000 });
      bridge.publish(message.reply, answer.data);
    } })();
    await bridge.flush();
  }
  await query.start();
  provision(user, 'fixture-key-owner-one', 'a'.repeat(24));
  const one = await request('AKTIEN'); assert.equal(one.status, 200, JSON.stringify(one.result));
  assert.equal(one.result.data.returned, 50); assert.equal(one.result.data.assets[0].price, 101);
  assert.ok(Buffer.byteLength(JSON.stringify(one.result)) < 65536);
  const hit = await request('AKTIEN'); assert.equal(hit.status, 200);
  assert.equal(hit.result.data.cache, 'USER_PRIVATE_HIT'); assert.equal(upstream, 2);
  user = second; provision(user, 'fixture-key-owner-two', 'b'.repeat(24));
  const two = await request('AKTIEN'); assert.equal(two.status, 200);
  assert.equal(two.result.data.assets[0].price, 202); assert.equal(upstream, 4);
  const keys = await redis.keys('capital:private:market:v1:*');
  const payloads = await Promise.all(keys.map(key => redis.get(key)));
  assert.ok(!JSON.stringify([keys, payloads]).includes('fixture-key'));
  assert.ok(!JSON.stringify(payloads).includes('"price":'));
  assert.ok(!keys.some(key => key.includes(user)));
  assert.ok((await Promise.all(keys.map(key => redis.pTTL(key)))).every(ttl => ttl > 0 && ttl <= 60000));
  stored.get(user + ':massive').status = 'REVOKED';
  assert.equal((await request('AKTIEN')).status, 503); assert.equal(upstream, 4);
  stored.delete(user + ':massive'); assert.equal((await request('AKTIEN')).status, 503);
  for (const [i, category] of ['INDIZIES', 'FOREX', 'ROHSTOFFE'].entries()) {
    user = `33333333-3333-3333-3333-${String(i + 1).padStart(12, '0')}`;
    provision(user, 'fixture-key-owner-one', 'c'.repeat(24));
    const batch = await request(category); assert.equal(batch.status, 200);
    assert.equal(batch.result.data.returned, 50); assert.equal(batch.result.data.shortfall, 0);
  }
  stored.set(user + ':kraken', { secretPayload: JSON.stringify({ version: 2,
    spot: { apiKey: 'fixture-kraken-key', apiSecret: Buffer.from('fixture-private-secret').toString('base64') } }),
    status: 'VERIFIED', credentialFingerprint: 'd'.repeat(24), permissions: {} });
  const crypto = await request('KRYPTO'); assert.equal(crypto.status, 200);
  assert.equal(crypto.result.data.returned, 50); assert.equal(crypto.result.data.assets[0].observedAt, null);
  const cryptoHit = await request('KRYPTO'); assert.equal(cryptoHit.status, 200);
  assert.equal(cryptoHit.result.data.cache, 'USER_PRIVATE_HIT');
  assert.equal(vaultReads, 10);
  console.log('PASS: real NATS/Valkey HTTP batches, 5 classes x50 via Kraken/Massive, encrypted cache hit, two-user isolation, revoke/delete before cache; provider/Vault/state use fixtures; bridge=' + (process.env.PRIVATE_MARKET_EXTERNAL_RUST_BRIDGE === 'true' ? 'real Rust image' : 'local routing fixture'));
} finally {
  await query.close(); sub?.unsubscribe(); await bridge?.close(); await loop;
  if (redis.isOpen) await redis.quit();
}
