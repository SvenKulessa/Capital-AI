import assert from 'node:assert/strict';
import test from 'node:test';
import { PRIVATE_BYOK_PROVIDERS, isPrivateByokEnabled } from '../../config/providers/privateByokCatalog';

test('Private BYOK provider catalog contains 20 unique stable IDs', () => {
  assert.equal(PRIVATE_BYOK_PROVIDERS.length, 20);
  assert.equal(new Set(PRIVATE_BYOK_PROVIDERS.map(item => item.id)).size, 20);
  for (const item of PRIVATE_BYOK_PROVIDERS) {
    assert.match(item.id, /^[a-z][a-z0-9_]*$/);
    assert.ok(item.label && item.category && item.description);
  }
});

test('only implemented & database-allowlisted server adapters can take credentials', () => {
  assert.deepEqual(PRIVATE_BYOK_PROVIDERS.filter(item => item.availability === 'active').map(item => item.id), ['kraken', 'binance', 'massive']);
  for (const candidate of PRIVATE_BYOK_PROVIDERS) {
    assert.equal(isPrivateByokEnabled(candidate.id), candidate.availability === 'active');
  }
  assert.equal(isPrivateByokEnabled('__proto__'), false);
  assert.equal(isPrivateByokEnabled('fred'), false);
});
