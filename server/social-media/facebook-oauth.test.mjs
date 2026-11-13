import test from 'node:test';
import assert from 'node:assert/strict';
import { createDecipheriv } from 'node:crypto';
import { createFacebookPageStart } from './facebook-oauth-start.mjs';
import { createFacebookPageExchange, facebookPageConfigured, FACEBOOK_PAGE_SCOPES } from './facebook-oauth-exchange.mjs';
import { createFacebookPageStatus } from './facebook-account-status.mjs';
import { createSocialOAuthCallback } from './oauth-callback.mjs';

const USER='d0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
const OTHER='a1bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
const PAGE='12345678901234',STATE='s'.repeat(43),KEY='ab'.repeat(32);
const CALLBACK='https://capital-ai.online/api/social-media/auth/callback';
const START='/api/social-media/facebook/auth/start';
const STATUS='/api/social-media/facebook/account/status';
const env={PUBLIC_APP_ORIGIN:'https://capital-ai.online/',SOCIAL_OAUTH_CALLBACK_ENABLED:'true',
  SOCIAL_FACEBOOK_OAUTH_CONNECT_ENABLED:'true',
  SOCIAL_INSTAGRAM_OAUTH_APP_ID:'1234567890',
  SOCIAL_INSTAGRAM_OAUTH_APP_SECRET:'synthetic-only-meta-secret',
  SOCIAL_META_GRAPH_API_VERSION:'v26.0',
  SOCIAL_FACEBOOK_EXPECTED_PAGE_ID:PAGE,SOCIAL_FACEBOOK_TOKEN_ENCRYPTION_KEY:KEY,
  SUPABASE_URL:'https://fixture.supabase.co/',SUPABASE_SECRET_KEY:'sb_secret_synthetic'};
const trusted={userId:USER,channel:'FACEBOOK',code:'synthetic-code',redirectUri:CALLBACK};
const owner={verify:async()=>({userId:USER,emailVerified:true}),authorizeIamRole:async()=>true};
const json=(res,status,body)=>{res.status=status;res.body=body;};
function res(){return {status:null,body:null,headers:{},
  setHeader(k,v){this.headers[k]=v;},getHeader(k){return this.headers[k];},
  writeHead(s,h={}){this.status=s;Object.assign(this.headers,h);},
  end(value){this.body=value??'';}};}
function req(cookie='',method='GET',site='same-origin'){
  return {method,headers:{cookie,'sec-fetch-site':site}};}
function url(path,query=''){return new URL(path+query,'https://capital-ai.online');}
function response(payload,status=200){return{ok:status>=200&&status<300,text:async()=>JSON.stringify(payload)};}
function flow({userDebug={},pageDebug={},pageBound={},perms,pages,editRow=x=>x}={}){
  const calls=[],now=Math.floor(Date.now()/1000);
  const answers=[
    {access_token:'short-lived-user-token',token_type:'bearer'},
    {access_token:'long-lived-user-token',token_type:'bearer'},
    {data:{is_valid:true,app_id:env.SOCIAL_INSTAGRAM_OAUTH_APP_ID,type:'USER',
      user_id:'987654321',expires_at:now+6000,scopes:FACEBOOK_PAGE_SCOPES,...userDebug}},
    perms??{data:FACEBOOK_PAGE_SCOPES.map(permission=>({permission,status:'granted'}))},
    pages??{data:[{id:PAGE,name:'Synthetic Capital-AI Page',
      tasks:['CREATE_CONTENT'],access_token:'synthetic-page-token-1234'}]},
    {data:{is_valid:true,app_id:env.SOCIAL_INSTAGRAM_OAUTH_APP_ID,type:'PAGE',
      profile_id:PAGE,expires_at:0,scopes:FACEBOOK_PAGE_SCOPES,...pageDebug}},
    {id:PAGE,name:'Synthetic Capital-AI Page',...pageBound},
  ];
  const fetchImpl=async(target,init)=>{
    calls.push({url:String(target),init});
    if(calls.length<=7)return response(answers[calls.length-1]);
    if(calls.length===8)return response([editRow(JSON.parse(init.body))]);
    throw Error('Unexpected outbound call');
  };
  return {fetchImpl,calls};
}

