/**
 * CAPITAL AI — MARKET DATA RIGHTS ELIGIBILITY (PART 2)
 *
 * Converts reviewed provider-rights evidence into a fail-closed, use-case-specific
 * admission decision. Legal/research documentation is evidence input, never an
 * implicit permission grant.
 */
import { z } from 'zod';

export const MarketDataUseCaseSchema = z.enum([
  'internal_analysis',
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

export const MarketDataRightsEvidenceSchema = z.object({
  providerId: z.string().min(1),
  applicableEntityAndRegion: z.string().min(1).nullable(),
  subscriptionTierAndAddOns: z.string().min(1).nullable(),
  feedsSymbolsAndVenues: z.array(z.string()).min(1).nullable(),
  contractOrPermissionReference: z.string().min(1).nullable(),
  validUntil: z.string().datetime().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  permissions: z.record(MarketDataUseCaseSchema, PermissionEvidenceSchema),
});
export type MarketDataRightsEvidence = z.infer<typeof MarketDataRightsEvidenceSchema>;

export interface MarketDataRightsEligibility {
  decision: RightsDecision;
  eligible: boolean;
  reasons: string[];
  obligations: string[];
}

export function evaluateMarketDataRights(
  evidence: MarketDataRightsEvidence,
  requiredUseCases: readonly MarketDataUseCase[],
  now = new Date(),
): MarketDataRightsEligibility {
  const reasons: string[] = [];
  const obligations = new Set<string>();

  if (!evidence.contractOrPermissionReference) reasons.push('CONTRACT_OR_PERMISSION_REFERENCE_MISSING');
  if (!evidence.applicableEntityAndRegion) reasons.push('ENTITY_OR_REGION_UNVERIFIED');
  if (!evidence.subscriptionTierAndAddOns) reasons.push('TIER_OR_ADDONS_UNVERIFIED');
  if (!evidence.feedsSymbolsAndVenues?.length) reasons.push('FEED_SCOPE_UNVERIFIED');
  if (!evidence.reviewedAt) reasons.push('REVIEW_TIMESTAMP_MISSING');
  if (evidence.validUntil && new Date(evidence.validUntil).getTime() < now.getTime()) reasons.push('RIGHTS_EVIDENCE_EXPIRED');

  let explicitBlock = false;
  for (const useCase of requiredUseCases) {
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
