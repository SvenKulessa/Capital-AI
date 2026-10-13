import test from 'node:test';
import assert from 'node:assert/strict';
import { sealYouTubeToken } from './youtube-oauth-exchange.mjs';
import { createYouTubeTokenResolver,unsealYouTubeToken } from './youtube-token-resolver.mjs';
import { createYouTubePrivateUpload,TARGET_CHANNEL,PRIVATE_SHORT_SHA } from './youtube-private-upload.mjs';
const userId='d0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
const accountId='835eabeb-8730-4d8f-9767-cea8297ae0e5';
const key='ab'.repeat(32), now=Date.now();
const env={SOCIAL_YOUTUBE_OAUTH_CONNECT_ENABLED:'true',SOCIAL_OAUTH_CALLBACK_ENABLED:'true',
  SOCIAL_YOUTUBE_OAUTH_CLIENT_ID:'fixture.apps.googleusercontent.com',SOCIAL_YOUTUBE_OAUTH_CLIENT_SECRET:'synthetic_secret',
  SOCIAL_YOUTUBE_TOKEN_ENCRYPTION_KEY:key,PUBLIC_APP_ORIGIN:'https://capital-ai.online/',
  SUPABASE_URL:'https://fixture.supabase.co/',SUPABASE_SECRET_KEY:'sb_secret_synthetic_fixture'};
function account(expires=now+3600000) {return {id:accountId,user_id:userId,platform:'youtube',status:'connected',
  external_account_id:TARGET_CHANNEL,scopes:['https://www.googleapis.com/auth/youtube.readonly','https://www.googleapis.com/auth/youtube.upload'],
  token_expires_at:new Date(expires).toISOString(),access_token_encrypted:sealYouTubeToken('synthetic_access_token',Buffer.from(key,'hex'),{userId,kind:'access'}),
  refresh_token_encrypted:sealYouTubeToken('synthetic_refresh_token',Buffer.from(key,'hex'),{userId,kind:'refresh'})};}
