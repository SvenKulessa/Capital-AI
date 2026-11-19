import test from 'node:test';
import assert from 'node:assert/strict';
import { createCipheriv, randomBytes, createHash } from 'node:crypto';
import { createXMilestonePost, MILESTONE_CONTENT_KEY, MILESTONE_TEXT,
  LAUNCH_TEXT, LAUNCH_CONTENT_KEY, LAUNCH_MEDIA_SHA256, assertPinnedLaunchMedia } from './x-milestone-post.mjs';

const USER='d0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
const KEY='ab'.repeat(32), ACCOUNT='123456789012345678';
const POST_ID='222222222222222';
const ENV={
  PUBLIC_APP_ORIGIN:'https://capital-ai.online/',
  SOCIAL_X_EDGE_STORE_ENABLED:'true',
  SOCIAL_X_MILESTONE_POST_ENABLED:'true',
  SOCIAL_X_EDGE_WORKLOAD_SECRET:KEY,
  SOCIAL_X_PAID_WRITE_APPROVED:'true',
  SOCIAL_X_PAID_READ_APPROVED:'true',
  SOCIAL_X_TOKEN_ENCRYPTION_KEY:KEY,
  SOCIAL_X_PUBLISH_TOKEN_ENCRYPTION_KEY:KEY,
  SOCIAL_X_PUBLISH_OAUTH_ENABLED:'true',
  SOCIAL_X_PUBLISH_OAUTH_CLIENT_ID:'synthetic-publish-client',
  SOCIAL_X_PUBLISH_OAUTH_CLIENT_SECRET:'synthetic-publish-secret',
  SOCIAL_X_OAUTH_CONNECT_ENABLED:'true',
  SOCIAL_OAUTH_CALLBACK_ENABLED:'true',
  SOCIAL_X_OAUTH_CLIENT_ID:'synthetic-x-client',
  SOCIAL_X_OAUTH_CLIENT_SECRET:'synthetic-x-secret',
  SUPABASE_URL:'https://fixture.supabase.co/',
  SUPABASE_PUBLISHABLE_KEY:'synthetic-publishable-key',
};
const uri=path=>'https://capital-ai.online/api/social-media/x/milestone'+path;
function request(method='POST',sameOrigin=true){
  return {method,headers:{origin:'https://capital-ai.online',
    'sec-fetch-site':sameOrigin?'same-origin':'cross-site'}};
}
function response(){
  return {code:null,body:null,setHeader(){},writeHead(code){this.code=code;},
    end(data){this.data=data;}};
}
const json=(res,code,body)=>{res.code=code;res.body=body};
function seal(value,kind='access'){
  const iv=randomBytes(12);
  const c=createCipheriv('aes-256-gcm',Buffer.from(KEY,'hex'),iv);
  c.setAAD(Buffer.from(JSON.stringify(['capital-social-x-publish-v1',USER,kind])));
  const bytes=Buffer.concat([c.update(value,'utf8'),c.final()]);
  return 'v1.'+[iv,c.getAuthTag(),bytes].map(x=>x.toString('base64url')).join('.');
}
function providerResult(status,payload){
  return {ok:status>=200&&status<300,status,text:async()=>JSON.stringify(payload)};
}
function fixture({owner=true,flags={},ambiguous=false,wrongAuthor=false,expires=3600000}={}){
  const receipt=new Map(),calls=[];
  let accessCipher=seal('synthetic-ACCESS-OLD-TOKEN');
  let expiresAt=new Date(Date.now()+expires).toISOString();
  const auth={sameOrigin:req=>req.headers['sec-fetch-site']==='same-origin',
    verify:async()=>owner?{userId:USER,emailVerified:true}:null,
    authorizeIamRole:async()=>owner,internalAccessToken:async()=> 'synthetic-jwt-'+'j'.repeat(80)};
  const edgeFactory=({channel})=>{
    assert.equal(channel,'X_PUBLISH');
    return ({
    async invoke(op,ctx){
      calls.push(op);
      if(op==='x_credentials')return {accountId:ACCOUNT,handle:'CapitalAIOnline',
        accessCipher,expiresAt,leaseActive:false};
      if(op==='milestone_status')return receipt.has(ctx.contentKey)
        ? {found:true,...receipt.get(ctx.contentKey)}:{found:false,status:'NOT_SUBMITTED'};
      if(op==='milestone_claim'){
        if(receipt.has(ctx.contentKey)) return {claimed:false};
        receipt.set(ctx.contentKey,{status:'CLAIMED',postId:null});
        return {claimed:true};
      }
      if(op==='milestone_record'){
        const row=receipt.get(ctx.contentKey);
        assert.ok(row);
        if(ctx.stage==='post'){assert.equal(row.status,'CLAIMED');row.status='POSTED';}
        else if(ctx.stage==='verify'){assert.equal(row.status,'POSTED');row.status='VERIFIED_PUBLISHED';}
        else throw Error('invalid stage');
        row.postId=ctx.postId;
        return {recorded:true,status:row.status};
      }
      throw Error('unexpected edge '+op);
    },
    async refreshClaim(_user,leaseId){
      calls.push('refresh_claim');
      return {leaseId,refreshCipher:seal('synthetic-REFRESH-OLD-TOKEN','refresh'),
        accountId:ACCOUNT,scopes:['tweet.read','tweet.write','users.read','offline.access','media.write']};
    },
    async refreshFinish(_user,_lease,_prev,newAccess,_newRefresh,expiry){
      calls.push('refresh_finish');accessCipher=newAccess;expiresAt=expiry;
      return {refreshed:true,channel:'X_PUBLISH',expiresAt:expiry};
    },
    async refreshEnd(){calls.push('refresh_end');return {channel:'X_PUBLISH',status:'reconnect_required'};},
  }); };
  let writeCount=0,readCount=0;
  const fetchImpl=async (url,options)=>{
    const path=String(url);
    if(path.endsWith('/2/oauth2/token'))return providerResult(200,{
      access_token:'synthetic-ACCESS-NEW-TOKEN',refresh_token:'synthetic-REFRESH-NEW-TOKEN',
      token_type:'bearer',expires_in:3600,scope:'tweet.read tweet.write users.read offline.access media.write'});
    if(path.endsWith('/2/users/me'))return providerResult(200,{data:{id:ACCOUNT}});
    if(path.endsWith('/2/tweets') && options?.method==='POST'){
      writeCount++;
      assert.deepEqual(JSON.parse(options.body),{text:MILESTONE_TEXT});
      if(ambiguous)throw Error('provider timeout leaked-token');
      return providerResult(201,{data:{id:POST_ID}});
    }
    if(path.includes('/2/tweets/'+POST_ID+'?')){
      readCount++;
      return providerResult(200,{data:{
        id:POST_ID,author_id:wrongAuthor?'000':ACCOUNT,text:MILESTONE_TEXT}});
    }
    throw Error('unexpected provider URI '+path);
  };
  const handler=createXMilestonePost({env:{...ENV,...flags},auth,fetchImpl,edgeFactory});
  return {handler,calls,receipt,stats:()=>({writeCount,readCount})};
}

