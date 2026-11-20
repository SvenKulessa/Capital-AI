import test from 'node:test';
import assert from 'node:assert/strict';
import { createUnitEconomicsLedgerStaging } from './unit-economics-ledger-staging.mjs';
import { RECONCILIATION_VERSION } from './unit-economics-reconciliation.mjs';

const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const RUN='33333333-3333-4333-8333-333333333333';
const SNAP='44444444-4444-4444-8444-444444444444';
const HA='a'.repeat(64);
const HB='b'.repeat(64);
const call=(x={})=>({
  principal:{verifiedUserId:A},key:'stable-unique-123456',product:'saas-pro-monthly',
  periodStart:'2026-11-01T00:00:00Z',periodEnd:'2026-12-01T00:00:00Z',...x,
});
const projection=()=>({
  schemaVersion:RECONCILIATION_VERSION,qualification:'READ_ONLY_SOURCE_ADAPTER_INPUT_NOT_INDEPENDENTLY_ATTESTED',
  status:'INCOMPLETE_FOR_ACCOUNTING_AND_PRODUCTION',currency:'EUR',product:'saas-pro-monthly',
  periodStart:'2026-11-01T00:00:00Z',periodEnd:'2026-12-01T00:00:00Z',
  snapshotSha256:HA,netCashExcludingTaxMinor:9200,stripeFeesMinor:300,
  inferenceCostMinor:75,toolCostMinor:25,successfulRuns:1,failedRuns:0,
  agentRunCosts:[{runId:RUN,status:'SUCCEEDED',inferenceMinor:75,toolsMinor:25,
    totalMinor:100,evidenceHash:HB}],
});
function setup(change={}) {
  const keys=new Map(),snapshots=new Map(),reversals=new Map(),calls=[];
  const actor={
    resolveTenant:async p=>{calls.push('auth');return p?.verifiedUserId ?? null;},
    reconcile:async()=>{calls.push('reconcile');return {...projection(),...(change.projection||{})};},
    record:async p=>{
      calls.push('record');
      const existing=keys.get(p.tenantId+':'+p.idempotencyKey);
      if(existing) return existing.requestSha256===p.requestSha256?
        {state:'replayed',snapshotId:existing.snapshotId}:{state:'conflict'};
      keys.set(p.tenantId+':'+p.idempotencyKey,p);snapshots.set(p.tenantId+':'+p.snapshotId,p);
      return {state:'created',snapshotId:p.snapshotId};
    },
    reverse:async ({tenantId,snapshotId,key,reasonSha256})=>{
      calls.push('reverse');
      if(!snapshots.has(tenantId+':'+snapshotId))return {state:'not_found'};
      const existing=reversals.get(tenantId+':'+snapshotId);
      if(existing)return {state:existing.key===key&&existing.reasonSha256===reasonSha256?'replayed':'conflict'};
      reversals.set(tenantId+':'+snapshotId,{key,reasonSha256});
      return {state:'reversed'};
    },
    read:async ({tenantId,snapshotId})=>{
      calls.push('read');
      const row=snapshots.get(tenantId+':'+snapshotId);
      return row?{snapshotId,accountingEligible:false,state:reversals.has(tenantId+':'+snapshotId)?'reversed':'active'}:null;
    },
    uuid:()=>SNAP,...(change.callbacks||{}),
  };
  return {calls,keys,snapshots,api:createUnitEconomicsLedgerStaging(actor)};
}
test('staging derives tenant from verified principal, not user-supplied tenant field',async()=>{
  const h=setup();const v=await h.api.stage({...call(),tenantId:B});
  assert.equal(v.state,'created');assert.equal(v.productionEligible,false);
  const stored=[...h.snapshots.values()][0];assert.equal(stored.tenantId,A);
  assert.equal(stored.inferenceMinor,75);assert.equal(stored.runs[0].runId,RUN);
  assert.match(stored.requestSha256,/^[a-f0-9]{64}$/);
  assert.deepEqual(h.calls,['auth','reconcile','record']);
});
test('identical retries use the same content hash and preserve one snapshot',async()=>{
  const h=setup();const a=await h.api.stage(call());const b=await h.api.stage(call());
  assert.equal(a.snapshotId,b.snapshotId);assert.equal(b.state,'replayed');assert.equal(h.snapshots.size,1);
});
test('same key with changed cost digest fails with conflict, never modifies row',async()=>{
  let n=0;
  const h=setup({callbacks:{reconcile:async()=>({...projection(),snapshotSha256:n++===0?HA:HB})}});
  await h.api.stage(call());const v=await h.api.stage(call());
  assert.equal(v.state,'conflict');assert.equal(h.snapshots.size,1);
});
test('cross-tenant unauthorized reads and reversals do not resolve',async()=>{
  const h=setup();await h.api.stage(call());
  assert.equal(await h.api.get({principal:{verifiedUserId:B},snapshotId:SNAP}),null);
  assert.equal((await h.api.rollback({principal:{verifiedUserId:B},snapshotId:SNAP,
    key:'reversal-key-123456',reasonSha256:HA})).state,'not_found');
});
test('rollback is an immutable compensating record, exact replay is idempotent',async()=>{
  const h=setup();await h.api.stage(call());
  const p={principal:{verifiedUserId:A},snapshotId:SNAP,key:'reversal-key-123456',reasonSha256:HB};
  assert.equal((await h.api.rollback(p)).state,'reversed');
  assert.equal((await h.api.rollback(p)).state,'replayed');
  assert.equal((await h.api.rollback({...p,reasonSha256:HA})).state,'conflict');
  assert.equal((await h.api.get({principal:p.principal,snapshotId:SNAP})).state,'reversed');
});
test('rejects invalid authentication before reconciliation or database writes',async()=>{
  const h=setup();await assert.rejects(h.api.stage(call({principal:{tenantId:A}})),/LEDGER_UNAVAILABLE/);
  assert.deepEqual(h.calls,['auth']);
});
test('rejects fabricated production authority and incomplete/broken source values',async()=>{
  for(const patch of [
    {status:'PRODUCTION_VERIFIED'}, {currency:'USD'}, {snapshotSha256:'wrong'},
    {netCashExcludingTaxMinor:0.3}, {inferenceCostMinor:76},
    {agentRunCosts:[{...projection().agentRunCosts[0],status:'SYNTHETIC_LOCAL_COMPLETED'}]},
    {agentRunCosts:[{...projection().agentRunCosts[0],totalMinor:101}]},
    {successfulRuns:0},{agentRunCosts:[{...projection().agentRunCosts[0],runId:'../secret'}]}
  ]){
    const h=setup({projection:patch});await assert.rejects(h.api.stage(call()),/LEDGER_UNAVAILABLE/);
    assert.equal(h.snapshots.size,0);
  }
});
test('rejects invalid key, dates and reversed periods before reconciliation',async()=>{
  for(const patch of [{key:'short'},{product:'../foo'},{periodStart:'2026-02-30T00:00:00Z'},
    {periodEnd:'2026-10-01T00:00:00Z'}]){
    const h=setup();await assert.rejects(h.api.stage(call(patch)),/LEDGER_UNAVAILABLE/);
    assert.deepEqual(h.calls,['auth']);
  }
});
test('ledger executor failure never returns raw provider or database secrets',async()=>{
  const h=setup({callbacks:{record:async()=>{throw new Error('db-secret token=xyz')}}});
  await assert.rejects(h.api.stage(call()),e=>e.message==='UNIT_ECONOMICS_LEDGER_UNAVAILABLE');
});
test('no built-in database, Supabase URL, Stripe request or provider call during construction',()=>{
  const h=setup();assert.deepEqual(h.calls,[]);
});
