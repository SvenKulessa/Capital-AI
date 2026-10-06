import test from 'node:test';
import assert from 'node:assert/strict';
import { STUDIO_BLUEPRINTS } from '../src/data/studioData.ts';
import { BLUEPRINT_EVIDENCE_CONTRACTS } from '../src/data/blueprintEvidenceContracts.ts';

test('every public Blueprint has exactly one fail-closed evidence contract', () => {
  const blueprintIds = STUDIO_BLUEPRINTS.map(item => item.id).sort();
  const contractIds = Object.keys(BLUEPRINT_EVIDENCE_CONTRACTS).sort();
  assert.deepEqual(contractIds, blueprintIds);

  for (const blueprint of STUDIO_BLUEPRINTS) {
    const contract = BLUEPRINT_EVIDENCE_CONTRACTS[blueprint.id];
    assert.equal(contract.schemaVersion, 'CAPITAL_AI_BLUEPRINT_EVIDENCE@1');
    assert.equal(contract.state, 'BLOCKED');
    assert.equal(contract.productionAdmissionFromPrivateContext, false);
    assert.ok(contract.privateContextAccepted.includes('KEY_VAULT_VERIFIED_PROVIDER'));
    assert.ok(contract.privateContextAccepted.includes('PRIVATE_TEST_API'));
    assert.ok(contract.requirements.length >= 7);
    assert.ok(contract.requirements.every(requirement => requirement.required === true));
  }
});

test('public Studio Blueprint data contains no executable source payload fields', () => {
  for (const blueprint of STUDIO_BLUEPRINTS) {
    assert.equal('codeSnippet' in blueprint, false);
  }
});
