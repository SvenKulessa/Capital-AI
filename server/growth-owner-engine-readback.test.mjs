import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {buildOwnerEngineSnapshot,projectOwnerEngineSnapshot} from '../scripts/growth/owner-engine-snapshot.mjs';
import {buildGrowthIntelligenceDraftBundle} from '../scripts/growth/growth-intelligence-drafts.mjs';
import {createGrowthEngineReadback,validateEngineSnapshot} from './growth-owner-engine-readback.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
test('actual fixed repository sources and Content Engine draft are digest bound, no publication or graph runtime claim',()=>{
 const actual=buildOwnerEngineSnapshot();
 assert.equal(actual.market.editionSha256,sha(readFileSync(new URL('../src/features/home/homeEditorialEdition.json',import.meta.url))));
 assert.equal(actual.market.indexSha256,sha(readFileSync(new URL('../src/features/analysis/newsLifecycleIndex.json',import.meta.url))));
 assert.equal(actual.content.drafts,buildGrowthIntelligenceDraftBundle().drafts.length);
 assert.equal(actual.langgraph.sourceSha256,sha(readFileSync(new URL('../scripts/growth-agent/auto_loop.py',import.meta.url))));
 assert.equal(actual.langgraph.state,'SOURCE_ONLY_RUNTIME_NOT_PROVEN');
 assert.equal(actual.publicPublishAllowed,false);
 assert.deepEqual(validateEngineSnapshot(actual),actual);
});
test('malformed sources and publication claims fail closed',()=>{
 const bundle=buildGrowthIntelligenceDraftBundle();
 const input={editionBytes:Buffer.from('{"date":"2026-11-24","stories":[]}'),indexBytes:Buffer.from('{"version":1,"overview":[],"archive":[]}'),graphBytes:Buffer.from('synthetic graph'),bundle};
 const good=projectOwnerEngineSnapshot(input);
 assert.throws(()=>projectOwnerEngineSnapshot({...input,bundle:{...bundle,publicPublishAllowed:true}}));
 assert.throws(()=>projectOwnerEngineSnapshot({...input,indexBytes:Buffer.from('{}')}));
 assert.throws(()=>validateEngineSnapshot({...good,scope:'LIVE'}));
 assert.throws(()=>validateEngineSnapshot({...good,langgraph:{...good.langgraph,state:'VERIFIED'}}));
});
test('owner only GET; denied calls never read artifacts, invalid artifacts stay NOT_PROVEN',async()=>{
 let reads=0;
 const actual=buildOwnerEngineSnapshot();
 const api=owner=>createGrowthEngineReadback({authorized:async()=>owner,load:async()=>{reads++;return Buffer.from(JSON.stringify(actual));}});
 const path=new URL('https://capital-ai.online/api/profile/growth-intelligence/engine-readback');
 async function call(handler,method='GET'){
  const res={setHeader(){}};
  assert.equal(await handler.handle({method},res,path,(r,status,data)=>{r.status=status;r.data=data}),true);
  return res;
 }
 assert.equal((await call(api(false))).status,404);
 assert.equal((await call(api(true),'POST')).status,405);
 assert.equal(reads,0);
 assert.deepEqual((await call(api(true))).data,actual);
 assert.equal(reads,1);
 assert.equal((await call(createGrowthEngineReadback({authorized:async()=>true,load:async()=>Buffer.from('{}')}))).status,503);
});

import {createGrowthGscReadback} from './growth-gsc-readback.mjs';
test('direct GSC owner route binds fixed property, isolates disabled/auth failures and caches readback',async()=>{
 const now=()=>Date.parse('2026-11-24T12:00:00.000Z');
 const token='synthetic-read-token';
 let calls=0;
 const fetchImpl=async(url,options)=>{
   calls++;
   const u=new URL(url);
   assert.equal(u.origin,'https://www.googleapis.com');
   assert.equal(options.redirect,'error');
   assert.equal(options.headers.Authorization,'Bearer '+token);
   if(options.method==='GET')return new Response(JSON.stringify({siteUrl:'sc-domain:capital-ai.online',permissionLevel:'siteOwner'}));
   const body=JSON.parse(options.body);
   assert.equal(body.dataState,'final');
   return new Response(JSON.stringify({rows:Array.from({length:7},(_,i)=>({keys:['2026-11-'+(14+i)],clicks:0,impressions:2,position:5}))}));
 };
 const env={GROWTH_GSC_READ_ENABLED:'true',GROWTH_GSC_READ_TOKEN:token};
 const api=(allowed,config=env)=>createGrowthGscReadback({authorized:async()=>allowed,env:config,fetchImpl,now});
 const path='https://capital-ai.online/api/profile/growth-intelligence/gsc-readback';
 async function call(handler,method='GET',query=''){
   const res={setHeader(){}};
   assert.equal(await handler.handle({method},res,new URL(path+query),(r,status,data)=>{r.status=status;r.data=data}),true);
   return res;
 }
 assert.equal((await call(api(false))).status,404);
 assert.equal((await call(api(true),'POST')).status,405);
 assert.equal((await call(api(true),'GET','?property=other')).status,400);
 assert.equal((await call(api(true,{}))).data.transport,'DISABLED');
 assert.equal((await call(api(true,{GROWTH_GSC_READ_ENABLED:'true'}))).data.transport,'AUTH_REQUIRED');
 assert.equal(calls,0);
 const handler=api(true);
 const read=await call(handler);
 assert.equal(read.data.status,'PROVIDER_READ_VERIFIED');
 assert.deepEqual(read.data.metrics,{clicks:0,impressions:14,ctr:0,position:5});
 assert.match(read.data.evidenceSha256,/^[a-f0-9]{64}$/);
 assert.doesNotMatch(JSON.stringify(read.data),/synthetic-read-token/);
 assert.deepEqual((await call(handler)).data,read.data);
 assert.equal(calls,2);
});

test('owner snapshot exposes only draft channel counts and source hash; no live metrics or self-promotion',()=>{
 const actual=buildOwnerEngineSnapshot(),p=actual.productChannels;
 assert.ok(p.products>0);assert.equal(p.mapped+p.researchQueue,p.products);assert.equal(p.liveMetrics,null);
 assert.deepEqual(validateEngineSnapshot(actual).productChannels,p);
 assert.throws(()=>validateEngineSnapshot({...actual,productChannels:{...p,liveMetrics:{sales:0}}}));
 assert.throws(()=>validateEngineSnapshot({...actual,productChannels:{...p,mapped:p.products+1}}));
 const {productChannels,...legacy}=actual;assert.deepEqual(validateEngineSnapshot(legacy),legacy);
});
