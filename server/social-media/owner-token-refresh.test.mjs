import test from 'node:test';
import assert from 'node:assert/strict';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { createSocialOwnerTokenRefresh } from './owner-token-refresh.mjs';

const USER = 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
const KEY = 'ab'.repeat(32);
const JWT = 'synthetic-jwt-' + 'j'.repeat(80);
const X_SCOPES = ['tweet.read','tweet.write','users.read','offline.access'];
const YT_SCOPES = ['https://www.googleapis.com/auth/youtube.readonly','https://www.googleapis.com/auth/youtube.upload'];
const ENV = {
  SOCIAL_X_EDGE_STORE_ENABLED: 'true',
  SOCIAL_X_EDGE_WORKLOAD_SECRET: KEY,
  SOCIAL_X_OAUTH_CONNECT_ENABLED: 'true',
  SOCIAL_YOUTUBE_OAUTH_CONNECT_ENABLED: 'true',
  SOCIAL_OAUTH_CALLBACK_ENABLED: 'true',
  PUBLIC_APP_ORIGIN: 'https://capital-ai.online/',
  SUPABASE_URL: 'https://fixture.supabase.co/',
  SUPABASE_PUBLISHABLE_KEY: 'synthetic-publishable-key',
  SOCIAL_X_OAUTH_CLIENT_ID: 'synthetic-x-client',
  SOCIAL_X_OAUTH_CLIENT_SECRET: 'synthetic-x-secret',
  SOCIAL_X_TOKEN_ENCRYPTION_KEY: KEY,
  SOCIAL_YOUTUBE_OAUTH_CLIENT_ID: 'synthetic.apps.googleusercontent.com',
  SOCIAL_YOUTUBE_OAUTH_CLIENT_SECRET: 'synthetic-youtube-secret',
  SOCIAL_YOUTUBE_TOKEN_ENCRYPTION_KEY: KEY,
};
const prefix = channel => channel === 'X' ? 'capital-social-x-v1' : 'capital-social-youtube-v1';
const cryptoKey = Buffer.from(KEY, 'hex');
function seal(value, channel, kind='refresh') {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', cryptoKey, iv);
  cipher.setAAD(Buffer.from(JSON.stringify([prefix(channel), USER, kind])));
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return 'v1.' + [iv, cipher.getAuthTag(), encrypted].map(x => x.toString('base64url')).join('.');
}
function decrypt(ciphertext, channel, kind) {
  const [,iv,tag,data] = ciphertext.split('.');
  const decipher = createDecipheriv('aes-256-gcm', cryptoKey, Buffer.from(iv,'base64url'));
  decipher.setAAD(Buffer.from(JSON.stringify([prefix(channel), USER, kind])));
  decipher.setAuthTag(Buffer.from(tag,'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data,'base64url')), decipher.final()]).toString('utf8');
}
function makeResponse() {
  return { status: null, body: null, headers: {},
    setHeader(k,v) { this.headers[k]=v; }, writeHead(s) { this.status=s; },
    end() {},
  };
}
const json = (res,code,body) => { res.status=code; res.body=body; };
const request = () => ({ method: 'POST', headers: {
  origin: 'https://capital-ai.online', 'sec-fetch-site': 'same-origin',
} });
const auth = {
  verify: async () => ({userId: USER, emailVerified: true}),
  authorizeIamRole: async () => true,
  internalAccessToken: async () => JWT,
};
function fixture(channel, { provider, ownerAuth=auth } = {}) {
  const oldToken = 'synthetic-refresh-OLD-TOKEN';
  const previous = seal(oldToken, channel);
  const calls = { lease: [], finish: [], end: [], network: [] };
  const accountId = channel === 'X' ? '12345678901' : 'UC' + 'x'.repeat(22);
  const edgeFactory = input => {
    assert.equal(input.channel, channel);
    assert.equal(input.userAccessToken, JWT);
    return {
      async refreshClaim(userId, leaseId) {
        assert.equal(userId, USER);
        calls.lease.push(leaseId);
        return { claimed: true, leaseId, refreshCipher: previous,
          accountId, scopes: channel === 'X' ? X_SCOPES : YT_SCOPES };
      },
      async refreshFinish(...args) {
        calls.finish.push(args);
        return { refreshed: true, expiresAt: args[5], channel };
      },
      async refreshEnd(...args) {
        calls.end.push(args);
        return { channel, status: args[2] === 'rate_limited' ? 'retry_later' : 'reconnect_required' };
      },
    };
  };
  const fetchImpl = async (uri, options) => {
    calls.network.push(String(uri));
    if (provider) return provider(uri, options, { oldToken, accountId });
    if (String(uri).includes('token')) {
      assert.equal(new URLSearchParams(options.body).get('refresh_token'), oldToken);
      return { ok: true, status: 200, text: async () => JSON.stringify({
        access_token: 'synthetic-access-NEW-TOKEN',
        ...(channel === 'X' ? { refresh_token: 'synthetic-refresh-NEW-TOKEN' } : {}),
        expires_in: 3600, token_type: 'Bearer',
        scope: (channel === 'X' ? X_SCOPES : YT_SCOPES).join(' '),
      }) };
    }
    return { ok: true, status: 200, text: async () => JSON.stringify(
      channel === 'X' ? {data:{id:accountId}} : {items:[{id:accountId}]}) };
  };
  return { handler: createSocialOwnerTokenRefresh({
    env: ENV, auth:ownerAuth, edgeFactory, fetchImpl,
  }), calls, previous, oldToken };
}
const url = channel => new URL(
  '/api/social-media/' + (channel==='X'?'x':'youtube') + '/account/refresh',
  'https://capital-ai.online');

test('X rotates both sealed tokens, verifies owner account, exposes no secrets', async () => {
  const {handler,calls,oldToken} = fixture('X');
  const res=makeResponse();
  assert.equal(await handler.handle(request(),res,url('X'),json),true);
  assert.equal(res.status,200);
  assert.equal(res.body.channel,'X');
  assert.equal(res.body.refreshed,true);
  assert.equal(calls.finish.length,1);
  const args=calls.finish[0];
  assert.equal(args[0],USER);
  assert.equal(args[1],calls.lease[0]);
  assert.equal(decrypt(args[3],'X','access'),'synthetic-access-NEW-TOKEN');
  assert.equal(decrypt(args[4],'X','refresh'),'synthetic-refresh-NEW-TOKEN');
  assert.notEqual(decrypt(args[4],'X','refresh'),oldToken);
  assert.equal(calls.end.length,0);
  assert.ok(!JSON.stringify(res.body).includes('synthetic-access'));
  assert.ok(!JSON.stringify(res.body).includes('synthetic-refresh'));
  assert.ok(calls.network.some(x=>x.endsWith('/2/users/me')));
});

test('YouTube reuses old refresh token when Google does not rotate it', async () => {
  const {handler,calls,oldToken}=fixture('YOUTUBE');
  const res=makeResponse();
  await handler.handle(request(),res,url('YOUTUBE'),json);
  assert.equal(res.status,200);
  assert.equal(decrypt(calls.finish[0][4],'YOUTUBE','refresh'),oldToken);
  assert.ok(calls.network.some(x=>x.includes('/youtube/v3/channels')));
});

test('X invalid_grant becomes reconnect_required without second provider call', async () => {
  const {handler,calls}=fixture('X',{provider:async () => ({
    ok:false,status:400,text:async()=>JSON.stringify({error:'invalid_grant'})})});
  const res=makeResponse();
  await handler.handle(request(),res,url('X'),json);
  assert.equal(res.status,409);
  assert.equal(res.body.status,'reconnect_required');
  assert.equal(calls.finish.length,0);
  assert.equal(calls.end[0][2],'reconnect');
  assert.equal(calls.network.length,1);
});

test('429 has a bounded cooldown; no blind retry', async () => {
  const {handler,calls}=fixture('X',{provider:async () => ({
    ok:false,status:429,text:async()=>JSON.stringify({})})});
  const res=makeResponse();
  await handler.handle(request(),res,url('X'),json);
  assert.equal(res.status,429);
  assert.equal(calls.end[0][2],'rate_limited');
  assert.equal(calls.network.length,1);
});

test('ambiguous provider request forbids replay and requests reconnect', async () => {
  const {handler,calls}=fixture('X',{provider:async()=>{throw Error('secret token or timeout');}});
  const res=makeResponse();
  await handler.handle(request(),res,url('X'),json);
  assert.equal(res.status,503);
  assert.equal(res.body.status,'reconnect_required');
  assert.equal(calls.end.length,1);
  assert.equal(calls.finish.length,0);
  assert.equal(calls.network.length,1);
  assert.ok(!JSON.stringify(res.body).includes('secret'));
});

test('other account id cannot be rotated', async () => {
  let reads=0;
  const {handler,calls}=fixture('X',{provider:async(uri) => {
    reads++;
    if(String(uri).includes('token')) return {ok:true,status:200,text:async()=>JSON.stringify({
      access_token:'synthetic-access-NEW-TOKEN',
      refresh_token:'synthetic-refresh-NEW-TOKEN',
      expires_in:3600,token_type:'Bearer',scope:X_SCOPES.join(' '),
    })};
    return {ok:true,status:200,text:async()=>JSON.stringify({data:{id:'99999'}})};
  }});
  const res=makeResponse();
  await handler.handle(request(),res,url('X'),json);
  assert.equal(res.status,503);
  assert.equal(calls.finish.length,0);
  assert.equal(calls.end[0][2],'reconnect');
  assert.equal(reads,2);
});

test('missing IAM owner or cross-site origin never claims a token', async () => {
  let claims=0;
  const handler=createSocialOwnerTokenRefresh({env:ENV,auth:{
    verify:async()=>({userId:USER,emailVerified:true}),
    authorizeIamRole:async()=>false,
  },edgeFactory:()=>{claims++; throw Error('must never run');}});
  const denied=makeResponse();
  await handler.handle(request(),denied,url('X'),json);
  assert.equal(denied.status,403);
  const evil=makeResponse(), evilReq=request();
  evilReq.headers.origin='https://untrusted.example';
  await handler.handle(evilReq,evil,url('X'),json);
  assert.equal(evil.status,403);
  assert.equal(claims,0);
});

test('GET and absent edge mode fail closed without token activity', async () => {
  const handler=createSocialOwnerTokenRefresh({env:{...ENV,SOCIAL_X_EDGE_STORE_ENABLED:'false'},auth});
  const r=makeResponse();
  await handler.handle(request(),r,url('X'),json);
  assert.equal(r.status,503);
  const get=makeResponse();
  await handler.handle({...request(),method:'GET'},get,url('X'),json);
  assert.equal(get.status,405);
});
