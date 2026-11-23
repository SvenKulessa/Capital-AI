import { z } from 'zod';

export const ORIGINAL_GRAPHIC_LICENSE_VERSION = 'CAPITAL_AI_ORIGINAL_GRAPHIC_LICENSE@1' as const;
export const ORIGINAL_GRAPHIC_LICENSE_ID = 'LicenseRef-CapitalAI-Owned' as const;

export const OriginalGraphicChannelSchema = z.enum([
  'WEBSITE', 'LINKEDIN', 'YOUTUBE', 'REDDIT', 'PODCAST', 'EMAIL',
  'TIKTOK', 'INSTAGRAM', 'X', 'FACEBOOK', 'MASTODON',
]);
export type OriginalGraphicChannel = z.infer<typeof OriginalGraphicChannelSchema>;

const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const boundedText = (max: number) => z.string().trim().min(1).max(max)
  .refine(value => !/[\u0000-\u001f\u007f<>]/.test(value), 'Invalid graphic metadata');

/** Actual output bytes are hashed by the offline renderer before this contract is called. */
export const OriginalGraphicAssetSchema = z.object({
  assetId: boundedText(200),
  contentId: boundedText(200),
  sha256,
  mimeType: z.enum(['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp']),
  sourceSha: z.string().regex(/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/),
  sourceDigest: sha256,
  contentDigest: sha256,
  origin: z.enum(['FIRST_PARTY_TEMPLATE', 'THIRD_PARTY_ASSET', 'MIXED_ASSET']),
  creationMethod: z.enum(['AI_ASSISTED', 'HUMAN_AUTHORED']),
  renderer: z.object({ id: boundedText(120), version: boundedText(120) }).strict(),
  thirdPartyAssets: z.boolean(),
}).strict();
export type OriginalGraphicAsset = z.infer<typeof OriginalGraphicAssetSchema>;

/**
 * Supply this record from a trusted Owner decision separately from candidate metadata.
 * Parsing an OWNER field does not establish identity or grant authority.
 */
export const OriginalGraphicOwnerGrantSchema = z.object({
  contractVersion: z.literal(ORIGINAL_GRAPHIC_LICENSE_VERSION),
  grantId: boundedText(200),
  grantedBy: z.literal('OWNER'),
  ownerName: boundedText(200),
  authorizationEvidenceRef: boundedText(500),
  authorizedAt: z.string().datetime({ offset: true }),
  decision: z.enum(['LICENSED', 'REVOKED']),
  licenseId: z.literal(ORIGINAL_GRAPHIC_LICENSE_ID),
  asset: OriginalGraphicAssetSchema,
  allowedChannels: z.array(OriginalGraphicChannelSchema).min(1).max(10)
    .refine(channels => new Set(channels).size === channels.length, 'Duplicate license channel'),
  aiAssistanceDisclosed: z.boolean(),
}).strict();
export type OriginalGraphicOwnerGrant = z.infer<typeof OriginalGraphicOwnerGrantSchema>;

export const OriginalGraphicLicensePlanSchema = z.object({
  contractVersion: z.literal(ORIGINAL_GRAPHIC_LICENSE_VERSION),
  assetId: z.string(),
  assetSha256: sha256,
  channel: OriginalGraphicChannelSchema,
  state: z.enum(['LICENSED_FOR_CHANNEL', 'REVIEW_REQUIRED', 'BLOCKED']),
  reason: z.enum([
    'MATCHED_OWNER_GRANT', 'OWNER_GRANT_REQUIRED', 'OWNER_GRANT_INVALID',
    'OWNER_GRANT_REVOKED', 'ASSET_BINDING_MISMATCH', 'CHANNEL_NOT_LICENSED',
    'THIRD_PARTY_RIGHTS_REQUIRED', 'AI_DISCLOSURE_REQUIRED',
  ]),
  graphicUseAllowed: z.boolean(),
  licenseId: z.literal(ORIGINAL_GRAPHIC_LICENSE_ID).nullable(),
  grantRef: z.string().nullable(),
  authorizationEvidenceRef: z.string().nullable(),
  rightsHolder: z.string().nullable(),
  sourceRights: z.literal('NOT_PROVEN'),
  editorialReview: z.literal('REVIEW_REQUIRED'),
  publicationAllowed: z.literal(false),
}).strict();
export type OriginalGraphicLicensePlan = z.infer<typeof OriginalGraphicLicensePlanSchema>;

export function planOriginalGraphicLicense(
  input: { asset: OriginalGraphicAsset; channel: OriginalGraphicChannel; asOf?: string },
  trustedOwnerGrant?: OriginalGraphicOwnerGrant,
): OriginalGraphicLicensePlan {
  const asset = OriginalGraphicAssetSchema.parse(input.asset);
  const channel = OriginalGraphicChannelSchema.parse(input.channel);
  const result = {
    contractVersion: ORIGINAL_GRAPHIC_LICENSE_VERSION,
    assetId: asset.assetId,
    assetSha256: asset.sha256,
    channel,
    state: 'REVIEW_REQUIRED' as OriginalGraphicLicensePlan['state'],
    reason: 'OWNER_GRANT_REQUIRED' as OriginalGraphicLicensePlan['reason'],
    graphicUseAllowed: false,
    licenseId: null as typeof ORIGINAL_GRAPHIC_LICENSE_ID | null,
    grantRef: null as string | null,
    authorizationEvidenceRef: null as string | null,
    rightsHolder: null as string | null,
    sourceRights: 'NOT_PROVEN' as const,
    editorialReview: 'REVIEW_REQUIRED' as const,
    publicationAllowed: false as const,
  };
  if (asset.origin !== 'FIRST_PARTY_TEMPLATE' || asset.thirdPartyAssets) {
    return { ...result, state: 'BLOCKED', reason: 'THIRD_PARTY_RIGHTS_REQUIRED' };
  }
  if (!trustedOwnerGrant) return result;
  const parsed = OriginalGraphicOwnerGrantSchema.safeParse(trustedOwnerGrant);
  if (!parsed.success) return { ...result, reason: 'OWNER_GRANT_INVALID' };
  const grant = parsed.data;
  const reviewTime = Date.parse(input.asOf ?? new Date().toISOString());
  if (!Number.isFinite(reviewTime) || Date.parse(grant.authorizedAt) > reviewTime) {
    return { ...result, reason: 'OWNER_GRANT_INVALID' };
  }
  if (grant.decision === 'REVOKED') return { ...result, state: 'BLOCKED', reason: 'OWNER_GRANT_REVOKED' };
  if (JSON.stringify(grant.asset) !== JSON.stringify(asset)) {
    return { ...result, reason: 'ASSET_BINDING_MISMATCH' };
  }
  if (!grant.allowedChannels.includes(channel)) return { ...result, reason: 'CHANNEL_NOT_LICENSED' };
  if (asset.creationMethod === 'AI_ASSISTED' && !grant.aiAssistanceDisclosed) {
    return { ...result, reason: 'AI_DISCLOSURE_REQUIRED' };
  }
  return {
    ...result,
    state: 'LICENSED_FOR_CHANNEL',
    reason: 'MATCHED_OWNER_GRANT',
    graphicUseAllowed: true,
    licenseId: grant.licenseId,
    grantRef: grant.grantId,
    authorizationEvidenceRef: grant.authorizationEvidenceRef,
    rightsHolder: grant.ownerName,
  };
}
