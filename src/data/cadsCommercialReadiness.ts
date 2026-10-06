/**
 * CADS commercial readiness authority.
 *
 * This is a conservative evidence score, not a production, license, security,
 * Marketplace-listing, or pricing approval. Any missing authority fails closed.
 */
export type CadsReadinessDimension = {
  id: 'definition' | 'userSurface' | 'commercialPath' | 'complianceGate' | 'productionEvidence';
  weightPct: number;
  scorePct: number;
  evidence: string[];
};

export const CADS_COMMERCIAL_READINESS = {
  schemaVersion: 'CAPITAL_AI_CADS_COMMERCIAL_READINESS@1',
  productId: 'cads-app',
  productName: '[CAPITAL-AI-PRODUCT]CADS-BENCHMARK-GITHUB-APP',
  owner: 'PRODUCT',
  assuranceOwner: 'TRUST',
  baselineMainSha: '0bf052cbc8f7774db29cc77493f6f24bb28bd93b',
  correlatedAt: '2026-10-06',
  targetChannel: 'github-marketplace',
  state: 'PRE_LISTING_FAIL_CLOSED',
  pricingAuthority: null,
  marketplaceListingApproved: false,
  checkoutOrPurchaseEnabled: false,
  entitlementAuthority: 'GITHUB_MARKETPLACE_API_REQUIRED',
  operatorContext: {
    grafanaCloudSupabaseConnected: true,
    evidenceState: 'OPERATOR_CONFIRMED_REPO_READBACK_PENDING',
  },
  dimensions: [
    {
      id: 'definition',
      weightPct: 15,
      scorePct: 100,
      evidence: [
        'AGENTS.md',
        'docs/governance/TOOL-AND-ARCHITECTURE-BENCHMARKING.md',
        'docs/governance/COMPONENT-LIFECYCLE-VERSIONING.md',
      ],
    },
    {
      id: 'userSurface',
      weightPct: 25,
      scorePct: 20,
      evidence: [
        'server/index.mjs#/api/internal/cads',
        'server/cads-observability.mjs',
      ],
    },
    {
      id: 'commercialPath',
      weightPct: 25,
      scorePct: 40,
      evidence: [
        'apps/legal-policy-github-app/README.md',
        'apps/legal-policy-github-app/lib/webhook.mjs',
        'src/data/monetizationRegistry.ts',
      ],
    },
    {
      id: 'complianceGate',
      weightPct: 20,
      scorePct: 60,
      evidence: [
        'src/contracts/truthAuthorityGate.ts',
        'src/contracts/zeroCostApiThresholds.ts',
        'docs/security/ARCHITECTURE-A-GRAPHRAG-TOKENOMICS-TRUTH-WORK-PACKAGE-20261006.md',
      ],
    },
    {
      id: 'productionEvidence',
      weightPct: 15,
      scorePct: 53,
      evidence: [
        'server/cads-observability.test.mjs',
        'scripts/verify-release-readiness.mjs',
        'scripts/preflight.mjs',
      ],
    },
  ] satisfies readonly CadsReadinessDimension[],
} as const;

export function cadsCommercialReadinessPct(): number {
  const dimensions = CADS_COMMERCIAL_READINESS.dimensions;
  const weightTotal = dimensions.reduce((sum, dimension) => sum + dimension.weightPct, 0);
  if (weightTotal !== 100) throw new Error('cads_readiness_weights_must_total_100');

  const weighted = dimensions.reduce(
    (sum, dimension) => sum + (dimension.weightPct * dimension.scorePct) / 100,
    0,
  );
  return Math.round(weighted);
}

export function cadsCommerciallyAdmitted(): boolean {
  return Boolean(
    CADS_COMMERCIAL_READINESS.marketplaceListingApproved &&
    CADS_COMMERCIAL_READINESS.checkoutOrPurchaseEnabled &&
    CADS_COMMERCIAL_READINESS.pricingAuthority &&
    CADS_COMMERCIAL_READINESS.entitlementAuthority !== 'GITHUB_MARKETPLACE_API_REQUIRED',
  );
}
