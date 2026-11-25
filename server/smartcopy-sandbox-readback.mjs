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
