import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createHandler } from '../../supabase/functions/capital-social-x-vault/index.ts';

const WORKLOAD = 'ab'.repeat(32);
const EDGE_URL = 'https://example.supabase.co/functions/v1/capital-social-x-vault';
const JWT = 'testtoken'.repeat(10);
function signedRequest(data, { key = WORKLOAD, jwt = JWT, at = Date.now(),
  tamperBody = null, omitSignature = false } = {}) {
  const body = JSON.stringify(data);
  const timestamp = String(at);
  const signature = createHmac('sha256', Buffer.from(key, 'hex'))
    .update(timestamp + '\n' + jwt + '\n' + body).digest('hex');
  return new Request(EDGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt,
      'x-capital-edge-timestamp': timestamp,
      ...(omitSignature ? {} : { 'x-capital-edge-signature': signature }) },
    body: tamperBody || body,
  });
}
const env = { get(name) { return ({
  SUPABASE_URL: 'https://example.supabase.co/',
  SUPABASE_ANON_KEY: 'synthetic-publishable-key-for-testing',
  SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-key-for-testing',
  SOCIAL_X_EDGE_WORKLOAD_SECRET: WORKLOAD,
})[name] || null; } };

test('YouTube credential reads remain signed, owner-bound and ciphertext-only', async () => {
  const userId='d0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
  const account={id:'835eabeb-8730-4d8f-9767-cea8297ae0e5',user_id:userId,platform:'youtube',status:'connected',
    external_account_id:'UC'+'a'.repeat(22),scopes:['https://www.googleapis.com/auth/youtube.readonly','https://www.googleapis.com/auth/youtube.upload'],
    access_token_encrypted:'v1.ciphertext_access',refresh_token_encrypted:'v1.ciphertext_refresh'};
  let requests=0;
  const config={get:name=>name==='SUPABASE_SERVICE_ROLE_KEY'?'sb_secret_synthetic_fixture':env.get(name)};
  const handler=createHandler({env:config,fetchImpl:async(url)=>{
    requests++;
    const value=String(url).includes('/auth/v1/user')?{id:userId,email_confirmed_at:'2026-10-01'}:
      String(url).includes('/profiles')?[{id:userId,iam_role:'owner'}]:[account];
    return {ok:true,text:async()=>JSON.stringify(value)};
  }});
  const valid=await handler(signedRequest({operation:'credentials',channel:'YOUTUBE',userId}));
  assert.equal(valid.status,200);assert.equal((await valid.json()).access_token_encrypted,account.access_token_encrypted);
  const denied=await handler(signedRequest({operation:'credentials',channel:'YOUTUBE',userId:'forged'}));
  assert.equal(denied.status,503);
  const count=requests;assert.equal((await handler(signedRequest({operation:'credentials',channel:'YOUTUBE',userId},{omitSignature:true}))).status,503);
  assert.equal(requests,count);
});

test('YouTube uses the same workload boundary but binds state to youtube, never x', async () => {
  const userId = 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
  const writes = [];
  const config = { get(name) { return name === 'SUPABASE_SERVICE_ROLE_KEY'
    ? 'sb_secret_synthetic_only_for_tests' : env.get(name); } };
  const handler = createHandler({ env: config, fetchImpl: async (url, options) => {
    const output = String(url).includes('/auth/v1/user')
      ? { id: userId, email_confirmed_at: '2026-10-01' }
      : String(url).includes('/profiles') ? [{ id: userId, iam_role: 'owner' }]
        : (writes.push(JSON.parse(options.body)), null);
    return { ok: true, text: async () => JSON.stringify(output) };
  } });
  const body = { operation: 'begin', channel: 'YOUTUBE', userId,
    stateHash: 'a'.repeat(64), codeVerifier: 'v'.repeat(43),
    redirectUri: 'https://capital-ai.online/api/social-media/auth/callback' };
  assert.equal((await handler(signedRequest(body))).status, 200);
  assert.equal(writes[0].platform, 'youtube');
  assert.equal(writes[0].user_id, userId);
  assert.equal((await handler(signedRequest(body, {
    tamperBody: JSON.stringify({ ...body, channel: 'X' }),
  }))).status, 503);
  assert.equal(writes.length, 1);
});
test('X Edge rejects anonymous traffic before any network calls', async () => {
  let calls = 0;
  const handler = createHandler({ env, fetchImpl: async () => { calls++; throw Error(); } });
  const response = await handler(new Request('https://example.supabase.co/functions/v1/capital-social-x-vault', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation: 'status' }),
  }));
  assert.equal(response.status, 401);
  assert.equal(calls, 0);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});
