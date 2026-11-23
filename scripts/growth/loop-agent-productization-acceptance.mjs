/** Deterministic synthetic-only acceptance: no network, billing, provider or DB mutation. */
import {createHmac} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createLoopSubscriptionEventAdapter,verifyLoopStripeEvent,authorizeLoopAction,
  loopUsageReceipt,loopGrowthProjection,loopDigest,calculateLoopKpis} from '../../server/loop-agent-product.mjs';
const NOW=Date.parse('2026-11-21T12:00:00Z');
const tenantId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',subjectId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const runId='cccccccc-cccc-4ccc-8ccc-cccccccccccc',repositoryId='synthetic-repository';
export async function runSyntheticLoopProductAcceptance(){
  const principal={tenantId,subjectId},binding={...principal,customerId:'cus_TESTAAA'};
  const price={id:'price_TESTAAA',product:'prod_TESTAAA',active:true,livemode:false,currency:'eur',unit_amount:2900,recurring:{interval:'month',interval_count:1}};
  const product={id:'prod_TESTAAA',active:true,livemode:false};
  const mapping=[{priceId:price.id,productId:product.id,tier:'PRO',mode:'test',approved:true}];
  const policy={PRO:{capabilities:{observe:true,advisor:true,repair:false,createPullRequest:false,autonomousConvergence:false,productionMutation:false},limits:{repositories:1,loopRuns:1}}};
  const subscription={id:'sub_TESTAAA',customer:binding.customerId,livemode:false,status:'active',items:{data:[{price:price.id,quantity:1}]},current_period_end:Math.floor(NOW/1000)+3600};
  const payload={id:'evt_TESTAAA',created:Math.floor(NOW/1000),livemode:false,type:'customer.subscription.created',data:{object:{id:subscription.id}}};
  const rawBody=Buffer.from(JSON.stringify(payload)),secret='whsec_SYNTHETIC_TEST_ONLY';
  const signature='t='+payload.created+',v1='+createHmac('sha256',secret).update(payload.created+'.').update(rawBody).digest('hex');
  const event=verifyLoopStripeEvent({rawBody,signature,secret,nowSeconds:Math.floor(NOW/1000)});
  const projected=new Map(),admitted=new Map(),receipts=new Map();
  const adapter=createLoopSubscriptionEventAdapter({signingSecret:secret,now:()=>NOW,
    readProcessedInbox:async id=>({id,status:'processed',payloadSha256:event.payloadSha256,livemode:false}),
    readProviderSubscription:async()=>subscription,readCustomerBinding:async()=>binding,
    readPriceAndProduct:async()=>({price,product}),readPriceMapping:async()=>mapping,
    readTierPolicy:async()=>policy,
    atomicProject:async ({eventId,entitlement})=>{
      if(projected.has(eventId))return{state:'replayed',integritySha256:projected.get(eventId).integritySha256};
      projected.set(eventId,entitlement);return{state:'created',integritySha256:entitlement.integritySha256};
    },readBack:async()=>projected.get(event.id)});
  const original=await adapter.process(rawBody,signature),replay=await adapter.process(rawBody,signature);
  if(original.tier!=='PRO'||replay.status!=='REPLAY_IGNORED'||projected.size!==1)throw Error('SYNTHETIC_SUBSCRIPTION_FAILED');
  const entitlement=projected.get(event.id);
  const authority={...principal,repositoryId,repositoryPolicy:true,capabilityGrant:true,trust:true,quality:true,providerEvidence:true,membership:true};
  const admission=await authorizeLoopAction({entitlement,principal,repositoryId,capability:'advisor',runId,
    idempotencyKey:'synthetic-loop-123',authority,nowMs:NOW,
    readPersistedEntitlement:async()=>projected.get(event.id),
    atomicAdmission:async input=>{
      const k=input.tenantId+':'+input.idempotencyKey;
      if(admitted.has(k))return{state:'replayed'};
      if(admitted.size>=input.limit)return{state:'quota_exceeded'};
      admitted.set(k,input);return{state:'created',...input};
    }});
  if(admission.status!=='ADMITTED_NON_PRODUCTION')throw Error('SYNTHETIC_ADMISSION_FAILED');
  const receipt=loopUsageReceipt({runId,tenantId,repositoryId,entitlementId:entitlement.entitlementId,tier:entitlement.tier,
    startedAt:'2026-11-21T12:00:00Z',completedAt:'2026-11-21T12:01:00Z',modelCalls:0,providerCostMinor:0,computeCostMinor:0,toolCalls:1,ciCycles:0,repairCycles:0,
    humanIntervention:false,outcome:'SUCCEEDED',provenance:'SYNTHETIC_TEST',evidenceRefs:['synthetic:test-only:admission']});
  receipts.set(receipt.runId,receipt);
  if(receipts.get(runId)?.receiptSha256!==receipt.receiptSha256)throw Error('SYNTHETIC_RECEIPT_MISMATCH');
  const growth=loopGrowthProjection(receipts.get(runId));
  const kpis=calculateLoopKpis({viewed:0,activated:0,verifiedFirst:0,eligibleRuns:0,successfulRuns:0,
    humanInterventions:0,receiptCoveredRuns:0,totalRuns:0,totalCostMinor:0,netRevenueMinor:0,payingCustomers:0});
  if(growth.status!=='NOT_PROVEN'||growth.events.length||kpis.activationRate!==null)throw Error('SYNTHETIC_GROWTH_CLAIM');
  return {contract:'CAPITAL_AI_LOOP_SYNTHETIC_E2E@1',status:'SOURCE_IMPLEMENTED',mode:'SYNTHETIC_OFFLINE',
    subscription:'SYNTHETIC_TEST',entitlement:entitlement.tier,authorization:admission.status,eventReplay:replay.status,
    subscriptionCount:projected.size,usageCount:receipts.size,usageReceiptSha256:receipt.receiptSha256,
    revenueEvidence:'NOT_PROVEN',providerBillingEvidence:'NOT_PROVEN',growthEvidence:growth.status,
    cads:{pricing:'NO_DATA',entitlements:'SYNTHETIC_TEST',usage:'SYNTHETIC_TEST',economics:'NO_DATA',funnel:'NO_DATA'},
    evidenceSha256:loopDigest({receiptSha256:receipt.receiptSha256,eventId:event.id,entitlementId:entitlement.entitlementId})};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  process.stdout.write(JSON.stringify(await runSyntheticLoopProductAcceptance(),null,2)+'\n');
}
