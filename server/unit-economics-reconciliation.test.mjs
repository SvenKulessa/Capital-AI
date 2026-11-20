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
  settlementStatus:'SETTLED',disputeOutcome:null,
});
const refund=()=>({
  ...payment(REF),eventType:'refund.updated',kind:'REFUND',objectId:'re_ref123456',
  grossMinor:1190,taxMinor:190,feeMinor:0,occurredAt:'2026-11-12T12:00:00Z',
  balanceTransactionId:'txn_ref123456',payloadSha256:hash('c'),objectReadbackSha256:hash('d'),
});
const dispute=()=>({
  ...payment(FAIL),eventType:'charge.dispute.closed',kind:'DISPUTE',objectId:'dp_dis123456',
  grossMinor:500,taxMinor:0,feeMinor:0,occurredAt:'2026-11-13T12:00:00Z',
  balanceTransactionId:'txn_dis123456',payloadSha256:hash('e'),objectReadbackSha256:hash('f'),disputeOutcome:'LOST',
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
    resolveTenant:async p=>{calls.push('auth');return Object.hasOwn(options,'tenant')?options.tenant:T;},
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
  assert.equal(s.calls.filter(c=>c.startsWith('stripe:')).length,0,'no provider read on pending inbox');
  s=setup({callbacks:{readStripeInbox:async()=>null}});
  await assert.rejects(s.instance.reconcile(request({stripeEventIds:[PAY],agentRunIds:[]})),/RECONCILIATION_UNAVAILABLE/);
});
test('rejects invalid Stripe payload/object hash, test mode and FX',async()=>{
  for (const change of [{payloadSha256:'not-a-sha'},{objectReadbackSha256:'invalid'},{livemode:false},{currency:'usd'}]) {
    const s=setup({events:{[PAY]:{...payment(),...change}}});
    await assert.rejects(s.instance.reconcile(request({stripeEventIds:[PAY],agentRunIds:[]})),/RECONCILIATION_UNAVAILABLE/);
  }
});
test('rejects unknown business events and untrusted/unsettled business objects',async()=>{
  for (const change of [{eventType:'invoice.created'},{kind:'TRIAL'},{objectId:'re_bad123456'},{balanceTransactionId:''},{grossMinor:0},{taxMinor:12000},{settlementStatus:'PENDING'},{sourceId:'cs_test_abc123456'}]) {
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
  for (const changes of [
    {stripeEventIds:['evt_']},
    {agentRunIds:['../secrets']},
    {stripeEventIds:Array.from({length:101},(_,i)=>'evt_test'+String(i).padStart(6,'0'))},
    {agentRunIds:Array.from({length:101},()=>RUN_A)},
    {periodStart:'2026-12-01T00:00:00Z'},
    {periodEnd:'not-a-date'},
    {product:'../wrong'},
  ]) {
    const s=setup();
    await assert.rejects(s.instance.reconcile(request(changes)),/RECONCILIATION_UNAVAILABLE/);
    assert.deepEqual(s.calls,['auth']);
  }
});
test('rejects unbilled or synthetic pilot agent runs; no estimated AI cost',async()=>{
  for (const change of [
    {executionStatus:'SYNTHETIC_LOCAL_COMPLETED'},
    {billingLineId:''},
    {runEvidenceSha256:'not-a-digest'},
    {inputTokens:-1},
    {outputTokens:1.1},
    {completedAt:'2027-01-01T00:00:00Z'},
  ]) {
    const s=setup({runs:{[RUN_A]:{...run(),...change}}});
    await assert.rejects(s.instance.reconcile(request({stripeEventIds:[],agentRunIds:[RUN_A]})),/RECONCILIATION_UNAVAILABLE/);
  }
});
test('rejects unproven, mismatched and non-EUR provider costs',async()=>{
  const r=run();
  for (const change of [
    {billingState:'ESTIMATED'}, {currency:'USD'}, {billingEvidenceSha256:'bad'},
    {billingLineId:'wrong_bill_id'}, {runId:RUN_B}, {model:'unrelated'},
    {inferenceMinor:-1}, {toolsMinor:0.25}, {toolsMinor:Number.MAX_SAFE_INTEGER},
  ]) {
    const s=setup({callbacks:{readProviderCost:async()=>({...bill(r),...change})}});
    await assert.rejects(s.instance.reconcile(request({stripeEventIds:[],agentRunIds:[RUN_A]})),/RECONCILIATION_UNAVAILABLE/);
  }
});
test('two runs may not allocate the same provider billing line twice',async()=>{
  const duplicated={...run(RUN_B),billingLineId:run().billingLineId};
  const s=setup({runs:{[RUN_B]:duplicated}});
  await assert.rejects(s.instance.reconcile(request({stripeEventIds:[],agentRunIds:[RUN_A,RUN_B]})),/RECONCILIATION_UNAVAILABLE/);
});
test('empty request is zero observed cash but still INCOMPLETE, not proof of zero bills',async()=>{
  const s=setup();
  const v=await s.instance.reconcile(request({stripeEventIds:[],agentRunIds:[]}));
  assert.equal(v.netCashExcludingTaxMinor,0);
  assert.equal(v.inferenceCostMinor,0);
  assert.equal(v.costPerSuccessfulRunMinor,null);
  assert.equal(v.status,'INCOMPLETE_FOR_ACCOUNTING_AND_PRODUCTION');
  assert.deepEqual(s.calls,['auth']);
});
test('output contains no principal, tenant ID, Stripe event IDs or raw charge receipts',async()=>{
  const s=setup();
  const result=JSON.stringify(await s.instance.reconcile(request()));
  assert.doesNotMatch(result,/trusted-test-user|11111111-1111|evt_paymentA12|in_invoice123456|ch_pay123456|balanceTransactionId/);
  assert.match(result,/snapshotSha256/);
});
test('reordered unique identifiers yield deterministic snapshots',async()=>{
  const s=setup();
  const a=await s.instance.reconcile(request());
  const b=await s.instance.reconcile(request({stripeEventIds:[REF,PAY],agentRunIds:[RUN_B,RUN_A]}));
  assert.deepEqual(b,a);
});
test('read failures must not emit a success projection',async()=>{
  const s=setup({callbacks:{readStripeEvent:async()=>{throw new Error('sensitive-provider-error');}}});
  await assert.rejects(s.instance.reconcile(request({stripeEventIds:[PAY],agentRunIds:[]})),/RECONCILIATION_UNAVAILABLE/);
});
test('unbounded or fractional Stripe fees fail closed',async()=>{
  for (const change of [{feeMinor:-1},{grossMinor:1.5},{feeMinor:0.9},{feeMinor:Number.MAX_SAFE_INTEGER}]) {
    const s=setup({events:{[PAY]:{...payment(),...change}}});
    // MAX_SAFE_INTEGER is a valid single fee, but two such fees or a combined
    // net/cost sum must not silently overflow.
    if (change.feeMinor===Number.MAX_SAFE_INTEGER) {
      const other={...refund(),feeMinor:10};
      const t=setup({events:{[PAY]:{...payment(),...change},[REF]:other}});
      await assert.rejects(t.instance.reconcile(request({agentRunIds:[]})),/RECONCILIATION_UNAVAILABLE/);
    } else await assert.rejects(s.instance.reconcile(request({stripeEventIds:[PAY],agentRunIds:[]})),/RECONCILIATION_UNAVAILABLE/);
  }
});
test('constructor refuses absent trusted authentication, receipt or billing adapters',()=>{
  assert.throws(()=>createUnitEconomicsReconciliation(),/trusted server-side readers required/);
  assert.throws(()=>createUnitEconomicsReconciliation({resolveTenant:async()=>T}),/trusted server-side readers required/);
});

test('denies changed Stripe inbox hash even if provider record is valid',async()=>{
  const s=setup({callbacks:{readStripeInbox:async({eventId})=>({
    eventId,eventType:'charge.succeeded',status:'processed',livemode:true,payloadSha256:hash('f')
  })}});
  await assert.rejects(s.instance.reconcile(request({stripeEventIds:[PAY],agentRunIds:[]})),/RECONCILIATION_UNAVAILABLE/);
});
test('won dispute cannot be interpreted as lost cash',async()=>{
  const won={...dispute(),disputeOutcome:'WON'};
  const s=setup({events:{[FAIL]:won}});
  await assert.rejects(s.instance.reconcile(request({stripeEventIds:[FAIL],agentRunIds:[]})),/RECONCILIATION_UNAVAILABLE/);
});
test('payment and refund with different invoice/checkout authority are rejected',async()=>{
  const refundOther={...refund(),sourceId:'in_unrelated123456'};
  const s=setup({events:{[REF]:refundOther}});
  await assert.rejects(s.instance.reconcile(request({stripeEventIds:[PAY,REF],agentRunIds:[]})),/RECONCILIATION_UNAVAILABLE/);
});
test('Stripe reader errors are sanitized rather than propagating credential messages',async()=>{
  const s=setup({callbacks:{readStripeEvent:async()=>{throw new Error('secret-token-provider-error')}}});
  await assert.rejects(s.instance.reconcile(request({stripeEventIds:[PAY],agentRunIds:[]})),
    err=>err?.message==='UNIT_ECONOMICS_RECONCILIATION_UNAVAILABLE');
});

test('one Stripe balance transaction cannot be deducted or booked twice across objects',async()=>{
  const overlapping={...refund(),balanceTransactionId:'txn_pay123456'};
  const s=setup({events:{[REF]:overlapping}});
  await assert.rejects(s.instance.reconcile(request({agentRunIds:[]})),/RECONCILIATION_UNAVAILABLE/);
});
