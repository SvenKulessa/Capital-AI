import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateCommercialLicensedDataLane } from '../commercialLicensedDataLane';

test('commercial licensed data lane remains fail-closed for current Twelve Data evidence', () => {
  const decision = evaluateCommercialLicensedDataLane({
    lane: 'COMMERCIAL_LICENSED_DATA',
    providerId: 'twelvedata',
    intendedCustomerAcquisition: 'VIA_CAPITAL_AI_THIRD_PARTY_PROVIDER',
    writtenRightsEvidence: true,
    applicableEntityBound: false,
    datasetScopeVerified: false,
    attributionSatisfied: false,
    resellerOrSublicenseRightVerified: false,
    replayRightVerified: false,
    jetStreamRightVerified: false,
    backupRestoreRightVerified: false,
    deployEligible: false,
  });

  assert.equal(decision.eligible, false);
  assert.ok(decision.reasons.includes('THIRD_PARTY_RESELLER_OR_SUBLICENSE_RIGHT_UNVERIFIED'));
  assert.ok(decision.reasons.includes('DATASET_SCOPE_UNVERIFIED'));
  assert.ok(decision.reasons.includes('PROVIDER_DEPLOY_NOT_ELIGIBLE'));
});

test('commercial licensed data lane only opens when every rights gate is explicitly satisfied', () => {
  const decision = evaluateCommercialLicensedDataLane({
    lane: 'COMMERCIAL_LICENSED_DATA',
    providerId: 'example-provider',
    intendedCustomerAcquisition: 'VIA_CAPITAL_AI_THIRD_PARTY_PROVIDER',
    writtenRightsEvidence: true,
    applicableEntityBound: true,
    datasetScopeVerified: true,
    attributionSatisfied: true,
    resellerOrSublicenseRightVerified: true,
    replayRightVerified: true,
    jetStreamRightVerified: true,
    backupRestoreRightVerified: true,
    deployEligible: true,
  });

  assert.deepEqual(decision, { eligible: true, reasons: [] });
});
