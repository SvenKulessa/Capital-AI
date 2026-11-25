import test from 'node:test';
import assert from 'node:assert/strict';
import {collectPrivateGrowthProviderStatus,createPrivateGrowthProviderStatusApi} from './growth-private-provider-read.mjs';
const env={GROWTH_OPENAI_ADS_READ_ENABLED:'true',OPENAI_ADS_API_KEY:'synthetic-test-token',GROWTH_OPENAI_ADS_ACCOUNT_ID:'adacct_test'};
const response=v=>Response.json(v);
test('default deny makes no external calls',async()=>{
 const result=await collectPrivateGrowthProviderStatus({env:{},fetchImpl:()=>{throw Error('unexpected network')}});
 assert.deepEqual(result.sources.map(x=>x.status),['DISABLED','DISABLED']);
});
test('ads exact identity and bounded read, no private account data returned',async()=>{
 const calls=[];
 const result=await collectPrivateGrowthProviderStatus({env,fetchImpl:async(url,opts)=>{
 calls.push([url,opts.method]);assert.equal(opts.redirect,'error');
 return url.endsWith('/ad_account')?response({id:'adacct_test',currency_code:'EUR',name:'PRIVATE_ACCOUNT'}):response({object:'list',data:[{id:'private-campaign',name:'PRIVATE'}],has_more:true});
 }});
 assert.equal(calls.length,2);assert.ok(calls.every(([url,method])=>url.startsWith('https://api.ads.openai.com/v1/')&&(!method||method==='GET')));
 assert.deepEqual(result.sources[1],{source:'OPENAI_ADS',status:'READ_RESPONSE_RECEIVED',campaignsReturned:1,partial:true});
 assert.doesNotMatch(JSON.stringify(result),/PRIVATE|adacct_test|private-campaign|synthetic-test-token/);
});
test('ads mismatch stops before campaign read',async()=>{
 let calls=0;const result=await collectPrivateGrowthProviderStatus({env,fetchImpl:async()=>{calls++;return response({id:'adacct_other',currency_code:'EUR'})}});
 assert.equal(calls,1);assert.equal(result.sources[1].status,'IDENTITY_MISMATCH');
});
test('hypd exact read tool only, session binding and no raw identities',async()=>{
 const methods=[];
 const result=await collectPrivateGrowthProviderStatus({env:{GROWTH_HYPD_READ_ENABLED:'true',GROWTH_HYPD_MCP_ACCESS_TOKEN:'synthetic-hypd-token',GROWTH_HYPD_GTM_PUBLIC_ID:'GTM-TEST'},fetchImpl:async(url,opts)=>{
 assert.equal(url,'https://mcp.hypd.ai/mcp/latest');const body=JSON.parse(opts.body);methods.push(body.method);
 if(body.method==='initialize')return Response.json({jsonrpc:'2.0',id:1,result:{protocolVersion:'2025-03-26',capabilities:{tools:{}}}},{headers:{'Mcp-Session-Id':'synthetic-session'}});
 assert.equal(opts.headers['Mcp-Session-Id'],'synthetic-session');
 if(body.method==='notifications/initialized')return new Response(null,{status:202});
 if(body.method==='tools/list')return response({jsonrpc:'2.0',id:2,result:{tools:[{name:'gtm_list_containers'},{name:'gtm_publish'}]}});
 assert.equal(body.params.name,'gtm_list_containers');
 return response({jsonrpc:'2.0',id:3,result:{structuredContent:{containers:[{public_id:'GTM-TEST',name:'PRIVATE'}]}}});
 }});
 assert.deepEqual(methods,['initialize','notifications/initialized','tools/list','tools/call']);
 assert.equal(result.sources[0].status,'READ_RESPONSE_RECEIVED');
 assert.doesNotMatch(JSON.stringify(result),/GTM-TEST|PRIVATE|synthetic-session/);
});
test('owner check precedes any provider access and non-GET rejected',async()=>{
 let calls=0;const url={pathname:'/api/profile/growth-intelligence/private-provider-status'};const res={setHeader(){}};
 const out=[];const json=(_r,code,value)=>out.push([code,value]);
 const denied=createPrivateGrowthProviderStatusApi({authorized:async()=>false,env,fetchImpl:()=>{calls++;throw Error('network')}});
 await denied.handle({method:'GET'},res,url,json);assert.equal(out[0][0],404);
 const allowed=createPrivateGrowthProviderStatusApi({authorized:async()=>true,env,fetchImpl:()=>{calls++;throw Error('network')}});
 await allowed.handle({method:'POST'},res,url,json);assert.equal(out[1][0],405);assert.equal(calls,0);
});
