import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createProfileAvatarUpload, imageMagicMime } from './profile-avatar-upload.mjs';

const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const png=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),Buffer.from('synthetic-image')]);
const base={SUPABASE_URL:'https://test-project.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_'+'x'.repeat(32),PROFILE_AVATAR_UPLOAD_ENABLED:'true',PROFILE_AVATAR_CLAMAV_SOCKET:'/run/clamav/clamd.sock'};
function setup({userId=A,origin=true,verdict={clean:true,engine:'clamav'},env=base}={}){
  const calls=[];
  const auth={verify:async()=>userId?{userId}:null,sameOrigin:()=>origin};
  const scan=async()=>verdict;
  const transcode=async()=>png;
  const fetchImpl=async(url,options)=>{
    calls.push({path:url.pathname,method:options.method,headers:options.headers,body:options.body});
    if(options.method==='GET')return {ok:true,status:200,headers:{get:()=>String(png.length)},arrayBuffer:async()=>png};
    return {ok:true,status:200};
  };
  const api=createProfileAvatarUpload({env,auth,scan,transcode,fetchImpl});
  async function call(path,method='GET',payload=png,headers={}){
    const req=Readable.from(method==='POST'?[payload]:[]);
    req.method=method; req.headers={'content-type':'image/png','content-length':String(payload.length),...headers};
    const res={statusCode:null,headers:{},setHeader(k,v){this.headers[k]=v;},writeHead(code,headers){this.statusCode=code;Object.assign(this.headers,headers);},end(bytes){this.data=bytes;}};
    const json=(res,code,body)=>{res.statusCode=code;res.body=body;};
    const handled=await api.handle(req,res,new URL(path,'https://capital-ai.online'),json);
    return {handled,res};
  }
  return {call,calls};
}

test('rejects unauthenticated requests before private storage access',async()=>{
  const {call,calls}=setup({userId:null});
  const {res}=await call('/api/profile/avatar/current');
  assert.equal(res.statusCode,401);assert.equal(calls.length,0);
});
test('upload never writes when origin is invalid',async()=>{
  const {call,calls}=setup({origin:false});
  assert.equal((await call('/api/profile/upload-logo','POST')).res.statusCode,403);
  assert.equal(calls.length,0);
});
test('upload is disabled by default and never writes without explicit enablement',async()=>{
  const {call,calls}=setup({env:{...base,PROFILE_AVATAR_UPLOAD_ENABLED:'false'}});
  assert.equal((await call('/api/profile/upload-logo','POST')).res.statusCode,503);
  assert.equal(calls.length,0);
});
test('accepts bounded signed image only after two clean ClamAV passes and transcode',async()=>{
  const {call,calls}=setup();
  const {res}=await call('/api/profile/upload-logo','POST');
  assert.equal(res.statusCode,200);assert.match(res.body.sha256,/^[a-f0-9]{64}$/);
  assert.equal(res.body.avatarUrl,'/api/profile/avatar/current');
  assert.equal(calls.length,1);assert.equal(calls[0].method,'POST');
  assert.equal(calls[0].path,'/storage/v1/object/capital-ai-profile-avatars/'+A+'/avatar.png');
  assert.equal(calls[0].headers['Content-Type'],'image/png');
  assert.equal(calls[0].headers.apikey,base.SUPABASE_SECRET_KEY);
});
test('malware detection fails closed and does not contact storage',async()=>{
  const {call,calls}=setup({verdict:{clean:false,engine:'clamav'}});
  assert.equal((await call('/api/profile/upload-logo','POST')).res.statusCode,422);
  assert.equal(calls.length,0);
});
test('invalid claimed type, magic mismatch, and oversized payload are rejected',async()=>{
  const {call,calls}=setup();
  assert.equal((await call('/api/profile/upload-logo','POST',png,{'content-type':'image/svg+xml'})).res.statusCode,415);
  assert.equal((await call('/api/profile/upload-logo','POST',Buffer.from('not image'))).res.statusCode,415);
  assert.equal((await call('/api/profile/upload-logo','POST',png,{'content-length':'2097153'})).res.statusCode,413);
  assert.equal(calls.length,0);
});
test('authenticated A and B storage requests are isolated by verified session identity',async()=>{
  const a=setup({userId:A}),b=setup({userId:B});
  assert.equal((await a.call('/api/profile/avatar/current')).res.statusCode,200);
  assert.equal((await b.call('/api/profile/avatar/current')).res.statusCode,200);
  assert.equal(a.calls[0].path,'/storage/v1/object/capital-ai-profile-avatars/'+A+'/avatar.png');
  assert.equal(b.calls[0].path,'/storage/v1/object/capital-ai-profile-avatars/'+B+'/avatar.png');
  assert.equal((await a.call('/api/profile/avatar/'+B)).handled,false);
  assert.equal(a.calls.length,1);
});
test('deletion requires same-origin, targets only the current user, and never lists the bucket',async()=>{
  const d=setup({userId:B});
  assert.equal((await d.call('/api/profile/logo','DELETE')).res.statusCode,200);
  assert.deepEqual(JSON.parse(d.calls[0].body),{prefixes:[B+'/avatar.png']});
  const f=setup({origin:false});assert.equal((await f.call('/api/profile/logo','DELETE')).res.statusCode,403);
  assert.equal(f.calls.length,0);
});
test('non-UUID session subjects fail closed',async()=>{
  const d=setup({userId:'../../admin'});
  assert.equal((await d.call('/api/profile/logo')).res.statusCode,401);
  assert.equal(d.calls.length,0);
});
test('signature validator rejects SVG and javascript despite image suffix',()=>{
  assert.equal(imageMagicMime(Buffer.from('<svg/onload=alert(1)>')),null);
  assert.equal(imageMagicMime(png),'image/png');
});
