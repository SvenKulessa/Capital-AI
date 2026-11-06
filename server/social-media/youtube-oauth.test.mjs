import { YOUTUBE_POLICY } from '../../shared/youtube-privacy.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDecipheriv } from 'node:crypto';
import { createSocialYouTubeOAuthStart } from './youtube-oauth-start.mjs';
import { createSocialYouTubeOAuthExchange, socialYouTubeOAuthConfigured } from './youtube-oauth-exchange.mjs';
import { createSocialYouTubeAccountStatus } from './youtube-account-status.mjs';
import { createSocialOAuthCallback } from './oauth-callback.mjs';
import { SECURITY_HEADERS } from '../security-headers.mjs';

const userId = 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
const key = 'ab'.repeat(32);
const state = 's'.repeat(43);
const redirectUri = 'https://capital-ai.online/api/social-media/auth/callback';
const scopes = ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/youtube.upload'];
const env = { PUBLIC_APP_ORIGIN: 'https://capital-ai.online/', SUPABASE_URL: 'https://fixture.supabase.co/',
  SUPABASE_SECRET_KEY: 'sb_secret_synthetic_fixture', SOCIAL_YOUTUBE_OAUTH_CONNECT_ENABLED: 'true',
  SOCIAL_OAUTH_CALLBACK_ENABLED: 'true', SOCIAL_YOUTUBE_OAUTH_CLIENT_ID: 'fixture.apps.googleusercontent.com',
  SOCIAL_YOUTUBE_OAUTH_CLIENT_SECRET: 'synthetic_client_secret', SOCIAL_YOUTUBE_TOKEN_ENCRYPTION_KEY: key };
const auth = { verify: async () => ({ userId, emailVerified: true }), authorizeIamRole: async () => true };
const json = (r, status, body) => Object.assign(r, { status, body });
const response = () => ({ headers: {}, getHeader(k) { return this.headers[k]; }, setHeader(k,v) { this.headers[k]=v; },
  writeHead(status, headers) { this.status=status; Object.assign(this.headers,headers); }, end() {} });
const req = { method: 'GET', headers: { 'sec-fetch-site': 'same-origin' } };
const channel = { id: 'UC' + 'a'.repeat(22), snippet: { title: 'Capital AI', customUrl: '@capital-ai.online' } };
const tokens = { access_token: 'synthetic_access_token', refresh_token: 'synthetic_refresh_token',
  token_type: 'Bearer', expires_in: 3600, scope: scopes.join(' ') };
