import test from 'node:test';
import assert from 'node:assert/strict';
import { planContentCampaign, type ContentCampaignBrief } from '../contentEngine.ts';
import {
  buildDraftContentSocialPackage, ContentSocialAssetSchema,
  findContentSocialApproval, withContentSocialApproval,
  type ContentSocialAsset,
} from '../contentSocialPackage.ts';
import { buildSocialPublisherHandoff, CURRENT_SOCIAL_PUBLISHER_ADAPTERS } from '../socialPublisherAdapter.ts';
import { planNonAudioSocialReview } from '../socialNonAudioReview.ts';
import {
  ORIGINAL_GRAPHIC_LICENSE_ID, ORIGINAL_GRAPHIC_LICENSE_VERSION,
  type OriginalGraphicAsset, type OriginalGraphicOwnerGrant,
} from '../originalGraphicLicense.ts';

const campaign: ContentCampaignBrief = {
  campaignId: 'original-graphic-integration-test',
  productId: 'capital-ai-content-engine',
  sourceSha: 'a'.repeat(40),
  canonicalUrl: 'https://capital-ai.online/',
  locale: 'de-DE',
  objective: 'Eigene Grafik an Quellenstand und redaktionellen Inhalt binden.',
  audience: ['FinTech-Lernende'],
  channels: ['WEBSITE', 'INSTAGRAM'],
  outputs: ['TEXT', 'IMAGE'],
  sourceUrls: ['https://solana.com/news/synthetic-test-article'],
};
const graphic: OriginalGraphicAsset = {
  assetId: 'synthetic-own-graphic',
  contentId: 'synthetic-editorial-content',
  sha256: 'b'.repeat(64),
  mimeType: 'image/png',
  sourceSha: campaign.sourceSha,
  sourceDigest: 'c'.repeat(64),
  contentDigest: 'd'.repeat(64),
  origin: 'FIRST_PARTY_TEMPLATE',
  creationMethod: 'AI_ASSISTED',
  renderer: { id: 'synthetic-status-renderer', version: '1' },
  thirdPartyAssets: false,
};
const asset: ContentSocialAsset = {
  assetId: graphic.assetId,
  contentId: graphic.contentId,
  kind: 'IMAGE',
  sha256: graphic.sha256,
  mimeType: graphic.mimeType,
  sourceSha: graphic.sourceSha,
  evidenceRef: 'test-fixture:rendered-original-graphic',
  originalGraphic: graphic,
};
// Synthetic trusted records for contract tests, never a production approval.
const grant: OriginalGraphicOwnerGrant = {
  contractVersion: ORIGINAL_GRAPHIC_LICENSE_VERSION,
  grantId: 'synthetic-owner-license',
  grantedBy: 'OWNER',
  ownerName: 'Synthetic owner',
  authorizationEvidenceRef: 'test-fixture:owner-license-authorization',
  authorizedAt: '2026-01-01T00:00:00Z',
  decision: 'LICENSED',
  licenseId: ORIGINAL_GRAPHIC_LICENSE_ID,
  asset: graphic,
  allowedChannels: ['WEBSITE', 'INSTAGRAM', 'MASTODON'],
  aiAssistanceDisclosed: true,
};
const readyAdapters = { ...CURRENT_SOCIAL_PUBLISHER_ADAPTERS, INSTAGRAM: 'READY' as const };

function draft() {
  return buildDraftContentSocialPackage({ campaign, contentId: graphic.contentId, assets: [asset] });
}
function publicationApproved() {
  return withContentSocialApproval(draft(), {
    approvalRef: 'test-fixture:separate-publication-approval',
    assetId: asset.assetId,
    assetSha256: asset.sha256,
    approvedChannels: ['INSTAGRAM'],
    approvedAt: '2026-01-01T01:00:00Z',
    approvedBy: 'Synthetic editorial owner',
    publicPublishAllowed: true,
  });
}

test('normal campaign planning reports each requested channel without granting publication', () => {
  const withoutGrant = planContentCampaign(campaign, { originalGraphics: [graphic] });
  assert.equal(withoutGrant.graphicLicenses?.length, 2);
  assert.ok(withoutGrant.graphicLicenses?.every(item => !item.graphicUseAllowed));
  const licensed = planContentCampaign(campaign, {
    originalGraphics: [graphic], graphicOwnerGrants: [grant],
  });
  assert.deepEqual(licensed.graphicLicenses?.map(item => [item.channel, item.state]), [
    ['WEBSITE', 'LICENSED_FOR_CHANNEL'], ['INSTAGRAM', 'LICENSED_FOR_CHANNEL'],
  ]);
  assert.equal(licensed.publication.publicPublishAllowed, false);
  assert.equal(licensed.cadsQuality.licenseApproval, false);
  assert.equal(licensed.cadsQuality.editorialReview, 'REVIEW_REQUIRED');
  assert.ok(licensed.graphicLicenses?.every(item => item.sourceRights === 'NOT_PROVEN'));
});

