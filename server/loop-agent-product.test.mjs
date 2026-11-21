import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  LOOP_AGENT_PRODUCT, GROWTH_EVENTS, loopDigest, verifyLoopStripeEvent, createLoopSubscriptionEventAdapter,
  mapLoopPrice, projectLoopEntitlement, authorizeLoopAction,
  loopUsageReceipt, loopGrowthProjection, calculateLoopKpis,
} from './loop-agent-product.mjs';

const tenantId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const subjectId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const runId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const NOW = Date.parse('2026-11-21T12:00:00Z');
const principal = {tenantId,subjectId};
const binding={tenantId,subjectId,customerId:'cus_TESTAAA'};
const price={ id:'price_TESTAAA',product:'prod_TESTAAA', active:true,livemode:false,currency:'eur',unit_amount:2900,recurring:{interval:'month',interval_count:1}};
const product={id:'prod_TESTAAA',active:true,livemode:false};
const mapping=[{priceId:price.id, productId:product.id,tier:'PRO',mode:'test',approved:true}];
const capabilities={observe:true,advisor:true,repair:false,createPullRequest:false,autonomousConvergence:false,productionMutation:false};
const policy={PRO:{capabilities,limits:{repositories:1,loopRuns:1}},FREE:{capabilities:{...capabilities,advisor:false},limits:{repositories:1,loopRuns:0}}};
const event={id:'evt_TESTAAA',type:'customer.subscription.updated',subscriptionId:'sub_TESTAAA',livemode:false,payloadSha256:'a'.repeat(64)};
const subscription={id:'sub_TESTAAA',customer:binding.customerId,livemode:false,status:'active',items:{data:[{price:price.id,quantity:1}]},current_period_end:Math.floor(NOW/1000)+3600};
const good={principal,binding,subscription,price,product,mapping,policy,event,nowMs:NOW};
const ent=()=>projectLoopEntitlement(good);
const repo='1293009324';
const authority={tenantId,subjectId,repositoryId:repo,repositoryPolicy:true,capabilityGrant:true,trust:true,quality:true,providerEvidence:true,membership:true};
const admit=(override={})=>authorizeLoopAction({entitlement:ent(),principal,repositoryId:repo,capability:'advisor',runId,idempotencyKey:'loop-test-run-123',authority,nowMs:NOW,atomicAdmission:async x=>({state:'created',...x}),readPersistedEntitlement:async()=>ent(),...override});
const denial=fn=>assert.throws(fn,/LOOP_AGENT_ADMISSION_DENIED/);
const asyncDenial=fn=>assert.rejects(fn,/LOOP_AGENT_ADMISSION_DENIED/);

