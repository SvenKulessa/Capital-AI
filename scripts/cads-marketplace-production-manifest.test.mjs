import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { BENCHMARK_TIERS } from '../packages/benchmark-core/index.mjs';

const manifest = JSON.parse(readFileSync(
  new URL('../apps/cads-github-app/marketplace-plans.production.json', import.meta.url),
  'utf8',
));

test('production Marketplace exposes paid Starter Pro Enterprise only', () => {
  assert.equal(manifest.strategy, 'PAID_PRODUCTION');
  assert.equal(manifest.currency, 'USD');
  assert.equal(manifest.freePlanEnabled, false);
  assert.deepEqual(manifest.plans.map(plan => plan.id), ['starter', 'pro', 'enterprise']);
  for (const plan of manifest.plans) {
    assert.equal(plan.priceModel, 'FLAT_RATE');
    assert.deepEqual(plan.billing, ['monthly', 'yearly']);
  }
});

test('Marketplace plan capabilities cannot drift from canonical BENCHMARK_TIERS', () => {
  for (const plan of manifest.plans) {
    assert.deepEqual(plan.capabilities, BENCHMARK_TIERS[plan.id].capabilities);
  }
});

test('production manifest never invents USD price values', () => {
  assert.equal(manifest.priceValues.state, 'OWNER_INPUT_REQUIRED_IN_GITHUB_MARKETPLACE');
  assert.equal(JSON.stringify(manifest).includes('monthlyUsd'), false);
  assert.equal(JSON.stringify(manifest).includes('annualUsd'), false);
});
