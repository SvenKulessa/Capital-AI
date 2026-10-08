import test from 'node:test';
import assert from 'node:assert/strict';
import {
  spotWireRequest,parseSpotWireFrame,ingestSpotWireFrame,spotWireInventory,
  fetchAdmittedSpotRest,startAdmittedSpotWebSocket,
  fetchPrivateUserSpotTrade,
  fetchPrivateUserSpotWsSnapshot,
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

test('private BYOK snapshot returns only non-actionable user data; no shared cache or publisher',async()=>{
  let calls=0;
  const row=await fetchPrivateUserSpotTrade({
    provider:'binance',symbol:'BTCUSDT',now:()=>now,
    fetchImpl:async(url,options)=>{
      calls++;
      assert.equal(new URL(url).hostname,'api.binance.com');
      assert.equal(options.credentials,'omit');
      assert.equal(options.redirect,'error');
      assert.equal(options.method,'GET');
      assert.equal(JSON.stringify(options).includes('API-KEY'),false);
      return Response.json([{id:1,price:'65432.1',time:now}]);
    },
  });
  assert.equal(calls,1);
  assert.deepEqual(row,{
    provider:'binance',symbol:'BTCUSDT',quote:'USDT',price:65432.1,observedAt:now,
    mode:'rest',timeSemantics:'realtime',dataScope:'USER_PRIVATE_MARKET_DATA',
    publicDisplayAllowed:false,redistributionAllowed:false,sharedCacheAllowed:false,
    jetStreamPublicationAllowed:false,actionable:false,executionEnabled:false,
  });
});
test('private market snapshot rejects stale data, other symbols and oversized responses',async()=>{
  const freshResponse=payload=>Response.json(payload);
  await assert.rejects(fetchPrivateUserSpotTrade({
    provider:'binance',symbol:'BTCUSDT',now:()=>now,
    fetchImpl:async()=>freshResponse([{price:'100',time:now-31000}]),
  }),/PRIVATE_SPOT_QUOTE_STALE/);
  await assert.rejects(fetchPrivateUserSpotTrade({
    provider:'kraken',symbol:'BTCUSD',now:()=>now,
    fetchImpl:async()=>freshResponse({error:[],result:{ETHUSD:[['100','1',now/1000]]}}),
  }),/KRAKEN_TRADES_INVALID/);
  await assert.rejects(fetchPrivateUserSpotTrade({
    provider:'binance',symbol:'BTCUSDT',now:()=>now,
    fetchImpl:async()=>new Response('x'.repeat(65537),{headers:{'content-type':'application/json'}}),
  }),/SPOT_HTTP_BODY_TOO_LARGE/);
});

import { createUserProviderVault } from './user-provider-vault.mjs';

// These integration tests run after npm dependencies are installed.
{
const env = {
  SUPABASE_URL:'https://project.supabase.co',
  SUPABASE_SECRET_KEY:'sb_secret_test_0123456789012345678901234567890123456789',
  AUTH_COOKIE_SIGNING_SECRET:'test-cookie-signing-secret-0123456789abcdef',
};
const auth = {verify:async()=>({userId:'11111111-1111-1111-1111-111111111111'}),sameOrigin:()=>true};
test('private Spot trade from each user\'s Vault connection never exposes a key or enters public quote cache',async()=>{
  const userId='11111111-1111-1111-1111-111111111111';
  const timestamp=Date.now();
  for(const [provider,symbol] of [['kraken','BTCUSD'],['binance','BTCUSDT']]){
    const events=[];
    const key='only-this-user-'+provider+'-secret-key';
    const pair={apiKey:'this-user-'+provider+'-key',apiSecret:key};
    const fetchImpl=async(input,opts={})=>{
      const url=new URL(String(input));
      if(url.origin==='https://project.supabase.co'){
        assert.ok(url.pathname.endsWith('/capital_ai_get_user_provider_secret'));
        const body=JSON.parse(String(opts.body));
        assert.equal(body._user_id,userId);
        assert.equal(body._provider,provider);
        events.push('vault');
        return Response.json({secretPayload:JSON.stringify({version:2,spot:pair,futures:null}),permissions:{}});
      }
      if(url.pathname==='/0/private/GetApiKeyInfo'){
        assert.equal(opts.headers['API-Key'],pair.apiKey);
        events.push('verify');
        return Response.json({error:[],result:{permissions:['query-funds']}});
      }
      if(url.pathname==='/sapi/v1/account/apiRestrictions'){
        assert.equal(opts.headers['X-MBX-APIKEY'],pair.apiKey);
        events.push('verify');
        return Response.json({enableReading:true,enableWithdrawals:false,
          enableInternalTransfer:false,permitsUniversalTransfer:false,
          enableSpotAndMarginTrading:false,enableFutures:false});
      }
      if(url.pathname==='/api/v3/trades'){
        assert.equal(opts.credentials,'omit');
        assert.equal(opts.headers['X-MBX-APIKEY'],undefined);
        events.push('price');
        return Response.json([{price:'81234.5',time:timestamp}]);
      }
      if(url.pathname==='/0/public/Trades'){
        assert.equal(opts.credentials,'omit');
        assert.equal(opts.headers['API-Key'],undefined);
        events.push('price');
        return Response.json({error:[],result:{'BTC/USD':[['81234.5','0.1',timestamp/1000]],last:'x'}});
      }
      throw Error('unrecognized test route');
    };
    const vault=createUserProviderVault({env,auth,fetchImpl});
    const response=await vault.executePrivateQuery(userId,provider,'market.spot_trade',{symbol});
    assert.deepEqual(events,['vault','verify','price']);
    assert.equal(response.symbol,symbol);
    assert.equal(response.price,81234.5);
    assert.equal(response.dataScope,'USER_PRIVATE_MARKET_DATA');
    assert.equal(response.publicDisplayAllowed,false);
    assert.equal(response.sharedCacheAllowed,false);
    assert.equal(response.jetStreamPublicationAllowed,false);
    assert.equal(response.actionable,false);
    assert.doesNotMatch(JSON.stringify(response),/this-user-|only-this-user/);
  }
});
test('missing private Vault connection stops user market snapshots before public provider I/O',async()=>{
  let calls=0;
  const vault=createUserProviderVault({env,auth,fetchImpl:async(input)=>{
    calls++;
    const url=new URL(String(input));
    assert.equal(url.origin,'https://project.supabase.co');
    return Response.json(null);
  }});
  await assert.rejects(vault.executePrivateQuery('11111111-1111-1111-1111-111111111111',
    'kraken','market.spot_trade',{symbol:'BTCUSD'}),/PROVIDER_CONNECTION_NOT_FOUND/);
  assert.equal(calls,1);
});

}

test('private Kraken WebSocket snapshot closes immediately after one verified market tick',async()=>{
  const time=Date.now();
  const sockets=[];
  class MockSocket {
    readyState=0; listeners=new Map(); sent=[]; closed=false;
    constructor(url){this.url=url;sockets.push(this);queueMicrotask(()=>{this.readyState=1;this.emit('open',{});});}
    addEventListener(event,fn){this.listeners.set(event,fn);}
    emit(event,value){this.listeners.get(event)?.(value);}
    send(payload){
      this.sent.push(payload);
      queueMicrotask(()=>{
        this.emit('message',{data:JSON.stringify({method:'subscribe',success:true})});
        this.emit('message',{data:JSON.stringify({channel:'ticker',type:'update',
          data:[{symbol:'BTC/USD',last:'72004',timestamp:new Date(time).toISOString()}]})});
      });
    }
    close(){this.closed=true;this.readyState=3;this.emit('close',{});}
  }
  const result=await fetchPrivateUserSpotWsSnapshot({
    provider:'kraken',symbol:'BTCUSD',SocketClass:MockSocket,now:()=>time,
  });
  assert.equal(sockets.length,1);
  assert.equal(sockets[0].url,'wss://ws.kraken.com/v2');
  assert.deepEqual(JSON.parse(sockets[0].sent[0]),{
    method:'subscribe',params:{channel:'ticker',symbol:['BTC/USD'],snapshot:true},
  });
  assert.equal(sockets[0].closed,true);
  assert.deepEqual(result,{
    provider:'kraken',symbol:'BTCUSD',quote:'USD',price:72004,observedAt:time,
    mode:'websocket',timeSemantics:'realtime',dataScope:'USER_PRIVATE_MARKET_DATA',
    publicDisplayAllowed:false,redistributionAllowed:false,sharedCacheAllowed:false,
    jetStreamPublicationAllowed:false,actionable:false,executionEnabled:false,
  });
});
test('private WS snapshots fail closed on spoofed symbol, stale price and non-market frame',async()=>{
  const time=Date.now();
  let created=0,closed=0;
  const fake=(frame)=>class {
    readyState=0;handlers={};
    constructor(){created++;queueMicrotask(()=>{this.readyState=1;this.handlers.open?.({});});}
    addEventListener(event,fn){this.handlers[event]=fn;}
    send(){queueMicrotask(()=>this.handlers.message?.({data:JSON.stringify(frame)}));}
    close(){closed++;this.readyState=3;this.handlers.close?.({});}
  };
  for(const frame of [
    {e:'trade',s:'ETHUSDT',p:'72001',T:time},
    {e:'trade',s:'BTCUSDT',p:'72001',T:time-31000},
    {channel:'ticker',type:'update',data:[{symbol:'ETH/USD',last:72001,timestamp:new Date(time).toISOString()}]},
  ]){
    const provider=frame.e?'binance':'kraken';
    const symbol=provider==='binance'?'BTCUSDT':'BTCUSD';
    await assert.rejects(fetchPrivateUserSpotWsSnapshot({
      provider,symbol,SocketClass:fake(frame),now:()=>time,
    }),/PRIVATE_SPOT_WS_FRAME_REJECTED/);
  }
  assert.equal(created,3);
  assert.equal(closed,3);
});
test('private WebSocket snapshot cannot open unsupported provider, cross-mapped symbol or live trading route',async()=>{
  let created=0;
  class UnauthorizedSocket {constructor(){created++;}}
  await assert.rejects(fetchPrivateUserSpotWsSnapshot({
    provider:'kraken',symbol:'AAPL',SocketClass:UnauthorizedSocket,
  }),/SPOT_SYMBOL_MAPPING_UNADMITTED/);
  await assert.rejects(fetchPrivateUserSpotWsSnapshot({
    provider:'unsupported',symbol:'BTCUSD',SocketClass:UnauthorizedSocket,
  }),/SPOT_PROVIDER_UNSUPPORTED/);
  assert.equal(created,0);
});

test('Vault-authorized private WS roundtrip requires own user key before opening the socket',async()=>{
  const userId='11111111-1111-1111-1111-111111111111',time=Date.now();
  let connections=0,providerAuth=0,opened=0;
  const original=globalThis.WebSocket;
  class MockSocket {
    readyState=0;handlers={};
    constructor(url){connections++;assert.equal(url,'wss://ws.kraken.com/v2');
      queueMicrotask(()=>{this.readyState=1;this.handlers.open?.({});});}
    addEventListener(event,fn){this.handlers[event]=fn;}
    send(){
      queueMicrotask(()=>this.handlers.message?.({data:JSON.stringify({
        channel:'ticker',type:'snapshot',data:[{symbol:'BTC/USD',last:80001,timestamp:new Date(time).toISOString()}],
      })}));
    }
    close(){this.readyState=3;this.handlers.close?.({});}
  }
  globalThis.WebSocket=MockSocket;
  const fetchImpl=async(url,options={})=>{
    const parsed=new URL(String(url));
    if(parsed.pathname.endsWith('/capital_ai_get_user_provider_secret')){
      const args=JSON.parse(String(options.body));
      assert.equal(args._user_id,userId);
      assert.equal(args._provider,'kraken');
      return Response.json({secretPayload:JSON.stringify({version:2,
        spot:{apiKey:'user-verified-api-key',apiSecret:'private-secret-0123456789abcdef'},futures:null})});
    }
    if(parsed.pathname==='/0/private/GetApiKeyInfo'){
      providerAuth++;
      return Response.json({error:[],result:{permissions:['query-funds']}});
    }
    opened++;
    throw Error('unexpected upstream');
  };
  try{
    const vault=createUserProviderVault({
      env:{SUPABASE_URL:'https://project.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_test_0123456789012345678901234567890123456789',AUTH_COOKIE_SIGNING_SECRET:'test-cookie-signing-secret-0123456789abcdef'},
      auth:{verify:async()=>({userId}),sameOrigin:()=>true},fetchImpl,
    });
    const row=await vault.executePrivateQuery(userId,'kraken','market.spot_ws_snapshot',{symbol:'BTCUSD'});
    assert.equal(row.dataScope,'USER_PRIVATE_MARKET_DATA');
    assert.equal(row.mode,'websocket');
    assert.equal(row.price,80001);
    assert.equal(row.sharedCacheAllowed,false);
    assert.equal(row.publicDisplayAllowed,false);
    assert.equal(row.jetStreamPublicationAllowed,false);
    assert.equal(connections,1);
    assert.equal(providerAuth,1);
    assert.equal(opened,0);
    assert.doesNotMatch(JSON.stringify(row),/private-secret|verified-api-key/);
  }finally{globalThis.WebSocket=original;}
});
