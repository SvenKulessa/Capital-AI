import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { Readable } from 'node:stream';
import { binanceSignature, createUserProviderVault, krakenSignature, krakenFuturesSignature } from './user-provider-vault.mjs';

const env = {
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_SECRET_KEY: 'sb_secret_test_0123456789012345678901234567890123456789',
  AUTH_COOKIE_SIGNING_SECRET: 'test-cookie-signing-secret-0123456789abcdef',
};
const auth = {
  verify: async () => ({ userId: '11111111-1111-1111-1111-111111111111' }),
  sameOrigin: () => true,
};
const secret = 'aGVsbG8tdGVzdC1zZWNyZXQtdGhhdC1pcy1sb25nLWVub3VnaA==';

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
async function invoke(vault, method, body, path='/api/profile/provider-connections/kraken') {
  let status = 0;
  let payload;
  await vault.handle(
    request(method, body),
    responseHarness(),
    new URL('https://capital.example' + path),
    (_res, nextStatus, nextPayload) => { status = nextStatus; payload = nextPayload; },
  );
  return { status, payload };
}

test('Kraken Spot signing matches the published API-Sign test vector', () => {
  const signature = krakenSignature(
    '/0/private/AddOrder',
    { nonce: '1616492376594', ordertype: 'limit', pair: 'XBTUSD', price: '37500', type: 'buy', volume: '1.25' },
    'kQH5HW/8p1uGOVjbgWA7FunAmGO8lsSUXNsu3eow76sz84Q18fWxnyRzBHCd3pd5nE9qa99HAZtuZuj6F1huXg==',
  );
  assert.equal(signature, '4/dpxb3iT4tp/ZCVEwSnEsLxx0bqyhLpdfOpc6fn7OR8+UClSV5n9E6aSS8MPtnRfp32bAb0nmbRn6H8ndwLUQ==');
});

test('Kraken Futures signing binds payload, nonce and endpoint path', () => {
  const endpoint='/api/auth/v1/api-keys/v3/check';
  const nonce='1700000000000';
  const digest=createHash('sha256').update(nonce + endpoint).digest();
  const expected=createHmac('sha512',Buffer.from(secret,'base64')).update(digest).digest('base64');
  assert.equal(krakenFuturesSignature(endpoint,'',nonce,secret),expected);
});

test('Spot read-only key remains supported and stores a versioned Vault payload', async () => {
  let storedPayload;
  const fetchImpl=async (input, options={})=>{
    const url=new URL(String(input));
    if(url.origin==='https://project.supabase.co'){
      if(url.pathname.endsWith('/capital_ai_get_user_provider_secret')) return Response.json(null);
      if(url.pathname.endsWith('/capital_ai_upsert_user_provider_secret')){
        const body=JSON.parse(String(options.body)); storedPayload=JSON.parse(body._secret_payload);
        assert.equal(body._permissions.fundsQuery,true);
        assert.equal(body._permissions.trading,false);
        assert.equal(body._permissions.executionEnabled,false);
        return Response.json({provider:'kraken',status:'PENDING'});
      }
      if(url.pathname.endsWith('/capital_ai_mark_user_provider_status')) return new Response(null,{status:204});
    }
    if(url.origin==='https://api.kraken.com' && url.pathname==='/0/private/GetApiKeyInfo'){
      return Response.json({error:[],result:{permissions:['query-funds','create-ws-token']}});
    }
    if(url.origin==='https://api.kraken.com' && url.pathname==='/0/private/Balance'){
      return Response.json({error:[],result:{XXBT:'0.125',ZEUR:'42.00'}});
    }
    throw new Error('Unexpected upstream '+url.href);
  };
  const vault=createUserProviderVault({env,fetchImpl,auth});
  const {status,payload}=await invoke(vault,'PUT',{apiKey:'readonly-api-key',apiSecret:secret,credentialFamily:'spot'});
  assert.equal(status,200);
  assert.equal(payload.capabilities.fundsQuery,true);
  assert.equal(payload.executionEnabled,false);
  assert.equal(storedPayload.version,2);
  assert.equal(storedPayload.spot.apiKey,'readonly-api-key');
  assert.equal(storedPayload.futures,null);
  assert.doesNotMatch(JSON.stringify(payload),/readonly-api-key|aGVsbG8/);
});

