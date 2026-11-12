import test from 'node:test';
import assert from 'node:assert/strict';
import { createDecipheriv } from 'node:crypto';
import { createInstagramFacebookStart } from './instagram-oauth-start.mjs';
import { createInstagramFacebookExchange,instagramFacebookConfigured,
  INSTAGRAM_FACEBOOK_SCOPES } from './instagram-oauth-exchange.mjs';
import { createInstagramFacebookStatus } from './instagram-account-status.mjs';
import { createSocialOAuthCallback } from './oauth-callback.mjs';
const USER='d0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
const OTHER='a1bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
const IG='17841400000000001',PAGE='12345678901234',STATE='s'.repeat(43),KEY='cd'.repeat(32);
const CALLBACK='https://capital-ai.online/api/social-media/auth/callback';
const env={PUBLIC_APP_ORIGIN:'https://capital-ai.online/',
  SOCIAL_OAUTH_CALLBACK_ENABLED:'true',SOCIAL_INSTAGRAM_OAUTH_CONNECT_ENABLED:'true',
  SOCIAL_INSTAGRAM_OAUTH_APP_ID:'1234567890', SOCIAL_INSTAGRAM_OAUTH_APP_SECRET:'synthetic-application-secret',
  SOCIAL_INSTAGRAM_TOKEN_ENCRYPTION_KEY:KEY, SOCIAL_META_GRAPH_API_VERSION:'v26.0',
  SOCIAL_INSTAGRAM_EXPECTED_ACCOUNT_ID:IG,SOCIAL_INSTAGRAM_EXPECTED_PAGE_ID:PAGE,
  SUPABASE_URL:'https://fixture.supabase.co/',SUPABASE_SECRET_KEY:'sb_secret_synthetic'};
const trusted={userId:USER,channel:'INSTAGRAM',code:'synthetic-auth-code',redirectUri:CALLBACK};
const owner={verify:async()=>({userId:USER,emailVerified:true}),
  authorizeIamRole:async()=>true};
function response(x,status=200){return{ok:status>=200&&status<300,text:async()=>JSON.stringify(x)};}
function res(){return{status:null,body:null,headers:{},setHeader(k,v){this.headers[k]=v;},
  getHeader(k){return this.headers[k];},writeHead(s,h={}){this.status=s;Object.assign(this.headers,h);},
  end(x){this.body=x??'';}};}
