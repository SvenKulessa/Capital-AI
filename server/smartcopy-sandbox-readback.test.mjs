import test from 'node:test';
import assert from 'node:assert/strict';
import {createSmartcopySandboxReadback} from './smartcopy-sandbox-readback.mjs';
const user='de305d54-75b4-431b-adb2-eb6b9e546014', session='cs_test_fixture12345', intent='pi_fixture12345';
const t=Date.parse('2026-11-25T05:00:00.000Z');
const scope={productId:'ai-smartcopy',campaignId:'smartcopy-'+'a'.repeat(24),releaseSha256:'f6cccb4785278a3a87badb66db12a756157b3b8324982d9f9470815117784ba5',sku:'AI_SMARTCOPY_PERSONAL',stripeProductId:'prod_fixture1',stripePriceId:'price_fixture1',amountCents:499,mode:'test'};
function fixture(){
 const base={userId:user,productId:scope.productId,campaignId:scope.campaignId,releaseSha256:scope.releaseSha256};
 const c={...base,receiptSha256:'a'.repeat(64),purpose:'PRODUCT_CONVERSION',analytics:true,grantedAt:'2026-11-24T00:00:00.000Z',expiresAt:'2026-12-24T00:00:00.000Z',revokedAt:null};
 const p={...base,sessionId:session,intentId:intent,chargeId:'ch_fixture12345',sku:scope.sku,stripeProductId:scope.stripeProductId,stripePriceId:scope.stripePriceId,mode:'payment',livemode:false,currency:'eur',status:'paid',paidAt:'2026-11-24T01:00:00.000Z',observedAt:'2026-11-25T04:45:00.000Z',paidCents:499,refundedCents:0,disputed:false};
 const l={...base,intentId:intent,state:'GRANTED',observedAt:'2026-11-25T04:45:00.000Z'};
 const calls=[];
 const deps={scope:{...scope},auth:{sameOrigin:()=>true,verify:async()=>({userId:user,emailVerified:true})},now:()=>t,readConsent:async(ctx)=>{calls.push('consent');assert.equal(ctx.userId,user);return {...c}},readVerifiedOneTimeReceipt:async(ctx,sid)=>{calls.push('receipt');assert.equal(sid,session);assert.equal(ctx.mode,'test');return {...p}},readEntitlement:async(ctx,id)=>{calls.push('license');assert.equal(id,intent);return {...l}}};
 return {c,p,l,calls,deps,run:(sid=session)=>createSmartcopySandboxReadback(deps)({}, {}, sid)};
}
test('sandbox composition uses existing auth before consent, payment and license; no live metrics or ids',async()=>{const f=fixture(),r=await f.run();assert.equal(r.status,'SANDBOX_CANDIDATE');assert.deepEqual(f.calls,['consent','receipt','license','consent']);assert.equal(r.liveMetrics,null);assert.equal(r.providerAuthentication,'NOT_PROVEN');assert.equal(r.entitlementMutation,false);assert.doesNotMatch(JSON.stringify(r),/de305d54|cs_test_|fixture12345|499/)});
test('live config and live session rejected without source read',async()=>{const f=fixture();assert.throws(()=>createSmartcopySandboxReadback({...f.deps,scope:{...scope,mode:'live'}}));assert.equal((await f.run('cs_live_fixture12345')).reason,'SESSION_INVALID');assert.deepEqual(f.calls,[])});
test('cross-origin and missing authenticated verified user denied before any read',async()=>{for(const auth of [{sameOrigin:()=>false,verify:async()=>{throw Error('unexpected')}},{sameOrigin:()=>true,verify:async()=>({userId:user,emailVerified:false})}]){const f=fixture();f.deps.auth=auth;assert.equal((await f.run()).reason,'AUTH_REQUIRED');assert.deepEqual(f.calls,[])}});
test('missing consent, expired, revoked and wrong purpose prevent payment read',async()=>{for(const patch of [{analytics:false},{expiresAt:'2026-11-25T04:00:00.000Z'},{revokedAt:'2026-11-25T04:00:00.000Z'},{purpose:'DELIVERY'},{releaseSha256:'b'.repeat(64)}]){const f=fixture();Object.assign(f.c,patch);assert.equal((await f.run()).reason,'CONSENT_REQUIRED');assert.deepEqual(f.calls,['consent'])}});
test('cross-user, cross-release, wrong SKU/price, live, subscription and stale receipt denied',async()=>{for(const patch of [{userId:'00000000-0000-4000-8000-000000000000'},{releaseSha256:'b'.repeat(64)},{sku:'SMARTCLIP_PERSONAL'},{stripePriceId:'price_foreign'},{livemode:true},{mode:'subscription'},{observedAt:'2026-11-24T01:00:00.000Z'},{clipboard:'secret'}]){const f=fixture();Object.assign(f.p,patch);assert.equal((await f.run()).reason,'RECEIPT_INVALID');assert.deepEqual(f.calls,['consent','receipt'])}});
test('full refund or dispute requires revoked entitlement, partial refund remains separate',async()=>{for(const patch of [{refundedCents:499},{disputed:true}]){const f=fixture();Object.assign(f.p,patch);assert.equal((await f.run()).reason,'REVERSAL_NOT_PROVEN');f.l.state='REVOKED';assert.equal((await f.run()).status,'SANDBOX_CANDIDATE')}const f=fixture();f.p.refundedCents=100;assert.equal((await f.run()).refundCandidate,'PARTIAL')});
test('foreign license and stale entitlement rejected',async()=>{for(const patch of [{intentId:'pi_other12345'},{observedAt:'2026-11-24T02:00:00.000Z'}]){const f=fixture();Object.assign(f.l,patch);assert.equal((await f.run()).reason,'LICENSE_NOT_PROVEN')}});
test('consent withdrawal during source read suppresses result',async()=>{const f=fixture();let n=0;f.deps.readConsent=async()=>({...f.c,revokedAt:++n===2?'2026-11-25T04:50:00.000Z':null});assert.equal((await f.run()).reason,'CONSENT_CHANGED')});
test('adapter error is redacted; no receipt, user or secret leaked',async()=>{const f=fixture();f.deps.readVerifiedOneTimeReceipt=async()=>{throw Error('private secret and '+user)};const r=await f.run();assert.equal(r.reason,'SOURCE_UNAVAILABLE');assert.doesNotMatch(JSON.stringify(r),/private secret|de305d54/)});