test('Spot order permissions are accepted only with explicit trading opt-in', async () => {
  let storedPermissions;
  const fetchImpl=async (input,options={})=>{
    const url=new URL(String(input));
    if(url.origin==='https://project.supabase.co'){
      if(url.pathname.endsWith('/capital_ai_get_user_provider_secret')) return Response.json(null);
      if(url.pathname.endsWith('/capital_ai_upsert_user_provider_secret')){
        storedPermissions=JSON.parse(String(options.body))._permissions;
        return Response.json({provider:'kraken',status:'PENDING'});
      }
      if(url.pathname.endsWith('/capital_ai_mark_user_provider_status')) return new Response(null,{status:204});
    }
    if(url.pathname==='/0/private/GetApiKeyInfo'){
      return Response.json({error:[],result:{permissions:['modify-trades','close-trades']}});
    }
    throw new Error('Unexpected upstream '+url.href);
  };
  const vault=createUserProviderVault({env,fetchImpl,auth});
  const rejected=await invoke(vault,'PUT',{apiKey:'trading-spot-key',apiSecret:secret,credentialFamily:'spot'});
  assert.equal(rejected.status,422);
  assert.equal(rejected.payload.error,'kraken_spot_trading_requires_opt_in');

  const accepted=await invoke(vault,'PUT',{apiKey:'trading-spot-key',apiSecret:secret,credentialFamily:'spot',allowTrading:true});
  assert.equal(accepted.status,200);
  assert.equal(storedPermissions.spotOrderCreate,true);
  assert.equal(storedPermissions.spotOrderCancel,true);
  assert.deepEqual(storedPermissions.orderTypes,['market','limit']);
  assert.equal(storedPermissions.executionEnabled,false);
});

test('Funding and withdrawal permissions remain forbidden even when trading is opted in', async () => {
  let vaultWrites=0;
  const vault=createUserProviderVault({
    env,auth,
    fetchImpl:async (input)=>{
      const url=new URL(String(input));
      if(url.origin==='https://project.supabase.co' && url.pathname.endsWith('/capital_ai_get_user_provider_secret')) return Response.json(null);
      if(url.origin==='https://api.kraken.com') return Response.json({error:[],result:{permissions:['modify-trades','withdraw-funds']}});
      vaultWrites+=1; throw new Error('Vault must not be written');
    },
  });
  const result=await invoke(vault,'PUT',{apiKey:'unsafe-spot-key',apiSecret:secret,credentialFamily:'spot',allowTrading:true});
  assert.equal(result.status,422);
  assert.equal(result.payload.error,'kraken_funding_or_withdrawal_permissions_forbidden');
  assert.deepEqual(result.payload.forbiddenPermissions,['withdraw-funds']);
  assert.equal(vaultWrites,0);
});

test('Futures/Perps FULL_ACCESS can be stored with explicit opt-in while transfer rights remain forbidden', async () => {
  let stored;
  const existing={version:2,spot:{apiKey:'existing-spot-key',apiSecret:secret},futures:null};
  const fetchImpl=async (input,options={})=>{
    const url=new URL(String(input));
    if(url.origin==='https://project.supabase.co'){
      if(url.pathname.endsWith('/capital_ai_get_user_provider_secret')){
        return Response.json({secretPayload:JSON.stringify(existing),permissions:{spot:{configured:true,fundsQuery:false,websocketToken:false,trading:false,orderCreate:false,orderCancel:false}}});
      }
      if(url.pathname.endsWith('/capital_ai_upsert_user_provider_secret')){
        const body=JSON.parse(String(options.body)); stored={secret:JSON.parse(body._secret_payload),permissions:body._permissions};
        return Response.json({provider:'kraken',status:'PENDING'});
      }
      if(url.pathname.endsWith('/capital_ai_mark_user_provider_status')) return new Response(null,{status:204});
    }
    if(url.origin==='https://futures.kraken.com'){
      assert.equal(options.method,'GET');
      assert.ok(options.headers.APIKey);
      assert.ok(options.headers.Authent);
      return Response.json({apiKey:{permissions:{general:'FULL_ACCESS',transfer:'NO_ACCESS'}}});
    }
    throw new Error('Unexpected upstream '+url.href);
  };
  const vault=createUserProviderVault({env,fetchImpl,auth});
  const result=await invoke(vault,'PUT',{apiKey:'futures-perps-key',apiSecret:secret,credentialFamily:'futures',allowTrading:true});
  assert.equal(result.status,200);
  assert.equal(stored.secret.spot.apiKey,'existing-spot-key');
  assert.equal(stored.secret.futures.apiKey,'futures-perps-key');
  assert.equal(stored.permissions.futuresTrading,true);
  assert.equal(stored.permissions.perpetuals,true);
  assert.equal(stored.permissions.withdrawals,false);
  assert.equal(result.payload.executionEnabled,false);
});

