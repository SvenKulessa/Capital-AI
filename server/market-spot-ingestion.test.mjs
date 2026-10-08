import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MARKET_ASSET_CLASSES, MARKET_MINIMUM_ASSETS_PER_CLASS,
  SPOT_PROVIDER_CANDIDATES, marketAssetCoverage,
  evaluateSpotIngestion, ingestAdmittedSpotQuote,
} from './market-spot-ingestion.mjs';
const enabled = Object.freeze({
  MARKET_SPOT_INGESTION_ENABLED:'true',
  MARKET_QUOTES_ENABLED:'true',
  MARKET_SYMBOLS:'BTCUSDT,BTCUSD,AAPL,EUR/USD',
});
test('market coverage reports actual admitted instruments, not invented 50-per-class quotes', () => {
  assert.equal(MARKET_MINIMUM_ASSETS_PER_CLASS,50);
  const coverage=marketAssetCoverage();
  assert.deepEqual(Object.keys(coverage),MARKET_ASSET_CLASSES);
  assert.deepEqual(Object.fromEntries(MARKET_ASSET_CLASSES.map(id=>[id,coverage[id].admittedInstruments])),
    {KRYPTO:0,AKTIEN:0,INDIZIES:0,FOREX:20,ROHSTOFFE:0});
  assert.equal(coverage.FOREX.shortfall,30);
  assert.equal(coverage.KRYPTO.shortfall,50);
  assert.ok(MARKET_ASSET_CLASSES.every(id=>coverage[id].status==='BELOW_TARGET'));
});
test('spot candidate protocols are discoverable without inventing provider rights', () => {
  assert.ok(SPOT_PROVIDER_CANDIDATES.some(item=>item.id==='kraken' && item.protocols.includes('websocket')));
  assert.ok(SPOT_PROVIDER_CANDIDATES.some(item=>item.id==='ccxt' && item.protocols.includes('rest')));
  assert.ok(SPOT_PROVIDER_CANDIDATES.every(item=>item.rights!=='OPEN_DATA_ADMITTED'));
});
test('disabled spot runtime makes no exception for publicly accessible exchanges', () => {
  assert.deepEqual(evaluateSpotIngestion({provider:'kraken',symbol:'BTCUSD',transport:'websocket',env: {}}),
    {allowed:false,reason:'SPOT_RUNTIME_DISABLED'});
  assert.deepEqual(evaluateSpotIngestion({provider:'kraken',symbol:'BTCUSD',transport:'mqtt',env:enabled}),
    {allowed:false,reason:'SPOT_TRANSPORT_UNSUPPORTED'});
});
test('commercially unadmitted REST and WS requests are rejected before storage or provider I/O', async () => {
  let calls=0;
  const store={status(){calls++;throw new Error('must not reach storage');},persist(){calls++;},replay(){calls++;}};
  for(const provider of ['kraken','binance','coinbase','twelvedata','polygon']) {
    for(const transport of ['rest','websocket']) {
      const attempt=await ingestAdmittedSpotQuote({
        provider,symbol:'BTCUSD',transport,price:123.45,quote:'USD',observedAt:Date.now(),
      },{env:enabled,store});
      assert.equal(attempt.status,'BLOCKED');
      assert.equal(attempt.reason,'REALTIME_MARKET_DATA_RIGHTS_NOT_ADMITTED');
    }
  }
  assert.equal(calls,0);
});
test('ECB daily reference permission cannot be upgraded to realtime or WebSocket', async () => {
  const response=await ingestAdmittedSpotQuote({
    provider:'ecb-reference-rates',symbol:'EUR/USD',transport:'websocket',price:1.14,
    quote:'USD',observedAt:Date.now(),
  },{env:enabled});
  assert.deepEqual(response,{status:'BLOCKED',reason:'REALTIME_MARKET_DATA_RIGHTS_NOT_ADMITTED'});
});
test('the existing scoring/decision/trading pathways remain closed', () => {
  const coverage=marketAssetCoverage();
  assert.equal(coverage.FOREX.target,50);
  assert.equal(Object.values(coverage).reduce((sum,c)=>sum+c.admittedInstruments,0),20);
  assert.equal(evaluateSpotIngestion({provider:'wikidata-reference',symbol:'AAPL',transport:'rest',env:enabled}).allowed,false);
});
