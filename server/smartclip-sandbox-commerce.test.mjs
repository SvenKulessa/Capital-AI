import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac, generateKeyPairSync, sign as signDevice, webcrypto } from 'node:crypto';
import { mkdtemp, writeFile, chmod, symlink, unlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSmartclipPairingClient } from './smartclip-client-pairing.mjs';
import { Readable } from 'node:stream';
import { createSmartclipSandboxCommerce, SMARTCLIP_PINNED_SHA256, SMARTCLIP_SKU, inspectSmartclipReleaseBytes, preflightSmartclipSandboxDelivery, prepareSmartclipPrivateDownload, readSmartclipPrivateArtifact, createSmartclipPrivateReleaseReader } from './smartclip-sandbox-commerce.mjs';

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
  const calls = [], ledger = new Map(), devices = new Map();
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
  const allocation = { id:'inpay_smartclip_fixture_0001', object:'invoice_payment',
    invoice:invoiceId, livemode:false, status:'paid', currency:'eur',
    amount_requested:249, amount_paid:249,
    payment:{type:'payment_intent',payment_intent:pid}, ...(opt.allocation||{}) };
  const payments = {object:'list',has_more:false,data:[allocation],...(opt.payments||{})};
  const invoice = { id:invoiceId, livemode:false, status:'paid',
    currency:'eur', total:249, amount_paid:249, amount_remaining:0,
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
    if (url.endsWith('/rest/v1/rpc/capital_ai_smartclip_sandbox_device')) {
      const d=JSON.parse(init.body);
      const paid=(id)=>ledger.get(id)?.status==='paid' && ledger.get(id)?.userId===d._user_id;
      const own=x=>x.user===d._user_id && x.fingerprint===d._fingerprint;
      if(d._action==='challenge'){
        const payment=[...ledger.keys()].find(paid);
        if(!payment||[...devices.values()].some(x=>own(x)&&x.payment===payment&&['active','revoked'].includes(x.state)))return reply({issued:false});
        devices.set(d._challenge,{user:d._user_id,fingerprint:d._fingerprint,payment,state:'pending'});
        return reply({issued:true});
      }
      if(d._action==='activate'){
        const x=devices.get(d._challenge);
        if(!x||!own(x)||!paid(x.payment)||x.state!=='pending')return reply({activated:false});
        x.state='active'; return reply({activated:true});
      }
      if(d._action==='status')return reply({active:[...devices.values()].some(x=>own(x)&&paid(x.payment)&&x.state==='active')});
      if(d._action==='revoke'){for(const x of devices.values())if(own(x))x.state='revoked';return reply({revoked:true});}
      return reply({},400);
    }
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
    if (url.endsWith('/invoice_payments?invoice=' + invoiceId + '&limit=2')) return reply(payments);
    return reply({error:'unexpected_fixture_route'},500);
  }
  return {calls,ledger,session,intent,charge,invoice,payments,allocation,fetchImpl};
}
function request(method, data, headers = {}) {
  const raw = data === undefined ? [] : [Buffer.from(typeof data==='string' ? data : JSON.stringify(data))];
  return Object.assign(Readable.from(raw), {method, headers:{'content-type':'application/json',...headers}});
}
function res() {
  return {statusCode:0, payload:null, headers:{}, setHeader(k,v){this.headers[k]=v;}};
}
function json(r,status,payload) {r.statusCode=status;r.payload=payload;}
async function call(path, method='GET', data, {cfg=env,fixture=makeFixture(),user=userId,origin=true,headers={},readAdmittedPrivateRelease}={}) {
  const auth = {sameOrigin:()=>origin, verify:async()=>user ? {userId:user,email:'test@example.org',emailVerified:true} : null};
  const service = createSmartclipSandboxCommerce({env:cfg,auth,fetchImpl:fixture.fetchImpl,readAdmittedPrivateRelease});
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
  pending.invoice.amount_paid=0;
  pending.invoice.amount_remaining=249;
  const waiting=await call('webhook','POST',webhook,{fixture:pending,headers});
  assert.equal(waiting.statusCode,503);
  assert.equal(pending.ledger.size,0);
  pending.invoice.status='paid';
  pending.invoice.amount_paid=249;
  pending.invoice.amount_remaining=0;
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
    makeFixture({invoice:{status:'void'}}),
    makeFixture({allocation:{payment:{type:'payment_record',payment_record:'payrec_external'}}}),
    makeFixture({allocation:{payment:{type:'payment_intent',payment_intent:'pi_foreign_smartclip_01'}}}),
    makeFixture({allocation:{invoice:'in_foreign_smartclip_01'}}),
    makeFixture({allocation:{livemode:true}}),
    makeFixture({allocation:{amount_paid:100}}),
    makeFixture({allocation:{amount_requested:100}}),
    makeFixture({allocation:{currency:'usd'}}),
    makeFixture({allocation:{status:'canceled'}}),
    makeFixture({payments:{has_more:true}}),
    makeFixture({payments:{data:[{},{}]}}),
    makeFixture({payments:{data:null}}),
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
test('invoice payment allocation retries safely until exact payment is credited',async()=>{
  const f=makeFixture({allocation:{status:'open',amount_paid:null}});
  const raw=event('checkout.session.completed',{id:sid});
  const headers={'stripe-signature':sign(raw)};
  assert.equal((await call('webhook','POST',raw,{fixture:f,headers})).statusCode,503);
  assert.equal(f.ledger.size,0);
  f.allocation.status='paid';
  f.allocation.amount_paid=249;
  const result=await call('webhook','POST',raw,{fixture:f,headers});
  assert.equal(result.statusCode,200);
  assert.equal(result.payload.granted,true);
  assert.equal(f.ledger.size,1);
  assert.equal((await call('webhook','POST',raw,{fixture:f,headers})).payload.granted,true);
  assert.equal(f.ledger.size,1);
});
test('missing invoice payment allocation is retryable without a grant',async()=>{
  const f=makeFixture({payments:{data:[]}});
  const raw=event('checkout.session.completed',{id:sid});
  assert.equal((await call('webhook','POST',raw,{fixture:f,headers:{'stripe-signature':sign(raw)}})).statusCode,503);
  assert.equal(f.ledger.size,0);
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


test('authenticated user isolation rejects spoofed cross-user and tenant hints',async()=>{
  // This personal SKU is user-scoped. These negatives test spoofed inputs, not
  // full enterprise tenant-membership isolation, which is not implemented.
  const fixture=makeFixture();
  const raw=event('checkout.session.completed',{id:sid});
  const paid=await call('webhook','POST',raw,{fixture,headers:{'stripe-signature':sign(raw)}});
  assert.equal(paid.statusCode,200);
  assert.equal(paid.payload.granted,true);
  assert.equal((await call('access','GET',undefined,{fixture})).payload.entitled,true);
  const forgedHeaders=[
    {'x-user-id':userId,'x-tenant-id':'tenant-owner','x-account-id':userId},
    {'x-organization-id':'tenant-owner','x-user-id':userId},
  ];
  for(const headers of forgedHeaders) {
    const response=await call('access','GET',undefined,{fixture,user:otherUserId,headers});
    assert.equal(response.statusCode,200);
    assert.equal(response.payload.entitled,false);
  }
  const before=fixture.calls.length;
  for(const path of ['access?user_id='+userId,'access?tenant_id=tenant-owner']) {
    const response=await call(path,'GET',undefined,{fixture,user:otherUserId});
    assert.equal(response.statusCode,400);
  }
  for(const attempted of [
    {...body,tenantId:'tenant-owner'},
    {...body,userId},
    {...body,accountId:userId},
  ]) {
    const response=await call('checkout','POST',attempted,{fixture,user:otherUserId});
    assert.equal(response.statusCode,400);
  }
  assert.equal(fixture.calls.length,before,'spoofed parameters must not reach billing or ledger');
  assert.equal(fixture.ledger.size,1);
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

test('license access is private and digest-bound; unsupported binary delivery stays denied before and after grant',async()=>{
 const fixture=makeFixture();
 const initial=await call('access','GET',undefined,{fixture});
 assert.deepEqual(initial.payload,{entitled:false,releaseSha256:null});
 assert.equal(initial.headers['Cache-Control'],'private, no-store');
 assert.match(initial.headers['X-Robots-Tag'],/noindex/);
 const before=fixture.calls.length;
 for(const action of ['download','delivery','asset','access?releaseSha256='+SMARTCLIP_PINNED_SHA256]){
   const denied=await call(action,'GET',undefined,{fixture});
   assert.ok([400,404].includes(denied.statusCode));
 }
 assert.equal((await call('access','GET',undefined,{fixture,user:null})).statusCode,401);
 assert.equal((await call('access','GET',undefined,{fixture,origin:false})).statusCode,403);
 assert.equal(fixture.calls.length,before);
 const paid=event('checkout.session.completed',{id:sid});
 assert.equal((await call('webhook','POST',paid,{fixture,headers:{'stripe-signature':sign(paid)}})).payload.granted,true);
 assert.deepEqual((await call('access','GET',undefined,{fixture})).payload,{entitled:true,releaseSha256:SMARTCLIP_PINNED_SHA256});
 assert.equal((await call('download','GET',undefined,{fixture})).statusCode,404);
 fixture.charge.refunded=true;fixture.charge.amount_refunded=249;
 const refund=event('charge.refunded',{id:chargeId});
 assert.equal((await call('webhook','POST',refund,{fixture,headers:{'stripe-signature':sign(refund)}})).payload.revoked,true);
 assert.deepEqual((await call('access','GET',undefined,{fixture})).payload,{entitled:false,releaseSha256:null});
});

test('offline ZIP byte verifier accepts only bounded exact digest and returns metadata, never bytes',()=>{
  const bytes=Buffer.from([0x50,0x4b,3,4,1,2,3,4]);
  const sha=createHash('sha256').update(bytes).digest('hex');
  assert.deepEqual(inspectSmartclipReleaseBytes(bytes,sha),{sha256:sha,byteLength:8,mime:'application/zip'});
  assert.throws(()=>inspectSmartclipReleaseBytes(bytes),/release_digest_mismatch/);
  assert.throws(()=>inspectSmartclipReleaseBytes(Buffer.from('bad!'),sha),/release_invalid/);
  assert.throws(()=>inspectSmartclipReleaseBytes(Buffer.alloc(8*1024*1024+1),sha),/release_invalid/);
  assert.throws(()=>inspectSmartclipReleaseBytes(new Uint8Array(bytes),sha),/release_invalid/);
  assert.throws(()=>inspectSmartclipReleaseBytes(bytes,'not-a-digest'),/release_invalid/);
});
test('private delivery preflight is default off, denies missing or foreign entitlement and rejects unpinned bytes',async()=>{
  let access=0,reads=0;
  const readEntitlement=async(id,sha)=>{
    access++;assert.equal(id,userId);assert.equal(sha,SMARTCLIP_PINNED_SHA256);
    return {entitled:true,releaseSha256:sha};
  };
  const readPrivateRelease=async(sha)=>{
    reads++;assert.equal(sha,SMARTCLIP_PINNED_SHA256);
    return Buffer.from([0x50,0x4b,3,4,1]);
  };
  const input={userId,readEntitlement,readPrivateRelease};
  const blocked={status:'BLOCKED',deliveryAllowed:false};
  assert.deepEqual(await preflightSmartclipSandboxDelivery(input),blocked);
  assert.deepEqual(await preflightSmartclipSandboxDelivery({...input,enabled:true,userId:'bad'}),blocked);
  assert.equal(access,0);assert.equal(reads,0);
  for(const result of [{entitled:false},{entitled:true,releaseSha256:'0'.repeat(64)}]){
    assert.deepEqual(await preflightSmartclipSandboxDelivery({...input,enabled:true,readEntitlement:async()=>result}),blocked);
  }
  assert.equal(reads,0);
  assert.deepEqual(await preflightSmartclipSandboxDelivery({...input,enabled:true}),blocked);
  assert.equal(access,1);assert.equal(reads,1);
  assert.deepEqual(await preflightSmartclipSandboxDelivery({...input,enabled:true,readEntitlement:async()=>{throw Error('private');}}),blocked);
});


test('private download requires authenticated entitlement before reading an admitted artifact',async()=>{
  const f=makeFixture();
  let reads=0;
  const readAdmittedPrivateRelease=async()=>{reads++;return null;};
  const opts={fixture:f,readAdmittedPrivateRelease};
  assert.equal((await call('download','GET',undefined,{...opts,user:null})).statusCode,401);
  assert.equal((await call('download','GET',undefined,{...opts,origin:false})).statusCode,403);
  assert.equal((await call('download','GET',undefined,opts)).statusCode,403);
  assert.equal(reads,0);
  const raw=event('checkout.session.completed',{id:sid});
  assert.equal((await call('webhook','POST',raw,{fixture:f,headers:{'stripe-signature':sign(raw)}})).payload.granted,true);
  assert.equal((await call('download','GET',undefined,{...opts,user:otherUserId})).statusCode,403);
  assert.equal(reads,0);
  assert.equal((await call('download','GET',undefined,opts)).statusCode,403);
  assert.equal(reads,1);
  assert.equal((await call('download?file=other','GET',undefined,opts)).statusCode,400);
  f.charge.refunded=true; f.charge.amount_refunded=249;
  const refund=event('charge.refunded',{id:chargeId});
  assert.equal((await call('webhook','POST',refund,{fixture:f,headers:{'stripe-signature':sign(refund)}})).payload.revoked,true);
  assert.equal((await call('download','GET',undefined,opts)).statusCode,403);
  assert.equal(reads,1);
});
test('private delivery contract rejects unapproved, foreign or tampered release bytes',async()=>{
  const artifact={admission:'TEST_ONLY_APPROVED',sku:SMARTCLIP_SKU,
    releaseId:'acode-bridge-v2',releaseSha256:SMARTCLIP_PINNED_SHA256,
    licenseVersion:'draft-v3',bytes:Buffer.from([0x50,0x4b,3,4,1])};
  const input={userId,readEntitlement:async()=>({entitled:true,releaseSha256:SMARTCLIP_PINNED_SHA256})};
  for(const wrong of [{admission:'DRAFT_ONLY'},{sku:'OTHER'},{licenseVersion:'other'},{releaseSha256:'0'.repeat(64)},{bytes:Buffer.alloc(8*1024*1024+1)}]){
    assert.equal(await prepareSmartclipPrivateDownload({...input,readAdmittedPrivateRelease:async()=>({...artifact,...wrong})}),null);
  }
  await assert.rejects(()=>prepareSmartclipPrivateDownload({...input,readAdmittedPrivateRelease:async()=>artifact}),/release_digest_mismatch/);
  const fixture=makeFixture();
  const raw=event('checkout.session.completed',{id:sid});
  await call('webhook','POST',raw,{fixture,headers:{'stripe-signature':sign(raw)}});
  const result=await call('download','GET',undefined,{fixture,readAdmittedPrivateRelease:async()=>artifact});
  assert.equal(result.statusCode,503);
  assert.deepEqual(result.payload,{error:'delivery_unavailable'});
});

// The JS fixture checks HTTP and crypto; the existing isolated PG CI tests the atomic ledger.
test('device pairing is opt-in, authenticated, exact-shape, signed and replay-safe',async()=>{
  const fixture=makeFixture(), cfg={...env,SMARTCLIP_SANDBOX_DEVICE_ENABLED:'true'};
  const opts={fixture,cfg};
  const pair=generateKeyPairSync('ed25519');
  const publicKey=pair.publicKey.export({type:'spki',format:'der'}).subarray(-32).toString('hex');
  const request={publicKey};
  assert.equal((await call('device-challenge','POST',request,{fixture})).statusCode,404);
  assert.equal((await call('device-challenge','GET',undefined,opts)).statusCode,405);
  assert.equal((await call('device-challenge','POST',request,{...opts,user:null})).statusCode,401);
  assert.equal((await call('device-challenge','POST',request,{...opts,origin:false})).statusCode,403);
  assert.equal((await call('device-challenge','POST',{...request,userId:otherUserId},opts)).statusCode,400);
  assert.equal((await call('device-challenge','POST',request,opts)).statusCode,403);
  const raw=event('checkout.session.completed',{id:sid});
  assert.equal((await call('webhook','POST',raw,{fixture,headers:{'stripe-signature':sign(raw)}})).payload.granted,true);
  const issued=await call('device-challenge','POST',request,opts);
  assert.equal(issued.statusCode,200);assert.equal(issued.payload.expiresInSeconds,120);
  assert.match(issued.payload.message,new RegExp(SMARTCLIP_PINNED_SHA256));
  const activation={publicKey,challenge:issued.payload.challenge,signature:signDevice(null,Buffer.from(issued.payload.message),pair.privateKey).toString('hex')};
  assert.equal((await call('device-activate','POST',{...activation,signature:'0'.repeat(128)},opts)).statusCode,403);
  assert.equal((await call('device-activate','POST',activation,{...opts,user:otherUserId})).statusCode,403);
  assert.equal((await call('device-activate','POST',activation,opts)).payload.active,true);
  assert.equal((await call('device-activate','POST',activation,opts)).statusCode,403);
  assert.equal((await call('device-status','POST',request,{...opts,user:otherUserId})).payload.active,false);
  assert.equal((await call('device-status','POST',request,opts)).payload.active,true);
  assert.equal((await call('device-challenge','POST',request,opts)).statusCode,403);
  assert.equal((await call('device-revoke','POST',request,opts)).payload.revoked,true);
  assert.equal((await call('device-status','POST',request,opts)).payload.active,false);
  assert.equal((await call('device-challenge','POST',request,opts)).statusCode,403);
  const pair2=generateKeyPairSync('ed25519');
  const publicKey2=pair2.publicKey.export({type:'spki',format:'der'}).subarray(-32).toString('hex');
  const third=await call('device-challenge','POST',{publicKey:publicKey2},opts);
  const thirdProof={publicKey:publicKey2,challenge:third.payload.challenge,signature:signDevice(null,Buffer.from(third.payload.message),pair2.privateKey).toString('hex')};
  assert.equal((await call('device-activate','POST',thirdProof,opts)).payload.active,true);
  assert.equal((await call('device-status','POST',{publicKey:publicKey2},opts)).payload.active,true);
  fixture.charge.refunded=true;fixture.charge.amount_refunded=249;
  const refund=event('charge.refunded',{id:chargeId});
  assert.equal((await call('webhook','POST',refund,{fixture,headers:{'stripe-signature':sign(refund)}})).payload.revoked,true);
  assert.equal((await call('device-status','POST',request,opts)).payload.active,false);
  assert.equal((await call('device-status','POST',{publicKey:publicKey2},opts)).payload.active,false);
  assert.equal((await call('device-activate','POST',thirdProof,opts)).statusCode,403);
});

test('private disk reader accepts only admitted bounded immutable exact ZIP in private directory',async()=>{
  const root=await mkdtemp(join(tmpdir(),'smartclip-private-'));
  const zip=join(root,'SmartClip-acode-bridge-v2.zip'), manifest=join(root,'admission.json');
  const bytes=Buffer.from([0x50,0x4b,3,4,1,2,3,4]);
  const identity={sku:SMARTCLIP_SKU,releaseId:'acode-bridge-v2',licenseVersion:'draft-v3',
    releaseSha256:createHash('sha256').update(bytes).digest('hex')};
  const approval={admission:'TEST_ONLY_APPROVED',...identity};
  const read=()=>readSmartclipPrivateArtifact({root,identity});
  try{
    assert.equal(createSmartclipPrivateReleaseReader({env}),undefined);
    assert.equal(await read(),null);
    await writeFile(zip,bytes,{mode:0o600});
    await writeFile(manifest,JSON.stringify(approval),{mode:0o600});
    assert.deepEqual(await read(),{...approval,bytes});
    await chmod(zip,0o644);assert.equal(await read(),null);await chmod(zip,0o600);
    await writeFile(manifest,JSON.stringify({...approval,admission:'DRAFT_ONLY'}));assert.equal(await read(),null);
    await writeFile(manifest,JSON.stringify(approval));
    await writeFile(zip,Buffer.from([0x50,0x4b,3,4,9]));assert.equal(await read(),null);
    await unlink(zip);await symlink(manifest,zip);assert.equal(await read(),null);
    const enabled=createSmartclipPrivateReleaseReader({env:{...env,SMARTCLIP_SANDBOX_PRIVATE_DELIVERY_ENABLED:'true'}});
    assert.equal(await enabled(identity),null); // synthetic digest cannot enter production pin
  }finally{await rm(root,{recursive:true,force:true});}
});

test('portable pairing client persists nonextractable key, checks server challenge and reuses existing session contract',async()=>{
  const fixture=makeFixture(), cfg={...env,SMARTCLIP_SANDBOX_DEVICE_ENABLED:'true'};
  const keys=new Map();let posts=0;
  const store={get:async id=>keys.get(id),add:async(id,pair)=>{if(keys.has(id))throw Error('duplicate');keys.set(id,pair);}};
  const raw=event('checkout.session.completed',{id:sid});
  await call('webhook','POST',raw,{fixture,headers:{'stripe-signature':sign(raw)}});
  const fetchImpl=async(url,init)=>{
    posts++;assert.equal(init.credentials,'same-origin');assert.equal(init.redirect,'error');
    const output=await call(new URL(url).pathname.split('/').at(-1),'POST',JSON.parse(init.body),{fixture,cfg});
    return reply(output.payload,output.statusCode);
  };
  const options={userId,origin:'https://capital-ai.online',cryptoImpl:webcrypto,store,fetchImpl};
  assert.throws(()=>createSmartclipPairingClient({...options,origin:'file://'}),/pairing_context_unavailable/);
  const c=createSmartclipPairingClient(options);
  assert.deepEqual(await c.activate(),{active:true,testOnly:true});
  assert.equal(keys.size,1);
  const pair=[...keys.values()][0];assert.equal(pair.privateKey.extractable,false);
  await assert.rejects(()=>webcrypto.subtle.exportKey('pkcs8',pair.privateKey));
  assert.deepEqual(await createSmartclipPairingClient(options).status(),{active:true,testOnly:true});
  assert.deepEqual(await c.revoke(),{revoked:true,testOnly:true});
  assert.deepEqual(await c.status(),{active:false,testOnly:true});
  const before=posts;
  const tampered=createSmartclipPairingClient({...options,fetchImpl:async()=>reply({testOnly:true,challenge:'1'.repeat(64),message:'wrong',expiresInSeconds:120})});
  await assert.rejects(()=>tampered.activate(),/challenge_invalid/);assert.equal(posts,before);
  const noStorage=createSmartclipPairingClient({...options,store:{get:async()=>null,add:async()=>{throw Error('no storage');}}});
  await assert.rejects(()=>noStorage.activate(),/secure_key_unavailable/);
});