test('campaign text is short, source-bound and does not assert live X success',()=>{
  assert.ok(MILESTONE_TEXT.length<=280);
  assert.equal(createHash('sha256').update(MILESTONE_TEXT).digest('hex'),MILESTONE_CONTENT_KEY);
  assert.match(MILESTONE_TEXT,/Content Adapter/);
  assert.match(MILESTONE_TEXT,/Social Media Engine/);
  assert.match(MILESTONE_TEXT,/Daten- und Screener-Blueprints/);
  assert.match(MILESTONE_TEXT,/Pilot; keine Anlageberatung/);
  assert.doesNotMatch(MILESTONE_TEXT,/vollautomatisch|live verifiziert|bereits ver.ffentlicht/i);
});

test('guest can open the milestone preview without a paid X call or session', async()=>{
  const f=fixture({owner:false}), page=response();
  assert.equal(await f.handler.handle(request('GET'),page,new URL(uri('')),json),true);
  assert.equal(page.code,200);
  assert.match(page.data,/Content Adapter/);
  assert.match(page.data,/Screener-Blueprints/);
  assert.match(page.data,/href="\/login"/);
  assert.match(page.data,/Keine individuelle Anlageberatung|keine individuelle Anlageberatung/);
  assert.match(page.data,/MILESTONE|X-Meilenstein/);
  const script=response();
  assert.equal(await f.handler.handle(request('GET'),script,
    new URL('https://capital-ai.online/x-milestone-post.js'),json),true);
  assert.equal(script.code,200);
  assert.match(script.data,/statusUrl/);
  assert.match(script.data,/publish.disabled=true/);
  // Only the public HTML and JS are accessible to guests. No X/Edge readback.
  assert.deepEqual(f.calls,[]);
  const denied=response();
  await f.handler.handle(request('GET'),denied,new URL(uri('/status')),json);
  assert.equal(denied.code,403);
  assert.deepEqual(f.calls,[]);
  assert.deepEqual(f.stats(),{writeCount:0,readCount:0});
});

