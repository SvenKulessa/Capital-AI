// CAPITAL_AI_CONTENT_SOCIAL_PROVIDER_BRIDGE@1
// Server-only, fail-closed bridge. Does NOT execute OAuth redirects, token exchange,
// provider calls or publication. The Social Media Engine remains the sole authority.
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

export const SOCIAL_PROVIDER_BRIDGE_VERSION = 'CAPITAL_AI_CONTENT_SOCIAL_PROVIDER_BRIDGE@1';
export const SOCIAL_PLATFORMS = Object.freeze({
  YOUTUBE: 'youtube',
  TIKTOK: 'tiktok',
  INSTAGRAM: 'instagram',
  X: 'x',
  FACEBOOK: 'facebook',
});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/;
const SOURCE_SHA = /^[0-9a-f]{40,64}$/;
const PACKAGE_VERSION = 'CAPITAL_AI_CONTENT_SOCIAL_PACKAGE@1';
const HANDOFF_VERSION = 'CAPITAL_AI_CONTENT_SOCIAL_PUBLISHER_ADAPTER@1';

function assert(value, code) {
  if (!value) throw new Error(code);
}
function requiredString(value, code) {
  assert(typeof value === 'string' && value.length > 0 && value.length <= 500, code);
  return value;
}
function safeTime(value) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}
function validUserId(id) {
  return typeof id === 'string' && UUID.test(id);
}
function validHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}
const PUBLICATION_HOSTS = Object.freeze({
  YOUTUBE: ['youtube.com', 'www.youtube.com', 'youtu.be'],
  TIKTOK: ['tiktok.com', 'www.tiktok.com'],
  INSTAGRAM: ['instagram.com', 'www.instagram.com'],
  X: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'],
  FACEBOOK: ['facebook.com', 'www.facebook.com', 'm.facebook.com'],
});
export function providerPublicationUrlAllowed(channel, value) {
  if (!validHttpsUrl(value)) return false;
  const hosts = Object.hasOwn(PUBLICATION_HOSTS, channel) ? PUBLICATION_HOSTS[channel] : [];
  const url = new URL(value);
  return hosts.includes(url.hostname.toLowerCase()) && url.pathname !== '/';
}

export function socialPlatformForChannel(channel) {
  assert(typeof channel === 'string' && Object.hasOwn(SOCIAL_PLATFORMS, channel),
    'SOCIAL_PROVIDER_CHANNEL_UNSUPPORTED');
  const platform = SOCIAL_PLATFORMS[channel];
  return platform;
}
export function socialChannelForPlatform(platform) {
  const channel = Object.keys(SOCIAL_PLATFORMS).find(key => SOCIAL_PLATFORMS[key] === platform);
  assert(channel, 'SOCIAL_PROVIDER_PLATFORM_UNSUPPORTED');
  return channel;
}

/**
 * An exact-match binding of the Growth package and publisher handoff.
 * The manifest alone is NOT trusted evidence of a durable owner approval.
 */
export function assertSocialManifestHandoff(manifest, handoff) {
  assert(manifest?.contractVersion === PACKAGE_VERSION
    && manifest.publicationAuthority === 'SOCIAL_MEDIA_ENGINE_ONLY',
    'SOCIAL_PROVIDER_MANIFEST_INVALID');
  assert(handoff?.contractVersion === HANDOFF_VERSION, 'SOCIAL_PROVIDER_HANDOFF_INVALID');
  const channel = handoff.channel;
  socialPlatformForChannel(channel);
  assert(manifest.campaignId === handoff.campaignId
    && manifest.contentId === handoff.contentId
    && manifest.sourceSha === handoff.sourceSha
    && manifest.canonicalUrl === handoff.canonicalUrl
    && SOURCE_SHA.test(manifest.sourceSha)
    && validHttpsUrl(manifest.canonicalUrl),
    'SOCIAL_PROVIDER_IDENTITY_MISMATCH');
  const matching = (manifest.assets ?? []).filter(asset => asset.assetId === handoff.assetId);
  assert(matching.length === 1, 'SOCIAL_PROVIDER_ASSET_NOT_UNIQUE');
  const asset = matching[0];
  assert(asset.contentId === manifest.contentId
    && asset.sourceSha === manifest.sourceSha
    && SHA256.test(asset.sha256)
    && asset.sha256 === handoff.assetSha256,
    'SOCIAL_PROVIDER_ASSET_SHA_MISMATCH');
  const matchingApprovals = (manifest.approvals ?? []).filter(row =>
    row.approvalRef === handoff.approvalRef
    && row.assetId === asset.assetId
    && row.assetSha256 === asset.sha256
    && row.publicPublishAllowed === true
    && Array.isArray(row.approvedChannels)
    && row.approvedChannels.includes(channel));
  assert(matchingApprovals.length === 1, 'SOCIAL_PROVIDER_MANIFEST_APPROVAL_MISMATCH');
  assert(handoff.deliveryKey === [
    manifest.campaignId, manifest.contentId, asset.assetId, channel,
  ].join(':'), 'SOCIAL_PROVIDER_DELIVERY_KEY_MISMATCH');
  return Object.freeze({ channel, platform: socialPlatformForChannel(channel), asset });
}

