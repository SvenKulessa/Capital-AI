// CAPITAL_AI_FACEBOOK_PAGE_OAUTH_EXCHANGE@1
// Owner-only Facebook Page grant using the existing Meta Facebook Login application.
// No publishing, no Instagram authority, no browser tokens.
import { createCipheriv, createHmac, randomBytes } from 'node:crypto';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NUM=/^[0-9]{1,40}$/;
const CALLBACK='/api/social-media/auth/callback';
export const FACEBOOK_PAGE_SCOPES=Object.freeze(['pages_show_list','pages_read_engagement','pages_manage_posts']);
function requireThat(ok,code){if(!ok)throw Error(code);}
function serviceJwt(key){try{return key.startsWith('eyJ')&&JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='service_role';}catch{return false;}}
function origin(value){
  let url;try{url=new URL(value);}catch{throw Error('SOCIAL_FB_ORIGIN_INVALID');}
  requireThat(url.protocol==='https:'&&url.pathname==='/'&&!url.search&&!url.hash&&!url.username&&!url.password&&!url.port,'SOCIAL_FB_ORIGIN_INVALID');
  return url.origin;
}
function encryptionKey(raw){
  if(typeof raw==='string'&&/^[a-fA-F0-9]{64}$/.test(raw))return Buffer.from(raw,'hex');
  if(typeof raw==='string'&&/^[A-Za-z0-9+/]{43}=$/.test(raw)){
    const key=Buffer.from(raw,'base64');
    if(key.length===32&&key.toString('base64')===raw)return key;
  }
  throw Error('SOCIAL_FB_KEY_INVALID');
}
export function facebookPageConfig(env=process.env){
  requireThat(env.SOCIAL_FACEBOOK_OAUTH_CONNECT_ENABLED==='true'&&env.SOCIAL_OAUTH_CALLBACK_ENABLED==='true','SOCIAL_FB_DISABLED');
  const redirectUri=origin(env.PUBLIC_APP_ORIGIN)+CALLBACK;
  // Same Meta app as Instagram, but a separate consent flow and independent key.
  const appId=env.SOCIAL_INSTAGRAM_OAUTH_APP_ID;
  const appSecret=env.SOCIAL_INSTAGRAM_OAUTH_APP_SECRET;
  requireThat(NUM.test(appId||'')&&typeof appSecret==='string'&&appSecret.length>=12&&appSecret.length<=512,'SOCIAL_FB_APP_INVALID');
  const graphVersion=env.SOCIAL_META_GRAPH_API_VERSION;
  requireThat(/^v[0-9]+\.[0-9]+$/.test(graphVersion||''),'SOCIAL_FB_VERSION_INVALID');
  const expectedPageId=env.SOCIAL_FACEBOOK_EXPECTED_PAGE_ID;
  requireThat(NUM.test(expectedPageId||''),'SOCIAL_FB_EXPECTED_PAGE_INVALID');
  const dbOrigin=origin(env.SUPABASE_URL);
  const serviceKey=env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY||'';
  requireThat(serviceKey.startsWith('sb_secret_')||serviceJwt(serviceKey),'SOCIAL_FB_STORE_UNAVAILABLE');
  const key=encryptionKey(env.SOCIAL_FACEBOOK_TOKEN_ENCRYPTION_KEY);
  return Object.freeze({appId,appSecret,graphVersion,expectedPageId,dbOrigin,serviceKey,key,redirectUri});
}
export function facebookPageConfigured(env=process.env){try{facebookPageConfig(env);return true;}catch{return false;}}
export function sealFacebookPageToken(token,key,{userId,pageId}){
  requireThat(typeof token==='string'&&token.length>=10&&token.length<=8192&&UUID.test(userId||'')&&NUM.test(pageId||''),'SOCIAL_FB_TOKEN_INVALID');
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
  cipher.setAAD(Buffer.from(JSON.stringify(['capital-social-facebook-page-v1',userId,'FACEBOOK',pageId])));
  const bytes=Buffer.concat([cipher.update(token,'utf8'),cipher.final()]);
  return 'v1.'+[iv,cipher.getAuthTag(),bytes].map(x=>x.toString('base64url')).join('.');
}
async function request(fetchImpl,target,{method='GET',headers={},body}={}){
  let response;try{response=await fetchImpl(target,{method,headers:{Accept:'application/json',...headers},
    ...(body===undefined?{}:{body}),redirect:'error',signal:AbortSignal.timeout(8000)});}
  catch{throw Error('SOCIAL_FB_PROVIDER_UNAVAILABLE');}
  requireThat(response?.ok===true,'SOCIAL_FB_PROVIDER_REJECTED');
  let raw;try{raw=await response.text();}catch{throw Error('SOCIAL_FB_PROVIDER_UNAVAILABLE');}
  requireThat(raw.length<=16384,'SOCIAL_FB_RESPONSE_TOO_LARGE');
  try{return JSON.parse(raw);}catch{throw Error('SOCIAL_FB_INVALID_JSON');}
}
function validDebug(result,appId,type){
  const d=result?.data;
  requireThat(d?.is_valid===true&&String(d.app_id)===appId&&d.type===type
    &&Number.isSafeInteger(d.expires_at)
    &&(d.expires_at===0||d.expires_at*1000>Date.now()+60000)
    &&(d.data_access_expires_at===undefined||d.data_access_expires_at===null
      ||(Number.isSafeInteger(d.data_access_expires_at)
      &&(d.data_access_expires_at===0||d.data_access_expires_at*1000>Date.now()+60000))),
    'SOCIAL_FB_DEBUG_INVALID');
  return d;
}
const bearer=value=>({Authorization:'Bearer '+value});
export function createFacebookPageExchange({env=process.env,fetchImpl=fetch}={}){
  return async trusted=>{
    requireThat(trusted?.channel==='FACEBOOK'&&UUID.test(trusted.userId||'')
      &&typeof trusted.code==='string'&&trusted.code.length>0&&trusted.code.length<=2048,
      'SOCIAL_FB_CONTEXT_INVALID');
    const cfg=facebookPageConfig(env);
    requireThat(trusted.redirectUri===cfg.redirectUri,'SOCIAL_FB_REDIRECT_INVALID');
    const root='https://graph.facebook.com/'+cfg.graphVersion;
    const short=await request(fetchImpl,root+'/oauth/access_token',{method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({client_id:cfg.appId,client_secret:cfg.appSecret,
        redirect_uri:cfg.redirectUri,code:trusted.code}).toString()});
    requireThat(typeof short.access_token==='string'&&short.access_token.length>=10
      &&(!short.token_type||/^bearer$/i.test(short.token_type)),'SOCIAL_FB_SHORT_TOKEN_INVALID');
    const long=await request(fetchImpl,root+'/oauth/access_token',{method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({grant_type:'fb_exchange_token',client_id:cfg.appId,
        client_secret:cfg.appSecret,fb_exchange_token:short.access_token}).toString()});
    requireThat(typeof long.access_token==='string'&&long.access_token.length>=10
      &&(!long.token_type||/^bearer$/i.test(long.token_type)),'SOCIAL_FB_LONG_TOKEN_INVALID');
    const appToken=cfg.appId+'|'+cfg.appSecret;
    const proof=tok=>createHmac('sha256',cfg.appSecret).update(tok).digest('hex');
    const debugBody=tok=>new URLSearchParams({input_token:tok,appsecret_proof:proof(appToken)}).toString();
    const debug=async(tok,type)=>validDebug(await request(fetchImpl,root+'/debug_token',{
      method:'POST',headers:{...bearer(appToken),'Content-Type':'application/x-www-form-urlencoded'},
      body:debugBody(tok)}),cfg.appId,type);
    const user=await debug(long.access_token,'USER');
    requireThat(NUM.test(String(user.user_id||''))&&FACEBOOK_PAGE_SCOPES.every(s=>Array.isArray(user.scopes)&&user.scopes.includes(s)),
      'SOCIAL_FB_USER_SCOPES_INVALID');
    const permissions=await request(fetchImpl,root+'/me/permissions?limit=100&appsecret_proof='+proof(long.access_token),
      {headers:bearer(long.access_token)});
    requireThat(Array.isArray(permissions?.data)&&FACEBOOK_PAGE_SCOPES.every(s=>
      permissions.data.some(p=>p.permission===s&&p.status==='granted')),'SOCIAL_FB_PERMISSIONS_NOT_GRANTED');
    const pages=await request(fetchImpl,root+'/me/accounts?fields=id,name,tasks,access_token&limit=100&appsecret_proof='+proof(long.access_token),
      {headers:bearer(long.access_token)});
    requireThat(Array.isArray(pages?.data)&&!pages.paging?.next,'SOCIAL_FB_PAGE_SELECTION_REQUIRED');
    const eligible=pages.data.filter(p=>String(p?.id||'')===cfg.expectedPageId
      &&Array.isArray(p.tasks)&&p.tasks.some(t=>['CREATE_CONTENT','PROFILE_PLUS_CREATE_CONTENT'].includes(t)));
    requireThat(eligible.length===1,'SOCIAL_FB_PAGE_SELECTION_REQUIRED');
    const page=eligible[0];
    requireThat(typeof page.access_token==='string'&&page.access_token.length>=10
      &&typeof page.name==='string'&&page.name.trim().length>0&&page.name.length<=140,
      'SOCIAL_FB_PAGE_INVALID');
    const pageDebug=await debug(page.access_token,'PAGE');
    requireThat(pageDebug.profile_id==null||String(pageDebug.profile_id)===cfg.expectedPageId,
      'SOCIAL_FB_PAGE_TOKEN_IDENTITY_INVALID');
    requireThat(Array.isArray(pageDebug.scopes)&&FACEBOOK_PAGE_SCOPES.every(s=>pageDebug.scopes.includes(s)),
      'SOCIAL_FB_PAGE_SCOPES_INVALID');
    const granular=Array.isArray(user.granular_scopes)
      ? user.granular_scopes.find(s=>s.scope==='pages_manage_posts'):null;
    requireThat(!granular||(Array.isArray(granular.target_ids)&&granular.target_ids.map(String).includes(cfg.expectedPageId)),
      'SOCIAL_FB_GRANULAR_SCOPE_INVALID');
    const bound=await request(fetchImpl,root+'/'+cfg.expectedPageId
      +'?fields=id,name&appsecret_proof='+proof(page.access_token),
      {headers:bearer(page.access_token)});
    requireThat(String(bound?.id||'')===cfg.expectedPageId&&bound?.name===page.name,
      'SOCIAL_FB_PAGE_TOKEN_IDENTITY_INVALID');
    const expiries=[user.expires_at,pageDebug.expires_at,user.data_access_expires_at,pageDebug.data_access_expires_at]
      .filter(n=>Number.isSafeInteger(n)&&n>0).map(n=>n*1000);
    requireThat(expiries.length>0,'SOCIAL_FB_EXPIRY_UNKNOWN');
    const expiry=Math.min(...expiries,Date.now()+7*86400*1000);
    requireThat(expiry>Date.now()+60000,'SOCIAL_FB_TOKEN_EXPIRED');
    const encrypted=sealFacebookPageToken(page.access_token,cfg.key,{userId:trusted.userId,pageId:cfg.expectedPageId});
    const row={user_id:trusted.userId,platform:'facebook',status:'connected',
      account_name:page.name,handle:null,external_account_id:cfg.expectedPageId,scopes:FACEBOOK_PAGE_SCOPES,
      access_token_encrypted:encrypted,refresh_token_encrypted:null,
      token_expires_at:new Date(expiry).toISOString(),connected_at:new Date().toISOString()};
    const headers={apikey:cfg.serviceKey,'Content-Type':'application/json',
      Prefer:'resolution=merge-duplicates,return=representation'};
    if(serviceJwt(cfg.serviceKey))headers.Authorization='Bearer '+cfg.serviceKey;
    const saved=await request(fetchImpl,cfg.dbOrigin+'/rest/v1/social_media_accounts?on_conflict=user_id%2Cplatform',
      {method:'POST',headers,body:JSON.stringify(row)});
    const confirmed=Array.isArray(saved)&&saved.length===1?saved[0]:null;
    requireThat(confirmed?.user_id===row.user_id&&confirmed?.platform===row.platform
      &&confirmed?.status==='connected'&&confirmed?.external_account_id===row.external_account_id
      &&confirmed?.access_token_encrypted===encrypted
      &&confirmed?.token_expires_at===row.token_expires_at
      &&Array.isArray(confirmed.scopes)
      &&FACEBOOK_PAGE_SCOPES.every(s=>confirmed.scopes.includes(s)),
      'SOCIAL_FB_PERSIST_READBACK_FAILED');
    return Object.freeze({connected:true,channel:'FACEBOOK'});
  };
}