test('one owner post is verified via existing X transport and never repeated',async()=>{
  const f=fixture(),r=response();
  assert.equal(await f.handler.handle(request(),r,new URL(uri('/publish')),json),true);
  assert.equal(r.code,200);
  assert.equal(r.body.status,'VERIFIED_PUBLISHED');
  assert.equal(r.body.url,'https://x.com/CapitalAIOnline/status/'+POST_ID);
  assert.deepEqual(f.stats(),{writeCount:1,readCount:1});
  const again=response();
  await f.handler.handle(request(),again,new URL(uri('/publish')),json);
  assert.equal(again.code,200);
  assert.equal(again.body.note,'existing_receipt_no_automatic_replay');
  assert.equal(again.body.retryPublish,false);
  assert.deepEqual(f.stats(),{writeCount:1,readCount:1});
  const status=response();
  await f.handler.handle(request('GET'),status,new URL(uri('/status')),json);
  assert.equal(status.body.status,'VERIFIED_PUBLISHED');
  assert.deepEqual(f.stats(),{writeCount:1,readCount:1});
});

test('denied owner, cross-origin, disabled and paid flags never cause provider writes',async()=>{
  for(const settings of [{owner:false},{flags:{SOCIAL_X_MILESTONE_POST_ENABLED:'false'}},
    {flags:{SOCIAL_X_PAID_WRITE_APPROVED:'false'}},
    {flags:{SOCIAL_X_PAID_READ_APPROVED:'false'}}]){
    const f=fixture(settings),r=response();
    await f.handler.handle(request(),r,new URL(uri('/publish')),json);
    assert.ok([403,503].includes(r.code));
    assert.deepEqual(f.stats(),{writeCount:0,readCount:0});
  }
  const f=fixture(),r=response();
  await f.handler.handle(request('POST',false),r,new URL(uri('/publish')),json);
  assert.equal(r.code,403);assert.deepEqual(f.calls,[]);
});

test('unknown provider result consumes the unique claim and leaks no secrets',async()=>{
  const f=fixture({ambiguous:true}),r=response();
  await f.handler.handle(request(),r,new URL(uri('/publish')),json);
  assert.equal(r.code,503);
  assert.equal(r.body.retryPublish,false);
  assert.equal(f.receipt.get(MILESTONE_CONTENT_KEY).status,'CLAIMED');
  assert.doesNotMatch(JSON.stringify(r.body),/leaked-token|synthetic-ACCESS/);
  const again=response();
  await f.handler.handle(request(),again,new URL(uri('/publish')),json);
  assert.equal(again.code,409);
  assert.deepEqual(f.stats(),{writeCount:1,readCount:0});
});

test('wrong author cannot be verified or retried after provider writes',async()=>{
  const f=fixture({wrongAuthor:true}),r=response();
  await f.handler.handle(request(),r,new URL(uri('/publish')),json);
  assert.equal(r.code,503);
  assert.equal(r.body.error,'x_milestone_readback_mismatch');
  assert.equal(f.receipt.get(MILESTONE_CONTENT_KEY).status,'POSTED');
  assert.deepEqual(f.stats(),{writeCount:1,readCount:1});
});

test('expiring X access token rotates through existing OAuth lease before claim',async()=>{
  const f=fixture({expires:-3600000}),r=response();
  await f.handler.handle(request(),r,new URL(uri('/publish')),json);
  assert.equal(r.code,200);
  assert.equal(r.body.refreshed,true);
  assert.ok(f.calls.includes('refresh_claim'));
  assert.ok(f.calls.includes('refresh_finish'));
  assert.deepEqual(f.stats(),{writeCount:1,readCount:1});
});