test('canonical logical product and growth vocabulary are stable',()=>{
  assert.equal(LOOP_AGENT_PRODUCT.contract,'LOOP_AGENT_PRODUCT@1');
  assert.deepEqual(LOOP_AGENT_PRODUCT.tiers,['FREE','PRO','TEAM','ENTERPRISE']);
  assert.equal(GROWTH_EVENTS.length,12);
});
test('valid testmode price maps only through approved server mapping',()=>{
  assert.equal(mapLoopPrice({price,product,mapping,mode:'test'}),'PRO');
});
test('unknown Price and unapproved Price never grant tier',()=>{
  denial(()=>mapLoopPrice({price:{...price,id:'price_UNKNOWN'},product,mapping,mode:'test'}));
  denial(()=>mapLoopPrice({price,product,mapping:[{...mapping[0],approved:false}],mode:'test'}));
});
test('inactive price, inactive product, nonrecurring and mode mismatch fail closed',()=>{
  for(const [p,pr,mode] of [[{...price,active:false},product,'test'],[price,{...product,active:false},'test'],[{...price,recurring:null},product,'test'],[price,product,'live']])
    denial(()=>mapLoopPrice({price:p,product:pr,mapping,mode}));
});
test('subscription gives scoped immutable entitlement in test mode',()=>{
  assert.equal(ent().contract,'LOOP_AGENT_ENTITLEMENT@1');
  assert.equal(ent().tier,'PRO');
  assert.equal(ent().status,'ACTIVE');
  assert.equal(ent().capabilities.productionMutation,false);
  assert.equal(ent().integritySha256,loopDigest(Object.fromEntries(Object.entries(ent()).filter(([k])=>k!=='integritySha256'))));
});
test('canceled, past_due, unpaid, incomplete and unknown statuses deny',()=>{
  for(const status of ['canceled','past_due','unpaid','incomplete','not_in_catalog']){
    const result=projectLoopEntitlement({...good,subscription:{...subscription,status}});
    assert.equal(result.status,'BLOCKED');assert.equal(result.limits.loopRuns,0);
  }
});
test('expired subscription cannot grant a loop',()=>{
  assert.equal(projectLoopEntitlement({...good,subscription:{...subscription,current_period_end:Math.floor(NOW/1000)-1}}).status,'BLOCKED');
});
test('trialing requires explicit test policy',()=>{
  assert.equal(projectLoopEntitlement({...good,subscription:{...subscription,status:'trialing'}}).status,'BLOCKED');
  assert.equal(projectLoopEntitlement({...good,subscription:{...subscription,status:'trialing'},allowTrial:true}).status,'ACTIVE');
});
test('cross-tenant, cross-user and unrelated customer subscription are denied',()=>{
  denial(()=>projectLoopEntitlement({...good,binding:{...binding,tenantId:subjectId}}));
  denial(()=>projectLoopEntitlement({...good,binding:{...binding,subjectId:tenantId}}));
  denial(()=>projectLoopEntitlement({...good,subscription:{...subscription,customer:'cus_OTHERAA'}}));
});
test('multiple subscription items and altered event ID are denied',()=>{
  denial(()=>projectLoopEntitlement({...good,subscription:{...subscription,items:{data:[...subscription.items.data,...subscription.items.data]}}}));
  denial(()=>projectLoopEntitlement({...good,event:{...event,subscriptionId:'sub_OTHERAAA'}}));
});
test('price mismatch, metadata-only and missing mapping fail closed',()=>{
  denial(()=>projectLoopEntitlement({...good,subscription:{...subscription,items:{data:[{price:'price_OTHERAAA',quantity:1}]}}}));
  denial(()=>projectLoopEntitlement({...good,mapping:[]}));
});
test('paid entitlement and all independently checked evidence allow bounded nonproduction advisor',async()=>{
  const result=await admit();assert.equal(result.status,'ADMITTED_NON_PRODUCTION');assert.equal(result.runId,runId);
});
test('missing, forged or stale entitlement denied',async()=>{
  await asyncDenial(()=>admit({entitlement:null}));
  await asyncDenial(()=>admit({entitlement:{...ent(),tier:'ENTERPRISE'}}));
  await asyncDenial(()=>admit({nowMs:NOW+7200000}));
  await asyncDenial(()=>admit({nowMs:undefined}));
});
test('client-forged tier and FREE-to-paid escalation denied',async()=>{
  const forged={...ent(),tier:'TEAM',capabilities:{...ent().capabilities,repair:true}};
  await asyncDenial(()=>admit({entitlement:forged}));
  const free=projectLoopEntitlement({...good,subscription:{...subscription,status:'canceled'}});
  await asyncDenial(()=>admit({entitlement:free}));
});
test('reauthorization must re-read persisted entitlement, forged digest is not server authority',async()=>{
  await asyncDenial(()=>admit({readPersistedEntitlement:undefined}));
  await asyncDenial(()=>admit({readPersistedEntitlement:async()=>null}));
  const forged={...ent(),tier:'TEAM'}; forged.integritySha256=loopDigest(Object.fromEntries(Object.entries(forged).filter(([k])=>k!=='integritySha256')));
  await asyncDenial(()=>admit({entitlement:forged}));
});
test('wrong tenant, wrong user, wrong repository and missing policy denied',async()=>{
  await asyncDenial(()=>admit({principal:{...principal,tenantId:subjectId}}));
  await asyncDenial(()=>admit({principal:{...principal,subjectId:tenantId}}));
  await asyncDenial(()=>admit({repositoryId:'another-repository'}));
  for(const bit of ['repositoryPolicy','capabilityGrant','trust','quality','providerEvidence','membership'])
    await asyncDenial(()=>admit({authority:{...authority,[bit]:false}}));
});
test('Stripe payment does not permit production mutation or unauthorized repair',async()=>{
  await asyncDenial(()=>admit({capability:'productionMutation'}));
  await asyncDenial(()=>admit({capability:'repair'}));
  denial(()=>projectLoopEntitlement({...good,policy:{...policy,PRO:{...policy.PRO,capabilities:{...capabilities,productionMutation:true}}}}));
});
test('quota boundary and concurrency are delegated to atomic ledger, never client checks',async()=>{
  let used=0; const atomicAdmission=async (x)=>{if(used>=x.limit)return{state:'quota_exceeded'};used++;return{state:'created',...x};};
  const outcomes=await Promise.allSettled([admit({atomicAdmission}),admit({atomicAdmission})]);
  assert.equal(outcomes[0].status,'fulfilled'); assert.equal(outcomes[1].status,'rejected');
  assert.equal(used,1);
});
test('idempotency key and run ID mandatory for admission',async()=>{
  await asyncDenial(()=>admit({idempotencyKey:'unsafe'}));
  await asyncDenial(()=>admit({runId:'not-a-uuid'}));
});
const usage={runId,tenantId,repositoryId:repo,entitlementId:ent().entitlementId,tier:'PRO',
  startedAt:'2026-11-21T12:00:00Z',completedAt:'2026-11-21T12:01:00Z',modelCalls:0,
  providerCostMinor:0,computeCostMinor:0,toolCalls:1,ciCycles:1,repairCycles:0,
  humanIntervention:false,outcome:'SUCCEEDED',evidenceRefs:['local-test:run'],provenance:'SYNTHETIC_TEST'};
