import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDraftContentSocialPackage, withContentSocialApproval } from '../../../contracts/contentSocialPackage.ts';
import {
  CURRENT_SOCIAL_PUBLISHER_ADAPTERS,
  type SocialPublisherAdapterState,
  type SocialPublisherChannel,
} from '../../../contracts/socialPublisherAdapter.ts';
import { createCapitalAiMediaStudioProject } from '../Editing/MediaStudioTemplates';
import {
  buildContentSocialAssetFromMediaProject,
  buildMediaProjectPublisherHandoff,
} from '../Publishing/MediaProjectPublisherBridge';

const SOURCE_SHA = 'b'.repeat(40);
const ASSET_SHA = 'a'.repeat(64);
const CONTENT_ID = 'social-core-publish-test';

test('MediaProject render identity converges into the current ContentSocialPackage contract', () => {
  const project = {
    ...createCapitalAiMediaStudioProject(),
    contentPackageId: CONTENT_ID,
  };
  const asset = buildContentSocialAssetFromMediaProject({
    project,
    contentId: CONTENT_ID,
    sourceSha: SOURCE_SHA,
    renderedAsset: {
      assetId: 'asset-video-01',
      sha256: ASSET_SHA,
      mimeType: 'video/mp4',
      evidenceRef: 'renderer-evidence://social-core/asset-video-01',
    },
  });

  assert.equal(asset.kind, 'VIDEO');
  assert.equal(asset.sha256, ASSET_SHA);
  assert.equal(project.renderRecipe.publishReady, false);

  const manifest = buildDraftContentSocialPackage({
    campaign: {
      campaignId: 'campaign-social-core',
      productId: 'capital-ai',
      sourceSha: SOURCE_SHA,
      canonicalUrl: 'https://capital-ai.ai.studio/',
      locale: 'de-DE',
      objective: 'Deterministischen Social-Cutover verifizieren.',
      audience: ['Research-orientierte Anleger'],
      channels: ['YOUTUBE'],
      outputs: ['VIDEO'],
      sourceUrls: [],
    },
    contentId: CONTENT_ID,
    assets: [asset],
  });

  const approved = withContentSocialApproval(manifest, {
    approvalRef: 'approval-social-core-01',
    assetId: asset.assetId,
    assetSha256: asset.sha256,
    approvedChannels: ['YOUTUBE'],
    approvedAt: '2026-10-08T20:00:00.000Z',
    approvedBy: 'owner-test-fixture',
    publicPublishAllowed: true,
  });

  assert.throws(
    () => buildMediaProjectPublisherHandoff({
      project,
      manifest: approved,
      channel: 'YOUTUBE',
      assetId: asset.assetId,
    }),
    /CONTENT_SOCIAL_PUBLISHER_NOT_READY/,
  );

  const readyStates: Record<SocialPublisherChannel, SocialPublisherAdapterState> = {
    ...CURRENT_SOCIAL_PUBLISHER_ADAPTERS,
    YOUTUBE: 'READY',
  };
  const handoff = buildMediaProjectPublisherHandoff({
    project,
    manifest: approved,
    channel: 'YOUTUBE',
    assetId: asset.assetId,
    adapterStates: readyStates,
  });

  assert.equal(handoff.assetSha256, ASSET_SHA);
  assert.equal(handoff.approvalRef, 'approval-social-core-01');
  assert.equal(handoff.deliveryKey, 'campaign-social-core:social-core-publish-test:asset-video-01:YOUTUBE');
});

test('all production publisher defaults remain disabled during cutover', () => {
  assert.deepEqual(
    Object.values(CURRENT_SOCIAL_PUBLISHER_ADAPTERS),
    [
      'IMPLEMENTED_DISABLED',
      'IMPLEMENTED_DISABLED',
      'IMPLEMENTED_DISABLED',
      'IMPLEMENTED_DISABLED',
      'IMPLEMENTED_DISABLED',
    ],
  );
});

test('audio publication is fail-closed while no Social TTS/ASR model is active', () => {
  const project = createCapitalAiMediaStudioProject();
  assert.throws(
    () => buildContentSocialAssetFromMediaProject({
      project,
      contentId: CONTENT_ID,
      sourceSha: SOURCE_SHA,
      renderedAsset: {
        assetId: 'asset-audio-01',
        sha256: ASSET_SHA,
        mimeType: 'audio/wav',
        evidenceRef: 'renderer-evidence://social-core/asset-audio-01',
      },
    }),
    /SOCIAL_MEDIA_PROJECT_AUDIO_NOT_ACTIVE/,
  );
});
