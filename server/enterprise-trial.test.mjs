import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createHmac} from 'node:crypto';
import {createEnterpriseTrial,ENTERPRISE_TRIAL_CAMPAIGN} from './enterprise-trial.mjs';
import {createVocabularyCheckout,verifyLearningWebhookSignature} from './vocabulary-checkout.mjs';
import {createSubscriptionCheckout} from './subscription-checkout.mjs';
const userId='00000000-0000-4000-8000-000000000001';
const env={STRIPE_SECRET_KEY:'sk_test_fixture',SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_fixture_abcdefghijklmnopqrstuvwxyz',STRIPE_LEARNING_WEBHOOK_SECRET:'whsec_fixture_abcdefghijklmnopqrstuvwxyz',PUBLIC_BASE_URL:'https://capital-ai.online'};
const auth={verify:async()=>({userId}),sameOrigin:req=>req.headers.origin==='https://capital-ai.online'};
function request(body={},headers={}) {const stream=new EventEmitter();stream.method='POST';stream.headers={origin:'https://capital-ai.online',...headers};stream.destroy=()=>{};setImmediate(()=>{stream.emit('data',Buffer.from(typeof body==='string'?body:JSON.stringify(body)));stream.emit('end');});return stream;}
const res=()=>({setHeader(){}});const json=(response,status,payload)=>{response.status=status;response.payload=payload;};
const endpoint=path=>new URL(path,'https://capital-ai.online');
test('Learning Portal checkout binds 25 EUR once, not the legacy 19 EUR price',async()=>{
 let form;const handler=createVocabularyCheckout({env,auth,fetchImpl:async(url,options)=>{
  if(new URL(url).pathname.endsWith('capital_ai_get_vocabulary_access')) return Response.json({quantProEntitled:false});
  assert.equal(String(url),'https://api.stripe.com/v1/checkout/sessions');form=new URLSearchParams(options.body);return Response.json({id:'cs_fixture',url:'https://checkout.stripe.com/c/pay/fixture'});
 }});const response=res();await handler.handle(request({withdrawalWaived:true}),response,endpoint('/api/billing/vocabulary/checkout'),json);
 assert.equal(response.status,200);assert.equal(form.get('mode'),'payment');assert.equal(form.get('line_items[0][price_data][unit_amount]'),'2500');assert.equal(form.get('line_items[0][price_data][product_data][name]'),'Learning Portal');assert.equal(form.get('metadata[sku]'),'learning-portal');assert.equal(form.get('metadata[user_id]'),userId);assert.equal(form.has('line_items[0][price]'),false);
});
test('configured wrong learning price is rejected before checkout creation',async()=>{
 let created=false;const handler=createVocabularyCheckout({env:{...env,STRIPE_LEARNING_PORTAL_PRICE_ID:'price_wrong',STRIPE_LEARNING_PORTAL_PRODUCT_ID:'prod_learning'},auth,fetchImpl:async(url)=>{
  const path=new URL(url).pathname;if(path.endsWith('capital_ai_get_vocabulary_access'))return Response.json({quantProEntitled:false});if(path.startsWith('/v1/prices/'))return Response.json({active:true,unit_amount:1900,currency:'eur',product:'prod_learning'});created=true;throw new Error('unexpected');
 }});const response=res();await handler.handle(request({withdrawalWaived:true}),response,endpoint('/api/billing/vocabulary/checkout'),json);assert.equal(response.status,503);assert.equal(created,false);
});
test('Enterprise promotion is exactly three days, account bound, includes no invoice discount',async()=>{
 let form;const handler=createSubscriptionCheckout({env,auth,fetchImpl:async(url,options)=>{
  if(new URL(url).pathname.endsWith('capital_ai_enterprise_trial'))return Response.json(JSON.parse(options.body)._action==='reserve'?{reserved:true}:{attached:true});
  form=new URLSearchParams(options.body);return Response.json({livemode:false,id:'cs_trial_fixture',url:'https://checkout.stripe.com/c/pay/fixture'});
 }});const response=res();await handler.handle(request({tier:'enterprise',cycle:'monthly',promotion:'ENTERPRISE3'}),response,endpoint('/api/billing/subscriptions/checkout'),json);
 assert.equal(response.status,200);assert.equal(form.get('subscription_data[trial_period_days]'),'3');assert.equal(form.get('metadata[campaign]'),ENTERPRISE_TRIAL_CAMPAIGN);assert.equal(form.get('metadata[user_id]'),userId);assert.equal(form.has('discounts[0][coupon]'),false);assert.equal(form.has('allow_promotion_codes'),false);assert.match(form.get('success_url'),/enterprise_trial_session/);
});
test('repeat trial and applying trial to Pro never create a Stripe session',async()=>{
 let calls=0;const handler=createSubscriptionCheckout({env,auth,fetchImpl:async(url)=>{assert.ok(new URL(url).pathname.endsWith('capital_ai_enterprise_trial'));calls++;return Response.json({reserved:false});}});
 const repeat=res();await handler.handle(request({tier:'enterprise',cycle:'annual',promotion:'ENTERPRISE3'}),repeat,endpoint('/api/billing/subscriptions/checkout'),json);assert.equal(repeat.status,409);
 const wrong=res();await handler.handle(request({tier:'pro',cycle:'monthly',promotion:'ENTERPRISE3'}),wrong,endpoint('/api/billing/subscriptions/checkout'),json);assert.equal(wrong.status,400);assert.equal(calls,1);
});
test('uncertain session creation or failed attachment never releases a payable trial reservation',async()=>{
 for(const failAttach of [false,true]) {
  const actions=[];const handler=createSubscriptionCheckout({env,auth,fetchImpl:async(url,options)=>{
   if(new URL(url).pathname.endsWith('capital_ai_enterprise_trial')) {
    const action=JSON.parse(options.body)._action;actions.push(action);return Response.json(action==='reserve'?{reserved:true}:{attached:false});
   }
   if(!failAttach) throw new Error('transport timeout after possible Stripe creation');
   return Response.json({livemode:false,id:'cs_trial_fixture',url:'https://checkout.stripe.com/c/pay/fixture'});
  }});
  const response=res();await handler.handle(request({tier:'enterprise',cycle:'monthly',promotion:'ENTERPRISE3'}),response,endpoint('/api/billing/subscriptions/checkout'),json);
  assert.equal(response.status,502);assert.equal(actions.includes('release'),false);
 }
});
test('activation requires matching identity, Enterprise price and exactly 72 hours',async()=>{
 const start=Math.floor(Date.now()/1000);let activated=0;let price='price_1UMA51PKr4joNbEcbtWNCcCc';
 const campaign=createEnterpriseTrial({env,fetchImpl:async(url,options)=>{
  const path=new URL(url).pathname;
  if(path.includes('/checkout/sessions/'))return Response.json({id:'cs_trial_fixture',status:'complete',mode:'subscription',subscription:'sub_fixture',client_reference_id:userId,metadata:{user_id:userId,campaign:ENTERPRISE_TRIAL_CAMPAIGN}});
  if(path.includes('/subscriptions/'))return Response.json({status:'trialing',trial_start:start,trial_end:start+3*86400,metadata:{user_id:userId,campaign:ENTERPRISE_TRIAL_CAMPAIGN},items:{data:[{price:{id:price}}]}});
  activated++;assert.equal(JSON.parse(options.body)._user_id,userId);return Response.json({activated:true});
 }});
 assert.equal(await campaign.activate('00000000-0000-4000-8000-000000000002','cs_trial_fixture'),false);
 price='price_other';assert.equal(await campaign.activate(userId,'cs_trial_fixture'),false);
 price='price_1UMA51PKr4joNbEcbtWNCcCc';assert.equal(await campaign.activate(userId,'cs_trial_fixture'),true);assert.equal(activated,1);
});
test('webhook signatures enforce freshness and accept rotated matching signatures',()=>{
 const timestamp=Math.floor(Date.now()/1000);const body='{"type":"test"}';const secret=env.STRIPE_LEARNING_WEBHOOK_SECRET;
 const sig=createHmac('sha256',secret).update(`${timestamp}.${body}`).digest('hex');
 assert.equal(verifyLearningWebhookSignature(body,`t=${timestamp},v1=${sig}`,secret),true);
 assert.equal(verifyLearningWebhookSignature(body,`t=${timestamp},v1=${'0'.repeat(64)},v1=${sig}`,secret),true);
 assert.equal(verifyLearningWebhookSignature(body+'x',`t=${timestamp},v1=${sig}`,secret),false);
 assert.equal(verifyLearningWebhookSignature(body,`t=${timestamp},v1=${sig}`,secret,(timestamp+301)*1000),false);
});
test('signed paid webhook fulfills Learning Portal without a return-page visit; forged webhook never grants',async()=>{
 let grants=0;const session={id:'cs_learning_fixture',mode:'payment',client_reference_id:userId,metadata:{sku:'learning-portal',user_id:userId},payment_status:'paid',currency:'eur',amount_total:2500,customer:'cus_fixture',payment_intent:'pi_fixture'};
 const body=JSON.stringify({type:'checkout.session.completed',data:{object:session}});const timestamp=Math.floor(Date.now()/1000);const signature=createHmac('sha256',env.STRIPE_LEARNING_WEBHOOK_SECRET).update(`${timestamp}.${body}`).digest('hex');
 const handler=createVocabularyCheckout({env,auth,fetchImpl:async(url)=>{const path=new URL(url).pathname;if(path.includes('/checkout/sessions/'))return Response.json(session);assert.ok(path.endsWith('capital_ai_grant_vocabulary_entitlement'));grants++;return Response.json({quantProEntitled:true});}});
 const valid=res();await handler.handle(request(body,{'stripe-signature':`t=${timestamp},v1=${signature}`}),valid,endpoint('/api/billing/learning/webhook'),json);assert.equal(valid.status,200);assert.equal(grants,1);
 const invalid=res();await handler.handle(request(body,{'stripe-signature':'t=0,v1=0000'}),invalid,endpoint('/api/billing/learning/webhook'),json);assert.equal(invalid.status,400);assert.equal(grants,1);
});
