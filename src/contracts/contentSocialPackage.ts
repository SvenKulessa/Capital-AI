import { z } from 'zod';
import { ContentCampaignBriefSchema, type ContentCampaignBrief } from './contentEngine.ts';

export const CONTENT_SOCIAL_PACKAGE_VERSION = 'CAPITAL_AI_CONTENT_SOCIAL_PACKAGE@1' as const;

export const ContentSocialChannelSchema = z.enum([
  'WEBSITE',
  'LINKEDIN',
  'YOUTUBE',
  'REDDIT',
  'PODCAST',
  'EMAIL',
  'TIKTOK',
  'INSTAGRAM',
  'X',
  'FACEBOOK',
]);
export type ContentSocialChannel = z.infer<typeof ContentSocialChannelSchema>;

export const ContentSocialAssetKindSchema = z.enum(['TEXT', 'IMAGE', 'AUDIO', 'VIDEO']);
export type ContentSocialAssetKind = z.infer<typeof ContentSocialAssetKindSchema>;

export const ContentSocialAssetSchema = z.object({
  assetId: z.string().min(1).max(200),
  contentId: z.string().min(1).max(200),
  kind: ContentSocialAssetKindSchema,
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  mimeType: z.string().min(1).max(120),
  evidenceRef: z.string().min(1).max(500),
  sourceSha: z.string().regex(/^[a-f0-9]{40,64}$/),
}).strict();
export type ContentSocialAsset = z.infer<typeof ContentSocialAssetSchema>;

export const ContentSocialApprovalSchema = z.object({
  approvalRef: z.string().min(1).max(300),
  assetId: z.string().min(1).max(200),
  assetSha256: z.string().regex(/^[a-f0-9]{64}$/),
  approvedChannels: z.array(ContentSocialChannelSchema).min(1).max(10),
  approvedAt: z.string().datetime(),
  approvedBy: z.string().min(1).max(200),
  publicPublishAllowed: z.literal(true),
}).strict();
export type ContentSocialApproval = z.infer<typeof ContentSocialApprovalSchema>;

export const ContentSocialDeliverySchema = z.object({
  channel: ContentSocialChannelSchema,
  assetId: z.string().min(1).max(200),
  adapterState: z.enum(['INTEGRATION_PENDING', 'READY']),
  deliveryState: z.enum([
    'DRAFT',
    'READY_FOR_PROVIDER',
    'SCHEDULED',
    'PUBLISHING',
    'PUBLISHED',
    'FAILED',
    'UNKNOWN',
  ]),
  providerDeliveryId: z.string().min(1).max(500).optional(),
  evidenceRef: z.string().min(1).max(500).optional(),
}).strict();
export type ContentSocialDelivery = z.infer<typeof ContentSocialDeliverySchema>;

export const ContentSocialPackageManifestSchema = z.object({
  contractVersion: z.literal(CONTENT_SOCIAL_PACKAGE_VERSION),
  campaignId: z.string().min(1).max(160),
  contentId: z.string().min(1).max(200),
  sourceSha: z.string().regex(/^[a-f0-9]{40,64}$/),
  canonicalUrl: z.string().url(),
  locale: z.enum(['de-DE', 'en-US', 'en-GB']),
  publicationAuthority: z.literal('SOCIAL_MEDIA_ENGINE_ONLY'),
  campaign: ContentCampaignBriefSchema,
  assets: z.array(ContentSocialAssetSchema).min(1).max(50),
  approvals: z.array(ContentSocialApprovalSchema).max(50),
  deliveries: z.array(ContentSocialDeliverySchema).max(100),
}).strict();
export type ContentSocialPackageManifest = z.infer<typeof ContentSocialPackageManifestSchema>;

export function buildDraftContentSocialPackage(input: {
  campaign: ContentCampaignBrief;
  contentId: string;
  assets: readonly ContentSocialAsset[];
}): ContentSocialPackageManifest {
  const campaign = ContentCampaignBriefSchema.parse(input.campaign);
  const assets = input.assets.map((asset) => ContentSocialAssetSchema.parse(asset));

  for (const asset of assets) {
    if (asset.contentId !== input.contentId) {
      throw new Error('CONTENT_SOCIAL_ASSET_CONTENT_ID_MISMATCH');
    }
    if (asset.sourceSha !== campaign.sourceSha) {
      throw new Error('CONTENT_SOCIAL_ASSET_SOURCE_SHA_MISMATCH');
    }
  }

  return ContentSocialPackageManifestSchema.parse({
    contractVersion: CONTENT_SOCIAL_PACKAGE_VERSION,
    campaignId: campaign.campaignId,
    contentId: input.contentId,
    sourceSha: campaign.sourceSha,
    canonicalUrl: campaign.canonicalUrl,
    locale: campaign.locale,
    publicationAuthority: 'SOCIAL_MEDIA_ENGINE_ONLY',
    campaign,
    assets,
    approvals: [],
    deliveries: [],
  });
}

export function withContentSocialApproval(
  manifestInput: ContentSocialPackageManifest,
  approvalInput: ContentSocialApproval,
): ContentSocialPackageManifest {
  const manifest = ContentSocialPackageManifestSchema.parse(manifestInput);
  const approval = ContentSocialApprovalSchema.parse(approvalInput);
  const asset = manifest.assets.find((candidate) => candidate.assetId === approval.assetId);

  if (!asset) throw new Error('CONTENT_SOCIAL_APPROVAL_ASSET_NOT_FOUND');
  if (asset.sha256 !== approval.assetSha256) {
    throw new Error('CONTENT_SOCIAL_APPROVAL_HASH_MISMATCH');
  }

  return ContentSocialPackageManifestSchema.parse({
    ...manifest,
    approvals: [
      ...manifest.approvals.filter((candidate) => candidate.approvalRef !== approval.approvalRef),
      approval,
    ],
  });
}

export function findContentSocialApproval(
  manifestInput: ContentSocialPackageManifest,
  assetId: string,
  channel: ContentSocialChannel,
): ContentSocialApproval | undefined {
  const manifest = ContentSocialPackageManifestSchema.parse(manifestInput);
  const asset = manifest.assets.find((candidate) => candidate.assetId === assetId);
  if (!asset) return undefined;

  return manifest.approvals.find((approval) =>
    approval.assetId === assetId
    && approval.assetSha256 === asset.sha256
    && approval.publicPublishAllowed
    && approval.approvedChannels.includes(channel)
  );
}
