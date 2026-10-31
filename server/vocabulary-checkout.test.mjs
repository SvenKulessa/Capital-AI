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

test('private notes OCC v2: initial revision, stale CAS and explicit merge', async () => {
  const saved = new Map();
  const calls = [];
  const fetchImpl = async (url, options) => {
    assert.ok(String(url).endsWith('/rpc/capital_ai_private_notes_v2'));
    const args = JSON.parse(options.body);
    calls.push(args);
    const current = saved.get(args._user_id) ?? { notes: '', revision: '0' };
    if (args._action === 'GET') return Response.json({ status:'ok', ...current });
    if (current.revision !== args._expected_revision) {
      return Response.json({ status:'conflict', ...current });
    }
    const next = { notes:args._notes, revision:(BigInt(current.revision)+1n).toString() };
    saved.set(args._user_id,next);
    return Response.json({ status:'saved', ...next });
  };
  async function call(userId,method='GET',body) {
    const checkout=createVocabularyCheckout({env,fetchImpl,auth:auth(userId)});
    const res=response();
    await checkout.handle(request({method,body:body&&JSON.stringify(body)}),res,
      new URL('https://capital-ai.online/api/profile/notes'),json);
    return res;
  }
  const a='11111111-1111-4111-8111-111111111111';
  const b='22222222-2222-4222-8222-222222222222';
  const initial=await call(a);
  assert.equal(initial.status,200);
  assert.deepEqual(initial.payload,{notes:'',userId:a,revision:'0'});
  assert.equal(initial.headers.get('cache-control'),'private, no-store');
  const first=await call(a,'PUT',{expectedUserId:a,expectedRevision:'0',notes:'Alice'});
  assert.equal(first.status,200);
  assert.equal(first.payload.revision,'1');
  const stale=await call(a,'PUT',{expectedUserId:a,expectedRevision:'0',notes:'Lost update'});
  assert.equal(stale.status,409);
  assert.deepEqual(stale.payload,{error:'notes_revision_conflict',userId:a,
    currentNotes:'Alice',currentRevision:'1'});
  assert.equal(saved.get(a).notes,'Alice');
  const merged=await call(a,'PUT',{expectedUserId:a,expectedRevision:'1',notes:'Merged'});
  assert.equal(merged.status,200);
  assert.equal(merged.payload.revision,'2');
  assert.equal((await call(b)).payload.notes,'');
  assert.equal((await call(b,'PUT',{expectedUserId:a,expectedRevision:'0',notes:'Forbidden'})).status,409);
  assert.equal(saved.has(b),false);
  assert.equal(calls.every(call=>call._user_id===a||call._user_id===b),true);
});

test('private notes OCC v2: missing and invalid revision fail before RPC', async () => {
  let calls=0;
  const fetchImpl=async()=>{calls++;return Response.json({ status:'ok',notes:'',revision:'0' });};
  async function call(overrides={},method='PUT',body={}) {
    const checkout=createVocabularyCheckout({env,fetchImpl,auth:{...auth(),...overrides}});
    const res=response();
    await checkout.handle(request({method,body:JSON.stringify({
      notes:'test',expectedUserId:'11111111-1111-4111-8111-111111111111',...body,
    })}),res,new URL('https://capital-ai.online/api/profile/notes'),json);
    return res;
  }
  assert.equal((await call({verify:async()=>null},'GET')).status,401);
  assert.equal((await call({sameOrigin:()=>false})).status,403);
  assert.equal((await call({},'POST')).status,405);
  const missing=await call();
  assert.equal(missing.status,428);
  assert.equal(missing.payload.error,'revision_required');
  for(const invalid of [null,-1,0,1,'01','-1','abc','9223372036854775807','9223372036854775808']) {
    const bad=await call({},'PUT',{expectedRevision:invalid});
    assert.equal(bad.status,400);
    assert.equal(bad.payload.error,'invalid_revision');
  }
  assert.equal((await call({},'PUT',{notes:123,expectedRevision:'0'})).status,400);
  assert.equal((await call({},'PUT',{notes:'x'.repeat(10001),expectedRevision:'0'})).status,400);
  assert.equal(calls,0);
  const unavailable=await call({},'GET');
  assert.equal(unavailable.status,200);
  assert.equal(calls,1);
});

