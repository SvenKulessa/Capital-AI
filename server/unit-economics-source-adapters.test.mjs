import test from 'node:test';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createUnitEconomicsSourceAdapters as make,createUnitEconomicsSupabaseReader as dbReader,createUnitEconomicsStripeReader as stripeReader} from './unit-economics-source-adapters.mjs';
const tenant='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const runId='33333333-3333-4333-8333-333333333333';
const eventId='evt_payABC123',rEvent='evt_refABC123',dEvent='evt_disABC123';
const secret='sb_secret_'+ 'A'.repeat(25);
const proof='a'.repeat(64);
const invoiceId='in_123456789';const chargeId='ch_123456789';
const sourceId='cs_live_1234567890';
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function records(){
 const event={id:eventId,type:'charge.succeeded',livemode:true,created:1794211200,data:{object:{id:chargeId}}};
 const revent={...event,id:rEvent,type:'refund.updated',created:1794297600,data:{object:{id:'re_123456789'}}};
 const devent={...event,id:dEvent,type:'charge.dispute.closed',created:1794384000,data:{object:{id:'dp_123456789'}}};
 const charge={id:chargeId,currency:'eur',paid:true,status:'succeeded',livemode:true,payment_intent:'pi_123456789',amount:11900,balance_transaction:'txn_123456789'};
 const session={id:sourceId,mode:'subscription',metadata:{user_id:tenant,plan_id:'PRO',billing_cycle:'monthly'},livemode:true,status:'complete',payment_status:'paid',currency:'eur',client_reference_id:tenant,payment_intent:'pi_123456789',amount_total:11900,amount_subtotal:10000,invoice:invoiceId,customer:'cus_123456789',total_details:{amount_tax:1900}};
 const price={id:'price_1UMA4yPKr4joNbEckWSj3cJE',product:'prod_VMtsNeuSad0Dvx',currency:'eur',unit_amount:10000};
 const refund={id:'re_123456789',charge:chargeId,amount:1190,status:'succeeded',balance_transaction:'txn_ref123456'};
 const dispute={id:'dp_123456789',charge:chargeId,amount:500,status:'lost',balance_transactions:['txn_dis123456']};
 const inbox={event_id:eventId,event_type:'charge.succeeded',status:'processed',livemode:true,payload_hash:proof,ingress_source:'stripe_webhook'};
 const usage={tenant_id:tenant,run_id:runId,product:'saas-pro-monthly',completed_at:'2026-11-09T12:00:00Z',execution_status:'SUCCEEDED',provider:'openai',model:'gpt-6',input_tokens:100,output_tokens:50,billing_line_id:'usage.line:abc123',source_kind:'PROVIDER_METERED',run_evidence_sha256:proof};
 const billing={tenant_id:tenant,run_id:runId,billing_line_id:'usage.line:abc123',product:'saas-pro-monthly',provider:'openai',model:'gpt-6',currency:'EUR',billing_state:'SETTLED',inference_minor:80,tools_minor:20,source_kind:'PROVIDER_SETTLED_INVOICE',billing_evidence_sha256:'b'.repeat(64)};
usage.run_evidence_sha256=sha(['CAPITAL_AI_REAL_AGENT_RUN@1',
  ...['run_id','tenant_id','product','completed_at','execution_status','provider','model','input_tokens','output_tokens','billing_line_id','source_kind'].map(k=>usage[k])]);
 billing.billing_evidence_sha256=sha(['CAPITAL_AI_SETTLED_AGENT_BILL@1',
  ...['billing_line_id','run_id','tenant_id','product','provider','model','currency','billing_state','inference_minor','tools_minor','source_kind'].map(k=>billing[k])]);
 return {stripe:{['/events/'+eventId]:event,['/events/'+rEvent]:revent,['/events/'+dEvent]:devent,
 ['/charges/'+chargeId]:charge,
 ['/refunds/re_123456789']:refund,['/disputes/dp_123456789']:dispute,
 ['/checkout/sessions?payment_intent=pi_123456789&limit=2']:{data:[session],has_more:false},
 ['/checkout/sessions/'+sourceId+'/line_items?limit=2']:{data:[{quantity:1,price,amount_subtotal:10000}],has_more:false},
 ['/invoices/'+invoiceId]:{id:invoiceId,livemode:true,currency:'eur',status:'paid',customer:'cus_123456789',amount_paid:11900},
 ['/balance_transactions/txn_123456789']:{id:'txn_123456789',currency:'eur',amount:11900,fee:350},
 ['/balance_transactions/txn_ref123456']:{id:'txn_ref123456',currency:'eur',amount:-1190,fee:0},
 ['/balance_transactions/txn_dis123456']:{id:'txn_dis123456',currency:'eur',amount:-500,fee:0}},
 inbox:{[eventId]:inbox,[rEvent]:{...inbox,event_id:rEvent,event_type:'refund.updated',payload_hash:'c'.repeat(64)},[dEvent]:{...inbox,event_id:dEvent,event_type:'charge.dispute.closed',payload_hash:'d'.repeat(64)}},
 usage,billing};
}
function harness({mutate,authVerified=true,taxProof=true}={}){
 const data=records();mutate?.(data);const calls=[];
 const auth={verify:async()=>{calls.push('auth');return authVerified?{userId:tenant,subject:tenant}:null;}};
 const db={read:async(table,keys)=>{calls.push('db:'+table);let x=table==='stripe_event_inbox'?data.inbox[keys.event_id]:table==='agent_run_usage_evidence'?data.usage:data.billing;return x?structuredClone(x):null;}};
 const stripeGet=async path=>{calls.push('stripe:'+path);const x=data.stripe[path];if(!x)throw Error('not found');return structuredClone(x);};
 const readTaxAdjustment=async p=>{calls.push('tax');return taxProof?{source:'INDEPENDENT_TAX_READBACK',tenantId:tenant,sessionId:sourceId,objectId:p.objectId,amountMinor:p.amountMinor,taxMinor:100,sourceSha256:proof}:null;};
 return {a:make({auth,db,stripeGet,readTaxAdjustment}),data,calls};
}
const ctx=()=>({req:{method:'GET'},res:{}});
const reject=async p=>assert.rejects(p,err=>err?.message==='UNIT_ECONOMICS_ADAPTER_UNAVAILABLE');

