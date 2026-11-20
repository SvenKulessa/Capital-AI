/**
 * Five read-only adapters for CAPITAL-AI unit economics. No handler or scheduler;
 * construction never opens a connection. A caller must explicitly supply trusted
 * auth, HTTPS read-only PostgREST and GET-only Stripe readers.
 */
import { createHash } from 'node:crypto';
import { BILLING_CATALOG } from './billing-catalog.mjs';

const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const EVT=/^evt_[A-Za-z0-9]{6,100}$/;
const SHA=/^[a-f0-9]{64}$/;
const CHARGE=/^ch_[A-Za-z0-9]{6,100}$/;
const RUN=UUID;
const BILL=/^[A-Za-z0-9][A-Za-z0-9._:-]{5,119}$/;
const PI=/^pi_[A-Za-z0-9]{6,100}$/;
const SESSION=/^cs_live_[A-Za-z0-9]{8,240}$/;
const INVOICE=/^in_[A-Za-z0-9]{6,100}$/;
const BT=/^txn_[A-Za-z0-9]{6,100}$/;
const REFUND=/^re_[A-Za-z0-9]{6,100}$/;
const DISPUTE=/^dp_[A-Za-z0-9]{6,100}$/;
const TYPE={"charge.succeeded":'PAYMENT',"refund.updated":'REFUND',"charge.dispute.closed":'DISPUTE'};
const ERROR='UNIT_ECONOMICS_ADAPTER_UNAVAILABLE';
const fail=()=>{throw new Error(ERROR)};
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const money=x=>Number.isSafeInteger(x)&&x>=0;
const uuid=x=>typeof x==='string'&&UUID.test(x);
const str=(x,re)=>typeof x==='string'&&re.test(x);
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const epoch=x=>Number.isSafeInteger(x)&&x>0&&x<4102444800;
const iso=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(x)&&!Number.isNaN(Date.parse(x))&&new Date(x).toISOString().replace('.000Z','Z')===x;
const billid=x=>str(x,BILL);
const product=x=>typeof x==='string'&&/^[a-z][a-z0-9_-]{1,63}$/.test(x);
const one=(rows)=>{if(!Array.isArray(rows)||rows.length!==1||!obj(rows[0]))fail();return rows[0]};
const narrowed=(row,fields)=>Object.fromEntries(fields.map(k=>[k,row[k]]));
function serviceRole(key) {
  if(/^sb_secret_[A-Za-z0-9_-]{24,}$/.test(key))return true;
  const parts=key.split('.');
  if(parts.length!==3)return false;
  try {return JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'))?.role==='service_role';}
  catch{return false;}
}
function proofHash(kind,row,fields){return digest([kind,...fields.map(k=>row[k])]);}

/** GET only. This is a service-role read facade, not an RLS assertion. */
export function createUnitEconomicsSupabaseReader({origin,serviceKey,fetchImpl=fetch}={}) {
  if (typeof origin!=='string'||!/^https:\/\/[A-Za-z0-9-]+\.supabase\.co\/?$/.test(origin)||
      typeof serviceKey!=='string'||!serviceRole(serviceKey)||
      typeof fetchImpl!=='function')fail();
  const base=new URL(origin);
  const allowed={
    stripe_event_inbox:['event_id','event_type','status','livemode','payload_hash','ingress_source'],
    agent_run_usage_evidence:['run_id','tenant_id','product','completed_at','execution_status','provider','model','input_tokens','output_tokens','billing_line_id','source_kind','run_evidence_sha256'],
    agent_run_billing_evidence:['billing_line_id','run_id','tenant_id','product','provider','model','currency','billing_state','inference_minor','tools_minor','source_kind','billing_evidence_sha256'],
  };
  return Object.freeze({
    async read(table,keys) {
      try {
        if(!Object.hasOwn(allowed,table)||!obj(keys)||!Object.keys(keys).length||Object.keys(keys).length>3)fail();
        const permitted=allowed[table];
        for(const [k,v] of Object.entries(keys)) {
          if(!permitted.includes(k)||!str(v,k==='event_id'?EVT:k==='billing_line_id'?BILL:UUID))fail();
        }
        const url=new URL('/rest/v1/'+table,base);
        url.searchParams.set('select',permitted.join(','));
        url.searchParams.set('limit','2');
        for(const [k,v] of Object.entries(keys))url.searchParams.set(k,'eq.'+v);
        const headers={Accept:'application/json',apikey:serviceKey};
        if(serviceKey.startsWith('eyJ'))headers.Authorization='Bearer '+serviceKey;
        const res=await fetchImpl(url,{method:'GET',headers,redirect:'error',signal:AbortSignal.timeout(7000)});
        if(!res?.ok)fail();
        const body=await res.text();
        if(Buffer.byteLength(body)>16*1024)fail();
        const row=one(JSON.parse(body));
        for(const [k,v] of Object.entries(keys))if(row[k]!==v)fail(); // service role bypasses RLS
        return narrowed(row,permitted);
      } catch {fail()}
    },
  });
}

/** Stripe GET only, no endpoint interpolation except validated paths. */
export function createUnitEconomicsStripeReader({secret,fetchImpl=fetch}={}) {
  if(typeof secret!=='string'||!/^((sk|rk)_live_[A-Za-z0-9]+)$/.test(secret)||typeof fetchImpl!=='function')fail();
  return Object.freeze(async function stripeGet(path){
    try {
      if(typeof path!=='string'||!/^\/(events|charges|refunds|disputes|balance_transactions)\/[A-Za-z0-9_]{8,120}$|^\/checkout\/sessions\?payment_intent=pi_[A-Za-z0-9]{6,100}&limit=2$|^\/checkout\/sessions\/cs_live_[A-Za-z0-9]{8,240}\/line_items\?limit=2$|^\/invoices\/in_[A-Za-z0-9]{6,100}$/.test(path))fail();
      const res=await fetchImpl('https://api.stripe.com/v1'+path,{method:'GET',headers:{Authorization:'Bearer '+secret,'Stripe-Version':'2026-09-30.endive'},redirect:'error',signal:AbortSignal.timeout(7000)});
      if(!res?.ok)fail();
      const raw=await res.text();
      if(Buffer.byteLength(raw)>64*1024)fail();
      const value=JSON.parse(raw);
      if(!obj(value)||value.error)fail();
      return value;
    }catch {fail()}
  });
}

function checkoutProduct(session) {
  if(!obj(session)||session.mode!=='subscription'||session.metadata?.campaign||
     !['monthly','annual'].includes(session.metadata?.billing_cycle))fail();
  const tier=String(session.metadata.plan_id||'').toLowerCase();
  if(!Object.hasOwn(BILLING_CATALOG.tiers,tier))fail();
  // Session uses existing server-side catalog; match exact allowlisted price
  // through a future line-item authority before financial promotion.
  return 'saas-'+tier+'-'+session.metadata.billing_cycle;
}

/**
 * No HTTP route, no live activation. Tenant == verified single Supabase user UUID;
 * organization tenancy, full accounting and provider bill completeness NOT_PROVEN.
 * readTaxAdjustment must provide independently verified tax credit-note evidence
 * on any refund or lost dispute. No proportional VAT assumption is permitted.
 */
export function createUnitEconomicsSourceAdapters({auth,db,stripeGet,readTaxAdjustment}={}) {
  if(typeof auth?.verify!=='function'||typeof db?.read!=='function'||
     typeof stripeGet!=='function'||typeof readTaxAdjustment!=='function')fail();
  const guard=async fn=>{try{return await fn()}catch{fail()}};
  const resolveTenant=({req,res}={})=>guard(async()=>{
    if(!obj(req)||!res)fail();
    const subject=await auth.verify(req,res);
    if(!uuid(subject?.userId)||subject.subject!==subject.userId)fail();
    return subject.userId;
  });
  const readStripeInbox=({tenantId,eventId}={})=>guard(async()=>{
    if(!uuid(tenantId)||!str(eventId,EVT))fail();
    // Existing table has no tenant_id: provider Checkout Session authority
    // MUST independently bind to user before the result can be returned.
    const row=await db.read('stripe_event_inbox',{event_id:eventId});
    if(row.event_id!==eventId||row.status!=='processed'||row.livemode!==true||
       !SHA.test(row.payload_hash)||!['charge.succeeded','refund.updated','charge.dispute.closed'].includes(row.event_type)||
       !str(row.ingress_source,/^[a-z][a-z0-9._:-]{2,80}$/))fail();
    return {eventId,eventType:row.event_type,status:'processed',livemode:true,payloadSha256:row.payload_hash};
  });
  const readStripeEvent=({tenantId,eventId}={})=>guard(async()=>{
    if(!uuid(tenantId)||!str(eventId,EVT))fail();
    // Require an independently processed webhook before *any* Stripe call.
    const inbox=await readStripeInbox({tenantId,eventId});
    const event=await stripeGet('/events/'+eventId);
    const kind=TYPE[event.type];
    if(!kind||event.id!==eventId||event.type!==inbox.eventType||event.livemode!==true||
       !epoch(event.created)||!obj(event.data?.object))fail();
    const eventObjectId=event.data.object.id;
    const pattern=kind==='PAYMENT'?CHARGE:kind==='REFUND'?REFUND:DISPUTE;
    if(!str(eventObjectId,pattern))fail();
    let adjustment=null, chargeId;
    if(kind==='PAYMENT') chargeId=eventObjectId;
    else {
      adjustment=await stripeGet((kind==='REFUND'?'/refunds/':'/disputes/')+eventObjectId);
      if(adjustment.id!==eventObjectId||!str(adjustment.charge,CHARGE))fail();
      chargeId=adjustment.charge;
    }
    const charge=await stripeGet('/charges/'+chargeId);
    if(charge.id!==chargeId||charge.currency!=='eur'||charge.paid!==true||
       charge.status!=='succeeded'||charge.livemode!==true||!str(charge.payment_intent,PI)||
       !money(charge.amount)||!str(charge.balance_transaction,BT))fail();
    const sessions=await stripeGet('/checkout/sessions?payment_intent='+charge.payment_intent+'&limit=2');
    if(sessions.has_more!==false)fail();
    const session=one(sessions.data);
    if(!str(session.id,SESSION)||session.livemode!==true||session.status!=='complete'||
       session.payment_status!=='paid'||session.currency!=='eur'||
       session.client_reference_id!==tenantId||session.metadata?.user_id!==tenantId||
       session.payment_intent!==charge.payment_intent||session.amount_total!==charge.amount)fail();
    const item=checkoutProduct(session);
    const tier=String(session.metadata.plan_id).toLowerCase();
    const cycle=session.metadata.billing_cycle;
    const expected=BILLING_CATALOG.tiers[tier];
    const priceId=cycle==='annual'?expected.annualPriceId:expected.monthlyPriceId;
    const lines=await stripeGet('/checkout/sessions/'+session.id+'/line_items?limit=2');
    if(lines.has_more!==false)fail();
    const line=one(lines.data);
    if(line.quantity!==1||line.price?.id!==priceId||
       (line.price.product?.id||line.price.product)!==expected.productId||
       line.price.currency!=='eur'||!money(line.price.unit_amount)||
       line.amount_subtotal!==line.price.unit_amount||
       session.amount_subtotal!==line.amount_subtotal)fail();
    if(!str(session.invoice,INVOICE)||!str(session.customer,/^cus_[A-Za-z0-9]{6,100}$/))fail();
    const invoice=await stripeGet('/invoices/'+session.invoice);
    if(invoice.id!==session.invoice||invoice.livemode!==true||invoice.currency!=='eur'||
       invoice.status!=='paid'||invoice.customer!==session.customer||
       invoice.amount_paid!==charge.amount)fail();
    let balanceId, amount, tax, fee, outcome=null;
    if(kind==='PAYMENT') {
      balanceId=charge.balance_transaction;
      amount=charge.amount;
      tax=session.total_details?.amount_tax;
      if(!money(tax)||tax>amount)fail();
    }else{
      if(kind==='REFUND') {
        if(adjustment.status!=='succeeded'||!str(adjustment.balance_transaction,BT))fail();
        balanceId=adjustment.balance_transaction;
      } else {
        if(adjustment.status!=='lost'||!Array.isArray(adjustment.balance_transactions)||
           adjustment.balance_transactions.length!==1||!str(adjustment.balance_transactions[0],BT))fail();
        balanceId=adjustment.balance_transactions[0];outcome='LOST';
      }
      amount=adjustment.amount;
      if(!money(amount)||amount===0||amount>charge.amount)fail();
      const proof=await readTaxAdjustment({tenantId,sessionId:session.id,chargeId,objectId:eventObjectId,kind,amountMinor:amount});
      // No unverified merchant metadata, percentage guess or guessed credit.
      if(!obj(proof)||proof.source!=='INDEPENDENT_TAX_READBACK'||proof.tenantId!==tenantId||
         proof.sessionId!==session.id||proof.objectId!==eventObjectId||
         proof.amountMinor!==amount||!money(proof.taxMinor)||proof.taxMinor>amount||
         !SHA.test(proof.sourceSha256))fail();
      tax=proof.taxMinor;
    }
    const balance=await stripeGet('/balance_transactions/'+balanceId);
    if(balance.id!==balanceId||balance.currency!=='eur'||!money(balance.fee)||
       !Number.isSafeInteger(balance.amount)||Math.abs(balance.amount)!==amount)fail();
    fee=balance.fee;
    if(!money(amount)||amount===0||!money(tax))fail();
    const occurredAt=new Date(event.created*1000).toISOString().replace('.000Z','Z');
    return {
      eventId,eventType:event.type,payloadSha256:inbox.payloadSha256,
      tenantId,product:item,occurredAt,currency:'eur',livemode:true,
      kind,objectId:eventObjectId,chargeId,sourceId:session.id,
      grossMinor:amount,taxMinor:tax,feeMinor:fee,balanceTransactionId:balance.id,
      objectReadbackSha256:digest([event.id,event.type,event.created,eventObjectId,
        charge.id,charge.amount,charge.payment_intent,session.id,session.client_reference_id,
        balance.id,balance.amount,balance.fee,amount,tax,outcome]),
      settlementStatus:'SETTLED',disputeOutcome:outcome,
    };
  });
  const readAgentRun=({tenantId,runId}={})=>guard(async()=>{
    if(!uuid(tenantId)||!str(runId,RUN))fail();
    const r=await db.read('agent_run_usage_evidence',{tenant_id:tenantId,run_id:runId});
    if(r.tenant_id!==tenantId||r.run_id!==runId||r.source_kind!=='PROVIDER_METERED'||
       !product(r.product)||!iso(r.completed_at)||!['SUCCEEDED','FAILED'].includes(r.execution_status)||
       !str(r.provider,/^[a-z][a-z0-9_-]{1,40}$/)||!str(r.model,/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/)||
       !money(r.input_tokens)||!money(r.output_tokens)||!billid(r.billing_line_id)||
       !str(r.run_evidence_sha256,SHA)||
       r.run_evidence_sha256!==proofHash('CAPITAL_AI_REAL_AGENT_RUN@1',r,[
         'run_id','tenant_id','product','completed_at','execution_status','provider','model',
         'input_tokens','output_tokens','billing_line_id','source_kind']))fail();
    return {runId,tenantId,product:r.product,completedAt:r.completed_at,executionStatus:r.execution_status,
      provider:r.provider,model:r.model,inputTokens:r.input_tokens,outputTokens:r.output_tokens,
      billingLineId:r.billing_line_id,runEvidenceSha256:r.run_evidence_sha256};
  });
  const readProviderCost=({tenantId,runId,billingLineId}={})=>guard(async()=>{
    if(!uuid(tenantId)||!str(runId,RUN)||!billid(billingLineId))fail();
    const r=await db.read('agent_run_billing_evidence',{tenant_id:tenantId,run_id:runId,billing_line_id:billingLineId});
    if(r.tenant_id!==tenantId||r.run_id!==runId||r.billing_line_id!==billingLineId||
       r.source_kind!=='PROVIDER_SETTLED_INVOICE'||!product(r.product)||r.billing_state!=='SETTLED'||
       r.currency!=='EUR'||!str(r.provider,/^[a-z][a-z0-9_-]{1,40}$/)||
       !str(r.model,/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/)||
       !money(r.inference_minor)||!money(r.tools_minor)||!str(r.billing_evidence_sha256,SHA)||
       r.billing_evidence_sha256!==proofHash('CAPITAL_AI_SETTLED_AGENT_BILL@1',r,[
         'billing_line_id','run_id','tenant_id','product','provider','model',
         'currency','billing_state','inference_minor','tools_minor','source_kind']))fail();
    return {billingLineId,runId,tenantId,product:r.product,provider:r.provider,model:r.model,
      currency:'EUR',billingState:'SETTLED',inferenceMinor:r.inference_minor,
      toolsMinor:r.tools_minor,billingEvidenceSha256:r.billing_evidence_sha256};
  });
  return Object.freeze({resolveTenant,readStripeInbox,readStripeEvent,readAgentRun,readProviderCost});
}