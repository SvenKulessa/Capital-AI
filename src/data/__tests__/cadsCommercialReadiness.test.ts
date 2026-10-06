import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CADS_COMMERCIAL_READINESS,
  cadsMarketplaceCommerciallyAdmitted,
} from '../cadsCommercialReadiness';

test('CADS targets paid GitHub Marketplace production but external admission stays fail-closed', () => {
  const market = CADS_COMMERCIAL_READINESS.githubMarketplace;
  assert.equal(market.target, 'PAID_PRODUCTION');
  assert.deepEqual(market.plans, ['starter', 'pro', 'enterprise']);
  assert.equal(market.freePlanEnabled, false);
  assert.equal(market.pricingAuthority, 'GITHUB_MARKETPLACE_LISTING');
  assert.equal(market.pricingCurrency, 'USD');
  assert.equal(market.implementation.hmacWebhookVerification, true);
  assert.equal(market.implementation.idempotentDeliveryLedger, true);
  assert.equal(market.implementation.authoritativeMarketplaceReadbackBeforeActivationOrPlanChange, true);
  assert.equal(market.implementation.cancellationDataPurgeBeforeDay30, true);
  assert.equal(market.status, 'BLOCKED_EXTERNAL_GITHUB_ADMISSION');
  assert.equal(cadsMarketplaceCommerciallyAdmitted(), false);
});

test('Marketplace production admission requires real external evidence, not code completion', () => {
  const evidence = CADS_COMMERCIAL_READINESS.githubMarketplace.evidence;
  assert.equal(evidence.organizationOwnershipVerified, false);
  assert.equal(evidence.verifiedPublisherVerified, false);
  assert.equal(evidence.installationThresholdVerified, false);
  assert.equal(evidence.monthlyAnnualPricingAssignedInMarketplace, false);
  assert.equal(evidence.planIdsAssignedInRuntime, false);
  assert.equal(Object.values(evidence).every(Boolean), false);
});

test('Grafana Cloud operator context remains separate from Marketplace admission', () => {
  assert.equal(CADS_COMMERCIAL_READINESS.operatorContext.grafanaCloudSupabaseConnected, true);
  assert.equal(
    CADS_COMMERCIAL_READINESS.operatorContext.evidenceState,
    'OPERATOR_CONFIRMED_REPO_READBACK_PENDING',
  );
});
