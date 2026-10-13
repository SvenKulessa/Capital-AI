import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCandidate,readMergedFileInventory} from './social-release-candidate.mjs';
const sha='a'.repeat(40);
const registry={authority:'AGENTS.md',contract:'SOLO_MAINTAINER_FLOW@1',domains:Object.fromEntries(['PRODUCT','MARKET','PLATFORM','TRUST','GROWTH'].map(d=>[d,{engineering:d+'-engineering',advisory:d+'-advisory'}]))};
const event={action:'closed',repository:{id:1293009324,owner:{id:84307769}},pull_request:{merged:true,number:475,merge_commit_sha:sha,title:'Fix <script> **summary**',base:{ref:'main',repo:{id:1293009324,full_name:'SvenKulessa/Capital-AI'}}}};
const files=['server/social-media/provider-store.mjs','src/features/home/ContentEngineConcept.tsx'];
test('PR source identity, stable fingerprint, routing and zero publishing rights',()=>{
 const a=buildCandidate(event,files,registry),b=buildCandidate(event,files.slice().reverse(),registry);
 assert.deepEqual(a,b);assert.equal(a.state,'DRAFT_ONLY');assert.equal(a.publicPublishAllowed,false);
 assert.deepEqual(a.domainRouting,['GROWTH','PLATFORM','PRODUCT']);
 assert.equal(a.delivery.providerCalls,0);assert.equal(a.delivery.publishAttempts,0);
 assert.equal(a.executedSkills.length,0);assert.equal(a.platformDrafts.length,4);
 assert(!JSON.stringify(a).includes('<script>'));
 for(const v of a.platformDrafts)assert(v.targetUrl.startsWith('https://capital-ai.online/learning-platform'));
});
test('wrong account, branch, event, digest, source path or registry must fail closed',()=>{
 const edits=[e=>e.action='opened',e=>e.pull_request.merged=false,e=>e.pull_request.base.ref='dev',e=>e.repository.id=1,e=>e.repository.owner.id=1,e=>e.pull_request.base.repo.id=1,e=>e.pull_request.merge_commit_sha='abc'];
 for(const edit of edits){const e=structuredClone(event);edit(e);assert.throws(()=>buildCandidate(e,files,registry),/MERGE_SOURCE_NOT_AUTHORIZED/);}
 assert.throws(()=>buildCandidate(event,['../secrets'],registry),/MERGE_FILE_INVENTORY_INVALID/);
 assert.throws(()=>buildCandidate(event,files,{...registry,authority:'other'}),/MERGE_SKILL_REGISTRY_INVALID/);
});
test('crawl uses fixed source and rejects provider failures',async()=>{
 const urls=[];const fetchImpl=async url=>{urls.push(url);return{ok:true,json:async()=>[{filename:'src/features/Test.tsx'}]};};
 assert.deepEqual(await readMergedFileInventory({prNumber:475,token:'test',fetchImpl}),['src/features/Test.tsx']);
 assert.equal(urls.length,1);
 assert(urls[0].startsWith('https://api.github.com/repos/SvenKulessa/Capital-AI/pulls/475/files?'));
 await assert.rejects(readMergedFileInventory({prNumber:475,token:'test',fetchImpl:async()=>({ok:false,status:403})}),/MERGE_CRAWL_HTTP_403/);
});