test('Futures transfer permission is rejected before Vault write', async () => {
  let writes=0;
  const vault=createUserProviderVault({
    env,auth,
    fetchImpl:async (input)=>{
      const url=new URL(String(input));
      if(url.origin==='https://project.supabase.co' && url.pathname.endsWith('/capital_ai_get_user_provider_secret')) return Response.json(null);
      if(url.origin==='https://futures.kraken.com') return Response.json({permissions:{general:'FULL_ACCESS',transfer:'FULL_ACCESS'}});
      writes+=1; throw new Error('Vault must not be written');
    },
  });
  const result=await invoke(vault,'PUT',{apiKey:'futures-transfer-key',apiSecret:secret,credentialFamily:'futures',allowTrading:true});
  assert.equal(result.status,422);
  assert.equal(result.payload.error,'kraken_futures_transfer_permission_forbidden');
  assert.equal(writes,0);
});

test('BYOK routes fail closed before provider or Vault I/O without verified session', async () => {
  let networkCalls=0;
  const vault=createUserProviderVault({
    env,
    fetchImpl:async()=>{networkCalls+=1; throw new Error('must not run');},
    auth:{verify:async()=>null,sameOrigin:()=>true},
  });
  const result=await invoke(vault,'GET',null,'/api/profile/provider-connections/kraken/balance');
  assert.equal(result.status,401);
  assert.equal(networkCalls,0);
});

test('BYOK rejects a publishable key in the server secret slot before network I/O', async () => {
  let networkCalls=0;
  const vault=createUserProviderVault({
    env:{...env,SUPABASE_SECRET_KEY:'sb_publishable_wrong_0123456789012345678901234567890'},
    fetchImpl:async()=>{networkCalls+=1; throw new Error('must not run');},
    auth,
  });
  const result=await invoke(vault,'GET',null,'/api/profile/provider-connections');
  assert.equal(result.status,503);
  assert.equal(result.payload.error,'provider_vault_not_configured');
  assert.equal(networkCalls,0);
});


test('Binance signing binds the exact query bytes', () => {
  const query = 'symbol=BTCUSDT&timestamp=1700000000000';
  assert.equal(
    binanceSignature(query, 'binance-test-secret-0123456789'),
    createHmac('sha256', 'binance-test-secret-0123456789').update(query).digest('hex'),
  );
});

