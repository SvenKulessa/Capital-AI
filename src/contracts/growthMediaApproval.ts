import { z } from 'zod';

export const GROWTH_MEDIA_APPROVAL_POLICY_VERSION = 'GROWTH_MEDIA_APPROVAL_POLICY@1' as const;

export const GrowthMediaCapabilitySchema = z.enum([
  'IMAGE_GENERATION',
  'TTS',
  'VIDEO_GENERATION',
]);

export const GrowthVoiceModeSchema = z.enum([
  'PREDEFINED',
  'DESIGNED',
  'REPLICATED',
]);

export const GrowthMediaApprovalSchema = z.object({
  policyVersion: z.literal(GROWTH_MEDIA_APPROVAL_POLICY_VERSION),
  capability: GrowthMediaCapabilitySchema,
  socialEngineGateRef: z.string().min(1),
  sourceRightsEvidenceRef: z.string().min(1),
  outputCommercialUseEvidenceRef: z.string().min(1),
  brandApprovalRef: z.string().min(1),
  claimApprovalRefs: z.array(z.string().min(1)).max(20),
  inputAssetHashes: z.array(z.string().regex(/^[a-f0-9]{64}$/)).max(20),
  draftOnly: z.literal(true),
  publicPublishAllowed: z.literal(false),
  voice: z.object({
    mode: GrowthVoiceModeSchema,
    voiceId: z.string().min(1).max(200),
    consentEvidenceRef: z.string().min(1).optional(),
    revocationCheckedAt: z.string().datetime().optional(),
  }).strict().optional(),
}).strict();

export type GrowthMediaApproval = z.infer<typeof GrowthMediaApprovalSchema>;

export function assertGrowthMediaApproval(
  raw: unknown,
  capability: z.infer<typeof GrowthMediaCapabilitySchema>,
): GrowthMediaApproval {
  const approval = GrowthMediaApprovalSchema.parse(raw);
  if (approval.capability !== capability) {
    throw new Error('GROWTH_MEDIA_CAPABILITY_APPROVAL_MISMATCH');
  }

  if (capability === 'TTS') {
    if (!approval.voice) throw new Error('GROWTH_TTS_VOICE_APPROVAL_REQUIRED');
    if (approval.voice.mode === 'REPLICATED' || approval.voice.mode === 'DESIGNED') {
      if (!approval.voice.consentEvidenceRef || !approval.voice.revocationCheckedAt) {
        throw new Error('GROWTH_TTS_VOICE_CONSENT_REQUIRED');
      }
    }
  }

  return approval;
}

export const GrowthGeneratedAssetEvidenceSchema = z.object({
  policyVersion: z.literal(GROWTH_MEDIA_APPROVAL_POLICY_VERSION),
  capability: GrowthMediaCapabilitySchema,
  provider: z.literal('GEMINI'),
  model: z.string().min(1).max(100),
  mimeType: z.string().min(1).max(100),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  approvalRef: z.string().min(1),
  sourceRightsEvidenceRef: z.string().min(1),
  outputCommercialUseEvidenceRef: z.string().min(1),
  brandApprovalRef: z.string().min(1),
  generatedAt: z.string().datetime(),
  draftOnly: z.literal(true),
}).strict();

export type GrowthGeneratedAssetEvidence = z.infer<typeof GrowthGeneratedAssetEvidenceSchema>;
