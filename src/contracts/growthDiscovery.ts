import { z } from 'zod';

export const GROWTH_DISCOVERY_POLICY_VERSION = 'GROWTH_DISCOVERY_POLICY@1' as const;
export const GROWTH_LEAD_SCORE_VERSION = 'GROWTH_LEAD_SCORE@1' as const;

export const DiscoverySourceTypeSchema = z.enum([
  'SELF_HOSTED_SEARCH',
  'OFFICIAL_API',
  'PUBLIC_WEB',
  'GITHUB_PUBLIC',
]);
export type DiscoverySourceType = z.infer<typeof DiscoverySourceTypeSchema>;

export const RobotsDecisionSchema = z.enum([
  'ALLOWED',
  'DISALLOWED',
  'NOT_APPLICABLE',
]);
export const TermsDecisionSchema = z.enum([
  'ALLOWED_FOR_DISCOVERY',
  'RESTRICTED',
  'BLOCKED',
]);

export const GrowthDiscoveryProvenanceSchema = z.object({
  policyVersion: z.literal(GROWTH_DISCOVERY_POLICY_VERSION),
  sourceUrl: z.string().url(),
  sourceType: DiscoverySourceTypeSchema,
  discoveredAt: z.string().datetime(),
  searchSource: z.string().min(1).max(100),
  searchQueryHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  robotsDecision: RobotsDecisionSchema,
  robotsEvidenceRef: z.string().min(1),
  termsDecision: TermsDecisionSchema,
  termsEvidenceRef: z.string().min(1),
  purpose: z.literal('B2B_PRODUCT_FIT_DISCOVERY'),
  containsSensitivePersonalData: z.literal(false),
  personalContactHarvested: z.literal(false),
}).strict();

export type GrowthDiscoveryProvenance = z.infer<typeof GrowthDiscoveryProvenanceSchema>;

export function assertDiscoveryProvenanceAllowed(raw: unknown): GrowthDiscoveryProvenance {
  const provenance = GrowthDiscoveryProvenanceSchema.parse(raw);
  if (provenance.robotsDecision === 'DISALLOWED') {
    throw new Error('GROWTH_DISCOVERY_ROBOTS_BLOCKED');
  }
  if (provenance.termsDecision !== 'ALLOWED_FOR_DISCOVERY') {
    throw new Error('GROWTH_DISCOVERY_TERMS_BLOCKED');
  }
  return provenance;
}

export const GrowthLeadSignalsSchema = z.object({
  productNeed: z.number().int().min(0).max(25),
  technicalOverlap: z.number().int().min(0).max(20),
  openSourceAffinity: z.number().int().min(0).max(15),
  commercialFit: z.number().int().min(0).max(20),
  evidenceQuality: z.number().int().min(0).max(10),
  recency: z.number().int().min(0).max(10),
}).strict();

export type GrowthLeadSignals = z.infer<typeof GrowthLeadSignalsSchema>;

export const GrowthLeadScoreSchema = z.object({
  version: z.literal(GROWTH_LEAD_SCORE_VERSION),
  score: z.number().int().min(0).max(100),
  enrichmentEligible: z.boolean(),
  outreachEligible: z.literal(false),
  reasons: z.array(z.string().min(1).max(200)).max(12),
}).strict();

export type GrowthLeadScore = z.infer<typeof GrowthLeadScoreSchema>;

export function scoreGrowthLead(
  signalsInput: unknown,
  provenanceInput: unknown,
): GrowthLeadScore {
  const signals = GrowthLeadSignalsSchema.parse(signalsInput);
  assertDiscoveryProvenanceAllowed(provenanceInput);

  const score =
    signals.productNeed
    + signals.technicalOverlap
    + signals.openSourceAffinity
    + signals.commercialFit
    + signals.evidenceQuality
    + signals.recency;

  const reasons = [
    `productNeed=${signals.productNeed}/25`,
    `technicalOverlap=${signals.technicalOverlap}/20`,
    `openSourceAffinity=${signals.openSourceAffinity}/15`,
    `commercialFit=${signals.commercialFit}/20`,
    `evidenceQuality=${signals.evidenceQuality}/10`,
    `recency=${signals.recency}/10`,
  ];

  return GrowthLeadScoreSchema.parse({
    version: GROWTH_LEAD_SCORE_VERSION,
    score,
    enrichmentEligible: score >= 60 && signals.evidenceQuality >= 5,
    outreachEligible: false,
    reasons,
  });
}

export const GrowthDiscoveryCandidateSchema = z.object({
  organizationName: z.string().min(1).max(200),
  organizationUrl: z.string().url(),
  projectOrProduct: z.string().min(1).max(300).optional(),
  provenance: GrowthDiscoveryProvenanceSchema,
  signals: GrowthLeadSignalsSchema,
}).strict();

export type GrowthDiscoveryCandidate = z.infer<typeof GrowthDiscoveryCandidateSchema>;
