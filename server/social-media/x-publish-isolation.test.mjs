import test from 'node:test';
import assert from 'node:assert/strict';
import { createDecipheriv, createCipheriv, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createSocialXOAuthStart } from './x-oauth-start.mjs';
import { createSocialOAuthCallback } from './oauth-callback.mjs';
import { createSocialXOAuthExchange, socialXOAuthConfigured } from './x-oauth-exchange.mjs';
import { createXPublishAccountStatus } from './x-publish-account-status.mjs';
import { unsealOwnerXAccess, refreshOwnerXForWorkload } from './owner-token-refresh.mjs';

const USER = 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
const KEY_OLD = 'ab'.repeat(32), KEY_NEW = 'cd'.repeat(32);
const CALLBACK = 'https://capital-ai.online/api/social-media/x/publish/auth/callback';
const ENV = {
  PUBLIC_APP_ORIGIN: 'https://capital-ai.online/',
  SOCIAL_OAUTH_CALLBACK_ENABLED: 'true',
  SOCIAL_X_OAUTH_CONNECT_ENABLED: 'true',
  SOCIAL_X_OAUTH_CLIENT_ID: 'synthetic-login-client',
  SOCIAL_X_OAUTH_CLIENT_SECRET: 'synthetic-login-client-secret',
  SOCIAL_X_TOKEN_ENCRYPTION_KEY: KEY_OLD,
  SOCIAL_X_PUBLISH_OAUTH_ENABLED: 'true',
  SOCIAL_X_PUBLISH_OAUTH_CLIENT_ID: 'synthetic-publish-client',
  SOCIAL_X_PUBLISH_OAUTH_CLIENT_SECRET: 'synthetic-publish-client-secret',
  SOCIAL_X_PUBLISH_TOKEN_ENCRYPTION_KEY: KEY_NEW,
  SOCIAL_X_EDGE_STORE_ENABLED: 'true',
  SOCIAL_X_EDGE_WORKLOAD_SECRET: 'ef'.repeat(32),
  SUPABASE_URL: 'https://fixture.supabase.co/',
  SUPABASE_PUBLISHABLE_KEY: 'synthetic-publishable-key-for-tests',
};
const owner = { verify: async () => ({userId:USER,emailVerified:true}),
  authorizeIamRole: async () => true,
  internalAccessToken: async () => 'synthetic-jwt-'+'a'.repeat(80) };
const denied = { ...owner, authorizeIamRole: async () => false };
const url = path => new URL(path, 'https://capital-ai.online');
const req = (method = 'GET') => ({ method, headers:{'sec-fetch-site':'same-origin'} });
const json = (r, status, body) => {r.status = status; r.body = body;};
function res() {return {status:0,body:null,headers:{},
  setHeader(k,v){this.headers[k.toLowerCase()]=v;},
  writeHead(status,headers){this.status=status;this.location=headers.Location;},
  end(){} }; }
const goodState = 's'.repeat(43);
const goodCode = 'synthetic-code';
function decrypt(ciphertext) {
  const [version,iv,tag,data] = ciphertext.split('.');
  assert.equal(version,'v1');
  const cipher = createDecipheriv('aes-256-gcm',Buffer.from(KEY_NEW,'hex'),
    Buffer.from(iv,'base64url'));
  cipher.setAAD(Buffer.from(JSON.stringify([
    'capital-social-x-publish-v1',USER,'access'])));
  cipher.setAuthTag(Buffer.from(tag,'base64url'));
  return Buffer.concat([cipher.update(Buffer.from(data,'base64url')),
    cipher.final()]).toString('utf8');
}
function response(status,data) {
  return {ok:status>=200 && status<300,status,text:async()=>JSON.stringify(data)};
}

test('publishing start keeps legacy login client intact and namespaces PKCE state/callback', async () => {
  const calls = [];
  const store = { beginOAuth: async input => {
    calls.push(input);
    return {state:goodState,expiresAt:new Date(Date.now()+600000).toISOString()};
  }};
  const old = createSocialXOAuthStart({env:ENV,auth:owner,store});
  const pub = createSocialXOAuthStart({env:ENV,auth:owner,store,channel:'X_PUBLISH'});
  const a=res(),b=res();
  assert.equal(await old.handle(req(),a,url('/api/social-media/x/auth/start'),json),true);
  assert.equal(await pub.handle(req(),b,url('/api/social-media/x/publish/auth/start'),json),true);
  const oldAuth = new URL(a.location), pubAuth = new URL(b.location);
  assert.equal(oldAuth.searchParams.get('client_id'),ENV.SOCIAL_X_OAUTH_CLIENT_ID);
  assert.equal(pubAuth.searchParams.get('client_id'),ENV.SOCIAL_X_PUBLISH_OAUTH_CLIENT_ID);
  assert.equal(oldAuth.searchParams.get('redirect_uri'),
    'https://capital-ai.online/api/social-media/auth/callback');
  assert.equal(pubAuth.searchParams.get('redirect_uri'),CALLBACK);
  assert.equal(pubAuth.searchParams.get('scope').includes('media.write'),true);
  assert.equal(oldAuth.searchParams.get('scope').includes('media.write'),false);
  assert.equal(calls[0].channel,'X');
  assert.equal(calls[1].channel,'X_PUBLISH');
  assert.notEqual(calls[0].codeVerifier,calls[1].codeVerifier);
  assert.equal(pubAuth.searchParams.get('code_challenge_method'),'S256');
  assert.notEqual(oldAuth.searchParams.get('code_challenge'),
    pubAuth.searchParams.get('code_challenge'));
});

