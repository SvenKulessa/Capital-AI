import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CADS_MARKETPLACE_CAPABILITIES,
  CADS_MARKETPLACE_COMMERCIAL_BOUNDARY,
} from '../cadsMarketplaceCapabilities';

test('CADS capability packaging is independent from pricing and Marketplace plan IDs', () => {
  assert.equal(CADS_MARKETPLACE_CAPABILITIES.length, 6);
  assert.equal(CADS_MARKETPLACE_CAPABILITIES.every(capability => capability.planAssignment === 'UNASSIGNED'), true);
  assert.equal(CADS_MARKETPLACE_COMMERCIAL_BOUNDARY.pricingAssigned, false);
  assert.equal(CADS_MARKETPLACE_COMMERCIAL_BOUNDARY.marketplacePlanIdsAssigned, false);
  assert.equal(CADS_MARKETPLACE_COMMERCIAL_BOUNDARY.purchaseEnabled, false);
});

test('commercial entitlements never override TRUST or data-rights authorities', () => {
  assert.equal(CADS_MARKETPLACE_COMMERCIAL_BOUNDARY.entitlementsMayOverrideSecurity, false);
  assert.equal(CADS_MARKETPLACE_COMMERCIAL_BOUNDARY.entitlementsMayOverrideLicensing, false);
  assert.equal(CADS_MARKETPLACE_COMMERCIAL_BOUNDARY.entitlementsMayOverrideProviderRights, false);
});