test('X Edge denies non-POST methods and incorrect content type', async () => {
  const handler = createHandler({ env });
  const u = 'https://example.supabase.co/functions/v1/capital-social-x-vault';
  assert.equal((await handler(new Request(u))).status, 405);
  assert.equal((await handler(new Request(u, { method: 'POST',
    body: '{}' }))).status, 415);
});

test('Edge accepts only verified owner and performs a scoped state insertion', async () => {
  const userId = 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
  const config = { get(name) { return ({
    SUPABASE_URL: 'https://example.supabase.co/',
    SUPABASE_ANON_KEY: 'synthetic-publishable-key-for-testing',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_synthetic_only_for_tests',
    SOCIAL_X_EDGE_WORKLOAD_SECRET: WORKLOAD,
  })[name] || null; } };
  const accesses = [];
  const handler = createHandler({ env: config, fetchImpl: async (url, options) => {
    accesses.push({ url: String(url), options });
    const path = String(url);
    const output = path.includes('/auth/v1/user')
      ? { id: userId, email_confirmed_at: '2026-10-01T01:00:00Z' }
      : path.includes('/profiles') ? [{ id: userId, iam_role: 'owner' }] : null;
    return { ok: true, text: async () => JSON.stringify(output) };
  } });
  const response = await handler(signedRequest({ operation: 'begin', userId,
    stateHash: 'a'.repeat(64), codeVerifier: 'v'.repeat(43),
    redirectUri: 'https://capital-ai.online/api/social-media/auth/callback' }));
  assert.equal(response.status, 200);
  const responseText = await response.text();
  assert.deepEqual(JSON.parse(responseText), { prepared: true });
  assert.equal(accesses.length, 3);
  assert.equal(accesses[0].options.headers.apikey, config.get('SUPABASE_ANON_KEY'));
  assert.match(JSON.stringify(accesses[2]), /state_token/);
  assert.ok(!responseText.includes('sb_secret_'));
});

test('Edge denies a non-owner before any privileged database write', async () => {
  const userId = 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
  const config = { get(name) { return ({
    SUPABASE_URL: 'https://example.supabase.co/',
    SUPABASE_ANON_KEY: 'synthetic-publishable-key-for-testing',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_synthetic_only_for_tests',
    SOCIAL_X_EDGE_WORKLOAD_SECRET: WORKLOAD,
  })[name] || null; } };
  let reads = 0;
  const handler = createHandler({ env: config, fetchImpl: async (url) => {
    reads++;
    const output = String(url).includes('/auth/v1/user')
      ? { id: userId, email_confirmed_at: '2026-10-01T01:00:00Z' }
      : [{ id: userId, iam_role: 'user' }];
    return { ok: true, text: async () => JSON.stringify(output) };
  } });
  const result = await handler(signedRequest({ operation: 'begin', userId,
    stateHash: 'a'.repeat(64), codeVerifier: 'v'.repeat(43),
    redirectUri: 'https://capital-ai.online/api/social-media/auth/callback' }));
  assert.equal(result.status, 503);
  assert.equal(reads, 2);
});

