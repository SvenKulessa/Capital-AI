const COMMUNITY_PLAN_NAMES = new Set(['community', 'free']);

export const CADS_GITHUB_APP_REGISTRATION = Object.freeze({
  name: 'CAPITAL-AI CADS Community',
  description: 'Evidence-bound CADS benchmark checks for GitHub repositories.',
  public: true,
  requestOauthOnInstall: false,
  permissions: Object.freeze({
    metadata: 'read',
    contents: 'read',
    pull_requests: 'read',
    checks: 'write',
  }),
  events: Object.freeze(['pull_request', 'installation']),
  marketplaceWebhook: 'SEPARATE_LISTING_WEBHOOK_REQUIRED',
});

export const CADS_MARKETPLACE_COMMUNITY_PLAN = Object.freeze({
  schemaVersion: 'CAPITAL_AI_CADS_MARKETPLACE_PLAN@1',
  id: 'community',
  label: 'Community',
  priceModel: 'FREE',
  billingCycles: Object.freeze([]),
  capabilities: Object.freeze({
    standardProfiles: true,
    githubCheck: 'neutral',
    runSummary: true,
    sourceBoundEvidenceRefs: true,
    history: false,
    regressionDetection: false,
    evidenceExport: false,
    customProfiles: false,
    customThresholds: false,
    enforcedPrGate: false,
    api: false,
    selfHostedRunner: false,
  }),
  dataBoundary: Object.freeze({
    persistSourceCode: false,
    persistSecrets: false,
    persistEvidenceHistory: false,
    persistPrivateCustomerData: false,
  }),
  commerceBoundary: Object.freeze({
    marketplaceAuthoritative: true,
    stripeAuthoritative: false,
    communityUserMayBeCharged: false,
    paidMarketplacePlansEnabled: false,
    marketplacePlanIdsAssigned: false,
  }),
  lifecycleActions: Object.freeze(['purchased', 'cancelled']),
});

function normalizePlanName(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function resolveCadsCommunityMarketplaceEntitlement(subscription) {
  const planName = normalizePlanName(
    subscription?.marketplace_purchase?.plan?.name ??
    subscription?.plan?.name,
  );

  if (!COMMUNITY_PLAN_NAMES.has(planName)) {
    return Object.freeze({
      active: false,
      plan: null,
      reason: planName ? 'UNSUPPORTED_MARKETPLACE_PLAN' : 'NO_MARKETPLACE_SUBSCRIPTION',
      capabilities: null,
    });
  }

  return Object.freeze({
    active: true,
    plan: 'community',
    reason: 'COMMUNITY_MARKETPLACE_ENTITLEMENT',
    capabilities: CADS_MARKETPLACE_COMMUNITY_PLAN.capabilities,
  });
}

export function handleCadsCommunityMarketplacePurchaseEvent(payload) {
  const action = String(payload?.action ?? '');
  const purchase = payload?.marketplace_purchase;
  const accountId = purchase?.account?.id ?? null;

  if (!accountId) {
    return Object.freeze({
      accepted: false,
      entitlementActive: false,
      reason: 'MISSING_MARKETPLACE_ACCOUNT',
    });
  }

  if (action === 'purchased') {
    const entitlement = resolveCadsCommunityMarketplaceEntitlement({ marketplace_purchase: purchase });
    if (!entitlement.active) {
      return Object.freeze({
        accepted: false,
        entitlementActive: false,
        accountId,
        reason: entitlement.reason,
      });
    }
    return Object.freeze({
      accepted: true,
      entitlementActive: true,
      accountId,
      plan: entitlement.plan,
      reason: 'COMMUNITY_PURCHASE_ACCEPTED',
    });
  }

  if (action === 'cancelled') {
    return Object.freeze({
      accepted: true,
      entitlementActive: false,
      accountId,
      plan: 'community',
      reason: 'COMMUNITY_CANCELLATION_ACCEPTED',
    });
  }

  return Object.freeze({
    accepted: false,
    entitlementActive: false,
    accountId,
    reason: 'PAID_MARKETPLACE_LIFECYCLE_NOT_ENABLED',
  });
}
