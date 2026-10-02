/**
 * CAPITAL AI — MARKET DATA RIGHTS INVENTORY PROJECTION (PART 2)
 *
 * Projects docs/security/evidence/license-rights-review.json into the
 * use-case contract. Null inventory fields stay unverified. Primary-source
 * excerpts are not converted into statutory research evidence or a commercial
 * licence. No component is activated by this projection.
 */
import { z } from 'zod';
import {
  evaluateMarketDataRights,
  type MarketDataRightsEligibility,
  type MarketDataRightsEvidence,
  type MarketDataUseCase,
} from './marketDataRightsEligibility';

export const RIGHTS_INVENTORY_PATH = 'docs/security/evidence/license-rights-review.json';

const nullableBoolean = z.boolean().nullable();
const nullableString = z.string().min(1).nullable();

export const LicenseRightsContractEvidenceSchema = z.object({
  contractOrPermissionReference: nullableString,
  applicableEntityAndRegion: nullableString,
  subscriptionTierAndAddOns: nullableString,
  feedsSymbolsAndVenues: z.array(z.string().min(1)).min(1).nullable(),
  publicDisplayPermission: nullableBoolean,
  apiRedistributionPermission: nullableBoolean,
  derivedScoresAndResearchPermission: nullableBoolean,
  cacheAndRetentionLimits: z.union([z.string().min(1), z.boolean(), z.null()]),
  exportAndResalePermission: nullableBoolean,
  requiredAttribution: nullableString,
  validityAndReviewDate: nullableString,
});

export const LicenseRightsProviderRecordSchema = z.object({
  id: z.string().min(1),
  endpoint: z.string().min(1).nullable(),
  sources: z.array(z.string().min(1)),
  assessment: z.string(),
  status: z.string().min(1),
  deployEligible: z.boolean(),
  contractEvidence: LicenseRightsContractEvidenceSchema,
  researchScope: nullableString,
});
export type LicenseRightsProviderRecord = z.infer<typeof LicenseRightsProviderRecordSchema>;

const KNOWN_CONTRACT_FIELDS = new Set(Object.keys(LicenseRightsContractEvidenceSchema.shape));

const COMMERCIAL_PRODUCT_USE_CASES = [
  'internal_analysis',
  'public_display',
  'api_redistribution',
  'derived_scoring_research',
  'cache_retention',
  'export_resale',
] as const satisfies readonly MarketDataUseCase[];

export const FIRST_ACTIVATION_COHORT = [
  {
    componentId: 'market_integrity_gate',
    requiredCommercialUseCases: ['internal_analysis', 'derived_scoring_research'],
    providerDependencies: ['binance', 'kraken', 'coinbase', 'twelvedata'],
  },
  {
    componentId: 'data_quality_scorer',
    requiredCommercialUseCases: ['internal_analysis', 'derived_scoring_research'],
    providerDependencies: ['binance', 'kraken', 'twelvedata', 'alphavantage'],
  },
  {
    componentId: 'liquidity_eligibility_scorer',
    requiredCommercialUseCases: ['internal_analysis', 'derived_scoring_research'],
    providerDependencies: ['binance', 'kraken', 'twelvedata'],
  },
] as const satisfies readonly {
  componentId: string;
  requiredCommercialUseCases: readonly MarketDataUseCase[];
  providerDependencies: readonly string[];
}[];

interface PermissionProjection {
  allowed: boolean | null;
  evidenceReference: null;
  obligations: string[];
}

function unverifiedPermission(): PermissionProjection {
  return { allowed: null, evidenceReference: null, obligations: [] };
}

function booleanPermission(allowed: boolean | null): PermissionProjection {
  return { allowed, evidenceReference: null, obligations: [] };
}

export interface ProviderRightsProjection {
  providerId: string;
  inventoryStatus: string;
  deployEligible: boolean;
  researchScope: string | null;
  technicalEndpoint: string | null;
  /** Preserved verbatim. Not parsed into reviewedAt or validUntil. */
  unparsedValidityAndReviewDate: string | null;
  sourceReferences: string[];
  unprojectedContractFields: string[];
  datasetScopeVerified: boolean;
  evidence: MarketDataRightsEvidence;
  researchOnly: MarketDataRightsEligibility;
  commercialProduct: MarketDataRightsEligibility;
}

