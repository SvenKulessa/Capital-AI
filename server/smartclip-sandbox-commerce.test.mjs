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
const invoiceId = 'in_smartclip_fixture_0001';
const customerId = 'cus_smartclip_fixture_0001';
const env = {
  SMARTCLIP_SANDBOX_ENABLED: 'true',
  STRIPE_SMARTCLIP_TEST_KEY: 'rk_test_fixture_safe_0001',
  STRIPE_SMARTCLIP_TEST_WEBHOOK_SECRET: 'whsec_sandbox_fixture_long_enough',
  STRIPE_SMARTCLIP_TEST_PRICE_ID: priceId,
  STRIPE_SMARTCLIP_TEST_PRODUCT_ID: productId,
  SMARTCLIP_SANDBOX_RELEASE_SHA256: SMARTCLIP_PINNED_SHA256,
  SMARTCLIP_SANDBOX_TAX_CODE: 'txcd_10202001',
  SMARTCLIP_SANDBOX_TAX_ATTESTED: 'true',
  SUPABASE_URL: 'https://primary-fixture.supabase.co',
  SMARTCLIP_SANDBOX_DB_URL: 'https://isolated-fixture.supabase.co',
  SMARTCLIP_SANDBOX_DB_SERVICE_KEY: 'sb_secret_fixture_not_a_real_key_123456789',
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
    payment_intent:pid, client_reference_id:userId, invoice:invoiceId, customer:customerId,
    automatic_tax:{enabled:true,status:'complete'}, invoice_creation:{enabled:true},
    metadata:{...metadata}, ...(opt.session||{}) };
  const intent = { id:pid, status:'succeeded', livemode:false, currency:'eur',
    amount_received:249, latest_charge:chargeId, metadata:{...metadata}, ...(opt.intent||{}) };
  const charge = { id:chargeId, payment_intent:pid, livemode:false, paid:true,
    status:'succeeded', currency:'eur', refunded:false, disputed:false,
    amount_refunded:0, amount:249, ...(opt.charge||{}) };
  const invoice = { id:invoiceId, livemode:false, status:'paid', paid:true,
    paid_out_of_band:false, currency:'eur', total:249, amount_paid:249, amount_remaining:0,
    customer:customerId, metadata:{sku:SMARTCLIP_SKU,
      release_sha256:SMARTCLIP_PINNED_SHA256,license_version:'draft-v3'}, ...(opt.invoice||{}) };
  const price = { id:priceId, livemode:false, active:true, product:productId, currency:'eur',
    unit_amount:249, type:'one_time', tax_behavior:'inclusive', recurring:null, ...(opt.price||{}) };
  const product = { id:productId, livemode:false, active:true, default_price:priceId,
    tax_code:env.SMARTCLIP_SANDBOX_TAX_CODE, metadata:{ sku:SMARTCLIP_SKU,
    release_sha256:SMARTCLIP_PINNED_SHA256,license_version:'draft-v3' }, ...(opt.product||{}) };
  const lines = { has_more:false, data:[{quantity:1,amount_subtotal:249,
    price:{...price,...(opt.linePrice||{})}}], ...(opt.lines||{}) };
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
    if (url.endsWith('/tax/settings')) return reply({status:'active',livemode:false,...(opt.taxSettings||{})});
    if (url.includes('/tax/registrations?')) return reply(opt.registrations || {has_more:false,
      data: opt.registered ? [{country:'DE',status:'active',livemode:false,
        country_options:{de:{type:'standard',standard:{place_of_supply_scheme:'standard'}}}}] : []});
    if (url.endsWith('/prices/' + priceId)) return reply(price);
    if (url.endsWith('/products/' + productId)) return reply(product);
    if (url.endsWith('/checkout/sessions') && init.method==='POST') {
      return reply({id:sid,mode:'payment',livemode:false,invoice_creation:{enabled:true},
        url:'https://checkout.stripe.com/c/pay/test_smartclip',...(opt.checkoutResponse||{})});
    }
    if (url.endsWith('/checkout/sessions/' + sid)) return reply(session);
    if (url.includes('/checkout/sessions/' + sid + '/line_items?')) return reply(lines);
    if (url.endsWith('/payment_intents/' + pid)) return reply(intent);
    if (url.endsWith('/charges/' + chargeId)) return reply(charge);
    if (url.endsWith('/invoices/' + invoiceId)) return reply(invoice);
    return reply({error:'unexpected_fixture_route'},500);
  }
  return {calls,ledger,session,intent,charge,invoice,fetchImpl};
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
  // The prior test fixture used a document/news tax category; it must not activate software checkout.
  assert.equal((await call('checkout','POST',body,{cfg:{...env,SMARTCLIP_SANDBOX_TAX_CODE:'txcd_10503000'}})).statusCode,503);
  // Only the owner-approved TEST classification is admitted; do not fall back.
  assert.equal((await call('checkout','POST',body,{cfg:{...env,SMARTCLIP_SANDBOX_TAX_CODE:'txcd_10202000'}})).statusCode,503);
  assert.equal((await call('checkout','POST',body,{cfg:{...env,SMARTCLIP_SANDBOX_TAX_CODE:'txcd_10203000'}})).statusCode,503);
  assert.equal((await call('checkout','POST',body,{cfg:{...env,SMARTCLIP_SANDBOX_TAX_ATTESTED:'false'}})).statusCode,503);
  assert.equal((await call('checkout','POST',body,{cfg:{...env,SMARTCLIP_SANDBOX_DB_URL:env.SUPABASE_URL}})).statusCode,503);
  assert.equal((await call('checkout','POST',body,{cfg:{...env,SMARTCLIP_SANDBOX_DB_SERVICE_KEY:''}})).statusCode,503);
  assert.equal((await call('checkout','POST',body,{cfg:{...env,SUPABASE_URL:undefined,VITE_SUPABASE_URL:undefined}})).statusCode,503);
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
test('live or mixed-mode tax, price and product readbacks cannot authorize sandbox checkout',async()=>{
  const invalid=[
    makeFixture({taxSettings:{livemode:true}}),
    makeFixture({registrations:{has_more:false,data:[{country:'DE',status:'active',livemode:true}]}}),
    makeFixture({registrations:{has_more:false,data:[
      {country:'DE',status:'active',livemode:false},{country:'DE',status:'active',livemode:true}]}}),
    makeFixture({registrations:{has_more:true,data:[{country:'DE',status:'active',livemode:false}]}}),
    makeFixture({registrations:{has_more:false,data:[{country:'DE',status:'active'}]}}),
    makeFixture({price:{livemode:true}}),
    makeFixture({product:{livemode:true}}),
    makeFixture({price:{id:'price_test_mismatched'}}),
    makeFixture({product:{id:'prod_test_mismatched'}})
  ];
  for (const fixture of invalid) {
    const result=await call('checkout','POST',body,{fixture});
    assert.equal(result.statusCode,503);
    assert.equal(fixture.calls.some(c=>c.url.endsWith('/checkout/sessions')&&c.method==='POST'),false);
  }
});
test('goods-only, unrelated EU and missing tax schemes cannot enable software checkout',async()=>{
  const schemes=[
    {de:{type:'standard',standard:{place_of_supply_scheme:'inbound_goods'}}},
    {de:{type:'standard',standard:{place_of_supply_scheme:'small_seller'}}},
    {de:{type:'oss_union'}},
    {de:{type:'standard'}},
    undefined
  ];
  for(const country_options of schemes) {
    const fixture=makeFixture({registrations:{has_more:false,data:[
      {country:'DE',status:'active',livemode:false,country_options}]}});
    const result=await call('checkout','POST',body,{fixture});
    assert.equal(result.statusCode,503);
    assert.equal(fixture.calls.some(c=>c.url.endsWith('/checkout/sessions') &&
      c.method==='POST'),false);
  }
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
  assert.equal(form.get('invoice_creation[enabled]'),'true');
  assert.equal(form.get('invoice_creation[invoice_data][metadata][sku]'),SMARTCLIP_SKU);
  assert.equal(form.get('invoice_creation[invoice_data][metadata][release_sha256]'),SMARTCLIP_PINNED_SHA256);
  assert.equal(form.get('client_reference_id'),userId);
  assert.equal(form.get('metadata[release_sha256]'),SMARTCLIP_PINNED_SHA256);
  assert.equal(form.has('payment_method_types'),false);
});
test('missing invoice creation is rejected before exposing a checkout URL or granting a license',async()=>{
  const invalid=makeFixture({checkoutResponse:{invoice_creation:{enabled:false}}});
  const created=await call('checkout','POST',body,{fixture:invalid});
  assert.equal(created.statusCode,503);
  assert.equal(created.payload.error,'checkout_not_ready');
  const paid=makeFixture({session:{invoice_creation:{enabled:false}}});
  const raw=event('checkout.session.completed',{id:sid});
  const r=await call('webhook','POST',raw,{fixture:paid,headers:{'stripe-signature':sign(raw)}});
  assert.equal(r.statusCode,200);
  assert.equal(r.payload.granted,false);
  assert.equal(paid.ledger.size,0);
});
test('paid Checkout requires independently paid invoice before any license grant',async()=>{
  const webhook=event('checkout.session.completed',{id:sid});
  const headers={'stripe-signature':sign(webhook)};
  const pending=makeFixture({session:{invoice:null}});
  const early=await call('webhook','POST',webhook,{fixture:pending,headers});
  assert.equal(early.statusCode,503);
  assert.equal(pending.ledger.size,0);
  pending.session.invoice=invoiceId;
  pending.invoice.status='open';
  pending.invoice.paid=false;
  const waiting=await call('webhook','POST',webhook,{fixture:pending,headers});
  assert.equal(waiting.statusCode,503);
  assert.equal(pending.ledger.size,0);
  pending.invoice.status='paid';
  pending.invoice.paid=true;
  const completed=await call('webhook','POST',webhook,{fixture:pending,headers});
  assert.equal(completed.statusCode,200);
  assert.equal(completed.payload.granted,true);
  assert.equal(pending.ledger.size,1);
  assert.equal(pending.calls.filter(c=>c.url.endsWith('/rest/v1/rpc/capital_ai_smartclip_sandbox') &&
    JSON.parse(c.body)._action==='grant').length,1);
});
test('foreign, unpaid, out-of-band or mismatched invoices never grant',async()=>{
  const fixtures=[
    makeFixture({session:{customer:null}}),
    makeFixture({session:{invoice:'in_foreign_paid_invoice_01'}}),
    makeFixture({invoice:{livemode:true}}),
    makeFixture({invoice:{customer:'cus_foreign_invoice_01'}}),
    makeFixture({invoice:{status:'void',paid:false}}),
    makeFixture({invoice:{paid_out_of_band:true}}),
    makeFixture({invoice:{total:200}}),
    makeFixture({invoice:{currency:'usd'}}),
    makeFixture({invoice:{amount_paid:0}}),
    makeFixture({invoice:{amount_remaining:1}}),
    makeFixture({invoice:{metadata:{sku:'OTHER',release_sha256:SMARTCLIP_PINNED_SHA256,license_version:'draft-v3'}}}),
    makeFixture({invoice:{metadata:{sku:SMARTCLIP_SKU,release_sha256:'0'.repeat(64),license_version:'draft-v3'}}}),
    makeFixture({invoice:{metadata:{sku:SMARTCLIP_SKU,release_sha256:SMARTCLIP_PINNED_SHA256,license_version:'unknown'}}})
  ];
  const webhook=event('checkout.session.completed',{id:sid});
  const headers={'stripe-signature':sign(webhook)};
  for (const fixture of fixtures) {
    const r=await call('webhook','POST',webhook,{fixture,headers});
    assert.equal([200,503].includes(r.statusCode),true);
    assert.equal(r.payload.granted===true,false);
    assert.equal(fixture.ledger.size,0);
    assert.equal(fixture.calls.some(c=>c.url.endsWith('/rest/v1/rpc/capital_ai_smartclip_sandbox') &&
      JSON.parse(c.body)._action==='grant'),false);
  }
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

test('parallel delivery of identical signed webhook remains idempotent at the fixture boundary',async()=>{
  const fixture=makeFixture();
  const raw=event('checkout.session.completed',{id:sid});
  const headers={'stripe-signature':sign(raw)};
  const results=await Promise.all(Array.from({length:24},()=>call('webhook','POST',raw,{fixture,headers})));
  assert.ok(results.every(x=>x.statusCode===200 && x.payload.granted===true));
  assert.equal(fixture.ledger.size,1);
  assert.equal((await call('access','GET',undefined,{fixture})).payload.entitled,true);
});

test('refund overtakes an in-flight grant and its tombstone prevents re-activation',async()=>{
  const fixture=makeFixture(), baseFetch=fixture.fetchImpl;
  let grantStarted, resumeGrant;
  const entered=new Promise(resolve=>{grantStarted=resolve;});
  const paused=new Promise(resolve=>{resumeGrant=resolve;});
  fixture.fetchImpl=async(endpoint,options={})=>{
    if(String(endpoint).includes('/rest/v1/rpc/capital_ai_smartclip_sandbox') &&
       options.body && JSON.parse(options.body)._action==='grant') {
      grantStarted();
      await paused;
    }
    return baseFetch(endpoint,options);
  };
  const success=event('checkout.session.completed',{id:sid});
  const inFlight=call('webhook','POST',success,{fixture,headers:{'stripe-signature':sign(success)}});
  await entered;
  // The provider refund arrives after grant verification but before RPC commit.
  fixture.charge.refunded=true;
  fixture.charge.amount_refunded=249;
  const refund=event('charge.refunded',{id:chargeId});
  const reversed=await call('webhook','POST',refund,{fixture,headers:{'stripe-signature':sign(refund)}});
  assert.equal(reversed.statusCode,200);
  assert.equal(reversed.payload.revoked,true);
  resumeGrant();
  const completed=await inFlight;
  assert.equal(completed.statusCode,200);
  assert.equal(completed.payload.granted,false);
  assert.equal(fixture.ledger.get(pid).status,'revoked');
  assert.equal((await call('access','GET',undefined,{fixture})).payload.entitled,false);
  // Simulates handler interleaving only. Real PostgreSQL multi-connection race requires separate evidence.
});

test('unpaid, foreign, version-mismatched and multi-item sessions never grant',async()=>{
  const fixtures=[
    makeFixture({session:{payment_status:'unpaid'}}),
    makeFixture({session:{metadata:{...metadata,channel:'foreign'}}}),
    // A free Acode Store install is not evidence of a paid CAPITAL-AI homepage license.
    makeFixture({session:{metadata:{...metadata,channel:'acode_free_plugin'}}}),
    makeFixture({intent:{metadata:{...metadata,channel:'acode_free_plugin'}}}),
    makeFixture({session:{client_reference_id:otherUserId}}),
    makeFixture({lines:{data:[{quantity:2,amount_subtotal:498,price:{id:priceId,product:productId}}],has_more:false}}),
    makeFixture({intent:{metadata:{...metadata,release_sha256:'0'.repeat(64)}}}),
    makeFixture({linePrice:{livemode:true}}),
    makeFixture({charge:{currency:'usd'}}),
    makeFixture({charge:{status:'failed'}}),
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
  const wrongCurrency=makeFixture({charge:{currency:'usd',refunded:true,amount_refunded:249}});
  const wrongAmount=makeFixture({charge:{amount:199,refunded:true,amount_refunded:199}});
  for (const fixture of [wrongCurrency,wrongAmount]) {
    assert.equal((await call('webhook','POST',refund,{fixture,headers:{'stripe-signature':sign(refund)}})).payload.revoked,false);
    assert.equal(fixture.ledger.size,0);
  }
});
test('provider failure causes retryable 503 rather than false success',async()=>{
  const f=makeFixture({failProvider:'/payment_intents/'});
  const raw=event('checkout.session.completed',{id:sid});
  const r=await call('webhook','POST',raw,{fixture:f,headers:{'stripe-signature':sign(raw)}});
  assert.equal(r.statusCode,503);assert.equal(f.ledger.size,0);
});
