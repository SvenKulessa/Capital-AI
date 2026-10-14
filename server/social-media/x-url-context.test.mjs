import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { parseXPostUrl } from '../../shared/x-url-context.mjs';
import { createXUrlContext, normalizeXPostContext } from './x-url-context.mjs';

const URL = 'https://x.com/CapitalAIOnline/status/1234567890123456789';
const PAGE = 'https://capital-ai.online/api/social-media/x/url-context';
const POST = {
  data: { id:'1234567890123456789', author_id:'88222',
    text:'Chartanalyse: Faktorgewichte brauchen Quellen.', created_at:'2026-10-14T01:15:00.000Z' },
  includes: { users:[{id:'88222', username:'CapitalAIOnline', protected:false}] },
};
function req(url=URL, method='POST', headers={}) {
  const value = JSON.stringify({url});
  return Object.assign(Readable.from([value]), { method, headers: {
    origin:'https://capital-ai.online', 'sec-fetch-site':'same-origin',
    'content-type':'application/json', ...headers,
  }});
}
function response(){
  return { status:0, value:null, headers:{}, setHeader(k,v){this.headers[k]=v;},
    writeHead(code,headers){this.status=code;this.headers={...this.headers,...headers};},
    end(text){this.value=text;} };
}
function json(res,status,value) { res.status=status;res.value=value; }
function fixture({owner=true, paidRead=true, crossOrigin=false, provider=POST}={}) {
  const seen={ calls:[],credentials:0 };
  const handler=createXUrlContext({
    env: {SOCIAL_X_EDGE_STORE_ENABLED:'true', SOCIAL_X_PAID_READ_APPROVED:paidRead?'true':'false'},
    auth: {sameOrigin:()=>!crossOrigin,verify:async()=>owner?
      {userId:'owner-uuid',emailVerified:true}:null,
      authorizeIamRole:async()=>owner,internalAccessToken:async()=> 'signed-private-jwt'},
    edgeFactory:()=>({}),
    resolveCredentials:async()=>{seen.credentials++;return {accountId:'42',accessToken:'PRIVATE_ACCESS_TOKEN'};},
    fetchImpl:async(url,init)=>{
      seen.calls.push({url:String(url),method:init.method,token:init.headers.Authorization});
      assert.equal(init.method,'GET');
      assert.match(String(url),/^https:\/\/api\.x\.com\/2\/tweets\/1234567890123456789\?/);
      return {ok:true, text:async()=>JSON.stringify(provider)};
    },
  });
  return {handler,seen};
}
test('URL Context accepts only explicit public single-post X links',()=>{
  assert.deepEqual(parseXPostUrl(URL),{
    provider:'X',postId:'1234567890123456789',username:'CapitalAIOnline',
    canonicalUrl:URL,contentType:'POST',
  });
  assert.equal(parseXPostUrl(URL.replace('x.com','twitter.com')).canonicalUrl,URL);
  for(const invalid of [
    'https://x.com/CapitalAIOnline','https://x.com/i/status/abc',
    'https://x.com/CapitalAIOnline/status/123?tracking=1',
    'https://x.com/CapitalAIOnline/status/123#ref',
    'http://x.com/CapitalAIOnline/status/123',
    'https://x.com@evil.example/CapitalAIOnline/status/123',
    'https://x.com/CapitalAIOnline/following',
    'https://x.com/search?q=fintech',
    'https://x.com/CapitalAIOnline/status/123/photo/1',
    'https://evil.example/foo/status/123',
  ]) assert.throws(()=>parseXPostUrl(invalid),/GROWTH_X_CONTEXT_/);
});
test('X provider response is exact-author verified, untrusted, hash-bound, never publishable',()=>{
  const a=normalizeXPostContext(URL, POST, '2026-10-14T02:00:00.000Z');
  assert.equal(a.role,'URL_CONTEXT');
  assert.equal(a.author,'@CapitalAIOnline');
  assert.equal(a.source,URL);
  assert.equal(a.contentState,'UNTRUSTED_EXTERNAL_CONTEXT');
  assert.equal(a.claimsStatus,'REVIEW_REQUIRED');
  assert.equal(a.rightsStatus,'REVIEW_REQUIRED');
  assert.equal(a.publicPublishAllowed,false);
  assert.equal(a.canAutoContactAuthor,false);
  assert.match(a.excerptSha256,/^[a-f0-9]{64}$/);
  assert.throws(()=>normalizeXPostContext(URL,{...POST,includes:{users:[
    {id:'88222',username:'OtherCompany',protected:false}]} }),/AUTHOR_UNVERIFIED/);
  assert.throws(()=>normalizeXPostContext(URL,{...POST,data:{...POST.data,
    id:'1234567890123456788'}}),/POST_READBACK_INVALID/);
  assert.throws(()=>normalizeXPostContext(URL,{...POST,data:{...POST.data,
    possibly_sensitive:true}}),/POST_READBACK_INVALID/);
  assert.throws(()=>normalizeXPostContext(URL,{...POST,includes:{users:[
    {id:'88222',username:'CapitalAIOnline',protected:true}]} }),/AUTHOR_UNVERIFIED/);
});
test('read-only provider lookup requires verified owner, paid read permission and same origin',async()=>{
  for(const mode of [
    {owner:false,status:403},{paidRead:false,status:403},{crossOrigin:true,status:403},
  ]){
    const f=fixture(mode),res=response();
    const request=req(URL,'POST',mode.crossOrigin?{'sec-fetch-site':'cross-site'}:{});
    await f.handler.handle(request,res,new globalThis.URL(PAGE),json);
    assert.equal(res.status,mode.status);
    assert.equal(f.seen.credentials,0);
    assert.equal(f.seen.calls.length,0);
  }
});
test('explicit one-post lookup returns sanitized context, never tokens, provider write or publish',async()=>{
  const f=fixture(),res=response();
  await f.handler.handle(req(),res,new globalThis.URL(PAGE),json);
  assert.equal(res.status,200);
  assert.equal(res.value.source,URL);
  assert.equal(res.value.author,'@CapitalAIOnline');
  assert.equal(res.value.publicPublishAllowed,false);
  assert.equal(f.seen.credentials,1);
  assert.equal(f.seen.calls.length,1);
  assert.equal(f.seen.calls[0].method,'GET');
  assert.doesNotMatch(JSON.stringify(res.value),/PRIVATE_ACCESS_TOKEN|signed-private-jwt/);
});
test('invalid sources and spoofed provider responses fail without external mutations',async()=>{
  let f=fixture(),res=response();
  await f.handler.handle(req('https://evil.example/status/123'),res,
    new globalThis.URL(PAGE),json);
  assert.equal(res.status,503);
  assert.equal(f.seen.credentials,0);
  assert.equal(f.seen.calls.length,0);
  f=fixture({provider:{...POST,includes:{users:[{id:'88222',username:'other'}]}}});
  res=response();
  await f.handler.handle(req(),res,new globalThis.URL(PAGE),json);
  assert.equal(res.status,503);
  assert.equal(res.value.error,'x_url_context_unavailable');
  assert.equal(res.value.externalWrites,0);
});