const trusted = { userId, channel: 'YOUTUBE', redirectUri, code: 'synthetic_code', codeVerifier: 'v'.repeat(43) };
function flow({ token = tokens, channels = [channel], mutate = x => x } = {}) {
  const calls=[];
  return { calls, fetchImpl: async (url, options) => {
    calls.push({ url: String(url), options });
    const output = calls.length === 1 ? token : calls.length === 2 ? { items: channels }
      : [mutate(JSON.parse(options.body))];
    return { ok: true, text: async () => JSON.stringify(output) };
  } };
}
test('YouTube start uses owner session, PKCE, offline consent and routing cookie', async () => {
  const starts=[]; const r=response();
  const start=createSocialYouTubeOAuthStart({ env, auth, store: { beginOAuth: async x => { starts.push(x); return { state }; } } });
  await start.handle(req,r,new URL(`/api/social-media/youtube/auth/start?privacy=${YOUTUBE_POLICY.version}`, env.PUBLIC_APP_ORIGIN),json);
  assert.equal(r.status,303);
  const url=new URL(r.headers.Location);
  assert.equal(url.origin,'https://accounts.google.com');
  assert.equal(url.searchParams.get('redirect_uri'),redirectUri);
  assert.equal(url.searchParams.get('scope'),scopes.join(' '));
  assert.equal(url.searchParams.get('access_type'),'offline');
  assert.equal(url.searchParams.get('hl'),null, 'default connection keeps the user language');
  assert.equal(url.searchParams.get('prompt'),'consent');
  assert.equal(url.searchParams.get('code_challenge_method'),'S256');
  assert.equal(starts[0].channel,'YOUTUBE');
  assert.match(r.headers['Set-Cookie'].at(-1),/HttpOnly; Secure; SameSite=Lax/);
  assert.ok(!r.headers.Location.includes(starts[0].codeVerifier));
});
test('YouTube denies non-owner and cross-site start before issuing state', async () => {
  let calls=0;
  const start=createSocialYouTubeOAuthStart({ env, auth: { ...auth, authorizeIamRole: async () => false },
    store: { beginOAuth: async () => { calls++; } } });
  for (const headers of [req.headers, { 'sec-fetch-site': 'cross-site' }]) {
    const r=response(); await start.handle({ ...req, headers },r,new URL(`/api/social-media/youtube/auth/start?privacy=${YOUTUBE_POLICY.version}`,env.PUBLIC_APP_ORIGIN),json);
    assert.equal(r.status,403);
  }
  assert.equal(calls,0);
});
test('exchange verifies actual channel and persists only authenticated AES-GCM ciphertext', async () => {
  const f=flow(); await createSocialYouTubeOAuthExchange({ env, fetchImpl:f.fetchImpl })(trusted);
  assert.equal(f.calls.length,3);
  assert.equal(f.calls[0].url,'https://oauth2.googleapis.com/token');
  assert.equal(new URLSearchParams(f.calls[0].options.body).get('code_verifier'),trusted.codeVerifier);
  assert.match(f.calls[1].url,/mine=true/);
  const row=JSON.parse(f.calls[2].options.body);
  assert.equal(row.platform,'youtube'); assert.equal(row.external_account_id,channel.id);
  assert.ok(!f.calls[2].options.body.includes(tokens.access_token));
  const [,iv,tag,bytes]=row.access_token_encrypted.split('.');
  const d=createDecipheriv('aes-256-gcm',Buffer.from(key,'hex'),Buffer.from(iv,'base64url'));
  d.setAAD(Buffer.from(JSON.stringify(['capital-social-youtube-v1',userId,'access'])));
  d.setAuthTag(Buffer.from(tag,'base64url'));
  assert.equal(Buffer.concat([d.update(Buffer.from(bytes,'base64url')),d.final()]).toString(),tokens.access_token);
});
test('missing scopes, wrong channel, ambiguous channel and forged persistence all fail closed', async () => {
  for (const options of [{ token:{ ...tokens,scope:scopes[0] } },{ channels:[] },
    { channels:[channel,channel] },{ mutate:x=>({ ...x,user_id:'forged' }) }]) {
    const f=flow(options);
    await assert.rejects(createSocialYouTubeOAuthExchange({ env,fetchImpl:f.fetchImpl })(trusted));
  }
  const f=flow();
  await assert.rejects(createSocialYouTubeOAuthExchange({ env:{ ...env,SOCIAL_YOUTUBE_EXPECTED_CHANNEL_ID:'UC'+'b'.repeat(22) },fetchImpl:f.fetchImpl })(trusted));
  assert.equal(f.calls.length,2);
  assert.equal(socialYouTubeOAuthConfigured({ ...env,SOCIAL_YOUTUBE_TOKEN_ENCRYPTION_KEY:'' }),false);
});
test('Google callback without channel is routed by matching state cookie and rejects replay', async () => {
  let used=false; const seen=[];
  const callback=createSocialOAuthCallback({ env,auth,store:{ consumeOAuthCallback:async x=>{
    if(used) throw Error('replay'); used=true; seen.push(x.channel);
    await x.exchangeCode({ ...trusted }); return { consumed:true,platform:'youtube' };
  } },exchangeCode:async x=>seen.push(x.channel) });
  const request={ ...req,headers:{ cookie:'capital_youtube_oauth_state='+state } };
  const url=new URL(redirectUri+'?state='+state+'&code=synthetic_code');
  const r=response(); await callback.handle(request,r,url,json);
  assert.equal(r.status,303); assert.equal(r.headers.Location,'/api/social-media/youtube/account/status'); assert.deepEqual(seen,['YOUTUBE','YOUTUBE']);
  assert.match(r.headers['Set-Cookie'].at(-1),/Max-Age=0/);
  const repeat=response(); await callback.handle(request,repeat,url,json);
  assert.equal(repeat.status,503);
});
test('owner diagnostics expose booleans, and non-owner cannot inspect configuration', async () => {
  const url=new URL('/api/social-media/youtube/account/diagnostics',env.PUBLIC_APP_ORIGIN);
  const r=response(); await createSocialYouTubeAccountStatus({ env,auth }).handle(req,r,url,json);
  assert.equal(r.status,200); assert.equal(r.body.ready,true);
  assert.ok(Object.values(r.body.checks).every(x=>typeof x==='boolean'));
  assert.ok(!JSON.stringify(r.body).includes(env.SOCIAL_YOUTUBE_OAUTH_CLIENT_SECRET));
  const deny=response(); await createSocialYouTubeAccountStatus({ env,auth:{ ...auth,authorizeIamRole:async()=>false } }).handle(req,deny,url,json);
  assert.equal(deny.status,404);
});