const response=x=>({ok:true,text:async()=>JSON.stringify(x)});
test('valid token is decrypted only server-side without contacting Google',async()=>{
  const row=account();let calls=0;
  const resolve=createYouTubeTokenResolver({env,now:()=>now,vault:{invoke:async()=>row},fetchImpl:async()=>{calls++;throw Error();}});
  const result=await resolve({userId});assert.equal(result.accessToken,'synthetic_access_token');assert.equal(result.refreshed,false);assert.equal(calls,0);
  assert.throws(()=>unsealYouTubeToken(row.access_token_encrypted,Buffer.from(key,'hex'),'bcd298ed-3901-4fac-97b9-609a78335862','access'));
});
test('expired access token refreshes once under concurrency; refresh token is retained and ciphertext CAS persisted',async()=>{
  let row=account(now-1000),calls=0,writes=[];
  const oldRefresh=row.refresh_token_encrypted;
  const vault={invoke:async(op,body)=>{if(op==='credentials')return row;writes.push(body);row={...row,...body.tokens};return {updated:true};}};
  const resolve=createYouTubeTokenResolver({env,now:()=>now,vault,fetchImpl:async(url,init)=>{
    calls++;assert.equal(url,'https://oauth2.googleapis.com/token');
    assert.equal(new URLSearchParams(init.body).get('grant_type'),'refresh_token');
    return response({token_type:'Bearer',access_token:'synthetic_new_access',expires_in:3600});
  }});
  const results=await Promise.all([resolve({userId}),resolve({userId}),resolve({userId})]);
  assert.equal(calls,1);assert.equal(writes.length,1);assert.equal(row.refresh_token_encrypted,oldRefresh);
  assert.ok(!JSON.stringify(writes).includes('synthetic_new_access'));
  assert.ok(results.every(x=>x.refreshed&&x.accessToken==='synthetic_new_access'));
});
test('invalid grant, missing scope, wrong owner and modified ciphertext never produce credentials',async()=>{
  for(const payload of [{error:'invalid_grant'},{token_type:'Bearer',access_token:'synthetic_new_access',expires_in:3600,scope:'other'}]){
    let writes=0;const resolve=createYouTubeTokenResolver({env,now:()=>now,
      vault:{invoke:async(op)=>{if(op==='credentials')return account(now-1000);writes++;}},fetchImpl:async()=>response(payload)});
    await assert.rejects(resolve({userId}));assert.equal(writes,0);
  }
  for(const row of [{...account(),user_id:'forged'},{...account(),access_token_encrypted:'v1.bad.bad.bad'}]){
    await assert.rejects(createYouTubeTokenResolver({env,vault:{invoke:async()=>row}})({userId}));
  }
});
test('refresh CAS conflict re-reads the newer grant instead of overwriting it',async()=>{
  let row=account(now-1000),calls=0;
  const resolve=createYouTubeTokenResolver({env,now:()=>now,vault:{invoke:async(op)=>{
    if(op==='credentials')return row;row=account(now+3600000);return {updated:false};
  }},fetchImpl:async()=>{calls++;return response({token_type:'Bearer',access_token:'synthetic_new_access',expires_in:3600});}});
  assert.equal((await resolve({userId})).accessToken,'synthetic_access_token');assert.equal(calls,1);
});
const auth={verify:async()=>({userId,emailVerified:true}),authorizeIamRole:async()=>true,sameOrigin:()=>true};
function res(){return {headers:{},setHeader(k,v){this.headers[k]=v;},writeHead(s,h){this.status=s;Object.assign(this.headers,h);},end(v){this.body=v;}};}
const json=(r,status,body)=>Object.assign(r,{status,body});
const req={method:'POST',headers:{'sec-fetch-site':'same-origin','content-type':'video/mp4'}};
const url=new URL('https://capital-ai.online/api/social-media/youtube/private-test/upload');
function uploadFixture({privacy='private',submitError=false,owner=auth}={}){
  let job=null,submits=0,receipts=[];
  const vault={invoke:async(op,body)=>{
    if(op==='private_status')return {job};
    if(op==='private_claim'){if(job)return {claimed:false,job};job={id:body.jobId,channel_id:TARGET_CHANNEL,asset_sha256:PRIVATE_SHORT_SHA,status:'UNKNOWN'};return {claimed:true};}
    receipts.push(body);job={...job,video_id:body.videoId,status:body.verified?'VERIFIED_PRIVATE':'UNKNOWN'};return {saved:true};
  }};
  const handler=createYouTubePrivateUpload({env,auth:owner,readMediaImpl:async()=>Buffer.from('test'),
    resolver:async()=>({userId,accountId,channelId:TARGET_CHANNEL,accessToken:'synthetic_token',refreshed:false}),
    vaultFactory:()=>vault,transport:{submit:async(input)=>{submits++;assert.equal(input.metadata.visibility,'private');assert.equal(input.metadata.syntheticMedia,true);
      if(submitError)throw Error('synthetic_ambiguous');return {providerDeliveryId:'abcdefghijk'};}},
    fetchImpl:async(target)=>response(String(target).includes('/channels?')?{items:[{id:TARGET_CHANNEL}]}:
      {items:[{id:'abcdefghijk',snippet:{channelId:TARGET_CHANNEL},status:{privacyStatus:privacy}}]})});
  return {handler,submits:()=>submits,receipts};
}
test('private upload is channel-bound, readback verified and durable duplicate requests never resubmit',async()=>{
  const f=uploadFixture();for(let i=0;i<2;i++){const r=res();await f.handler.handle(req,r,url,json);assert.equal(r.status,200);assert.equal(r.body.status,'VERIFIED_PRIVATE');
    assert.ok(!JSON.stringify(r.body).includes('synthetic_token'));}
  assert.equal(f.submits(),1);assert.equal(f.receipts[0].verified,false);assert.equal(f.receipts.at(-1).verified,true);
});
test('ambiguous submission stays UNKNOWN with no second upload; public readback never verifies private success',async()=>{
  const f=uploadFixture({submitError:true});const first=res();await f.handler.handle(req,first,url,json);assert.equal(first.status,503);
  const second=res();await f.handler.handle(req,second,url,json);assert.equal(second.status,409);assert.equal(second.body.status,'UNKNOWN');assert.equal(f.submits(),1);
  const wrong=uploadFixture({privacy:'public'});const r=res();await wrong.handler.handle(req,r,url,json);assert.equal(r.body.error,'private_readback_mismatch');
  assert.ok(!wrong.receipts.some(x=>x.verified===true));
});
test('non-owner and cross-site requests cannot trigger private provider calls',async()=>{
  for(const options of [{owner:{...auth,authorizeIamRole:async()=>false}},{}]){
    const f=uploadFixture(options),r=res();await f.handler.handle(options.owner?req:{...req,headers:{'sec-fetch-site':'cross-site'}},r,url,json);
    assert.equal(r.status,403);assert.equal(f.submits(),0);
  }
});
test('real media reader rejects mismatched file before any token or upload request',async()=>{
  let resolved=0;const handler=createYouTubePrivateUpload({env,auth,resolver:async()=>{resolved++;throw Error();}});
  const request={...req,async *[Symbol.asyncIterator](){yield Buffer.from('not the approved short');}};
  const r=res();await handler.handle(request,r,url,json);assert.equal(r.body.error,'wrong_short_file');assert.equal(resolved,0);
});
