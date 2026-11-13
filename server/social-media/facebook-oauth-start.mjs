// CAPITAL_AI_FACEBOOK_PAGE_OAUTH_START@1
// Facebook Page consent only. No publish route or browser token.
import { createSocialProviderStore } from './provider-store.mjs';
import { facebookPageConfig, FACEBOOK_PAGE_SCOPES } from './facebook-oauth-exchange.mjs';
const PATH='/api/social-media/facebook/auth/start';
const COOKIE='capital_facebook_oauth_state';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createFacebookPageStart({env=process.env,auth,store=null,fetchImpl=fetch}={}){
  async function handle(req,res,url,json){
    if(url.pathname!==PATH)return false;
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Robots-Tag','noindex, nofollow');
    if(req.method!=='GET'){res.setHeader('Allow','GET');json(res,405,{error:'method_not_allowed'});return true;}
    if(!['none','same-origin'].includes(req.headers?.['sec-fetch-site'])||url.search){
      json(res,403,{error:'same_origin_required'});return true;
    }
    let cfg;try{cfg=facebookPageConfig(env);}
    catch{json(res,503,{error:'social_facebook_oauth_not_configured'});return true;}
    const identity=await auth?.verify?.(req,res);
    if(!UUID.test(identity?.userId||'')||identity.emailVerified!==true
      ||await auth?.authorizeIamRole?.(req,res,'owner')!==true){
      json(res,403,{error:'owner_authorization_required'});return true;
    }
    try{
      const active=store??createSocialProviderStore({env,fetchImpl});
      const issued=await active.beginOAuth({userId:identity.userId,channel:'FACEBOOK',
        redirectUri:cfg.redirectUri,allowedRedirectUris:[cfg.redirectUri]});
      if(!/^[A-Za-z0-9_-]{43}$/.test(issued?.state||''))throw Error();
      const redirect=new URL('https://www.facebook.com/'+cfg.graphVersion+'/dialog/oauth');
      redirect.searchParams.set('client_id',cfg.appId);
      redirect.searchParams.set('redirect_uri',cfg.redirectUri);
      redirect.searchParams.set('response_type','code');
      redirect.searchParams.set('scope',FACEBOOK_PAGE_SCOPES.join(','));
      redirect.searchParams.set('state',issued.state);
      const current=res.getHeader?.('Set-Cookie');
      res.setHeader('Set-Cookie',[
        ...(Array.isArray(current)?current:current?[current]:[]),
        COOKIE+'='+issued.state+'; Path=/api/social-media/auth/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=600',
      ]);
      res.writeHead(303,{Location:redirect.toString(),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
      res.end();
    }catch{json(res,503,{error:'social_facebook_oauth_unavailable'});}
    return true;
  }
  return Object.freeze({handle});
}
