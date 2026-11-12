// CAPITAL_AI_INSTAGRAM_FACEBOOK_OAUTH_EXCHANGE@1
// Facebook Login only: never interchange Instagram Login tokens or API hosts.
// No publish/upload API calls. All provider responses are bounded and fail closed.
import { createCipheriv, randomBytes } from 'node:crypto';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NUM=/^[0-9]{1,40}$/;
const REQUIRED=Object.freeze(['pages_show_list','instagram_basic','instagram_content_publish','pages_read_engagement']);
const CALLBACK='/api/social-media/auth/callback';
function check(ok, code) { if(!ok) throw Error(code); }
function isServiceJwt(k) { try { return k.startsWith('eyJ') && JSON.parse(Buffer.from(k.split('.')[1],'base64url')).role==='service_role'; } catch { return false; } }
function validOrigin(value) { const u=new URL(value); check(u.protocol==='https:' && u.pathname==='/' && !u.search && !u.hash && !u.username && !u.password && !u.port,'SOCIAL_IG_ORIGIN_INVALID'); return u.origin; }
function encryptionKey(raw) {
  if(typeof raw==='string' && /^[a-fA-F0-9]{64}$/.test(raw)) return Buffer.from(raw,'hex');
  if(typeof raw==='string' && /^[A-Za-z0-9+/]{43}=$/.test(raw)) {
    const key=Buffer.from(raw,'base64'); if(key.length===32 && key.toString('base64')===raw) return key;
  }
  throw Error('SOCIAL_IG_ENCRYPTION_KEY_INVALID');
}
export const INSTAGRAM_FACEBOOK_SCOPES=REQUIRED;
export function instagramFacebookConfig(env=process.env) {
  check(env.SOCIAL_INSTAGRAM_OAUTH_CONNECT_ENABLED==='true' && env.SOCIAL_OAUTH_CALLBACK_ENABLED==='true','SOCIAL_IG_OAUTH_DISABLED');
  const origin=validOrigin(env.PUBLIC_APP_ORIGIN);
  check(NUM.test(env.SOCIAL_INSTAGRAM_OAUTH_APP_ID||'') && typeof env.SOCIAL_INSTAGRAM_OAUTH_APP_SECRET==='string'
    && env.SOCIAL_INSTAGRAM_OAUTH_APP_SECRET.length>=12 && env.SOCIAL_INSTAGRAM_OAUTH_APP_SECRET.length<=512,
    'SOCIAL_IG_CLIENT_INVALID');
  check(/^v[0-9]+\.[0-9]+$/.test(env.SOCIAL_META_GRAPH_API_VERSION||''),'SOCIAL_IG_GRAPH_VERSION_INVALID');
  const key=encryptionKey(env.SOCIAL_INSTAGRAM_TOKEN_ENCRYPTION_KEY);
  const dbOrigin=validOrigin(env.SUPABASE_URL);
  const serviceKey=env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
  check(typeof serviceKey==='string' && (serviceKey.startsWith('sb_secret_') || isServiceJwt(serviceKey)),
    'SOCIAL_IG_STORE_UNAVAILABLE');
  check(!env.SOCIAL_INSTAGRAM_EXPECTED_ACCOUNT_ID || NUM.test(env.SOCIAL_INSTAGRAM_EXPECTED_ACCOUNT_ID),
    'SOCIAL_IG_EXPECTED_ACCOUNT_INVALID');
  check(!env.SOCIAL_INSTAGRAM_EXPECTED_PAGE_ID || NUM.test(env.SOCIAL_INSTAGRAM_EXPECTED_PAGE_ID),
    'SOCIAL_IG_EXPECTED_PAGE_INVALID');
  return Object.freeze({appId:env.SOCIAL_INSTAGRAM_OAUTH_APP_ID,
    appSecret:env.SOCIAL_INSTAGRAM_OAUTH_APP_SECRET, graphVersion:env.SOCIAL_META_GRAPH_API_VERSION,
    redirectUri:origin+CALLBACK, key, dbOrigin, serviceKey,
    expectedIgId:env.SOCIAL_INSTAGRAM_EXPECTED_ACCOUNT_ID||null,
    expectedPageId:env.SOCIAL_INSTAGRAM_EXPECTED_PAGE_ID||null});
}
export function instagramFacebookConfigured(env=process.env) {
  try { instagramFacebookConfig(env); return true; } catch { return false; }
}
export function sealInstagramPageToken(token,key,{userId,igId,pageId}) {
  check(typeof token==='string' && token.length>=10 && token.length<=8192
    && UUID.test(userId||'') && NUM.test(igId||'') && NUM.test(pageId||''),
    'SOCIAL_IG_TOKEN_INVALID');
  const iv=randomBytes(12), c=createCipheriv('aes-256-gcm',key,iv);
  c.setAAD(Buffer.from(JSON.stringify(['capital-social-instagram-page-v1',userId,igId])));
  const ciphertext=Buffer.concat([c.update(token,'utf8'),c.final()]);
  return 'v1.'+[iv,c.getAuthTag(),ciphertext].map(x=>x.toString('base64url')).join('.');
}
async function request(fetchImpl,target,{method='GET',headers={},body}={}) {
  let res;
  try { res=await fetchImpl(target,{method,headers:{Accept:'application/json',...headers},
    ...(body===undefined?{}:{body}),redirect:'error',signal:AbortSignal.timeout(8000)}); }
  catch { throw Error('SOCIAL_IG_PROVIDER_UNAVAILABLE'); }
  check(res?.ok===true,'SOCIAL_IG_PROVIDER_REJECTED');
  let raw; try { raw=await res.text(); } catch { throw Error('SOCIAL_IG_PROVIDER_UNAVAILABLE'); }
  check(raw.length<=16384,'SOCIAL_IG_RESPONSE_TOO_LARGE');
  try { return JSON.parse(raw); } catch { throw Error('SOCIAL_IG_PROVIDER_INVALID_JSON'); }
}
const bearer=token=>({Authorization:'Bearer '+token});
function dataValid(debug,appId,type) {
  const d=debug?.data; check(d?.is_valid===true && String(d.app_id)===appId
    && d.type===type && Number.isSafeInteger(d.expires_at)
    && (d.expires_at===0 || d.expires_at*1000>Date.now()+60000),
  'SOCIAL_IG_DEBUG_TOKEN_INVALID');
  return d;
}
export function createInstagramFacebookExchange({env=process.env,fetchImpl=fetch}={}) {
  return async trusted=>{
    check(trusted?.channel==='INSTAGRAM' && UUID.test(trusted.userId||'')
      && typeof trusted.code==='string' && trusted.code.length>0 && trusted.code.length<=2048,
    'SOCIAL_IG_CONTEXT_INVALID');
    const cfg=instagramFacebookConfig(env);
    check(trusted.redirectUri===cfg.redirectUri,'SOCIAL_IG_REDIRECT_INVALID');
    const root='https://graph.facebook.com/'+cfg.graphVersion;
    // Graph OAuth code exchange and long-lived user-token exchange.
    const codeBody=new URLSearchParams({client_id:cfg.appId,client_secret:cfg.appSecret,
      redirect_uri:cfg.redirectUri,code:trusted.code}).toString();
    const short=await request(fetchImpl,root+'/oauth/access_token',{method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},body:codeBody});
    check(typeof short.access_token==='string' && short.access_token.length>=10
      && (!short.token_type || /^bearer$/i.test(short.token_type)),
    'SOCIAL_IG_ACCESS_TOKEN_MISSING');
    const longBody=new URLSearchParams({grant_type:'fb_exchange_token',
      client_id:cfg.appId,client_secret:cfg.appSecret,fb_exchange_token:short.access_token}).toString();
    const long=await request(fetchImpl,root+'/oauth/access_token',{method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},body:longBody});
    check(typeof long.access_token==='string' && long.access_token.length>=10
      && (!long.token_type || /^bearer$/i.test(long.token_type)),
    'SOCIAL_IG_LONG_TOKEN_MISSING');
    const debugBody=token=>new URLSearchParams({input_token:token}).toString();
    const appBearer=bearer(cfg.appId+'|'+cfg.appSecret);
    const userDebug=dataValid(await request(fetchImpl,root+'/debug_token',{method:'POST',
      headers:{...appBearer,'Content-Type':'application/x-www-form-urlencoded'},
      body:debugBody(long.access_token)}),cfg.appId,'USER');
    check(REQUIRED.every(scope=>Array.isArray(userDebug.scopes)&&userDebug.scopes.includes(scope))
      && NUM.test(String(userDebug.user_id||'')), 'SOCIAL_IG_SCOPES_OR_USER_INVALID');
    const permissions=await request(fetchImpl,root+'/me/permissions?limit=100',
      {headers:bearer(long.access_token)});
    check(Array.isArray(permissions?.data)
      && REQUIRED.every(scope=>permissions.data.some(p=>p.permission===scope && p.status==='granted')),
      'SOCIAL_IG_PERMISSIONS_NOT_GRANTED');
    const pages=await request(fetchImpl,
      root+'/me/accounts?fields=id,name,tasks,instagram_business_account%7Bid%2Cusername%7D,access_token&limit=100',
      {headers:bearer(long.access_token)});
    // No silent selection of the first page, truncation or pagination ambiguity.
    check(Array.isArray(pages?.data) && !pages.paging?.next,'SOCIAL_IG_PAGE_SELECTION_REQUIRED');
    const eligible=pages.data.filter(p=>NUM.test(String(p?.id||''))
      && NUM.test(String(p?.instagram_business_account?.id||''))
      && Array.isArray(p.tasks) && p.tasks.some(t=>['CREATE_CONTENT','MANAGE',
        'PROFILE_PLUS_CREATE_CONTENT','PROFILE_PLUS_FULL_CONTROL'].includes(t)));
    check(eligible.length===1,'SOCIAL_IG_PAGE_SELECTION_REQUIRED');
    const page=eligible[0],ig=page.instagram_business_account;
    check((!cfg.expectedIgId || String(ig.id)===cfg.expectedIgId)
      && (!cfg.expectedPageId || String(page.id)===cfg.expectedPageId),
      'SOCIAL_IG_EXPECTED_PAGE_ACCOUNT_MISMATCH');
    check(typeof page.access_token==='string' && page.access_token.length>=10
      && typeof ig.username==='string' && /^[A-Za-z0-9_.]{1,30}$/.test(ig.username),
      'SOCIAL_IG_PAGE_TOKEN_OR_HANDLE_INVALID');
    // Page credentials must be a PAGE token for this same app. Never store the user token.
    const pageDebug=dataValid(await request(fetchImpl,root+'/debug_token',{method:'POST',
      headers:{...appBearer,'Content-Type':'application/x-www-form-urlencoded'},
      body:debugBody(page.access_token)}),cfg.appId,'PAGE');
    // A PAGE token must independently read back the same Page and its IG link.
    // Avoid relying on a debug_token profile_id that some Meta versions omit.
    const bound=await request(fetchImpl,root+'/'+page.id
      +'?fields=id,instagram_business_account%7Bid%2Cusername%7D',
      {headers:bearer(page.access_token)});
    check(String(bound?.id||'')===String(page.id)
      && String(bound?.instagram_business_account?.id||'')===String(ig.id),
      'SOCIAL_IG_PAGE_TOKEN_IDENTITY_INVALID');
    const expiries=[userDebug.expires_at,pageDebug.expires_at]
      .filter(n=>Number.isSafeInteger(n)&&n>0).map(n=>n*1000);
    check(expiries.length>0,'SOCIAL_IG_TOKEN_EXPIRY_UNKNOWN');
    const expiry=Math.min(...expiries,Date.now()+7*86400*1000);
    check(expiry>Date.now()+60000,'SOCIAL_IG_TOKEN_EXPIRED');
    const encrypted=sealInstagramPageToken(page.access_token,cfg.key,{
      userId:trusted.userId,igId:String(ig.id),pageId:String(page.id)});
    const record={user_id:trusted.userId,platform:'instagram',status:'connected',
      account_name:String(page.name||ig.username).slice(0,140),
      handle:ig.username,external_account_id:String(ig.id),
      scopes:REQUIRED,access_token_encrypted:encrypted,refresh_token_encrypted:null,
      token_expires_at:new Date(expiry).toISOString(),connected_at:new Date().toISOString()};
    const endpoint=cfg.dbOrigin+'/rest/v1/social_media_accounts?on_conflict=user_id%2Cplatform';
    const headers={apikey:cfg.serviceKey,'Content-Type':'application/json',
      Prefer:'resolution=merge-duplicates,return=representation'};
    if(cfg.serviceKey.startsWith('eyJ')) headers.Authorization='Bearer '+cfg.serviceKey;
    const result=await request(fetchImpl,endpoint,{method:'POST',headers,body:JSON.stringify(record)});
    const row=Array.isArray(result) && result.length===1?result[0]:null;
    check(row?.user_id===trusted.userId && row?.platform==='instagram'
      && row?.external_account_id===String(ig.id) && row?.handle===ig.username
      && row?.status==='connected' && row?.access_token_encrypted===encrypted
      && row?.token_expires_at===record.token_expires_at
      && Array.isArray(row?.scopes) && REQUIRED.every(s=>row.scopes.includes(s)),
      'SOCIAL_IG_PERSIST_READBACK_FAILED');
    return Object.freeze({connected:true,channel:'INSTAGRAM',handle:ig.username});
  };
}
