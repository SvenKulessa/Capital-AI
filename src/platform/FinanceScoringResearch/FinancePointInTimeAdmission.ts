/**
 * MARKET/TRUST point-in-time vintage boundary for Finance commodity research.
 *
 * Finance's source vintage policy cannot grant provider usage rights in CAPITAL-AI.
 * Require source availability lineage, historical decision-time correctness and the
 * existing MarketDataRights authority before allowing a vintage into research.
 * Never makes live provider requests or mutates model promotion state.
 */
import { z } from 'zod';
import { AssetIdentitySchema } from '../../contracts/canonicalContracts.ts';
import {
  MarketDataRightsEvidenceSchema, evaluateMarketDataRights,
} from '../../contracts/marketDataRightsEligibility.ts';
import {
  buildCommodityHistoricalVintage,
  type CommodityHistoricalVintageArtifact,
} from './CommodityHistoricalVintage.ts';
import { FINANCE_PINNED_SOURCE_SHA } from '../../contracts/financeResearchFeatureBridge.ts';

export const FINANCE_PIT_ADMISSION_VERSION = 'CAPITAL_AI_FINANCE_PIT_ADMISSION@1' as const;
const iso = z.string().datetime();
const nonblank = z.string().trim().min(1).max(500);
const inputSchema = z.strictObject({
  sourceCommit: z.literal(FINANCE_PINNED_SOURCE_SHA),
  asset: AssetIdentitySchema,
  providerId: nonblank,
  providerDataset: nonblank,
  venue: nonblank,
  evaluatedAt: iso,
  decisionAt: iso,
  vintage: z.strictObject({
    providerId: z.enum([
      'eia', 'usda-fas-psd', 'cftc-cot', 'usgs-mcs', 'eu-crma',
      'commodity-market-evidence', 'governed-futures-curve-evidence',
      'governed-official-supply-evidence',
    ]),
    assetId: nonblank,
    symbol: nonblank,
    domain: z.enum(['energy','industrial-metals','precious-metals','agriculture']),
    featureKey: nonblank,
    value: z.number().finite(),
    unit: nonblank,
    source: nonblank,
    sourceVersion: nonblank,
    sourcePath: nonblank,
    observedAt: iso,
    availableAt: iso,
    retrievedAt: iso,
    evidenceId: nonblank,
    releaseId: nonblank.nullable().optional(),
    revisionId: nonblank.nullable().optional(),
    availabilityEvidenceId: nonblank.nullable().optional(),
    acquisitionMode: z.enum([
      'LIVE_API_CURRENT_HISTORY', 'ARCHIVED_RELEASE_CAPTURE',
      'VERSIONED_ANNUAL_RELEASE', 'REGULATORY_ASSESSMENT_RELEASE',
      'GOVERNED_MARKET_CAPTURE',
    ]),
    periodLabel: nonblank.nullable().optional(),
  }),
  rights: MarketDataRightsEvidenceSchema,
});
export type FinancePitAdmissionInput = z.infer<typeof inputSchema>;

const failure = (reasons: string[]) => Object.freeze({
  version: FINANCE_PIT_ADMISSION_VERSION,
  state: 'BLOCKED' as const,
  reasons: Object.freeze([...new Set(reasons)].sort()),
  vintage: null,
  scoreEligible: false as const, rankEligible: false as const,
  decisionEligible: false as const, productionEligible: false as const,
});
/**
 * PIT research is only admissible if the relevant archived source release is
 * actually documented as available on or before the historical decision point.
 * Provider permissions are evaluated at the current analysis timestamp, not
 * retroactively treated as permission for public historical redistribution.
 */
export function inspectFinancePointInTimeVintage(input: FinancePitAdmissionInput) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return failure(['FINANCE_PIT_INPUT_INVALID']);
  const {asset,providerId,providerDataset,venue,decisionAt,evaluatedAt,vintage,rights} = parsed.data;
  const reasons: string[] = [];
  const decisionMs = Date.parse(decisionAt), evaluatedMs = Date.parse(evaluatedAt);
  const availableMs = Date.parse(vintage.availableAt);
  const retrievedMs = Date.parse(vintage.retrievedAt);
  if (decisionMs > evaluatedMs) reasons.push('FINANCE_PIT_DECISION_AFTER_EVALUATION');
  if (!Number.isFinite(availableMs) || availableMs > decisionMs) reasons.push('FINANCE_PIT_LOOKAHEAD_AVAILABILITY');
  if (!Number.isFinite(retrievedMs) || retrievedMs > evaluatedMs) reasons.push('FINANCE_PIT_FUTURE_RETRIEVAL');
  if (!vintage.assetId?.trim() || !vintage.symbol?.trim() || !vintage.featureKey?.trim()) {
    reasons.push('FINANCE_PIT_ASSET_OR_FEATURE_MISSING');
  }
  if (asset.assetClass !== 'commodities' || vintage.assetId !== asset.assetId
      || vintage.symbol !== asset.symbol || venue !== asset.venue
      || !asset.assetId || !asset.venue) {
    reasons.push('FINANCE_PIT_TARGET_ASSET_IDENTITY_MISMATCH');
  }
  if (rights.providerId !== providerId) reasons.push('FINANCE_PIT_PROVIDER_ID_MISMATCH');
  const feed = providerDataset + ':' + vintage.symbol + ':' + venue;
  if (!rights.feedsSymbolsAndVenues?.includes(feed)) reasons.push('FINANCE_PIT_PROVIDER_FEED_OUT_OF_SCOPE');
  if (!rights.reviewedAt || Date.parse(rights.reviewedAt) > evaluatedMs) {
    reasons.push('FINANCE_PIT_RIGHTS_NOT_REVIEWED');
  }
  const rightsAssessment = evaluateMarketDataRights(rights, [
    'internal_analysis','derived_scoring_research','cache_retention',
  ], new Date(evaluatedMs));
  if (!rightsAssessment.eligible || rightsAssessment.obligations.length) {
    reasons.push('FINANCE_PIT_RIGHTS_NOT_ADMITTED', ...rightsAssessment.reasons);
  }
  // Validating source policy / release version is necessary but not equivalent
  // to an independent verification of upstream artifact authenticity.
  let result: CommodityHistoricalVintageArtifact | null = null;
  try {
    result = buildCommodityHistoricalVintage(vintage);
    if (result.evidenceGrade !== 'PIT_VERIFIED' || result.blockers.length > 0) {
      reasons.push('FINANCE_PIT_VINTAGE_EVIDENCE_INSUFFICIENT', ...result.blockers);
    }
  } catch {
    reasons.push('FINANCE_PIT_SOURCE_VINTAGE_INVALID');
  }
  if (reasons.length) return failure(reasons);
  return Object.freeze({
    version: FINANCE_PIT_ADMISSION_VERSION,
    state: 'PIT_RESEARCH_ADMITTED' as const,
    reasons: Object.freeze([] as string[]),
    vintage: result!,
    decisionAt, evaluatedAt,
    providerId, feed,
    sourceCommit: FINANCE_PINNED_SOURCE_SHA,
    scoreEligible: false as const, rankEligible: false as const,
    decisionEligible: false as const, productionEligible: false as const,
  });
}
