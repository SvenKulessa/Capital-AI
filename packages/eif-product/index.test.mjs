import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {demo,PRODUCT,syntheticInput,evaluateObservations} from './index.mjs';
import {createHandler} from './mcp.mjs';
const rpc=(id,method,params)=>({jsonrpc:'2.0',id,method,params});
const init=rpc(1,'initialize',{protocolVersion:'2025-11-25',clientInfo:{name:'test',version:'1'},capabilities:{}});
const ready={jsonrpc:'2.0',method:'notifications/initialized'};
const call=rpc(3,'tools/call',{name:'eif_demo',arguments:{}});
test('repeatable synthetic baseline and improvement',()=>{const d=demo();assert.deepEqual(d,demo());assert.equal(d.before.score,85);assert.equal(d.after.score,100);assert.equal(d.comparison.deltaPoints,15);assert.equal(d.after.status,'REVIEW_REQUIRED');});
test('negative rights and missing privacy',()=>{assert.equal(demo().blocked,'BLOCKED');assert.equal(demo().unknown,'NOT_PROVEN');});
test('no entitlement or publication',()=>{assert.equal(PRODUCT.checkoutEnabled,false);assert.equal(PRODUCT.marketplaceEnabled,false);assert.equal(demo().after.authorityGranted,false);assert.equal(demo().after.commercialEligible,false);});
test('invalid observations rejected',()=>{const i=syntheticInput();i.dimensions.provenance.score=101;assert.throws(()=>evaluateObservations(i));});
test('MCP lifecycle and single tool',()=>{const h=createHandler();assert.equal(h(call).error.code,-32000);assert.equal(h(init).result.protocolVersion,'2025-11-25');assert.equal(h(ready),null);assert.equal(h(rpc(2,'tools/list')).result.tools.length,1);assert.deepEqual(JSON.parse(h(call).result.content[0].text),demo());});
test('MCP rejects arbitrary paths and methods',()=>{const h=createHandler();h(init);h(ready);assert.equal(h(rpc(1,'tools/call',{name:'eif_demo',arguments:{path:'/etc/passwd'}})).error.code,-32602);assert.equal(h(rpc(2,'tools/call',{name:'exec'})).error.code,-32602);assert.equal(h(rpc(3,'resources/read',{})).error.code,-32601);});
test('CLI and stdio parity',()=>{const c=spawnSync(process.execPath,[new URL('./cli.mjs',import.meta.url).pathname,'demo'],{encoding:'utf8'});assert.equal(c.status,0);assert.deepEqual(JSON.parse(c.stdout),demo());const s=spawnSync(process.execPath,[new URL('./stdio.mjs',import.meta.url).pathname],{input:[init,ready,call].map(x=>JSON.stringify(x)).join('\n')+'\n',encoding:'utf8'});assert.equal(s.status,0);const lines=s.stdout.trim().split('\n').map(JSON.parse);assert.equal(lines.length,2);assert.deepEqual(JSON.parse(lines[1].result.content[0].text),demo());});
test('stdio bounded request and recovery',()=>{const s=spawnSync(process.execPath,[new URL('./stdio.mjs',import.meta.url).pathname],{input:'x'.repeat(65537)+'\n'+JSON.stringify(init)+'\n',encoding:'utf8'});const lines=s.stdout.trim().split('\n').map(JSON.parse);assert.equal(s.status,0);assert.equal(lines[0].error.code,-32600);assert.equal(lines[1].result.protocolVersion,'2025-11-25');});
test('CLI fails unknown command',()=>{const c=spawnSync(process.execPath,[new URL('./cli.mjs',import.meta.url).pathname,'publish'],{encoding:'utf8'});assert.equal(c.status,2);assert.equal(c.stdout,'');});

import {directiveCatalog,inspectDirectives} from './directives.mjs';
test('EIF directive references unique and correlation targets known',()=>{
 const c=directiveCatalog();const ids=new Set(c.directives.map(row=>row.id));
 assert.equal(ids.size,c.directives.length);
 assert.ok(c.directives.every(row=>row.related.every(id=>ids.has(id))));
 assert.equal(c.permissionExpansion,false);assert.equal(c.executionStarted,false);assert.equal(c.commercialEligible,false);
});
test('exact versions only, no candidate promotion or implicit upgrade',()=>{
 const r=inspectDirectives(['GLOBAL_EVIDENCE_VISUAL@1','GLOBAL_EVIDENCE_VISUAL@1','PROCESS_ACCELERATION@2','SOLO_MAINTAINER_FLOW@1']);
 assert.equal(r.directives.length,3);assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(r.directives[1].status,'NOT_PROVEN');assert.equal(r.directives[2].replacement,'SOLO_MAINTAINER_FLOW@2');
 assert.equal(inspectDirectives(['GLOBAL_EVIDENCE_VISUAL@1']).status,'REFERENCE_ONLY');
 for(const input of [[],{},['GLOBAL_EVIDENCE_VISUAL@999'],['__proto__'],[{}],Array(65).fill('SOLO2')])assert.throws(()=>inspectDirectives(input));
});
test('EIF directive CLI read-only and rejects unknown versions',()=>{
 const cli=new URL('./cli.mjs',import.meta.url).pathname;
 const c=spawnSync(process.execPath,[cli,'directives'],{encoding:'utf8'});
 assert.equal(c.status,0);assert.deepEqual(JSON.parse(c.stdout),directiveCatalog());
 const r=spawnSync(process.execPath,[cli,'inspect-directives'],{input:'["GLOBAL_EVIDENCE_VISUAL@1"]',encoding:'utf8'});
 assert.equal(r.status,0);assert.equal(JSON.parse(r.stdout).executionStarted,false);
 const bad=spawnSync(process.execPath,[cli,'inspect-directives'],{input:'["GLOBAL_EVIDENCE_VISUAL@99"]',encoding:'utf8'});
 assert.equal(bad.status,2);assert.equal(bad.stdout,'');
});