test('Facebook config requires separate opt-in, a pinned Page, and a distinct strong key',()=>{
  assert.equal(facebookPageConfigured({}),false);
  assert.equal(facebookPageConfigured(env),true);
  assert.deepEqual(FACEBOOK_PAGE_SCOPES,['pages_show_list','pages_read_engagement','pages_manage_posts']);
  assert.ok(!FACEBOOK_PAGE_SCOPES.includes('instagram_content_publish'));
  for(const key of ['SOCIAL_FACEBOOK_OAUTH_CONNECT_ENABLED','SOCIAL_OAUTH_CALLBACK_ENABLED',
    'SOCIAL_FACEBOOK_TOKEN_ENCRYPTION_KEY','SOCIAL_FACEBOOK_EXPECTED_PAGE_ID',
    'SOCIAL_INSTAGRAM_OAUTH_APP_SECRET','SOCIAL_META_GRAPH_API_VERSION','SUPABASE_SECRET_KEY']){
    const next={...env};delete next[key];assert.equal(facebookPageConfigured(next),false,key);
  }
  assert.equal(facebookPageConfigured({...env,PUBLIC_APP_ORIGIN:'http://example.com/'}),false);
  assert.equal(facebookPageConfigured({...env,SOCIAL_FACEBOOK_EXPECTED_PAGE_ID:'invalid'}),false);
  assert.equal(facebookPageConfigured({...env,SOCIAL_FACEBOOK_TOKEN_ENCRYPTION_KEY:'weak'}),false);
  assert.equal(facebookPageConfigured({...env,SOCIAL_FACEBOOK_TOKEN_ENCRYPTION_KEY:Buffer.from(KEY,'hex').toString('base64')}),true);
});
test('owner-only OAuth start emits one Facebook consent state and Secure SameSite cookie',async()=>{
  const states=[];
  const service=createFacebookPageStart({env,auth:owner,store:{
    beginOAuth:async input=>{states.push(input);return {state:STATE};}}});
  const r=res();await service.handle(req(),r,url(START),json);
  assert.equal(r.status,303);
  assert.equal(states.length,1);
  assert.equal(states[0].userId,USER);
  assert.equal(states[0].channel,'FACEBOOK');
  assert.deepEqual(states[0].allowedRedirectUris,[CALLBACK]);
  const target=new URL(r.headers.Location);
  assert.equal(target.origin,'https://www.facebook.com');
  assert.equal(target.searchParams.get('redirect_uri'),CALLBACK);
  assert.equal(target.searchParams.get('state'),STATE);
  assert.deepEqual(target.searchParams.get('scope').split(','),FACEBOOK_PAGE_SCOPES);
  assert.match(String(r.headers['Set-Cookie']),/capital_facebook_oauth_state=.*HttpOnly; Secure; SameSite=Lax; Max-Age=600/);
  assert.ok(!JSON.stringify(r).includes('synthetic-only-meta-secret'));
  for(const [request,targetUrl,expected] of [
    [req('','POST'),url(START),405],
    [req('','GET','cross-site'),url(START),403],
    [req(),url(START,'?page_id=evil'),403]]){
    const next=res();await service.handle(request,next,targetUrl,json);assert.equal(next.status,expected);
  }
  assert.equal(states.length,1);
});
test('unauthorized, unverified or misconfigured start never issues OAuth state',async()=>{
  let calls=0;
  for(const auth of [
    {verify:async()=>null,authorizeIamRole:async()=>false},
    {verify:async()=>({userId:USER,emailVerified:false}),authorizeIamRole:async()=>true},
    {verify:async()=>({userId:USER,emailVerified:true}),authorizeIamRole:async()=>false}]){
    const s=createFacebookPageStart({env,auth,store:{beginOAuth:async()=>{calls++;}}});
    const r=res();await s.handle(req(),r,url(START),json);assert.equal(r.status,403);
  }
  const s=createFacebookPageStart({env:{...env,SOCIAL_FACEBOOK_OAUTH_CONNECT_ENABLED:'false'},
    auth:owner,store:{beginOAuth:async()=>{calls++;}}});
  const r=res();await s.handle(req(),r,url(START),json);
  assert.equal(r.status,503);assert.equal(calls,0);
});
test('realistic mocked Meta exchange validates Page grant and persists bound ciphertext only',async()=>{
  const f=flow();
  const result=await createFacebookPageExchange({env,fetchImpl:f.fetchImpl})(trusted);
  assert.deepEqual(result,{connected:true,channel:'FACEBOOK'});
  assert.equal(f.calls.length,8);
  assert.ok(f.calls.slice(0,7).every(x=>new URL(x.url).origin==='https://graph.facebook.com'));
  assert.ok(f.calls[4].url.includes('/me/accounts?fields=id,name,tasks,access_token'));
  assert.ok(f.calls[6].url.includes('/'+PAGE+'?fields=id,name'));
  const row=JSON.parse(f.calls[7].init.body);
  assert.equal(row.platform,'facebook');assert.equal(row.user_id,USER);
  assert.equal(row.external_account_id,PAGE);assert.equal(row.handle,null);
  assert.deepEqual(row.scopes,FACEBOOK_PAGE_SCOPES);
  assert.equal(row.refresh_token_encrypted,null);
  assert.notEqual(row.access_token_encrypted,'synthetic-page-token-1234');
  const [version,iv,tag,data]=row.access_token_encrypted.split('.');
  assert.equal(version,'v1');
  const dec=createDecipheriv('aes-256-gcm',Buffer.from(KEY,'hex'),Buffer.from(iv,'base64url'));
  dec.setAAD(Buffer.from(JSON.stringify(['capital-social-facebook-page-v1',USER,'FACEBOOK',PAGE])));
  dec.setAuthTag(Buffer.from(tag,'base64url'));
  assert.equal(Buffer.concat([dec.update(Buffer.from(data,'base64url')),dec.final()]).toString(),'synthetic-page-token-1234');
  const cross=createDecipheriv('aes-256-gcm',Buffer.from(KEY,'hex'),Buffer.from(iv,'base64url'));
  cross.setAAD(Buffer.from(JSON.stringify(['capital-social-facebook-page-v1',OTHER,'FACEBOOK',PAGE])));
  cross.setAuthTag(Buffer.from(tag,'base64url'));
  assert.throws(()=>Buffer.concat([cross.update(Buffer.from(data,'base64url')),cross.final()]));
});
test('missing Page tasks, scopes, wrong app/token/Page, and ambiguous Pages fail before DB write',async()=>{
  const expired=Math.floor(Date.now()/1000)-120;
  const invalid=[
    flow({userDebug:{app_id:'wrong-app'}}),
    flow({userDebug:{type:'PAGE'}}),
    flow({userDebug:{expires_at:expired}}),
    flow({userDebug:{data_access_expires_at:expired}}),
    flow({userDebug:{scopes:['pages_show_list']}}),
    flow({perms:{data:[{permission:'pages_manage_posts',status:'declined'}]}}),
    flow({pages:{data:[{id:PAGE,name:'Synthetic Capital-AI Page',tasks:['ANALYZE'],
      access_token:'synthetic-page-token-1234'}]}}),
    flow({pages:{data:[{id:'9999',name:'Wrong Page',tasks:['CREATE_CONTENT'],
      access_token:'synthetic-page-token-1234'}]}}),
    flow({pages:{data:[],paging:{next:'https://graph.facebook.com/extra'}}}),
    flow({pages:{data:[{id:PAGE,name:'Synthetic Capital-AI Page',tasks:['CREATE_CONTENT'],
      access_token:'synthetic-page-token-1234'},{id:PAGE,name:'Synthetic Capital-AI Page',
      tasks:['CREATE_CONTENT'],access_token:'synthetic-page-token-1234'}]}}),
    flow({pageDebug:{type:'USER'}}),
    flow({pageDebug:{app_id:'other-app'}}),
    flow({pageDebug:{profile_id:'9999'}}),
    flow({pageDebug:{scopes:['pages_show_list']}}),
    flow({pageDebug:{expires_at:expired}}),
    flow({pageBound:{id:'9999'}}),
    flow({userDebug:{granular_scopes:[{scope:'pages_manage_posts',target_ids:['9999']}]}}),
  ];
  for(const f of invalid){
    await assert.rejects(createFacebookPageExchange({env,fetchImpl:f.fetchImpl})(trusted));
    assert.ok(f.calls.length<=7,'invalid Page reached database');
  }
});
test('wrong channel, redirect, code or disabled flag cannot contact Meta',async()=>{
  let calls=0;
  const fetchImpl=async()=>{calls++;throw Error('unexpected call');};
  for(const invalid of [
    {...trusted,channel:'INSTAGRAM'},
    {...trusted,channel:'FACEBOOK_LOGIN'},
    {...trusted,redirectUri:'https://evil.example/callback'},
    {...trusted,code:''}]){
    await assert.rejects(createFacebookPageExchange({env,fetchImpl})(invalid));
  }
  await assert.rejects(createFacebookPageExchange({
    env:{...env,SOCIAL_FACEBOOK_OAUTH_CONNECT_ENABLED:'false'},fetchImpl})(trusted));
  assert.equal(calls,0);
});
test('forged or cross-user database readback cannot mark Facebook connected',async()=>{
  for(const editRow of [
    x=>({...x,user_id:OTHER}),x=>({...x,platform:'instagram'}),
    x=>({...x,external_account_id:'9999'}),
    x=>({...x,access_token_encrypted:'forged'}),
    x=>({...x,scopes:['pages_show_list']})]){
    const f=flow({editRow});
    await assert.rejects(createFacebookPageExchange({env,fetchImpl:f.fetchImpl})(trusted),
      /SOCIAL_FB_PERSIST_READBACK_FAILED/);
    assert.equal(f.calls.length,8);
  }
});
test('Meta grant and account validity cannot exceed earliest data-access expiry',async()=>{
  const dataExpires=Math.floor(Date.now()/1000)+180;
  const f=flow({userDebug:{data_access_expires_at:dataExpires}});
  await createFacebookPageExchange({env,fetchImpl:f.fetchImpl})(trusted);
  const row=JSON.parse(f.calls[7].init.body);
  assert.ok(Date.parse(row.token_expires_at)<=dataExpires*1000);
  assert.ok(Date.parse(row.token_expires_at)>Date.now()+60000);
});
test('callback validates independent cookie, platform binding and single use',async()=>{
  let used=false,exchanges=0;
  const store={consumeOAuthCallback:async input=>{
    if(input.channel!=='FACEBOOK')throw Error('wrong channel');
    if(used)throw Error('SOCIAL_OAUTH_CONSUME_NOT_CONFIRMED');
    assert.equal(input.userId,USER);
    assert.equal(input.redirectUri,CALLBACK);
    used=true;
    await input.exchangeCode(trusted);
    return{consumed:true,platform:'facebook'};
  }};
  const cb=createSocialOAuthCallback({env,auth:owner,store,
    exchangeCode:async x=>{exchanges++;assert.equal(x.channel,'FACEBOOK');}});
  const query='?state='+STATE+'&code=synthetic';
  for(const [request,params,expected] of [
    [req(),query+'&channel=FACEBOOK',400],
    [req('capital_facebook_oauth_state='+'a'.repeat(43)),query+'&channel=FACEBOOK',400],
    [req('capital_facebook_oauth_state='+STATE),query+'&channel=X',400],
    [req('capital_facebook_oauth_state='+STATE+'; capital_instagram_oauth_state='+STATE),query,400],
    [req('capital_facebook_oauth_state='+STATE),query+'&state='+STATE,400],
    [req('capital_facebook_oauth_state='+STATE),query+'&code=duplicate',400]
  ]){
    const r=res();await cb.handle(request,r,url('/api/social-media/auth/callback',params),json);
    assert.equal(r.status,expected);
  }
  assert.equal(exchanges,0);
  const first=res();
  await cb.handle(req('capital_facebook_oauth_state='+STATE),first,url('/api/social-media/auth/callback',query),json);
  assert.equal(first.status,303);
  assert.equal(first.headers.Location,STATUS);
  assert.match(String(first.headers['Set-Cookie']),/Max-Age=0/);
  assert.equal(exchanges,1);
  const second=res();
  await cb.handle(req('capital_facebook_oauth_state='+STATE),second,url('/api/social-media/auth/callback',query),json);
  assert.equal(second.status,503);assert.equal(exchanges,1);
});
test('callback rejects non-owner before state consumption',async()=>{
  let calls=0;
  const cb=createSocialOAuthCallback({env,
    auth:{verify:async()=>({userId:USER,emailVerified:true}),authorizeIamRole:async()=>false},
    store:{consumeOAuthCallback:async()=>{calls++;}},exchangeCode:async()=>{calls++;}});
  const r=res();
  await cb.handle(req('capital_facebook_oauth_state='+STATE),r,
    url('/api/social-media/auth/callback','?state='+STATE+'&code=synthetic'),json);
  assert.equal(r.status,403);assert.equal(calls,0);
});
test('Facebook account status is token-free, owner-only and page-bound',async()=>{
  const calls=[];
  const fetchImpl=async(target)=>{calls.push(String(target));return response([{
    user_id:USER,platform:'facebook',external_account_id:PAGE,status:'connected',
    scopes:FACEBOOK_PAGE_SCOPES,token_expires_at:new Date(Date.now()+600000).toISOString()}]);};
  const endpoint=createFacebookPageStatus({env,auth:owner,fetchImpl});
  const r=res();await endpoint.handle(req(),r,url(STATUS),json);
  assert.equal(r.status,200);assert.equal(r.body.connected,true);
  assert.deepEqual(r.body.scopes,FACEBOOK_PAGE_SCOPES);
  assert.ok(!calls[0].includes('access_token_encrypted'));
  assert.ok(!calls[0].includes('refresh_token_encrypted'));
  assert.ok(!JSON.stringify(r.body).includes(PAGE));
  const bad=createFacebookPageStatus({env,auth:owner,fetchImpl:async()=>response([{
    user_id:USER,platform:'facebook',external_account_id:'9999',status:'connected',
    scopes:FACEBOOK_PAGE_SCOPES,token_expires_at:new Date(Date.now()+600000).toISOString()}])});
  const rr=res();await bad.handle(req(),rr,url(STATUS),json);
  assert.equal(rr.body.connected,false);assert.equal(rr.body.status,'page_mismatch');
  const foreign=createFacebookPageStatus({env,auth:owner,fetchImpl:async()=>response([{
    user_id:OTHER,platform:'facebook'}])});
  const rf=res();await foreign.handle(req(),rf,url(STATUS),json);assert.equal(rf.status,503);
  const denied=createFacebookPageStatus({env,
    auth:{verify:async()=>({userId:USER,emailVerified:true}),authorizeIamRole:async()=>false},
    fetchImpl:async()=>{throw Error('must not read DB');}});
  const rd=res();await denied.handle(req(),rd,url(STATUS),json);assert.equal(rd.status,403);
});
