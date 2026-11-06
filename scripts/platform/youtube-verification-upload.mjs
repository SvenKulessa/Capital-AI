import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
export const CHANNEL = 'UCqaBNJwcfu2cZL3GgG9TLgA';
const must = (ok, code) => { if (!ok) throw Error(code); };
async function json(response, code) {
  must(response.ok, code);
  const text = await response.text(); must(text.length < 65536, 'RESPONSE_TOO_LARGE');
  try { return JSON.parse(text); } catch { throw Error('INVALID_RESPONSE'); }
}
// Upload once. Never retry a lost insert response; the workflow saves a durable claim first.
export async function uploadVerification({ media, sha256, clientId, clientSecret, refreshToken,
  fetchImpl = fetch, checkpoint = async () => {} }) {
  must(Buffer.isBuffer(media) && media.length > 0 && media.length <= 100 * 1024 * 1024, 'MEDIA_LIMIT');
  must(/^[a-f0-9]{64}$/.test(sha256 || '') && createHash('sha256').update(media).digest('hex') === sha256, 'HASH_MISMATCH');
  must(media.subarray(4,8).toString() === 'ftyp', 'MP4_REQUIRED');
  for (const s of [clientId,clientSecret,refreshToken]) must(typeof s === 'string' && s.length >= 8 && s.length < 8192 && !/[\r\n]/.test(s), 'OAUTH_NOT_CONFIGURED');
  const request = (url, init = {}) => fetchImpl(url, { ...init, redirect:'error', signal:AbortSignal.timeout(180000) });
  const t = await json(await request('https://oauth2.googleapis.com/token', {method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',client_id:clientId,client_secret:clientSecret,refresh_token:refreshToken}).toString()}), 'OAUTH_REFRESH_FAILED');
  must(typeof t.access_token === 'string' && t.access_token.length > 8 && !/[\r\n]/.test(t.access_token) && t.token_type?.toLowerCase() === 'bearer', 'OAUTH_TOKEN_INVALID');
  if (t.scope) must(['youtube.readonly','youtube.upload'].every(s => t.scope.split(' ').includes('https://www.googleapis.com/auth/'+s)), 'OAUTH_SCOPES_MISSING');
  const auth = {Authorization:'Bearer '+t.access_token};
  const channels = await json(await request('https://www.googleapis.com/youtube/v3/channels?part=id&mine=true',{headers:auth}),'CHANNEL_READ_FAILED');
  must(channels.items?.length === 1 && channels.items[0].id === CHANNEL, 'WRONG_CHANNEL');
  const metadata = {snippet:{title:'CAPITAL-AI | Google OAuth verification demo | 2026-11-06',
    description:'Edited historical and current screen recordings. Separate sessions and video IDs are explicitly labelled. Historical consent UI is German. youtube.readonly: channel/video readback; youtube.upload: historical app upload. Privacy: https://capital-ai.online/datenschutz',categoryId:'27'},
    status:{privacyStatus:'unlisted',selfDeclaredMadeForKids:false}};
  const started = await request('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',{method:'POST',headers:{...auth,'Content-Type':'application/json','X-Upload-Content-Type':'video/mp4','X-Upload-Content-Length':String(media.length)},body:JSON.stringify(metadata)});
  must(started.ok, 'UPLOAD_SESSION_FAILED');
  const raw = started.headers.get('location'); let session;
  try { session = new URL(raw); } catch { throw Error('UPLOAD_SESSION_INVALID'); }
  must(session.origin === 'https://www.googleapis.com' && session.pathname === '/upload/youtube/v3/videos' && !session.username && !session.password && !session.hash && session.searchParams.has('upload_id'), 'UPLOAD_SESSION_INVALID');
  await checkpoint({status:'INSERT_STARTED',sha256,channelId:CHANNEL});
  const inserted = await json(await request(session.href,{method:'PUT',headers:{...auth,'Content-Type':'video/mp4','Content-Length':String(media.length)},body:media}),'UPLOAD_OUTCOME_UNKNOWN_NO_RETRY');
  must(/^[A-Za-z0-9_-]{11}$/.test(inserted.id || ''), 'UPLOAD_OUTCOME_UNKNOWN_NO_RETRY');
  const receipt = {status:'UPLOADED_READBACK_PENDING',sha256,channelId:CHANNEL,videoId:inserted.id,url:'https://www.youtube.com/watch?v='+inserted.id};
  await checkpoint(receipt);
  const checked = await json(await request('https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id='+inserted.id,{headers:auth}),'READBACK_FAILED_NO_RETRY');
  const item=checked.items?.[0];
  must(item?.id === inserted.id && item.snippet?.channelId === CHANNEL, 'READBACK_BINDING_MISMATCH');
  // Persist actual visibility even if a provider restriction overrides the requested value.
  const result={...receipt,status:item.status?.privacyStatus === 'unlisted'?'VERIFIED_UNLISTED':'VISIBILITY_REVIEW_REQUIRED',privacyStatus:item.status?.privacyStatus || 'unknown',uploadStatus:item.status?.uploadStatus || 'unknown',reviewSubmitted:false};
  await checkpoint(result); return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result=await uploadVerification({media:await readFile('verification-media/demo.mp4'),sha256:process.env.DEMO_SHA256,
      clientId:process.env.YOUTUBE_OAUTH_CLIENT_ID,clientSecret:process.env.YOUTUBE_OAUTH_CLIENT_SECRET,refreshToken:process.env.YOUTUBE_OAUTH_REFRESH_TOKEN,
      checkpoint:r=>writeFile('youtube-upload-receipt.json',JSON.stringify(r,null,2),{mode:0o600})});
    console.log(JSON.stringify(result));
    if(result.status!=='VERIFIED_UNLISTED') process.exitCode=1;
  } catch(error) {
    // Provider bodies, tokens and resumable URLs must never reach logs.
    console.error('YOUTUBE_VERIFICATION_UPLOAD_STOPPED; inspect receipt, do not retry insert automatically');process.exitCode=1;
  }
}
