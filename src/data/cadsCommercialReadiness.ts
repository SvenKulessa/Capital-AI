/**
 * CADS commercial-channel readiness authority.
 *
 * Website SaaS and GitHub Marketplace are separate billing/entitlement authorities.
 * The Marketplace runtime is implemented for paid production but external publication
 * remains fail-closed until GitHub organization/publisher/listing evidence is real.
 */
export const CADS_COMMERCIAL_READINESS = {
  schemaVersion: 'CAPITAL_AI_CADS_COMMERCIAL_READINESS@3',
  productId: 'cads-app',
  productName: '[CAPITAL-AI-PRODUCT]CADS-BENCHMARK-ENGINE',
  owner: 'PRODUCT',
  assuranceOwner: 'TRUST',
  correlatedMainSha: '4fa3e3f92547cd6356f46490a38e9b7515f69a6d',
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
    target: 'PAID_PRODUCTION',
    state: 'BILLING_RUNTIME_IMPLEMENTED_EXECUTION_AND_EXTERNAL_ADMISSION_BLOCKED',
    pricingAuthority: 'GITHUB_MARKETPLACE_LISTING',
    pricingCurrency: 'USD',
    marketplaceListingApproved: false,
    checkoutOrPurchaseEnabled: false,
    entitlementAuthority: 'server/cads-marketplace.mjs + Supabase entitlement ledger',
    sourceCheckedAt: '2026-10-06',
    plans: ['starter', 'pro', 'enterprise'],
    freePlanEnabled: false,
    officialRequirements: {
      appOwnedByOrganizationForPaidPlans: true,
      verifiedPublisherRequiredForPaidPlans: true,
      minimumGitHubAppInstallationsForPaidListing: 100,
      monthlyAndAnnualBillingRequired: true,
      maximumPublishedPlans: 10,
      requiredMarketplacePurchaseActions: ['purchased', 'changed', 'cancelled'],
      planChangeWebhookRequired: true,
      customerDataDeletionWithinDaysAfterCancellation: 30,
      financialOnboardingRequired: true,
      listingReviewRequired: true,
    },
    implementation: {
      hmacWebhookVerification: true,
      authoritativeMarketplaceReadbackBeforeActivationOrPlanChange: true,
      verifiedGitHubInstallationToSupabaseUserLink: true,
      idempotentDeliveryLedger: true,
      starterProEnterpriseCapabilityMapping: true,
      cancellationDeactivation: true,
      cancellationDataPurgeBeforeDay30: true,
      secretsExcludedFromRepository: true,
      exactUsdPricesStoredInRepository: false,
    },
    evidence: {
      organizationOwnershipVerified: false,
      verifiedPublisherVerified: false,
      installationThresholdVerified: false,
      cadsListingDraftVerified: false,
      cadsMarketplaceWebhookRuntimeVerified: false,
      monthlyAnnualPricingAssignedInMarketplace: false,
      planIdsAssignedInRuntime: false,
      privacySupportListingEvidenceVerified: false,
      purchaseLifecycleRuntimeVerified: false,
      planChangeLifecycleRuntimeVerified: false,
      cancellationLifecycleRuntimeVerified: false,
      cancellationDeletionRuntimeVerified: false,
      authoritativeMarketplaceReadbackRuntimeVerified: false,
      buyerOAuthUserLinkRuntimeVerified: false,
      benchmarkExecutionRuntimeVerified: false,
    },
    status: 'BLOCKED_EXECUTION_AND_EXTERNAL_GITHUB_ADMISSION',
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
    Object.values(market.evidence).every(Boolean),
  );
}
