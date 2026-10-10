import { z } from 'zod';
import { assessCadsContentCampaign } from '../../packages/benchmark-core/growth-quality.mjs';
import {
  getGrowthCapabilityPolicy,
  type GrowthCapability,
  type GrowthMarketingChannel,
} from './growthAiPromotion.ts';

export const CONTENT_ENGINE_CONTRACT_VERSION = 'CAPITAL_AI_CONTENT_ENGINE@1' as const;

export const ContentEngineModuleIdSchema = z.enum([
  'COPY',
  'URL_CONTEXT',
  'IMAGE',
  'TTS',
  'VIDEO',
  'DISCOVERY',
  'ENRICHMENT',
  'ATTRIBUTION',
  'PUBLISHER',
]);
export type ContentEngineModuleId = z.infer<typeof ContentEngineModuleIdSchema>;

export const ContentEngineOutputSchema = z.enum([
  'TEXT',
  'IMAGE',
  'AUDIO',
  'VIDEO',
  'DISCOVERY',
  'ANALYTICS',
]);
export type ContentEngineOutput = z.infer<typeof ContentEngineOutputSchema>;

const CAPABILITY_BY_MODULE: Partial<Record<ContentEngineModuleId, GrowthCapability>> = {
  COPY: 'CONTENT_DRAFTING',
  URL_CONTEXT: 'URL_CONTEXT',
  IMAGE: 'IMAGE_GENERATION',
  TTS: 'TTS',
  VIDEO: 'VIDEO_GENERATION',
  DISCOVERY: 'LEAD_DISCOVERY',
  ENRICHMENT: 'BUSINESS_LEAD_ENRICHMENT',
  ATTRIBUTION: 'ANALYTICS',
};

export const ContentCampaignBriefSchema = z.object({
  campaignId: z.string().min(1).max(160),
  productId: z.string().min(1).max(120),
  sourceSha: z.string().regex(/^[a-f0-9]{40,64}$/),
  canonicalUrl: z.string().url(),
  locale: z.enum(['de-DE', 'en-US', 'en-GB']).default('de-DE'),
  objective: z.string().min(1).max(500),
  audience: z.array(z.string().min(1).max(200)).min(1).max(10),
  channels: z.array(z.enum([
    'WEBSITE', 'LINKEDIN', 'YOUTUBE', 'MASTODON', 'REDDIT', 'PODCAST', 'EMAIL',
  ])).min(1).max(7),
  outputs: z.array(ContentEngineOutputSchema).min(1),
  sourceUrls: z.array(z.string().url()).max(12).default([]),
}).strict();
export type ContentCampaignBrief = z.infer<typeof ContentCampaignBriefSchema>;

export const ContentEngineModulePlanSchema = z.object({
  module: ContentEngineModuleIdSchema,
  capability: z.string().nullable(),
  state: z.enum(['READY_FOR_DRAFT', 'RESTRICTED', 'BLOCKED', 'INTEGRATION_PENDING']),
  productionEligible: z.boolean(),
  reason: z.string().min(1),
}).strict();
export type ContentEngineModulePlan = z.infer<typeof ContentEngineModulePlanSchema>;

export const ContentEnginePlanSchema = z.object({
  contractVersion: z.literal(CONTENT_ENGINE_CONTRACT_VERSION),
  campaign: ContentCampaignBriefSchema,
  modules: z.array(ContentEngineModulePlanSchema),
  cadsQuality: z.object({
    schemaVersion: z.literal('CAPITAL_AI_CADS_GROWTH_QUALITY@1'),
    benchmarkEvidenceSchema: z.literal('CAPITAL_AI_BENCHMARK_EVIDENCE@1'),
    profile: z.literal('CONTENT_ENGINE_DRAFT'),
    technicalStatus: z.enum(['PASS','FAIL']),
    checks: z.array(z.object({
      code: z.string(),
      status: z.enum(['PASS','FAIL']),
    }).strict()),
    editorialReview: z.literal('REVIEW_REQUIRED'),
    actualAssetBytes: z.literal('NOT_PROVEN'),
    providerRights: z.literal('NOT_PROVEN'),
    productionApproval: z.literal(false),
    securityApproval: z.literal(false),
    licenseApproval: z.literal(false),
    publicationApproval: z.literal(false),
    customerPurchaseApproval: z.literal(false),
  }).strict(),

  publication: z.object({
    adapter: z.literal('SOCIAL_MEDIA_ENGINE'),
    state: z.literal('INTEGRATION_PENDING'),
    publicPublishAllowed: z.literal(false),
  }).strict(),
}).strict();
export type ContentEnginePlan = z.infer<typeof ContentEnginePlanSchema>;

function moduleState(module: ContentEngineModuleId): ContentEngineModulePlan {
  if (module === 'PUBLISHER') {
    return {
      module,
      capability: null,
      state: 'INTEGRATION_PENDING',
      productionEligible: false,
      reason: 'Social Media Engine publisher adapter is intentionally separate until the migration/cutover is complete.',
    };
  }

  const capability = CAPABILITY_BY_MODULE[module];
  if (!capability) {
    return {
      module,
      capability: null,
      state: 'INTEGRATION_PENDING',
      productionEligible: false,
      reason: 'No runtime capability is bound yet.',
    };
  }

  const policy = getGrowthCapabilityPolicy(capability);
  const state =
    policy.state === 'BLOCKED'
      ? 'BLOCKED'
      : policy.state === 'ADMITTED'
        ? 'READY_FOR_DRAFT'
        : 'RESTRICTED';

  return {
    module,
    capability,
    state,
    productionEligible: policy.productionEligible,
    reason: policy.restrictions[0] ?? 'Capability policy applies.',
  };
}

export function planContentCampaign(rawBrief: unknown): ContentEnginePlan {
  const campaign = ContentCampaignBriefSchema.parse(rawBrief);
  const cadsQuality = assessCadsContentCampaign(campaign);
  if (cadsQuality.technicalStatus !== 'PASS') {
    throw new Error('CADS_CONTENT_IDENTITY_REJECTED');
  }

  const modules = new Set<ContentEngineModuleId>(['COPY']);

  if (campaign.sourceUrls.length > 0) modules.add('URL_CONTEXT');
  if (campaign.outputs.includes('IMAGE')) modules.add('IMAGE');
  if (campaign.outputs.includes('AUDIO')) modules.add('TTS');
  if (campaign.outputs.includes('VIDEO')) modules.add('VIDEO');
  if (campaign.outputs.includes('DISCOVERY')) {
    modules.add('DISCOVERY');
    modules.add('ENRICHMENT');
  }
  if (campaign.outputs.includes('ANALYTICS')) modules.add('ATTRIBUTION');

  modules.add('PUBLISHER');

  return ContentEnginePlanSchema.parse({
    contractVersion: CONTENT_ENGINE_CONTRACT_VERSION,
    campaign,
    modules: [...modules].map(moduleState),
    cadsQuality,
    publication: {
      adapter: 'SOCIAL_MEDIA_ENGINE',
      state: 'INTEGRATION_PENDING',
      publicPublishAllowed: false,
    },
  });
}

export function channelsForCampaign(plan: ContentEnginePlan): readonly GrowthMarketingChannel[] {
  return plan.campaign.channels;
}
