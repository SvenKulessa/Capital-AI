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