test('Binance read-only key is admitted to Vault without exposing credential material', async () => {
  let storedPayload;
  const fetchImpl = async (input, options = {}) => {
    const url = new URL(String(input));
    if (url.origin === 'https://api.binance.com' && url.pathname === '/sapi/v1/account/apiRestrictions') {
      assert.ok(options.headers['X-MBX-APIKEY']);
      assert.match(url.searchParams.get('signature') || '', /^[0-9a-f]{64}$/);
      return Response.json({
        enableReading: true,
        enableWithdrawals: false,
        enableInternalTransfer: false,
        permitsUniversalTransfer: false,
        enableSpotAndMarginTrading: false,
        enableFutures: false,
      });
    }
    if (url.origin === 'https://project.supabase.co') {
      if (url.pathname.endsWith('/capital_ai_get_user_provider_secret')) return Response.json(null);
      if (url.pathname.endsWith('/capital_ai_upsert_user_provider_secret')) {
        const body = JSON.parse(String(options.body));
        assert.equal(body._provider, 'binance');
        storedPayload = JSON.parse(body._secret_payload);
        return Response.json({ provider: 'binance', status: 'PENDING' });
      }
      if (url.pathname.endsWith('/capital_ai_mark_user_provider_status')) return new Response(null, { status: 204 });
    }
    throw new Error('Unexpected upstream ' + url.href);
  };
  const vault = createUserProviderVault({ env, fetchImpl, auth });
  const result = await invoke(
    vault,
    'PUT',
    { apiKey: 'binance-read-key', apiSecret: 'binance-read-secret-0123456789', credentialFamily: 'spot' },
    '/api/profile/provider-connections/binance',
  );
  assert.equal(result.status, 200);
  assert.equal(result.payload.provider, 'binance');
  assert.equal(result.payload.executionEnabled, false);
  assert.equal(storedPayload.spot.apiKey, 'binance-read-key');
  assert.equal(storedPayload.futures, null);
  assert.doesNotMatch(JSON.stringify(result.payload), /binance-read-key|binance-read-secret/);
});

test('Binance transfer/withdrawal-capable key is rejected before Vault write', async () => {
  let writes = 0;
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    if (url.origin === 'https://api.binance.com' && url.pathname === '/sapi/v1/account/apiRestrictions') {
      return Response.json({
        enableReading: true,
        enableWithdrawals: true,
        enableInternalTransfer: false,
        permitsUniversalTransfer: false,
        enableSpotAndMarginTrading: false,
        enableFutures: false,
      });
    }
    if (url.origin === 'https://project.supabase.co' && url.pathname.endsWith('/capital_ai_upsert_user_provider_secret')) writes += 1;
    if (url.origin === 'https://project.supabase.co' && url.pathname.endsWith('/capital_ai_get_user_provider_secret')) return Response.json(null);
    throw new Error('Unexpected upstream ' + url.href);
  };
  const vault = createUserProviderVault({ env, fetchImpl, auth });
  const result = await invoke(
    vault,
    'PUT',
    { apiKey: 'binance-unsafe-key', apiSecret: 'binance-unsafe-secret-0123456789', credentialFamily: 'spot' },
    '/api/profile/provider-connections/binance',
  );
  assert.equal(result.status, 422);
  assert.equal(result.payload.error, 'binance_transfer_or_withdrawal_permission_forbidden');
  assert.equal(writes, 0);
});

test('Private provider executor resolves Binance credential only inside Vault authority', async () => {
  const secretPayload = JSON.stringify({
    version: 2,
    spot: { apiKey: 'binance-read-key', apiSecret: 'binance-read-secret-0123456789' },
    futures: null,
  });
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    if (url.origin === 'https://project.supabase.co' && url.pathname.endsWith('/capital_ai_get_user_provider_secret')) {
      return Response.json({ secretPayload, permissions: { executionEnabled: false } });
    }
    if (url.origin === 'https://api.binance.com' && url.pathname === '/sapi/v1/account/apiRestrictions') {
      return Response.json({
        enableReading: true,
        enableWithdrawals: false,
        enableInternalTransfer: false,
        permitsUniversalTransfer: false,
        enableSpotAndMarginTrading: false,
        enableFutures: false,
      });
    }
    if (url.origin === 'https://api.binance.com' && url.pathname === '/api/v3/openOrders') {
      assert.equal(url.searchParams.get('symbol'), 'BTCUSDT');
      return Response.json([{ symbol: 'BTCUSDT', orderId: 42, status: 'NEW' }]);
    }
    throw new Error('Unexpected upstream ' + url.href);
  };
  const vault = createUserProviderVault({ env, fetchImpl, auth });
  const result = await vault.executePrivateQuery(
    '11111111-1111-1111-1111-111111111111',
    'binance',
    'spot.open_orders',
    { symbol: 'BTCUSDT' },
  );
  assert.equal(result[0].orderId, 42);
  assert.doesNotMatch(JSON.stringify(result), /binance-read-key|binance-read-secret/);
});


