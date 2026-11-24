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
