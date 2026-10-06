import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CADS_COMMERCIAL_READINESS,
  cadsMarketplaceCommerciallyAdmitted,
} from '../cadsCommercialReadiness';

test('CADS website commerce survives Marketplace productization without an invented readiness score', () => {
  assert.equal(CADS_COMMERCIAL_READINESS.readinessPct, null);
  assert.equal(CADS_COMMERCIAL_READINESS.owner, 'PRODUCT');
  assert.equal(CADS_COMMERCIAL_READINESS.assuranceOwner, 'TRUST');
  assert.equal(CADS_COMMERCIAL_READINESS.websiteCommerce.state, 'WEB_SAAS_ENTITLEMENT_SLICE');
  assert.equal(CADS_COMMERCIAL_READINESS.websiteCommerce.billingAuthority, 'server/billing-catalog.mjs');
  assert.equal(CADS_COMMERCIAL_READINESS.websiteCommerce.entitlementAuthority, 'public.subscriptions via auth.resolvePaidTier');
  assert.equal(CADS_COMMERCIAL_READINESS.websiteCommerce.productionEligible, false);
  assert.equal(CADS_COMMERCIAL_READINESS.websiteCommerce.decisionEligible, false);
});

test('GitHub Marketplace remains a separate fail-closed authority', () => {
  const market = CADS_COMMERCIAL_READINESS.githubMarketplace;
  assert.equal(market.pricingAuthority, null);
  assert.equal(market.marketplaceListingApproved, false);
  assert.equal(market.checkoutOrPurchaseEnabled, false);
  assert.equal(market.entitlementAuthority, 'GITHUB_MARKETPLACE_API_REQUIRED');
  assert.equal(market.status, 'BLOCKED_FOR_PAID_LISTING');
  assert.equal(cadsMarketplaceCommerciallyAdmitted(), false);
});

test('current paid-listing and cancellation requirements remain explicit', () => {
  const req = CADS_COMMERCIAL_READINESS.githubMarketplace.officialRequirements;
  assert.equal(req.appOwnedByOrganizationForPaidPlans, true);
  assert.equal(req.verifiedPublisherRequiredForPaidPlans, true);
  assert.equal(req.minimumGitHubAppInstallationsForPaidListing, 100);
  assert.equal(req.monthlyAndAnnualBillingRequired, true);
  assert.equal(req.pricingCurrency, 'USD');
  assert.equal(req.maximumPublishedPlans, 10);
  assert.deepEqual(req.requiredMarketplacePurchaseActions, ['purchased', 'changed', 'cancelled']);
  assert.equal(req.planChangeWebhookRequired, true);
  assert.equal(req.customerDataDeletionWithinDaysAfterCancellation, 30);
  assert.equal(req.externalPaidServiceRequiresMarketplacePaidPlanOncePaidRequirementsMet, true);
});
