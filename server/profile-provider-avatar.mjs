import { safeAccountAvatarUrl } from '../shared/account-avatar-policy.mjs';

/**
 * Verified-session-only, bounded image proxy. Keeps img-src 'self' CSP intact.
 * External URL is selected by the server from verified OAuth identity metadata;
 * no user-provided URL, redirect, credentials, arbitrary host or SVG support.
 */
export function createProfileProviderAvatar({auth,fetchImpl=fetch}={}) {
  async function handle(req,res,url,json) {
    if(url.pathname!=='/api/profile/avatar/provider')return false;
    res.setHeader('Cache-Control','private, no-store, max-age=0');
    if(req.method!=='GET'){
      res.setHeader('Allow','GET');json(res,405,{error:'method_not_allowed'});return true;
    }
    const user=await auth?.verify?.(req,res);
    if(!user?.userId){json(res,401,{error:'authentication_required'});return true;}
    const remote=await auth?.verifiedProviderAvatarUrl?.(req,res);
    if(!remote || !safeAccountAvatarUrl(remote) || !remote.startsWith('https://')){
      json(res,404,{error:'avatar_unavailable'});return true;
    }
    let reply;
    try{
      reply=await fetchImpl(remote,{method:'GET',headers:{Accept:'image/png, image/jpeg, image/webp'},
        redirect:'error',signal:AbortSignal.timeout(7000)});
      if(!reply.ok){json(res,404,{error:'avatar_unavailable'});return true;}
      const type=String(reply.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
      if(!['image/png','image/jpeg','image/webp'].includes(type)){
        json(res,415,{error:'avatar_format_rejected'});return true;
      }
      const length=Number(reply.headers.get('content-length')||0);
      if(length>524288){json(res,413,{error:'avatar_too_large'});return true;}
      const reader=reply.body?.getReader?.();
      if(!reader){json(res,503,{error:'avatar_unavailable'});return true;}
      const chunks=[];let total=0;
      try {
        while(true){
          const {done,value}=await reader.read();
          if(done)break;
          total+=value.length;
          if(total>524288){await reader.cancel();json(res,413,{error:'avatar_too_large'});return true;}
          chunks.push(value);
        }
      }finally{reader.releaseLock();}
      const data=Buffer.concat(chunks);
      const valid=type==='image/png' ? data.length>=8 && data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
        :type==='image/jpeg' ? data.length>=4 && data[0]===255&&data[1]===216&&data.at(-2)===255&&data.at(-1)===217
        :data.length>=12&&data.subarray(0,4).toString()==='RIFF'&&data.subarray(8,12).toString()==='WEBP';
      if(!valid){json(res,415,{error:'avatar_format_rejected'});return true;}
      res.setHeader('Content-Type',type);
      res.setHeader('X-Content-Type-Options','nosniff');
      res.setHeader('Cross-Origin-Resource-Policy','same-origin');
      res.writeHead(200);res.end(data);
      return true;
    }catch{json(res,503,{error:'avatar_unavailable'});return true;}
  }
  return {handle};
}
