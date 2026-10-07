import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CADS_MARKETPLACE_CAPABILITIES,
  CADS_MARKETPLACE_COMMERCIAL_BOUNDARY,
} from '../cadsMarketplaceCapabilities';

test('CADS Marketplace packages Starter Pro Enterprise for paid production', () => {
  const boundary = CADS_MARKETPLACE_COMMERCIAL_BOUNDARY;
  assert.equal(boundary.target, 'PAID_PRODUCTION');
  assert.deepEqual(boundary.marketplacePlans, ['starter', 'pro', 'enterprise']);
  assert.equal(boundary.freePlanEnabled, false);
  assert.equal(boundary.pricingAuthority, 'GITHUB_MARKETPLACE_LISTING');
  assert.equal(boundary.pricingCurrency, 'USD');
  assert.equal(boundary.monthlyAndAnnualBillingRequired, true);
  assert.equal(boundary.purchaseLifecycleImplemented, true);
});

test('capability packaging escalates monotonically across paid tiers', () => {
  const byId = Object.fromEntries(CADS_MARKETPLACE_CAPABILITIES.map(capability => [capability.id, capability]));
  assert.deepEqual(byId['decision-report'].includedIn, ['starter', 'pro', 'enterprise']);
  assert.deepEqual(byId['evidence-history'].includedIn, ['pro', 'enterprise']);
  assert.deepEqual(byId['evidence-export'].includedIn, ['pro', 'enterprise']);
  assert.deepEqual(byId['policy-profiles'].includedIn, ['enterprise']);
  assert.deepEqual(byId['organization-governance'].includedIn, ['enterprise']);
  assert.deepEqual(byId['api-access'].includedIn, ['enterprise']);
});

test('commercial entitlements never override TRUST, rights or production authority', () => {
  assert.equal(CADS_MARKETPLACE_COMMERCIAL_BOUNDARY.entitlementsMayOverrideSecurity, false);
  assert.equal(CADS_MARKETPLACE_COMMERCIAL_BOUNDARY.entitlementsMayOverrideLicensing, false);
  assert.equal(CADS_MARKETPLACE_COMMERCIAL_BOUNDARY.entitlementsMayOverrideProviderRights, false);
  assert.equal(CADS_MARKETPLACE_COMMERCIAL_BOUNDARY.benchmarkPassMayGrantProduction, false);
});