test('private notes OCC v2: malformed/unconfirmed RPC fails closed', async () => {
  const userId='11111111-1111-4111-8111-111111111111';
  for(const result of [
    'legacy',null,{status:'saved',notes:'Text',revision:'0'},
    {status:'saved',notes:'wrong',revision:'1'},
    {status:'unexpected',notes:'Text',revision:'1'},
  ]) {
    const checkout=createVocabularyCheckout({env,
      fetchImpl:async()=>Response.json(result),auth:auth(userId)});
    const res=response();
    await checkout.handle(request({method:'PUT',
      body:JSON.stringify({expectedUserId:userId,expectedRevision:'0',notes:'Text'})}),
      res,new URL('https://capital-ai.online/api/profile/notes'),json);
    assert.equal(res.status,503);
    assert.equal(res.payload.error,'notes_unavailable');
  }
});

test('learning word storage is idempotent, removable and scoped to verified users',async()=>{
 const stores=new Map();const calls=[];
 const fetchImpl=async(url,options)=>{
  assert.ok(new URL(url).pathname.endsWith('/capital_ai_learning_favorites'));
  const body=JSON.parse(options.body);calls.push(body);
  const ids=stores.get(body._user_id)??new Set();
  if(body._action==='POST')ids.add(body._term_id);
  if(body._action==='DELETE')ids.delete(body._term_id);
  stores.set(body._user_id,ids);
  return Response.json([...ids]);
 };
 async function call(user,method,id='frontend-sentiment_score'){
  const checkout=createVocabularyCheckout({env,fetchImpl,auth:auth(user)}),res=response();
  await checkout.handle(request({method}),res,new URL(`https://capital-ai.online/api/learning/favorites?id=${id}&userId=untrusted-caller`),json);
  return res;
 }
 assert.equal((await call('alice','POST')).status,200);
 assert.deepEqual((await call('alice','POST')).payload.favorites,['frontend-sentiment_score']);
 assert.deepEqual((await call('bob','GET')).payload.favorites,[]);
 assert.deepEqual((await call('alice','GET')).payload.favorites,['frontend-sentiment_score']);
 assert.deepEqual((await call('alice','DELETE')).payload.favorites,[]);
 assert.ok(calls.every(body=>['alice','bob'].includes(body._user_id)));
 assert.equal((await call('alice','POST','bad%3Cscript%3E')).status,400);
});

test('learning mutations reject other origins and anonymous access before storage',async()=>{
 let io=0;
 for(const [boundary,expected] of [[{sameOrigin:()=>false,verify:async()=>({userId:'alice'})},403],[{sameOrigin:()=>true,verify:async()=>null},401]]){
  const checkout=createVocabularyCheckout({env,auth:boundary,fetchImpl:async()=>{io++;throw Error('unexpected storage');}}),res=response();
  await checkout.handle(request({method:'POST'}),res,new URL('https://capital-ai.online/api/learning/favorites?id=orderbuch'),json);
  assert.equal(res.status,expected);
 }
 assert.equal(io,0);
});

test('purchase evidence requires a verified live learning payment belonging to the signed-in user', async () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const base = { id: 'cs_live_learning_123', livemode: true, mode: 'payment', status: 'complete',
    payment_status: 'paid', metadata: { sku: 'learning-portal', user_id: userId }, client_reference_id: userId,
    currency: 'eur', amount_subtotal: 2500, amount_total: 2000, total_details: { amount_discount: 500 } };
  for (const [patch, expected] of [[{}, true], [{livemode:false}, false], [{status:'open'}, false],
    [{payment_status:'unpaid'}, false], [{client_reference_id:'another-user'}, false], [{amount_total:2400}, false]]) {
    let grants = 0;
    const checkout = createVocabularyCheckout({ env, auth: auth(userId), fetchImpl: async url => {
      if (new URL(url).origin === 'https://api.stripe.com') return Response.json({...base, ...patch});
      if (String(url).includes('capital_ai_grant_vocabulary_entitlement')) { grants++; return Response.json({}); }
      return Response.json({quantProEntitled: true});
    }});
    const res = response();
    await checkout.handle(request(), res, new URL('https://capital-ai.online/api/billing/vocabulary/entitlement?session_id=cs_live_learning_123'), json);
    assert.equal(res.status, 200);
    assert.equal(Boolean(res.payload.purchase), expected);
    if (expected) {
      assert.equal(grants, 1);assert.equal(res.payload.purchase.value, 20);
      assert.equal(res.payload.purchase.currency, 'EUR');
      assert.match(res.payload.purchase.transactionId, /^[a-f0-9]{64}$/);
      assert.doesNotMatch(JSON.stringify(res.payload.purchase), /cs_live|11111111/);
    }
  }
});
