import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { Readable } from 'node:stream';
import { createSmartclipSandboxCommerce, SMARTCLIP_PINNED_SHA256, SMARTCLIP_SKU } from './smartclip-sandbox-commerce.mjs';

const userId = '00000000-0000-4000-8000-000000000001';
const otherUserId = '00000000-0000-4000-8000-000000000002';
const priceId = 'price_test_Smartclip_01';
const productId = 'prod_test_Smartclip_01';
const sid = 'cs_test_smartclip_fixture_0001';
const pid = 'pi_smartclip_fixture_0001';
const chargeId = 'ch_smartclip_fixture_0001';
const env = {
  SMARTCLIP_SANDBOX_ENABLED: 'true',
  STRIPE_SMARTCLIP_TEST_KEY: 'rk_test_fixture_safe_0001',
  STRIPE_SMARTCLIP_TEST_WEBHOOK_SECRET: 'whsec_sandbox_fixture_long_enough',
  STRIPE_SMARTCLIP_TEST_PRICE_ID: priceId,
  STRIPE_SMARTCLIP_TEST_PRODUCT_ID: productId,
  SMARTCLIP_SANDBOX_RELEASE_SHA256: SMARTCLIP_PINNED_SHA256,
  SMARTCLIP_SANDBOX_TAX_CODE: 'txcd_10503000',
  SMARTCLIP_SANDBOX_TAX_ATTESTED: 'true',
  SUPABASE_URL: 'https://fixture.supabase.co',
  SUPABASE_SECRET_KEY: 'sb_secret_fixture_not_a_real_key_123456789',
  PUBLIC_BASE_URL: 'https://capital-ai.online',
};
const metadata = {
  channel: 'homepage_sandbox', sku: SMARTCLIP_SKU, user_id: userId,
  release_sha256: SMARTCLIP_PINNED_SHA256, release_id: 'acode-bridge-v2',
  license_version: 'draft-v3', license_accepted: 'true',
  immediate_delivery_consent: 'true', withdrawal_loss_acknowledged: 'true',
};
const body = {
  sku: SMARTCLIP_SKU, licenseAccepted: true, immediateDeliveryConsent: true,
  withdrawalLossAcknowledged: true, requestId: '00000000-0000-4000-8000-000000000003',
};
const reply = (value, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { 'content-type': 'application/json' },
});
function makeFixture(options = {}) {
  const calls = [], ledger = new Map();
  const opt = { registered: true, ...options };
  const session = { id:sid, mode:'payment', livemode:false, status:'complete',
    payment_status:'paid', currency:'eur', amount_subtotal:249, amount_total:249,
    payment_intent:pid, client_reference_id:userId,
    automatic_tax:{enabled:true,status:'complete'}, metadata:{...metadata}, ...(opt.session||{}) };
  const intent = { id:pid, status:'succeeded', livemode:false, currency:'eur',
    amount_received:249, latest_charge:chargeId, metadata:{...metadata}, ...(opt.intent||{}) };
  const charge = { id:chargeId, payment_intent:pid, livemode:false, paid:true,
    refunded:false, disputed:false, amount_refunded:0, amount:249, ...(opt.charge||{}) };
  const price = { id:priceId, active:true, product:productId, currency:'eur',
    unit_amount:249, type:'one_time', tax_behavior:'inclusive', recurring:null, ...(opt.price||{}) };
  const product = { id:productId, active:true, default_price:priceId,
    tax_code:env.SMARTCLIP_SANDBOX_TAX_CODE, metadata:{ sku:SMARTCLIP_SKU,
    release_sha256:SMARTCLIP_PINNED_SHA256,license_version:'draft-v3' }, ...(opt.product||{}) };
  const lines = { has_more:false, data:[{quantity:1,amount_subtotal:249,price}], ...(opt.lines||{}) };
  async function fetchImpl(endpoint, init = {}) {
    const url = String(endpoint);
    calls.push({ url, body:init.body, headers:init.headers, method:init.method || 'GET' });
    if (opt.failProvider && url.includes(opt.failProvider)) return reply({error:'bad'}, 503);
    if (url.includes('/rest/v1/rpc/capital_ai_smartclip_sandbox')) {
      const data = JSON.parse(init.body);
      if (data._action === 'grant') {
        const existing = ledger.get(data._payment_intent_id);
        if (!existing) ledger.set(data._payment_intent_id, { userId:data._user_id, sid:data._session_id, status:'paid' });
        else if (existing.status==='paid' && (existing.sid !== data._session_id || existing.userId !== data._user_id)) return reply({error:'identity_conflict'},409);
        return reply({granted:ledger.get(data._payment_intent_id).status==='paid'});
      }
      if (data._action === 'revoke') {
        ledger.set(data._payment_intent_id, {status:'revoked'});
        return reply({revoked:true});
      }
      if (data._action === 'access') return reply({entitled: [...ledger.values()].some(x=>x.userId===data._user_id && x.status==='paid')});
      return reply({},400);
    }
    if (url.endsWith('/tax/settings')) return reply({status:'active'});
    if (url.includes('/tax/registrations?')) return reply({has_more:false,data: opt.registered ? [{country:'DE',status:'active'}] : []});
    if (url.endsWith('/prices/' + priceId)) return reply(price);
    if (url.endsWith('/products/' + productId)) return reply(product);
    if (url.endsWith('/checkout/sessions') && init.method==='POST') {
      return reply({id:sid,mode:'payment',livemode:false,url:'https://checkout.stripe.com/c/pay/test_smartclip'});
    }
    if (url.endsWith('/checkout/sessions/' + sid)) return reply(session);
    if (url.includes('/checkout/sessions/' + sid + '/line_items?')) return reply(lines);
    if (url.endsWith('/payment_intents/' + pid)) return reply(intent);
    if (url.endsWith('/charges/' + chargeId)) return reply(charge);
    return reply({error:'unexpected_fixture_route'},500);
  }
  return {calls,ledger,session,intent,charge,fetchImpl};
}
function request(method, data, headers = {}) {
  const raw = data === undefined ? [] : [Buffer.from(typeof data==='string' ? data : JSON.stringify(data))];
  return Object.assign(Readable.from(raw), {method, headers:{'content-type':'application/json',...headers}});
}
function res() {
  return {statusCode:0, payload:null, headers:{}, setHeader(k,v){this.headers[k]=v;}};
}
function json(r,status,payload) {r.statusCode=status;r.payload=payload;}
async function call(path, method='GET', data, {cfg=env,fixture=makeFixture(),user=userId,origin=true,headers={}}={}) {
  const auth = {sameOrigin:()=>origin, verify:async()=>user ? {userId:user,email:'test@example.org',emailVerified:true} : null};
  const service = createSmartclipSandboxCommerce({env:cfg,auth,fetchImpl:fixture.fetchImpl});
  const output = res();
  const handled = await service.handle(request(method,data,headers), output,
    new URL('https://capital-ai.online/api/billing/smartclip-sandbox/'+path), json);
  assert.equal(handled,true);
  return output;
}
function event(type,object) {
  return JSON.stringify({id:'evt_fixture_12345678',livemode:false,type,data:{object}});
}
function sign(payload, stamp=Math.floor(Date.now()/1000)) {
  return 't='+stamp+',v1='+createHmac('sha256',env.STRIPE_SMARTCLIP_TEST_WEBHOOK_SECRET)
    .update(stamp+'.').update(Buffer.from(payload)).digest('hex');
}
test('default disabled, live keys and unknown digests fail closed', async()=>{
  assert.equal((await call('checkout','POST',body,{cfg:{...env,SMARTCLIP_SANDBOX_ENABLED:'false'}})).statusCode,503);
  assert.equal((await call('checkout','POST',body,{cfg:{...env,STRIPE_SMARTCLIP_TEST_KEY:'rk_live_invalid'}})).statusCode,503);
  assert.equal((await call('checkout','POST',body,{cfg:{...env,SMARTCLIP_SANDBOX_RELEASE_SHA256:'0'.repeat(64)}})).statusCode,503);
  assert.equal((await call('checkout','POST',body,{cfg:{...env,SMARTCLIP_SANDBOX_TAX_CODE:'txcd_10000000'}})).statusCode,503);
});
test('checkout denies missing authentication, origin, acknowledgments, and arbitrary extras', async()=>{
  assert.equal((await call('checkout','POST',body,{user:null})).statusCode,401);
  assert.equal((await call('checkout','POST',body,{origin:false})).statusCode,403);
  assert.equal((await call('checkout','POST',{...body, licenseAccepted:false})).statusCode,400);
  assert.equal((await call('checkout','POST',{...body, withdrawalLossAcknowledged:false})).statusCode,400);
  assert.equal((await call('checkout','POST',{...body, sku:'SMARTCLIP_PERSONAL\u202e'})).statusCode,400);
  assert.equal((await call('checkout','POST',{...body, amountCents:1})).statusCode,400);
});
test('missing registration prevents even a sandbox checkout request', async()=>{
  const f=makeFixture({registered:false});
  const r=await call('checkout','POST',body,{fixture:f});
  assert.equal(r.statusCode,503);
  assert.equal(f.calls.some(x=>x.url.endsWith('/checkout/sessions') && x.method==='POST'),false);
});
test('invalid price, product, license metadata and extra line items do not grant sales', async()=>{
  for(const fixture of [
    makeFixture({price:{unit_amount:1}}),
    makeFixture({product:{metadata:{sku:'foreign'}}}),
    makeFixture({price:{tax_behavior:'exclusive'}})
  ]) assert.equal((await call('checkout','POST',body,{fixture})).statusCode,503);
});
test('checkout pins product and identity; idempotent retry has identical body and key',async()=>{
  const f=makeFixture();
  const first=await call('checkout','POST',body,{fixture:f});
  const second=await call('checkout','POST',body,{fixture:f});
  assert.equal(first.statusCode,200);assert.equal(first.payload.testOnly,true);
  assert.equal(first.payload.checkoutUrl.startsWith('https://checkout.stripe.com/'),true);
  assert.equal(second.statusCode,200);
  const creates=f.calls.filter(x=>x.url.endsWith('/checkout/sessions')&&x.method==='POST');
  assert.equal(creates.length,2);
  assert.equal(creates[0].body,creates[1].body);
  assert.equal(creates[0].headers['Idempotency-Key'],creates[1].headers['Idempotency-Key']);
  const form=new URLSearchParams(creates[0].body);
  assert.equal(form.get('line_items[0][price]'),priceId);
  assert.equal(form.get('automatic_tax[enabled]'),'true');
  assert.equal(form.get('client_reference_id'),userId);
  assert.equal(form.get('metadata[release_sha256]'),SMARTCLIP_PINNED_SHA256);
  assert.equal(form.has('payment_method_types'),false);
});
test('forged or expired webhook cannot reach provider or mutate ledger',async()=>{
  const f=makeFixture(),raw=event('checkout.session.completed',{id:sid});
  assert.equal((await call('webhook','POST',raw,{fixture:f,headers:{'stripe-signature':'t=0,v1='+'0'.repeat(64)}})).statusCode,400);
  assert.equal((await call('webhook','POST',raw,{fixture:f,headers:{'stripe-signature':sign(raw,1)}})).statusCode,400);
  assert.equal(f.calls.length,0);
  assert.equal(f.ledger.size,0);
});
test('valid payment webhook grants once and duplicate replay is idempotent',async()=>{
  const f=makeFixture(),raw=event('checkout.session.completed',{id:sid});
  const one=await call('webhook','POST',raw,{fixture:f,headers:{'stripe-signature':sign(raw)}});
  const two=await call('webhook','POST',raw,{fixture:f,headers:{'stripe-signature':sign(raw)}});
  assert.equal(one.statusCode,200);assert.equal(one.payload.granted,true);
  assert.equal(two.statusCode,200);assert.equal(f.ledger.size,1);
  assert.equal((await call('access','GET',undefined,{fixture:f})).payload.entitled,true);
  assert.equal((await call('access','GET',undefined,{fixture:f,user:otherUserId})).payload.entitled,false);
});
test('unpaid, foreign, version-mismatched and multi-item sessions never grant',async()=>{
  const fixtures=[
    makeFixture({session:{payment_status:'unpaid'}}),
    makeFixture({session:{metadata:{...metadata,channel:'foreign'}}}),
    makeFixture({session:{client_reference_id:otherUserId}}),
    makeFixture({lines:{data:[{quantity:2,amount_subtotal:498,price:{id:priceId,product:productId}}],has_more:false}}),
    makeFixture({intent:{metadata:{...metadata,release_sha256:'0'.repeat(64)}}}),
    makeFixture({charge:{refunded:true,amount_refunded:249}})
  ];
  const raw=event('checkout.session.completed',{id:sid});
  for(const fixture of fixtures) {
    const r=await call('webhook','POST',raw,{fixture,headers:{'stripe-signature':sign(raw)}});
    assert.equal(r.statusCode,200);assert.equal(r.payload.granted,false);
    assert.equal(fixture.ledger.size,0);
  }
});
test('fully refunded charge revokes and late paid event cannot resurrect license',async()=>{
  const f=makeFixture();
  const success=event('checkout.session.completed',{id:sid});
  assert.equal((await call('webhook','POST',success,{fixture:f,headers:{'stripe-signature':sign(success)}})).payload.granted,true);
  f.charge.refunded=true;f.charge.amount_refunded=249;
  const refund=event('charge.refunded',{id:chargeId});
  assert.equal((await call('webhook','POST',refund,{fixture:f,headers:{'stripe-signature':sign(refund)}})).payload.revoked,true);
  assert.equal((await call('access','GET',undefined,{fixture:f})).payload.entitled,false);
  const late=event('checkout.session.async_payment_succeeded',{id:sid});
  assert.equal((await call('webhook','POST',late,{fixture:f,headers:{'stripe-signature':sign(late)}})).payload.granted,false);
  assert.equal(f.ledger.get(pid).status,'revoked');
});
test('refund before success stores tombstone; partial and foreign refunds never revoke',async()=>{
  const f=makeFixture({charge:{refunded:true,amount_refunded:249}});
  const refund=event('charge.refunded',{id:chargeId});
  assert.equal((await call('webhook','POST',refund,{fixture:f,headers:{'stripe-signature':sign(refund)}})).payload.revoked,true);
  assert.equal(f.ledger.get(pid).status,'revoked');
  const partial=makeFixture({charge:{amount_refunded:40}});
  assert.equal((await call('webhook','POST',refund,{fixture:partial,headers:{'stripe-signature':sign(refund)}})).payload.revoked,false);
  assert.equal(partial.ledger.size,0);
  const foreign=makeFixture({intent:{metadata:{...metadata,channel:'foreign'}},charge:{refunded:true,amount_refunded:249}});
  assert.equal((await call('webhook','POST',refund,{fixture:foreign,headers:{'stripe-signature':sign(refund)}})).payload.revoked,false);
  assert.equal(foreign.ledger.size,0);
});
test('provider failure causes retryable 503 rather than false success',async()=>{
  const f=makeFixture({failProvider:'/payment_intents/'});
  const raw=event('checkout.session.completed',{id:sid});
  const r=await call('webhook','POST',raw,{fixture:f,headers:{'stripe-signature':sign(raw)}});
  assert.equal(r.statusCode,503);assert.equal(f.ledger.size,0);
});
