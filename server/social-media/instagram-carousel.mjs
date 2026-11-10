// CAPITAL_AI_INSTAGRAM_CAROUSEL_ADAPTER@1
// Server-only. No route, webhook or auto-scheduler is attached. All remote writes remain
// behind existing provider flags plus SOCIAL_INSTAGRAM_CAROUSEL_ENABLED.
import { createHash } from 'node:crypto';
import { verifySocialStoredAsset } from './asset-readback.mjs';
import { prepareSocialProviderDelivery } from './provider-adapter.mjs';

export const INSTAGRAM_CAROUSEL_ADAPTER_VERSION = 'CAPITAL_AI_INSTAGRAM_CAROUSEL_ADAPTER@1';
const SHA256 = /^[a-f0-9]{64}$/;
const ID = /^[0-9]{1,40}$/;
const MAX_JPEG_BYTES = 8 * 1024 * 1024;
const preparedPlans = new WeakSet();

function requireThat(condition, error) { if (!condition) throw new Error(error); }
function expiresAfter(value, now) { const n = Date.parse(value ?? ''); return Number.isFinite(n) && n > now; }
function equalArrays(a, b) { return Array.isArray(a) && a.length === b.length && a.every((v, i) => v === b[i]); }

function assertMediaUrl(raw, sha, env) {
  let url;
  try { url = new URL(raw); } catch { throw new Error('SOCIAL_CAROUSEL_MEDIA_URL_INVALID'); }
  const hosts = String(env?.SOCIAL_MEDIA_ASSET_HOST_ALLOWLIST ?? '')
    .split(',').map(x => x.trim().toLowerCase()).filter(x => x && !x.includes('*'));
  requireThat(url.protocol === 'https:' && !url.username && !url.password
    && !url.port && !url.search && !url.hash && hosts.includes(url.hostname.toLowerCase())
    && url.pathname.endsWith('/' + sha + '.jpg'),
  'SOCIAL_CAROUSEL_MEDIA_URL_DENIED');
  return url.href;
}

// Verify JPEG SOF dimensions and bounded bytes. A decoder check remains part of editorial QA.
function assertJpegImage(bytes) {
  requireThat(bytes instanceof Uint8Array && bytes.byteLength > 20
    && bytes.byteLength <= MAX_JPEG_BYTES
    && bytes[0] === 0xff && bytes[1] === 0xd8
    && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9,
  'SOCIAL_CAROUSEL_JPEG_REQUIRED');
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) break;
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xda || marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) break;
    const segment = (bytes[offset] << 8) | bytes[offset + 1];
    requireThat(segment >= 2 && offset + segment <= bytes.length,
      'SOCIAL_CAROUSEL_JPEG_INVALID_SEGMENT');
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      requireThat(segment >= 7, 'SOCIAL_CAROUSEL_JPEG_INVALID_FRAME');
      const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      requireThat(width === 1080 && height === 1350, 'SOCIAL_CAROUSEL_JPEG_DIMENSION_MISMATCH');
      return;
    }
    offset += segment;
  }
  throw new Error('SOCIAL_CAROUSEL_JPEG_FRAME_MISSING');
}

/**
 * Performs real immutable private-asset AND hosted-JPEG byte readback. Host bytes
 * must be supplied by a server-owned, SSRF-safe resolver. This module never fetches
 * arbitrary user URLs or accepts a caller's self-asserted sha as readback.
 *
 * A fresh exact-match durable approval, account, reservation and rights witness is
 * required for EACH JPEG, plus a single atomic carousel reservation for the group.
 */