export function projectProviderRights(raw: unknown): ProviderRightsProjection {
  const contractRecord = raw && typeof raw === 'object' ? (raw as { contractEvidence?: unknown }).contractEvidence : null;
  const unprojectedContractFields = contractRecord && typeof contractRecord === 'object'
    ? Object.keys(contractRecord).filter(key => !KNOWN_CONTRACT_FIELDS.has(key)).sort()
    : [];
  const record = LicenseRightsProviderRecordSchema.parse(raw);
  const contract = record.contractEvidence;
  const cachePermission = typeof contract.cacheAndRetentionLimits === 'boolean'
    ? booleanPermission(contract.cacheAndRetentionLimits)
    : unverifiedPermission();
  const evidence: MarketDataRightsEvidence = {
    providerId: record.id,
    applicableEntityAndRegion: contract.applicableEntityAndRegion,
    subscriptionTierAndAddOns: contract.subscriptionTierAndAddOns,
    feedsSymbolsAndVenues: contract.feedsSymbolsAndVenues,
    contractOrPermissionReference: contract.contractOrPermissionReference,
    validUntil: null,
    reviewedAt: null,
    permissions: {
      internal_analysis: unverifiedPermission(),
      scientific_research_tdm: unverifiedPermission(),
      public_display: booleanPermission(contract.publicDisplayPermission),
      api_redistribution: booleanPermission(contract.apiRedistributionPermission),
      derived_scoring_research: booleanPermission(contract.derivedScoresAndResearchPermission),
      cache_retention: cachePermission,
      export_resale: booleanPermission(contract.exportAndResalePermission),
    },
    scientificResearchTdm: null,
  };
  return {
    providerId: record.id,
    inventoryStatus: record.status,
    deployEligible: record.deployEligible,
    researchScope: record.researchScope,
    technicalEndpoint: record.endpoint,
    unparsedValidityAndReviewDate: contract.validityAndReviewDate,
    sourceReferences: [...record.sources],
    unprojectedContractFields,
    datasetScopeVerified: Boolean(contract.feedsSymbolsAndVenues?.length),
    evidence,
    researchOnly: evaluateMarketDataRights(evidence, ['scientific_research_tdm']),
    commercialProduct: evaluateMarketDataRights(evidence, COMMERCIAL_PRODUCT_USE_CASES),
  };
}

export interface CohortProviderBinding {
  providerId: string;
  inInventory: boolean;
  datasetScopeVerified: boolean;
  researchDecision: MarketDataRightsEligibility['decision'];
  commercialDecision: MarketDataRightsEligibility['decision'];
  reasons: string[];
}

export interface CohortRightsBinding {
  componentId: string;
  requiredCommercialUseCases: readonly MarketDataUseCase[];
  providers: CohortProviderBinding[];
  researchOnlyEligible: boolean;
  commerciallyActive: boolean;
}

export function bindFirstActivationCohort(projections: readonly ProviderRightsProjection[]): CohortRightsBinding[] {
  const byId = new Map(projections.map(projection => [projection.providerId, projection]));
  return FIRST_ACTIVATION_COHORT.map(component => {
    const providers = component.providerDependencies.map(providerId => {
      const projection = byId.get(providerId);
      if (!projection) {
        return {
          binding: {
            providerId,
            inInventory: false,
            datasetScopeVerified: false,
            researchDecision: 'REVIEW_REQUIRED' as const,
            commercialDecision: 'REVIEW_REQUIRED' as const,
            reasons: ['PROVIDER_NOT_IN_RIGHTS_INVENTORY', 'DATASET_SCOPE_UNVERIFIED'],
          },
          researchEligible: false,
          commercialEligible: false,
        };
      }
      const commercial = evaluateMarketDataRights(projection.evidence, component.requiredCommercialUseCases);
      const reasons = [...commercial.reasons];
      if (!projection.datasetScopeVerified) reasons.push('DATASET_SCOPE_UNVERIFIED');
      if (projection.researchScope && projection.evidence.scientificResearchTdm === null) {
        reasons.push('RESEARCH_SCOPE_IS_NOT_STATUTORY_EVIDENCE');
      }
      for (const field of projection.unprojectedContractFields) reasons.push(`UNPROJECTED_CONTRACT_FIELD:${field}`);
      const unprojected = projection.unprojectedContractFields.length > 0;
      return {
        binding: {
          providerId,
          inInventory: true,
          datasetScopeVerified: projection.datasetScopeVerified,
          researchDecision: projection.researchOnly.decision,
          commercialDecision: commercial.decision,
          reasons,
        },
        researchEligible: projection.researchOnly.eligible && projection.datasetScopeVerified && !unprojected,
        commercialEligible: commercial.eligible && projection.datasetScopeVerified && !unprojected,
      };
    });
    return {
      componentId: component.componentId,
      requiredCommercialUseCases: component.requiredCommercialUseCases,
      providers: providers.map(provider => provider.binding),
      researchOnlyEligible: providers.every(provider => provider.researchEligible),
      commerciallyActive: providers.every(provider => provider.commercialEligible),
    };
  });
}