test('source timestamps observed during a bounded read are accepted, slow reads denied',async()=>{const f=fixture();let clock=t;f.deps.now=()=>clock;f.deps.readVerifiedOneTimeReceipt=async()=>({...f.p,observedAt:new Date(clock+=1000).toISOString()});f.deps.readEntitlement=async()=>({...f.l,observedAt:new Date(clock+=1000).toISOString()});assert.equal((await f.run()).status,'SANDBOX_CANDIDATE');const slow=fixture();clock=t;slow.deps.now=()=>clock;slow.deps.readVerifiedOneTimeReceipt=async()=>({...slow.p,observedAt:new Date(clock+=31000).toISOString()});assert.equal((await slow.run()).reason,'CONSENT_CHANGED')});

import {createSmartcopyStripeReader,createSmartcopyConsentReader} from './smartcopy-sandbox-readback.mjs';
function providerFixture(){
 const cid='cus_fixture12345',iid='in_fixture12345',chargeId='ch_fixture12345',paid=Math.floor(Date.parse('2026-11-24T01:00:00.000Z')/1000);
 const meta={sku:scope.sku,user_id:user,campaign_id:scope.campaignId,release_sha256:scope.releaseSha256};
 const object=(id,object,extra)=>({id,object,livemode:false,...extra});
 const data={
 ['/checkout/sessions/'+session]:object(session,'checkout.session',{mode:'payment',status:'complete',payment_status:'paid',client_reference_id:user,metadata:meta,currency:'eur',amount_total:499,amount_subtotal:499,total_details:{amount_discount:0},payment_intent:intent,invoice:iid,customer:cid}),
 ['/checkout/sessions/'+session+'/line_items?limit=2']:{object:'list',has_more:false,data:[{quantity:1,amount_subtotal:499,amount_total:499,currency:'eur',price:{id:scope.stripePriceId}}]},
 ['/prices/'+scope.stripePriceId]:object(scope.stripePriceId,'price',{active:true,type:'one_time',recurring:null,currency:'eur',unit_amount:499,product:scope.stripeProductId}),
 ['/products/'+scope.stripeProductId]:object(scope.stripeProductId,'product',{active:true,metadata:{sku:scope.sku}}),
 ['/payment_intents/'+intent]:object(intent,'payment_intent',{metadata:meta,status:'succeeded',currency:'eur',amount:499,amount_received:499,customer:cid,latest_charge:chargeId}),
 ['/invoices/'+iid]:object(iid,'invoice',{metadata:meta,customer:cid,status:'paid',currency:'eur',total:499,amount_paid:499,amount_remaining:0,status_transitions:{paid_at:paid}}),
 ['/invoice_payments?invoice='+iid+'&limit=2']:{object:'list',has_more:false,data:[object('inpay_fixture','invoice_payment',{invoice:iid,status:'paid',currency:'eur',amount_paid:499,amount_requested:499,payment:{type:'payment_intent',payment_intent:intent},status_transitions:{paid_at:paid}})]},
 ['/charges/'+chargeId]:object(chargeId,'charge',{payment_intent:intent,customer:cid,status:'succeeded',currency:'eur',paid:true,captured:true,amount:499,amount_captured:499,amount_refunded:0,refunded:false,disputed:false})};
 const calls=[],key='rk_test_fixture_1234567890';
 const deps={scope,key,now:()=>t,fetchImpl:async(url,opts)=>{assert.equal(opts.method,'GET');assert.equal(opts.redirect,'error');assert.equal(opts.headers.Authorization,'Bearer '+key);assert.ok(url.startsWith('https://api.stripe.com/v1'));const p=url.slice('https://api.stripe.com/v1'.length);calls.push(p);assert.ok(Object.hasOwn(data,p));return Response.json(data[p])}};
 return {data,calls,deps,ctx:{userId:user,productId:scope.productId,campaignId:scope.campaignId,releaseSha256:scope.releaseSha256,mode:'test'},run(){return createSmartcopyStripeReader(deps)(this.ctx,session)}};
}
test('Stripe GET adapter verifies exact invoice payment and captured charge; composes with existing sandbox readback',async()=>{
 const p=providerFixture(),f=fixture();f.deps.readVerifiedOneTimeReceipt=createSmartcopyStripeReader(p.deps);
 assert.equal((await f.run()).status,'SANDBOX_CANDIDATE');assert.equal(p.calls.length,8);
 const r=await p.run();assert.equal(r.paidCents,499);assert.equal(r.refundedCents,0);
});
test('Stripe reader denies external payment, extra allocation, cross identity, incomplete capture, subscriptions and live credentials',async()=>{
 const cases=[['/invoice_payments',v=>v.data[0].payment.type='payment_record'],['/invoice_payments',v=>v.has_more=true],['/invoice_payments',v=>v.data[0].payment.payment_intent='pi_foreign12345'],['/invoice_payments',v=>v.data[0].amount_paid=1],['/charges/',v=>v.amount_captured=1],['/prices/',v=>v.type='recurring'],['/products/',v=>v.metadata.sku='SMARTCLIP_PERSONAL'],['/checkout/sessions/',v=>v.metadata.campaign_id='other'],['/invoices/',v=>v.livemode=true]];
 for(const [prefix,mutate] of cases){const f=providerFixture();mutate(f.data[Object.keys(f.data).find(k=>k.startsWith(prefix))]);await assert.rejects(()=>f.run(),/SMARTCOPY_STRIPE_RECEIPT_DENIED/);}
 const f=providerFixture();assert.throws(()=>createSmartcopyStripeReader({...f.deps,key:'rk_live_fixture_1234567890'}));assert.deepEqual(f.calls,[]);
});
test('Stripe refund readback retains partial and full refund; existing entitlement reversal gate remains authoritative',async()=>{
 const p=providerFixture(),f=fixture(),ch=p.data['/charges/ch_fixture12345'];f.deps.readVerifiedOneTimeReceipt=createSmartcopyStripeReader(p.deps);
 ch.amount_refunded=100;assert.equal((await f.run()).refundCandidate,'PARTIAL');
 ch.amount_refunded=499;ch.refunded=true;assert.equal((await f.run()).reason,'REVERSAL_NOT_PROVEN');f.l.state='REVOKED';assert.equal((await f.run()).refundCandidate,'FULL');
});
test('consent Data API uses dedicated project, exact scoped RPC and no production or recovery target',async()=>{
 const f=fixture(),ctx={userId:user,productId:scope.productId,campaignId:scope.campaignId,releaseSha256:scope.releaseSha256,mode:'test'};
 const config={projectRef:'a'.repeat(20),secret:'sb_secret_fixture_12345678901234567890',fetchImpl:async(url,opts)=>{assert.equal(url,'https://'+'a'.repeat(20)+'.supabase.co/rest/v1/rpc/capital_smartcopy_read_consent');assert.equal(opts.method,'POST');assert.equal(opts.redirect,'error');assert.deepEqual(JSON.parse(opts.body),{p_user:user,p_campaign:scope.campaignId,p_release:scope.releaseSha256});return Response.json(f.c)}};
 const read=createSmartcopyConsentReader(config);assert.deepEqual(await read(ctx),f.c);
 f.c.releaseSha256='b'.repeat(64);await assert.rejects(()=>read(ctx));
 for(const projectRef of ['ryzywoktpmyhwzxmstyu','wcvorlvhwvuprqsjcten','evil.com'])assert.throws(()=>createSmartcopyConsentReader({...config,projectRef}));
});

