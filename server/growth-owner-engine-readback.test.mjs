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

import {createGrowthConversionReadback} from './growth-owner-engine-readback.mjs';
test('owner conversion readback is opt-in, recovery gated, aggregate-only and graph compatible',async()=>{
 const on={CAPITAL_AI_GROWTH_CONVERSION_READBACK_ENABLED:'true',CAPITAL_AI_GROWTH_CONVERSION_RECOVERY_VERIFIED:'true'};
 const good={status:'RECORDED_CANDIDATES_ONLY',candidateRegistrations:2,candidatePaidSubscriptions:1,candidateInitialInvoiceCents:249,registrations:null,paidSubscriptions:null,revenueCents:null};
 const now=()=>Date.parse('2026-11-25T00:00:00.000Z');
 let reads=0;
 const readCandidates=async w=>{reads++;assert.deepEqual(w,{start:'2026-11-18T00:00:00.000Z',end:'2026-11-25T00:00:00.000Z'});return good;};
 const api=(over={})=>createGrowthConversionReadback({env:on,authorized:async()=>true,readCandidates,now,...over});
 async function call(h,method='GET',query=''){
   const res={headers:{},setHeader(k,v){this.headers[k]=v;}};
   assert.equal(await h.handle({method},res,new URL('https://capital-ai.online/api/profile/growth-intelligence/conversion-readback'+query),(r,status,data)=>{r.status=status;r.data=data;}),true);
   return res;
 }
 assert.equal((await call(api({authorized:async()=>false}))).status,404);
 assert.equal((await call(api({authorized:async()=>{throw Error('secret');}}))).status,404);
 assert.equal((await call(api(),'POST')).status,405);
 assert.equal((await call(api(),'GET','?user=other')).status,400);
 assert.equal((await call(api({env:{}}))).status,503);
 assert.equal((await call(api({env:{CAPITAL_AI_GROWTH_CONVERSION_READBACK_ENABLED:'true'}}))).status,503);
 assert.equal((await call(api({readCandidates:undefined}))).status,503);
 assert.equal(reads,0);
 const valid=await call(api());
 assert.equal(valid.status,200);assert.equal(reads,1);
 assert.match(valid.headers['Cache-Control'],/no-store/);
 assert.equal(valid.data.graphInput.contractVersion,'CAPITAL_AI_X_CONVERSION_CANDIDATES@1');
 assert.equal(valid.data.graphInput.candidatePaidSubscribers,1);
 assert.equal(valid.data.graphInput.paidSubscriptions,null);
 assert.equal(valid.data.graphInput.providerAuthentication,'NOT_PROVEN');
 assert.equal(valid.data.graphInput.costActivationAllowed,false);
 assert.equal(valid.data.graphExecution,'NOT_PROVEN');
 for(const bad of [{...good,userId:'secret'},{...good,registrations:2},{...good,candidatePaidSubscriptions:3},
   {...good,candidateInitialInvoiceCents:null},{...good,candidateRegistrations:'2'}]){
   const denied=await call(api({readCandidates:async()=>bad}));
   assert.equal(denied.status,503);assert.doesNotMatch(JSON.stringify(denied.data),/secret/);
 }
 assert.equal((await call(api({readCandidates:async()=>{throw Error('secret');}}))).status,503);
});

test('owner snapshot exposes only draft channel counts and source hash; no live metrics or self-promotion',()=>{
 const actual=buildOwnerEngineSnapshot(),p=actual.productChannels;
 assert.ok(p.products>0);assert.equal(p.mapped+p.researchQueue,p.products);assert.equal(p.liveMetrics,null);
 assert.deepEqual(validateEngineSnapshot(actual).productChannels,p);
 assert.throws(()=>validateEngineSnapshot({...actual,productChannels:{...p,liveMetrics:{sales:0}}}));
 assert.throws(()=>validateEngineSnapshot({...actual,productChannels:{...p,mapped:p.products+1}}));
 const {productChannels,marketplace,...legacy}=actual;assert.deepEqual(validateEngineSnapshot(legacy),legacy);
});

test('visual owner readback returns scene IDs only and rejects fabricated assets or activation',()=>{
 const actual=buildOwnerEngineSnapshot();
 assert.equal(actual.visualIntelligence.sceneIds.length,7);
 assert.deepEqual(validateEngineSnapshot(actual).visualIntelligence,actual.visualIntelligence);
 assert.throws(()=>validateEngineSnapshot({...actual,visualIntelligence:{...actual.visualIntelligence,actualMediaAssets:1}}));
 assert.throws(()=>validateEngineSnapshot({...actual,visualIntelligence:{...actual.visualIntelligence,publicPublishAllowed:true}}));
});


test('TRUST: marketplace catalog is private, fails closed on authority injection, URL spoofing and source mismatch',async()=>{
 const actual=buildOwnerEngineSnapshot(),c=actual.marketplace;
 assert.ok(Buffer.byteLength(JSON.stringify(actual))<=16384);
 assert.deepEqual(validateEngineSnapshot(actual).marketplace,c);
 for(const bad of [{...c,publicationAllowed:true},{...c,ownerApproval:'GRANTED'},{...c,spendCents:1},{...c,rows:[{...c.rows[0],url:'https://evil.invalid/'},...c.rows.slice(1)]},{...c,catalogSha256:'0'.repeat(64)}])assert.throws(()=>validateEngineSnapshot({...actual,marketplace:bad}));
 assert.throws(()=>validateEngineSnapshot({...actual,productChannels:{...actual.productChannels,sourceSha256:'0'.repeat(64)}}));
 let reads=0;const load=async()=>{reads++;return Buffer.from(JSON.stringify(actual));};
 const req={method:'GET'},path=new URL('https://capital-ai.online/api/profile/growth-intelligence/engine-readback');
 for(const authorized of [async()=>false,async()=>({role:'owner'}),async()=>{throw Error('synthetic');}]){const res={setHeader(){}};await createGrowthEngineReadback({authorized,load}).handle(req,res,path,(r,status)=>{r.status=status;});assert.equal(res.status,404);}
 assert.equal(reads,0);
});


test('directory additions remain private, with human-only SaaSHub and one Microsoft entry',()=>{const actual=buildOwnerEngineSnapshot(),c=validateEngineSnapshot(actual).marketplace;assert.equal(c.rows.length,16);assert.equal(c.rows.filter(r=>r.id==='microsoftMarketplace').length,1);assert.equal(c.rows.find(r=>r.id==='saasHub').automation,'HUMAN_ONLY_SUBMISSION_REQUIRED');assert.ok(c.rows.some(r=>r.id==='g2'));assert.ok(c.rows.some(r=>r.id==='capterra'));assert.equal(c.publicationAllowed,false);assert.equal(c.providerCalls,0);});