test('YouTube OAuth start and callback preserve session refresh cookies', async () => {
  for (const cookie of ['capital_session=synthetic; HttpOnly', ['capital_session=synthetic; HttpOnly','capital_refresh=synthetic; HttpOnly']]) {
    const refreshedAuth={ ...auth,verify:async (_req,res)=>{
      res.setHeader('Set-Cookie',cookie);return { userId,emailVerified:true };
    } };
    const started=response();
    await createSocialYouTubeOAuthStart({ env,auth:refreshedAuth,store:{ beginOAuth:async()=>({ state }) } })
      .handle(req,started,new URL(`/api/social-media/youtube/auth/start?privacy=${YOUTUBE_POLICY.version}`,env.PUBLIC_APP_ORIGIN),json);
    assert.equal(started.status,303);
    const expected=Array.isArray(cookie)?cookie:[cookie];
    assert.deepEqual(started.headers['Set-Cookie'].slice(0,-1),expected);
    const completed=response();
    await createSocialOAuthCallback({ env,auth:refreshedAuth,store:{ consumeOAuthCallback:async()=>({ consumed:true,platform:'youtube' }) },exchangeCode:async()=>{} })
      .handle({ ...req,headers:{ cookie:'capital_youtube_oauth_state='+state } },completed,new URL(redirectUri+'?state='+state+'&code=synthetic'),json);
    assert.equal(completed.status,303);
    assert.deepEqual(completed.headers['Set-Cookie'].slice(0,-1),expected);
    assert.match(completed.headers['Set-Cookie'].at(-1),/Max-Age=0/);
  }
});

test('owner must explicitly accept current YouTube policy before OAuth state or Google redirect', async () => {
  let starts = 0;
  const start = createSocialYouTubeOAuthStart({ env, auth, store: { beginOAuth: async () => { starts++; return { state }; } } });
  for (const query of ['', '?privacy=old', `?privacy=${YOUTUBE_POLICY.version}&privacy=${YOUTUBE_POLICY.version}`]) {
    const r = response();
    await start.handle(req,r,new URL('/api/social-media/youtube/auth/start'+query,env.PUBLIC_APP_ORIGIN),json);
    assert.equal(r.status,303); assert.equal(r.headers.Location,'/api/social-media/youtube/account/connect');
  }
  assert.equal(starts,0);
});

test('English consent is explicit and keeps exact scopes, state, cookie and PKCE', async () => {
  const r=response(); const starts=[];
  const start=createSocialYouTubeOAuthStart({ env, auth, store:{beginOAuth:async x=>{starts.push(x);return {state};}}});
  await start.handle(req,r,new URL(`/api/social-media/youtube/auth/start?privacy=${YOUTUBE_POLICY.version}&hl=en`,env.PUBLIC_APP_ORIGIN),json);
  const target=new URL(r.headers.Location);
  assert.equal(target.searchParams.get('hl'),'en'); assert.equal(target.searchParams.get('prompt'),'consent');
  assert.equal(target.searchParams.get('scope'),scopes.join(' ')); assert.equal(target.searchParams.get('state'),state);
  assert.equal(starts.length,1); assert.match(r.headers['Set-Cookie'].at(-1),/HttpOnly; Secure; SameSite=Lax/);
});
test('unsupported, duplicate or injected language parameters do not issue state',async()=>{
  let calls=0;
  const start=createSocialYouTubeOAuthStart({env,auth,store:{beginOAuth:async()=>{calls++;return {state};}}});
  for(const extra of ['hl=de','hl=en&hl=en','hl=en&redirect_uri=https://evil.example','hl=']){
    const r=response();await start.handle(req,r,new URL(`/api/social-media/youtube/auth/start?privacy=${YOUTUBE_POLICY.version}&${extra}`,env.PUBLIC_APP_ORIGIN),json);
    assert.equal(r.status,303);assert.equal(r.headers.Location,'/api/social-media/youtube/account/connect');
  }
  assert.equal(calls,0);
});
test('connection page links English consent and preserves explicit policy acceptance',async()=>{
  for(const suffix of ['', '?hl=en']){
    const r=response();let html='';r.end=x=>{html=x;};
    await createSocialYouTubeAccountStatus({env,auth}).handle(req,r,new URL('/api/social-media/youtube/account/connect'+suffix,env.PUBLIC_APP_ORIGIN),json);
    assert.equal(r.status,200);assert.match(html,/Record Google consent in English/);
    assert.match(html,/name="privacy"[^>]*required/);
    assert.equal(html.includes('type="hidden" name="hl" value="en"'),suffix==='?hl=en');
  }
});

test('English connect allows no arbitrary query parameters or non-owner access',async()=>{
 for(const query of ['?hl=de','?hl=en&hl=en','?hl=en&next=https://evil.example']){
  const r=response();await createSocialYouTubeAccountStatus({env,auth}).handle(req,r,new URL('/api/social-media/youtube/account/connect'+query,env.PUBLIC_APP_ORIGIN),json);assert.equal(r.status,405);
 }
 const r=response();await createSocialYouTubeAccountStatus({env,auth:{...auth,authorizeIamRole:async()=>false}}).handle(req,r,new URL('/api/social-media/youtube/account/connect?hl=en',env.PUBLIC_APP_ORIGIN),json);assert.equal(r.status,403);
});

