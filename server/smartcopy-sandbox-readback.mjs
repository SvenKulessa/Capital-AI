import { boundedJson } from './http-security.mjs';
/** Server-only, inactive sandbox composition candidate. No HTTP route, payment,
 * DB write, network transport, provider credential or entitlement mutation.
 * The dependency functions must be bound by trusted server code to independently
 * authenticated adapters. Caller-provided receipts are never accepted here.
 * This module does not authenticate the provider or prove the adapters exist.
 */
const SHA = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const SID = /^cs_test_[A-Za-z0-9_]{8,240}$/;
const PRICE = /^price_[A-Za-z0-9_]{6,240}$/;
const PRODUCT = /^prod_[A-Za-z0-9_]{6,240}$/;
const PI = /^pi_[A-Za-z0-9_]{8,240}$/;
const CHARGE = /^ch_[A-Za-z0-9_]{8,240}$/;
const day = 86400000;
const exact = (v, keys) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === keys.length && keys.every(k=>Object.hasOwn(v,k));
const matches = (r, u, s) => r?.userId===u && r.productId==='ai-smartcopy' && r.campaignId===s.campaignId && r.releaseSha256===s.releaseSha256;
const time = v => typeof v==='string' && Number.isFinite(Date.parse(v)) && new Date(v).toISOString()===v;
const denied = reason => Object.freeze({contractVersion:'CAPITAL_AI_SMARTCOPY_SANDBOX_READBACK_CANDIDATE@1',status:'NOT_PROVEN',reason,liveMetrics:null,providerAuthentication:'NOT_PROVEN',liveSalesAllowed:false,publicPublishAllowed:false,entitlementMutation:false});
const scopeKeys=['productId','campaignId','releaseSha256','sku','stripeProductId','stripePriceId','amountCents','mode'];
const consentKeys=['userId','productId','campaignId','releaseSha256','receiptSha256','purpose','analytics','grantedAt','expiresAt','revokedAt'];
const paymentKeys=['userId','productId','campaignId','releaseSha256','sessionId','intentId','chargeId','sku','stripeProductId','stripePriceId','mode','livemode','currency','status','paidAt','observedAt','paidCents','refundedCents','disputed'];
const licenseKeys=['userId','productId','campaignId','releaseSha256','intentId','state','observedAt'];
export function createSmartcopySandboxReadback({scope,auth,readConsent,readVerifiedOneTimeReceipt,readEntitlement,now=Date.now}={}) {
  if (!exact(scope,scopeKeys) || scope.productId!=='ai-smartcopy' || typeof scope.campaignId!=='string' || !/^smartcopy-[a-f0-9]{24}$/.test(scope.campaignId) || typeof scope.releaseSha256!=='string' || !SHA.test(scope.releaseSha256) || scope.sku!=='AI_SMARTCOPY_PERSONAL' || typeof scope.stripeProductId!=='string' || !PRODUCT.test(scope.stripeProductId) || typeof scope.stripePriceId!=='string' || !PRICE.test(scope.stripePriceId) || !Number.isSafeInteger(scope.amountCents) || scope.amountCents<1 || scope.amountCents>100000000 || scope.mode!=='test' || typeof auth?.sameOrigin!=='function' || typeof auth?.verify!=='function' || [readConsent,readVerifiedOneTimeReceipt,readEntitlement,now].some(f=>typeof f!=='function')) throw Error('SMARTCOPY_SANDBOX_CONFIG_INVALID');
  const s=Object.freeze({...scope});
  const context = u => Object.freeze({userId:u,productId:s.productId,campaignId:s.campaignId,releaseSha256:s.releaseSha256,mode:'test'});
  function validConsent(r,u,t) {
    return exact(r,consentKeys) && matches(r,u,s) && typeof r.receiptSha256==='string' && SHA.test(r.receiptSha256) && r.purpose==='PRODUCT_CONVERSION' && r.analytics===true && r.revokedAt===null && time(r.grantedAt) && time(r.expiresAt) && Date.parse(r.grantedAt)<=t && t<Date.parse(r.expiresAt) && Date.parse(r.expiresAt)-Date.parse(r.grantedAt)<=180*day;
  }
  function fresh(v,t) {return time(v)&&Date.parse(v)<=t&&t-Date.parse(v)<=3600000;}
  return async function read(req,res,sessionId) {
    // No caller-supplied purchase, consent or account object is accepted.
    if(typeof sessionId!=='string'||!SID.test(sessionId))return denied('SESSION_INVALID');
    try {
      if(await auth.sameOrigin(req)!==true)return denied('AUTH_REQUIRED');
      const user=await auth.verify(req,res);
      if(typeof user?.userId!=='string'||!UUID.test(user.userId)||user.emailVerified!==true)return denied('AUTH_REQUIRED');
      const u=user.userId, ctx=context(u), t=now();
      if(!Number.isSafeInteger(t)||t<=0)return denied('CLOCK_INVALID');
      const c=await readConsent(ctx), consentAt=now();
      if(!Number.isSafeInteger(consentAt)||consentAt<t||consentAt-t>30000||!validConsent(c,u,consentAt))return denied('CONSENT_REQUIRED');
      // Existing trusted read adapter, not a new checkout or Stripe client.
      const p=await readVerifiedOneTimeReceipt(ctx,sessionId), paymentAt=now();
      if(!Number.isSafeInteger(paymentAt)||paymentAt<consentAt||paymentAt-t>30000||!validConsent(c,u,paymentAt))return denied('CONSENT_CHANGED');
      if(!exact(p,paymentKeys)||!matches(p,u,s)||p.sessionId!==sessionId||typeof p.intentId!=='string'||!PI.test(p.intentId)||typeof p.chargeId!=='string'||!CHARGE.test(p.chargeId)||p.sku!==s.sku||p.stripeProductId!==s.stripeProductId||p.stripePriceId!==s.stripePriceId||p.mode!=='payment'||p.livemode!==false||p.currency!=='eur'||p.status!=='paid'||p.paidCents!==s.amountCents||!Number.isSafeInteger(p.refundedCents)||p.refundedCents<0||p.refundedCents>p.paidCents||typeof p.disputed!=='boolean'||!time(p.paidAt)||!fresh(p.observedAt,paymentAt)||Date.parse(p.paidAt)>Date.parse(p.observedAt)||Date.parse(p.paidAt)<Date.parse(c.grantedAt)||Date.parse(p.paidAt)>=Date.parse(c.expiresAt))return denied('RECEIPT_INVALID');
      const l=await readEntitlement(ctx,p.intentId), licenseAt=now();
      if(!Number.isSafeInteger(licenseAt)||licenseAt<paymentAt||licenseAt-t>30000||!validConsent(c,u,licenseAt))return denied('CONSENT_CHANGED');
      if(!exact(l,licenseKeys)||!matches(l,u,s)||l.intentId!==p.intentId||!fresh(l.observedAt,licenseAt)||Date.parse(l.observedAt)<Date.parse(p.paidAt)||!['GRANTED','REVOKED'].includes(l.state))return denied('LICENSE_NOT_PROVEN');
      if((p.refundedCents===p.paidCents||p.disputed)&&l.state!=='REVOKED')return denied('REVERSAL_NOT_PROVEN');
      const current=await readConsent(ctx), after=now();
      if(!Number.isSafeInteger(after)||after<licenseAt||after-t>30000||!fresh(p.observedAt,after)||!fresh(l.observedAt,after)||!validConsent(current,u,after)||current.receiptSha256!==c.receiptSha256||current.grantedAt!==c.grantedAt||current.expiresAt!==c.expiresAt)return denied('CONSENT_CHANGED');
      // A sandbox row is NOT a live candidate for #968 and is never fed to its
      // live-only reconciliation. No identifiers, amounts, or provider claims leave this helper.
      return Object.freeze({...denied('SANDBOX_ONLY'),status:'SANDBOX_CANDIDATE',licenseCandidate:l.state,refundCandidate:p.disputed?'DISPUTED':p.refundedCents===p.paidCents?'FULL':p.refundedCents>0?'PARTIAL':'NONE'});
    } catch {return denied('SOURCE_UNAVAILABLE');}
  };
}

