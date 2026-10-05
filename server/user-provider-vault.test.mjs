import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createUserProviderVault, krakenFuturesSignature, krakenSignature } from './user-provider-vault.mjs';

test('Kraken Spot signing matches the published API-Sign test vector', () => {
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

test('Kraken Futures signing is deterministic and secret-dependent', () => {
  const path = '/api/auth/v1/api-keys/v3/check';
  const first = krakenFuturesSignature(path, 'aGVsbG8tdGVzdC1zZWNyZXQ=');
  const second = krakenFuturesSignature(path, 'aGVsbG8tdGVzdC1zZWNyZXQ=');
  const other = krakenFuturesSignature(path, 'b3RoZXItdGVzdC1zZWNyZXQ=');
  assert.equal(first, second);
  assert.notEqual(first, other);
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

function env() {
  return {
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_SECRET_KEY: 'sb_secret_test_0123456789012345678901234567890123456789',
    AUTH_COOKIE_SIGNING_SECRET: 'test-cookie-signing-secret-0123456789abcdef',
  };
}

function auth() {
  return {
    verify: async () => ({ userId: '11111111-1111-1111-1111-111111111111' }),
    sameOrigin: () => true,
  };
}

async function invoke(vault, method, path, body) {
  let status = 0;
  let payload;
  const handled = await vault.handle(
    request(method, body),
    responseHarness(),
    new URL('https://capital.example' + path),
    (_res, nextStatus, nextPayload) => {
      status = nextStatus;
      payload = nextPayload;
    },
  );
  return { handled, status, payload };
}

test('Spot REST slot verifies key info before storing encrypted Vault payload', async () => {
  const calls = [];
  const apiKey = 'owner-readonly-api-key';
  const apiSecret = 'aGVsbG8tdGVzdC1zZWNyZXQtdGhhdC1pcy1sb25nLWVub3VnaA==';

  const fetchImpl = async (input, options = {}) => {
    const url = new URL(String(input));
    calls.push(url.href);

    if (url.origin === 'https://api.kraken.com') {
      assert.equal(url.pathname, '/0/private/GetApiKeyInfo');
      return Response.json({
        error: [],
        result: { apiKeyName: 'Capital REST', permissions: ['query-funds', 'query-ledger'] },
      });
    }
    if (url.origin === 'https://project.supabase.co') {
      if (url.pathname.endsWith('/capital_ai_upsert_user_provider_secret_v2')) {
        const body = JSON.parse(String(options.body));
        assert.equal(body._provider, 'kraken');
        assert.equal(body._credential_slot, 'spot_rest');
        assert.equal(body._key_name, 'Capital REST');
        assert.equal(body._permissions.withdrawals, false);
        const stored = JSON.parse(body._secret_payload);
        assert.equal(stored.apiKey, apiKey);
        assert.equal(stored.apiSecret, apiSecret);
        return Response.json({ status: 'PENDING' });
      }
      if (url.pathname.endsWith('/capital_ai_mark_user_provider_status_v2')) return new Response(null, { status: 204 });
      throw new Error('Unexpected Supabase RPC');
    }
    throw new Error('Unexpected upstream');
  };

  const vault = createUserProviderVault({ env: env(), fetchImpl, auth: auth() });
  const result = await invoke(vault, 'PUT', '/api/profile/provider-connections/kraken/spot-rest', {
    keyName: 'Capital REST',
    apiKey,
    apiSecret,
  });

  assert.equal(result.handled, true);
  assert.equal(result.status, 200);
  assert.equal(result.payload.credentialSlot, 'spot_rest');
  assert.equal(result.payload.keyName, 'Capital REST');
  assert.equal(result.payload.status, 'VERIFIED');
  assert.doesNotMatch(JSON.stringify(result.payload), new RegExp(apiKey));
  assert.doesNotMatch(JSON.stringify(result.payload), new RegExp(apiSecret));
  assert.equal(calls.filter(url => url.includes('api.kraken.com')).length, 1);
});

test('Spot WebSocket slot requires create-ws-token permission and writes nothing on failure', async () => {
  let vaultWrites = 0;
  const fetchImpl = async input => {
    const url = new URL(String(input));
    if (url.origin === 'https://api.kraken.com') {
      return Response.json({ error: [], result: { permissions: ['query-funds'] } });
    }
    vaultWrites += 1;
    throw new Error('Vault write must not run');
  };
  const vault = createUserProviderVault({ env: env(), fetchImpl, auth: auth() });
  const result = await invoke(vault, 'PUT', '/api/profile/provider-connections/kraken/spot-websocket', {
    keyName: 'WS Auth',
    apiKey: 'websocket-api-key',
    apiSecret: 'aGVsbG8tdGVzdC1zZWNyZXQtdGhhdC1pcy1sb25nLWVub3VnaA==',
  });
  assert.equal(result.status, 422);
  assert.equal(result.payload.code, 'KRAKEN_WS_PERMISSION_REQUIRED');
  assert.equal(vaultWrites, 0);
});

test('Spot credentials with withdrawal capability are rejected before Vault storage', async () => {
  let vaultWrites = 0;
  const fetchImpl = async input => {
    const url = new URL(String(input));
    if (url.origin === 'https://api.kraken.com') {
      return Response.json({ error: [], result: { permissions: ['query-funds', 'withdraw-funds'] } });
    }
    vaultWrites += 1;
    throw new Error('Vault write must not run');
  };
  const vault = createUserProviderVault({ env: env(), fetchImpl, auth: auth() });
  const result = await invoke(vault, 'PUT', '/api/profile/provider-connections/kraken/spot-rest', {
    keyName: 'Unsafe',
    apiKey: 'unsafe-api-key',
    apiSecret: 'aGVsbG8tdGVzdC1zZWNyZXQtdGhhdC1pcy1sb25nLWVub3VnaA==',
  });
  assert.equal(result.status, 422);
  assert.equal(result.payload.code, 'KRAKEN_WITHDRAWAL_PERMISSION_NOT_ALLOWED');
  assert.equal(vaultWrites, 0);
});

test('Futures slot verifies only key metadata and blocks transfer rights', async () => {
  const apiSecret = 'aGVsbG8tdGVzdC1zZWNyZXQtdGhhdC1pcy1sb25nLWVub3VnaA==';
  let upserted = false;
  const fetchImpl = async (input, options = {}) => {
    const url = new URL(String(input));
    if (url.origin === 'https://futures.kraken.com') {
      assert.equal(url.pathname, '/api/auth/v1/api-keys/v3/check');
      assert.equal(options.method, 'GET');
      assert.ok(options.headers.authent);
      return Response.json({ permissions: { general: 'FULL_ACCESS', transfer: 'NO_ACCESS' } });
    }
    if (url.origin === 'https://project.supabase.co') {
      if (url.pathname.endsWith('/capital_ai_upsert_user_provider_secret_v2')) {
        const body = JSON.parse(String(options.body));
        assert.equal(body._credential_slot, 'futures');
        assert.equal(body._permissions.generalAccess, 'FULL_ACCESS');
        assert.equal(body._permissions.transferAccess, 'NO_ACCESS');
        upserted = true;
        return Response.json({ status: 'PENDING' });
      }
      if (url.pathname.endsWith('/capital_ai_mark_user_provider_status_v2')) return new Response(null, { status: 204 });
    }
    throw new Error('Unexpected upstream');
  };
  const vault = createUserProviderVault({ env: env(), fetchImpl, auth: auth() });
  const result = await invoke(vault, 'PUT', '/api/profile/provider-connections/kraken/futures', {
    keyName: 'Futures Trading',
    apiKey: 'futures-api-key',
    apiSecret,
  });
  assert.equal(result.status, 200);
  assert.equal(result.payload.credentialSlot, 'futures');
  assert.equal(result.payload.permissions.trading, true);
  assert.equal(upserted, true);
});

test('BYOK routes fail closed before provider or Vault I/O without verified session', async () => {
  let networkCalls = 0;
  const vault = createUserProviderVault({
    env: env(),
    fetchImpl: async () => {
      networkCalls += 1;
      throw new Error('must not run');
    },
    auth: {
      verify: async () => null,
      sameOrigin: () => true,
    },
  });

  const result = await invoke(
    vault,
    'GET',
    '/api/profile/provider-connections/kraken/spot-rest/balance',
  );
  assert.equal(result.handled, true);
  assert.equal(result.status, 401);
  assert.equal(networkCalls, 0);
});