test('publishing start fails closed without new client, key, signed Edge or owner',async()=>{
  for(const [key,wrong] of [
    ['SOCIAL_X_PUBLISH_OAUTH_CLIENT_ID',undefined],
    ['SOCIAL_X_PUBLISH_OAUTH_CLIENT_SECRET',undefined],
    ['SOCIAL_X_PUBLISH_TOKEN_ENCRYPTION_KEY',undefined],
    ['SOCIAL_X_EDGE_STORE_ENABLED','false'],
    ['SOCIAL_X_PUBLISH_OAUTH_ENABLED','false'],
  ]){
    const cfg={...ENV,[key]:wrong};
    const s=res();
    const h=createSocialXOAuthStart({env:cfg,auth:owner,channel:'X_PUBLISH',
      store:{beginOAuth:async()=>{throw Error('unexpected state');}}});
    await h.handle(req(),s,url('/api/social-media/x/publish/auth/start'),json);
    assert.equal(s.status,503,key);
  }
  const h=createSocialXOAuthStart({env:ENV,auth:denied,channel:'X_PUBLISH',
    store:{beginOAuth:async()=>{throw Error('unexpected state');}}});
  const r=res();
  await h.handle(req(),r,url('/api/social-media/x/publish/auth/start'),json);
  assert.equal(r.status,403);
  assert.equal(socialXOAuthConfigured(ENV,'X_PUBLISH'),true);
});

test('publishing callback never consumes legacy state or permits non-owner grant',async()=>{
  const calls=[];
  const store = {consumeOAuthCallback:async args=>{
    calls.push(args);
    await args.exchangeCode({userId:args.userId,channel:args.channel,
      redirectUri:args.redirectUri,codeVerifier:'v'.repeat(43),code:goodCode});
    return {consumed:true,platform:'x_publish'};
  }};
  const exchange=async ctx => {
    assert.equal(ctx.channel,'X_PUBLISH');
    assert.equal(ctx.redirectUri,CALLBACK);
  };
  const pub=createSocialOAuthCallback({env:ENV,auth:owner,store,exchangeCode:exchange,
    publishOnly:true});
  const legacy=createSocialOAuthCallback({env:ENV,auth:owner,store,exchangeCode:exchange});
  const callbackURL=url('/api/social-media/x/publish/auth/callback?state='+goodState+'&code='+goodCode);
  const a=res();
  assert.equal(await legacy.handle(req(),a,callbackURL,json),false);
  assert.equal(await pub.handle(req(),a,callbackURL,json),true);
  assert.equal(a.status,303);
  assert.equal(a.location,'/api/social-media/x/publish/account/status');
  assert.equal(calls[0].channel,'X_PUBLISH');
  assert.equal(calls[0].redirectUri,CALLBACK);
  const wrong=res();
  await pub.handle(req(),wrong,url(callbackURL.pathname+callbackURL.search+'&channel=X'),json);
  assert.equal(wrong.status,400);
  assert.equal(calls.length,1);
  const bad=createSocialOAuthCallback({env:ENV,auth:denied,store,exchangeCode:exchange,
    publishOnly:true}),r=res();
  await bad.handle(req(),r,callbackURL,json);
  assert.equal(r.status,403);
  assert.equal(calls.length,1);
});

