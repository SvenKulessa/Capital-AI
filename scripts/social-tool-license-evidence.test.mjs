import test from 'node:test';
import assert from 'node:assert/strict';
import { readAndValidateSocialToolLicenseEvidence } from './validate-social-tool-license-evidence.mjs';

test('Punkt 4 Social Tool License Evidence bleibt fail-closed', () => {
  const result = readAndValidateSocialToolLicenseEvidence();
  assert.equal(result.status, 'PASS');
  assert.equal(result.items, 4);
  assert.deepEqual(result.productionEligible, ['d3-scale']);
});
