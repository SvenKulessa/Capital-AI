import { createHash } from 'node:crypto';
import { createYouTubeTokenResolver, createYouTubeVaultAccess } from './youtube-token-resolver.mjs';
import { createSocialProviderPublishTransport } from './provider-publish.mjs';

export const PRIVATE_SHORT_SHA = 'e306935c37b36a09499d6d5b48a24ea513f5e704f92f5160d3ee6baf537b8854';
export const TARGET_CHANNEL = 'UCqaBNJwcfu2cZL3GgG9TLgA';
const PAGE = '/api/social-media/youtube/private-test';
const UPLOAD = PAGE + '/upload';
const STATUS = PAGE + '/status';
const maxBytes = 3 * 1024 * 1024;
function must(ok, code) { if (!ok) throw Error(code); }
function jobId(userId) {
  const hex = createHash('sha256').update(JSON.stringify(['youtube-private-test-v1', userId, TARGET_CHANNEL, PRIVATE_SHORT_SHA])).digest('hex');
  return hex.slice(0,8)+'-'+hex.slice(8,12)+'-4'+hex.slice(13,16)+'-a'+hex.slice(17,20)+'-'+hex.slice(20,32);
}
async function readMedia(req) {
  must(req.headers?.['content-type']?.split(';')[0] === 'video/mp4', 'unsupported_media_type');
  if (req.headers['content-length']) must(Number(req.headers['content-length']) <= maxBytes, 'media_too_large');
  const chunks=[]; let bytes=0;
  for await (const chunk of req) { bytes+=chunk.length; must(bytes<=maxBytes,'media_too_large'); chunks.push(chunk); }
  const media=Buffer.concat(chunks);
  must(createHash('sha256').update(media).digest('hex') === PRIVATE_SHORT_SHA,'wrong_short_file');
  return media;
}
export function createYouTubePrivateUpload({ env=process.env, auth, fetchImpl=fetch, resolver=null, vaultFactory=null,
  readMediaImpl=readMedia, transport=null }={}) {
  const resolve = resolver || createYouTubeTokenResolver({env,fetchImpl});
  async function handle(req,res,url,json) {
    if (![PAGE,UPLOAD,STATUS].includes(url.pathname)) return false;
    res.setHeader('Cache-Control','private, no-store'); res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Robots-Tag','noindex, nofollow');
    if ((url.pathname===UPLOAD && req.method!=='POST') || (url.pathname!==UPLOAD && req.method!=='GET')) {
      json(res,405,{error:'method_not_allowed'});return true;
    }
    if (url.pathname===UPLOAD && (!auth?.sameOrigin?.(req) || req.headers?.['sec-fetch-site']!=='same-origin')) {
      json(res,403,{error:'same_origin_required'});return true;
    }
    const identity=await auth?.verify?.(req,res);
    if (!identity?.userId || identity.emailVerified!==true || await auth?.authorizeIamRole?.(req,res,'owner')!==true) {
      json(res,403,{error:'owner_authorization_required'});return true;
    }
    if (url.pathname===PAGE) {
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
      res.end('<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Privater YouTube-Test | CAPITAL AI</title><style>body{background:#080818;color:#f7f7fb;font:18px/1.6 system-ui;margin:0;padding:24px}main{max-width:720px;margin:auto}h1,a{color:#ffd447}button,input{display:block;font:inherit;margin:16px 0;padding:12px;max-width:100%;box-sizing:border-box}button{background:#ffd447;color:#080818;border:0;border-radius:8px;min-height:48px}button:disabled{opacity:.6}pre{white-space:pre-wrap;overflow-wrap:anywhere;padding:16px;border:1px solid #777}img{width:80px;height:80px}</style><body><main><img src="/branding/asset-pack/vendor/google-oauth-app-logo-120x120.png" alt="CAPITAL AI"><h1>Privater YouTube-Test</h1><p>Kanal: @capital-ai.online. Wähle Capital-AI-Short-01-ohlc.mp4 aus LearnClips. Der Inhalt wird über seinen Datei-Fingerabdruck geprüft und ausschließlich privat hochgeladen.</p><label for="short-file">OHLC-Short auswählen</label><input id="short-file" type="file" accept="video/mp4"><button id="upload-short" type="button">Short privat hochladen</button><button id="verify-short" type="button">Upload-Status prüfen</button><pre id="upload-result" role="status" aria-live="polite"></pre><p>Bei unklarem Ergebnis wird kein zweiter Upload ausgelöst. Prüfe zuerst den Upload-Status.</p><p><a href="/api/social-media/youtube/account/status">Kanalverbindung und Token-Erneuerung prüfen</a></p></main><script src="/youtube-private-upload.js" defer></script></body></html>'); return true;
    }
    try {
      const media=url.pathname===UPLOAD?await readMediaImpl(req):null;
      const userAccessToken=await auth?.internalAccessToken?.(req,res);
      const secret=await resolve({userId:identity.userId,userAccessToken});
      must(secret.userId===identity.userId && secret.channelId===TARGET_CHANNEL,'wrong_channel');
      const vault=vaultFactory?vaultFactory({userAccessToken}):createYouTubeVaultAccess({env,fetchImpl,userAccessToken});
      const context={userId:identity.userId,accountId:secret.accountId,channelId:TARGET_CHANNEL,
        assetSha256:PRIVATE_SHORT_SHA,jobId:jobId(identity.userId)};
      const me=await fetchImpl('https://www.googleapis.com/youtube/v3/channels?part=id&mine=true',{
        headers:{Authorization:'Bearer '+secret.accessToken},redirect:'error',signal:AbortSignal.timeout(10000)});
      const meText=await me.text(); must(me.ok && meText.length<8192,'channel_readback_failed');
      const channels=JSON.parse(meText).items;
      must(Array.isArray(channels)&&channels.length===1&&channels[0].id===TARGET_CHANNEL,'wrong_channel');
      let existing=await vault.invoke('private_status',context);
      let job=existing.job;
      must(!job || (job.id===context.jobId && job.channel_id===TARGET_CHANNEL && job.asset_sha256===PRIVATE_SHORT_SHA),'job_binding_invalid');
      if (url.pathname===UPLOAD && !job) {
        const claim=await vault.invoke('private_claim',context);
        if (claim.claimed===true) {
          const upload=transport||createSocialProviderPublishTransport({env:{...env,SOCIAL_PROVIDER_PUBLISH_ENABLED:'true',
            SOCIAL_YOUTUBE_PUBLISH_ENABLED:'true'},fetchImpl});
          const receipt=await upload.submit({channel:'YOUTUBE',accessToken:secret.accessToken,mediaBytes:media,
            metadata:{title:'PRIVATER TEST | OHLC erklärt – CAPITAL AI',visibility:'private',syntheticMedia:true,
              description:'CAPITAL-AI Lernbeispiel: Open, High, Low und Close. KI-gestützte Produktion und synthetisches Chart-Beispiel. Keine persönliche Anlageberatung oder Kauf-/Verkaufsempfehlung. Anlagen bergen Verlustrisiken. capital-ai.online/learning'}});
          must(/^[A-Za-z0-9_-]{11}$/.test(receipt.providerDeliveryId),'invalid_video_receipt');
          await vault.invoke('private_receipt',{...context,videoId:receipt.providerDeliveryId,privacyStatus:'private',verified:false});
          job={status:'UNKNOWN',video_id:receipt.providerDeliveryId};
        } else job=claim.job;
      }
      if (job?.video_id) {
        const lookup=new URL('https://www.googleapis.com/youtube/v3/videos');
        lookup.searchParams.set('part','snippet,status');lookup.searchParams.set('id',job.video_id);
        const response=await fetchImpl(lookup,{headers:{Authorization:'Bearer '+secret.accessToken},redirect:'error',signal:AbortSignal.timeout(10000)});
        const text=await response.text();must(response.ok&&text.length<32768,'video_readback_failed');
        const item=JSON.parse(text).items?.[0];
        must(item?.id===job.video_id&&item.snippet?.channelId===TARGET_CHANNEL&&item.status?.privacyStatus==='private','private_readback_mismatch');
        await vault.invoke('private_receipt',{...context,videoId:job.video_id,privacyStatus:'private',verified:true});
        json(res,200,{status:'VERIFIED_PRIVATE',channelId:TARGET_CHANNEL,videoId:job.video_id,
          privacyStatus:'private',url:'https://www.youtube.com/watch?v='+job.video_id,refreshed:secret.refreshed});
      } else json(res,job?409:200,{status:job?'UNKNOWN':'NOT_UPLOADED',channelId:TARGET_CHANNEL});
    } catch(error) {
      const allowed=['wrong_short_file','media_too_large','unsupported_media_type','wrong_channel','YOUTUBE_REAUTHORIZATION_REQUIRED','private_readback_mismatch'];
      json(res,503,{error:allowed.includes(error?.message)?error.message:'private_test_unavailable',
        retryUpload:false});
    }
    return true;
  }
  return {handle};
}
