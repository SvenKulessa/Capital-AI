import test from 'node:test';
import assert from 'node:assert/strict';
import { createBuddyGeminiByok } from './buddy-gemini-byok.mjs';
const UID1 = '11111111-1111-4111-8111-111111111111';
const UID2 = '22222222-2222-4222-8222-222222222222';
const fakeKey = 'AIza' + 'A'.repeat(32); // Synthetic identifier; never a real credential.
const goodEnv = { AUTH_COOKIE_SIGNING_SECRET:'test-secret-long-enough-for-encryption-unit-tests-only', BUDDY_GEMINI_BYOK_ENABLED:'true' };
const output = (status,body) => ({status,body});
const auth = { verify:async req => ({userId:req.testUid||UID1}), sameOrigin:req=>req.headers.origin==='https://capital-ai.online' };
function invoke({route='/api/chat-buddy/gemini',method='GET',body,uid=UID1,cookie,origin='https://capital-ai.online',env=goodEnv,fetchImpl}={}) {
  const headers = { origin, ...(body ? {'content-type':'application/json'}:{}), ...(cookie ? {cookie}: {}) };
  const req = {method,headers,testUid:uid,async *[Symbol.asyncIterator](){if(body)yield Buffer.from(JSON.stringify(body));}};
  const res={headers:{},setHeader(name,val){this.headers[name.toLowerCase()]=val;}};
  let response;
  const json=(_,status,body)=>{response=output(status,body);};
  const api=createBuddyGeminiByok({env,auth,now:()=>1730000000000,fetchImpl:fetchImpl??(async()=>{throw Error('OUTBOUND_NOT_ALLOWED');})});
  return api.handle(req,res,new URL(route,'https://capital-ai.online'),json).then(()=>({response,headers:res.headers}));
}
test('feature-disabled BYOK refuses all storage and provider access',async()=>{
  const r=await invoke({method:'POST',body:{apiKey:fakeKey},env:{...goodEnv,BUDDY_GEMINI_BYOK_ENABLED:'false'}});
  assert.equal(r.response.status,503);assert.equal(r.headers['set-cookie'],undefined);
});
test('invalid credentials and cross-origin requests fail closed',async()=>{
  assert.equal((await invoke({method:'POST',body:{apiKey:'invalid'}})).response.status,400);
  assert.equal((await invoke({method:'POST',body:{apiKey:fakeKey},origin:'https://evil.example'})).response.status,403);
});
test('AES-GCM cookie binds to authenticated account; no secret in JSON or logs',async()=>{
  const saved=await invoke({method:'POST',body:{apiKey:fakeKey}});
  assert.equal(saved.response.status,200);
  assert.equal(saved.response.body.verified,false);
  assert.equal(JSON.stringify(saved.response).includes(fakeKey),false);
  const cookie=saved.headers['set-cookie'];
  assert.match(cookie,/HttpOnly; Secure; SameSite=Strict/);
  assert.equal(cookie.includes(fakeKey),false);
  const value=cookie.split(';')[0];
  assert.equal((await invoke({cookie:value})).response.body.connected,true);
  assert.equal((await invoke({cookie:value,uid:UID2})).response.body.connected,false);
  assert.equal((await invoke({cookie:value.replace(/.$/,'x')})).response.body.connected,false);
});
test('explicit consent required and bounded synthetic provider response',async()=>{
  const saved=await invoke({method:'POST',body:{apiKey:fakeKey}});
  const cookie=saved.headers['set-cookie'].split(';')[0];
  let calls=0;
  const fetchImpl=async(url,args)=>{
    calls++;
    assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
    assert.equal(args.headers['x-goog-api-key'],fakeKey);
    return {ok:true,headers:{get:()=>null},text:async()=>JSON.stringify({candidates:[{content:{parts:[{text:'Synthetische Antwort'}]}}]})};
  };
  const route='/api/chat-buddy/gemini/answer';
  assert.equal((await invoke({route,method:'POST',body:{question:'Test',consent:false},cookie,fetchImpl})).response.status,400);
  assert.equal(calls,0);
  const result=await invoke({route,method:'POST',body:{question:'Test',consent:true},cookie,fetchImpl});
  assert.equal(result.response.status,200);
  assert.equal(result.response.body.answer,'Synthetische Antwort');
  assert.equal(calls,1);
});
test('delete clears encrypted client cookie',async()=>{
  const r=await invoke({method:'DELETE'});
  assert.equal(r.response.status,200);
  assert.match(r.headers['set-cookie'],/Max-Age=0/);
});