/**
 * Map existing social_media_accounts rows without ever projecting encrypted tokens.
 * Server-side callers must query via service_role with an authenticated, scoped userId.
 */
export function publicSocialAccountProjection(row, userId, channel, now = Date.now()) {
  const platform = socialPlatformForChannel(channel);
  assert(validUserId(userId) && row?.user_id === userId, 'SOCIAL_PROVIDER_ACCOUNT_OWNER_MISMATCH');
  assert(validUserId(row.id) && row.platform === platform, 'SOCIAL_PROVIDER_ACCOUNT_PLATFORM_MISMATCH');
  const expiry = safeTime(row.token_expires_at);
  assert(row.status === 'connected' && typeof row.access_token_encrypted === 'string'
    && row.access_token_encrypted.length > 0, 'SOCIAL_PROVIDER_ACCOUNT_NOT_CONNECTED');
  assert(Number.isFinite(expiry) && expiry > now + 60_000,
    'SOCIAL_PROVIDER_ACCESS_TOKEN_EXPIRED');
  assert(Array.isArray(row.scopes) && row.scopes.length > 0,
    'SOCIAL_PROVIDER_SCOPES_NOT_VERIFIED');
  return Object.freeze({
    accountId: row.id,
    userId,
    channel,
    platform,
    externalAccountId: typeof row.external_account_id === 'string' ? row.external_account_id : null,
    accountHandle: typeof row.handle === 'string' ? row.handle.slice(0, 200) : null,
    tokenExpiresAt: row.token_expires_at,
    scopes: Object.freeze([...row.scopes]),
    // Deliberately no access_token_encrypted, refresh_token_encrypted or raw tokens.
  });
}

/**
 * Enforces durable approval, immutable-asset readback and an atomic idempotency claim.
 * The historical social_media_content_approvals table lacks asset_sha256, and the
 * historical publish_log lacks a unique delivery_key. Until the storage upgrade
 * provides both, the bridge REFUSES execution even when a manifest claims approval.
 */
