import { readFile, rename, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { openVerificationMedia, sealVerificationReceipt, verifyVerificationMedia } from './youtube-verification-media.mjs';
const must = (ok, code) => { if (!ok) throw Error(code); };
async function json(response, code) {
  must(response.ok, code);
  const text = await response.text(); must(text.length < 65536, 'RESPONSE_TOO_LARGE');
  try { return JSON.parse(text); } catch { throw Error('INVALID_RESPONSE'); }
}
// Upload once. Never retry a lost insert response; the workflow saves a durable claim first.
export async function uploadVerification({ media, sha256, channelId, clientId, clientSecret, refreshToken,
  fetchImpl = fetch, checkpoint = async () => {} }) {
  verifyVerificationMedia(media, sha256);
  must(/^UC[A-Za-z0-9_-]{22}$/.test(channelId ?? ''), 'CHANNEL_NOT_CONFIGURED');
  for (const s of [clientId,clientSecret,refreshToken]) must(typeof s === 'string' && s.length >= 8 && s.length < 8192 && !/[\r\n]/.test(s), 'OAUTH_NOT_CONFIGURED');
  const request = (url, init = {}) => fetchImpl(url, { ...init, redirect:'error', signal:AbortSignal.timeout(180000) });
  const t = await json(await request('https://oauth2.googleapis.com/token', {method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',client_id:clientId,client_secret:clientSecret,refresh_token:refreshToken}).toString()}), 'OAUTH_REFRESH_FAILED');
  must(typeof t.access_token === 'string' && t.access_token.length > 8 && !/[\r\n]/.test(t.access_token) && t.token_type?.toLowerCase() === 'bearer', 'OAUTH_TOKEN_INVALID');
  if (t.scope) must(['youtube.readonly','youtube.upload'].every(s => t.scope.split(' ').includes('https://www.googleapis.com/auth/'+s)), 'OAUTH_SCOPES_MISSING');
  const auth = {Authorization:'Bearer '+t.access_token};
  const channels = await json(await request('https://www.googleapis.com/youtube/v3/channels?part=id&mine=true',{headers:auth}),'CHANNEL_READ_FAILED');
  must(channels.items?.length === 1 && channels.items[0].id === channelId, 'WRONG_CHANNEL');
  const metadata = {snippet:{title:'CAPITAL-AI | Google OAuth verification demo | 2026-11-07',
    description:'English Google consent and successful CAPITAL-AI channel connection, followed by earlier private upload and YouTube Studio evidence. Separate recording sessions and video IDs are labelled. youtube.readonly: channel and video readback. youtube.upload: app upload. Privacy: https://capital-ai.online/datenschutz/',categoryId:'27'},
    status:{privacyStatus:'unlisted',selfDeclaredMadeForKids:false}};
  const started = await request('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',{method:'POST',headers:{...auth,'Content-Type':'application/json','X-Upload-Content-Type':'video/mp4','X-Upload-Content-Length':String(media.length)},body:JSON.stringify(metadata)});
  must(started.ok, 'UPLOAD_SESSION_FAILED');
  const raw = started.headers.get('location'); let session;
  try { session = new URL(raw); } catch { throw Error('UPLOAD_SESSION_INVALID'); }
  must(session.origin === 'https://www.googleapis.com' && session.pathname === '/upload/youtube/v3/videos' && !session.username && !session.password && !session.hash && session.searchParams.has('upload_id'), 'UPLOAD_SESSION_INVALID');
  await checkpoint({status:'INSERT_STARTED',sha256,channelId});
  const inserted = await json(await request(session.href,{method:'PUT',headers:{...auth,'Content-Type':'video/mp4','Content-Length':String(media.length)},body:media}),'UPLOAD_OUTCOME_UNKNOWN_NO_RETRY');
  must(/^[A-Za-z0-9_-]{11}$/.test(inserted.id || ''), 'UPLOAD_OUTCOME_UNKNOWN_NO_RETRY');
  const receipt = {status:'UPLOADED_READBACK_PENDING',sha256,channelId,videoId:inserted.id,url:'https://www.youtube.com/watch?v='+inserted.id};
  await checkpoint(receipt);
  const checked = await json(await request('https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id='+inserted.id,{headers:auth}),'READBACK_FAILED_NO_RETRY');
  const item=checked.items?.[0];
  must(item?.id === inserted.id && item.snippet?.channelId === channelId, 'READBACK_BINDING_MISMATCH');
  // Persist actual visibility even if a provider restriction overrides the requested value.
  const result={...receipt,status:item.status?.privacyStatus === 'unlisted'?'VERIFIED_UNLISTED':'VISIBILITY_REVIEW_REQUIRED',privacyStatus:item.status?.privacyStatus || 'unknown',uploadStatus:item.status?.uploadStatus || 'unknown',reviewSubmitted:false};
  await checkpoint(result); return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const media = openVerificationMedia(await readFile('verification-media/demo.mp4.enc'),
      process.env.YOUTUBE_DEMO_MEDIA_KEY, process.env.DEMO_SHA256);
    if (process.argv[2] === '--validate-media') {
      console.log('YOUTUBE_DEMO_MEDIA_VERIFIED');
      process.exit(0);
    }
    const result=await uploadVerification({media,sha256:process.env.DEMO_SHA256,channelId:process.env.YOUTUBE_EXPECTED_CHANNEL_ID,
      clientId:process.env.YOUTUBE_OAUTH_CLIENT_ID,clientSecret:process.env.YOUTUBE_OAUTH_CLIENT_SECRET,refreshToken:process.env.YOUTUBE_OAUTH_REFRESH_TOKEN,
      checkpoint:async receipt=>{
        await writeFile('youtube-upload-receipt.enc.tmp',sealVerificationReceipt(receipt,process.env.YOUTUBE_DEMO_MEDIA_KEY),{mode:0o600});
        await rename('youtube-upload-receipt.enc.tmp','youtube-upload-receipt.enc');
      }});
    console.log(JSON.stringify({ status:result.status, privacyStatus:result.privacyStatus, uploadStatus:result.uploadStatus, reviewSubmitted:false }));
    if(result.status!=='VERIFIED_UNLISTED') process.exitCode=1;
  } catch(error) {
    // Provider bodies, tokens and resumable URLs must never reach logs.
    console.error('YOUTUBE_VERIFICATION_UPLOAD_STOPPED; inspect receipt, do not retry insert automatically');process.exitCode=1;
  }
}
