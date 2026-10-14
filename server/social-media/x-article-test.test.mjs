import test from 'node:test';
import assert from 'node:assert/strict';
import { createCipheriv, randomBytes } from 'node:crypto';
import { ARTICLE, CONTENT_KEY, createXArticleTest } from './x-article-test.mjs';

const USER='d0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
const KEY='ab'.repeat(32), ACCOUNT='123456789012345678', HANDLE='CapitalAIOnline';
const ENV={
  PUBLIC_APP_ORIGIN:'https://capital-ai.online/',
  SOCIAL_X_EDGE_STORE_ENABLED:'true',
  SOCIAL_X_EDGE_WORKLOAD_SECRET:KEY,
  SUPABASE_URL:'https://fixture.supabase.co/',
  SUPABASE_PUBLISHABLE_KEY:'synthetic-publishable-key',
  SOCIAL_X_ARTICLE_TEST_ENABLED:'true',
  SOCIAL_X_PAID_WRITE_APPROVED:'true',
  SOCIAL_X_PAID_READ_APPROVED:'true',
  SOCIAL_X_TOKEN_ENCRYPTION_KEY:KEY,
  SOCIAL_X_OAUTH_CONNECT_ENABLED:'true',
  SOCIAL_OAUTH_CALLBACK_ENABLED:'true',
  SOCIAL_X_OAUTH_CLIENT_ID:'synthetic-x-client',
  SOCIAL_X_OAUTH_CLIENT_SECRET:'synthetic-x-secret',
};
function cipher(secret,kind='access') {
  const iv=randomBytes(12);
  const c=createCipheriv('aes-256-gcm', Buffer.from(KEY,'hex'), iv);
  c.setAAD(Buffer.from(JSON.stringify(['capital-social-x-v1',USER,kind])));
  const ciphertext = Buffer.concat([c.update(secret,'utf8'),c.final()]);
  return 'v1.'+[iv,c.getAuthTag(),ciphertext]
    .map(x=>x.toString('base64url')).join('.');
}
function response() {
  return {code:null,body:null,setHeader(){},writeHead(code){this.code=code;},end(data){this.data=data;}};
}
const json=(res,code,body)=>{res.code=code;res.body=body};
const url=endpoint=>'https://capital-ai.online/api/social-media/x/article-test'+endpoint;
const request=(method='POST')=>({method,headers:{origin:'https://capital-ai.online','sec-fetch-site':'same-origin'}});
function fixture({owner=true, flags={}, provider=null, expires=3600000, revoked=false}={}) {
  const calls=[], store=new Map();
  let cipherAccess=cipher('synthetic-ACCESS-OLD-TOKEN');
  let expiresAt=new Date(Date.now()+expires).toISOString();
  const auth={sameOrigin:()=>true, verify:async()=>owner?{userId:USER,emailVerified:true}:null,
    authorizeIamRole:async()=>owner,internalAccessToken:async()=> 'synthetic-jwt-'+'j'.repeat(80)};
  const edgeFactory=()=>({
    async invoke(op,data){
      calls.push(op);
      if(op==='x_credentials')return {accountId:ACCOUNT,handle:HANDLE,
        accessCipher:cipherAccess,expiresAt,leaseActive:false};
      if(op==='article_status')return store.has(data.contentKey)
        ? {found:true,...store.get(data.contentKey)}:{found:false,status:'NOT_SUBMITTED'};
      if(op==='article_claim'){
        if(store.has(data.contentKey)) return {claimed:false};
        store.set(data.contentKey,{status:'CLAIMED',articleId:null,postId:null});
        return {claimed:true};
      }
      if(op==='article_record'){
        const row=store.get(data.contentKey);
        row.status={draft:'DRAFTED',post:'POSTED',verify:'VERIFIED_PUBLISHED'}[data.stage];
        if(data.articleId)row.articleId=data.articleId;
        if(data.postId)row.postId=data.postId;
        return {recorded:true};
      }
      throw Error('unknown edge op '+op);
    },
    async refreshClaim(userId,leaseId){calls.push('refresh_claim');return {
      leaseId,refreshCipher:cipher('synthetic-REFRESH-OLD-TOKEN','refresh'),
      accountId:ACCOUNT,scopes:['tweet.read','tweet.write','users.read','offline.access']}},
    async refreshFinish(userId,leaseId,prev,access,refresh,expiry) {
      calls.push('refresh_finish');cipherAccess=access;expiresAt=expiry;
      return {refreshed:true,channel:'X',expiresAt:expiry}},
    async refreshEnd(){calls.push('refresh_end');return {channel:'X',status:'reconnect_required'}},
  });
  let draftCount=0, publishCount=0, readCount=0;
  const fetchImpl=async(uri,options)=>{
    const path=String(uri);
    if(provider) return provider(uri,options);
    if(path.endsWith('/2/oauth2/token'))return {ok:true,status:200,text:async()=>JSON.stringify({
      access_token:'synthetic-ACCESS-NEW-TOKEN',refresh_token:'synthetic-REFRESH-NEW-TOKEN',
      token_type:'bearer',expires_in:3600,scope:'tweet.read tweet.write users.read offline.access'})};
    if(path.endsWith('/2/users/me'))return {ok:true,status:200,text:async()=>JSON.stringify({data:{id:ACCOUNT}})};
    if(path.endsWith('/2/articles/draft')) {
      draftCount++;
      assert.equal(options.method,'POST');
      assert.deepEqual(JSON.parse(options.body),ARTICLE);
      return {ok:true,status:200,text:async()=>JSON.stringify({data:{id:'111111111111111'}})};
    }
    if(path.endsWith('/2/articles/111111111111111/publish')) {
      publishCount++;return {ok:true,status:200,text:async()=>JSON.stringify({data:{post_id:'222222222222222'}})};
    }
    if(path.includes('/2/tweets/222222222222222')){
      readCount++;return {ok:true,status:200,text:async()=>JSON.stringify({data:{
        id:'222222222222222',author_id:revoked?'9999':ACCOUNT,article:{id:'111111111111111'}}})};
    }
    throw Error('unexpected endpoint '+path);
  };
  const handler=createXArticleTest({env:{...ENV,...flags},auth,fetchImpl,edgeFactory});
  return {handler,calls,store,stats:()=>({draftCount,publishCount,readCount})};
}
test('single Article creates draft, publishes, verifies author and never repeats',async()=>{
  const f=fixture();
  const a=response();
  assert.equal(await f.handler.handle(request(),a,new URL(url('/publish')),json),true);
  assert.equal(a.code,200);
  assert.equal(a.body.status,'VERIFIED_PUBLISHED');
  assert.equal(a.body.url,'https://x.com/CapitalAIOnline/status/222222222222222');
  assert.deepEqual(f.stats(),{draftCount:1,publishCount:1,readCount:1});
  assert.equal(f.store.get(CONTENT_KEY).status,'VERIFIED_PUBLISHED');
  const again=response();
  await f.handler.handle(request(),again,new URL(url('/publish')),json);
  assert.equal(again.code,200);
  assert.equal(again.body.status,'VERIFIED_PUBLISHED');
  assert.equal(again.body.note,'existing_receipt_no_automatic_replay');
  assert.equal(again.body.retryPublish,false);
  assert.deepEqual(f.stats(),{draftCount:1,publishCount:1,readCount:1});
});
test('invalid owner and missing cost authorization cause zero Edge/provider calls',async()=>{
  const denied=fixture({owner:false}), r=response();
  await denied.handler.handle(request(),r,new URL(url('/publish')),json);
  assert.equal(r.code,403);assert.equal(denied.calls.length,0);
  const blocked=fixture({flags:{SOCIAL_X_PAID_WRITE_APPROVED:'false'}}), q=response();
  await blocked.handler.handle(request(),q,new URL(url('/publish')),json);
  assert.equal(q.code,403);assert.equal(blocked.calls.length,0);
});
test('ambiguous draft result remains permanently claimed, with no automatic replay',async()=>{
  let n=0;
  const f=fixture({provider:async()=>{n++;throw Error('timeout token-leak-hazard')}});
  const a=response();
  await f.handler.handle(request(),a,new URL(url('/publish')),json);
  assert.equal(a.code,503);
  assert.equal(a.body.retryPublish,false);
  assert.ok(!JSON.stringify(a.body).includes('token-leak'));
  const again=response();
  await f.handler.handle(request(),again,new URL(url('/publish')),json);
  assert.equal(again.code,409);
  assert.equal(n,1);
  assert.equal(f.store.get(CONTENT_KEY).status,'CLAIMED');
});
test('wrong author stays POSTED and never gets VERIFIED_PUBLISHED',async()=>{
  const f=fixture({revoked:true});
  const a=response();
  await f.handler.handle(request(),a,new URL(url('/publish')),json);
  assert.equal(a.code,503);
  assert.equal(a.body.error,'x_post_readback_mismatch');
  assert.equal(f.store.get(CONTENT_KEY).status,'POSTED');
  assert.equal(f.stats().publishCount,1);
});
test('expired X access token renews through lease/CAS automatically before draft',async()=>{
  const f=fixture({expires:-3600000});
  const a=response();
  await f.handler.handle(request(),a,new URL(url('/publish')),json);
  assert.equal(a.code,200);
  assert.equal(a.body.refreshed,true);
  assert.ok(f.calls.includes('refresh_claim'));
  assert.ok(f.calls.includes('refresh_finish'));
  assert.equal(f.stats().draftCount,1);
});
