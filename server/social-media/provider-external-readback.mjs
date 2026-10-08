// CAPITAL_AI_SOCIAL_EXTERNAL_READBACK@1
// Provider status normalization only; not a posting API. Meta network disabled.
import { providerPublicationUrlAllowed } from './provider-adapter.mjs';

const numericId = value => typeof value === 'string' && /^[0-9]{1,32}$/.test(value);
const handle = value => typeof value === 'string' && /^[A-Za-z0-9_]{1,15}$/.test(value);
const nonempty = v => typeof v === 'string' && v.length > 0 && v.length <= 512;
const unknown = (channel, deliveryKey) => Object.freeze({ channel, deliveryKey, status: 'UNKNOWN' });
function published(channel, deliveryKey, id, url, evidenceRef) {
  if (!nonempty(evidenceRef) || !providerPublicationUrlAllowed(channel, url)) return unknown(channel, deliveryKey);
  return Object.freeze({ channel, deliveryKey, status: 'VERIFIED_PUBLISHED',
    providerDeliveryId: id, publishedUrl: url, evidenceRef, verifiedBy: 'PROVIDER_READBACK' });
}

export function normalizeXPostReadback({
  deliveryKey, postId, accountUserId, accountHandle, payload, evidenceRef,
}) {
  if (!numericId(postId) || !numericId(accountUserId) || !handle(accountHandle)) return unknown('X', deliveryKey);
  if (payload?.data?.id !== postId || payload?.data?.author_id !== accountUserId
    || Array.isArray(payload?.errors) && payload.errors.length) return unknown('X', deliveryKey);
  return published('X', deliveryKey, postId,
    'https://x.com/' + accountHandle + '/status/' + postId, evidenceRef);
}

export function normalizeInstagramMediaReadback({
  deliveryKey, mediaId, accountId, payload, evidenceRef,
}) {
  // A container with status_code=FINISHED is merely READY FOR PUBLISH, not published.
  if (!numericId(mediaId) || !numericId(accountId) || payload?.id !== mediaId
    || payload?.owner?.id !== accountId || !nonempty(payload?.permalink)) {
    return unknown('INSTAGRAM', deliveryKey);
  }
  return published('INSTAGRAM', deliveryKey, mediaId, payload.permalink, evidenceRef);
}

export function normalizeFacebookPageReadback({
  deliveryKey, postId, pageId, payload, evidenceRef,
}) {
  if (!nonempty(postId) || !numericId(pageId) || payload?.id !== postId
    || payload?.from?.id !== pageId || payload?.is_published !== true
    || !nonempty(payload?.permalink_url)) {
    return unknown('FACEBOOK', deliveryKey);
  }
  return published('FACEBOOK', deliveryKey, postId, payload.permalink_url, evidenceRef);
}

// X Post Lookup may be billable. Two separate server-only switches are required.
// No POST and no Meta Graph calls are implemented here.
export function createXReadbackTransport({ env = process.env, fetchImpl = fetch } = {}) {
  async function lookup({ deliveryKey, postId, accountUserId, accountHandle,
    token, evidenceRef }) {
    if (env.SOCIAL_PROVIDER_READBACK_ENABLED !== 'true'
      || env.SOCIAL_X_PAID_READBACK_APPROVED !== 'true') {
      throw new Error('SOCIAL_X_COST_APPROVAL_REQUIRED');
    }
    if (!numericId(postId) || !numericId(accountUserId) || !handle(accountHandle)
      || typeof token !== 'string' || !token.length) {
      throw new Error('SOCIAL_X_INVALID_READBACK_IDENTITY');
    }
    const url = new URL('https://api.x.com/2/tweets/' + postId);
    url.searchParams.set('tweet.fields', 'author_id');
    let response;
    try {
      response = await fetchImpl(url, { method: 'GET', redirect: 'error',
        headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
        signal: AbortSignal.timeout(7000) });
    } catch { throw new Error('SOCIAL_X_NETWORK_UNKNOWN'); }
    if (!response.ok) throw new Error('SOCIAL_X_READBACK_UNAVAILABLE');
    const body = await response.text();
    if (body.length > 32_000) throw new Error('SOCIAL_X_RESPONSE_TOO_LARGE');
    let payload;
    try { payload = JSON.parse(body); } catch { throw new Error('SOCIAL_X_INVALID_JSON'); }
    return normalizeXPostReadback({
      deliveryKey, postId, accountUserId, accountHandle, payload, evidenceRef,
    });
  }
  return Object.freeze({ lookup });
}