export async function prepareInstagramCarousel({
  manifest, handoffs, media, caption, userId, accountRow,
  approvalRows, reservations, groupReservation, capability,
  loadImmutableBytes, loadRightsEvidence, loadHostedBytes, loadEditorialReview,
  env = {}, now = Date.now(),
} = {}) {
  requireThat(Array.isArray(handoffs) && handoffs.length >= 2 && handoffs.length <= 10
    && Array.isArray(media) && media.length === handoffs.length
    && Array.isArray(approvalRows) && approvalRows.length === handoffs.length
    && Array.isArray(reservations) && reservations.length === handoffs.length,
  'SOCIAL_CAROUSEL_GROUP_INVALID');
  requireThat(typeof caption === 'string' && caption.trim().length > 0 && caption.length <= 2200,
    'SOCIAL_CAROUSEL_CAPTION_INVALID');
  requireThat(typeof loadImmutableBytes === 'function'
    && typeof loadRightsEvidence === 'function'
    && typeof loadHostedBytes === 'function'
    && typeof loadEditorialReview === 'function', 'SOCIAL_CAROUSEL_PRIVATE_READBACK_REQUIRED');
  requireThat(accountRow?.platform === 'instagram'
    && accountRow?.scopes?.some(x => ['instagram_content_publish', 'instagram_business_content_publish'].includes(x)),
  'SOCIAL_CAROUSEL_INSTAGRAM_SCOPE_REQUIRED');
  const externalAccountId = String(accountRow.external_account_id ?? '');
  requireThat(ID.test(externalAccountId), 'SOCIAL_CAROUSEL_PROVIDER_ACCOUNT_MISMATCH');
  requireThat(manifest?.publicationAuthority === 'SOCIAL_MEDIA_ENGINE_ONLY',
    'SOCIAL_CAROUSEL_MANIFEST_AUTHORITY_REQUIRED');

  const seen = new Set();
  const items = [];
  let accountId;
  for (let i = 0; i < handoffs.length; i++) {
    const handoff = handoffs[i], item = media[i];
    requireThat(handoff?.channel === 'INSTAGRAM'
      && typeof handoff.assetId === 'string' && !seen.has(handoff.assetId),
    'SOCIAL_CAROUSEL_ASSET_ORDER_INVALID');
    seen.add(handoff.assetId);
    const asset = manifest.assets?.find(x => x.assetId === handoff.assetId);
    requireThat(asset?.kind === 'IMAGE' && asset?.mimeType === 'image/jpeg'
      && asset.contentId === manifest.contentId && SHA256.test(asset.sha256),
    'SOCIAL_CAROUSEL_JPEG_MANIFEST_REQUIRED');
    requireThat(item?.assetId === handoff.assetId
      && typeof item.altText === 'string' && item.altText.trim().length >= 15
      && item.altText.length <= 1000, 'SOCIAL_CAROUSEL_ALT_TEXT_REQUIRED');
    const mediaUrl = assertMediaUrl(item.mediaUrl, asset.sha256, env);
    const verifiedAsset = await verifySocialStoredAsset({
      manifest, handoff, loadImmutableBytes, loadRightsEvidence, maxBytes: MAX_JPEG_BYTES,
    });
    const delivery = prepareSocialProviderDelivery({
      manifest, handoff, userId, accountRow, approvalRow: approvalRows[i],
      verifiedAsset, reservation: reservations[i], capability, now,
    });
    requireThat(accountId === undefined || delivery.accountId === accountId,
      'SOCIAL_CAROUSEL_ACCOUNT_MISMATCH');
    accountId = delivery.accountId;
    let hosted;
    try {
      hosted = await loadHostedBytes({
        mediaUrl, assetId: asset.assetId, expectedSha256: asset.sha256,
        contentId: manifest.contentId, sourceSha: manifest.sourceSha,
      });
    } catch { throw new Error('SOCIAL_CAROUSEL_HOSTED_READBACK_UNAVAILABLE'); }
    requireThat(hosted?.mediaUrl === mediaUrl && hosted.bytes instanceof Uint8Array,
      'SOCIAL_CAROUSEL_HOSTED_READBACK_MISMATCH');
    requireThat(createHash('sha256').update(hosted.bytes).digest('hex') === asset.sha256,
      'SOCIAL_CAROUSEL_HOSTED_JPEG_HASH_MISMATCH');
    assertJpegImage(hosted.bytes);
    items.push(Object.freeze({
      assetId: asset.assetId, sha256: asset.sha256,
      mediaUrl, altText: item.altText.trim(), approvalRef: handoff.approvalRef,
      reservationId: delivery.reservationId,
    }));
  }
  // A changed caption or individual alt text invalidates the carousel approval and CAS key.
  // The reviewer must be a trusted durable server-side source, not the browser/manifest.
  const digest = value => createHash('sha256').update(value).digest('hex');
  const editorialFingerprint = digest(JSON.stringify([
    manifest.campaignId, manifest.contentId, manifest.sourceSha,
    digest(caption.trim()), items.map(x => [x.sha256, digest(x.altText)]),
  ]));
  let editorial;
  try {
    editorial = await loadEditorialReview({
      userId, campaignId: manifest.campaignId, contentId: manifest.contentId,
      sourceSha: manifest.sourceSha, editorialFingerprint,
    });
  } catch { throw new Error('SOCIAL_CAROUSEL_EDITORIAL_READBACK_UNAVAILABLE'); }
  requireThat(editorial?.status === 'APPROVED' && editorial.userId === userId
    && editorial.contentId === manifest.contentId && editorial.sourceSha === manifest.sourceSha
    && editorial.editorialFingerprint === editorialFingerprint
    && typeof editorial.evidenceRef === 'string' && editorial.evidenceRef.length > 0,
  'SOCIAL_CAROUSEL_EDITORIAL_APPROVAL_REQUIRED');
  const deliveryKey = [manifest.campaignId, manifest.contentId, 'INSTAGRAM',
    'CAROUSEL', editorialFingerprint].join(':');
  requireThat(groupReservation?.user_id === userId
    && groupReservation?.account_id === accountId
    && groupReservation?.delivery_key === deliveryKey
    && groupReservation?.status === 'CLAIMED'
    && expiresAfter(groupReservation.expires_at, now)
    && typeof groupReservation.id === 'string' && groupReservation.id.length > 0
    && equalArrays(groupReservation.asset_sha256s, items.map(x => x.sha256))
    && equalArrays(groupReservation.approval_refs, items.map(x => x.approvalRef)),
  'SOCIAL_CAROUSEL_ATOMIC_GROUP_RESERVATION_REQUIRED');

  const plan = Object.freeze({
    contractVersion: INSTAGRAM_CAROUSEL_ADAPTER_VERSION,
    userId, accountId, externalAccountId, deliveryKey, reservationId: groupReservation.id,
    contentId: manifest.contentId, campaignId: manifest.campaignId,
    sourceSha: manifest.sourceSha, caption: caption.trim(),
    editorialFingerprint, editorialEvidenceRef: editorial.evidenceRef,
    items: Object.freeze(items),
  });
  preparedPlans.add(plan);
  return plan;
}

