import { z } from 'zod';

export const GROWTH_AI_PROMOTION_POLICY_VERSION = 'GROWTH_AI_PROMOTION_POLICY@1' as const;

export const GrowthRuntimeModeSchema = z.enum([
  'READ_ONLY',
  'DRAFT',
  'DISCOVERY',
  'PUBLISH',
]);
export type GrowthRuntimeMode = z.infer<typeof GrowthRuntimeModeSchema>;

export const GrowthCapabilitySchema = z.enum([
  'CONTENT_DRAFTING',
  'URL_CONTEXT',
  'SEARCH_GROUNDING',
  'IMAGE_GENERATION',
  'TTS',
  'VIDEO_GENERATION',
  'BUSINESS_LEAD_ENRICHMENT',
  'LEAD_DISCOVERY',
  'OUTREACH_DELIVERY',
  'ANALYTICS',
]);
export type GrowthCapability = z.infer<typeof GrowthCapabilitySchema>;

export const GrowthProviderSchema = z.enum([
  'GEMINI',
  'GOOGLE_API',
  'OSS',
  'INTERNAL',
]);
export type GrowthProvider = z.infer<typeof GrowthProviderSchema>;

export const GrowthCapabilityStateSchema = z.enum([
  'ADMITTED',
  'RESTRICTED',
  'BLOCKED',
  'CANDIDATE',
]);
export type GrowthCapabilityState = z.infer<typeof GrowthCapabilityStateSchema>;

export type GrowthCapabilityPolicy = {
  provider: GrowthProvider;
  state: GrowthCapabilityState;
  allowedModes: readonly GrowthRuntimeMode[];
  productionEligible: boolean;
  interactiveOnly?: boolean;
  persistProviderOutput?: boolean;
  leadDiscoveryAllowed?: boolean;
  modelHint?: string;
  restrictions: readonly string[];
};

export const GROWTH_AI_CAPABILITY_POLICY: Readonly<Record<GrowthCapability, GrowthCapabilityPolicy>> = {
  CONTENT_DRAFTING: {
    provider: 'GEMINI',
    state: 'ADMITTED',
    allowedModes: ['DRAFT'],
    productionEligible: true,
    modelHint: 'gemini-3.8-flash',
    restrictions: [
      'server-side paid Gemini service for EEA-facing production clients',
      'all model output must pass strict schema validation before use',
      'financial, regulatory and performance claims require explicit evidence',
      'generated copy is a draft and never grants publication authority',
    ],
  },
  URL_CONTEXT: {
    provider: 'GEMINI',
    state: 'RESTRICTED',
    allowedModes: ['READ_ONLY', 'DRAFT'],
    productionEligible: true,
    interactiveOnly: false,
    persistProviderOutput: false,
    leadDiscoveryAllowed: false,
    restrictions: [
      'only use explicitly supplied or policy-admitted URLs',
      'do not turn URL Context into an autonomous prospect harvester',
      'persist only CAPITAL-AI-owned normalized facts that are independently permitted',
      'preserve source URL and retrieval provenance for every normalized fact',
    ],
  },
  SEARCH_GROUNDING: {
    provider: 'GEMINI',
    state: 'RESTRICTED',
    allowedModes: ['READ_ONLY', 'DRAFT'],
    productionEligible: true,
    interactiveOnly: true,
    persistProviderOutput: false,
    leadDiscoveryAllowed: false,
    restrictions: [
      'Google grounded results are for the end user who initiated the prompt',
      'do not cache, index, syndicate, resell or analyze grounded results as a lead corpus',
      'do not programmatically collect grounded links to identify crawl targets',
      'render required Google search suggestions and citations when used in an interactive response',
    ],
  },
  IMAGE_GENERATION: {
    provider: 'GEMINI',
    state: 'ADMITTED',
    allowedModes: ['DRAFT'],
    productionEligible: true,
    modelHint: 'gemini-3.1-flash-image',
    restrictions: [
      'use only rights-cleared input assets and CAPITAL-AI branding references',
      'generated marketing assets require brand, rights and claim review before publication',
      'store immutable output hash and generation provenance before approval',
      'never fabricate testimonials, certifications, balances or performance evidence',
    ],
  },
  TTS: {
    provider: 'GEMINI',
    state: 'ADMITTED',
    allowedModes: ['DRAFT'],
    productionEligible: true,
    modelHint: 'gemini-3.8-flash-tts',
    restrictions: [
      'voice replication requires documented consent and revocation handling',
      'audio output requires immutable hash and approval binding before publication',
      'no impersonation or synthetic customer testimonial',
    ],
  },
  VIDEO_GENERATION: {
    provider: 'GEMINI',
    state: 'RESTRICTED',
    allowedModes: ['DRAFT'],
    productionEligible: false,
    modelHint: 'veo-3.1',
    restrictions: [
      'draft-only until current model status, pricing and production terms are explicitly admitted',
      'generation cost requires the existing owner budget gate',
      'final media requires asset, claim, licensing and social publication approval',
    ],
  },
  BUSINESS_LEAD_ENRICHMENT: {
    provider: 'GEMINI',
    state: 'RESTRICTED',
    allowedModes: ['READ_ONLY', 'DRAFT'],
    productionEligible: false,
    restrictions: [
      'restrict enrichment to permitted business/project context and supplied evidence',
      'do not infer sensitive personal attributes',
      'do not convert Google grounded results into a persistent lead database',
      'a deterministic compliance gate must decide outreach eligibility',
    ],
  },
  LEAD_DISCOVERY: {
    provider: 'OSS',
    state: 'CANDIDATE',
    allowedModes: ['DISCOVERY'],
    productionEligible: false,
    leadDiscoveryAllowed: true,
    restrictions: [
      'prefer admitted self-hosted discovery/crawl components such as Crawlee plus a separately admitted search source',
      'respect robots policy, source terms, rate limits and data-protection constraints',
      'record source provenance and purpose limitation before enrichment',
      'no Gemini Search Grounding as the discovery index source',
    ],
  },
  OUTREACH_DELIVERY: {
    provider: 'INTERNAL',
    state: 'BLOCKED',
    allowedModes: [],
    productionEligible: false,
    restrictions: [
      'blocked until legal basis, suppression, opt-out, frequency caps and audit evidence are implemented',
      'provider availability does not grant contact or publication authority',
      'human or explicitly approved policy gate is required before first production outreach',
    ],
  },
  ANALYTICS: {
    provider: 'INTERNAL',
    state: 'CANDIDATE',
    allowedModes: ['READ_ONLY'],
    productionEligible: false,
    restrictions: [
      'prefer first-party analytics such as an admitted Umami deployment',
      'keep GSC search evidence separate from product analytics',
      'GA4 remains behind consent and separate authority/admission',
    ],
  },
} as const;

