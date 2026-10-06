/**
 * CADS commercial-channel readiness authority.
 *
 * CURRENT_MAIN already contains a website SaaS entitlement slice. GitHub Marketplace
 * is modeled as a separate, fail-closed distribution/billing channel. This module
 * intentionally does not synthesize an overall readiness percentage.
 */
export const CADS_COMMERCIAL_READINESS = {
  schemaVersion: 'CAPITAL_AI_CADS_COMMERCIAL_READINESS@2',
  productId: 'cads-app',
  productName: '[CAPITAL-AI-PRODUCT]CADS-BENCHMARK-ENGINE',
  owner: 'PRODUCT',
  assuranceOwner: 'TRUST',
  correlatedMainSha: 'cef1d11f607778f5226ca1df97376ba408652c69',
  correlatedAt: '2026-10-06',
  readinessPct: null,
  websiteCommerce: {
    state: 'WEB_SAAS_ENTITLEMENT_SLICE',
    billingAuthority: 'server/billing-catalog.mjs',
    entitlementAuthority: 'public.subscriptions via auth.resolvePaidTier',
    checkoutPath: '/api/billing/subscriptions/checkout',
    runtimeEvidenceVerified: false,
    productionEligible: false,
    decisionEligible: false,
  },
  githubMarketplace: {
    state: 'PRE_LISTING_FAIL_CLOSED',
    pricingAuthority: null,
    marketplaceListingApproved: false,
    checkoutOrPurchaseEnabled: false,
    entitlementAuthority: 'GITHUB_MARKETPLACE_API_REQUIRED',
    sourceCheckedAt: '2026-10-06',
    officialRequirements: {
      appOwnedByOrganizationForPaidPlans: true,
      verifiedPublisherRequiredForPaidPlans: true,
      minimumGitHubAppInstallationsForPaidListing: 100,
      monthlyAndAnnualBillingRequired: true,
      pricingCurrency: 'USD',
      maximumPublishedPlans: 10,
      requiredMarketplacePurchaseActions: ['purchased', 'changed', 'cancelled'],
      planChangeWebhookRequired: true,
      customerDataDeletionWithinDaysAfterCancellation: 30,
      externalPaidServiceRequiresMarketplacePaidPlanOncePaidRequirementsMet: true,
    },
    evidence: {
      organizationOwnershipVerified: false,
      verifiedPublisherVerified: false,
      installationThresholdVerified: false,
      cadsListingDraftVerified: false,
      cadsMarketplaceWebhookVerified: false,
      monthlyAnnualPricingAssigned: false,
      planIdsAssigned: false,
      privacySupportListingEvidenceVerified: false,
      purchaseLifecycleVerified: false,
      cancellationLifecycleVerified: false,
      cancellationDeletionVerified: false,
      authoritativeMarketplaceReadbackVerified: false,
    },
    status: 'BLOCKED_FOR_PAID_LISTING',
  },
  operatorContext: {
    grafanaCloudSupabaseConnected: true,
    evidenceState: 'OPERATOR_CONFIRMED_REPO_READBACK_PENDING',
  },
} as const;

export function cadsMarketplaceCommerciallyAdmitted(): boolean {
  const market = CADS_COMMERCIAL_READINESS.githubMarketplace;
  return Boolean(
    market.marketplaceListingApproved &&
    market.checkoutOrPurchaseEnabled &&
    market.pricingAuthority &&
    market.entitlementAuthority !== 'GITHUB_MARKETPLACE_API_REQUIRED' &&
    Object.values(market.evidence).every(Boolean),
  );
}