test('usage receipt digest deterministic and replay same run cannot create another usage record',()=>{
  const a=loopUsageReceipt(usage);const b=loopUsageReceipt({...usage,evidenceRefs:[...usage.evidenceRefs]});
  assert.deepEqual(a,b);
  const store=new Map(); const persist=r=>{if(store.has(r.runId))return 'REPLAY';store.set(r.runId,r);return'CREATED';};
  assert.equal(persist(a),'CREATED'); assert.equal(persist(b),'REPLAY');assert.equal(store.size,1);
});
test('usage validates costs, time range, identity and evidence',()=>{
  for (const change of [{providerCostMinor:-1},{computeCostMinor:0.1},{tenantId:subjectId,runId:'bad'},{evidenceRefs:[]},
    {completedAt:'2026-11-20T12:00:00Z'}]) denial(()=>loopUsageReceipt({...usage,...change}));
});
test('synthetic receipt cannot create real Growth performance events',()=>{
  assert.deepEqual(loopGrowthProjection(loopUsageReceipt(usage)).events,[]);
  assert.equal(loopGrowthProjection(loopUsageReceipt(usage)).status,'NOT_PROVEN');
});
test('verified-provider receipt still needs independent readback for Growth',()=>{
  const receipt=loopUsageReceipt({...usage,provenance:'VERIFIED_PROVIDER'});
  assert.deepEqual(loopGrowthProjection(receipt).events,[]);
  assert.deepEqual(loopGrowthProjection(receipt,{providerReadbackVerified:true}).events.map(x=>x.type),['LOOP_SUCCEEDED']);
  assert.equal(loopGrowthProjection(receipt,{providerReadbackVerified:true}).evidenceStatus,'NOT_PROVEN');
  denial(()=>loopGrowthProjection({...receipt,outcome:'FAILED'},{providerReadbackVerified:true}));
});
test('KPI zero denominators never emit NaN or Infinity',()=>{
  const z={viewed:0,activated:0,verifiedFirst:0,eligibleRuns:0,successfulRuns:0,humanInterventions:0,
    receiptCoveredRuns:0,totalRuns:0,totalCostMinor:0,netRevenueMinor:0,payingCustomers:0};
  assert.deepEqual(Object.entries(calculateLoopKpis(z)).filter(([k])=>k!=='status').map(([,v])=>v),Array(10).fill(null));
});
test('KPI counts fail closed on impossible denominators',()=>{
  const z={viewed:0,activated:0,verifiedFirst:1,eligibleRuns:0,successfulRuns:0,humanInterventions:0,
    receiptCoveredRuns:0,totalRuns:0,totalCostMinor:0,netRevenueMinor:0,payingCustomers:0};
  denial(()=>calculateLoopKpis(z));
});
function signedEvent(extra={}, t=1774094400){
 const data={id:'evt_TESTAAA',type:'customer.subscription.updated',created:t,livemode:false,
   data:{object:{id:'sub_TESTAAA'}},...extra};
 const rawBody=Buffer.from(JSON.stringify(data));const secret='whsec_TEST_SECRET_123';
 const signature='t='+t+',v1='+createHmac('sha256',secret).update(String(t)+'.').update(rawBody).digest('hex');
 return{rawBody,secret,signature,nowSeconds:t};
}
test('verified Stripe subscription webhook binds raw bytes and event ID',()=>{
  const e=verifyLoopStripeEvent(signedEvent());
  assert.equal(e.id,'evt_TESTAAA'); assert.equal(e.livemode,false);assert.equal(e.subscriptionId,'sub_TESTAAA');
});
test('replayed/expired webhook signature and tampered payload denied',()=>{
  denial(()=>verifyLoopStripeEvent({...signedEvent(),nowSeconds:1774094800}));
  denial(()=>verifyLoopStripeEvent({...signedEvent(),rawBody:Buffer.from('{}')}));
  denial(()=>verifyLoopStripeEvent({...signedEvent(),signature:'t=1774094400,v1='+('0'.repeat(64))}));
});
test('unrecognized webhook type or invalid object rejected',()=>{
  denial(()=>verifyLoopStripeEvent(signedEvent({type:'invoice.paid'})));
  denial(()=>verifyLoopStripeEvent(signedEvent({data:{object:{id:'cus_TESTAAA'}}})));
});