test('Kraken read-only executor signs and forwards admitted query parameters', async () => {
  const secretPayload = JSON.stringify({
    version: 2,
    spot: { apiKey: 'kraken-query-key', apiSecret: secret },
    futures: null,
  });
  let openOrdersBody = '';
  const fetchImpl = async (input, options = {}) => {
    const url = new URL(String(input));
    if (url.origin === 'https://project.supabase.co' && url.pathname.endsWith('/capital_ai_get_user_provider_secret')) {
      return Response.json({ secretPayload, permissions: { executionEnabled: false } });
    }
    if (url.origin === 'https://api.kraken.com' && url.pathname === '/0/private/GetApiKeyInfo') {
      return Response.json({ error: [], result: { permissions: ['query-open-trades'] } });
    }
    if (url.origin === 'https://api.kraken.com' && url.pathname === '/0/private/OpenOrders') {
      openOrdersBody = String(options.body || '');
      assert.ok(options.headers['API-Sign']);
      return Response.json({ error: [], result: { open: {} } });
    }
    throw new Error('Unexpected upstream ' + url.href);
  };
  const vault = createUserProviderVault({ env, fetchImpl, auth });
  const result = await vault.executePrivateQuery(
    '11111111-1111-1111-1111-111111111111',
    'kraken',
    'orders.open',
    { trades: true, userref: 42 },
  );
  const form = new URLSearchParams(openOrdersBody);
  assert.equal(form.get('trades'), 'true');
  assert.equal(form.get('userref'), '42');
  assert.match(form.get('nonce') || '', /^\d+$/);
  assert.deepEqual(result, { open: {} });
});

test('Kraken key-info query strips API key material before provider result leaves Vault authority', async () => {
  const secretPayload = JSON.stringify({
    version: 2,
    spot: { apiKey: 'kraken-query-key', apiSecret: secret },
    futures: null,
  });
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    if (url.origin === 'https://project.supabase.co' && url.pathname.endsWith('/capital_ai_get_user_provider_secret')) {
      return Response.json({ secretPayload, permissions: { executionEnabled: false } });
    }
    if (url.origin === 'https://api.kraken.com' && url.pathname === '/0/private/GetApiKeyInfo') {
      return Response.json({
        error: [],
        result: {
          apiKeyName: 'read-only',
          apiKey: 'must-not-leave-vault',
          nonce: '123',
          permissions: ['query-funds'],
          validUntil: '0',
          queryFrom: '0',
          queryTo: '0',
          createdTime: '1700000000',
        },
      });
    }
    throw new Error('Unexpected upstream ' + url.href);
  };
  const vault = createUserProviderVault({ env, fetchImpl, auth });
  const result = await vault.executePrivateQuery(
    '11111111-1111-1111-1111-111111111111',
    'kraken',
    'account.key_info',
    {},
  );
  assert.equal(result.info.apiKeyName, 'read-only');
  assert.equal(Object.hasOwn(result.info, 'apiKey'), false);
  assert.equal(Object.hasOwn(result.info, 'nonce'), false);
  assert.doesNotMatch(JSON.stringify(result), /must-not-leave-vault|kraken-query-key/);
});

test('Binance safety gate rejects each transfer-capable permission independently', async (t) => {
  for (const flag of ['enableWithdrawals', 'enableInternalTransfer', 'permitsUniversalTransfer']) {
    await t.test(flag, async () => {
      let writes = 0;
      const fetchImpl = async (input) => {
        const url = new URL(String(input));
        if (url.origin === 'https://api.binance.com' && url.pathname === '/sapi/v1/account/apiRestrictions') {
          return Response.json({
            enableReading: true,
            enableWithdrawals: false,
            enableInternalTransfer: false,
            permitsUniversalTransfer: false,
            enableSpotAndMarginTrading: false,
            enableFutures: false,
            [flag]: true,
          });
        }
        if (url.origin === 'https://project.supabase.co' && url.pathname.endsWith('/capital_ai_get_user_provider_secret')) {
          return Response.json(null);
        }
        if (url.origin === 'https://project.supabase.co' && url.pathname.endsWith('/capital_ai_upsert_user_provider_secret')) {
          writes += 1;
          return Response.json({});
        }
        throw new Error('Unexpected upstream ' + url.href);
      };
      const vault = createUserProviderVault({ env, fetchImpl, auth });
      const result = await invoke(
        vault,
        'PUT',
        { apiKey: 'binance-unsafe-key', apiSecret: 'binance-unsafe-secret-0123456789', credentialFamily: 'spot' },
        '/api/profile/provider-connections/binance',
      );
      assert.equal(result.status, 422);
      assert.equal(result.payload.error, 'binance_transfer_or_withdrawal_permission_forbidden');
      assert.equal(writes, 0);
    });
  }
});

