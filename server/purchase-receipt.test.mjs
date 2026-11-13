import { createHmac } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createPurchaseReceipt } from './purchase-receipt.mjs';
import { BILLING_CATALOG } from './billing-catalog.mjs';
import { BLUEPRINT_PRODUCTS } from './blueprint-commerce.mjs';
const userId = '5cf37f93-1103-467d-9810-ea98f93fdca3';
const sessionId = 'cs_live_abcdefgh12345678';
const env = { STRIPE_SECRET_KEY:'sk_live_fixture', STRIPE_LEARNING_PORTAL_PRICE_ID:'price_learning', STRIPE_LEARNING_PORTAL_PRODUCT_ID:'prod_learning' };
const charge = {paid:true,refunded:false,amount_refunded:0,disputed:false};
function fixture(kind='learning') {
  let item = { id:'learning-portal', priceId:'price_learning',productId:'prod_learning', amount:2500 };
  if(kind==='blueprint') item={id:'CAP-BP-001',...BLUEPRINT_PRODUCTS['CAP-BP-001'],amount:5000};
  if(kind==='saas') item={id:'saas-starter-monthly',priceId:BILLING_CATALOG.tiers.starter.monthlyPriceId,productId:BILLING_CATALOG.tiers.starter.productId,amount:700};
  const session = {id:sessionId,client_reference_id:userId,metadata:{user_id:userId,sku:item.id},livemode:true,mode:'payment',status:'complete',payment_status:'paid',currency:'eur',amount_total:item.amount,amount_subtotal:item.amount,total_details:{amount_discount:0},payment_intent:{status:'succeeded',livemode:true,latest_charge:structuredClone(charge)}};
  if(kind==='saas') Object.assign(session,{mode:'subscription',payment_intent:null,subscription:'sub_fixture',customer:'cus_fixture',metadata:{user_id:userId,plan_id:'STARTER',billing_cycle:'monthly'},invoice:{id:'in_fixture',status:'paid',paid:true,billing_reason:'subscription_create',livemode:true,currency:'eur',amount_paid:700,subscription:'sub_fixture',customer:'cus_fixture'}});
  const lines={has_more:false,data:[{quantity:1,amount_subtotal:item.amount,price:{id:item.priceId,product:item.productId,currency:'eur',unit_amount:item.amount}}]};
  const payments={has_more:false,data:[{status:'paid',payment:{payment_intent:{status:'succeeded',livemode:true,latest_charge:structuredClone(charge)}}}]};
  return {session,lines,payments};
}
async function invoke(f=fixture(), {user={userId},origin=true,method='POST',body={sessionId},secret=env.STRIPE_SECRET_KEY}={}) {
  const calls=[];
  const handler=createPurchaseReceipt({env:{...env,STRIPE_SECRET_KEY:secret},auth:{sameOrigin:()=>origin,verify:async()=>user},fetchImpl:async(url,options)=>{
    assert.equal(options.method,undefined,'receipt makes GET requests exclusively');calls.push(url);
    return Response.json(url.includes('/line_items?')?f.lines:url.includes('/invoice_payments?')?f.payments:f.session);
  }});
  const req=Readable.from([Buffer.from(JSON.stringify(body))]);req.method=method;req.headers={'content-type':'application/json'};
  const headers={};const res={setHeader:(key,value)=>headers[key]=value};
  await handler.handle(req,res,new URL('https://capital-ai.online/api/billing/purchase-receipt'),(_,status,payload)=>Object.assign(res,{status,payload}));
  return {...res,calls,headers};
}
for(const kind of ['learning','blueprint','saas']) test(`verified ${kind} receipt contains only bounded analytics fields`,async()=>{
  const result=await invoke(fixture(kind));assert.equal(result.status,200);assert.match(result.payload.transactionId,/^[a-f0-9]{64}$/);
  assert.equal(result.payload.items[0].quantity,1);assert.equal(result.headers['Cache-Control'],'private, no-store, max-age=0');
  assert.doesNotMatch(JSON.stringify(result.payload),/cs_live|sk_live|user_id|cus_fixture|in_fixture/);
  assert.equal((await invoke(fixture(kind))).payload.transactionId,result.payload.transactionId);
});
test('authorization fails before Stripe reads',async()=>{
  for(const options of [{origin:false},{user:null},{method:'GET'},{body:{sessionId:'bad'}},{body:{sessionId,amount:1}}]) {
    const result=await invoke(fixture(),options);assert.notEqual(result.status,200);assert.equal(result.calls.length,0);
  }
});
test('foreign, unpaid, test-mode, refunded, disputed and wrong-catalog sessions fail closed',async()=>{
  const mutations=[f=>f.session.client_reference_id='another-user',f=>f.session.metadata.user_id='another-user',f=>f.session.livemode=false,f=>f.session.status='open',f=>f.session.payment_status='unpaid',f=>f.session.payment_intent.latest_charge.amount_refunded=1,f=>f.session.payment_intent.latest_charge.disputed=true,f=>f.lines.data[0].price.id='price_wrong',f=>f.lines.data.push(f.lines.data[0]),f=>f.lines.has_more=true,f=>f.session.total_details.amount_discount=-1];
  for(const mutate of mutations){const f=fixture();mutate(f);assert.notEqual((await invoke(f)).status,200);}
  assert.equal((await invoke(fixture(),{secret:'sk_test_fixture'})).status,409);
});
test('subscriptions measure only the paid first invoice and reject trial, renewal or refunded invoices',async()=>{
  for(const mutate of [f=>f.session.invoice.billing_reason='subscription_cycle',f=>f.session.metadata.campaign='trial',f=>f.session.invoice.subscription='sub_foreign',f=>f.payments.data[0].payment.payment_intent.latest_charge.refunded=true]){
    const f=fixture('saas');mutate(f);assert.equal((await invoke(f)).status,409);
  }
});

test('a fully discounted completed Learning purchase preserves the existing zero-value conversion',async()=>{
  const f=fixture();Object.assign(f.session,{amount_total:0,payment_status:'no_payment_required',payment_intent:null,total_details:{amount_discount:2500}});
  const result=await invoke(f);assert.equal(result.status,200);assert.equal(result.payload.value,0);
  f.session.total_details.amount_discount=2499;assert.equal((await invoke(f)).status,409);
});

test('Learning keeps the existing transaction identity across the confirmation migration',async()=>{
  const result=await invoke(fixture());
  assert.equal(result.payload.transactionId,createHmac('sha256',env.STRIPE_SECRET_KEY).update('learning-analytics:'+sessionId).digest('hex'));
});
