import test from 'node:test';
import assert from 'node:assert/strict';
import {
  spotWireRequest,parseSpotWireFrame,ingestSpotWireFrame,spotWireInventory,
  fetchAdmittedSpotRest,startAdmittedSpotWebSocket,
} from './spot-provider-wire.mjs';

const now=Date.now();
const sample=(patch={})=>({
  provider:'binance',symbol:'BTCUSDT',transport:'websocket',
  payload:{e:'trade',E:now,s:'BTCUSDT',p:'78123.456',T:now,...patch},
});
const enabled={MARKET_SPOT_INGESTION_ENABLED:'true',MARKET_QUOTES_ENABLED:'true',MARKET_SYMBOLS:'BTCUSDT,BTCUSD'};

test('Binance Spot WS trade uses actual trade timestamp, not server ingestion time',()=>{
  const row=parseSpotWireFrame(sample());
  assert.equal(row.price,78123.456);
  assert.equal(row.observedAt,now);
  assert.equal(row.quote,'USDT');
  assert.equal(row.symbol,'BTCUSDT');
  assert.equal(row.volume24h,null);
  assert.equal(parseSpotWireFrame({...sample(),payload:{stream:'btcusdt@trade',data:sample().payload}}).observedAt,now);
});

test('Binance Spot REST recent-trades uses latest exchange-observed trade time',()=>{
  const row=parseSpotWireFrame({provider:'binance',symbol:'BTCUSDT',transport:'rest',
    payload:[{id:3,price:'70001',time:now-2000},{id:4,price:'70003',time:now-1000}]});
  assert.equal(row.price,70003);
  assert.equal(row.observedAt,now-1000);
});

test('Kraken Spot WS v2 ticker maps last price and RFC3339 provider timestamp',()=>{
  const stamp=new Date(now).toISOString();
  const row=parseSpotWireFrame({provider:'kraken',symbol:'BTCUSD',transport:'websocket',
    payload:{channel:'ticker',type:'update',data:[{symbol:'BTC/USD',last:72100.5,timestamp:stamp}]}});
  assert.equal(row.price,72100.5);
  assert.equal(row.observedAt,now);
  assert.equal(row.quote,'USD');
});

test('Kraken Spot REST Trades chooses latest trade using provider seconds precision',()=>{
  const secs=now/1000;
  const row=parseSpotWireFrame({provider:'kraken',symbol:'BTCUSD',transport:'rest',
    payload:{error:[],result:{XXBTZUSD:[['71001','0.2',secs-10,'b','m'],['71008','0.3',secs,'s','l']],last:'1'}}});
  assert.equal(row.price,71008);
  assert.equal(row.observedAt,Math.floor(now));
});

test('REST request URLs and WebSocket subscription formats use immutable vendor origins',()=>{
  const b=spotWireRequest({provider:'binance',symbol:'BTCUSDT',transport:'rest'});
  const k=spotWireRequest({provider:'kraken',symbol:'BTCUSD',transport:'rest'});
  assert.equal(b.url,'https://api.binance.com/api/v3/trades?symbol=BTCUSDT&limit=1');
  assert.equal(k.url,'https://api.kraken.com/0/public/Trades?pair=BTC%2FUSD&count=1&assetVersion=1');
  assert.equal(b.redirect,'error');assert.equal(k.credentials,'omit');
  assert.deepEqual(JSON.parse(spotWireRequest({provider:'kraken',symbol:'BTCUSD',transport:'websocket'}).subscribe),
    {method:'subscribe',params:{channel:'ticker',symbol:['BTC/USD'],snapshot:true}});
  assert.deepEqual(JSON.parse(spotWireRequest({provider:'binance',symbol:'BTCUSDT',transport:'websocket'}).subscribe),
    {method:'SUBSCRIBE',params:['btcusdt@trade'],id:1});
  assert.ok(spotWireInventory().every(item=>item.connectionsStarted===false&&item.publicDisplay===false));
});

