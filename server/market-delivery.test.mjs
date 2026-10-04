import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { EventEmitter } from 'node:events';
import { assetClasses, InstrumentManifestSchema, QuoteDeliverySchema } from '../shared/market-contracts.mjs';
import { createMarketDelivery } from './market-delivery.mjs';

const manifest = InstrumentManifestSchema.parse(assetClasses.flatMap(category => Array.from({ length: 100 }, (_, index) => ({
  assetId: 'asset:' + assetClasses.indexOf(category) + ':' + index, symbol: 'C' + assetClasses.indexOf(category) + '_' + index, name: 'Synthetic capacity fixture', venue: 'TEST',
  quote: 'EUR', category, provider: 'test-fixture',
}))));
function delivery(i, patch = {}) {
  return { schemaVersion: '2.0.0', instrument: i, symbol: i.symbol, venue: i.venue, provider: i.provider,
    price: 1, quote: i.quote, bid: null, ask: null, volume24h: null,
    observedAt: Date.now() - 100, receivedAt: Date.now(), mode: 'rest', isDemo: false,
    licenseScope: 'unverified', payloadHash: 'a'.repeat(64), evidenceId: 'CAPITAL_FACTS:1:' + 'b'.repeat(64),
    availability: 'cached', validated: true, actionable: false, reasonCodes: [], ...patch };
}
async function serve(t, options) {
  const app = createMarketDelivery(options);
  const server = http.createServer(async (req, res) => {
    await app.handle(req, res, new URL(req.url, 'http://localhost'), (res, status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body));
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { app.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  return 'http://127.0.0.1:' + server.address().port;
}
test('900 synthetic quotes across nine classes traverse all pages with bounded read concurrency', async t => {
  let active = 0, maximum = 0;
  const bySymbol = new Map(manifest.map(i => [i.symbol, i]));
  const broker = { async read(symbol) {
    active++; maximum = Math.max(maximum, active);
    await new Promise(resolve => setImmediate(resolve)); active--;
    return delivery(bySymbol.get(symbol));
  }};
  const url = await serve(t, { manifest, broker, admitted: () => true, enabled: true });
  const seen = new Set();
  for (const category of assetClasses) {
    const response = await fetch(url + '/api/market/snapshot?category=' + category);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.items.length, 100);
    assert.equal(data.nextCursor, null);
    assert.equal(data.coverage.length, 9);
    for (const f of data.items) { assert.equal(QuoteDeliverySchema.safeParse(f).success, true); seen.add(f.symbol); }
  }
  assert.equal(seen.size, 900); assert.ok(maximum <= 16);
  let cursor = '', all = 0;
  do {
    const data = await (await fetch(url + '/api/market/snapshot' + (cursor ? '?cursor=' + cursor : ''))).json();
    all += data.items.length; cursor = data.nextCursor;
  } while (cursor);
  assert.equal(all, 900);
});
test('admission and disabled gates fail closed without cache access', async t => {
  let reads = 0;
  const broker = { async read() { reads++; } };
  for (const options of [{ admitted: () => false, enabled: true }, { admitted: () => true, enabled: false }]) {
    const url = await serve(t, { manifest, broker, ...options });
    for (const path of ['/api/market/snapshot', '/api/market/events'])
      assert.equal((await fetch(url + path)).status, 503);
  }
  assert.equal(reads, 0);
});
test('page validation, stale quotes and manifest mismatches are rejected', async t => {
  const url = await serve(t, { manifest, enabled: true, admitted: () => true,
    broker: { async read(symbol) {
      const i = manifest.find(i => i.symbol === symbol);
      return delivery(i, i.symbol.endsWith('_0') ? { observedAt: Date.now() - 31000 } : { instrument: { ...i, venue: 'WRONG' } });
    }} });
  for (const query of ['limit=101', 'limit=0', 'cursor=-1', 'cursor=901', 'category=UNKNOWN', 'limit=100000'])
    assert.equal((await fetch(url + '/api/market/snapshot?' + query)).status, 400);
  assert.equal((await (await fetch(url + '/api/market/snapshot')).json()).items.length, 0);
  assert.equal((await fetch(url + '/api/market/events', { method: 'POST' })).status, 405);
});
test('SSE uses one broker listener, resets on reconnect and releases on disconnect', async t => {
  let listener, subscriptions = 0, stopped = 0;
  const url = await serve(t, { manifest, enabled: true, admitted: () => true,
    broker: { async subscribeQuotes(fn) { subscriptions++; listener = fn; return () => { stopped++; }; } } });
  const a = new AbortController(), b = new AbortController();
  const first = await fetch(url + '/api/market/events', { signal: a.signal });
  const reader = first.body.getReader();
  assert.match(new TextDecoder().decode((await reader.read()).value), /event: reset/);
  const second = await fetch(url + '/api/market/events', { signal: b.signal });
  assert.equal(subscriptions, 1);
  listener(delivery(manifest[0]));
  assert.match(new TextDecoder().decode((await reader.read()).value), /event: quote/);
  a.abort(); b.abort();
  for (let n = 0; n < 20 && !stopped; n++) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(stopped, 1);
  const third = await fetch(url + '/api/market/events');
  assert.equal(subscriptions, 2); await third.body.cancel(); await second.body.cancel().catch(() => {});
});
test('slow SSE consumers close instead of growing an unbounded application queue', async () => {
  let listener, stopped = 0;
  const app = createMarketDelivery({ manifest, enabled: true, admitted: () => true,
    broker: { async subscribeQuotes(fn) { listener = fn; return () => { stopped++; }; } } });
  const res = new EventEmitter();
  Object.assign(res, { destroyed: false, writableEnded: false, writeHead() {}, write() { return false; },
    end() { this.writableEnded = true; } });
  const req = { method: 'GET', socket: { setTimeout() {} } };
  await app.handle(req, res, new URL('http://localhost/api/market/events'), () => {});
  listener(delivery(manifest[0]));
  assert.equal(res.writableEnded, true); assert.equal(stopped, 1); app.close();
});
test('manifest rejects duplicate identity, unsafe symbols and per-class overflow', () => {
  assert.equal(InstrumentManifestSchema.safeParse([manifest[0], manifest[0]]).success, false);
  assert.equal(InstrumentManifestSchema.safeParse([{ ...manifest[0], symbol: 'evil.>' }]).success, false);
  assert.equal(InstrumentManifestSchema.safeParse(Array.from({ length: 1001 }, (_, n) => ({ ...manifest[0], symbol: 'S' + n }))).success, false);
  assert.equal(QuoteDeliverySchema.safeParse(delivery(manifest[0], { provider: 'wrong' })).success, false);
});
test('hung cache reads time out and cannot accumulate beyond 32 outstanding reads', async t => {
  let reads = 0;
  const url = await serve(t, { manifest, enabled:true, admitted:()=>true, timeoutMs:25,
    broker: { read() { reads++; return new Promise(()=>{}); } } });
  for (let n=0;n<2;n++) {
    const before=Date.now();const response=await fetch(url+'/api/market/snapshot');
    assert.equal(response.status,200);assert.equal((await response.json()).items.length,0);
    assert.ok(Date.now()-before<1000);
  }
  assert.equal((await fetch(url+'/api/market/snapshot')).status,429);assert.equal(reads,32);
});
test('distinct venues of one asset count once in class coverage', async t => {
  const first=manifest[0], second={...first,symbol:'OTHER',venue:'OTHER'};
  const url=await serve(t,{manifest:[first,second],enabled:true,admitted:()=>true,
    broker:{async read(symbol){return delivery(symbol==='OTHER'?second:first);}}});
  const data=await (await fetch(url+'/api/market/snapshot')).json();
  assert.equal(data.items.length,2);assert.equal(data.coverage.find(c=>c.category===first.category).registered,1);
});
test('stale pagination cursors and unknown stream inputs are rejected',async t=>{
 const url=await serve(t,{manifest,enabled:true,admitted:()=>true,broker:{async read(){return null;}}});
 assert.equal((await fetch(url+'/api/market/snapshot?cursor='+'f'.repeat(64)+':100')).status,409);
 assert.equal((await fetch(url+'/api/market/events?token=ignored')).status,400);
 assert.equal((await fetch(url+'/api/market/events',{headers:{'Last-Event-ID':'invalid'}})).status,400);
});
test('SSE subscription handshake is bounded when the broker hangs',async t=>{
 const url=await serve(t,{manifest,enabled:true,admitted:()=>true,timeoutMs:25,broker:{subscribeQuotes(){return new Promise(()=>{});}}});
 const before=Date.now();assert.equal((await fetch(url+'/api/market/events')).status,503);assert.ok(Date.now()-before<1000);
});
