import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { DECISIONS, evaluateInventory } from './index.mjs';

const policy = JSON.parse(await readFile(new URL('./community-policy.json', import.meta.url), 'utf8'));

test('build-only permissive component can be allowed without redistribution duties', () => {
  const result = evaluateInventory({components:[{
    name:'tool', version:'1.0.0', license:'MIT', usageClass:'BUILD_ONLY'
  }]}, policy);
  assert.equal(result.releaseDecision, DECISIONS.ALLOW);
  assert.equal(result.decisionEligible, true);
});

test('distributed permissive component exposes an obligation', () => {
  const result = evaluateInventory({components:[{
    name:'lib', version:'1.0.0', license:'MIT', usageClass:'DISTRIBUTED_BINARY'
  }]}, policy);
  assert.equal(result.releaseDecision, DECISIONS.ALLOW_WITH_OBLIGATIONS);
  assert.deepEqual(result.components[0].outstandingObligations, ['LICENSE_NOTICE_RETAINED']);
});

test('satisfied obligation closes the release gate', () => {
  const result = evaluateInventory({components:[{
    name:'lib', version:'1.0.0', license:'MIT', usageClass:'DISTRIBUTED_BINARY',
    satisfiedObligations:['LICENSE_NOTICE_RETAINED']
  }]}, policy);
  assert.equal(result.releaseDecision, DECISIONS.ALLOW);
});

test('unknown license is routed to legal review rather than guessed', () => {
  const result = evaluateInventory({components:[{
    name:'mystery', version:'1', license:'LicenseRef-Proprietary', usageClass:'INTERNAL_RUNTIME'
  }]}, policy);
  assert.equal(result.releaseDecision, DECISIONS.LEGAL_REVIEW_REQUIRED);
});

test('explicitly denied rights are blocked', () => {
  const result = evaluateInventory({components:[{
    name:'asset', version:'1', license:'CC-BY-4.0', usageClass:'BUNDLED_FRONTEND', rightsStatus:'DENIED'
  }]}, policy);
  assert.equal(result.releaseDecision, DECISIONS.BLOCKED);
});