function eventProjector(overrides={}){
  const request=signedEvent();const signatureEvent=verifyLoopStripeEvent(request);
  const rows=new Map(); let writes=0;
  const deps={
    signingSecret:request.secret, now:()=>request.nowSeconds*1000,
    readProcessedInbox:async()=>({id:signatureEvent.id,status:'processed',livemode:false,payloadSha256:signatureEvent.payloadSha256}),
    readProviderSubscription:async()=>subscription,
    readCustomerBinding:async()=>binding,
    readPriceAndProduct:async()=>({price,product}),
    readPriceMapping:async()=>mapping,
    readTierPolicy:async()=>policy,
    atomicProject:async ({eventId,entitlement,payloadSha256})=>{
      const prior=rows.get(eventId);
      if(prior)return{state:'replayed',integritySha256:prior.integritySha256};
      rows.set(eventId,entitlement);writes++;
      return {state:'created',integritySha256:entitlement.integritySha256};
    },
    readBack:async ()=>rows.get(event.id), ...overrides,
  };
  return {request,adapter:createLoopSubscriptionEventAdapter(deps),rows,writes:()=>writes};
}
test('signed event + processed inbox + provider readback + atomic projection + readback',async()=>{
  const {adapter,request,writes}=eventProjector();
  const result=await adapter.process(request.rawBody,request.signature);
  assert.equal(result.status,'SOURCE_IMPLEMENTED');
  assert.equal(result.tier,'PRO'); assert.equal(writes(),1);
});
test('duplicate webhook delivery does not create duplicate projection',async()=>{
  const {adapter,request,writes}=eventProjector();
  await adapter.process(request.rawBody,request.signature);
  const repeated=await adapter.process(request.rawBody,request.signature);
  assert.equal(repeated.status,'REPLAY_IGNORED');assert.equal(writes(),1);
});
test('forged processed inbox or missing processed receipt blocks projection',async()=>{
  for(const bad of [{status:'pending'},{payloadSha256:'0'.repeat(64)},{livemode:true}]){
    const {adapter,request}=eventProjector({readProcessedInbox:async()=>(
      {id:event.id,status:'processed',livemode:false,payloadSha256:verifyLoopStripeEvent(signedEvent()).payloadSha256,...bad})});
    await asyncDenial(()=>adapter.process(request.rawBody,request.signature));
  }
});
test('provider tenant mismatch or missing event persistence readback blocks',async()=>{
  let {adapter,request}=eventProjector({readCustomerBinding:async()=>({...binding,customerId:'cus_WRONGAAA'})});
  await asyncDenial(()=>adapter.process(request.rawBody,request.signature));
  ({adapter,request}=eventProjector({readBack:async()=>null}));
  await asyncDenial(()=>adapter.process(request.rawBody,request.signature));
});
test('stale event ordering explicitly denied by atomic ledger adapter',async()=>{
  const {adapter,request}=eventProjector({atomicProject:async()=>({state:'stale',integritySha256:'0'.repeat(64)})});
  await asyncDenial(()=>adapter.process(request.rawBody,request.signature));
});