/**
 * Provider transport is deliberately detached from all HTTP routes. Exactly one
 * successful durable CLAIMED->SUBMITTING CAS is required before the first POST.
 * Every attempted submission yields UNKNOWN until an independent Meta permalink
 * readback (existing provider readback/bridge). No automatic retry.
 */
export function createInstagramCarouselAdapter({
  env = process.env, fetchImpl = fetch,
  tokenResolver, beginAttempt, noteUnknown,
} = {}) {
  async function submit(plan) {
    requireThat(env?.SOCIAL_PROVIDER_PUBLISH_ENABLED === 'true'
      && env?.SOCIAL_INSTAGRAM_PUBLISH_ENABLED === 'true'
      && env?.SOCIAL_INSTAGRAM_CAROUSEL_ENABLED === 'true',
    'SOCIAL_CAROUSEL_PUBLISH_DISABLED');
    requireThat(preparedPlans.has(plan) && plan.contractVersion === INSTAGRAM_CAROUSEL_ADAPTER_VERSION,
      'SOCIAL_CAROUSEL_PREPARED_PLAN_REQUIRED');
    requireThat(typeof fetchImpl === 'function' && typeof tokenResolver === 'function'
      && typeof beginAttempt === 'function' && typeof noteUnknown === 'function',
    'SOCIAL_CAROUSEL_TRUSTED_RUNTIME_REQUIRED');
    const version = String(env.SOCIAL_META_GRAPH_API_VERSION ?? '');
    requireThat(/^v\d+\.\d+$/.test(version), 'SOCIAL_CAROUSEL_META_VERSION_REQUIRED');
    const credentials = await tokenResolver({
      userId: plan.userId, accountId: plan.accountId, channel: 'INSTAGRAM', platform: 'instagram',
    });
    requireThat(credentials?.userId === plan.userId
      && credentials?.accountId === plan.accountId
      && credentials?.channel === 'INSTAGRAM'
      && credentials?.platform === 'instagram'
      && credentials.externalAccountId === plan.externalAccountId
      && typeof credentials.accessToken === 'string' && credentials.accessToken.length >= 8,
    'SOCIAL_CAROUSEL_TOKEN_TENANT_MISMATCH');
    requireThat(String(env.SOCIAL_INSTAGRAM_ACCOUNT_ID ?? '') === plan.externalAccountId,
      'SOCIAL_CAROUSEL_PROVIDER_ACCOUNT_MISMATCH');
    const claimed = await beginAttempt({
      userId: plan.userId, accountId: plan.accountId,
      reservationId: plan.reservationId, deliveryKey: plan.deliveryKey,
    });
    requireThat(claimed?.id === plan.reservationId
      && claimed.user_id === plan.userId && claimed.account_id === plan.accountId
      && claimed.delivery_key === plan.deliveryKey && claimed.status === 'SUBMITTING',
    'SOCIAL_CAROUSEL_ATOMIC_CLAIM_REQUIRED');
    preparedPlans.delete(plan); // Process-local anti-replay in addition to durable CAS.

    const token = credentials.accessToken;
    const endpoint = 'https://graph.facebook.com/' + version + '/'
      + encodeURIComponent(plan.externalAccountId);
    let providerAttempted = false;
    let containerId = null;
    let stage = 'child';
    let unknownPersistenceAttempted = false;
    async function request(path, method = 'GET', body = null) {
      providerAttempted = true;
      let response;
      try {
        response = await fetchImpl(path, {
          method, redirect: 'error', signal: AbortSignal.timeout(20_000),
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          ...(body === null ? {} : { body: JSON.stringify(body) }),
        });
      } catch { throw new Error('SOCIAL_CAROUSEL_NETWORK_AMBIGUOUS'); }
      const raw = await response.text();
      requireThat(raw.length <= 32768, 'SOCIAL_CAROUSEL_RESPONSE_TOO_LARGE');
      let payload;
      try { payload = JSON.parse(raw); } catch { throw new Error('SOCIAL_CAROUSEL_RESPONSE_INVALID_JSON'); }
      requireThat(response.ok, 'SOCIAL_CAROUSEL_PROVIDER_REJECTED');
      return payload;
    }
    async function note(stageName, lastId) {
      unknownPersistenceAttempted = true;
      await noteUnknown({
        userId: plan.userId, accountId: plan.accountId,
        reservationId: plan.reservationId, deliveryKey: plan.deliveryKey,
        stage: stageName, providerDeliveryId: lastId,
        status: 'UNKNOWN',
      });
      return Object.freeze({ deliveryState: 'UNKNOWN', stage: stageName,
        providerDeliveryId: lastId, deliveryKey: plan.deliveryKey });
    }
    try {
      const children = [];
      for (const item of plan.items) {
        stage = 'child';
        const created = await request(endpoint + '/media', 'POST', {
          image_url: item.mediaUrl, is_carousel_item: true, alt_text: item.altText,
        });
        requireThat(ID.test(String(created?.id ?? '')), 'SOCIAL_CAROUSEL_CHILD_ID_INVALID');
        containerId = String(created.id);
        const status = await request('https://graph.facebook.com/' + version + '/' + containerId + '?fields=status_code');
        if (status?.status_code !== 'FINISHED') return await note('CHILD_NOT_READY', containerId);
        children.push(containerId);
      }
      stage = 'parent';
      const parent = await request(endpoint + '/media', 'POST', {
        media_type: 'CAROUSEL', children: children.join(','), caption: plan.caption,
      });
      requireThat(ID.test(String(parent?.id ?? '')), 'SOCIAL_CAROUSEL_PARENT_ID_INVALID');
      containerId = String(parent.id);
      const status = await request('https://graph.facebook.com/' + version + '/' + containerId + '?fields=status_code');
      if (status?.status_code !== 'FINISHED') return await note('PARENT_NOT_READY', containerId);
      stage = 'publish';
      const result = await request(endpoint + '/media_publish', 'POST', { creation_id: containerId });
      requireThat(ID.test(String(result?.id ?? '')), 'SOCIAL_CAROUSEL_PROVIDER_RECEIPT_INVALID');
      return await note('SUBMITTED_AWAITING_READBACK', String(result.id));
    } catch {
      if (unknownPersistenceAttempted) throw new Error('SOCIAL_CAROUSEL_UNKNOWN_PERSIST_FAILED');
      if (providerAttempted) return await note('AMBIGUOUS_' + stage.toUpperCase(), containerId);
      throw new Error('SOCIAL_CAROUSEL_SUBMISSION_ABORTED');
    }
  }
  return Object.freeze({ submit });
}