test('symbol spoofing, forged timestamps, bad prices and non-trade frames fail closed',()=>{
  for(const bad of [
    {...sample(),payload:{e:'trade',s:'ETHUSDT',p:'10',T:now}},
    {...sample(),payload:{e:'24hrTicker',s:'BTCUSDT',c:'10',E:now}},
    {...sample(),payload:{e:'trade',s:'BTCUSDT',p:'-1',T:now}},
    {...sample(),payload:{e:'trade',s:'BTCUSDT',p:'Infinity',T:now}},
    {...sample(),payload:{e:'trade',s:'BTCUSDT',p:'10',T:NaN}},
    {...sample(),payload:{e:'trade',s:'BTCUSDT',p:'10',T:'yesterday'}},
    {provider:'binance',symbol:'BTCUSD',transport:'rest',payload:[]},
    {provider:'kraken',symbol:'BTCUSD',transport:'websocket',payload:{channel:'ticker',type:'update',data:[{symbol:'ETH/USD',last:2,timestamp:new Date(now).toISOString()}]}},
    {provider:'kraken',symbol:'BTCUSD',transport:'rest',payload:{error:['EGeneral:Internal'],result:{}}},
    {provider:'kraken',symbol:'BTCUSD',transport:'rest',payload:{error:[],result:{XXBTZUSD:[[123,'0.1',now/1000]],ETHUSD:[[10,'0.1',now/1000]]}}},
    {...sample(),payload:'x'.repeat(65537)},
  ]) assert.throws(()=>parseSpotWireFrame(bad),/SPOT_|BINANCE_|KRAKEN_/);
  assert.throws(()=>spotWireRequest({provider:'binance',symbol:'https://evil.test',transport:'websocket'}),/SPOT_SYMBOL/);
  assert.throws(()=>spotWireRequest({provider:'kraken',symbol:'BTCUSD',transport:'gopher'}),/SPOT_TRANSPORT/);
});

test('unlicensed REST/WS ingestion cannot parse frames or write to NATS/Valkey',async()=>{
  let touched=0;
  const store={status(){touched++;throw Error('unexpected infrastructure I/O');},
    persist(){touched++;},replay(){touched++;}};
  for(const transport of ['rest','websocket']){
    for(const provider of ['binance','kraken']){
      const row=await ingestSpotWireFrame({provider,symbol:provider==='binance'?'BTCUSDT':'BTCUSD',
        transport,payload:'broken or malicious bytes'}, {env:enabled,store});
      assert.deepEqual(row,{status:'BLOCKED',reason:'REALTIME_MARKET_DATA_RIGHTS_NOT_ADMITTED'});
    }
  }
  assert.equal(touched,0);
});

test('network REST and websocket connectors refuse unlicensed providers before ANY I/O',async()=>{
  let networkCalls=0;
  class FakeSocket {constructor(){networkCalls++;throw Error('forbidden websocket');}}
  const fetchImpl=()=>{networkCalls++;throw Error('forbidden HTTP');};
  const store={status(){networkCalls++;throw Error('forbidden broker read');}};
  for(const provider of ['kraken','binance']){
    const symbol=provider==='kraken'?'BTCUSD':'BTCUSDT';
    assert.deepEqual(await fetchAdmittedSpotRest({provider,symbol,env:enabled,store,fetchImpl}),
      {status:'BLOCKED',reason:'REALTIME_MARKET_DATA_RIGHTS_NOT_ADMITTED'});
    assert.deepEqual(startAdmittedSpotWebSocket({provider,symbol,env:enabled,store,SocketClass:FakeSocket}),
      {status:'BLOCKED',reason:'REALTIME_MARKET_DATA_RIGHTS_NOT_ADMITTED'});
  }
  assert.equal(networkCalls,0);
});
test('Kraken REST replies for an unrelated trade pair cannot be relabeled as BTCUSD',()=>{
  assert.throws(()=>parseSpotWireFrame({provider:'kraken',symbol:'BTCUSD',transport:'rest',
    payload:{error:[],result:{ETHUSD:[['2000','0.1',now/1000]]}}}),/KRAKEN_TRADES_INVALID/);
});
