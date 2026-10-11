import test from 'node:test';
import assert from 'node:assert/strict';
import { createVocabularyCheckout } from './vocabulary-checkout.mjs';

function request({ method='GET', headers={}, body=null }={}) {
  return {
    method,
    headers,
    on(event, handler) {
      if (event === 'data' && body != null) queueMicrotask(() => handler(Buffer.from(body)));
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
    writeHead(status, headers={}){ this.status=status; for (const [k,v] of Object.entries(headers)) this.headers.set(String(k).toLowerCase(),String(v)); },
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
    if(path.endsWith('/capital_ai_get_quant_pro_vocabulary')){
      return new Response(JSON.stringify([{
        id:'server-only-test',
        level:'Quant / Pro',
        term:'Server-only test term',
        thesaurus:['A','B','C'],
      }]),{status:200,headers:{'content-type':'application/json'}});
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


test('badge download is entitlement-gated and includes attachment metadata', async () => {
  const fetchImpl=async(url)=>{
    const path=new URL(url).pathname;
    if(path.endsWith('/capital_ai_get_vocabulary_access')){
      return new Response(JSON.stringify({quizUsed:true,quantProEntitled:true}),{status:200,headers:{'content-type':'application/json'}});
    }
    throw new Error('unexpected request '+url);
  };
  const checkout=createVocabularyCheckout({env,fetchImpl,auth:auth()});

  const badge=response();
  await checkout.handle(request(), badge, new URL('https://capital-ai.online/api/billing/vocabulary/badge'), json);
  assert.equal(badge.status,200);
  assert.match(badge.headers.get('content-disposition'), /capital-ai-market-vocabulary-badge\.svg/);
  assert.match(String(badge.payload), /CAPITAL-AI-PRODUCT/);

  const license=response();
  await checkout.handle(request(), license, new URL('https://capital-ai.online/api/billing/vocabulary/badge-license'), json);
  assert.equal(license.status,200);
  assert.match(license.headers.get('content-disposition'), /CAPITAL-AI-VOCABULARY-BADGE-LICENSE\.md/);
  assert.match(String(license.payload), /LicenseRef-CAPITAL-AI-VOCABULARY-BADGE-CUSTOMER-1\.0/);
});

test('badge download is denied without Vocabulary entitlement', async () => {
  const fetchImpl=async(url)=>{
    const path=new URL(url).pathname;
    if(path.endsWith('/capital_ai_get_vocabulary_access')){
      return new Response(JSON.stringify({quizUsed:false,quantProEntitled:false}),{status:200,headers:{'content-type':'application/json'}});
    }
    throw new Error('unexpected request '+url);
  };
  const checkout=createVocabularyCheckout({env,fetchImpl,auth:auth()});
  const res=response();
  await checkout.handle(request(), res, new URL('https://capital-ai.online/api/billing/vocabulary/badge'), json);
  assert.equal(res.status,403);
  assert.equal(res.payload.error,'vocabulary_entitlement_required');
});

test('private notes persist per verified identity and ignore client-selected user IDs', async () => {
  const saved = new Map();
  const fetchImpl = async (url, options) => {
    assert.ok(String(url).endsWith('/rpc/capital_ai_private_notes'));
    const args = JSON.parse(options.body);
    if (args._action === 'PUT') saved.set(args._user_id,args._notes);
    return new Response(JSON.stringify(saved.get(args._user_id) ?? ''), {status:200});
  };
  async function call(userId,method='GET',body) {
    const checkout=createVocabularyCheckout({env,fetchImpl,auth:auth(userId)});
    const res=response();
    await checkout.handle(request({method,body:body&&JSON.stringify(body)}),res,new URL('https://capital-ai.online/api/profile/notes'),json);
    return res;
  }
  const first='11111111-1111-4111-8111-111111111111';
  const second='22222222-2222-4222-8222-222222222222';
  assert.equal((await call(first,'PUT',{notes:'Meine Notiz',user_id:second})).status,200);
  assert.equal((await call(first)).payload.notes,'Meine Notiz');
  assert.equal((await call(second)).payload.notes,'');
  assert.equal((await call(first,'PUT',{notes:''})).payload.notes,'');
});

test('private notes reject missing sessions, cross-origin writes, invalid input and backend failure', async () => {
  let calls=0;
  const fetchImpl=async()=>{calls++;return new Response('{}',{status:503});};
  async function call(overrides,method='PUT',notes='test') {
    const checkout=createVocabularyCheckout({env,fetchImpl,auth:{...auth(),...overrides}});
    const res=response();
    await checkout.handle(request({method,body:JSON.stringify({notes})}),res,new URL('https://capital-ai.online/api/profile/notes'),json);
    return res.status;
  }
  assert.equal(await call({verify:async()=>null},'GET'),401);
  assert.equal(await call({sameOrigin:()=>false}),403);
  assert.equal(await call({},'POST'),405);
  assert.equal(await call({},'PUT',123),400);
  assert.equal(await call({},'PUT','x'.repeat(10001)),400);
  assert.equal(calls,0);
  assert.equal(await call({}),503);
});