test('stolen owner JWT cannot create an account without Render workload proof', async () => {
  let calls = 0;
  const handler = createHandler({ env, fetchImpl: async () => { calls++; throw Error(); } });
  const data = { operation: 'persist', userId: 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101',
    account: { external_account_id: '123', handle: 'attacker' } };
  for (const request of [
    signedRequest(data, { omitSignature: true }),
    signedRequest(data, { key: 'ff'.repeat(32) }),
    signedRequest(data, { at: Date.now() - 120000 }),
    signedRequest(data, { tamperBody: JSON.stringify({ ...data, operation: 'consume' }) }),
  ]) {
    const result = await handler(request);
    assert.equal(result.status, 503);
  }
  assert.equal(calls, 0, 'invalid workload proof must cause no Auth or DB calls');
});

test('Edge denies requests when workload key was not provisioned', async () => {
  const noKey = { get(name) { return name === 'SOCIAL_X_EDGE_WORKLOAD_SECRET'
    ? null : env.get(name); } };
  let calls = 0;
  const handler = createHandler({ env: noKey, fetchImpl: async () => { calls++; throw Error(); } });
  const result = await handler(signedRequest({ operation: 'status',
    userId: 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101' }));
  assert.equal(result.status, 503);
  assert.equal(calls, 0);
});


test('Edge consume returns only one-time PKCE verifier after atomic RPC readback', async () => {
  const userId = 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
  const stateHash = 'a'.repeat(64);
  const verifier = 'v'.repeat(43);
  const calls = [];
  const config = { get(name) { return ({
    SUPABASE_URL: 'https://example.supabase.co/',
    SUPABASE_ANON_KEY: 'synthetic-publishable-key-for-testing',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_synthetic_only_for_tests',
    SOCIAL_X_EDGE_WORKLOAD_SECRET: WORKLOAD,
  })[name] || null; } };
  const handler = createHandler({ env: config, fetchImpl: async (url, options) => {
    calls.push({ url: String(url), options });
    const path = String(url);
    const output = path.includes('/auth/v1/user')
      ? { id: userId, email_confirmed_at: '2026-10-01T01:00:00Z' }
      : path.includes('/profiles') ? [{ id: userId, iam_role: 'owner' }]
        : { user_id: userId, platform: 'x', redirect_uri:
          'https://capital-ai.online/api/social-media/auth/callback',
          state_token: stateHash, used_at: new Date().toISOString(), code_verifier: verifier };
    return { ok: true, text: async () => JSON.stringify(output) };
  } });
  const input = { operation: 'consume', userId, stateHash,
    redirectUri: 'https://capital-ai.online/api/social-media/auth/callback' };
  const accepted = await handler(signedRequest(input));
  assert.equal(accepted.status, 200);
  assert.deepEqual(await accepted.json(), { consumed: true, codeVerifier: verifier });
  assert.equal(calls.length, 3);
  assert.ok(calls[2].url.endsWith('/rest/v1/rpc/capital_social_consume_oauth_state'));
  assert.equal(JSON.parse(calls[2].options.body).p_user_id, userId);
  assert.equal(JSON.parse(calls[2].options.body).p_state_hash, stateHash);

  // A replay/expired state rejected by the DB must never return a verifier.
  const rejected = createHandler({ env: config, fetchImpl: async (url) => {
    const path = String(url);
    if (path.includes('/rest/v1/rpc/')) return { ok: false, text: async () => '{}' };
    const output = path.includes('/auth/v1/user')
      ? { id: userId, email_confirmed_at: '2026-10-01T01:00:00Z' }
      : [{ id: userId, iam_role: 'owner' }];
    return { ok: true, text: async () => JSON.stringify(output) };
  } });
  const replay = await rejected(signedRequest(input));
  assert.equal(replay.status, 503);
  assert.ok(!JSON.stringify(await replay.json()).includes(verifier));
});

test('Edge persists only signed owner-bound ciphertext and never returns the ciphertext', async () => {
  const userId = 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
  const scopes = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'];
  const ciphertext = 'v1.' + 'A'.repeat(16) + '.' + 'B'.repeat(22) + '.' + 'C'.repeat(18);
  const account = {
    external_account_id: '123456789', handle: 'CapitalAITest', account_name: 'Capital AI',
    access_token_encrypted: ciphertext, refresh_token_encrypted: ciphertext,
    token_expires_at: new Date(Date.now() + 3600000).toISOString(), scopes,
  };
  let dbWritten = 0;
  const config = { get(name) { return ({
    SUPABASE_URL: 'https://example.supabase.co/',
    SUPABASE_ANON_KEY: 'synthetic-publishable-key-for-testing',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_synthetic_only_for_tests',
    SOCIAL_X_EDGE_WORKLOAD_SECRET: WORKLOAD,
  })[name] || null; } };
  const handler = createHandler({ env: config, fetchImpl: async (url, options) => {
    const path = String(url);
    const output = path.includes('/auth/v1/user')
      ? { id: userId, email_confirmed_at: '2026-10-01T01:00:00Z' }
      : path.includes('/profiles') ? [{ id: userId, iam_role: 'owner' }]
        : (() => { dbWritten++; return [JSON.parse(options.body)]; })();
    return { ok: true, text: async () => JSON.stringify(output) };
  } });
  const result = await handler(signedRequest({ operation: 'persist', userId, account }));
  assert.equal(result.status, 200);
  const response = await result.json();
  assert.deepEqual(response, { connected: true, accountId: '123456789', handle: 'CapitalAITest' });
  assert.ok(!JSON.stringify(response).includes('v1.'));
  assert.equal(dbWritten, 1);

  const tampered = await handler(signedRequest({ operation: 'persist', userId,
    account: { ...account, external_account_id: 'attacker-chosen-id' } }));
  assert.equal(tampered.status, 503);
  assert.equal(dbWritten, 1);
});

test('Edge returns token-free account status, owner identity bound', async () => {
  const userId = 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
  const config = { get(name) { return ({
    SUPABASE_URL: 'https://example.supabase.co/',
    SUPABASE_ANON_KEY: 'synthetic-publishable-key-for-testing',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_synthetic_only_for_tests',
    SOCIAL_X_EDGE_WORKLOAD_SECRET: WORKLOAD,
  })[name] || null; } };
  const handler = createHandler({ env: config, fetchImpl: async (url) => {
    const path = String(url);
    const output = path.includes('/auth/v1/user')
      ? { id: userId, email_confirmed_at: '2026-10-01T01:00:00Z' }
      : path.includes('/profiles') ? [{ id: userId, iam_role: 'owner' }]
        : [{ platform: 'x', external_account_id: '12345', handle: 'capitalai',
            status: 'connected', scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
            token_expires_at: new Date(Date.now() + 3600000).toISOString(),
            access_token_encrypted: 'MUST_NOT_APPEAR' }];
    return { ok: true, text: async () => JSON.stringify(output) };
  } });
  const result = await handler(signedRequest({ operation: 'status', userId }));
  assert.equal(result.status, 200);
  const body = await result.json();
  assert.equal(body.connected, true);
  assert.equal(body.handle, '@capitalai');
  assert.equal(body.accountId, '12345');
  assert.ok(!JSON.stringify(body).includes('MUST_NOT_APPEAR'));

  // Even a valid workload credential and owner JWT may not act on another user ID.
  const crossUser = await handler(signedRequest({ operation: 'status',
    userId: 'aae0e41d-9566-430a-b698-3cf50bbb4ec0' }));
  assert.equal(crossUser.status, 503);
});

test('Edge verifies canonical Render-generated Base64 workload keys', async () => {
  const userId = 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
  const config = { get(name) {
    if (name === 'SOCIAL_X_EDGE_WORKLOAD_SECRET') return Buffer.from(WORKLOAD, 'hex').toString('base64');
    if (name === 'SUPABASE_SERVICE_ROLE_KEY') return 'sb_secret_synthetic_only_for_tests';
    return env.get(name);
  } };
  const handler = createHandler({ env: config, fetchImpl: async (url) => {
    const path = String(url);
    const output = path.includes('/auth/v1/user')
      ? { id: userId, email_confirmed_at: '2026-10-01T01:00:00Z' }
      : path.includes('/profiles') ? [{ id: userId, iam_role: 'owner' }] : [];
    return { ok: true, text: async () => JSON.stringify(output) };
  } });
  const response = await handler(signedRequest({ operation: 'status', userId }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, 'not_connected');
});

test('Edge refresh claim returns sealed credential only to signed owner workload', async () => {
  const userId = 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
  const leaseId = '8f718548-44e9-44ee-8fbd-6595eecfb944';
  const cipher = 'v1.' + 'A'.repeat(16) + '.' + 'B'.repeat(22) + '.' + 'C'.repeat(18);
  const scopes = ['tweet.read','tweet.write','users.read','offline.access'];
  const config = { get(name) { return name === 'SUPABASE_SERVICE_ROLE_KEY'
    ? 'sb_secret_synthetic_only_for_tests' : env.get(name); } };
  let claimCalls = 0;
  const handler = createHandler({ env: config, fetchImpl: async (url, options) => {
    const path = String(url);
    const response = path.includes('/auth/v1/user')
      ? { id: userId, email_confirmed_at: '2026-10-01' }
      : path.includes('/profiles') ? [{ id: userId, iam_role: 'owner' }]
      : (() => {
        claimCalls++;
        assert.ok(path.endsWith('capital_social_claim_token_refresh'));
        assert.deepEqual(JSON.parse(options.body), {
          p_user_id:userId,p_platform:'x',p_lease_id:leaseId,
        });
        return { user_id:userId,platform:'x',refresh_lease_id:leaseId,
          refresh_token_encrypted:cipher,external_account_id:'12345',
          handle:'capitalai',scopes };
      })();
    return {ok:true,text:async()=>JSON.stringify(response)};
  } });
  const accepted = await handler(signedRequest({
    operation:'refresh_claim',userId,channel:'X',leaseId,
  }));
  assert.equal(accepted.status,200);
  assert.equal((await accepted.json()).refreshCipher,cipher);
  assert.equal(claimCalls,1);
  const crossUser = await handler(signedRequest({
    operation:'refresh_claim',userId:'aae0e41d-9566-430a-b698-3cf50bbb4ec0',
    channel:'X',leaseId,
  }));
  assert.equal(crossUser.status,503);
  assert.equal(claimCalls,1);
});

test('Edge refresh CAS rotation never reflects ciphertext or allows invalid lease', async () => {
  const userId = 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
  const leaseId = '8f718548-44e9-44ee-8fbd-6595eecfb944';
  const previous = 'v1.' + 'A'.repeat(16) + '.' + 'B'.repeat(22) + '.' + 'C'.repeat(18);
  const access = 'v1.' + 'D'.repeat(16) + '.' + 'E'.repeat(22) + '.' + 'F'.repeat(18);
  const refresh = 'v1.' + 'G'.repeat(16) + '.' + 'H'.repeat(22) + '.' + 'I'.repeat(18);
  const expiresAt = new Date(Date.now()+3600000).toISOString();
  const config = { get(name) { return name === 'SUPABASE_SERVICE_ROLE_KEY'
    ? 'sb_secret_synthetic_only_for_tests' : env.get(name); } };
  let calls=0;
  const handler = createHandler({env:config,fetchImpl:async(uri,options)=>{
    const path=String(uri);
    const output=path.includes('/auth/v1/user')
      ? {id:userId,email_confirmed_at:'2026-10-01'}
      : path.includes('/profiles') ? [{id:userId,iam_role:'owner'}]
      : (()=>{
        calls++;
        assert.ok(path.endsWith('capital_social_finish_token_refresh'));
        const body=JSON.parse(options.body);
        assert.equal(body.p_previous_cipher,previous);
        assert.equal(body.p_lease_id,leaseId);
        return {user_id:userId,platform:'x',status:'connected',
          refresh_lease_id:null,access_token_encrypted:access,
          refresh_token_encrypted:refresh,token_expires_at:expiresAt};
      })();
    return {ok:true,text:async()=>JSON.stringify(output)};
  }});
  const resp=await handler(signedRequest({operation:'refresh_finish',channel:'X',
    userId,leaseId,previousCipher:previous,accessCipher:access,
    refreshCipher:refresh,expiresAt}));
  assert.equal(resp.status,200);
  const body=await resp.json();
  assert.equal(body.refreshed,true);
  assert.ok(!JSON.stringify(body).includes('v1.'));
  const bad=await handler(signedRequest({operation:'refresh_finish',channel:'X',
    userId,leaseId:'invalid',previousCipher:previous,accessCipher:access,
    refreshCipher:refresh,expiresAt}));
  assert.equal(bad.status,503);
  assert.equal(calls,1);
});

test('Edge refuses token-refresh reconnect mutation without matching signed owner and lease', async () => {
  const userId='d0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
  const leaseId='8f718548-44e9-44ee-8fbd-6595eecfb944';
  const config={get(name){return name==='SUPABASE_SERVICE_ROLE_KEY'
    ? 'sb_secret_synthetic_only_for_tests':env.get(name);}};
  let changes=0;
  const handler=createHandler({env:config,fetchImpl:async(uri,options)=>{
    const path=String(uri);
    const data=path.includes('/auth/v1/user')
      ? {id:userId,email_confirmed_at:'2026-10-01'}
      : path.includes('/profiles') ? [{id:userId,iam_role:'owner'}]
      : (changes++,
        {user_id:userId,platform:'x',refresh_lease_id:null,
          refresh_reconnect_required:true,status:'token_expired'});
    return {ok:true,text:async()=>JSON.stringify(data)};
  }});
  const good=await handler(signedRequest({operation:'refresh_end',
    userId,channel:'X',leaseId,outcome:'reconnect'}));
  assert.equal(good.status,200);
  assert.equal((await good.json()).status,'reconnect_required');
  const bad=await handler(signedRequest({operation:'refresh_end',
    userId,channel:'X',leaseId,outcome:'publish'}));
  assert.equal(bad.status,503);
  assert.equal(changes,1);
});

test('signed owner X article credentials are ciphertext-only and receipts are owner-scoped',async()=>{
  const userId='d0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
  const accountId='123456789012345678';
  const contentKey='a'.repeat(64);
  const accessCipher='v1.'+'a'.repeat(16)+'.'+'b'.repeat(22)+'.'+'c'.repeat(24);
  const config={get:name=>name==='SUPABASE_SERVICE_ROLE_KEY'
    ?'sb_secret_synthetic_only_for_tests':env.get(name)};
  const calls=[];
  const handler=createHandler({env:config,fetchImpl:async(url,options)=>{
    const target=String(url);calls.push(target);
    let result;
    if(target.includes('/auth/v1/user')) result={id:userId,email_confirmed_at:'2026-10-01'};
    else if(target.includes('/profiles')) result=[{id:userId,iam_role:'owner'}];
    else if(target.includes('/social_media_accounts')) result=[{
      user_id:userId,status:'connected',external_account_id:accountId,
      handle:'CapitalAIOnline',
      scopes:['tweet.read','tweet.write','users.read','offline.access'],
      access_token_encrypted:accessCipher,
      token_expires_at:new Date(Date.now()+3600000).toISOString(),
      refresh_reconnect_required:false,refresh_lease_id:null,
    }];
    else if(target.includes('/capital_x_article_tests')){
      if(options?.method==='POST')result=[{user_id:userId,content_key:contentKey}];
      else result=[];
    } else throw Error('unexpected REST URL');
    return {ok:true,text:async()=>JSON.stringify(result)};
  }});
  const creds=await handler(signedRequest({operation:'x_credentials',channel:'X',userId}));
  assert.equal(creds.status,200);
  const secret=await creds.json();
  assert.equal(secret.accessCipher,accessCipher);
  assert.equal(secret.accountId,accountId);
  assert.equal(secret.refreshCipher,undefined);
  const claimed=await handler(signedRequest({operation:'article_claim',channel:'X',userId,
    contentKey,accountId}));
  assert.equal(claimed.status,200);
  assert.equal((await claimed.json()).claimed,true);
  const status=await handler(signedRequest({operation:'article_status',channel:'X',userId,
    contentKey,accountId}));
  assert.equal(status.status,200);
  assert.equal((await status.json()).status,'NOT_SUBMITTED');
  const count=calls.length;
  const invalid=await handler(signedRequest({operation:'x_credentials',channel:'X',
    userId},{omitSignature:true}));
  assert.equal(invalid.status,503);
  assert.equal(calls.length,count);
  const impersonation=await handler(signedRequest({operation:'article_claim',channel:'X',
    userId:'d0bf7f2f-c4d2-4cda-b0a8-0f7bb2723102',contentKey,accountId}));
  assert.equal(impersonation.status,503);
});

test('X milestone Edge receipts require owner proof and enforce atomic state transitions', async () => {
  const userId='d0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
  const input={channel:'X',userId,accountId:'123456789012345678',contentKey:'a'.repeat(64)};
  const config={get:name=>name==='SUPABASE_SERVICE_ROLE_KEY'
    ? 'sb_secret_synthetic_only_for_tests' : env.get(name)};
  let row=null, writes=0;
  const handler=createHandler({env:config,fetchImpl:async(uri,options={})=>{
    const path=String(uri);
    if(path.includes('/auth/v1/user'))return {ok:true,text:async()=>JSON.stringify({
      id:userId,email_confirmed_at:'2026-10-01'})};
    if(path.includes('/profiles'))return {ok:true,text:async()=>JSON.stringify([{
      id:userId,iam_role:'owner'}])};
    if(!path.includes('/capital_x_milestone_posts'))throw Error('unexpected URI');
    let result;
    const requestUrl=new URL(uri);
    const query=requestUrl.searchParams;
    if(options.method==='POST'){
      writes++;
      const candidate=JSON.parse(options.body);
      assert.equal(candidate.user_id,userId);
      assert.equal(candidate.content_key,input.contentKey);
      assert.equal(candidate.external_account_id,input.accountId);
      result=row?[]:[(row={...candidate,post_id:null,verified_at:null})];
    } else if(options.method==='GET'){
      result=row?[{status:row.status,post_id:row.post_id,verified_at:row.verified_at}]:[];
    } else if(options.method==='PATCH'){
      writes++;
      const patch=JSON.parse(options.body);
      assert.equal(query.get('status'),'eq.'+row.status);
      if(query.has('post_id'))assert.equal(query.get('post_id'),'eq.'+row.post_id);
      row={...row,...patch};
      result=[row];
    } else throw Error('unexpected method');
    return {ok:true,text:async()=>JSON.stringify(result)};
  }});
  const send=async(operation,extras={})=>handler(signedRequest({operation,...input,...extras}));
  const missing=await send('milestone_status');
  assert.deepEqual(await missing.json(),{found:false,status:'NOT_SUBMITTED',postId:null,verifiedAt:null});
  const denied=await handler(signedRequest({...input,operation:'milestone_claim'}, {omitSignature:true}));
  assert.equal(denied.status,503);
  assert.equal(writes,0);
  const first=await send('milestone_claim');
  assert.equal((await first.json()).claimed,true);
  const duplicate=await send('milestone_claim');
  assert.equal((await duplicate.json()).claimed,false);
  const premature=await send('milestone_record',{stage:'verify',postId:'222222222222222'});
  assert.equal(premature.status,503);
  const posted=await send('milestone_record',{stage:'post',postId:'222222222222222'});
  assert.deepEqual(await posted.json(),{recorded:true,status:'POSTED'});
  const verified=await send('milestone_record',{stage:'verify',postId:'222222222222222'});
  assert.deepEqual(await verified.json(),{recorded:true,status:'VERIFIED_PUBLISHED'});
  const last=await send('milestone_status');
  assert.equal((await last.json()).status,'VERIFIED_PUBLISHED');
  assert.equal(row.post_id,'222222222222222');
  assert.equal(writes,5); // includes the deliberately rejected premature PATCH attempt
});