export function prepareSocialProviderDelivery(input) {
  const { manifest, handoff, userId, accountRow, approvalRow, verifiedAsset,
    reservation, capability, now = Date.now() } = input ?? {};
  const { channel, platform, asset } = assertSocialManifestHandoff(manifest, handoff);
  assert(validUserId(userId), 'SOCIAL_PROVIDER_USER_ID_REQUIRED');
  const account = publicSocialAccountProjection(accountRow, userId, channel, now);

  assert(approvalRow?.id === handoff.approvalRef
    && approvalRow.user_id === userId
    && approvalRow.status === 'approved'
    && Array.isArray(approvalRow.platforms)
    && approvalRow.platforms.includes(platform)
    && approvalRow.asset_id === asset.assetId
    && approvalRow.asset_sha256 === asset.sha256
    && SHA256.test(approvalRow.asset_sha256)
    && typeof approvalRow.decided_by === 'string' && approvalRow.decided_by.length > 0,
    'SOCIAL_PROVIDER_DURABLE_HASH_APPROVAL_REQUIRED');

  assert(verifiedAsset?.assetId === asset.assetId
    && verifiedAsset.sha256 === asset.sha256
    && verifiedAsset.sourceSha === manifest.sourceSha
    && verifiedAsset.contentId === manifest.contentId
    && verifiedAsset.retrievedBytesSha256 === asset.sha256
    && verifiedAsset.rightsVerified === true,
    'SOCIAL_PROVIDER_IMMUTABLE_ASSET_READBACK_REQUIRED');

  assert(reservation?.user_id === userId
    && reservation.delivery_key === handoff.deliveryKey
    && reservation.asset_sha256 === asset.sha256
    && reservation.approval_ref === handoff.approvalRef
    && reservation.status === 'CLAIMED'
    && validUserId(reservation.id)
    && safeTime(reservation.expires_at) > now,
    'SOCIAL_PROVIDER_ATOMIC_RESERVATION_REQUIRED');

  // Rights, scope and provider API/version verification is operator evidence,
  // not a user-controlled flag. The runtime must source this from a trusted store.
  assert(capability?.channel === channel
    && capability?.status === 'VERIFIED'
    && requiredString(capability.evidenceRef, 'SOCIAL_PROVIDER_CAPABILITY_EVIDENCE_REQUIRED')
    && capability.scopesVerified === true
    && capability.publishRightsVerified === true,
    'SOCIAL_PROVIDER_CAPABILITY_NOT_VERIFIED');

  return Object.freeze({
    contractVersion: SOCIAL_PROVIDER_BRIDGE_VERSION,
    userId,
    campaignId: handoff.campaignId,
    contentId: handoff.contentId,
    canonicalUrl: handoff.canonicalUrl,
    sourceSha: handoff.sourceSha,
    channel,
    platform,
    accountId: account.accountId,
    assetId: asset.assetId,
    assetSha256: asset.sha256,
    approvalRef: handoff.approvalRef,
    deliveryKey: handoff.deliveryKey,
    reservationId: reservation.id,
    capabilityEvidenceRef: capability.evidenceRef,
  });
}

/**
 * Unverified 2xx, async job IDs and network timeouts are always UNKNOWN.
 * Only a trusted provider completion readback with delivery ID proves PUBLISHED.
 */
export function classifySocialProviderReadback(plan, readback) {
  assert(plan?.contractVersion === SOCIAL_PROVIDER_BRIDGE_VERSION,
    'SOCIAL_PROVIDER_PLAN_REQUIRED');
  assert(readback?.channel === plan.channel && readback?.deliveryKey === plan.deliveryKey,
    'SOCIAL_PROVIDER_READBACK_IDENTITY_MISMATCH');
  const id = readback.providerDeliveryId;
  const hasId = typeof id === 'string' && id.length > 0 && id.length <= 500;
  if (readback.status === 'VERIFIED_PUBLISHED') {
    assert(hasId && providerPublicationUrlAllowed(plan.channel, readback.publishedUrl)
      && typeof readback.evidenceRef === 'string' && readback.evidenceRef.length > 0
      && readback.verifiedBy === 'PROVIDER_READBACK',
      'SOCIAL_PROVIDER_COMPLETION_EVIDENCE_REQUIRED');
    return Object.freeze({
      deliveryState: 'PUBLISHED', providerDeliveryId: id,
      publishedUrl: readback.publishedUrl, evidenceRef: readback.evidenceRef,
    });
  }
  if (readback.status === 'VERIFIED_FAILED'
    && readback.verifiedBy === 'PROVIDER_READBACK'
    && readback.evidenceRef) {
    return Object.freeze({
      deliveryState: 'FAILED',
      providerDeliveryId: hasId ? id : null,
      evidenceRef: readback.evidenceRef,
    });
  }
  return Object.freeze({
    deliveryState: 'UNKNOWN', providerDeliveryId: hasId ? id : null,
    evidenceRef: null,
  });
}

/**
 * Write shape for the existing social_media_publish_log, whose only valid final
 * statuses are published/failed. UNKNOWN must stay in a durable delivery job
 * and MUST NEVER be misrepresented as scheduled, failed or published.
 */