test('publisher uses only new OAuth client, media.write and domain-separated ciphertext',async()=>{
  const calls=[];
  const tokens = {token_type:'bearer',access_token:'synthetic-access-publish-token',
    refresh_token:'synthetic-refresh-publish-token',expires_in:3600,
    scope:'tweet.read tweet.write users.read offline.access media.write'};
  const fetchImpl=async(uri,opts)=>{
    const target=String(uri);calls.push({target,opts});
    if(target.endsWith('/2/oauth2/token'))return response(200,tokens);
    if(target.endsWith('/2/users/me'))
      return response(200,{data:{id:'123456789012345678',username:'CapitalAIOnline'}});
    if(target.endsWith('/functions/v1/capital-social-x-vault')){
      const payload=JSON.parse(opts.body);
      assert.equal(payload.channel,'X_PUBLISH');
      assert.equal(payload.operation,'persist');
      assert.equal(payload.account.platform,'x_publish');
      assert.ok(payload.account.scopes.includes('media.write'));
      assert.equal(decrypt(payload.account.access_token_encrypted),tokens.access_token);
      assert.throws(()=>unsealOwnerXAccess(payload.account.access_token_encrypted,USER,ENV,'X'));
      assert.equal(unsealOwnerXAccess(payload.account.access_token_encrypted,USER,ENV,
        'X_PUBLISH'),tokens.access_token);
      return response(200,{connected:true,handle:'CapitalAIOnline',
        accountId:'123456789012345678'});
    }
    throw Error('unexpected network destination');
  };
  const exchange=createSocialXOAuthExchange({env:ENV,fetchImpl,channel:'X_PUBLISH'});
  const saved=await exchange({userId:USER,channel:'X_PUBLISH',redirectUri:CALLBACK,
    code:goodCode,codeVerifier:'v'.repeat(43),
    userAccessToken:'synthetic-jwt-'+'a'.repeat(80)});
  assert.deepEqual(saved,{connected:true,channel:'X_PUBLISH',handle:'CapitalAIOnline'});
  assert.deepEqual(calls.map(x=>x.target),[
    'https://api.x.com/2/oauth2/token','https://api.x.com/2/users/me',
    'https://fixture.supabase.co/functions/v1/capital-social-x-vault']);
  const header=calls[0].opts.headers.Authorization;
  assert.equal(header,'Basic '+Buffer.from(ENV.SOCIAL_X_PUBLISH_OAUTH_CLIENT_ID+':'
    +ENV.SOCIAL_X_PUBLISH_OAUTH_CLIENT_SECRET).toString('base64'));
  assert.ok(!header.includes(ENV.SOCIAL_X_OAUTH_CLIENT_ID));
  assert.equal(new URLSearchParams(calls[0].opts.body).get('redirect_uri'),CALLBACK);
});

test('no publisher identity, scope or configuration means zero token persistence',async()=>{
  for(const [scope,username,expectedCalls] of [
    ['tweet.read tweet.write users.read offline.access','CapitalAIOnline',1],
    ['tweet.read tweet.write users.read offline.access media.write','otherAccount',2],
  ]){
    const calls=[];
    const fetchImpl=async(uri)=>{
      calls.push(String(uri));
      if(calls.length===1)return response(200,{token_type:'bearer',
        access_token:'synthetic-access-publish-token',
        refresh_token:'synthetic-refresh-publish-token',expires_in:3600,scope});
      if(calls.length===2)return response(200,{data:{id:'1234',username}});
      throw Error('signed store should not be called');
    };
    const exchange=createSocialXOAuthExchange({env:ENV,fetchImpl,channel:'X_PUBLISH'});
    await assert.rejects(exchange({userId:USER,channel:'X_PUBLISH',redirectUri:CALLBACK,
      code:goodCode,codeVerifier:'v'.repeat(43),userAccessToken:'synthetic-jwt-'+'a'.repeat(80)}));
    assert.equal(calls.length,expectedCalls);
  }
});

test('publishing status is owner-only, signed Edge and never invokes X endpoints',async()=>{
  let reads=0;
  const handler=createXPublishAccountStatus({env:ENV,auth:owner,
    edgeFactory:({channel})=>{
      assert.equal(channel,'X_PUBLISH');
      return {status:async userId=>{reads++;assert.equal(userId,USER);
        return {channel:'X_PUBLISH',status:'connected',connected:true,
          handle:'@CapitalAIOnline',scopes:['media.write'],expiresAt:'2027-01-01'};}};
    }});
  const result=res();
  await handler.handle(req(),result,url('/api/social-media/x/publish/account/status'),json);
  assert.equal(result.status,200);
  assert.equal(result.body.connected,true);
  assert.equal(result.body.mediaWriteApproved,true);
  assert.equal(reads,1);
  const forbidden=createXPublishAccountStatus({env:ENV,auth:denied,edgeFactory:()=>{throw Error('edge called');}});
  const bad=res();
  await forbidden.handle(req(),bad,url('/api/social-media/x/publish/account/status'),json);
  assert.equal(bad.status,403);
});


