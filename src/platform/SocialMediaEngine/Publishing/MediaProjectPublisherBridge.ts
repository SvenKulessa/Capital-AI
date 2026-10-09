import { assessCadsMediaProject, assessCadsAssetIdentity } from '../../../../packages/benchmark-core/growth-quality.mjs';
import {
  type MediaProjectV2,
} from '../Contracts/MediaProject';
import { validateMediaProjectV2 } from '../Contracts/MediaProjectValidation';
import {
  ContentSocialAssetSchema,
  type ContentSocialAsset,
  type ContentSocialPackageManifest,
} from '../../../contracts/contentSocialPackage.ts';
import {
  buildSocialPublisherHandoff,
  CURRENT_SOCIAL_PUBLISHER_ADAPTERS,
  type SocialPublisherAdapterState,
  type SocialPublisherChannel,
  type SocialPublisherHandoff,
} from '../../../contracts/socialPublisherAdapter.ts';

const SHA256 = /^[a-f0-9]{64}$/;
const SOURCE_SHA = /^[a-f0-9]{40,64}$/;

export interface RenderedMediaAssetIdentity {
  assetId: string;
  sha256: string;
  mimeType: string;
  evidenceRef: string;
}

function requiredText(value: string, code: string, max = 500): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > max) throw new Error(code);
  return normalized;
}

function socialKindForMime(mimeType: string): 'IMAGE' | 'VIDEO' {
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  throw new Error('SOCIAL_MEDIA_PROJECT_AUDIO_NOT_ACTIVE');
}

export function buildContentSocialAssetFromMediaProject(input: {
  project: MediaProjectV2;
  contentId: string;
  sourceSha: string;
  renderedAsset: RenderedMediaAssetIdentity;
}): ContentSocialAsset {
  const validation = validateMediaProjectV2(input.project);
  if (!validation.ok) throw new Error('SOCIAL_MEDIA_PROJECT_INVALID');
  if (input.project.renderRecipe.publishReady !== false) {
    throw new Error('SOCIAL_MEDIA_PROJECT_PUBLISH_AUTHORITY_FORBIDDEN');
  }
  const quality = assessCadsMediaProject(input.project);
  if (quality.technicalStatus !== 'PASS') {
    throw new Error('CADS_SOCIAL_MEDIA_DRAFT_QUALITY_FAILED');
  }


  const contentId = requiredText(input.contentId, 'SOCIAL_MEDIA_CONTENT_ID_REQUIRED', 200);
  if (input.project.contentPackageId && input.project.contentPackageId !== contentId) {
    throw new Error('SOCIAL_MEDIA_CONTENT_ID_MISMATCH');
  }

  const sourceSha = input.sourceSha.toLowerCase();
  if (!SOURCE_SHA.test(sourceSha)) throw new Error('SOCIAL_MEDIA_SOURCE_SHA_INVALID');

  const sha256 = input.renderedAsset.sha256.toLowerCase();
  if (!SHA256.test(sha256)) throw new Error('SOCIAL_MEDIA_ASSET_SHA_INVALID');

  const mimeType = requiredText(
    input.renderedAsset.mimeType,
    'SOCIAL_MEDIA_ASSET_MIME_REQUIRED',
    120,
  ).toLowerCase();

  const asset = ContentSocialAssetSchema.parse({
    assetId: requiredText(input.renderedAsset.assetId, 'SOCIAL_MEDIA_ASSET_ID_REQUIRED', 200),
    contentId,
    kind: socialKindForMime(mimeType),
    sha256,
    mimeType,
    evidenceRef: requiredText(
      input.renderedAsset.evidenceRef,
      'SOCIAL_MEDIA_ASSET_EVIDENCE_REQUIRED',
      500,
    ),
    sourceSha,
  });
  const assetQuality = assessCadsAssetIdentity(asset, { sourceSha, contentId });
  if (assetQuality.technicalStatus !== 'PASS') {
    throw new Error('CADS_SOCIAL_MEDIA_ASSET_IDENTITY_FAILED');
  }
  return asset;
}

export function buildMediaProjectPublisherHandoff(input: {
  project: MediaProjectV2;
  manifest: ContentSocialPackageManifest;
  channel: SocialPublisherChannel;
  assetId: string;
  adapterStates?: Readonly<Record<SocialPublisherChannel, SocialPublisherAdapterState>>;
}): SocialPublisherHandoff {
  const validation = validateMediaProjectV2(input.project);
  if (!validation.ok) throw new Error('SOCIAL_MEDIA_PROJECT_INVALID');
  if (input.project.renderRecipe.publishReady !== false) {
    throw new Error('SOCIAL_MEDIA_PROJECT_PUBLISH_AUTHORITY_FORBIDDEN');
  }
  if (assessCadsMediaProject(input.project).technicalStatus !== 'PASS') {
    throw new Error('CADS_SOCIAL_MEDIA_DRAFT_QUALITY_FAILED');
  }
  if (input.project.contentPackageId && input.project.contentPackageId !== input.manifest.contentId) {
    throw new Error('SOCIAL_MEDIA_PROJECT_MANIFEST_IDENTITY_MISMATCH');
  }

  return buildSocialPublisherHandoff(
    input.manifest,
    input.channel,
    input.assetId,
    input.adapterStates ?? CURRENT_SOCIAL_PUBLISHER_ADAPTERS,
  );
}