test('verified single-user Supabase session is the only tenant authority',async()=>{
 const h=harness();assert.equal(await h.a.resolveTenant(ctx()),tenant);assert.deepEqual(h.calls,['auth']);
});
test('missing or forged auth session denied, no fallthrough to tenant ID in body',async()=>{
 const h=harness({authVerified:false});await reject(h.a.resolveTenant({...ctx(),tenantId:tenant}));assert.deepEqual(h.calls,['auth']);
});
test('read-only webhook inbox maps existing schema and strips extraneous fields',async()=>{
 const h=harness();const q=await h.a.readStripeInbox({tenantId:tenant,eventId});assert.deepEqual(q,{eventId,eventType:'charge.succeeded',status:'processed',livemode:true,payloadSha256:proof});
});
test('unprocessed or testmode inbox denies before Stripe provider access',async()=>{
 for(const change of [{status:'processing'},{status:'failed'},{livemode:false},{payload_hash:'bad'},{event_type:'invoice.created'}]){
  const h=harness({mutate:d=>Object.assign(d.inbox[eventId],change)});await reject(h.a.readStripeEvent({tenantId:tenant,eventId}));assert.equal(h.calls.filter(x=>x.startsWith('stripe:')).length,0);
 }
});
test('charge uses independently fetched event, session, price, invoice and balance data',async()=>{
 const h=harness();const out=await h.a.readStripeEvent({tenantId:tenant,eventId});
 assert.equal(out.kind,'PAYMENT');assert.equal(out.tenantId,tenant);assert.equal(out.product,'saas-pro-monthly');assert.equal(out.grossMinor,11900);assert.equal(out.taxMinor,1900);assert.equal(out.feeMinor,350);
 assert.equal(out.eventId,eventId);assert.match(out.objectReadbackSha256,/^[0-9a-f]{64}$/);assert.equal(out.payloadSha256,proof);
 assert(h.calls.includes('stripe:/invoices/'+invoiceId));
});
test('tenancy cannot be derived from webhook record, checkout must match user',async()=>{
 for(const change of [{client_reference_id:other},{metadata:{user_id:other,plan_id:'PRO',billing_cycle:'monthly'}}]){
  const h=harness({mutate:d=>Object.assign(d.stripe['/checkout/sessions?payment_intent=pi_123456789&limit=2'].data[0],change)});await reject(h.a.readStripeEvent({tenantId:tenant,eventId}));
 }
});
test('SKU/price, invoice and authoritative provider charge identity tampering rejected',async()=>{
 const cases=[d=>d.stripe['/checkout/sessions/'+sourceId+'/line_items?limit=2'].data[0].price.id='price_unknown',
  d=>d.stripe['/invoices/'+invoiceId].status='open',
  d=>d.stripe['/charges/'+chargeId].paid=false,
  d=>d.stripe['/events/'+eventId].type='charge.failed',
  d=>d.stripe['/balance_transactions/txn_123456789'].amount=1,
  d=>d.stripe['/checkout/sessions?payment_intent=pi_123456789&limit=2'].has_more=true];
 for(const mutate of cases){const h=harness({mutate});await reject(h.a.readStripeEvent({tenantId:tenant,eventId}));}
});
test('settled refund requires separate tax evidence, never proportional guess',async()=>{
 const h=harness();const v=await h.a.readStripeEvent({tenantId:tenant,eventId:rEvent});assert.equal(v.kind,'REFUND');assert.equal(v.taxMinor,100);
 const missing=harness({taxProof:false});await reject(missing.a.readStripeEvent({tenantId:tenant,eventId:rEvent}));
});
test('a won dispute is not an incurred loss',async()=>{
 const h=harness({mutate:d=>{d.stripe['/disputes/dp_123456789'].status='won';}});await reject(h.a.readStripeEvent({tenantId:tenant,eventId:dEvent}));
});
test('lost dispute uses independent tax readback and exact lost balance',async()=>{
 const h=harness();const v=await h.a.readStripeEvent({tenantId:tenant,eventId:dEvent});assert.equal(v.kind,'DISPUTE');assert.equal(v.disputeOutcome,'LOST');assert.equal(v.grossMinor,500);
});
test('run evidence must be tenant scoped, real metered, bounded and fingerprinted',async()=>{
 const h=harness();const v=await h.a.readAgentRun({tenantId:tenant,runId});assert.equal(v.billingLineId,'usage.line:abc123');assert.match(v.runEvidenceSha256,/^[a-f0-9]{64}$/);
 for(const change of [{tenant_id:other},{source_kind:'SYNTHETIC_LOCAL_COMPLETED'},{run_evidence_sha256:'bad'},{input_tokens:-1},{output_tokens:1.5},{output_tokens:999}]){
  const t=harness({mutate:d=>Object.assign(d.usage,change)});await reject(t.a.readAgentRun({tenantId:tenant,runId}));
 }
});
test('provider line must be independently settled EUR for same tenant/run',async()=>{
 const h=harness();const v=await h.a.readProviderCost({tenantId:tenant,runId,billingLineId:'usage.line:abc123'});assert.equal(v.inferenceMinor,80);
 for(const change of [{tenant_id:other},{run_id:other},{billing_state:'ESTIMATED'},{currency:'USD'},{source_kind:'INFERRED_TOKENS'},{billing_evidence_sha256:''},{tools_minor:-1},{tools_minor:99}]){
  const t=harness({mutate:d=>Object.assign(d.billing,change)});await reject(t.a.readProviderCost({tenantId:tenant,runId,billingLineId:'usage.line:abc123'}));
 }
});
test('errors redact provider credentials and do not leak raw source data',async()=>{
 const h=harness({mutate:d=>delete d.stripe['/charges/'+chargeId]});await reject(h.a.readStripeEvent({tenantId:tenant,eventId}));
});
test('no read executed at adapter construction time; no paid activation or DML',()=>{
 const h=harness();assert.deepEqual(h.calls,[]);
});
test('Supabase REST reader is GET-only, scoped, bounded and verifies returned tenant',async()=>{
 let requests=[];
 const fetchImpl=async (url,opts)=>{requests.push([String(url),opts]);return {ok:true,text:async()=>JSON.stringify([{tenant_id:tenant,run_id:runId}])};};
 const reader=dbReader({origin:'https://test-123.supabase.co',serviceKey:secret,fetchImpl});
 const row=await reader.read('agent_run_usage_evidence',{tenant_id:tenant,run_id:runId});assert.equal(row.tenant_id,tenant);
 assert.equal(requests.length,1);assert.equal(requests[0][1].method,'GET');
 assert(requests[0][0].includes('tenant_id=eq.'));
 await reject(reader.read('agent_run_usage_evidence',{tenant_id:other,run_id:runId}));
 await reject(reader.read('stripe_event_inbox',{tenant_id:tenant}));
});
test('Supabase reader rejects duplicate rows, unknown table, forged host and large payload',async()=>{
 assert.throws(()=>dbReader({origin:'https://evil.example',serviceKey:secret,fetchImpl:async()=>{}}),/ADAPTER_UNAVAILABLE/);
 const fetchImpl=async()=>({ok:true,text:async()=>JSON.stringify([{event_id:eventId},{event_id:eventId}])});
 const reader=dbReader({origin:'https://test-123.supabase.co',serviceKey:secret,fetchImpl});
 await reject(reader.read('stripe_event_inbox',{event_id:eventId}));
 await reject(reader.read('unknown_table',{event_id:eventId}));
});
test('Stripe reader refuses test/live mixing and only permits explicit GET path shapes',async()=>{
 assert.throws(()=>stripeReader({secret:'sk_test_abcdef',fetchImpl:async()=>{}}),/ADAPTER_UNAVAILABLE/);
 let calls=[];const r=stripeReader({secret:'sk_live_123456789',fetchImpl:async(u,o)=>{calls.push([u,o]);return {ok:true,text:async()=>'{"id":"evt_payABC123"}'}}});
 const obj=await r('/events/'+eventId);assert.equal(obj.id,eventId);assert.equal(calls[0][1].method,'GET');
 await reject(r('/v1/payment_intents'));await reject(r('/charges/ch_123456789?expand[]=source'));await reject(r('https://evil.example/'));
 assert.equal(calls.length,1);
});
test('identical business event reading is deterministic with no writes or mem-store',async()=>{
 const h=harness();const a=await h.a.readStripeEvent({tenantId:tenant,eventId});const b=await h.a.readStripeEvent({tenantId:tenant,eventId});assert.deepEqual(a,b);
});
test('input ID traversal, missing callbacks and unauthorized principals are denied',async()=>{
 assert.throws(()=>make({}),/ADAPTER_UNAVAILABLE/);
 const h=harness();await reject(h.a.readStripeInbox({tenantId:tenant,eventId:'evt_../../secret'}));await reject(h.a.readAgentRun({tenantId:other,runId:'../../etc'}));
});
test('complete composition with existing reconciliation read model keeps accounting incomplete',async()=>{
 const {createUnitEconomicsReconciliation}=await import('./unit-economics-reconciliation.mjs');
 const h=harness();const projection=await createUnitEconomicsReconciliation(h.a).reconcile({
  principal:ctx(),product:'saas-pro-monthly',periodStart:'2026-11-01T00:00:00Z',periodEnd:'2026-12-01T00:00:00Z',
  stripeEventIds:[eventId,eventId],agentRunIds:[runId,runId],
 });
 assert.equal(projection.netCashExcludingTaxMinor,10000);
 assert.equal(projection.stripeFeesMinor,350);
 assert.equal(projection.inferenceCostMinor,80);
 assert.equal(projection.toolCostMinor,20);
 assert.equal(projection.successfulRuns,1);
 assert.equal(projection.costPerSuccessfulRunMinor,100);
 assert.equal(projection.status,'INCOMPLETE_FOR_ACCOUNTING_AND_PRODUCTION');
});
test('cross-tenant Stripe attribution halts integrated reconciliation without partial result',async()=>{
 const {createUnitEconomicsReconciliation}=await import('./unit-economics-reconciliation.mjs');
 const h=harness({mutate:d=>{d.stripe['/checkout/sessions?payment_intent=pi_123456789&limit=2'].data[0].client_reference_id=other;}});
 await reject(createUnitEconomicsReconciliation(h.a).reconcile({
  principal:ctx(),product:'saas-pro-monthly',periodStart:'2026-11-01T00:00:00Z',periodEnd:'2026-12-01T00:00:00Z',
  stripeEventIds:[eventId],agentRunIds:[runId],
 }));
 assert.equal(h.calls.filter(x=>x.startsWith('db:agent')).length,0);
});