function sealRefresh(value, old = false) {
  const iv=randomBytes(12),key=Buffer.from(old?KEY_OLD:KEY_NEW,'hex');
  const cipher=createCipheriv('aes-256-gcm',key,iv);
  cipher.setAAD(Buffer.from(JSON.stringify([
    old ? 'capital-social-x-v1' : 'capital-social-x-publish-v1',USER,'refresh'])));
  const data=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
  return 'v1.'+[iv,cipher.getAuthTag(),data].map(x=>x.toString('base64url')).join('.');
}
test('publisher refresh uses new client and requires preserved media.write scope',async()=>{
  const calls=[],leaseId='443237bc-9730-444d-a509-1c523ff8e48e';
  const oldCipher=sealRefresh('synthetic-publish-REFRESH-OLD');
  const edgeFactory=({channel})=>{
    assert.equal(channel,'X_PUBLISH');
    return {
      refreshClaim:async(_uid,lease)=>{
        assert.match(lease,/^[a-f0-9-]{36}$/);
        return {claimed:true,leaseId:lease,refreshCipher:oldCipher,
          accountId:'123456789012345678',scopes:['tweet.read','tweet.write',
            'users.read','offline.access','media.write']};
      },
      refreshFinish:async(_uid,lease,previous,access,refresh,expiresAt)=>{
        assert.equal(previous,oldCipher);
        assert.equal(unsealOwnerXAccess(access,USER,ENV,'X_PUBLISH'),'synthetic-publish-ACCESS-NEW');
        assert.ok(/^v1\\./.test(refresh));
        return {refreshed:true,channel:'X_PUBLISH',expiresAt};
      },
      refreshEnd:async()=>{throw Error('must not end successful refresh');},
    };
  };
  const fetchImpl=async(uri,opts)=>{
    calls.push({uri:String(uri),auth:opts.headers.Authorization});
    if(String(uri).endsWith('/2/oauth2/token'))
      return response(200,{token_type:'bearer',
        access_token:'synthetic-publish-ACCESS-NEW',
        refresh_token:'synthetic-publish-REFRESH-NEW',
        expires_in:3600,scope:'tweet.read tweet.write users.read offline.access media.write'});
    if(String(uri).endsWith('/2/users/me'))
      return response(200,{data:{id:'123456789012345678'}});
    throw Error('unknown provider');
  };
  const result=await refreshOwnerXForWorkload({
    env:{...ENV,SOCIAL_X_PAID_READ_APPROVED:'true'},channel:'X_PUBLISH',
    userId:USER,userAccessToken:'synthetic-jwt-'+'a'.repeat(80),fetchImpl,edgeFactory});
  assert.equal(result.httpStatus,200);
  assert.equal(result.body.channel,'X_PUBLISH');
  assert.equal(calls.length,2);
  assert.equal(calls[0].auth,'Basic '+Buffer.from(ENV.SOCIAL_X_PUBLISH_OAUTH_CLIENT_ID
    +':'+ENV.SOCIAL_X_PUBLISH_OAUTH_CLIENT_SECRET).toString('base64'));
  assert.notEqual(calls[0].auth,'Basic '+Buffer.from(ENV.SOCIAL_X_OAUTH_CLIENT_ID
    +':'+ENV.SOCIAL_X_OAUTH_CLIENT_SECRET).toString('base64'));
});

test('legacy encrypted refresh grant cannot be used to rotate publisher token',async()=>{
  const calls=[],outcomes=[];
  const edgeFactory=()=>({
    refreshClaim:async(_uid,leaseId)=>({
      leaseId,refreshCipher:sealRefresh('synthetic-OLD-LOGIN-TOKEN',true),
      accountId:'123456789012345678',
      scopes:['tweet.read','tweet.write','users.read','offline.access','media.write']}),
    refreshEnd:async(_uid,_leaseId,outcome)=>{outcomes.push(outcome);},
    refreshFinish:async()=>{throw Error('unexpected token mutation');},
  });
  const outcome=await refreshOwnerXForWorkload({
    env:{...ENV,SOCIAL_X_PAID_READ_APPROVED:'true'},channel:'X_PUBLISH',
    userId:USER,userAccessToken:'synthetic-jwt-'+'a'.repeat(80),
    edgeFactory,fetchImpl:async()=>{calls.push(1);throw Error('must not contact provider');}});
  assert.equal(outcome.httpStatus,503);
  assert.deepEqual(outcomes,['reconnect']);
  assert.equal(calls.length,0);
});

test('migration changes only independent X publication namespaces and preserves existing rows',()=>{
  const migration=readFileSync(new URL('../../supabase/migrations/20261117122000_x_publish_oauth_client_isolation.sql',
    import.meta.url),'utf8');
  assert.ok(migration.includes("'x_publish'"));
  assert.ok(migration.includes("p_platform not in ('x','x_publish')"));
  assert.ok(migration.includes("'media.write' = any(scopes)"));
  assert.doesNotMatch(migration,/security definer|delete from public.social_media_accounts/i);
});
