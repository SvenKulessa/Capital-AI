/**
 * SOCIAL_MEDIA_ENGINE / GROWTH — text/image-only editorial review projection.
 * Pure planning: it never creates delivery jobs, marks posts SCHEDULED or publishes.
 */
import { z } from 'zod';
import { ContentSocialPackageManifestSchema, findContentSocialApproval, type ContentSocialPackageManifest } from './contentSocialPackage.ts';
import { CURRENT_SOCIAL_PUBLISHER_ADAPTERS, SocialPublisherChannelSchema } from './socialPublisherAdapter.ts';

export const SOCIAL_NON_AUDIO_REVIEW_VERSION = 'CAPITAL_AI_SOCIAL_NON_AUDIO_REVIEW@1' as const;
export const SocialReviewRequestSchema = z.strictObject({
  channel: SocialPublisherChannelSchema,
  assetId: z.string().min(1).max(200),
  plannedFor: z.string().datetime({ offset: true }).nullable(),
});
export type SocialReviewRequest = z.infer<typeof SocialReviewRequestSchema>;
type ReviewState = 'APPROVAL_REQUIRED' | 'PROVIDER_INTEGRATION_PENDING' | 'HUMAN_APPROVED_REVIEW_ONLY';

export function planNonAudioSocialReview(
  input: { manifest: ContentSocialPackageManifest; requests: readonly SocialReviewRequest[]; now: string },
) {
  const manifest = ContentSocialPackageManifestSchema.parse(input.manifest);
  const requests = z.array(SocialReviewRequestSchema).min(1).max(100).parse(input.requests);
  const now = Date.parse(input.now);
  if (!Number.isFinite(now)) throw new Error('SOCIAL_REVIEW_INVALID_CLOCK');
  if (!manifest.canonicalUrl.startsWith('https://')) throw new Error('SOCIAL_REVIEW_HTTPS_CANONICAL_REQUIRED');
  const seen = new Set<string>();
  const items = requests.map((request) => {
    const key = request.channel + ':' + request.assetId;
    if (seen.has(key)) throw new Error('SOCIAL_REVIEW_DUPLICATE_REQUEST');
    seen.add(key);
    const asset = manifest.assets.find(a => a.assetId === request.assetId);
    if (!asset) throw new Error('SOCIAL_REVIEW_ASSET_NOT_FOUND');
    if (asset.kind !== 'TEXT' && asset.kind !== 'IMAGE') throw new Error('SOCIAL_REVIEW_AUDIO_VIDEO_DEFERRED');
    if ((asset.kind === 'TEXT' && asset.mimeType !== 'text/plain')
      || (asset.kind === 'IMAGE' && !['image/png', 'image/jpeg', 'image/webp'].includes(asset.mimeType))) {
      throw new Error('SOCIAL_REVIEW_MEDIA_TYPE_NOT_ALLOWED');
    }
    if (request.plannedFor) {
      const scheduled = Date.parse(request.plannedFor);
      if (!Number.isFinite(scheduled) || scheduled <= now || scheduled > now + 90 * 86400_000) {
        throw new Error('SOCIAL_REVIEW_PLANNED_TIME_INVALID');
      }
    }
    const approval = findContentSocialApproval(manifest, request.assetId, request.channel);
    const state: ReviewState = !approval
      ? 'APPROVAL_REQUIRED'
      : CURRENT_SOCIAL_PUBLISHER_ADAPTERS[request.channel] !== 'READY'
        ? 'PROVIDER_INTEGRATION_PENDING'
        : 'HUMAN_APPROVED_REVIEW_ONLY';
    return Object.freeze({
      channel: request.channel,
      assetId: asset.assetId,
      kind: asset.kind,
      assetSha256: asset.sha256,
      sourceSha: manifest.sourceSha,
      plannedFor: request.plannedFor,
      approvalRef: approval?.approvalRef ?? null,
      state,
      publishingAuthorized: false as const,
      deliveryState: 'DRAFT' as const,
    });
  });
  return Object.freeze({
    contractVersion: SOCIAL_NON_AUDIO_REVIEW_VERSION,
    publicationAuthority: 'SOCIAL_MEDIA_ENGINE_ONLY' as const,
    campaignId: manifest.campaignId,
    contentId: manifest.contentId,
    canonicalUrl: manifest.canonicalUrl,
    sourceSha: manifest.sourceSha,
    items: Object.freeze(items),
    publishingAuthorized: false as const,
  });
}
