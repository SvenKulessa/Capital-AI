import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createPrivateToolCatalogApi,mergeToolCandidates,discoverPrivateDomain} from './growth-private-tool-catalog.mjs';
const now=()=>Date.parse('2026-11-25T12:00:00Z');
const observedAt=new Date(now()).toISOString();
const candidate={repository:'example/tool',topic:'seo',declaredLicense:'MIT',installAllowed:false,activationAllowed:false,commercialRights:'NOT_PROVEN',outputRights:'NOT_PROVEN'};
const radar={schema:'CAPITAL_AI_GROWTH_TOOL_RADAR@1',metadataOnly:true,automaticInstall:false,publicPublishAllowed:false,paidProviderCalls:0,observedAt,topics:[{topic:'seo',status:'METADATA_OBSERVED'}],candidates:[candidate]};
test('candidate merge is case-insensitively deduplicated, rights fail closed',()=>{
 const rows=mergeToolCandidates([],radar,'GROWTH');
 assert.equal(rows.length,1);assert.equal(rows[0].status,'NOT_PROVEN');
 assert.match(rows[0].operation,/MIT/);assert.match(rows[0].approvals,/cost NOT_PROVEN/);
 assert.equal(mergeToolCandidates(rows,{...radar,candidates:[{...candidate,repository:'Example/Tool'}]},'GROWTH').length,1);
 assert.throws(()=>mergeToolCandidates([],{...radar,candidates:[{...candidate,installAllowed:true}]},'GROWTH'));
});
test('fixed public query topics, no supplied free text',async()=>{
 const urls=[];await discoverPrivateDomain('GROWTH',{now,fetchImpl:async(url)=>{urls.push(new URL(url));return Response.json(url.includes('registry.modelcontextprotocol.io')?{servers:[]}:{items:[]});}});
 assert.equal(urls.length,6);assert.equal(urls.filter(u=>u.origin==='https://api.github.com'&&u.pathname==='/search/repositories').length,5);assert.equal(urls.filter(u=>u.origin==='https://registry.modelcontextprotocol.io'&&u.pathname==='/v0.1/servers').length,1);
 await assert.rejects(()=>discoverPrivateDomain('private prompt and secret',{fetchImpl:()=>{throw Error('unexpected network')}}));
});
const route={pathname:'/api/internal/growth-tool-candidates'},res={setHeader(){}};
const req=(method,body)=>Object.assign(Readable.from(body===undefined?[]:[JSON.stringify(body)]),{method,headers:{'content-type':'application/json'}});
test('owner isolation and same-origin fail before network or archive',async()=>{
 let calls=0;const result=[];const json=(_r,code,v)=>result.push([code,v]);
 const fetchImpl=()=>{calls++;throw Error('network')};
 const denied=createPrivateToolCatalogApi({authorized:async()=>false,fetchImpl});
 await denied.handle(req('POST',{domain:'GROWTH'}),res,route,json);assert.equal(result[0][0],404);
 const cross=createPrivateToolCatalogApi({authorized:async()=>true,auth:{sameOrigin:()=>false},fetchImpl});
 await cross.handle(req('POST',{domain:'GROWTH'}),res,route,json);assert.equal(result[1][0],403);assert.equal(calls,0);
});
test('search works but durable writes remain blocked without recovery; invalid body rejected',async()=>{
 let calls=0;const result=[];const json=(_r,code,v)=>result.push([code,v]);
 const api=createPrivateToolCatalogApi({authorized:async()=>true,auth:{sameOrigin:()=>true},env:{},now,fetchImpl:async()=>{calls++;return Response.json({items:[]});},archive:{configured:()=>true,put:()=>{throw Error('must not persist')}}});
 await api.handle(req('POST',{domain:'GROWTH'}),res,route,json);
 assert.equal(result[0][0],200);assert.equal(result[0][1].storage,'BLOCKED_RECOVERY');assert.equal(result[0][1].persisted,false);assert.equal(calls,6);
 await api.handle(req('POST',{domain:'GROWTH',prompt:'PRIVATE'}),res,route,json);assert.equal(result[1][0],422);assert.equal(calls,6);
});
test('gated storage writes a deduplicated snapshot and reads it back',async()=>{
 const items=[];const archive={configured:()=>true,list:async()=>items.map((x,i)=>({id:String(i),version:x.snapshots[0].version})),read:async id=>Buffer.from(JSON.stringify(items[Number(id)])),put:async bytes=>{items.push(JSON.parse(bytes.toString()));return {archived:true}}};
 const result=[];const json=(_r,code,v)=>result.push([code,v]);
 const env={CAPITAL_AI_GROWTH_EVIDENCE_ARCHIVE_ENABLED:'true',CAPITAL_AI_GROWTH_EVIDENCE_RECOVERY_VERIFIED:'true',GROWTH_TOOL_CATALOG_RECOVERY_VERIFIED:'true'};
 const api=createPrivateToolCatalogApi({authorized:async()=>true,auth:{sameOrigin:()=>true},env,archive,now,fetchImpl:async()=>Response.json({items:[{full_name:'example/tool',archived:false,fork:false,license:{spdx_id:'MIT'}}]})});
 await api.handle(req('POST',{domain:'GROWTH'}),res,route,json);
 assert.equal(result[0][1].persisted,true);assert.equal(items.length,1);
 await api.handle(req('POST',{domain:'GROWTH'}),res,route,json);assert.equal(items.length,1);
 await api.handle(req('GET'),res,route,json);assert.equal(result[2][1].rows.length,1);
});

test('official MCP version candidate never grants commercial or install rights',()=>{
 const registry={source:'OFFICIAL_MCP_REGISTRY',status:'METADATA_OBSERVED',candidates:[{name:'io.example/analytics',version:'1.2.3',commercialRights:'NOT_PROVEN',outputRights:'NOT_PROVEN',installAllowed:false,activationAllowed:false}]};
 const rows=mergeToolCandidates([],{...radar,registry},'GROWTH');
 assert.equal(rows.length,2);const mcp=rows.find(r=>r.id.startsWith('mcp-'));assert.match(mcp.operation,/1\.2\.3/);
 assert.match(mcp.approvals,/NOT_PROVEN/);assert.equal(mcp.endpoint,'https://registry.modelcontextprotocol.io/v0.1/servers/io.example%2Fanalytics/versions/1.2.3');
 assert.deepEqual(mergeToolCandidates(rows,{...radar,observedAt:'2026-11-25T13:00:00.000Z',registry},'GROWTH'),rows);
});
