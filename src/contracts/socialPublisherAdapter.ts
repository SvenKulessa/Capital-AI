import { z } from 'zod';
import {
  ContentSocialPackageManifestSchema,
  findContentSocialApproval,
  type ContentSocialPackageManifest,
} from './contentSocialPackage.ts';

export const CONTENT_SOCIAL_PUBLISHER_ADAPTER_VERSION =
  'CAPITAL_AI_CONTENT_SOCIAL_PUBLISHER_ADAPTER@1' as const;

export const SocialPublisherChannelSchema = z.enum([
  'YOUTUBE',
  'TIKTOK',
  'INSTAGRAM',
  'X',
  'FACEBOOK',
]);
export type SocialPublisherChannel = z.infer<typeof SocialPublisherChannelSchema>;

export type SocialPublisherAdapterState = 'INTEGRATION_PENDING' | 'READY';

export const CURRENT_SOCIAL_PUBLISHER_ADAPTERS: Readonly<
  Record<SocialPublisherChannel, SocialPublisherAdapterState>
> = {
  YOUTUBE: 'INTEGRATION_PENDING',
  TIKTOK: 'INTEGRATION_PENDING',
  INSTAGRAM: 'INTEGRATION_PENDING',
  X: 'INTEGRATION_PENDING',
  FACEBOOK: 'INTEGRATION_PENDING',
} as const;

export const SocialPublisherHandoffSchema = z.object({
  contractVersion: z.literal(CONTENT_SOCIAL_PUBLISHER_ADAPTER_VERSION),
  campaignId: z.string().min(1),
  contentId: z.string().min(1),
  sourceSha: z.string().regex(/^[a-f0-9]{40,64}$/),
  canonicalUrl: z.string().url(),
  assetId: z.string().min(1),
  assetSha256: z.string().regex(/^[a-f0-9]{64}$/),
  approvalRef: z.string().min(1),
  channel: SocialPublisherChannelSchema,
  deliveryKey: z.string().min(1),
}).strict();
export type SocialPublisherHandoff = z.infer<typeof SocialPublisherHandoffSchema>;

export function buildSocialPublisherHandoff(
  manifestInput: ContentSocialPackageManifest,
  channelInput: SocialPublisherChannel,
  assetId: string,
  adapterStates: Readonly<Record<SocialPublisherChannel, SocialPublisherAdapterState>> =
    CURRENT_SOCIAL_PUBLISHER_ADAPTERS,
): SocialPublisherHandoff {
  const manifest = ContentSocialPackageManifestSchema.parse(manifestInput);
  const channel = SocialPublisherChannelSchema.parse(channelInput);

  if (adapterStates[channel] !== 'READY') {
    throw new Error('CONTENT_SOCIAL_PUBLISHER_NOT_READY');
  }

  const asset = manifest.assets.find((candidate) => candidate.assetId === assetId);
  if (!asset) throw new Error('CONTENT_SOCIAL_PUBLISHER_ASSET_NOT_FOUND');

  const approval = findContentSocialApproval(manifest, assetId, channel);
  if (!approval) {
    throw new Error('CONTENT_SOCIAL_PUBLISHER_APPROVAL_REQUIRED');
  }

  return SocialPublisherHandoffSchema.parse({
    contractVersion: CONTENT_SOCIAL_PUBLISHER_ADAPTER_VERSION,
    campaignId: manifest.campaignId,
    contentId: manifest.contentId,
    sourceSha: manifest.sourceSha,
    canonicalUrl: manifest.canonicalUrl,
    assetId,
    assetSha256: asset.sha256,
    approvalRef: approval.approvalRef,
    channel,
    deliveryKey: [
      manifest.campaignId,
      manifest.contentId,
      assetId,
      channel,
    ].join(':'),
  });
}