test('provider reader rejects coercible identifiers before transport',async()=>{
 const f=providerFixture();assert.throws(()=>createSmartcopyStripeReader({...f.deps,scope:{...scope,stripePriceId:[scope.stripePriceId]}}));
 await assert.rejects(()=>createSmartcopyStripeReader(f.deps)(f.ctx,[session]));assert.deepEqual(f.calls,[]);
});

import {createSmartcopyEntitlementReader} from './smartcopy-sandbox-readback.mjs';
test('independent entitlement RPC scope and identity are exact; no live project or mutable endpoint',async()=>{
 const f=fixture(),p=providerFixture(),ctx=p.ctx;let calls=0;
 const config={projectRef:'a'.repeat(20),secret:'sb_secret_fixture_12345678901234567890',fetchImpl:async(url,opt)=>{calls++;assert.equal(url,'https://'+'a'.repeat(20)+'.supabase.co/rest/v1/rpc/capital_smartcopy_read_entitlement');assert.equal(opt.redirect,'error');assert.equal(opt.method,'POST');assert.equal(opt.headers.apikey,config.secret);assert.deepEqual(JSON.parse(opt.body),{p_user:user,p_campaign:scope.campaignId,p_release:scope.releaseSha256,p_intent:intent});return Response.json(f.l)}};
 const read=createSmartcopyEntitlementReader(config);
 assert.deepEqual(await read(ctx,intent),f.l);
 await assert.rejects(()=>read({...ctx,mode:'live'},intent));await assert.rejects(()=>read(ctx,[intent]));assert.equal(calls,1);
 for(const projectRef of ['ryzywoktpmyhwzxmstyu','wcvorlvhwvuprqsjcten','evil.com'])assert.throws(()=>createSmartcopyEntitlementReader({...config,projectRef}));
 for(const patch of [{productId:'smartclip'},{intentId:'pi_foreign12345'},{releaseSha256:'b'.repeat(64)},{state:'UNKNOWN'}]){
 const original={...f.l};Object.assign(f.l,patch);await assert.rejects(()=>read(ctx,intent));Object.assign(f.l,original);}
 f.deps.readEntitlement=read;f.deps.readVerifiedOneTimeReceipt=createSmartcopyStripeReader(p.deps);
 assert.equal((await f.run()).status,'SANDBOX_CANDIDATE');
 p.data['/charges/ch_fixture12345'].amount_refunded=499;p.data['/charges/ch_fixture12345'].refunded=true;
 assert.equal((await f.run()).reason,'REVERSAL_NOT_PROVEN');f.l.state='REVOKED';assert.equal((await f.run()).refundCandidate,'FULL');
});
test('independent entitlement errors, missing rows and oversize response fail closed',async()=>{
 const p=providerFixture(),cfg={projectRef:'a'.repeat(20),secret:'sb_secret_fixture_12345678901234567890'};
 assert.equal(await createSmartcopyEntitlementReader({...cfg,fetchImpl:async()=>Response.json(null)})(p.ctx,intent),null);
 for(const response of [()=>Response.json({}, {status:403}),()=>new Response(' '.repeat(8193))]){
 await assert.rejects(()=>createSmartcopyEntitlementReader({...cfg,fetchImpl:async()=>response()})(p.ctx,intent));}
});

