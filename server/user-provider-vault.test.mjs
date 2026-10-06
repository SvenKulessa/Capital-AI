import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { Readable } from 'node:stream';
import { createUserProviderVault, krakenSignature, krakenFuturesSignature } from './user-provider-vault.mjs';

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
