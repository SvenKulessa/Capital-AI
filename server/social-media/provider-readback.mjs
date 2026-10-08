// CAPITAL_AI_SOCIAL_PROVIDER_READBACK@1
// Readback-only transport: no POST to a publishing endpoint, no upload, no retry.
import { providerPublicationUrlAllowed } from './provider-adapter.mjs';

const SHA = /^[a-zA-Z0-9_-]{1,160}$/;
const POST_ID = /^[0-9]{1,30}$/;
const HANDLE = /^[a-zA-Z0-9._]{2,30}$/;
function assert(ok, code) { if (!ok) throw new Error(code); }
async function json(res) {
  assert(res?.ok, 'SOCIAL_READBACK_HTTP_FAILED');
  const raw = await res.text();
  assert(raw.length <= 32_000, 'SOCIAL_READBACK_RESPONSE_TOO_LARGE');
  try { return JSON.parse(raw); }
  catch { throw new Error('SOCIAL_READBACK_INVALID_JSON'); }
}

/** No publication promotion based on transport status or request acceptance. */
export function normalizeYoutubeReadback({ deliveryKey, providerId, accountChannelId, payload, evidenceRef }) {
  assert(SHA.test(providerId) && typeof deliveryKey === 'string' && deliveryKey.length > 0,
    'SOCIAL_READBACK_INVALID_ID');
  assert(typeof accountChannelId === 'string' && accountChannelId.length >= 8
    && accountChannelId.length <= 200, 'SOCIAL_READBACK_ACCOUNT_ID_REQUIRED');
  const item = Array.isArray(payload?.items)
    ? payload.items.find(x => x?.id === providerId && x?.snippet?.channelId === accountChannelId)
    : null;
  const state = item?.status;
  const publishedUrl = 'https://www.youtube.com/watch?v=' + encodeURIComponent(providerId);
  if (state?.privacyStatus === 'public' && state?.uploadStatus === 'processed'
    && providerPublicationUrlAllowed('YOUTUBE', publishedUrl)
    && typeof evidenceRef === 'string' && evidenceRef.length > 0) {
    return Object.freeze({ channel: 'YOUTUBE', deliveryKey,
      status: 'VERIFIED_PUBLISHED', providerDeliveryId: providerId,
      publishedUrl, evidenceRef, verifiedBy: 'PROVIDER_READBACK' });
  }
  if (state?.uploadStatus === 'failed' || state?.uploadStatus === 'rejected') {
    return Object.freeze({ channel: 'YOUTUBE', deliveryKey,
      status: 'VERIFIED_FAILED', providerDeliveryId: providerId,
      evidenceRef, verifiedBy: 'PROVIDER_READBACK' });
  }
  return Object.freeze({ channel: 'YOUTUBE', deliveryKey,
    status: 'UNKNOWN', providerDeliveryId: providerId });
}

/** TikTok status endpoint is separate from direct-post initialization. */
export function normalizeTiktokReadback({
  deliveryKey, publishId, accountHandle, payload, evidenceRef,
}) {
  assert(typeof publishId === 'string' && publishId.length >= 1 && publishId.length <= 200
    && deliveryKey, 'SOCIAL_READBACK_INVALID_ID');
  assert(payload?.error?.code === 'ok', 'SOCIAL_READBACK_PROVIDER_ERROR');
  const data = payload?.data;
  if (data?.status === 'FAILED') {
    return Object.freeze({ channel: 'TIKTOK', deliveryKey, status: 'VERIFIED_FAILED',
      providerDeliveryId: publishId, evidenceRef, verifiedBy: 'PROVIDER_READBACK' });
  }
  const ids = data?.publicaly_available_post_id;
  const postId = Array.isArray(ids) && ids.length === 1 ? String(ids[0]) : '';
  const handle = String(accountHandle || '').replace(/^@/, '');
  if (data?.status === 'PUBLISH_COMPLETE' && POST_ID.test(postId) && HANDLE.test(handle)
    && typeof evidenceRef === 'string' && evidenceRef.length > 0) {
    const publishedUrl = 'https://www.tiktok.com/@' + handle + '/video/' + postId;
    if (providerPublicationUrlAllowed('TIKTOK', publishedUrl)) {
      return Object.freeze({ channel: 'TIKTOK', deliveryKey,
        status: 'VERIFIED_PUBLISHED', providerDeliveryId: postId,
        publishedUrl, evidenceRef, verifiedBy: 'PROVIDER_READBACK' });
    }
  }
  return Object.freeze({ channel: 'TIKTOK', deliveryKey,
    status: 'UNKNOWN', providerDeliveryId: publishId });
}

/** Deliberately static destinations, bounded replies, no redirect following.
 * Disabled until trusted operator approves quota/cost and provider access.
 */
export function createSocialProviderReadbackTransport({
  env = process.env, fetchImpl = fetch,
} = {}) {
  async function request(url, init) {
    assert(env?.SOCIAL_PROVIDER_READBACK_ENABLED === 'true',
      'SOCIAL_READBACK_DISABLED');
    assert(typeof init.token === 'string' && init.token.length > 0,
      'SOCIAL_READBACK_TOKEN_REQUIRED');
    const req = {
      method: init.method, redirect: 'error',
      headers: { Authorization: 'Bearer ' + init.token, Accept: 'application/json' },
      signal: AbortSignal.timeout(7000),
    };
    if (init.body) {
      req.headers['Content-Type'] = 'application/json; charset=UTF-8';
      req.body = JSON.stringify(init.body);
    }
    let res;
    try { res = await fetchImpl(url, req); }
    catch { throw new Error('SOCIAL_READBACK_NETWORK_UNKNOWN'); }
    return json(res);
  }
  async function youtube({ deliveryKey, providerId, accountChannelId, token, evidenceRef }) {
    assert(SHA.test(providerId), 'SOCIAL_READBACK_INVALID_ID');
    assert(typeof accountChannelId === 'string' && accountChannelId.length >= 8
      && accountChannelId.length <= 200, 'SOCIAL_READBACK_ACCOUNT_ID_REQUIRED');
    const endpoint = new URL('https://www.googleapis.com/youtube/v3/videos');
    endpoint.search = new URLSearchParams({ part: 'snippet,status', id: providerId }).toString();
    const payload = await request(endpoint, { method: 'GET', token });
    return normalizeYoutubeReadback({ deliveryKey, providerId, accountChannelId, payload, evidenceRef });
  }
  async function tiktok({ deliveryKey, publishId, accountHandle, token, evidenceRef }) {
    assert(typeof publishId === 'string' && publishId.length > 0 && publishId.length <= 200,
      'SOCIAL_READBACK_INVALID_ID');
    const payload = await request('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
      method: 'POST', body: { publish_id: publishId }, token,
    });
    return normalizeTiktokReadback({ deliveryKey, publishId, accountHandle, payload, evidenceRef });
  }
  return Object.freeze({ youtube, tiktok });
}
