import test from 'node:test';
import assert from 'node:assert/strict';
import { createDecipheriv } from 'node:crypto';
import { createSocialXOAuthExchange, socialXOAuthConfigured } from './x-oauth-exchange.mjs';

const USER = 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
const KEY = 'ab'.repeat(32);
const ENV = {
  SOCIAL_X_OAUTH_CONNECT_ENABLED: 'true',
  SOCIAL_OAUTH_CALLBACK_ENABLED: 'true',
  SOCIAL_X_OAUTH_CLIENT_ID: 'synthetic-client-id',
  SOCIAL_X_OAUTH_CLIENT_SECRET: 'synthetic-client-secret',
  SOCIAL_X_TOKEN_ENCRYPTION_KEY: KEY,
  PUBLIC_APP_ORIGIN: 'https://capital-ai.online/',
  SUPABASE_URL: 'https://fixture.supabase.co/',
  SUPABASE_SECRET_KEY: 'sb_secret_synthetic_test_only',
};
const trusted = {
  channel: 'X', userId: USER, code: 'synthetic_oauth_code',
  codeVerifier: 'v'.repeat(43),
  redirectUri: 'https://capital-ai.online/api/social-media/auth/callback',
};
const TOKENS = {
  token_type: 'bearer', access_token: 'synthetic_access_token',
  refresh_token: 'synthetic_refresh_token', expires_in: 7200,
  scope: 'users.read tweet.write offline.access tweet.read',
};
const XUSER = { data: { id: '12345678901', username: 'syntheticUser', name: 'Synthetic Test' } };
function response(status, payload) {
  return { ok: status >= 200 && status < 300, status,
    text: async () => JSON.stringify(payload) };
}
function mockFlow(tokens = TOKENS, profile = XUSER, modifyRow = x => x) {
  const calls = [];
  async function fetchImpl(target, options) {
    calls.push({ target: String(target), options });
    if (calls.length === 1) return response(200, tokens);
    if (calls.length === 2) return response(200, profile);
    if (calls.length === 3) return response(200, [modifyRow(JSON.parse(options.body))]);
    throw new Error('unexpected request');
  }
  return { fetchImpl, calls };
}
function unseal(value, kind) {
  const [version, ivb, tagb, encryptedb] = value.split('.');
  assert.equal(version, 'v1');
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(KEY, 'hex'),
    Buffer.from(ivb, 'base64url'));
  decipher.setAAD(Buffer.from(JSON.stringify(['capital-social-x-v1', USER, kind])));
  decipher.setAuthTag(Buffer.from(tagb, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedb, 'base64url')),
    decipher.final()]).toString('utf8');
}

test('X OAuth config fails closed for missing key, client, callback or store', () => {
  assert.equal(socialXOAuthConfigured({}), false);
  assert.equal(socialXOAuthConfigured(ENV), true);
  for (const key of ['SOCIAL_X_TOKEN_ENCRYPTION_KEY', 'SOCIAL_X_OAUTH_CLIENT_SECRET',
    'SUPABASE_SECRET_KEY', 'SOCIAL_OAUTH_CALLBACK_ENABLED', 'SOCIAL_X_OAUTH_CONNECT_ENABLED']) {
    const broken = { ...ENV };
    delete broken[key];
    assert.equal(socialXOAuthConfigured(broken), false, key);
  }
  assert.equal(socialXOAuthConfigured({ ...ENV, PUBLIC_APP_ORIGIN: 'http://capital-ai.online/' }), false);
});


test('Render-generated canonical base64 256-bit key encrypts identically to hex', async () => {
  const base64 = Buffer.from(KEY, 'hex').toString('base64');
  assert.equal(base64.length, 44);
  const renderEnv = { ...ENV, SOCIAL_X_TOKEN_ENCRYPTION_KEY: base64 };
  assert.equal(socialXOAuthConfigured(renderEnv), true);
  const { fetchImpl, calls } = mockFlow();
  await createSocialXOAuthExchange({ env: renderEnv, fetchImpl })(trusted);
  assert.equal(calls.length, 3);
  const saved = JSON.parse(calls[2].options.body);
  assert.equal(unseal(saved.access_token_encrypted, 'access'), TOKENS.access_token);
  assert.equal(unseal(saved.refresh_token_encrypted, 'refresh'), TOKENS.refresh_token);
});

test('X OAuth rejects malformed, noncanonical and underlength encryption keys', () => {
  const base64 = Buffer.from(KEY, 'hex').toString('base64');
  for (const value of [
    '', 'ab'.repeat(31), 'ab'.repeat(33), 'short-secret',
    Buffer.from('weak-secret').toString('base64'),
    base64.slice(0, -1), base64.slice(0, -2) + '==',
    base64.slice(0, -2) + '!a',
    base64.replace(/.$/, 'A'),
    // Noncanonical pad bits must not silently decode to the same 32 bytes.
    base64.slice(0, -2) + 'B=',
    Buffer.from(KEY, 'hex').toString('base64url'),
  ]) {
    if (value === base64) continue;
    assert.equal(socialXOAuthConfigured({
      ...ENV, SOCIAL_X_TOKEN_ENCRYPTION_KEY: value,
    }), false, 'invalid key format accepted: ' + String(value).slice(0, 8));
  }
});

