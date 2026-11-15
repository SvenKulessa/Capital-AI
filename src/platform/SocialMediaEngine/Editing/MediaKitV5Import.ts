import {
  MEDIA_PROJECT_SCHEMA_VERSION,
  type MediaProjectV2,
  type MediaAssetReference,
} from '../Contracts/MediaProject';
import { validateMediaProjectV2 } from '../Contracts/MediaProjectValidation';
import { createCapitalAiMediaStudioProject } from './MediaStudioTemplates';

/**
 * MediaKit v5 intake is a quarantined draft, not a publishing/approval adapter.
 * Only the actual Social Media Engine can create an approval-bound publisher handoff.
 * In particular, manifest assertions do not verify files or commercial rights.
 */
export const MEDIAKIT_V5_ID = 'CAPITAL-AI-SOCIAL-MEDIA-MEDIAKIT-v5';
export const MEDIAKIT_V5_INTAKE_VERSION = 'CAPITAL_AI_MEDIAKIT_V5_DRAFT_INTAKE@1';

type ClaimedStatus = 'VERIFIED' | 'NOT_PROVEN' | 'BLOCKED';
type MediaKitKind = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
type AssessedStatus = 'NOT_PROVEN' | 'BLOCKED';

export interface MediaKitV5Asset {
  assetId: string;
  kind: MediaKitKind;
  reference: string;
  sha256: string;
  mimeType: string;
  provenance: {
    origin: 'OWNER_CREATED' | 'GENERATED' | 'THIRD_PARTY';
    sourceRef: string;
    evidenceRef?: string;
  };
  sourceRights: { status: ClaimedStatus; evidenceRef?: string };
  mediaRights: { status: ClaimedStatus; evidenceRef?: string };
  reviewStatus: 'REVIEW_REQUIRED' | 'APPROVED' | 'REJECTED';
}

export interface MediaKitV5Manifest {
  kitId: typeof MEDIAKIT_V5_ID;
  manifestRef: string;
  manifestSha256?: string;
  contentId: string;
  title: string;
  slug: string;
  aspectRatio?: '16:9' | '1:1' | '9:16';
  assets: MediaKitV5Asset[];
}

export interface MediaKitV5ReviewAsset {
  assetId: string;
  kind: MediaKitKind;
  sha256: string;
  reference: string;
  provenance: MediaKitV5Asset['provenance'];
  sourceRights: { declared: ClaimedStatus; assessed: AssessedStatus; evidenceRef: string | null };
  mediaRights: { declared: ClaimedStatus; assessed: AssessedStatus; evidenceRef: string | null };
  identityStatus: 'NOT_PROVEN';
  reportedReviewStatus: MediaKitV5Asset['reviewStatus'];
  reviewStatus: 'REVIEW_REQUIRED';
  route: 'MEDIA_PROJECT_ASSET' | 'REVIEW_ONLY';
}

function fail(code: string): never {
  throw new Error('MEDIAKIT_V5_' + code);
}
function record(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code);
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: string[], code: string): void {
  if (Object.keys(value).some((key) => !allowed.includes(key))) fail(code);
}
function required(value: unknown, code: string, max = 500): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\x00-\x1f\x7f]/.test(value)) fail(code);
  return value.trim();
}
function safeReference(value: unknown, code: string): string {
  const ref = required(value, code, 512);
  // The canonical MediaProject contract accepts only opaque/repository-relative refs.
  // Refuse URL schemes, absolute/UNC paths, Windows paths, fragments and encoded traversal.
  if (/^[a-z][\w+.-]*:/i.test(ref) || /^[\/\\]/.test(ref)
      || /[\\%?#]/.test(ref) || ref.split('/').some((part) => part === '..' || part === '.')) fail(code);
  return ref;
}
function hash(value: unknown, code: string): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/i.test(value)) fail(code);
  return value.toLowerCase();
}
function status(value: unknown, code: string): ClaimedStatus {
  if (value !== 'VERIFIED' && value !== 'NOT_PROVEN' && value !== 'BLOCKED') fail(code);
  return value as ClaimedStatus;
}
function evidence(value: unknown, code: string): string | null {
  return value === undefined ? null : required(value, code);
}
function rights(value: unknown, code: string) {
  const r = record(value, code);
  keys(r, ['status', 'evidenceRef'], code);
  const declared = status(r.status, code);
  const evidenceRef = evidence(r.evidenceRef, code);
  // A supplied "VERIFIED" flag/evidence URL is a claim until independently checked.
  const assessed: AssessedStatus = declared === 'BLOCKED' ? 'BLOCKED' : 'NOT_PROVEN';
  return { declared, assessed, evidenceRef };
}
function mimeFor(kind: MediaKitKind, value: unknown): string {
  const mime = required(value, 'MIME_INVALID', 120).toLowerCase();
  const accepted: Record<MediaKitKind, readonly string[]> = {
    IMAGE: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
    VIDEO: ['video/mp4', 'video/webm'],
    AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
    DOCUMENT: ['application/pdf', 'text/plain', 'text/markdown'],
  };
  if (!accepted[kind]?.includes(mime)) fail('KIND_MIME_MISMATCH');
  return mime;
}

