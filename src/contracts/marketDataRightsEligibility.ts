/**
 * CAPITAL AI — MARKET DATA RIGHTS ELIGIBILITY (PART 2)
 *
 * Converts reviewed provider-rights and statutory research evidence into a
 * fail-closed, use-case-specific admission decision. Research purpose is a
 * distinct legal basis, never a blanket API or redistribution permission.
 */
import { z } from 'zod';

export const MarketDataUseCaseSchema = z.enum([
  'internal_analysis',
  'scientific_research_tdm',
  'public_display',
  'api_redistribution',
  'derived_scoring_research',
  'cache_retention',
  'export_resale',
]);
export type MarketDataUseCase = z.infer<typeof MarketDataUseCaseSchema>;

export const RightsDecisionSchema = z.enum(['ALLOW', 'ALLOW_WITH_OBLIGATIONS', 'REVIEW_REQUIRED', 'BLOCK']);
export type RightsDecision = z.infer<typeof RightsDecisionSchema>;

export const PermissionEvidenceSchema = z.object({
  allowed: z.boolean().nullable(),
  evidenceReference: z.string().min(1).nullable(),
  obligations: z.array(z.string()).default([]),
});

export const ScientificResearchTdmEvidenceSchema = z.object({
  jurisdiction: z.string().min(1).nullable(),
  legalBasis: z.enum(['DE_URHG_60D_EU_DSM_ART3', 'DE_URHG_44B_EU_DSM_ART4']).nullable(),
  actorQualification: z.enum([
    'QUALIFIED_RESEARCH_ORGANISATION',
    'NONCOMMERCIAL_INDIVIDUAL_RESEARCHER',
    'OTHER_TDM_USER',
    'UNVERIFIED',
  ]),
  lawfulAccess: z.boolean().nullable(),
  lawfulAccessEvidenceReference: z.string().min(1).nullable(),
  scientificTdmPurpose: z.boolean().nullable(),
  purposeEvidenceReference: z.string().min(1).nullable(),
  statutoryEligibilitySatisfied: z.boolean().nullable(),
  accessControlsAndNetworkIntegrityRespected: z.boolean().nullable(),
  legalReviewReference: z.string().min(1).nullable(),
});
export type ScientificResearchTdmEvidence = z.infer<typeof ScientificResearchTdmEvidenceSchema>;

export const MarketDataRightsEvidenceSchema = z.object({
  providerId: z.string().min(1),
  applicableEntityAndRegion: z.string().min(1).nullable(),
  subscriptionTierAndAddOns: z.string().min(1).nullable(),
  feedsSymbolsAndVenues: z.array(z.string()).min(1).nullable(),
  contractOrPermissionReference: z.string().min(1).nullable(),
  validUntil: z.string().datetime().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  permissions: z.record(MarketDataUseCaseSchema, PermissionEvidenceSchema),
  scientificResearchTdm: ScientificResearchTdmEvidenceSchema.nullable().default(null),
});
export type MarketDataRightsEvidence = z.infer<typeof MarketDataRightsEvidenceSchema>;

export interface MarketDataRightsEligibility {
  decision: RightsDecision;
  eligible: boolean;
  reasons: string[];
  obligations: string[];
}

function evaluateScientificResearchTdm(evidence: MarketDataRightsEvidence): string[] {
  const research = evidence.scientificResearchTdm;
  if (!research) return ['RESEARCH_TDM_EVIDENCE_MISSING'];
  const reasons: string[] = [];
  if (!research.legalBasis) reasons.push('RESEARCH_TDM_LEGAL_BASIS_UNVERIFIED');
  if (research.actorQualification === 'UNVERIFIED') reasons.push('RESEARCH_ACTOR_QUALIFICATION_UNVERIFIED');
  if (research.lawfulAccess !== true || !research.lawfulAccessEvidenceReference) reasons.push('LAWFUL_ACCESS_UNVERIFIED');
  if (research.scientificTdmPurpose !== true || !research.purposeEvidenceReference) reasons.push('SCIENTIFIC_TDM_PURPOSE_UNVERIFIED');
  if (research.statutoryEligibilitySatisfied !== true) reasons.push('STATUTORY_RESEARCH_ELIGIBILITY_UNVERIFIED');
  if (research.accessControlsAndNetworkIntegrityRespected !== true) reasons.push('ACCESS_OR_NETWORK_INTEGRITY_UNVERIFIED');
  if (!research.legalReviewReference) reasons.push('LEGAL_REVIEW_REFERENCE_MISSING');
  return reasons;
}

export function evaluateMarketDataRights(
  evidence: MarketDataRightsEvidence,
  requiredUseCases: readonly MarketDataUseCase[],
  now = new Date(),
): MarketDataRightsEligibility {
  const reasons: string[] = [];
  const obligations = new Set<string>();

  if (!evidence.feedsSymbolsAndVenues?.length) reasons.push('FEED_SCOPE_UNVERIFIED');
  if (!evidence.reviewedAt) reasons.push('REVIEW_TIMESTAMP_MISSING');
  if (evidence.validUntil && new Date(evidence.validUntil).getTime() < now.getTime()) reasons.push('RIGHTS_EVIDENCE_EXPIRED');

  const contractualUseCases = requiredUseCases.filter(useCase => useCase !== 'scientific_research_tdm');
  if (contractualUseCases.length) {
    if (!evidence.contractOrPermissionReference) reasons.push('CONTRACT_OR_PERMISSION_REFERENCE_MISSING');
    if (!evidence.applicableEntityAndRegion) reasons.push('ENTITY_OR_REGION_UNVERIFIED');
    if (!evidence.subscriptionTierAndAddOns) reasons.push('TIER_OR_ADDONS_UNVERIFIED');
  }

  let explicitBlock = false;
  for (const useCase of requiredUseCases) {
    if (useCase === 'scientific_research_tdm') {
      reasons.push(...evaluateScientificResearchTdm(evidence));
      continue;
    }
    const permission = evidence.permissions[useCase];
    if (!permission || permission.allowed === null || !permission.evidenceReference) {
      reasons.push(`USE_CASE_UNVERIFIED:${useCase}`);
      continue;
    }
    if (permission.allowed === false) {
      explicitBlock = true;
      reasons.push(`USE_CASE_PROHIBITED:${useCase}`);
    }
    permission.obligations.forEach(obligation => obligations.add(obligation));
  }

  if (explicitBlock) return { decision: 'BLOCK', eligible: false, reasons, obligations: [...obligations] };
  if (reasons.length) return { decision: 'REVIEW_REQUIRED', eligible: false, reasons, obligations: [...obligations] };
  if (obligations.size) return { decision: 'ALLOW_WITH_OBLIGATIONS', eligible: true, reasons: [], obligations: [...obligations] };
  return { decision: 'ALLOW', eligible: true, reasons: [], obligations: [] };
}
