import assert from 'node:assert/strict';
import test from 'node:test';
import { buildArchitectureAResearchInventory } from '../architectureAResearchInventory';

test('Architecture-A inventory is deterministically derived from canonical contracts', () => {
  const inventory = buildArchitectureAResearchInventory();
  assert.ok(inventory.apiServices.length >= 10);
  assert.ok(inventory.blockchainCandidates.length >= 5);
  assert.equal(new Set(inventory.apiServices.map(item => item.id)).size, inventory.apiServices.length);
  assert.equal(new Set(inventory.blockchainCandidates.map(item => item.id)).size, inventory.blockchainCandidates.length);
  assert.ok(inventory.apiServices.every(item => item.automaticPaidEscalation === false));
});