test('English owner page translates all app consent copy and preserves language in policy links', async()=>{
 const r=response();let html='';r.end=x=>{html=x;};
 await createSocialYouTubeAccountStatus({env,auth}).handle(req,r,new URL('/api/social-media/youtube/account/connect?hl=en',env.PUBLIC_APP_ORIGIN),json);
 assert.equal(r.headers['Content-Language'],'en');assert.match(html,/<html lang="en">/);
 for(const text of ['Connect YouTube to CAPITAL AI','I accept the privacy information','Open Google consent in English','Delete connection and stored YouTube data'])assert.ok(html.includes(text));
 for(const text of ['Wähle bei Google','Ich akzeptiere','Löschung ausführen','YouTube mit CAPITAL AI verbinden'])assert.ok(!html.includes(text));
 assert.match(html,/Manage YouTube connection as signed-in owner/);assert.match(html,/required/);
});
test('rendered English form issues a Google redirect with hl=en and fresh session-bound state',async()=>{
 const r=response();let html='';r.end=x=>{html=x;};
 await createSocialYouTubeAccountStatus({env,auth}).handle(req,r,new URL('/api/social-media/youtube/account/connect?hl=en',env.PUBLIC_APP_ORIGIN),json);
 const fields=[...html.matchAll(/<input[^>]+name="(hl|privacy)"[^>]+value="([^"]+)"/g)];
 const query=new URLSearchParams(fields.map(m=>[m[1],m[2]]));assert.equal(query.get('hl'),'en');
 const started=response();await createSocialYouTubeOAuthStart({env,auth,store:{beginOAuth:async()=>({state})}}).handle(req,started,new URL('/api/social-media/youtube/auth/start?'+query,env.PUBLIC_APP_ORIGIN),json);
 assert.equal(started.status,303);const target=new URL(started.headers.Location);
 assert.equal(target.hostname,'accounts.google.com');assert.equal(target.searchParams.get('hl'),'en');assert.equal(target.searchParams.get('scope'),scopes.join(' '));
 // A valid server redirect alone is insufficient: Chromium also checks the
 // initiating document's form-action policy against the redirect destination.
 for (const name of ['Content-Security-Policy','Content-Security-Policy-Report-Only']) {
  const directive=r.headers[name].split('; ').find(x=>x.startsWith('form-action '));
  assert.equal(directive, "form-action 'self' " + target.origin);
 }
});

test('YouTube form allows only the fixed Google origin and keeps other policies unchanged',async()=>{
 for(const suffix of ['', '?hl=en']){
  const r=response();Object.assign(r.headers,SECURITY_HEADERS);
  await createSocialYouTubeAccountStatus({env,auth}).handle(req,r,new URL('/api/social-media/youtube/account/connect'+suffix,env.PUBLIC_APP_ORIGIN),json);
  assert.equal(r.status,200);
  for(const name of ['Content-Security-Policy','Content-Security-Policy-Report-Only']){
   const before=SECURITY_HEADERS[name].split('; '),after=r.headers[name].split('; ');
   assert.deepEqual(after.filter(x=>!x.startsWith('form-action ')),before.filter(x=>!x.startsWith('form-action ')));
   assert.deepEqual(after.filter(x=>x.startsWith('form-action ')),["form-action 'self' https://accounts.google.com"]);
   assert.ok(before.includes("form-action 'self'"));
  }
  assert.equal(r.headers['X-Frame-Options'],'DENY');
 }
 for(const path of ['/api/social-media/youtube/account/connect?hl=en&next=https://evil.example','/api/social-media/youtube/account/status']){
  const r=response();Object.assign(r.headers,SECURITY_HEADERS);
  await createSocialYouTubeAccountStatus({env,auth,fetchImpl:async()=>({ok:true,text:async()=>'[]'})}).handle(req,r,new URL(path,env.PUBLIC_APP_ORIGIN),json);
  assert.equal(r.headers['Content-Security-Policy'],SECURITY_HEADERS['Content-Security-Policy']);
 }
 const denied=response();Object.assign(denied.headers,SECURITY_HEADERS);
 await createSocialYouTubeAccountStatus({env,auth:{...auth,authorizeIamRole:async()=>false}}).handle(req,denied,new URL('/api/social-media/youtube/account/connect?hl=en',env.PUBLIC_APP_ORIGIN),json);
 assert.equal(denied.status,403);assert.equal(denied.headers['Content-Security-Policy'],SECURITY_HEADERS['Content-Security-Policy']);
});
