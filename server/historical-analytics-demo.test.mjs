import test from 'node:test';
import assert from 'node:assert/strict';
import { createHistoricalAnalyticsDemo } from './historical-analytics-demo.mjs';
import { ARCHIVE_WINDOW, DEMO_DATES, projectHistoricalDemo, PUBLIC_ANALYTICS_DEMO, demoMetrics } from '../shared/analytics-demo.mjs';
import { accountDisplay, verifiedOwner } from '../shared/account-display.mjs';
const rows = ['BTC','ETH','SOL'].flatMap(symbol=>DEMO_DATES.map((snapshot_date,i)=>({symbol,snapshot_date,price:100+i})));
const url = new URL('https://capital.example/api/analytics/owner-archive-demo');
async function run({owner=true,fixture=rows,method='GET',fail=false,mfaPending=false}={}) {
  let calls=0,output;
  const endpoint = createHistoricalAnalyticsDemo({auth:{verify:async()=>mfaPending?null:{userId:'qa-owner'},authorizeIamRole:async()=>owner},env:{SUPABASE_URL:'https://project.supabase.co',SUPABASE_SECRET_KEY:'private-test-key'},fetchImpl:async(target,options)=>{calls++;assert.equal(new URL(target).searchParams.get('limit'),'25');assert.equal(options.redirect,'error');if(fail)throw new Error('DO_NOT_LEAK');return Response.json(fixture);}});
  await endpoint.handle({method},{setHeader(){}},url,(_res,status,body)=>{output={status,body};});return {...output,calls};
}
test('owner archive returns only fixed-window normalized indices, without raw prices, scores or IDs', async()=>{
  const result=await run();assert.equal(result.status,200);assert.deepEqual(result.body.window,ARCHIVE_WINDOW);assert.equal(result.body.assets[0].index[0],100);
  assert.equal(result.body.assets[0].index.at(-1),107);
  assert.doesNotMatch(JSON.stringify(result.body),/price|score|private-test-key|supabase|snapshot_date/);
});
test('anonymous and ordinary paid users cannot read archive or cause database fetch',async()=>{
  const result=await run({owner:false});assert.equal(result.status,403);assert.equal(result.calls,0);
  assert.equal((await run({method:'POST'})).status,405);
  const mfa = await run({mfaPending:true});assert.equal(mfa.status,403);assert.equal(mfa.calls,0);
});
test('incomplete, duplicate, zero, non-finite, oversized archive and provider errors fail closed',async()=>{
  for(const fixture of [rows.slice(1),[...rows,rows[0]],rows.map((row,i)=>i===0?{...row,price:0}:row),rows.map((row,i)=>i===0?{...row,price:'NaN'}:row),rows.map((row,i)=>i===1?{...row,snapshot_date:rows[0].snapshot_date}:row)]) assert.equal((await run({fixture})).status,503);
  assert.deepEqual((await run({fail:true})).body,{error:'ARCHIVE_UNAVAILABLE'});
});
test('metrics use percentage returns and sample standard deviation, not production scores',()=>{
  const metrics=demoMetrics([100,110,121]);assert.ok(Math.abs(metrics.change-21)<1e-10);assert.ok(metrics.volatility<1e-10);
  assert.throws(()=>demoMetrics([100,NaN]),/INVALID_INDEX/);
  assert.throws(()=>projectHistoricalDemo(rows.slice(1)),/INCOMPLETE/);
  assert.equal(PUBLIC_ANALYTICS_DEMO[0].index[1],101.4);
});
test('shared account label prioritizes verified Owner, preserves Pro and never invents Free on failure',()=>{
  const session={authenticated:true,account:{available:true,iamRole:'owner',subscription:{tier:'Free'}}};
  assert.equal(accountDisplay(session),'Owner');assert.equal(verifiedOwner(session),true);
  assert.equal(accountDisplay({...session,account:{...session.account,iamRole:'user',subscription:{tier:'Pro'}}}),'Pro');
  assert.equal(accountDisplay({...session,account:{...session.account,available:false}}),'Kontostatus offen');
  assert.equal(verifiedOwner({...session,account:{...session.account,available:false}}),false);
});