export function importMediaKitV5Draft(input: unknown): {
  schema: typeof MEDIAKIT_V5_INTAKE_VERSION;
  kitId: typeof MEDIAKIT_V5_ID;
  publicationState: 'DRAFT_ONLY';
  publicationApproval: false;
  publicPublishAllowed: false;
  reviewStatus: 'REVIEW_REQUIRED';
  approvals: [];
  deliveries: [];
  project: MediaProjectV2;
  reviewAssets: MediaKitV5ReviewAsset[];
} {
  const value = record(input, 'MANIFEST_INVALID');
  keys(value, ['kitId', 'manifestRef', 'manifestSha256', 'contentId', 'title', 'slug', 'aspectRatio', 'assets'], 'MANIFEST_FIELDS_INVALID');
  if (value.kitId !== MEDIAKIT_V5_ID) fail('KIT_VERSION_INVALID');
  const manifestRef = safeReference(value.manifestRef, 'MANIFEST_REF_INVALID');
  const manifestSha256 = value.manifestSha256 === undefined ? null : hash(value.manifestSha256, 'MANIFEST_HASH_INVALID');
  const contentId = required(value.contentId, 'CONTENT_ID_INVALID', 128);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(contentId)) fail('CONTENT_ID_INVALID');
  const title = required(value.title, 'TITLE_INVALID', 240);
  const slug = required(value.slug, 'SLUG_INVALID', 80);
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) fail('SLUG_INVALID');
  if (value.aspectRatio !== undefined && !['16:9', '1:1', '9:16'].includes(String(value.aspectRatio))) fail('ASPECT_INVALID');
  if (!Array.isArray(value.assets) || value.assets.length < 1 || value.assets.length > 50) fail('ASSET_COUNT_INVALID');

  const seen = new Set<string>();
  const mediaAssets: MediaAssetReference[] = [];
  const reviewAssets: MediaKitV5ReviewAsset[] = [];
  for (const entry of value.assets) {
    const asset = record(entry, 'ASSET_INVALID');
    keys(asset, ['assetId', 'kind', 'reference', 'sha256', 'mimeType', 'provenance', 'sourceRights', 'mediaRights', 'reviewStatus'], 'ASSET_FIELDS_INVALID');
    const assetId = required(asset.assetId, 'ASSET_ID_INVALID', 128);
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(assetId) || seen.has(assetId)) fail('ASSET_ID_INVALID');
    seen.add(assetId);
    if (!['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT'].includes(String(asset.kind))) fail('ASSET_KIND_INVALID');
    const kind = asset.kind as MediaKitKind;
    const reference = safeReference(asset.reference, 'ASSET_REFERENCE_INVALID');
    const sha256 = hash(asset.sha256, 'ASSET_HASH_INVALID');
    const mimeType = mimeFor(kind, asset.mimeType);
    const p = record(asset.provenance, 'PROVENANCE_INVALID');
    keys(p, ['origin', 'sourceRef', 'evidenceRef'], 'PROVENANCE_FIELDS_INVALID');
    if (!['OWNER_CREATED', 'GENERATED', 'THIRD_PARTY'].includes(String(p.origin))) fail('PROVENANCE_ORIGIN_INVALID');
    const provenance = {
      origin: p.origin as MediaKitV5Asset['provenance']['origin'],
      sourceRef: required(p.sourceRef, 'PROVENANCE_SOURCE_INVALID'),
      ...(p.evidenceRef !== undefined ? { evidenceRef: required(p.evidenceRef, 'PROVENANCE_EVIDENCE_INVALID') } : {}),
    };
    const sourceRights = rights(asset.sourceRights, 'SOURCE_RIGHTS_INVALID');
    const mediaRights = rights(asset.mediaRights, 'MEDIA_RIGHTS_INVALID');
    if (!['REVIEW_REQUIRED', 'APPROVED', 'REJECTED'].includes(String(asset.reviewStatus))) fail('REVIEW_STATUS_INVALID');
    const route = kind === 'DOCUMENT' ? 'REVIEW_ONLY' as const : 'MEDIA_PROJECT_ASSET' as const;
    reviewAssets.push({
      assetId, kind, sha256, reference, provenance, sourceRights, mediaRights,
      identityStatus: 'NOT_PROVEN', reportedReviewStatus: asset.reviewStatus as MediaKitV5Asset['reviewStatus'],
      reviewStatus: 'REVIEW_REQUIRED', route,
    });
    if (route === 'MEDIA_PROJECT_ASSET') {
      mediaAssets.push({
        id: assetId,
        kind: kind.toLowerCase() as MediaAssetReference['kind'],
        sourceType: 'asset-registry', reference, sha256, mimeType,
        metadata: {
          intake: MEDIAKIT_V5_INTAKE_VERSION,
          verifiedBytes: false,
          reviewStatus: 'REVIEW_REQUIRED',
          sourceRightsStatus: sourceRights.assessed,
          mediaRightsStatus: mediaRights.assessed,
          provenanceOrigin: provenance.origin,
          provenanceSourceRef: provenance.sourceRef,
          provenanceEvidenceRef: provenance.evidenceRef ?? null,
          sourceRightsEvidenceRef: sourceRights.evidenceRef,
          mediaRightsEvidenceRef: mediaRights.evidenceRef,
        },
      });
    }
  }

  const project = createCapitalAiMediaStudioProject({
    title, slug, aspectRatio: (value.aspectRatio ?? '1:1') as '16:9' | '1:1' | '9:16',
  });
  project.projectId = 'mediakit-v5-' + slug;
  project.contentPackageId = contentId;
  project.source = { type: 'content-package', reference: manifestRef, ...(manifestSha256 ? { sha256: manifestSha256 } : {}) };
  project.assets = mediaAssets;

  // Disabled preview layers ensure unknown bytes and external content never render by default.
  const imageAssets = mediaAssets.filter((asset) => asset.kind === 'image');
  project.durationFrames = Math.max(project.durationFrames, imageAssets.length * 30);
  if (imageAssets.length) {
    project.tracks.push({
      id: 'mediakit-v5-images',
      kind: 'video',
      enabled: false,
      layers: imageAssets.map((asset, index) => ({
        id: 'mediakit-v5-image-' + String(index + 1),
        kind: 'image' as const,
        enabled: false,
        assetRefId: asset.id,
        fit: 'contain' as const,
        range: { startFrame: index * 30, durationFrames: 30 },
      })),
    });
  }
  project.metadata = {
    ...project.metadata,
    kitId: MEDIAKIT_V5_ID,
    intakeSchema: MEDIAKIT_V5_INTAKE_VERSION,
    draftOnly: true,
    publicationApproval: false,
    publicPublishAllowed: false,
    reviewStatus: 'REVIEW_REQUIRED',
    sourceManifestSha256: manifestSha256,
    importedAssetCount: reviewAssets.length,
    unverifiedBytes: true,
  };
  if (!validateMediaProjectV2(project).ok || project.schemaVersion !== MEDIA_PROJECT_SCHEMA_VERSION) {
    fail('MEDIA_PROJECT_INVALID');
  }
  return {
    schema: MEDIAKIT_V5_INTAKE_VERSION,
    kitId: MEDIAKIT_V5_ID,
    publicationState: 'DRAFT_ONLY',
    publicationApproval: false,
    publicPublishAllowed: false,
    reviewStatus: 'REVIEW_REQUIRED',
    approvals: [],
    deliveries: [],
    project,
    reviewAssets,
  };
}
