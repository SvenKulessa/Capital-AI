import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { assetClasses, QuoteDeliverySchema } from '../../shared/market-contracts.mjs';
import { createMarketDelivery } from '../../server/market-delivery.mjs';
import { loadMarketSnapshot, startMarketDelivery } from './marketDeliveryClient';
import { toMarketAsset } from './marketDataStore';
const manifest = assetClasses.flatMap((category, c) => Array.from({length:100}, (_, n) => ({
  assetId:`asset:${c}:${n}`,symbol:`C${c}_${n}`,name:'Synthetic capacity fixture',venue:'TEST',quote:'EUR',category,provider:'test-fixture',
})));
const fact = (i = manifest[0], age = 100) => QuoteDeliverySchema.parse({schemaVersion:'2.0.0',instrument:i,symbol:i.symbol,venue:i.venue,provider:i.provider,quote:i.quote,
  price:1,bid:null,ask:null,volume24h:null,observedAt:Date.now()-age,receivedAt:Date.now(),mode:'rest',isDemo:false,licenseScope:'unverified',
  payloadHash:'a'.repeat(64),evidenceId:'CAPITAL_FACTS:1:'+'b'.repeat(64),availability:'cached',validated:true,actionable:false,reasonCodes:[]});
const coverage = assetClasses.map(category => ({category,registered:100,target:100}));
function page(items: unknown[], nextCursor: string | null = null) {
  return new Response(JSON.stringify({schema:'CAPITAL_AI_MARKET_SNAPSHOT@1',universeId:'a'.repeat(64),total:items.length,items,nextCursor,coverage}));
}
test('900 synthetic assets traverse the real HTTP snapshot and frontend conversion', async t => {
  const map = new Map(manifest.map(i=>[i.symbol,i]));
  const app = createMarketDelivery({manifest,enabled:true,admitted:()=>true,broker:{async read(symbol){return fact(map.get(symbol));},async subscribeQuotes(){return async()=>{};}}});
  const server = http.createServer(async (req,res)=> {
    await app.handle(req,res,new URL(req.url || '/', 'http://localhost'),(res: http.ServerResponse,status: number,body: unknown)=>{
      res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(body));
    });
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await app.close();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));});
  const address = server.address() as {port:number};
  const quotes = await loadMarketSnapshot(new AbortController().signal,(url, options)=>fetch(`http://127.0.0.1:${address.port}${url}`,options));
  const assets = quotes.map(toMarketAsset);
  assert.equal(new Set(assets.map(a=>a.id)).size,900);
  for (const category of assetClasses) assert.equal(assets.filter(a=>a.mainCategory===category).length,100);
});
test('cursor loops, malformed and oversized responses fail closed; venue duplicates count once', async()=>{
  await assert.rejects(loadMarketSnapshot(new AbortController().signal,async()=>page([fact()],'a'.repeat(64)+':100')),/INVALID_CURSOR/);
  await assert.rejects(loadMarketSnapshot(new AbortController().signal,async()=>new Response('x'.repeat(1048577))),/SNAPSHOT_TOO_LARGE/);
  await assert.rejects(loadMarketSnapshot(new AbortController().signal,async()=>new Response('{}')));
  const records=await loadMarketSnapshot(new AbortController().signal,async()=>page([fact(),fact({...manifest[0],symbol:'OTHER',venue:'OTHER'})]));
  assert.equal(records.length,1);
});
class Stream extends EventTarget {
  closed=false; onerror: (()=>void)|undefined;
  close(){this.closed=true;}
  quote(value: unknown){this.dispatchEvent(new MessageEvent('quote',{data:JSON.stringify(value)}));}
}
const settle=async()=>{for(let i=0;i<20;i++)await new Promise(resolve=>setImmediate(resolve));};
test('newer SSE data wins during pagination and stream failure preserves REST fallback',async t=>{
  const stream=new Stream();let finish: ((response: Response)=>void)|undefined;
  let records: ReturnType<typeof fact>[]=[];
  const stop=startMarketDelivery(values=>{records=values as typeof records;},{
    createStream:()=>stream as unknown as EventSource,
    fetchImpl:()=>new Promise(resolve=>{finish=resolve;}),
  });
  t.after(stop);
  stream.quote({...fact(),price:2});
  stream.onerror?.(); // REST is allowed to complete despite failed SSE.
  finish!(page([fact(manifest[0],1000)]));
  await settle();
  assert.equal(records[0].price,2);assert.equal(stream.closed,true);
  stop();
});
test('expired or malformed stream records never enter the frontend',async t=>{
  const stream=new Stream();let records: unknown[]=[];
  const stop=startMarketDelivery(values=>{records=values;},{createStream:()=>stream as unknown as EventSource,fetchImpl:async()=>page([])});
  t.after(stop);await settle();
  stream.quote(fact(manifest[0],31000));assert.equal(records.length,0);
  stream.quote({...fact(),actionable:true});assert.equal(records.length,0);assert.equal(stream.closed,true);
});
