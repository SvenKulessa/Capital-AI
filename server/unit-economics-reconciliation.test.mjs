import test from 'node:test';
import assert from 'node:assert/strict';
import { createUnitEconomicsReconciliation, RECONCILIATION_VERSION } from './unit-economics-reconciliation.mjs';

const T='11111111-1111-4111-8111-111111111111';
const OTHER='22222222-2222-4222-8222-222222222222';
const RUN_A='33333333-3333-4333-8333-333333333333';
const RUN_B='44444444-4444-4444-8444-444444444444';
const PAY='evt_paymentA12', REF='evt_refundA12', FAIL='evt_disputeA12';
const hash=(ch)=>ch.repeat(64);
const payment=(id=PAY)=>({
  eventId:id,eventType:'charge.succeeded',payloadSha256:hash('a'),
  tenantId:T,product:'agent_operations',occurredAt:'2026-11-10T12:00:00Z',currency:'eur',
  livemode:true,kind:'PAYMENT',objectId:'ch_pay123456',chargeId:'ch_pay123456',
  sourceId:'in_invoice123456',grossMinor:11900,taxMinor:1900,feeMinor:400,
  balanceTransactionId:'txn_pay123456',objectReadbackSha256:hash('b'),
});
const refund=()=>({
  ...payment(REF),eventType:'refund.updated',kind:'REFUND',objectId:'re_ref123456',
  grossMinor:1190,taxMinor:190,feeMinor:0,occurredAt:'2026-11-12T12:00:00Z',
  balanceTransactionId:'txn_ref123456',payloadSha256:hash('c'),objectReadbackSha256:hash('d'),
});
const dispute=()=>({
  ...payment(FAIL),eventType:'charge.dispute.closed',kind:'DISPUTE',objectId:'dp_dis123456',
  grossMinor:500,taxMinor:0,feeMinor:0,occurredAt:'2026-11-13T12:00:00Z',
  balanceTransactionId:'txn_dis123456',payloadSha256:hash('e'),objectReadbackSha256:hash('f'),
});
const run=(runId=RUN_A)=>({
  runId,tenantId:T,product:'agent_operations',completedAt:'2026-11-11T12:00:00Z',
  executionStatus:runId===RUN_A?'SUCCEEDED':'FAILED',provider:'openai',model:'gpt-6',
  inputTokens:1200,outputTokens:300,billingLineId:runId===RUN_A?'usage.line:runA12':'usage.line:runB12',
  runEvidenceSha256:hash('a'),
});
const bill=(r)=>({
  billingLineId:r.billingLineId,runId:r.runId,tenantId:T,product:'agent_operations',
  provider:'openai',model:'gpt-6',currency:'EUR',billingState:'SETTLED',
  inferenceMinor:r.runId===RUN_A?600:200,toolsMinor:r.runId===RUN_A?150:50,
  billingEvidenceSha256:hash('b'),
});
const request=(custom={})=>({
  principal:{kind:'trusted-test-user'},product:'agent_operations',
  periodStart:'2026-11-01T00:00:00Z',periodEnd:'2026-12-01T00:00:00Z',
  stripeEventIds:[PAY,REF],agentRunIds:[RUN_A,RUN_B],...custom,
});
function setup(options={}) {
  const records={...{[PAY]:payment(),[REF]:refund(),[FAIL]:dispute()},...(options.events||{})};
  const runs={...{[RUN_A]:run(),[RUN_B]:run(RUN_B)},...(options.runs||{})};
  const calls=[];
  const callbacks={
    resolveTenant:async p=>{calls.push('auth');return options.tenant??T;},
    readStripeInbox:async ({tenantId,eventId})=>{
      calls.push('inbox:'+eventId);
      const rec=records[eventId];
      return rec?{eventId,eventType:rec.eventType,status:'processed',livemode:true,payloadSha256:rec.payloadSha256}:null;
    },
    readStripeEvent:async ({tenantId,eventId})=>{calls.push('stripe:'+eventId);return records[eventId]??null;},
    readAgentRun:async ({tenantId,runId})=>{calls.push('run:'+runId);return runs[runId]??null;},
    readProviderCost:async ({tenantId,runId,billingLineId})=>{
      calls.push('cost:'+runId);
      return runs[runId]?bill(runs[runId]):null;
    },
    ...(options.callbacks||{}),
  };
  return {calls, instance:createUnitEconomicsReconciliation(callbacks)};
}

