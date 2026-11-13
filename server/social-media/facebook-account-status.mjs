// CAPITAL_AI_FACEBOOK_PAGE_ACCOUNT_STATUS@1
// Token-free owner-only status. No third-party API traffic.
import { facebookPageConfigured, FACEBOOK_PAGE_SCOPES } from './facebook-oauth-exchange.mjs';
const PATH='/api/social-media/facebook/account/status';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function serviceJwt(key){try{return key.startsWith('eyJ')&&JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='service_role';}catch{return false;}}
export function createFacebookPageStatus({env=process.env,auth,fetchImpl=fetch}={}){
  async function handle(req,res,url,json){
    if(url.pathname!==PATH)return false;
    res.setHeader('Cache-Control','private, no-store, max-age=0');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Robots-Tag','noindex, nofollow');
    res.setHeader('Vary','Cookie');
    if(req.method!=='GET'){res.setHeader('Allow','GET');json(res,405,{error:'method_not_allowed'});return true;}
    const identity=await auth?.verify?.(req,res);
    if(!UUID.test(identity?.userId||'')||identity.emailVerified!==true
      ||await auth?.authorizeIamRole?.(req,res,'owner')!==true){
      json(res,403,{error:'owner_authorization_required'});return true;
    }
    if(!facebookPageConfigured(env)){
      json(res,200,{channel:'FACEBOOK',connected:false,status:'not_configured',scopes:[]});return true;
    }
    try{
      const target=new URL(env.SUPABASE_URL);
      const key=env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY||'';
      if(target.protocol!=='https:'||target.pathname!=='/'||target.search||target.hash
        ||!(key.startsWith('sb_secret_')||serviceJwt(key)))throw Error();
      const endpoint=new URL('/rest/v1/social_media_accounts',target.origin);
      endpoint.searchParams.set('user_id','eq.'+identity.userId);
      endpoint.searchParams.set('platform','eq.facebook');
      endpoint.searchParams.set('select','user_id,status,platform,external_account_id,scopes,token_expires_at');
      endpoint.searchParams.set('limit','1');
      const headers={apikey:key,Accept:'application/json'};
      if(serviceJwt(key))headers.Authorization='Bearer '+key;
      const response=await fetchImpl(endpoint,{method:'GET',headers,redirect:'error',
        signal:AbortSignal.timeout(7000)});
      if(!response.ok)throw Error();
      const raw=await response.text();if(raw.length>8192)throw Error();
      const rows=JSON.parse(raw);
      if(!Array.isArray(rows)||rows.length>1)throw Error();
      const row=rows[0]||null;
      if(row&&(row.user_id!==identity.userId||row.platform!=='facebook'))throw Error();
      const scopesOk=FACEBOOK_PAGE_SCOPES.every(s=>row?.scopes?.includes(s));
      const valid=Number.isFinite(Date.parse(row?.token_expires_at||''))
        &&Date.parse(row.token_expires_at)>Date.now()+60000;
      const pageOk=row?.external_account_id===env.SOCIAL_FACEBOOK_EXPECTED_PAGE_ID;
      const connected=row?.status==='connected'&&scopesOk&&valid&&pageOk;
      json(res,200,{channel:'FACEBOOK',connected,
        status:connected?'connected':row?.status==='connected'
          ?(!scopesOk?'permissions_missing':!pageOk?'page_mismatch':'token_expired'):'not_connected',
        scopes:connected?[...FACEBOOK_PAGE_SCOPES]:[]});
    }catch{json(res,503,{error:'social_facebook_account_unavailable'});}
    return true;
  }
  return Object.freeze({handle});
}