const json=(r,s,b)=>{r.status=s;r.body=b;};
function req(cookie='',method='GET',fetchSite='same-origin'){return{method,headers:{cookie,'sec-fetch-site':fetchSite}};}
function url(path,search=''){return new URL(path+search,'https://capital-ai.online');}
const start='/api/social-media/instagram/auth/start';
const cb='/api/social-media/auth/callback';
const status='/api/social-media/instagram/account/status';
const complete='pages_show_list instagram_basic instagram_content_publish pages_read_engagement';
function flow({userDebug={},pageDebug={},pageBound={},pages,perms,editRow=x=>x}={}) {
  const records=[];
  const now=Math.floor(Date.now()/1000);
  const answers=[
    {access_token:'short-lived-user-token',token_type:'bearer'},
    {access_token:'long-lived-user-token',token_type:'bearer'},
    {data:{is_valid:true,app_id:env.SOCIAL_INSTAGRAM_OAUTH_APP_ID,type:'USER',
      user_id:'555123456',expires_at:now+6000,scopes:INSTAGRAM_FACEBOOK_SCOPES,...userDebug}},
    perms??{data:INSTAGRAM_FACEBOOK_SCOPES.map(permission=>({permission,status:'granted'}))},
    pages??{data:[{id:PAGE,name:'Synthetic Page',
      tasks:['PROFILE_PLUS_CREATE_CONTENT'],
      instagram_business_account:{id:IG,username:'synthetic.instagram'},
      access_token:'synthetic-page-token-1234'}]},
    {data:{is_valid:true,app_id:env.SOCIAL_INSTAGRAM_OAUTH_APP_ID,
      type:'PAGE',profile_id:PAGE,expires_at:0,...pageDebug}},
    {id:PAGE,instagram_business_account:{id:IG,username:'synthetic.instagram'},...pageBound},
  ];
  async function fetchImpl(target,init){
    records.push({url:String(target),init});
    const n=records.length-1;
    if(n<7)return response(answers[n]);
    if(n===7)return response([editRow(JSON.parse(init.body))]);
    throw Error('unexpected network call');
  }
  return{fetchImpl,records};
}
test('Instagram OAuth config must be explicit, secret key canonical, scope family strictly Facebook',()=>{
  assert.equal(instagramFacebookConfigured({}),false);
  assert.equal(instagramFacebookConfigured(env),true);
  assert.deepEqual(INSTAGRAM_FACEBOOK_SCOPES,complete.split(' '));
  for(const key of ['SOCIAL_INSTAGRAM_OAUTH_CONNECT_ENABLED','SOCIAL_OAUTH_CALLBACK_ENABLED',
    'SOCIAL_INSTAGRAM_OAUTH_APP_SECRET','SOCIAL_INSTAGRAM_TOKEN_ENCRYPTION_KEY',
    'SOCIAL_META_GRAPH_API_VERSION','SUPABASE_SECRET_KEY']){
    const e={...env};delete e[key];assert.equal(instagramFacebookConfigured(e),false,key);
  }
  assert.equal(instagramFacebookConfigured({...env,PUBLIC_APP_ORIGIN:'http://example.com/'}),false);
  assert.equal(instagramFacebookConfigured({...env,
    SOCIAL_INSTAGRAM_TOKEN_ENCRYPTION_KEY:'weak'}),false);
  assert.equal(instagramFacebookConfigured({...env,
    SOCIAL_INSTAGRAM_TOKEN_ENCRYPTION_KEY:Buffer.from(KEY,'hex').toString('base64')}),true);
});
test('same-origin owner-only start binds DB state, callback, scopes and browser cookie',async()=>{
  const calls=[];
  const startHandler=createInstagramFacebookStart({env,auth:owner,
    store:{beginOAuth:async input=>{calls.push(input);return{state:STATE};}}});
  const r=res();
  await startHandler.handle(req(),r,url(start),json);
  assert.equal(r.status,303);
  assert.equal(calls.length,1);
  assert.deepEqual(calls[0].allowedRedirectUris,[CALLBACK]);
  assert.equal(calls[0].channel,'INSTAGRAM');
  assert.equal(calls[0].userId,USER);
  const redirect=new URL(r.headers.Location);
  assert.equal(redirect.origin,'https://www.facebook.com');
  assert.equal(redirect.searchParams.get('state'),STATE);
  assert.equal(redirect.searchParams.get('redirect_uri'),CALLBACK);
  assert.deepEqual(redirect.searchParams.get('scope').split(','),INSTAGRAM_FACEBOOK_SCOPES);
  assert.match(String(r.headers['Set-Cookie']),/HttpOnly; Secure; SameSite=Lax; Max-Age=600/);
  assert.doesNotMatch(JSON.stringify(r),/synthetic-application-secret|sb_secret_/);
  for(const [request,target,code] of [
    [req('','POST'),url(start),405],
    [req('','GET','cross-site'),url(start),403],
    [req(),url(start,'?redirect_uri=https://evil.example'),403],
  ]){const next=res();await startHandler.handle(request,next,target,json);assert.equal(next.status,code);}
  assert.equal(calls.length,1);
});
test('start denies strangers and misconfigured service before creating state',async()=>{
  let calls=0;
  for(const auth of [{verify:async()=>null,authorizeIamRole:async()=>false},
    {verify:async()=>({userId:USER,emailVerified:true}),authorizeIamRole:async()=>false},
    {verify:async()=>({userId:USER,emailVerified:false}),authorizeIamRole:async()=>true}]){
    const handler=createInstagramFacebookStart({env,auth,store:{beginOAuth:async()=>{calls++;return{state:STATE};}}});
    const r=res();await handler.handle(req(),r,url(start),json);assert.equal(r.status,403);
  }
  const handler=createInstagramFacebookStart({env:{...env,SOCIAL_INSTAGRAM_OAUTH_APP_SECRET:''},auth:owner,
    store:{beginOAuth:async()=>{calls++;}}});
  const r=res();await handler.handle(req(),r,url(start),json);
  assert.equal(r.status,503);assert.equal(calls,0);
});
test('Meta flow verifies USER and PAGE token types, exact Page tasks, scopes, IG identity and ciphertext readback',async()=>{
  const m=flow();
  const result=await createInstagramFacebookExchange({env,fetchImpl:m.fetchImpl})(trusted);
  assert.deepEqual(result,{connected:true,channel:'INSTAGRAM',handle:'synthetic.instagram'});
  assert.equal(m.records.length,8);
  assert.ok(m.records[0].url.endsWith('/oauth/access_token'));
  assert.equal(m.records[0].init.method,'POST');
  assert.equal(m.records[1].init.method,'POST');
  assert.ok(m.records[2].url.endsWith('/debug_token'));
  assert.match(m.records[4].url,/\/me\/accounts\?/);
  assert.ok(m.records[7].url.includes('on_conflict=user_id%2Cplatform'));
  assert.match(m.records[6].url, /fields=id,instagram_business_account/);
  const row=JSON.parse(m.records[7].init.body);
  assert.equal(row.user_id,USER);
  assert.equal(row.platform,'instagram');assert.equal(row.external_account_id,IG);
  assert.equal(row.refresh_token_encrypted,null);
  assert.notEqual(row.access_token_encrypted,'synthetic-page-token-1234');
  const [ver,iv,tag,data]=row.access_token_encrypted.split('.');
  assert.equal(ver,'v1');
  const d=createDecipheriv('aes-256-gcm',Buffer.from(KEY,'hex'),Buffer.from(iv,'base64url'));
  d.setAAD(Buffer.from(JSON.stringify(['capital-social-instagram-page-v1',USER,IG])));
  d.setAuthTag(Buffer.from(tag,'base64url'));
  assert.equal(Buffer.concat([d.update(Buffer.from(data,'base64url')),d.final()]).toString(),
    'synthetic-page-token-1234');
  assert.ok(!JSON.stringify(result).includes('token'));
});
test('Meta account response is rejected if scope, USER app, PAGE token or task/IG relation differs',async()=>{
  const invalid=[
    flow({userDebug:{app_id:'different-app'}}),
    flow({userDebug:{type:'PAGE'}}),
    flow({userDebug:{scopes:['instagram_basic']}}),
    flow({pageDebug:{type:'USER'}}),
    flow({pageBound:{id:'9999'}}),
    flow({perms:{data:[{permission:'instagram_basic',status:'granted'}]}}),
    flow({pages:{data:[{id:PAGE,name:'Page',tasks:['ANALYZE'],
      instagram_business_account:{id:IG,username:'synth'},access_token:'synthetic-page-token-1234'}]}}),
    flow({pages:{data:[{id:PAGE,name:'Page',tasks:['CREATE_CONTENT'],
      instagram_business_account:{id:'999',username:'synth'},access_token:'synthetic-page-token-1234'}]}}),
    flow({pages:{data:[],paging:{next:'https://graph.facebook.com/another-page'}}}),
    flow({pages:{data:[{id:PAGE,tasks:['CREATE_CONTENT'],
      instagram_business_account:{id:IG,username:'synth'},access_token:'synthetic-page-token-1234'},
      {id:PAGE,tasks:['CREATE_CONTENT'],instagram_business_account:{id:IG,username:'other'},access_token:'synthetic-page-token-1234'}]}}),
  ];
  for(const m of invalid){
    await assert.rejects(createInstagramFacebookExchange({env,fetchImpl:m.fetchImpl})(trusted));
    assert.ok(m.records.length<=7,'bad provider identity was persisted');
  }
});
test('no provider writes for wrong channel, forged user, redirect, disabled flag or token family',async()=>{
  let calls=0;
  const exchange=createInstagramFacebookExchange({env,fetchImpl:async()=>{calls++;throw Error('network');}});
  for(const mutation of [{channel:'INSTAGRAM_LOGIN'},{userId:OTHER,redirectUri:'https://evil.example'},
    {redirectUri:'https://evil.example/callback'},{code:''}]){
    const t={...trusted,...mutation};
    if(mutation.userId===OTHER) t.redirectUri='https://evil.example';
    await assert.rejects(exchange(t));
  }
  assert.equal(calls,0);
  await assert.rejects(createInstagramFacebookExchange({env:{...env,SOCIAL_INSTAGRAM_OAUTH_CONNECT_ENABLED:'false'},
    fetchImpl:async()=>{calls++;}})(trusted));
  assert.equal(calls,0);
});
test('forged Supabase upsert response does not produce a connected claim',async()=>{
  for(const editRow of [r=>({...r,user_id:OTHER}),r=>({...r,external_account_id:'999'}),
    r=>({...r,access_token_encrypted:'forged'})]){
    const m=flow({editRow});
    await assert.rejects(createInstagramFacebookExchange({env,fetchImpl:m.fetchImpl})(trusted),
      /SOCIAL_IG_PERSIST_READBACK_FAILED/);
    assert.equal(m.records.length,8);
  }
});
test('browser cookie plus persisted one-shot state protect owner callback and success redirects only to Instagram',async()=>{
  let used=false,exchanges=0;
  const store={consumeOAuthCallback:async input=>{
    if(used)throw Error('SOCIAL_OAUTH_CONSUME_NOT_CONFIRMED');
    assert.equal(input.channel,'INSTAGRAM');assert.equal(input.userId,USER);
    used=true;
    assert.equal(input.redirectUri,CALLBACK);
    await input.exchangeCode({...trusted});
    return{consumed:true,platform:'instagram'};
  }};
  const handler=createSocialOAuthCallback({env,auth:owner,store,
    exchangeCode:async t=>{exchanges++;assert.equal(t.channel,'INSTAGRAM');}});
  const query='?state='+STATE+'&code=synthetic';
  for(const [request,querySuffix,expected] of [
    [req(),query,400],
    [req('capital_instagram_oauth_state='+'a'.repeat(43)),query,400],
    [req('capital_instagram_oauth_state='+STATE),query+'&channel=X',503],
  ]) {const r=res();await handler.handle(request,r,url(cb,querySuffix),json);
    assert.equal(r.status,expected);}
  assert.equal(exchanges,0);assert.equal(used,false);
  const r=res();await handler.handle(req('capital_instagram_oauth_state='+STATE),r,url(cb,query),json);
  assert.equal(r.status,303);
  assert.equal(r.headers.Location,status);
  assert.match(r.headers['Set-Cookie'][0],/Max-Age=0/);
  assert.equal(exchanges,1);
  const replay=res();await handler.handle(req('capital_instagram_oauth_state='+STATE),replay,url(cb,query),json);
  assert.equal(replay.status,503);assert.equal(exchanges,1);
});
test('Instagram callback denies non-owner before consuming a state',async()=>{
  let used=0;
  const handler=createSocialOAuthCallback({env,
    auth:{verify:async()=>({userId:USER,emailVerified:true}),authorizeIamRole:async()=>false},
    store:{consumeOAuthCallback:async()=>{used++;}},exchangeCode:async()=>{used++;}});
  const r=res();await handler.handle(req('capital_instagram_oauth_state='+STATE),r,
    url(cb,'?channel=INSTAGRAM&state='+STATE+'&code=synthetic'),json);
  assert.equal(r.status,403);assert.equal(used,0);
});
test('status endpoint never selects/returns tokens or another tenant account',async()=>{
  const calls=[];
  const service=async(target,init)=>{calls.push({url:String(target),init});
    return response([{user_id:USER,platform:'instagram',status:'connected',
      token_expires_at:new Date(Date.now()+7200000).toISOString(),scopes:INSTAGRAM_FACEBOOK_SCOPES}]);};
  const handler=createInstagramFacebookStatus({env,auth:owner,fetchImpl:service});
  const r=res();await handler.handle(req(),r,url(status),json);
  assert.equal(r.status,200);assert.equal(r.body.connected,true);
  assert.equal(r.body.channel,'INSTAGRAM');
  assert.deepEqual(r.body.scopes,INSTAGRAM_FACEBOOK_SCOPES);
  assert.ok(!calls[0].url.includes('access_token_encrypted'));
  assert.ok(!calls[0].url.includes('refresh_token_encrypted'));
  assert.ok(!JSON.stringify(r.body).includes('synthetic-application-secret'));
  const foreign=createInstagramFacebookStatus({env,auth:owner,fetchImpl:async()=>response([{
    user_id:OTHER,platform:'instagram',status:'connected'}])});
  const rr=res();await foreign.handle(req(),rr,url(status),json);assert.equal(rr.status,503);
  const denied=createInstagramFacebookStatus({env,
    auth:{verify:async()=>({userId:USER,emailVerified:true}),authorizeIamRole:async()=>false},
    fetchImpl:async()=>{throw Error('should not call');}});
  const rd=res();await denied.handle(req(),rd,url(status),json);assert.equal(rd.status,403);
});
