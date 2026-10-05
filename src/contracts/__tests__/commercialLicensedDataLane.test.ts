import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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


test('production MARKET package keeps real YAML line breaks for the commercial lane', () => {
  const yaml = readFileSync('docs/market-data/PRODUCTION-WEB-01-MARKET-20261005.yaml', 'utf8');
  assert.equal(yaml.includes('\\n'), false);
  assert.match(yaml, /commercialLicensedDataLane:\n\s+state: "DEFINED_FAIL_CLOSED"/);
  assert.match(yaml, /sharedMarketLane: .*OPEN_SOURCE_OPEN_DATA_ADMITTED/);
  assert.match(yaml, /twelveDataDeployEligible: false/);
  assert.match(yaml, /twelveDataDatasetScopeVerified: false/);
  assert.match(yaml, /twelveDataIndexPricing: "BLOCKED"/);
});