test('private Spot trade from each user\'s Vault connection never exposes a key or enters public quote cache',async()=>{
  const userId='11111111-1111-1111-1111-111111111111';
  const timestamp=Date.now();
  for(const [provider,symbol] of [['kraken','BTCUSD'],['binance','BTCUSDT']]){
    const events=[];
    const key='only-this-user-'+provider+'-secret-key';
    const pair={apiKey:'this-user-'+provider+'-key',apiSecret:key};
    const fetchImpl=async(input,opts={})=>{
      const url=new URL(String(input));
      if(url.origin==='https://project.supabase.co'){
        assert.ok(url.pathname.endsWith('/capital_ai_get_user_provider_secret'));
        const body=JSON.parse(String(opts.body));
        assert.equal(body._user_id,userId);
        assert.equal(body._provider,provider);
        events.push('vault');
        return Response.json({secretPayload:JSON.stringify({version:2,spot:pair,futures:null}),permissions:{}});
      }
      if(url.pathname==='/0/private/GetApiKeyInfo'){
        assert.equal(opts.headers['API-Key'],pair.apiKey);
        events.push('verify');
        return Response.json({error:[],result:{permissions:['query-funds']}});
      }
      if(url.pathname==='/sapi/v1/account/apiRestrictions'){
        assert.equal(opts.headers['X-MBX-APIKEY'],pair.apiKey);
        events.push('verify');
        return Response.json({enableReading:true,enableWithdrawals:false,
          enableInternalTransfer:false,permitsUniversalTransfer:false,
          enableSpotAndMarginTrading:false,enableFutures:false});
      }
      if(url.pathname==='/api/v3/trades'){
        assert.equal(opts.credentials,'omit');
        assert.equal(opts.headers['X-MBX-APIKEY'],undefined);
        events.push('price');
        return Response.json([{price:'81234.5',time:timestamp}]);
      }
      if(url.pathname==='/0/public/Trades'){
        assert.equal(opts.credentials,'omit');
        assert.equal(opts.headers['API-Key'],undefined);
        events.push('price');
        return Response.json({error:[],result:{'BTC/USD':[['81234.5','0.1',timestamp/1000]],last:'x'}});
      }
      throw Error('unrecognized test route');
    };
    const vault=createUserProviderVault({env,auth,fetchImpl});
    const response=await vault.executePrivateQuery(userId,provider,'market.spot_trade',{symbol});
    assert.deepEqual(events,['vault','verify','price']);
    assert.equal(response.symbol,symbol);
    assert.equal(response.price,81234.5);
    assert.equal(response.dataScope,'USER_PRIVATE_MARKET_DATA');
    assert.equal(response.publicDisplayAllowed,false);
    assert.equal(response.sharedCacheAllowed,false);
    assert.equal(response.jetStreamPublicationAllowed,false);
    assert.equal(response.actionable,false);
    assert.doesNotMatch(JSON.stringify(response),/this-user-|only-this-user/);
  }
});
test('missing private Vault connection stops user market snapshots before public provider I/O',async()=>{
  let calls=0;
  const vault=createUserProviderVault({env,auth,fetchImpl:async(input)=>{
    calls++;
    const url=new URL(String(input));
    assert.equal(url.origin,'https://project.supabase.co');
    return Response.json(null);
  }});
  await assert.rejects(vault.executePrivateQuery('11111111-1111-1111-1111-111111111111',
    'kraken','market.spot_trade',{symbol:'BTCUSD'}),/PROVIDER_CONNECTION_NOT_FOUND/);
  assert.equal(calls,1);
});
