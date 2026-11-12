// CAPITAL_AI_INSTAGRAM_FACEBOOK_OAUTH_START@1
// Owner-only Facebook Login, never Instagram Login (graph.instagram.com).
import { createSocialProviderStore } from './provider-store.mjs';
import { instagramFacebookConfig, INSTAGRAM_FACEBOOK_SCOPES } from './instagram-oauth-exchange.mjs';
const PATH='/api/social-media/instagram/auth/start';
const COOKIE='capital_instagram_oauth_state';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createInstagramFacebookStart({env=process.env,auth,store=null,fetchImpl=fetch}={}) {
  async function handle(req,res,url,json) {
    if(url.pathname!==PATH) return false;
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Robots-Tag','noindex, nofollow');
    if(req.method!=='GET') { res.setHeader('Allow','GET');json(res,405,{error:'method_not_allowed'});return true; }
    // Reject cross-site navigation, query-controlled redirects and account selection.
    if(!['none','same-origin'].includes(req.headers?.['sec-fetch-site']) || url.search) {
      json(res,403,{error:'same_origin_required'});return true;
    }
    let cfg;try { cfg=instagramFacebookConfig(env); }
    catch { json(res,503,{error:'social_instagram_oauth_not_configured'});return true; }
    const identity=await auth?.verify?.(req,res);
    if(!UUID.test(identity?.userId||'') || identity.emailVerified!==true
      || await auth?.authorizeIamRole?.(req,res,'owner')!==true) {
      json(res,403,{error:'owner_authorization_required'});return true;
    }
    try {
      const active=store??createSocialProviderStore({env,fetchImpl});
      const issued=await active.beginOAuth({userId:identity.userId,channel:'INSTAGRAM',
        redirectUri:cfg.redirectUri,allowedRedirectUris:[cfg.redirectUri]});
      if(!/^[A-Za-z0-9_-]{43}$/.test(issued?.state||'')) throw Error();
      const authorize=new URL('https://www.facebook.com/'+cfg.graphVersion+'/dialog/oauth');
      authorize.searchParams.set('client_id',cfg.appId);
      authorize.searchParams.set('redirect_uri',cfg.redirectUri);
      authorize.searchParams.set('response_type','code');
      authorize.searchParams.set('scope',INSTAGRAM_FACEBOOK_SCOPES.join(','));
      authorize.searchParams.set('state',issued.state);
      const previousCookies=res.getHeader?.('Set-Cookie');
      res.setHeader('Set-Cookie',[
        ...(Array.isArray(previousCookies)?previousCookies:previousCookies?[previousCookies]:[]),
        COOKIE+'='+issued.state
          +'; Path=/api/social-media/auth/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=600',
      ]);
      res.writeHead(303,{Location:authorize.toString(), 'Cache-Control':'no-store',
        'Referrer-Policy':'no-referrer'});
      res.end();
    } catch { json(res,503,{error:'social_instagram_oauth_unavailable'}); }
    return true;
  }
  return Object.freeze({handle});
}