import {createSmartcopySandboxLifecycle} from './smartcopy-sandbox-readback.mjs';
test('isolated lifecycle uses provider read, independent delivery and private fixture writer; no live metrics',async()=>{
 const f=providerFixture(),calls=[];
 const proof={...f.ctx,intentId:intent,receiptSha256:'7'.repeat(64),purpose:'CONTRACT_DELIVERY'};delete proof.mode;
 const opts={...f.deps,mode:'DISPOSABLE_CI_ONLY',auth:{sameOrigin:()=>true,verify:async()=>({userId:user,emailVerified:true})},
 readDeliveryProof:async()=>{calls.push('delivery');return proof},recordFixture:async v=>{calls.push('fixture');assert.equal(v.p_intent,intent);assert.equal(v.p_delivery,proof.receiptSha256);return 'GRANTED'}};
 const result=await createSmartcopySandboxLifecycle(opts)({}, {},session);
 assert.equal(result.licenseCandidate,'GRANTED');assert.equal(result.liveMetrics,null);assert.deepEqual(calls,['delivery','fixture']);assert.equal(f.calls.length,8);
 assert.throws(()=>createSmartcopySandboxLifecycle({...opts,mode:'live'}));
});
test('lifecycle refuses marketing consent, foreign identity, live session and unauthenticated request',async()=>{
 const f=providerFixture();let writes=0;
 const opts={...f.deps,mode:'DISPOSABLE_CI_ONLY',auth:{sameOrigin:()=>true,verify:async()=>({userId:user,emailVerified:true})},readDeliveryProof:async()=>null,recordFixture:async()=>{writes++;return 'GRANTED'}};
 assert.equal((await createSmartcopySandboxLifecycle(opts)({}, {},session)).reason,'DELIVERY_NOT_PROVEN');
 const bad={userId:user,productId:scope.productId,campaignId:scope.campaignId,releaseSha256:scope.releaseSha256,intentId:intent,receiptSha256:'7'.repeat(64),purpose:'PRODUCT_CONVERSION'};
 assert.equal((await createSmartcopySandboxLifecycle({...opts,readDeliveryProof:async()=>bad})({}, {},session)).reason,'DELIVERY_NOT_PROVEN');
 assert.equal((await createSmartcopySandboxLifecycle(opts)({}, {},'cs_live_fixture12345')).reason,'SESSION_INVALID');
 assert.equal((await createSmartcopySandboxLifecycle({...opts,auth:{sameOrigin:()=>false,verify:async()=>null}})({}, {},session)).reason,'AUTH_REQUIRED');assert.equal(writes,0);
});
test('terminal refund does not require marketing or delivery proof and rejects a non-revoked fixture result',async()=>{
 const f=providerFixture();const ch=f.data['/charges/ch_fixture12345'];ch.amount_refunded=499;ch.refunded=true;
 const opts={...f.deps,mode:'DISPOSABLE_CI_ONLY',auth:{sameOrigin:()=>true,verify:async()=>({userId:user,emailVerified:true})},readDeliveryProof:async()=>{throw Error('must not call')},recordFixture:async v=>{assert.equal(v.p_refunded,499);assert.equal(v.p_delivery,null);return 'REVOKED'}};
 assert.equal((await createSmartcopySandboxLifecycle(opts)({}, {},session)).licenseCandidate,'REVOKED');
 assert.equal((await createSmartcopySandboxLifecycle({...opts,recordFixture:async()=> 'GRANTED'})({}, {},session)).reason,'FIXTURE_STATE_DENIED');
});
