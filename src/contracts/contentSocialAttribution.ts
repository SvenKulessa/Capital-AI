import {
  GrowthAttributionEventSchema,
  type GrowthAttributionEvent
} from './growthAttribution.ts';
import {
  ContentSocialPackageManifestSchema,
  type ContentSocialPackageManifest,
} from './contentSocialPackage.ts';
import { SocialPublisherChannelSchema, type SocialPublisherChannel } from './socialPublisherAdapter.ts';

export function buildSocialDeliveryAttribution(input: {
  manifest: ContentSocialPackageManifest;
  channel: SocialPublisherChannel;
  providerDeliveryId: string;
  occurredAt: string;
  evidenceRef: string;
  metrics: GrowthAttributionEvent['metrics'];
}): GrowthAttributionEvent {
  const manifest = ContentSocialPackageManifestSchema.parse(input.manifest);
  const channel = SocialPublisherChannelSchema.parse(input.channel);
  const providerDeliveryId = input.providerDeliveryId.trim();

  if (!providerDeliveryId) {
    throw new Error('CONTENT_SOCIAL_ATTRIBUTION_PROVIDER_ID_REQUIRED');
  }

  return GrowthAttributionEventSchema.parse({
    policyVersion: 'GROWTH_ATTRIBUTION_POLICY@1',
    source: 'SOCIAL_PROVIDER',
    canonicalUrl: manifest.canonicalUrl,
    occurredAt: input.occurredAt,
    campaignId: manifest.campaignId,
    contentId: manifest.contentId,
    providerEntityId: `${channel}:${providerDeliveryId}`,
    evidenceRef: input.evidenceRef,
    metrics: input.metrics,
  });
}
