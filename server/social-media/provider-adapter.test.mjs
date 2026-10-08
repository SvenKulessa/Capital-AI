import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SOCIAL_PLATFORMS, socialPlatformForChannel, socialChannelForPlatform,
  assertSocialManifestHandoff, publicSocialAccountProjection,
  prepareSocialProviderDelivery, classifySocialProviderReadback,
  buildLegacySocialPublishLogRow, createSocialOAuthState,
  assertSocialOAuthStateSnapshot,
} from './provider-adapter.mjs';

const USER = 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
const OTHER = '8c6682a7-e203-473c-897b-389e55cd58a0';
const ACCOUNT = 'f683ecba-1fab-45f7-8c6a-a35418750771';
const RESERVATION = 'b405dbb2-c918-4541-a0e1-840f9f5bca8f';
const NOW = Date.parse('2026-10-08T10:00:00.000Z');
const SHA = 'a'.repeat(64);
const SOURCE = 'b'.repeat(40);
const CHANNEL = 'YOUTUBE';
const PLATFORM = 'youtube';
const KEY = 'campaign:content:asset:YOUTUBE';

function fixture() {
  const manifest = {
    contractVersion: 'CAPITAL_AI_CONTENT_SOCIAL_PACKAGE@1',
    campaignId: 'campaign', contentId: 'content', sourceSha: SOURCE,
    canonicalUrl: 'https://capital-ai.online/', publicationAuthority: 'SOCIAL_MEDIA_ENGINE_ONLY',
    assets: [{ assetId: 'asset', contentId: 'content', sourceSha: SOURCE, sha256: SHA }],
    approvals: [{ approvalRef: 'approval-1', assetId: 'asset', assetSha256: SHA,
      approvedChannels: ['YOUTUBE'], publicPublishAllowed: true }],
  };
  const handoff = {
    contractVersion: 'CAPITAL_AI_CONTENT_SOCIAL_PUBLISHER_ADAPTER@1',
    campaignId: 'campaign', contentId: 'content', sourceSha: SOURCE,
    canonicalUrl: 'https://capital-ai.online/', assetId: 'asset',
    assetSha256: SHA, approvalRef: 'approval-1', channel: CHANNEL, deliveryKey: KEY,
  };
  return {
    manifest, handoff, userId: USER, now: NOW,
    accountRow: {
      id: ACCOUNT, user_id: USER, platform: PLATFORM, status: 'connected',
      scopes: ['https://www.googleapis.com/auth/youtube.upload'],
      handle: '@capitalai', token_expires_at: '2026-10-08T11:00:00.000Z',
      access_token_encrypted: 'ENCRYPTED_TOKEN_CANARY',
      refresh_token_encrypted: 'REFRESH_TOKEN_CANARY',
    },
    approvalRow: { id: 'approval-1', user_id: USER, status: 'approved',
      platforms: [PLATFORM], decided_by: 'owner', asset_id: 'asset', asset_sha256: SHA },
    verifiedAsset: { assetId: 'asset', contentId: 'content', sourceSha: SOURCE,
      sha256: SHA, retrievedBytesSha256: SHA, rightsVerified: true },
    reservation: { id: RESERVATION, user_id: USER, delivery_key: KEY,
      asset_sha256: SHA, approval_ref: 'approval-1', status: 'CLAIMED',
      expires_at: '2026-10-08T10:05:00.000Z' },
    capability: { channel: CHANNEL, status: 'VERIFIED', evidenceRef: 'evidence://verified',
      scopesVerified: true, publishRightsVerified: true },
  };
}