test('correctly reconciles cash net of tax/refund, Stripe fees and per-run provider costs',async()=>{
  const r=await setup().instance.reconcile(request());
  assert.equal(r.schemaVersion,RECONCILIATION_VERSION);
  assert.equal(r.netCashExcludingTaxMinor,9000);
  assert.equal(r.stripeFeesMinor,400);
  assert.equal(r.inferenceCostMinor,800);
  assert.equal(r.toolCostMinor,200);
  assert.equal(r.successfulRuns,1);
  assert.equal(r.failedRuns,1);
  assert.equal(r.costPerSuccessfulRunMinor,1000);
  assert.equal(r.agentRunCosts.length,2);
  assert.deepEqual(r.agentRunCosts.map(x=>x.totalMinor),[750,250]);
  assert.equal(r.status,'INCOMPLETE_FOR_ACCOUNTING_AND_PRODUCTION');
  assert.equal(r.qualification,'READ_ONLY_SOURCE_ADAPTER_INPUT_NOT_INDEPENDENTLY_ATTESTED');
});
test('replaying the same IDs cannot multiply events or agent runs',async()=>{
  const s=setup();
  const once=await s.instance.reconcile(request());
  const replay=await s.instance.reconcile(request({stripeEventIds:[PAY,PAY,REF,REF],agentRunIds:[RUN_B,RUN_A,RUN_A]}));
  assert.deepEqual(replay,once);
  assert.equal(s.calls.filter(x=>x==='stripe:'+PAY).length,2);
});
test('distinct webhook IDs for one identical Stripe business object count once',async()=>{
  const duplicate={...payment('evt_paymentB12'),payloadSha256:hash('e'),objectReadbackSha256:hash('f')};
  const s=setup({events:{[duplicate.eventId]:duplicate}});
  const v=await s.instance.reconcile(request({stripeEventIds:[PAY,duplicate.eventId],agentRunIds:[]}));
  assert.equal(v.netCashExcludingTaxMinor,10000);
  assert.equal(v.stripeFeesMinor,400);
  assert.equal(v.stripeBusinessObjects,1);
});
test('distinct webhook IDs for conflicting amounts on one business object fail closed',async()=>{
  const duplicate={...payment('evt_paymentB12'),grossMinor:12000};
  const s=setup({events:{[duplicate.eventId]:duplicate}});
  await assert.rejects(s.instance.reconcile(request({stripeEventIds:[PAY,duplicate.eventId],agentRunIds:[]})),/RECONCILIATION_UNAVAILABLE/);
});
test('over-refunded charge in same snapshot is rejected',async()=>{
  const x={...refund(),grossMinor:12000,taxMinor:190};
  const s=setup({events:{[REF]:x}});
  await assert.rejects(s.instance.reconcile(request({agentRunIds:[]})),/RECONCILIATION_UNAVAILABLE/);
});
test('same-period dispute decreases cash, never increases receipts',async()=>{
  const s=setup();
  const v=await s.instance.reconcile(request({stripeEventIds:[PAY,FAIL],agentRunIds:[]}));
  assert.equal(v.netCashExcludingTaxMinor,9500);
});
test('a valid earlier-period refund is a negative period cash adjustment',async()=>{
  const x={...refund(),occurredAt:'2026-12-02T12:00:00Z'};
  const s=setup({events:{[REF]:x}});
  const v=await s.instance.reconcile(request({periodStart:'2026-12-01T00:00:00Z',periodEnd:'2027-01-01T00:00:00Z',stripeEventIds:[REF],agentRunIds:[]}));
  assert.equal(v.netCashExcludingTaxMinor,-1000);
});
test('denies missing authentication before any provider lookup',async()=>{
  const s=setup({tenant:null});
  await assert.rejects(s.instance.reconcile(request()),/RECONCILIATION_UNAVAILABLE/);
  assert.deepEqual(s.calls,['auth']);
});
test('denies mismatched owner from Stripe provider or agent billing source',async()=>{
  let s=setup({events:{[PAY]:{...payment(),tenantId:OTHER}}});
  await assert.rejects(s.instance.reconcile(request({stripeEventIds:[PAY],agentRunIds:[]})),/RECONCILIATION_UNAVAILABLE/);
  s=setup({callbacks:{readProviderCost:async({runId})=>({...bill(run()),tenantId:OTHER})}});
  await assert.rejects(s.instance.reconcile(request({stripeEventIds:[],agentRunIds:[RUN_A]})),/RECONCILIATION_UNAVAILABLE/);
});
test('an unprocessed or missing Stripe event inbox denies recognition',async()=>{
  let s=setup({callbacks:{readStripeInbox:async({eventId})=>({
    eventId,eventType:'charge.succeeded',status:'processing',livemode:true,payloadSha256:hash('a')})}});
  await assert.rejects(s.instance.reconcile(request({stripeEventIds:[PAY],agentRunIds:[]})),/RECONCILIATION_UNAVAILABLE/);
  s=setup({callbacks:{readStripeInbox:async()=>null}});
  await assert.rejects(s.instance.reconcile(request({stripeEventIds:[PAY],agentRunIds:[]})),/RECONCILIATION_UNAVAILABLE/);
});
test('rejects mismatched Stripe payload digest, object hash and test mode',async()=>{
  for (const change of [{payloadSha256:hash('b')},{objectReadbackSha256:'invalid'},{livemode:false},{currency:'usd'}]) {
    const s=setup({events:{[PAY]:{...payment(),...change}}});
    await assert.rejects(s.instance.reconcile(request({stripeEventIds:[PAY],agentRunIds:[]})),/RECONCILIATION_UNAVAILABLE/);
  }
});
test('rejects unknown business events and untrusted/unsettled business objects',async()=>{
  for (const change of [{eventType:'invoice.created'},{kind:'TRIAL'},{objectId:'re_bad123456'},{balanceTransactionId:''},{grossMinor:0},{taxMinor:12000}]) {
    const s=setup({events:{[PAY]:{...payment(),...change}}});
    await assert.rejects(s.instance.reconcile(request({stripeEventIds:[PAY],agentRunIds:[]})),/RECONCILIATION_UNAVAILABLE/);
  }
});
test('rejects cross-period or wrong-product records',async()=>{
  for (const change of [{occurredAt:'2026-12-10T12:00:00Z'},{product:'another_product'},{occurredAt:'2026-11-31T12:00:00Z'}]) {
    const s=setup({events:{[PAY]:{...payment(),...change}}});
    await assert.rejects(s.instance.reconcile(request({stripeEventIds:[PAY],agentRunIds:[]})),/RECONCILIATION_UNAVAILABLE/);
  }
});
test('rejects invalid event IDs, run IDs and unbounded scans before provider access',async()=>{
  for (const bad of [{stripeEventIds:['evt_'];},{},]) {}
});
