import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverBillingMetadata} from './google-billing-metadata.mjs';
const p='aifinancial-500208', token='synthetic-test-token';
const d={datasetReference:{projectId:p,datasetId:'billing'}};
const t={tableReference:{projectId:p,datasetId:'billing',tableId:'gcp_billing_export_v1_ABC'}};
const ok=(obj)=>({status:200,json:async()=>obj});
const run=(fetcher)=>discoverBillingMetadata({token,fetcher});
test('fixed GET metadata only, no costs or identities leaked',async()=>{
 let calls=0;
 const v=await run(async(url,o)=>{
  assert.equal(o.method,'GET');assert.equal(o.redirect,'error');
  assert.match(url,/^https:\/\/bigquery\.googleapis\.com\/bigquery\/v2\/projects\/aifinancial-500208\/datasets/);
  assert.equal(o.headers.Authorization,'Bearer '+token);
  return ++calls===1?ok({datasets:[d]}):ok({tables:[t]});
 });
 assert.equal(v.inventory,'EXPORT_VISIBLE');assert.equal(v.exportTablesVisible,1);
 assert.equal(v.actualCostEur,null);assert.equal(v.labelCostEur,null);assert.equal(v.sqlJobsCreated,0);
 assert.equal(v.productionExportAllowed,false);assert.ok(!JSON.stringify(v).includes(token));assert.ok(!JSON.stringify(v).includes('ABC'));
});
test('empty visible scope never asserts zero cost',async()=>{
 const v=await run(async()=>ok({}));assert.equal(v.inventory,'NO_EXPORT_VISIBLE_IN_PROJECT');
 assert.equal(v.datasetsVisible,0);assert.equal(v.costStatus,'NOT_PROVEN');assert.equal(v.actualCostEur,null);
});
test('denial, malformed payload, cross-project and cursor loop fail closed',async()=>{
 for(const [f,s] of [[async()=>({status:403}),'ACCESS'],[async()=>ok({datasets:'bad'}),'RESPONSE'],
 [async()=>ok({datasets:[{datasetReference:{...d.datasetReference,projectId:'other'}}]}),'IDENTITY'],
 [async()=>ok({nextPageToken:'loop'}),'PAGINATION'],[async()=>{throw Error('private');},'TRANSPORT']]){
  const v=await run(f);assert.equal(v.inventory,'BLOCKED_'+s);assert.equal(v.exportTablesVisible,null);assert.equal(v.actualCostEur,null);
 }
});
test('partial inventory and cross-dataset table never report completed discovery',async()=>{
 let i=0;const v=await run(async()=>++i===1?ok({datasets:[d]}):ok({tables:[{tableReference:{...t.tableReference,datasetId:'wrong'}}]}));
 assert.equal(v.inventory,'BLOCKED_IDENTITY');assert.equal(v.exportTablesVisible,null);
});
test('no token means no call',async()=>{const v=await discoverBillingMetadata({token:'',fetcher:async()=>assert.fail()});assert.equal(v.inventory,'BLOCKED_TOKEN');});
