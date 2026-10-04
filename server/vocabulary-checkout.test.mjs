import test from 'node:test';
import assert from 'node:assert/strict';
import { createVocabularyCheckout } from './vocabulary-checkout.mjs';

function request({ method='GET', headers={}, body=null }={}) {
  return {
    method,
    headers,
    on(event, handler) {
      if (event === 'end') queueMicrotask(handler);
      return this;
    },
    destroy() {},
    [Symbol.asyncIterator]: async function* () {
      if (body != null) yield Buffer.from(body);
    },
  };
}

function response() {
  return {
    status:null,
    payload:null,
    headers:new Map(),
    setHeader(k,v){ this.headers.set(String(k).toLowerCase(),String(v)); },
    getHeader(k){ return this.headers.get(String(k).toLowerCase()); },
    writeHead(status){ this.status=status; },
    end(payload){ this.payload=payload; },
  };
}

function json(res,status,body){ res.status=status; res.payload=body; }

const env={
  STRIPE_SECRET_KEY:'sk_test_abcdefghijklmnopqrstuvwxyz0123456789',
  SUPABASE_URL:'https://project.supabase.co',
  SUPABASE_SECRET_KEY:'sb_secret_abcdefghijklmnopqrstuvwxyz0123456789',
  STRIPE_VOCABULARY_PRICE_ID:'price_1UMiuIPKr4joNbEclpn8AwFW',
  STRIPE_VOCABULARY_PRODUCT_ID:'prod_VNTsrtlf2ZL8ja',
  PUBLIC_BASE_URL:'https://capital-ai.online',
};

function auth(userId='11111111-1111-4111-8111-111111111111') {
  return {
    sameOrigin:()=>true,
    verify:async()=>({userId}),
  };
}

test('free quiz is consumed server-side exactly once', async () => {
  let used=false;
  const fetchImpl=async(url,options={})=>{
    const path=new URL(url).pathname;
    if(path.endsWith('/capital_ai_get_vocabulary_access')){
      return new Response(JSON.stringify({quizUsed:used,quantProEntitled:false}),{status:200,headers:{'content-type':'application/json'}});
    }
    if(path.endsWith('/capital_ai_consume_vocabulary_quiz')){
      if(used) return new Response(JSON.stringify({consumed:false,quizUsed:true}),{status:200,headers:{'content-type':'application/json'}});
      used=true;
      return new Response(JSON.stringify({consumed:true,quizUsed:true,quizConsumedAt:'2026-10-04T07:35:00Z'}),{status:200,headers:{'content-type':'application/json'}});
    }
    throw new Error('unexpected request '+url);
  };
  const checkout=createVocabularyCheckout({env,fetchImpl,auth:auth()});

  const first=response();
  await checkout.handle(
    request({method:'POST',headers:{origin:'https://capital-ai.online'}}),
    first,
    new URL('https://capital-ai.online/api/learning/vocabulary/quiz/consume'),
    json,
  );
  assert.equal(first.status,200);
  assert.equal(first.payload.allowed,true);

  const second=response();
  await checkout.handle(
    request({method:'POST',headers:{origin:'https://capital-ai.online'}}),
    second,
    new URL('https://capital-ai.online/api/learning/vocabulary/quiz/consume'),
    json,
  );
  assert.equal(second.status,409);
  assert.equal(second.payload.error,'quiz_already_used');
});

test('Quant/Pro endpoint is fail-closed without persistent entitlement', async () => {
  const fetchImpl=async(url)=>{
    const path=new URL(url).pathname;
    if(path.endsWith('/capital_ai_get_vocabulary_access')){
      return new Response(JSON.stringify({quizUsed:false,quantProEntitled:false}),{status:200,headers:{'content-type':'application/json'}});
    }
    throw new Error('unexpected request '+url);
  };
  const checkout=createVocabularyCheckout({env,fetchImpl,auth:auth()});
  const res=response();
  await checkout.handle(
    request(),
    res,
    new URL('https://capital-ai.online/api/learning/vocabulary/quant-pro'),
    json,
  );
  assert.equal(res.status,403);
  assert.equal(res.payload.error,'vocabulary_entitlement_required');
});

test('paid user receives server-only Quant/Pro terms', async () => {
  const fetchImpl=async(url)=>{
    const path=new URL(url).pathname;
    if(path.endsWith('/capital_ai_get_vocabulary_access')){
      return new Response(JSON.stringify({quizUsed:true,quantProEntitled:true}),{status:200,headers:{'content-type':'application/json'}});
    }
    throw new Error('unexpected request '+url);
  };
  const checkout=createVocabularyCheckout({env,fetchImpl,auth:auth()});
  const res=response();
  await checkout.handle(
    request(),
    res,
    new URL('https://capital-ai.online/api/learning/vocabulary/quant-pro'),
    json,
  );
  assert.equal(res.status,200);
  assert.ok(res.payload.count > 0);
  assert.equal(res.payload.terms.every(term=>term.level==='Quant / Pro'),true);
});

test('validated paid Stripe session is persisted as entitlement', async () => {
  const userId='11111111-1111-4111-8111-111111111111';
  let granted=false;
  const fetchImpl=async(url,options={})=>{
    const parsed=new URL(url);
    if(parsed.origin==='https://api.stripe.com'){
      return new Response(JSON.stringify({
        id:'cs_test_paid_123',
        payment_status:'paid',
        metadata:{sku:'market-vocabulary',user_id:userId},
        client_reference_id:userId,
        currency:'eur',
        amount_total:1900,
        customer:'cus_123',
        payment_intent:'pi_123',
      }),{status:200,headers:{'content-type':'application/json'}});
    }
    if(parsed.pathname.endsWith('/capital_ai_grant_vocabulary_entitlement')){
      granted=true;
      return new Response(JSON.stringify({quantProEntitled:true}),{status:200,headers:{'content-type':'application/json'}});
    }
    if(parsed.pathname.endsWith('/capital_ai_get_vocabulary_access')){
      return new Response(JSON.stringify({quizUsed:false,quantProEntitled:granted,entitlementSource:granted?'stripe_checkout':null}),{status:200,headers:{'content-type':'application/json'}});
    }
    throw new Error('unexpected request '+url);
  };
  const checkout=createVocabularyCheckout({env,fetchImpl,auth:auth(userId)});
  const res=response();
  await checkout.handle(
    request(),
    res,
    new URL('https://capital-ai.online/api/billing/vocabulary/entitlement?session_id=cs_test_paid_123'),
    json,
  );
  assert.equal(res.status,200);
  assert.equal(granted,true);
  assert.equal(res.payload.entitled,true);
  assert.equal(res.payload.entitlementSource,'stripe_checkout');
});
