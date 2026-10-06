import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CADS_COMMERCIAL_READINESS,
  cadsCommerciallyAdmitted,
  cadsCommercialReadinessPct,
} from '../cadsCommercialReadiness';

test('CADS commercial readiness is conservative and fail-closed', () => {
  assert.equal(
    CADS_COMMERCIAL_READINESS.dimensions.reduce((sum, dimension) => sum + dimension.weightPct, 0),
    100,
  );
  assert.equal(cadsCommercialReadinessPct(), 50);
  assert.equal(CADS_COMMERCIAL_READINESS.owner, 'PRODUCT');
  assert.equal(CADS_COMMERCIAL_READINESS.assuranceOwner, 'TRUST');
  assert.equal(CADS_COMMERCIAL_READINESS.pricingAuthority, null);
  assert.equal(CADS_COMMERCIAL_READINESS.marketplaceListingApproved, false);
  assert.equal(CADS_COMMERCIAL_READINESS.checkoutOrPurchaseEnabled, false);
  assert.equal(cadsCommerciallyAdmitted(), false);
});

test('Grafana Cloud operator context does not become production evidence by assertion alone', () => {
  assert.equal(CADS_COMMERCIAL_READINESS.operatorContext.grafanaCloudSupabaseConnected, true);
  assert.equal(
    CADS_COMMERCIAL_READINESS.operatorContext.evidenceState,
    'OPERATOR_CONFIRMED_REPO_READBACK_PENDING',
  );
});
