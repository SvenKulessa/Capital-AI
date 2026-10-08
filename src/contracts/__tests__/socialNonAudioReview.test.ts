import assert from 'node:assert/strict';
import test from 'node:test';
import { CAPITAL_AI_SCORE_BUILDER_CAMPAIGN_20261007 } from '../../data/contentCampaigns.ts';
import { buildDraftContentSocialPackage, withContentSocialApproval } from '../contentSocialPackage.ts';
import { planNonAudioSocialReview } from '../socialNonAudioReview.ts';

const id = 'social-text-campaign';
const asset = { assetId: 'post-1', contentId: id, kind: 'TEXT' as const, sha256: 'a'.repeat(64),
  mimeType: 'text/plain', evidenceRef: 'evidence://post-1',
  sourceSha: CAPITAL_AI_SCORE_BUILDER_CAMPAIGN_20261007.brief.sourceSha };
const draft = () => buildDraftContentSocialPackage({
  campaign: CAPITAL_AI_SCORE_BUILDER_CAMPAIGN_20261007.brief, contentId: id, assets: [asset],
});
const plan = (manifest = draft(), assetId = 'post-1') => planNonAudioSocialReview({
  manifest, requests: [{ channel: 'X', assetId, plannedFor: '2026-10-10T12:00:00.000Z' }],
  now: '2026-10-08T12:00:00.000Z',
});
test('review keeps text-only work as draft with no scheduling or publishing authority', () => {
  const result = plan();
  assert.equal(result.items[0].state, 'APPROVAL_REQUIRED');
  assert.equal(result.items[0].deliveryState, 'DRAFT');
  assert.equal(result.items[0].publishingAuthorized, false);
});
test('durable-looking approval cannot make a pending provider executable', () => {
  const approved = withContentSocialApproval(draft(), {
    approvalRef: 'approval://post-1', assetId: 'post-1', assetSha256: asset.sha256,
    approvedChannels: ['X'], approvedAt: '2026-10-08T11:00:00.000Z',
    approvedBy: 'human-owner', publicPublishAllowed: true,
  });
  const result = plan(approved);
  assert.equal(result.items[0].state, 'PROVIDER_INTEGRATION_PENDING');
  assert.equal(result.items[0].approvalRef, 'approval://post-1');
  assert.equal(result.publishingAuthorized, false);
});
test('audio/video and missing assets do not enter the non-audio queue', () => {
  assert.throws(() => plan(draft(), 'missing'), /SOCIAL_REVIEW_ASSET_NOT_FOUND/);
  const video = buildDraftContentSocialPackage({
    campaign: CAPITAL_AI_SCORE_BUILDER_CAMPAIGN_20261007.brief,
    contentId: id, assets: [{ ...asset, kind: 'VIDEO', mimeType: 'video/mp4' }],
  });
  assert.throws(() => plan(video), /SOCIAL_REVIEW_AUDIO_VIDEO_DEFERRED/);
});
test('duplicate requests and times beyond 90 days fail closed', () => {
  const base = { manifest: draft(), now: '2026-10-08T12:00:00.000Z' };
  const request = { channel: 'X' as const, assetId: 'post-1', plannedFor: null };
  assert.throws(() => planNonAudioSocialReview({ ...base, requests: [request, request] }), /SOCIAL_REVIEW_DUPLICATE_REQUEST/);
  assert.throws(() => planNonAudioSocialReview({ ...base, requests: [{
    ...request, plannedFor: '2027-12-01T12:00:00.000Z',
  }] }), /SOCIAL_REVIEW_PLANNED_TIME_INVALID/);
});