test('all five provider channels map to legacy OAuth/account/log platform keys', () => {
  assert.deepEqual(Object.keys(SOCIAL_PLATFORMS).sort(),
    ['FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'X', 'YOUTUBE'].sort());
  for (const [channel, platform] of Object.entries(SOCIAL_PLATFORMS)) {
    assert.equal(socialPlatformForChannel(channel), platform);
    assert.equal(socialChannelForPlatform(platform), channel);
  }
  assert.throws(() => socialPlatformForChannel('LINKEDIN'), /CHANNEL_UNSUPPORTED/);
  assert.throws(() => socialPlatformForChannel('toString'), /CHANNEL_UNSUPPORTED/);
});

test('manifest and handoff must match immutable asset and approval exactly', () => {
  const x = fixture();
  assert.equal(assertSocialManifestHandoff(x.manifest, x.handoff).asset.sha256, SHA);
  assert.throws(() => assertSocialManifestHandoff(x.manifest,
    { ...x.handoff, assetSha256: 'f'.repeat(64) }), /ASSET_SHA_MISMATCH/);
  assert.throws(() => assertSocialManifestHandoff(
    { ...x.manifest, approvals: [] }, x.handoff), /MANIFEST_APPROVAL_MISMATCH/);
  assert.throws(() => assertSocialManifestHandoff(x.manifest,
    { ...x.handoff, deliveryKey: 'bad' }), /DELIVERY_KEY_MISMATCH/);
  assert.throws(() => assertSocialManifestHandoff(
    { ...x.manifest, publicationAuthority: 'CONTENT_ENGINE' }, x.handoff),
    /MANIFEST_INVALID/);
});

test('account projection is user-scoped and removes all credential material', () => {
  const x = fixture();
  const safe = publicSocialAccountProjection(x.accountRow, USER, CHANNEL, NOW);
  assert.equal(safe.accountId, ACCOUNT);
  assert.ok(!JSON.stringify(safe).includes('TOKEN_CANARY'));
  assert.equal('access_token_encrypted' in safe, false);
  assert.equal('refresh_token_encrypted' in safe, false);
  assert.throws(() => publicSocialAccountProjection(x.accountRow, OTHER, CHANNEL, NOW),
    /ACCOUNT_OWNER_MISMATCH/);
  assert.throws(() => publicSocialAccountProjection({
    ...x.accountRow, token_expires_at: '2026-10-08T10:00:30.000Z',
  }, USER, CHANNEL, NOW), /ACCESS_TOKEN_EXPIRED/);
});

test('legacy approval schema cannot silently authorize a real publish', () => {
  const x = fixture();
  const legacyApproval = {
    id: x.approvalRow.id, user_id: USER, platforms: ['youtube'],
    status: 'approved', decided_by: 'owner',
  };
  assert.throws(() => prepareSocialProviderDelivery({
    ...x, approvalRow: legacyApproval,
  }), /DURABLE_HASH_APPROVAL_REQUIRED/);
});

test('dispatch plan requires independent approval, immutable bytes, claim and rights evidence', () => {
  const x = fixture();
  const plan = prepareSocialProviderDelivery(x);
  assert.equal(plan.deliveryKey, KEY);
  assert.equal(plan.approvalRef, 'approval-1');
  assert.equal(plan.assetSha256, SHA);
  assert.ok(!JSON.stringify(plan).includes('TOKEN_CANARY'));
  assert.throws(() => prepareSocialProviderDelivery({
    ...x, verifiedAsset: { ...x.verifiedAsset, retrievedBytesSha256: 'c'.repeat(64) },
  }), /IMMUTABLE_ASSET_READBACK_REQUIRED/);
  assert.throws(() => prepareSocialProviderDelivery({
    ...x, reservation: { ...x.reservation, status: 'ALREADY_CLAIMED' },
  }), /ATOMIC_RESERVATION_REQUIRED/);
  assert.throws(() => prepareSocialProviderDelivery({
    ...x, capability: { ...x.capability, publishRightsVerified: false },
  }), /CAPABILITY_NOT_VERIFIED/);
  assert.throws(() => prepareSocialProviderDelivery({
    ...x, approvalRow: { ...x.approvalRow, user_id: OTHER },
  }), /DURABLE_HASH_APPROVAL_REQUIRED/);
});

test('provider acknowledgement, processing and timeout never imply PUBLISHED', () => {
  const plan = prepareSocialProviderDelivery(fixture());
  for (const status of ['ACCEPTED', 'PROCESSING', 'TIMEOUT', 'UNVERIFIED', 'UNKNOWN']) {
    const completion = classifySocialProviderReadback(plan, {
      channel: CHANNEL, deliveryKey: KEY, status,
      providerDeliveryId: 'video-123',
    });
    assert.equal(completion.deliveryState, 'UNKNOWN');
    assert.throws(() => buildLegacySocialPublishLogRow(plan, completion),
      /LOG_REQUIRES_TERMINAL_READBACK/);
  }
  assert.throws(() => classifySocialProviderReadback(plan, {
    channel: CHANNEL, deliveryKey: KEY, status: 'VERIFIED_PUBLISHED',
    providerDeliveryId: 'video-123', publishedUrl: 'https://youtube.com/watch?v=video-123',
    evidenceRef: 'evidence://provider', verifiedBy: 'CLAIMED_BY_CLIENT',
  }), /COMPLETION_EVIDENCE_REQUIRED/);
});

test('only verified terminal readback can map to the existing publish log', () => {
  const plan = prepareSocialProviderDelivery(fixture());
  const published = classifySocialProviderReadback(plan, {
    channel: CHANNEL, deliveryKey: KEY, status: 'VERIFIED_PUBLISHED',
    providerDeliveryId: 'video-123',
    publishedUrl: 'https://youtube.com/watch?v=video-123',
    verifiedBy: 'PROVIDER_READBACK', evidenceRef: 'evidence://provider/video-123',
  });
  assert.equal(published.deliveryState, 'PUBLISHED');
  const publishedRow = buildLegacySocialPublishLogRow(plan, published);
  assert.equal(publishedRow.user_id, USER);
  assert.equal(publishedRow.account_id, ACCOUNT);
  assert.equal(publishedRow.platform, 'youtube');
  assert.equal(publishedRow.status, 'published');
  assert.equal(publishedRow.episode_id, 'content');
  assert.equal(publishedRow.publish_type, 'instant');
  assert.equal('providerDeliveryId' in publishedRow, false);
  const failed = classifySocialProviderReadback(plan, {
    channel: CHANNEL, deliveryKey: KEY, status: 'VERIFIED_FAILED',
    verifiedBy: 'PROVIDER_READBACK', evidenceRef: 'evidence://provider/failed',
  });
  assert.equal(buildLegacySocialPublishLogRow(plan, failed).status, 'failed');
});

test('OAuth state binds user/platform/redirect/expiry with PKCE for X', () => {
  const redirectUri = 'https://capital-ai.online/api/social-media/auth/callback';
  const oauth = createSocialOAuthState({
    userId: USER, channel: 'X', redirectUri, allowedRedirectUris: [redirectUri],
    codeVerifier: 'v'.repeat(43), now: NOW,
  });
  assert.equal(oauth.row.platform, 'x');
  assert.equal(oauth.row.user_id, USER);
  assert.equal(oauth.row.state_token.length, 64);
  assert.notEqual(oauth.row.state_token, oauth.state);
  assert.equal(assertSocialOAuthStateSnapshot({
    state: oauth.state, row: oauth.row, userId: USER, channel: 'X', redirectUri, now: NOW,
  }), true);
  assert.throws(() => assertSocialOAuthStateSnapshot({
    state: oauth.state, row: { ...oauth.row, used_at: new Date(NOW).toISOString() },
    userId: USER, channel: 'X', redirectUri, now: NOW,
  }), /STATE_INVALID/);
  assert.throws(() => assertSocialOAuthStateSnapshot({
    state: oauth.state, row: oauth.row, userId: OTHER,
    channel: 'X', redirectUri, now: NOW,
  }), /STATE_INVALID/);
  assert.throws(() => assertSocialOAuthStateSnapshot({
    state: oauth.state, row: oauth.row, userId: USER,
    channel: 'X', redirectUri, now: NOW + 600_001,
  }), /STATE_INVALID/);
  assert.throws(() => createSocialOAuthState({
    userId: USER, channel: 'X', redirectUri,
    allowedRedirectUris: [redirectUri], now: NOW,
  }), /PKCE_REQUIRED/);
  assert.throws(() => createSocialOAuthState({
    userId: USER, channel: 'YOUTUBE', redirectUri: 'https://evil.invalid/callback',
    allowedRedirectUris: [redirectUri], now: NOW,
  }), /REDIRECT_DENIED/);
});
