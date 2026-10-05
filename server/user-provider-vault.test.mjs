import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createUserProviderVault, krakenSignature } from './user-provider-vault.mjs';

test('Kraken signing matches the published API-Sign test vector', () => {
  const signature = krakenSignature(
    '/0/private/AddOrder',
    {
      nonce: '1616492376594',
      ordertype: 'limit',
      pair: 'XBTUSD',
      price: '37500',
      type: 'buy',
      volume: '1.25',
    },
    'kQH5HW/8p1uGOVjbgWA7FunAmGO8lsSUXNsu3eow76sz84Q18fWxnyRzBHCd3pd5nE9qa99HAZtuZuj6F1huXg==',
  );

  assert.equal(
    signature,
    '4/dpxb3iT4tp/ZCVEwSnEsLxx0bqyhLpdfOpc6fn7OR8+UClSV5n9E6aSS8MPtnRfp32bAb0nmbRn6H8ndwLUQ==',
  );
});

function request(method, body = null) {
  const stream = Readable.from(body == null ? [] : [Buffer.from(JSON.stringify(body), 'utf8')]);
  stream.method = method;
  stream.headers = { origin: 'https://capital.example', 'content-type': 'application/json' };
  return stream;
}

function responseHarness() {
  const headers = new Map();
  return {
    setHeader(name, value) { headers.set(String(name).toLowerCase(), value); },
    getHeader(name) { return headers.get(String(name).toLowerCase()); },
  };
}

test('BYOK write stores only through Vault RPC and verifies only Kraken private Balance', async () => {
  const calls = [];
  const apiKey = 'owner-readonly-api-key';
  const apiSecret = 'aGVsbG8tdGVzdC1zZWNyZXQtdGhhdC1pcy1sb25nLWVub3VnaA==';
  const env = {
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_SECRET_KEY: 'sb_secret_test_0123456789012345678901234567890123456789',
    AUTH_COOKIE_SIGNING_SECRET: 'test-cookie-signing-secret-0123456789abcdef',
  };
  const auth = {
    verify: async () => ({ userId: '11111111-1111-1111-1111-111111111111' }),
    sameOrigin: () => true,
  };

  const fetchImpl = async (input, options = {}) => {
    const url = new URL(String(input));
    calls.push({ url: url.href, headers: options.headers, body: String(options.body || '') });

    if (url.origin === 'https://project.supabase.co') {
      assert.equal(options.headers.apikey, env.SUPABASE_SECRET_KEY);
      assert.equal(options.headers.Authorization, `Bearer ${env.SUPABASE_SECRET_KEY}`);
      if (url.pathname.endsWith('/capital_ai_upsert_user_provider_secret')) {
        const body = JSON.parse(String(options.body));
        assert.equal(body._provider, 'kraken');
        const stored = JSON.parse(body._secret_payload);
        assert.equal(stored.apiKey, apiKey);
        assert.equal(stored.apiSecret, apiSecret);
        return Response.json({
          provider: 'kraken',
          status: 'PENDING',
          dataScope: 'USER_PRIVATE_ACCOUNT_DATA',
        });
      }
      if (url.pathname.endsWith('/capital_ai_mark_user_provider_status')) {
        return new Response(null, { status: 204 });
      }
      throw new Error('Unexpected Supabase RPC');
    }

    if (url.origin === 'https://api.kraken.com') {
      assert.equal(url.pathname, '/0/private/Balance');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers['API-Key'], apiKey);
      assert.ok(options.headers['API-Sign']);
      assert.doesNotMatch(url.href, /AddOrder|Withdraw|Deposit/);
      return Response.json({ error: [], result: { XXBT: '0.125', ZEUR: '42.00' } });
    }

    throw new Error('Unexpected upstream');
  };

  const vault = createUserProviderVault({ env, fetchImpl, auth });
  const res = responseHarness();
  let status = 0;
  let payload;
  const handled = await vault.handle(
    request('PUT', { apiKey, apiSecret }),
    res,
    new URL('https://capital.example/api/profile/provider-connections/kraken'),
    (_res, nextStatus, nextPayload) => {
      status = nextStatus;
      payload = nextPayload;
    },
  );

  assert.equal(handled, true);
  assert.equal(status, 200);
  assert.equal(payload.provider, 'kraken');
  assert.equal(payload.status, 'VERIFIED');
  assert.equal(payload.dataScope, 'USER_PRIVATE_ACCOUNT_DATA');
  assert.equal(payload.redistributionAllowed, false);
  assert.equal(payload.publicDisplayAllowed, false);
  assert.deepEqual(payload.holdings, [
    { asset: 'XXBT', balance: '0.125' },
    { asset: 'ZEUR', balance: '42.00' },
  ]);
  assert.doesNotMatch(JSON.stringify(payload), new RegExp(apiKey));
  assert.doesNotMatch(JSON.stringify(payload), new RegExp(apiSecret));
  assert.equal(calls.filter(call => new URL(call.url).origin === 'https://api.kraken.com').length, 1);
});

test('BYOK routes fail closed before any provider or Vault I/O without verified session', async () => {
  let networkCalls = 0;
  const vault = createUserProviderVault({
    env: {
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SECRET_KEY: 'sb_secret_test_0123456789012345678901234567890123456789',
    AUTH_COOKIE_SIGNING_SECRET: 'test-cookie-signing-secret-0123456789abcdef',
    },
    fetchImpl: async () => {
      networkCalls += 1;
      throw new Error('must not run');
    },
    auth: {
      verify: async () => null,
      sameOrigin: () => true,
    },
  });

  let status = 0;
  const handled = await vault.handle(
    request('GET'),
    responseHarness(),
    new URL('https://capital.example/api/profile/provider-connections/kraken/balance'),
    (_res, nextStatus) => { status = nextStatus; },
  );

  assert.equal(handled, true);
  assert.equal(status, 401);
  assert.equal(networkCalls, 0);
});

test('BYOK rejects publishable-key misconfiguration and falls back to a valid legacy service role key', async () => {
  const serviceRolePayload = Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url');
  const legacy = `eyJ.${serviceRolePayload}.signature-padding-01234567890123456789`;
  let calls = 0;
  const vault = createUserProviderVault({
    env: {
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SECRET_KEY: 'sb_publishable_wrong_role_012345678901234567890123',
      SUPABASE_SERVICE_ROLE_KEY: legacy,
      AUTH_COOKIE_SIGNING_SECRET: 'test-cookie-signing-secret-0123456789abcdef',
    },
    fetchImpl: async (_input, options = {}) => {
      calls += 1;
      assert.equal(options.headers.apikey, legacy);
      assert.equal(options.headers.Authorization, `Bearer ${legacy}`);
      return Response.json([]);
    },
    auth: {
      verify: async () => ({ userId: '11111111-1111-1111-1111-111111111111' }),
      sameOrigin: () => true,
    },
  });

  let status = 0;
  await vault.handle(
    request('GET'),
    responseHarness(),
    new URL('https://capital.example/api/profile/provider-connections'),
    (_res, nextStatus) => { status = nextStatus; },
  );

  assert.equal(status, 200);
  assert.equal(calls, 1);
});