// Explicit test key only; read-only Stripe transport, no provider writes.
// The exact product/price/campaign/release tuple is supplied by trusted server composition.
export function createSmartcopyStripeReader({scope,key,fetchImpl=fetch,now=Date.now,reconcileRefunds=false}={}){
  if(typeof reconcileRefunds!=='boolean')throw Error('SMARTCOPY_STRIPE_TEST_CONFIG');
  if(!exact(scope,scopeKeys)||scope.productId!=='ai-smartcopy'||scope.sku!=='AI_SMARTCOPY_PERSONAL'||scope.mode!=='test'||typeof scope.campaignId!=='string'||!/^smartcopy-[a-f0-9]{24}$/.test(scope.campaignId)||typeof scope.releaseSha256!=='string'||!SHA.test(scope.releaseSha256)||typeof scope.stripeProductId!=='string'||!PRODUCT.test(scope.stripeProductId)||typeof scope.stripePriceId!=='string'||!PRICE.test(scope.stripePriceId)||!Number.isSafeInteger(scope.amountCents)||scope.amountCents<1||scope.amountCents>100000000||typeof key!=='string'||!/^rk_test_[A-Za-z0-9_]{10,}$/.test(key))throw Error('SMARTCOPY_STRIPE_TEST_CONFIG');
  const s=Object.freeze({...scope}),n=s.amountCents;
  const fail=()=>{throw Error('SMARTCOPY_STRIPE_RECEIPT_DENIED');};
  const oid=v=>typeof v==='string'?v:v?.id;
  const same=(o,id,type)=>o?.id===id&&o.object===type&&o.livemode===false;
  const meta=(o,ctx)=>o?.metadata?.sku===s.sku&&o.metadata.user_id===ctx.userId&&o.metadata.campaign_id===s.campaignId&&o.metadata.release_sha256===s.releaseSha256;
  async function get(path){
    const res=await fetchImpl('https://api.stripe.com/v1'+path,{method:'GET',headers:{Authorization:'Bearer '+key,'Stripe-Version':'2026-09-30.endive'},redirect:'error',signal:AbortSignal.timeout(5000)});
    return boundedJson(res,131072);
  }
  return async function read(ctx,sessionId){
    if(!ctx||!matches(ctx,ctx.userId,s)||typeof ctx.userId!=='string'||!UUID.test(ctx.userId)||ctx.mode!=='test'||typeof sessionId!=='string'||!SID.test(sessionId))fail();
    const start=now();
    const session=await get('/checkout/sessions/'+sessionId);
    if(!same(session,sessionId,'checkout.session')||session.mode!=='payment'||session.status!=='complete'||session.payment_status!=='paid'||session.client_reference_id!==ctx.userId||!meta(session,ctx)||session.currency!=='eur'||session.amount_total!==n||session.amount_subtotal!==n||session.total_details?.amount_discount!==0||typeof session.payment_intent!=='string'||!PI.test(session.payment_intent)||!/^in_[A-Za-z0-9_]{8,240}$/.test(oid(session.invoice)||'')||!/^cus_[A-Za-z0-9_]{8,240}$/.test(oid(session.customer)||''))fail();
    const iid=oid(session.invoice),pid=session.payment_intent,cid=oid(session.customer);
    const [lines,price,product,intent,invoice,payments]=await Promise.all([
      get('/checkout/sessions/'+sessionId+'/line_items?limit=2'),get('/prices/'+s.stripePriceId),get('/products/'+s.stripeProductId),
      get('/payment_intents/'+pid),get('/invoices/'+iid),get('/invoice_payments?invoice='+iid+'&limit=2')]);
    const line=lines.data?.[0],ip=payments.data?.[0];
    if(lines.object!=='list'||lines.has_more!==false||lines.data?.length!==1||line.quantity!==1||line.amount_subtotal!==n||line.amount_total!==n||line.currency!=='eur'||line.price?.id!==s.stripePriceId||
       !same(price,s.stripePriceId,'price')||price.active!==true||price.type!=='one_time'||price.recurring!==null||price.currency!=='eur'||price.unit_amount!==n||oid(price.product)!==s.stripeProductId||
       !same(product,s.stripeProductId,'product')||product.active!==true||product.metadata?.sku!==s.sku||
       !same(intent,pid,'payment_intent')||!meta(intent,ctx)||intent.status!=='succeeded'||intent.currency!=='eur'||intent.amount!==n||intent.amount_received!==n||oid(intent.customer)!==cid||typeof intent.latest_charge!=='string'||!CHARGE.test(intent.latest_charge)||
       !same(invoice,iid,'invoice')||!meta(invoice,ctx)||oid(invoice.customer)!==cid||invoice.status!=='paid'||invoice.currency!=='eur'||invoice.total!==n||invoice.amount_paid!==n||invoice.amount_remaining!==0||
       payments.object!=='list'||payments.has_more!==false||payments.data?.length!==1||ip?.object!=='invoice_payment'||ip.livemode!==false||oid(ip.invoice)!==iid||ip.status!=='paid'||ip.currency!=='eur'||ip.amount_paid!==n||ip.amount_requested!==n||ip.payment?.type!=='payment_intent'||oid(ip.payment.payment_intent)!==pid)fail();
    const paid=ip.status_transitions?.paid_at;
    if(!Number.isSafeInteger(paid)||paid<=0||paid!==invoice.status_transitions?.paid_at)fail();
    const charge=await get('/charges/'+intent.latest_charge);
    if(reconcileRefunds){
      // Fixed bounded list, independently re-read charge to reject an inconsistent snapshot.
      // Pending/unknown refund status or incomplete pagination does not authorize a grant.
      const refunds=await get('/refunds?charge='+intent.latest_charge+'&limit=100');
      if(refunds.object!=='list'||refunds.has_more!==false||!Array.isArray(refunds.data)||refunds.data.length>100)fail();
      const seen=new Set();let sum=0;
      for(const row of refunds.data){
        if(row?.object!=='refund'||typeof row.id!=='string'||!/^re_[A-Za-z0-9_]{8,240}$/.test(row.id)||seen.has(row.id)||oid(row.charge)!==intent.latest_charge||oid(row.payment_intent)!==pid||row.currency!=='eur'||row.livemode===true||!Number.isSafeInteger(row.amount)||row.amount<1||row.amount>n||!['succeeded','failed','canceled'].includes(row.status))fail();
        seen.add(row.id);if(row.status==='succeeded')sum+=row.amount;
      }
      if(sum>n||sum!==charge.amount_refunded)fail();
      const confirmed=await get('/charges/'+intent.latest_charge);
      for(const k of ['id','object','livemode','payment_intent','customer','status','currency','paid','captured','amount','amount_captured','amount_refunded','refunded','disputed']){
        if((k==='payment_intent'||k==='customer'?oid(confirmed?.[k]):confirmed?.[k])!==(k==='payment_intent'||k==='customer'?oid(charge[k]):charge[k]))fail();
      }
    }
    const observed=now();
    if(!same(charge,intent.latest_charge,'charge')||oid(charge.payment_intent)!==pid||oid(charge.customer)!==cid||charge.status!=='succeeded'||charge.currency!=='eur'||charge.paid!==true||charge.captured!==true||charge.amount!==n||charge.amount_captured!==n||!Number.isSafeInteger(charge.amount_refunded)||charge.amount_refunded<0||charge.amount_refunded>n||charge.refunded!==(charge.amount_refunded===n)||typeof charge.disputed!=='boolean'||!Number.isSafeInteger(start)||!Number.isSafeInteger(observed)||observed<start||observed-start>25000||paid*1000>observed)fail();
    return {userId:ctx.userId,productId:s.productId,campaignId:s.campaignId,releaseSha256:s.releaseSha256,sessionId,intentId:pid,chargeId:charge.id,sku:s.sku,stripeProductId:s.stripeProductId,stripePriceId:s.stripePriceId,mode:'payment',livemode:false,currency:'eur',status:'paid',paidAt:new Date(paid*1000).toISOString(),observedAt:new Date(observed).toISOString(),paidCents:n,refundedCents:charge.amount_refunded,disputed:charge.disputed};
  };
}
// Dedicated non-production Data API only. No implicit env fallback. The fixed
// RPC is read-only and service-role-only; its SQL contract is isolated in CI.
export function createSmartcopyConsentReader({projectRef,secret,fetchImpl=fetch}={}){
  if(typeof projectRef!=='string'||!/^[a-z]{20}$/.test(projectRef)||['ryzywoktpmyhwzxmstyu','wcvorlvhwvuprqsjcten'].includes(projectRef)||typeof secret!=='string'||!/^sb_secret_[A-Za-z0-9_-]{20,}$/.test(secret))throw Error('SMARTCOPY_CONSENT_TEST_CONFIG');
  return async ctx=>{
    if(ctx?.productId!=='ai-smartcopy'||ctx.mode!=='test'||typeof ctx.userId!=='string'||!UUID.test(ctx.userId)||typeof ctx.campaignId!=='string'||!/^smartcopy-[a-f0-9]{24}$/.test(ctx.campaignId)||typeof ctx.releaseSha256!=='string'||!SHA.test(ctx.releaseSha256))throw Error('SMARTCOPY_CONSENT_SCOPE');
    const response=await fetchImpl('https://'+projectRef+'.supabase.co/rest/v1/rpc/capital_smartcopy_read_consent',{method:'POST',headers:{apikey:secret,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({p_user:ctx.userId,p_campaign:ctx.campaignId,p_release:ctx.releaseSha256}),redirect:'error',signal:AbortSignal.timeout(5000)});
    const row=await boundedJson(response,8192);
    if(row===null)return null;
    if(!exact(row,consentKeys)||!matches(row,ctx.userId,ctx))throw Error('SMARTCOPY_CONSENT_RESPONSE');
    return row;
  };
}

// Independently persisted license state, never inferred from the payment or consent.
// No write method, no generic RPC selection, no environment fallback.
export function createSmartcopyEntitlementReader({projectRef,secret,fetchImpl=fetch}={}){
  if(typeof projectRef!=='string'||!/^[a-z]{20}$/.test(projectRef)||['ryzywoktpmyhwzxmstyu','wcvorlvhwvuprqsjcten'].includes(projectRef)||typeof secret!=='string'||!/^sb_secret_[A-Za-z0-9_-]{20,}$/.test(secret))throw Error('SMARTCOPY_ENTITLEMENT_TEST_CONFIG');
  return async (ctx,intentId)=>{
    if(ctx?.productId!=='ai-smartcopy'||ctx.mode!=='test'||typeof ctx.userId!=='string'||!UUID.test(ctx.userId)||typeof ctx.campaignId!=='string'||!/^smartcopy-[a-f0-9]{24}$/.test(ctx.campaignId)||typeof ctx.releaseSha256!=='string'||!SHA.test(ctx.releaseSha256)||typeof intentId!=='string'||!PI.test(intentId))throw Error('SMARTCOPY_ENTITLEMENT_SCOPE');
    const response=await fetchImpl('https://'+projectRef+'.supabase.co/rest/v1/rpc/capital_smartcopy_read_entitlement',{method:'POST',headers:{apikey:secret,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({p_user:ctx.userId,p_campaign:ctx.campaignId,p_release:ctx.releaseSha256,p_intent:intentId}),redirect:'error',signal:AbortSignal.timeout(5000)});
    const row=await boundedJson(response,8192);
    if(row===null)return null;
    if(!exact(row,licenseKeys)||!matches(row,ctx.userId,ctx)||row.intentId!==intentId||!['GRANTED','REVOKED'].includes(row.state)||!time(row.observedAt))throw Error('SMARTCOPY_ENTITLEMENT_RESPONSE');
    return row;
  };
}

// Fixed read-only contractual proof RPC on dedicated nonproduction Data API.
export function createSmartcopyDeliveryReader({projectRef,secret,fetchImpl=fetch}={}){
  if(typeof projectRef!=='string'||!/^[a-z]{20}$/.test(projectRef)||['ryzywoktpmyhwzxmstyu','wcvorlvhwvuprqsjcten'].includes(projectRef)||typeof secret!=='string'||!/^sb_secret_[A-Za-z0-9_-]{20,}$/.test(secret))throw Error('SMARTCOPY_DELIVERY_TEST_CONFIG');
  return async(ctx,intentId)=>{
    if(ctx?.productId!=='ai-smartcopy'||ctx.mode!=='test'||typeof ctx.userId!=='string'||!UUID.test(ctx.userId)||typeof ctx.campaignId!=='string'||!/^smartcopy-[a-f0-9]{24}$/.test(ctx.campaignId)||typeof ctx.releaseSha256!=='string'||!SHA.test(ctx.releaseSha256)||typeof intentId!=='string'||!PI.test(intentId))throw Error('SMARTCOPY_DELIVERY_SCOPE');
    const response=await fetchImpl('https://'+projectRef+'.supabase.co/rest/v1/rpc/capital_smartcopy_read_delivery',{method:'POST',headers:{apikey:secret,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({p_user:ctx.userId,p_campaign:ctx.campaignId,p_release:ctx.releaseSha256,p_intent:intentId}),redirect:'error',signal:AbortSignal.timeout(5000)});
    const row=await boundedJson(response,8192);
    if(row===null)return null;
    if(!validDeliveryProof(row,ctx,intentId))throw Error('SMARTCOPY_DELIVERY_RESPONSE');
    return row;
  };
}
function validDeliveryProof(p,ctx,intentId){
  return exact(p,['userId','productId','campaignId','releaseSha256','intentId','receiptSha256','termsSha256','acceptedAt','purpose'])&&matches(p,ctx.userId,ctx)&&p.intentId===intentId&&p.purpose==='CONTRACT_DELIVERY'&&typeof p.receiptSha256==='string'&&SHA.test(p.receiptSha256)&&typeof p.termsSha256==='string'&&SHA.test(p.termsSha256)&&time(p.acceptedAt);
}

// Explicit disposable-test orchestration only. Separate from optional analytics
// consent and the read-only public purchase receipt. No production factory
// caller, HTTP route or remote write transport. The caller must bind the private
// fixture writer and independently verified contractual delivery evidence.
// Never pass this output to the live conversion contract.
export function createSmartcopySandboxLifecycle({scope,key,auth,readDeliveryProof,recordFixture,fetchImpl=fetch,now=Date.now,mode}={}){
  if(mode!=='DISPOSABLE_CI_ONLY'||typeof auth?.sameOrigin!=='function'||typeof auth?.verify!=='function'||typeof readDeliveryProof!=='function'||typeof recordFixture!=='function')throw Error('SMARTCOPY_LIFECYCLE_TEST_CONFIG');
  const read=createSmartcopyStripeReader({scope,key,fetchImpl,now,reconcileRefunds:true}),s=Object.freeze({...scope});
  const no=reason=>Object.freeze({...denied(reason),fixtureOnly:true});
  return async(req,res,sessionId)=>{
    if(typeof sessionId!=='string'||!SID.test(sessionId))return no('SESSION_INVALID');
    try{
      if(await auth.sameOrigin(req)!==true)return no('AUTH_REQUIRED');
      const user=await auth.verify(req,res);
      if(typeof user?.userId!=='string'||!UUID.test(user.userId)||user.emailVerified!==true)return no('AUTH_REQUIRED');
      const ctx=Object.freeze({userId:user.userId,productId:s.productId,campaignId:s.campaignId,releaseSha256:s.releaseSha256,mode:'test'});
      const p=await read(ctx,sessionId);
      const terminal=p.disputed||p.refundedCents===p.paidCents;
      let delivery=null;
      if(!terminal){
        const proof=await readDeliveryProof(ctx,p.intentId);
        if(!validDeliveryProof(proof,ctx,p.intentId)||Date.parse(proof.acceptedAt)>Date.parse(p.paidAt))return no('DELIVERY_NOT_PROVEN');
        delivery=proof.receiptSha256;
      }
      const observed=Date.parse(p.observedAt),end=now();
      if(!Number.isSafeInteger(end)||end<observed||end-observed>5000)return no('SOURCE_STALE');
      const state=await recordFixture(Object.freeze({p_user:ctx.userId,p_campaign:s.campaignId,p_release:s.releaseSha256,p_intent:p.intentId,p_charge:p.chargeId,p_paid:p.paidCents,p_refunded:p.refundedCents,p_disputed:p.disputed,p_paid_at:p.paidAt,p_observed:p.observedAt,p_delivery:delivery}));
      if(!['GRANTED','REVOKED'].includes(state)||(terminal&&state!=='REVOKED'))return no('FIXTURE_STATE_DENIED');
      return Object.freeze({...no('ISOLATED_FIXTURE_ONLY'),status:'SANDBOX_LIFECYCLE_CANDIDATE',licenseCandidate:state});
    }catch{return no('SOURCE_UNAVAILABLE');}
  };
}
