// CAPITAL_AI_INSTAGRAM_FACEBOOK_ACCOUNT_STATUS@1
// Owner only; never read/access token columns or expose provider identifiers.
import { instagramFacebookConfigured, INSTAGRAM_FACEBOOK_SCOPES } from './instagram-oauth-exchange.mjs';
const PATH='/api/social-media/instagram/account/status';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isServiceJwt(s) { try {return s.startsWith('eyJ')&&JSON.parse(Buffer.from(s.split('.')[1],'base64url')).role==='service_role';} catch{return false;} }
export function createInstagramFacebookStatus({env=process.env,auth,fetchImpl=fetch}={}) {
  async function handle(req,res,url,json) {
    if(url.pathname!==PATH) return false;
    res.setHeader('Cache-Control','private, no-store, max-age=0');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Robots-Tag','noindex, nofollow');
    res.setHeader('Vary','Cookie');
    if(req.method!=='GET') {res.setHeader('Allow','GET');json(res,405,{error:'method_not_allowed'});return true;}
    const identity=await auth?.verify?.(req,res);
    if(!UUID.test(identity?.userId||'')||identity.emailVerified!==true
      ||await auth?.authorizeIamRole?.(req,res,'owner')!==true) {
      json(res,403,{error:'owner_authorization_required'});return true;
    }
    if(!instagramFacebookConfigured(env)) {
      json(res,200,{channel:'INSTAGRAM',connected:false,status:'not_configured',scopes:[]});
      return true;
    }
    try {
      const urlDb=new URL(env.SUPABASE_URL),key=env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY||'';
      if(urlDb.protocol!=='https:'||urlDb.pathname!=='/'||urlDb.search||urlDb.hash
        ||!(key.startsWith('sb_secret_')||isServiceJwt(key)))throw Error();
      const endpoint=new URL('/rest/v1/social_media_accounts',urlDb.origin);
      endpoint.searchParams.set('user_id','eq.'+identity.userId);
      endpoint.searchParams.set('platform','eq.instagram');
      endpoint.searchParams.set('select','user_id,status,platform,scopes,token_expires_at');
      endpoint.searchParams.set('limit','1');
      const headers={apikey:key,Accept:'application/json'};
      if(key.startsWith('eyJ')) headers.Authorization='Bearer '+key;
      const response=await fetchImpl(endpoint,{method:'GET',headers,redirect:'error',
        signal:AbortSignal.timeout(7000)});
      if(!response.ok)throw Error();
      const raw=await response.text();
      if(raw.length>8192)throw Error();
      const rows=JSON.parse(raw);
      if(!Array.isArray(rows)||rows.length>1)throw Error();
      const row=rows[0]||null;
      if(row&&(row.user_id!==identity.userId||row.platform!=='instagram'))throw Error();
      const scopesOk=INSTAGRAM_FACEBOOK_SCOPES.every(s=>row?.scopes?.includes(s));
      const expires=Date.parse(row?.token_expires_at||'');
      const valid=Number.isFinite(expires)&&expires>Date.now()+60000;
      const connected=row?.status==='connected'&&scopesOk&&valid;
      json(res,200,{channel:'INSTAGRAM',connected,
        status:connected?'connected':row?.status==='connected'
          ?(scopesOk?'token_expired':'permissions_missing'):'not_connected',
        scopes:connected?[...INSTAGRAM_FACEBOOK_SCOPES]:[],
        // No handle, account IDs, app keys, encryption metadata or provider tokens.
      });
    }catch {json(res,503,{error:'social_instagram_account_unavailable'});}
    return true;
  }
  return Object.freeze({handle});
}