test('X OAuth code, owner readback, AES-GCM tokens and owner-bound database upsert', async () => {
  const { fetchImpl, calls } = mockFlow();
  const result = await createSocialXOAuthExchange({ env: ENV, fetchImpl })(trusted);
  assert.deepEqual(result, { connected: true, channel: 'X', handle: 'syntheticUser' });
  assert.equal(calls.length, 3);
  assert.equal(calls[0].target, 'https://api.x.com/2/oauth2/token');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.redirect, 'error');
  assert.equal(calls[0].options.headers.Authorization, 'Basic ' + Buffer.from(
    'synthetic-client-id:synthetic-client-secret').toString('base64'));
  const sent = new URLSearchParams(calls[0].options.body);
  assert.equal(sent.get('code'), trusted.code);
  assert.equal(sent.get('code_verifier'), trusted.codeVerifier);
  assert.equal(sent.get('redirect_uri'), trusted.redirectUri);
  assert.equal(calls[1].target, 'https://api.x.com/2/users/me');
  assert.equal(calls[1].options.headers.Authorization, 'Bearer synthetic_access_token');
  assert.equal(calls[2].target, 'https://fixture.supabase.co/rest/v1/social_media_accounts?on_conflict=user_id%2Cplatform');
  const saved = JSON.parse(calls[2].options.body);
  assert.equal(saved.user_id, USER);
  assert.equal(saved.platform, 'x');
  assert.equal(saved.external_account_id, '12345678901');
  assert.equal(saved.status, 'connected');
  assert.equal(saved.handle, 'syntheticUser');
  assert.notEqual(saved.access_token_encrypted, TOKENS.access_token);
  assert.notEqual(saved.refresh_token_encrypted, TOKENS.refresh_token);
  assert.equal(unseal(saved.access_token_encrypted, 'access'), TOKENS.access_token);
  assert.equal(unseal(saved.refresh_token_encrypted, 'refresh'), TOKENS.refresh_token);
  assert.ok(!JSON.stringify(result).includes('synthetic_access_token'));
});

test('X OAuth rejects wrong user, callback, method or missing configuration before network', async () => {
  let calls = 0;
  const exchange = createSocialXOAuthExchange({ env: ENV, fetchImpl: async () => { calls++; } });
  for (const change of [
    { channel: 'FACEBOOK' }, { userId: 'another-user' },
    { redirectUri: 'https://evil.example/callback' }, { codeVerifier: 'weak' },
    { code: '' },
  ]) await assert.rejects(exchange({ ...trusted, ...change }));
  const disabled = createSocialXOAuthExchange({ env: { ...ENV,
    SOCIAL_X_OAUTH_CONNECT_ENABLED: 'false' }, fetchImpl: async () => { calls++; } });
  await assert.rejects(disabled(trusted));
  assert.equal(calls, 0);
});

test('X OAuth rejects missing scopes and tokens without paid profile request or database mutation', async () => {
  for (const tokens of [
    { ...TOKENS, scope: 'tweet.read users.read' },
    { ...TOKENS, refresh_token: undefined },
    { ...TOKENS, token_type: 'not-bearer' },
    { ...TOKENS, expires_in: 0 },
  ]) {
    const { fetchImpl, calls } = mockFlow(tokens);
    await assert.rejects(createSocialXOAuthExchange({ env: ENV, fetchImpl })(trusted));
    assert.equal(calls.length, 1);
  }
});

test('X OAuth rejects malformed profile and storage readback without confirming connection', async () => {
  const invalid = mockFlow(TOKENS, { data: { id: 'not-numeric', username: 'anything' } });
  await assert.rejects(createSocialXOAuthExchange({ env: ENV,
    fetchImpl: invalid.fetchImpl })(trusted));
  assert.equal(invalid.calls.length, 2);
  const mismatch = mockFlow(TOKENS, XUSER, row => ({ ...row, user_id: 'someone-else' }));
  await assert.rejects(createSocialXOAuthExchange({ env: ENV,
    fetchImpl: mismatch.fetchImpl })(trusted), /SOCIAL_X_ACCOUNT_PERSIST_READBACK_FAILED/);
  assert.equal(mismatch.calls.length, 3);
});

test('X OAuth rejects provider token exchange error without disclosing provider payloads', async () => {
  let calls = 0;
  const handler = createSocialXOAuthExchange({ env: ENV, fetchImpl: async () => {
    calls++; return response(401, { detail: 'sensitive_provider_error' });
  } });
  await assert.rejects(handler(trusted), error => {
    assert.equal(error.message, 'SOCIAL_X_TOKEN_EXCHANGE_REJECTED');
    assert.ok(!error.message.includes('sensitive_provider_error'));
    return true;
  });
  assert.equal(calls, 1);
});

test('X OAuth Edge mode performs encrypted persistence without any Render admin key', async () => {
  const edgeEnv = {
    ...ENV,
    SOCIAL_X_EDGE_STORE_ENABLED: 'true',
    SUPABASE_SECRET_KEY: undefined,
    SUPABASE_PUBLISHABLE_KEY: 'synthetic-publishable-key-for-testing',
  };
  assert.equal(socialXOAuthConfigured(edgeEnv), true);
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url: String(url), options });
    const body = requests.length === 1 ? TOKENS : requests.length === 2
      ? XUSER : { connected: true, accountId: XUSER.data.id, handle: XUSER.data.username };
    return response(200, body);
  };
  const outcome = await createSocialXOAuthExchange({ env: edgeEnv, fetchImpl })({
    ...trusted, userAccessToken: 'synthetic-owner-access-' + 'a'.repeat(75),
  });
  assert.equal(outcome.connected, true);
  assert.equal(requests.length, 3);
  assert.ok(requests[2].url.endsWith('/functions/v1/capital-social-x-vault'));
  const stored = JSON.parse(requests[2].options.body);
  assert.equal(stored.operation, 'persist');
  assert.equal(unseal(stored.account.access_token_encrypted, 'access'), TOKENS.access_token);
  assert.equal(stored.userId, USER);
  assert.equal(requests[2].options.headers.Authorization,
    'Bearer ' + 'synthetic-owner-access-' + 'a'.repeat(75));
  assert.ok(!JSON.stringify(requests[2].options.headers).includes('sb_secret_'));
});