test('the existing Mastodon campaign channel supports original graphics', () => {
  const plan = planContentCampaign({ ...campaign, channels: ['MASTODON'] }, {
    originalGraphics: [graphic], graphicOwnerGrants: [grant],
  });
  assert.equal(plan.graphicLicenses?.[0]?.channel, 'MASTODON');
  assert.equal(plan.graphicLicenses?.[0]?.graphicUseAllowed, true);
});

test('campaign source or output mismatch rejects own-graphic attachments', () => {
  assert.throws(() => planContentCampaign({ ...campaign, outputs: ['TEXT'] }, {
    originalGraphics: [graphic], graphicOwnerGrants: [grant],
  }), /CONTENT_GRAPHIC_CAMPAIGN_MISMATCH/);
  assert.throws(() => planContentCampaign(campaign, {
    originalGraphics: [{ ...graphic, sourceSha: 'e'.repeat(40) }],
  }), /CONTENT_GRAPHIC_CAMPAIGN_MISMATCH/);
});

test('social assets reject mismatched nested original-graphic identity', () => {
  const mismatches: ContentSocialAsset[] = [
    { ...asset, originalGraphic: { ...graphic, sha256: 'e'.repeat(64) } },
    { ...asset, originalGraphic: { ...graphic, contentId: 'other-content' } },
    { ...asset, originalGraphic: { ...graphic, assetId: 'other-asset' } },
    { ...asset, originalGraphic: { ...graphic, sourceSha: 'e'.repeat(40) } },
    { ...asset, originalGraphic: { ...graphic, mimeType: 'image/webp' } },
    { ...asset, kind: 'TEXT' },
  ];
  for (const mismatch of mismatches) {
    assert.throws(() => ContentSocialAssetSchema.parse(mismatch), /CONTENT_SOCIAL_GRAPHIC_IDENTITY_MISMATCH/);
  }
});

test('separate publication approval alone cannot bypass original-graphic licensing', () => {
  const manifest = publicationApproved();
  assert.equal(findContentSocialApproval(manifest, asset.assetId, 'INSTAGRAM'), undefined);
  assert.throws(() => buildSocialPublisherHandoff(manifest, 'INSTAGRAM', asset.assetId, readyAdapters),
    /CONTENT_SOCIAL_PUBLISHER_APPROVAL_REQUIRED/);
  assert.equal(findContentSocialApproval(draft(), asset.assetId, 'INSTAGRAM', [grant]), undefined);
});

test('matching graphic license plus separate publication approval reaches the existing handoff', () => {
  const manifest = publicationApproved();
  const approval = findContentSocialApproval(manifest, asset.assetId, 'INSTAGRAM', [grant]);
  assert.equal(approval?.approvalRef, 'test-fixture:separate-publication-approval');
  const handoff = buildSocialPublisherHandoff(manifest, 'INSTAGRAM', asset.assetId, readyAdapters, [grant]);
  assert.equal(handoff.assetSha256, graphic.sha256);
  assert.equal(handoff.contentId, graphic.contentId);
  assert.equal(handoff.sourceSha, graphic.sourceSha);
});

test('revoked, duplicate and stale digest grants fail closed at campaign and publisher entry points', () => {
  const revoked = { ...grant, decision: 'REVOKED' as const };
  const grants: OriginalGraphicOwnerGrant[][] = [
    [revoked], [grant, grant], [grant, revoked], [revoked, grant],
    [{ ...grant, asset: { ...graphic, contentDigest: 'e'.repeat(64) } }],
    [{ ...grant, asset: { ...graphic, sourceDigest: 'e'.repeat(64) } }],
    [{ ...grant, allowedChannels: ['WEBSITE'] }],
  ];
  for (const invalid of grants) {
    const manifest = publicationApproved();
    assert.equal(findContentSocialApproval(manifest, asset.assetId, 'INSTAGRAM', invalid), undefined);
    assert.throws(() => buildSocialPublisherHandoff(manifest, 'INSTAGRAM', asset.assetId, readyAdapters, invalid),
      /CONTENT_SOCIAL_PUBLISHER_APPROVAL_REQUIRED/);
    const plan = planContentCampaign({ ...campaign, channels: ['INSTAGRAM'] }, {
      originalGraphics: [graphic], graphicOwnerGrants: invalid,
    });
    assert.equal(plan.graphicLicenses?.[0]?.graphicUseAllowed, false);
  }
});

test('non-audio social review uses the same license boundary and remains a draft', () => {
  const input = {
    manifest: publicationApproved(),
    requests: [{ channel: 'INSTAGRAM' as const, assetId: asset.assetId, plannedFor: null }],
    now: '2026-11-20T12:00:00Z',
  };
  assert.equal(planNonAudioSocialReview(input).items[0]?.state, 'APPROVAL_REQUIRED');
  const reviewed = planNonAudioSocialReview({ ...input, graphicOwnerGrants: [grant] });
  assert.equal(reviewed.items[0]?.state, 'PROVIDER_INTEGRATION_PENDING');
  assert.equal(reviewed.publishingAuthorized, false);
  assert.equal(reviewed.items[0]?.deliveryState, 'DRAFT');
});
