import assert from 'node:assert/strict';
import test from 'node:test';

import { CAPITAL_AI_SCORE_BUILDER_CAMPAIGN_20261007 } from '../../data/contentCampaigns.ts';
import {
  buildDraftContentSocialPackage,
  withContentSocialApproval,
} from '../contentSocialPackage.ts';
import { buildSocialDeliveryAttribution } from '../contentSocialAttribution.ts';
import { buildSocialPublisherHandoff } from '../socialPublisherAdapter.ts';

const sha = 'a'.repeat(64);
const sourceSha = CAPITAL_AI_SCORE_BUILDER_CAMPAIGN_20261007.brief.sourceSha;

function draftPackage() {
  return buildDraftContentSocialPackage({
    campaign: CAPITAL_AI_SCORE_BUILDER_CAMPAIGN_20261007.brief,
    contentId: 'score-builder-launch',
    assets: [{
      assetId: 'score-builder-launch-image',
      contentId: 'score-builder-launch',
      kind: 'IMAGE',
      sha256: sha,
      mimeType: 'image/png',
      evidenceRef: 'evidence://score-builder-launch-image',
      sourceSha,
    }],
  });
}

test('draft package preserves campaign/content/source identity and grants no publication authority', () => {
  const manifest = draftPackage();
  assert.equal(manifest.campaignId, CAPITAL_AI_SCORE_BUILDER_CAMPAIGN_20261007.brief.campaignId);
  assert.equal(manifest.contentId, 'score-builder-launch');
  assert.equal(manifest.publicationAuthority, 'SOCIAL_MEDIA_ENGINE_ONLY');
  assert.deepEqual(manifest.approvals, []);
});

test('approval fails closed when asset hash does not match', () => {
  const manifest = draftPackage();
  assert.throws(
    () => withContentSocialApproval(manifest, {
      approvalRef: 'approval://1',
      assetId: 'score-builder-launch-image',
      assetSha256: 'b'.repeat(64),
      approvedChannels: ['YOUTUBE'],
      approvedAt: '2026-10-08T08:00:00.000Z',
      approvedBy: 'human-owner',
      publicPublishAllowed: true,
    }),
    /CONTENT_SOCIAL_APPROVAL_HASH_MISMATCH/,
  );
});

test('publisher handoff remains closed while CAPITAL-AI provider adapters are not ported', () => {
  const manifest = withContentSocialApproval(draftPackage(), {
    approvalRef: 'approval://1',
    assetId: 'score-builder-launch-image',
    assetSha256: sha,
    approvedChannels: ['YOUTUBE'],
    approvedAt: '2026-10-08T08:00:00.000Z',
    approvedBy: 'human-owner',
    publicPublishAllowed: true,
  });

  assert.throws(
    () => buildSocialPublisherHandoff(manifest, 'YOUTUBE', 'score-builder-launch-image'),
    /CONTENT_SOCIAL_PUBLISHER_NOT_READY/,
  );
});

test('publisher handoff binds exact campaign/content/asset/approval when an adapter is ready', () => {
  const manifest = withContentSocialApproval(draftPackage(), {
    approvalRef: 'approval://1',
    assetId: 'score-builder-launch-image',
    assetSha256: sha,
    approvedChannels: ['YOUTUBE'],
    approvedAt: '2026-10-08T08:00:00.000Z',
    approvedBy: 'human-owner',
    publicPublishAllowed: true,
  });

  const handoff = buildSocialPublisherHandoff(
    manifest,
    'YOUTUBE',
    'score-builder-launch-image',
    {
      YOUTUBE: 'READY',
      TIKTOK: 'INTEGRATION_PENDING',
      INSTAGRAM: 'INTEGRATION_PENDING',
      X: 'INTEGRATION_PENDING',
      FACEBOOK: 'INTEGRATION_PENDING',
    },
  );

  assert.equal(handoff.assetSha256, sha);
  assert.equal(handoff.approvalRef, 'approval://1');
  assert.match(handoff.deliveryKey, /score-builder-launch-image:YOUTUBE$/);
});

test('social attribution preserves campaign/content identity and provider delivery id', () => {
  const manifest = draftPackage();
  const event = buildSocialDeliveryAttribution({
    manifest,
    channel: 'YOUTUBE',
    providerDeliveryId: 'video-123',
    occurredAt: '2026-10-08T08:10:00.000Z',
    evidenceRef: 'evidence://youtube/video-123',
    metrics: [{ name: 'views', value: 10, unit: 'COUNT' }],
  });

  assert.equal(event.source, 'SOCIAL_PROVIDER');
  assert.equal(event.campaignId, manifest.campaignId);
  assert.equal(event.contentId, manifest.contentId);
  assert.equal(event.providerEntityId, 'YOUTUBE:video-123');
});