export function buildLegacySocialPublishLogRow(plan, completion, now = new Date().toISOString()) {
  assert(plan?.contractVersion === SOCIAL_PROVIDER_BRIDGE_VERSION,
    'SOCIAL_PROVIDER_PLAN_REQUIRED');
  assert(completion?.deliveryState === 'PUBLISHED' || completion?.deliveryState === 'FAILED',
    'SOCIAL_PROVIDER_LOG_REQUIRES_TERMINAL_READBACK');
  assert(Number.isFinite(safeTime(now)), 'SOCIAL_PROVIDER_LOG_TIME_INVALID');
  if (completion.deliveryState === 'PUBLISHED') {
    assert(completion.providerDeliveryId
      && providerPublicationUrlAllowed(plan.channel, completion.publishedUrl)
      && completion.evidenceRef, 'SOCIAL_PROVIDER_LOG_PUBLISHED_EVIDENCE_REQUIRED');
  } else {
    assert(completion.evidenceRef, 'SOCIAL_PROVIDER_LOG_FAILURE_EVIDENCE_REQUIRED');
  }
  return Object.freeze({
    user_id: plan.userId,
    episode_id: plan.contentId,
    platform: plan.platform,
    account_id: plan.accountId,
    status: completion.deliveryState === 'PUBLISHED' ? 'published' : 'failed',
    publish_type: 'instant',
    published_url: completion.deliveryState === 'PUBLISHED' ? completion.publishedUrl : null,
    created_at: now,
    // Provider ID/campaign/asset/approval retained by the separate delivery job.
    // Never put raw provider errors, access tokens or PII in error_message.
  });
}

/**
 * Issue a high-entropy OAuth state for the existing social_media_oauth_states
 * columns. Store only its context-bound scrypt derivation. The callback MUST compare the hash and
 * atomically consume used_at (CAS) before exchanging an authorization code.
 */
export function socialOAuthStateDigest({ state, userId, channel, redirectUri }) {
  assert(typeof state === 'string' && /^[A-Za-z0-9_-]{43}$/.test(state),
    'SOCIAL_PROVIDER_OAUTH_STATE_INVALID');
  assert(validUserId(userId) && validHttpsUrl(redirectUri),
    'SOCIAL_PROVIDER_OAUTH_STATE_INVALID');
  const salt = JSON.stringify(['capital-social-oauth-state-v1', userId,
    socialPlatformForChannel(channel), redirectUri]);
  return scryptSync(state, salt, 32, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString('hex');
}

export function createSocialOAuthState(input) {
  // Production entropy is sourced exclusively from Node's CSPRNG; no caller override.
  const { userId, channel, redirectUri, allowedRedirectUris, codeVerifier = null,
    now = Date.now() } = input ?? {};
  const platform = socialPlatformForChannel(channel);
  assert(validUserId(userId), 'SOCIAL_PROVIDER_OAUTH_USER_REQUIRED');
  assert(validHttpsUrl(redirectUri) && Array.isArray(allowedRedirectUris)
    && allowedRedirectUris.includes(redirectUri), 'SOCIAL_PROVIDER_OAUTH_REDIRECT_DENIED');
  if (channel === 'X') {
    assert(typeof codeVerifier === 'string' && codeVerifier.length >= 43
      && codeVerifier.length <= 128, 'SOCIAL_PROVIDER_OAUTH_PKCE_REQUIRED');
  }
  const state = randomBytes(32).toString('base64url');
  assert(state.length >= 40, 'SOCIAL_PROVIDER_OAUTH_ENTROPY_REQUIRED');
  const stateHash = socialOAuthStateDigest({ state, userId, channel, redirectUri });
  return Object.freeze({
    state,
    row: Object.freeze({
      state_token: stateHash,
      user_id: userId,
      platform,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
      expires_at: new Date(now + 600_000).toISOString(),
    }),
  });
}

export function assertSocialOAuthStateSnapshot(input) {
  const { state, row, userId, channel, redirectUri, now = Date.now() } = input ?? {};
  const platform = socialPlatformForChannel(channel);
  assert(validUserId(userId) && row?.user_id === userId && row.platform === platform
    && row.redirect_uri === redirectUri && row.used_at == null
    && safeTime(row.expires_at) > now, 'SOCIAL_PROVIDER_OAUTH_STATE_INVALID');
  assert(typeof state === 'string' && state.length >= 40 && state.length <= 100,
    'SOCIAL_PROVIDER_OAUTH_STATE_INVALID');
  const expected = Buffer.from(row.state_token ?? '', 'hex');
  const actual = Buffer.from(socialOAuthStateDigest({ state, userId, channel, redirectUri }), 'hex');
  assert(expected.length === actual.length && timingSafeEqual(expected, actual),
    'SOCIAL_PROVIDER_OAUTH_STATE_INVALID');
  // This is an observation, NOT a consumption; the caller must CAS used_at in DB.
  return true;
}