export const GrowthMarketingChannelSchema = z.enum([
  'WEBSITE',
  'LINKEDIN',
  'YOUTUBE',
  'MASTODON',
  'REDDIT',
  'PODCAST',
  'EMAIL',
]);
export type GrowthMarketingChannel = z.infer<typeof GrowthMarketingChannelSchema>;

export const GrowthClaimKindSchema = z.enum([
  'PRODUCT_FACT',
  'MARKETING',
  'FINANCIAL',
  'REGULATORY',
  'SECURITY',
]);
export type GrowthClaimKind = z.infer<typeof GrowthClaimKindSchema>;

export const GrowthGroundedClaimSchema = z.object({
  text: z.string().min(1).max(800),
  kind: GrowthClaimKindSchema,
  evidenceUrls: z.array(z.string().url()).min(1).max(8),
}).strict();

export const GrowthMarketingDraftSchema = z.object({
  policyVersion: z.literal(GROWTH_AI_PROMOTION_POLICY_VERSION),
  productId: z.string().min(1).max(100),
  sourceSha: z.string().regex(/^[a-f0-9]{40,64}$/),
  locale: z.enum(['de-DE', 'en-US', 'en-GB']),
  canonicalUrl: z.string().url(),
  channels: z.array(GrowthMarketingChannelSchema).min(1).max(7),
  headline: z.string().min(1).max(180),
  summary: z.string().min(1).max(1200),
  callToAction: z.string().min(1).max(300),
  claims: z.array(GrowthGroundedClaimSchema).max(20),
  disclosures: z.array(z.string().min(1).max(500)).max(10),
  generatedBy: z.object({
    provider: z.literal('GEMINI'),
    model: z.string().min(1).max(100),
  }).strict(),
}).strict();

export type GrowthMarketingDraft = z.infer<typeof GrowthMarketingDraftSchema>;

export function getGrowthCapabilityPolicy(capability: GrowthCapability): GrowthCapabilityPolicy {
  return GROWTH_AI_CAPABILITY_POLICY[capability];
}

export function assertGrowthCapabilityAllowed(
  capability: GrowthCapability,
  mode: GrowthRuntimeMode,
): GrowthCapabilityPolicy {
  const policy = getGrowthCapabilityPolicy(capability);
  const allowed = (policy.allowedModes as readonly GrowthRuntimeMode[]).includes(mode);

  if (policy.state === 'BLOCKED' || !allowed) {
    throw new Error(
      `Growth capability ${capability} is not admitted for runtime mode ${mode} under ${GROWTH_AI_PROMOTION_POLICY_VERSION}`,
    );
  }

  return policy;
}
