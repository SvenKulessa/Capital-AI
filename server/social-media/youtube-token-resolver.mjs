import { createDecipheriv } from 'node:crypto';
import { createSocialXEdgeClient, socialXEdgeMode } from './x-edge-client.mjs';
import { youtubeOAuthConfig, sealYouTubeToken } from './youtube-oauth-exchange.mjs';

const inflight = new Map();
const scopes = ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/youtube.upload'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function must(ok, code) { if (!ok) throw Error(code); }
export function unsealYouTubeToken(value, key, userId, kind) {
  must(typeof value === 'string' && value.length < 12000, 'YOUTUBE_CIPHER_INVALID');
  const [version, iv, tag, cipher, extra] = value.split('.');
  must(version === 'v1' && !extra && /^[A-Za-z0-9_-]{16}$/.test(iv || '')
    && /^[A-Za-z0-9_-]{22}$/.test(tag || '') && /^[A-Za-z0-9_-]+$/.test(cipher || ''), 'YOUTUBE_CIPHER_INVALID');
  const d = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  d.setAAD(Buffer.from(JSON.stringify(['capital-social-youtube-v1', userId, kind])));
  d.setAuthTag(Buffer.from(tag, 'base64url'));
  const token = Buffer.concat([d.update(Buffer.from(cipher, 'base64url')), d.final()]).toString('utf8');
  must(token.length >= 10 && token.length <= 8192, 'YOUTUBE_TOKEN_INVALID');
  return token;
}
async function decode(response) {
  const text = await response.text(); must(text.length <= 32768, 'YOUTUBE_RESPONSE_LIMIT');
  return JSON.parse(text);
}
export function createYouTubeVaultAccess({ env = process.env, fetchImpl = fetch, userAccessToken } = {}) {
  const cfg = youtubeOAuthConfig(env);
  if (socialXEdgeMode(env)) {
    const edge = createSocialXEdgeClient({ env, fetchImpl, userAccessToken, channel: 'YOUTUBE' });
    return { invoke: edge.invoke };
  }
  const headers = { apikey: cfg.serviceKey, 'Content-Type': 'application/json', Accept: 'application/json',
    ...(cfg.serviceKey.startsWith('eyJ') ? { Authorization: 'Bearer ' + cfg.serviceKey } : {}) };
  async function request(path, method, body, prefer) {
    const res = await fetchImpl(cfg.supabaseOrigin + path, { method, headers: { ...headers, ...(prefer ? { Prefer: prefer } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'error', signal: AbortSignal.timeout(8000) });
    return { res, data: await decode(res) };
  }
  return { async invoke(operation, body) {
    must(uuid.test(body.userId), 'YOUTUBE_OWNER_REQUIRED');
    const accountPath = '/rest/v1/social_media_accounts?user_id=eq.' + body.userId + '&platform=eq.youtube';
    if (operation === 'credentials') {
      const { res, data } = await request(accountPath + '&select=id,user_id,platform,status,external_account_id,handle,scopes,access_token_encrypted,refresh_token_encrypted,token_expires_at&limit=1', 'GET');
      must(res.ok && Array.isArray(data) && data.length === 1, 'YOUTUBE_ACCOUNT_UNAVAILABLE'); return data[0];
    }
    if (operation === 'refresh') {
      const { res, data } = await request(accountPath + '&id=eq.' + body.accountId
        + '&status=eq.connected&external_account_id=eq.' + body.channelId
        + '&token_expires_at=eq.' + encodeURIComponent(body.previousExpiresAt), 'PATCH', body.tokens, 'return=representation');
      must(res.ok, 'YOUTUBE_REFRESH_PERSIST_FAILED'); return { updated: Array.isArray(data) && data.length === 1 };
    }
    if (['private_claim','private_status','private_receipt'].includes(operation)) {
      const base = '/rest/v1/youtube_private_upload_jobs';
      const filter = '?id=eq.' + body.jobId + '&user_id=eq.' + body.userId + '&account_id=eq.' + body.accountId;
      if (operation === 'private_claim') {
        const { res,data } = await request(base,'POST',{ id:body.jobId,user_id:body.userId,account_id:body.accountId,
          channel_id:body.channelId,asset_sha256:body.assetSha256,status:'UNKNOWN' },'return=representation');
        if (res.ok) { must(Array.isArray(data) && data[0]?.id===body.jobId && data[0]?.user_id===body.userId && data[0]?.account_id===body.accountId
            && data[0]?.channel_id===body.channelId && data[0]?.asset_sha256===body.assetSha256,'YOUTUBE_CLAIM_INVALID'); return { claimed:true }; }
        must(res.status===409,'YOUTUBE_CLAIM_FAILED');
      }
      if (operation === 'private_receipt') {
        const { res,data } = await request(base+filter,'PATCH',{ video_id:body.videoId,
          status:body.verified===true?'VERIFIED_PRIVATE':'UNKNOWN',...(body.verified===true?{ verified_at:new Date().toISOString() }:{}) },'return=representation');
        must(res.ok && data?.length===1,'YOUTUBE_RECEIPT_FAILED'); return { saved:true };
      }
      const {res,data}=await request(base+filter+'&select=id,channel_id,asset_sha256,status,video_id,verified_at','GET');
      must(res.ok && Array.isArray(data) && data.length<=1,'YOUTUBE_JOB_UNAVAILABLE');return {claimed:false,job:data[0]||null};
    }
    throw Error('YOUTUBE_VAULT_OPERATION_UNSUPPORTED');
  } };
}
export function createYouTubeTokenResolver({ env = process.env, fetchImpl = fetch, vault = null, now = Date.now } = {}) {
  return async ({ userId, userAccessToken }) => {
    must(uuid.test(userId || ''), 'YOUTUBE_OWNER_REQUIRED');
    const cfg = youtubeOAuthConfig(env);
    const active = vault || createYouTubeVaultAccess({ env, fetchImpl, userAccessToken });
    const lockKey = cfg.supabaseOrigin + ':' + cfg.clientId + ':' + userId;
    if (inflight.has(lockKey)) return inflight.get(lockKey);
    const work = (async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const row = await active.invoke('credentials', { userId });
        must(row?.user_id === userId && row.platform === 'youtube' && row.status === 'connected'
          && /^UC[A-Za-z0-9_-]{22}$/.test(row.external_account_id || '') && uuid.test(row.id || '')
          && scopes.every(s => row.scopes?.includes(s)), 'YOUTUBE_ACCOUNT_BINDING_INVALID');
        must(!env.SOCIAL_YOUTUBE_EXPECTED_CHANNEL_ID || row.external_account_id === env.SOCIAL_YOUTUBE_EXPECTED_CHANNEL_ID,
          'YOUTUBE_WRONG_CHANNEL');
        if (Date.parse(row.token_expires_at) > now() + 300000) return { userId, accountId: row.id,
          channelId: row.external_account_id, accessToken: unsealYouTubeToken(row.access_token_encrypted, cfg.key, userId, 'access'),
          expiresAt: row.token_expires_at, refreshed: false };
        const refreshToken = unsealYouTubeToken(row.refresh_token_encrypted, cfg.key, userId, 'refresh');
        const res = await fetchImpl('https://oauth2.googleapis.com/token', { method: 'POST', redirect: 'error',
          signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken,
            client_id: cfg.clientId, client_secret: cfg.clientSecret }).toString() });
        const token = await decode(res);
        if (token.error === 'invalid_grant') throw Error('YOUTUBE_REAUTHORIZATION_REQUIRED');
        must(res.ok && token.token_type?.toLowerCase() === 'bearer' && typeof token.access_token === 'string'
          && Number.isSafeInteger(token.expires_in) && token.expires_in > 300 && token.expires_in <= 86400,
          'YOUTUBE_REFRESH_REJECTED');
        must(!token.scope || scopes.every(s => token.scope.split(' ').includes(s)), 'YOUTUBE_REFRESH_SCOPES_MISSING');
        const expiresAt = new Date(now() + token.expires_in * 1000).toISOString();
        const changed = { access_token_encrypted: sealYouTubeToken(token.access_token, cfg.key, { userId, kind: 'access' }),
          refresh_token_encrypted: token.refresh_token
            ? sealYouTubeToken(token.refresh_token, cfg.key, { userId, kind: 'refresh' }) : row.refresh_token_encrypted,
          token_expires_at: expiresAt };
        const saved = await active.invoke('refresh', { userId, accountId: row.id,
          previousExpiresAt: row.token_expires_at, channelId: row.external_account_id, tokens: changed });
        if (saved?.updated) return { userId, accountId: row.id, channelId: row.external_account_id,
          accessToken: token.access_token, expiresAt, refreshed: true };
      }
      throw Error('YOUTUBE_REFRESH_CONFLICT');
    })();
    inflight.set(lockKey, work);
    try { return await work; } finally { if (inflight.get(lockKey) === work) inflight.delete(lockKey); }
  };
}