test('X launch copy is source-and-image-bound, short, and avoids financial performance claims', () => {
  assert.ok(LAUNCH_TEXT.length > 50 && LAUNCH_TEXT.length <= 280);
  assert.equal(LAUNCH_CONTENT_KEY, createHash('sha256').update(
    'capital-ai-x-launch-v1\n' + LAUNCH_TEXT + '\n' + LAUNCH_MEDIA_SHA256).digest('hex'));
  assert.match(LAUNCH_TEXT,/Learning Hub/);
  assert.match(LAUNCH_TEXT,/Analytics Hub/);
  assert.match(LAUNCH_TEXT,/Studio Hub/);
  assert.match(LAUNCH_TEXT,/Content Engine/);
  assert.doesNotMatch(LAUNCH_TEXT,/profitabel|garantiert|live-ki|auto.?publishing/i);
  assert.throws(()=>assertPinnedLaunchMedia(Buffer.from('fake-image')),
    /x_launch_image_invalid/);
  const mismatched=Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    Buffer.alloc(24,1),
  ]);
  assert.throws(()=>assertPinnedLaunchMedia(mismatched),/x_launch_image_sha_mismatch/);
});

test('X launch page and status are isolated from original milestone receipt',async()=>{
  const f=fixture({owner:false}),resp=response();
  const root='https://capital-ai.online/api/social-media/x/milestone/launch';
  await f.handler.handle(request('GET'),resp,new URL(root),json);
  assert.equal(resp.code,200);
  assert.match(resp.data,/X-Launch mit Infografik/);
  assert.match(resp.data,/Studio Hub/);
  assert.match(resp.data,/branding\/social\/CAPITAL-AI-Universe-X-Launch-Final-20261115.png/);
  assert.match(resp.data,/alt="CAPITAL-AI Universe:/);
  const js=response();
  await f.handler.handle(request('GET'),js,
    new URL('https://capital-ai.online/x-milestone-launch.js'),json);
  assert.equal(js.code,200);
  assert.ok(js.data.includes('/milestone/launch/status'));
  assert.ok(js.data.includes('/milestone/launch/publish'));
  const denied=response();
  await f.handler.handle(request('GET'),denied,new URL(root+'/status'),json);
  assert.equal(denied.code,403);
  assert.deepEqual(f.stats(),{writeCount:0,readCount:0});
});

test('X launch refuses media writes without scope, approval or exact pinned image and never claims',async()=>{
  const root='https://capital-ai.online/api/social-media/x/milestone/launch';
  for(const config of [
    {SOCIAL_X_MILESTONE_MEDIA_ENABLED:'false'},
    {SOCIAL_X_MILESTONE_MEDIA_ENABLED:'true',SOCIAL_X_MEDIA_UPLOAD_ENABLED:'false'},
    {SOCIAL_X_MILESTONE_MEDIA_ENABLED:'true',SOCIAL_X_MEDIA_UPLOAD_ENABLED:'true',SOCIAL_X_PAID_MEDIA_APPROVED:'false'},
  ]) {
    const f=fixture({flags:{...config,SOCIAL_X_MEDIA_OAUTH_CONSENT_ENABLED:'true'}}),r=response();
    await f.handler.handle(request(),r,new URL(root+'/publish'),json);
    assert.equal(r.code,403);
    assert.deepEqual(f.calls,[]);
    assert.equal(f.receipt.size,0);
  }
  const goodFlags={SOCIAL_X_MILESTONE_MEDIA_ENABLED:'true',
    SOCIAL_X_MEDIA_UPLOAD_ENABLED:'true',SOCIAL_X_PAID_MEDIA_APPROVED:'true'};
  const f=fixture({flags:goodFlags}),r=response();
  await f.handler.handle(request(),r,new URL(root+'/publish'),json);
  assert.equal(r.code,503); // pinned asset missing from repo; no X usage
  assert.equal(f.receipt.size,0);
  assert.deepEqual(f.stats(),{writeCount:0,readCount:0});
  const cross=fixture({flags:goodFlags}),wrong=response();
  await cross.handler.handle(request('POST',false),wrong,new URL(root+'/publish'),json);
  assert.equal(wrong.code,403);
  assert.deepEqual(cross.calls,[]);
});
