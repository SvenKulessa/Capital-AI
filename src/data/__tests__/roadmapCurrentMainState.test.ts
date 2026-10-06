import assert from 'node:assert/strict';
import test from 'node:test';

import { WORK_PACKAGES } from '../roadmapData';
import {
  ROADMAP_CURRENT_STATE_OVERRIDES,
  ROADMAP_RECONCILIATION,
} from '../roadmapCurrentMainState';

test('roadmap reconciliation covers every canonical work package exactly once', () => {
  const packageIds = WORK_PACKAGES.map(item => item.id).sort();
  const reviewedIds = ROADMAP_RECONCILIATION.packageSources.map(item => item.id).sort();

  assert.equal(ROADMAP_RECONCILIATION.schema, 'CAPITAL_AI_ROADMAP_RECONCILIATION@1');
  assert.equal(ROADMAP_RECONCILIATION.packageCount, 108);
  assert.equal(new Set(packageIds).size, packageIds.length);
  assert.equal(new Set(reviewedIds).size, reviewedIds.length);
  assert.deepEqual(reviewedIds, packageIds);
});

test('current-state overrides reference only real roadmap packages', () => {
  const ids = new Set(WORK_PACKAGES.map(item => item.id));
  for (const id of Object.keys(ROADMAP_CURRENT_STATE_OVERRIDES)) {
    assert.ok(ids.has(id), `unknown roadmap override: ${id}`);
  }
});

test('implemented UI and QA baselines are no longer projected as unstarted pending work', () => {
  for (const id of ['AP-FE-01', 'AP-FE-02', 'AP-FE-03', 'AP-QA-01']) {
    const item = WORK_PACKAGES.find(candidate => candidate.id === id);
    assert.ok(item);
    assert.equal(item.status, 'aktiv');
    assert.equal(item.evidenceState, 'VERIFIED');
    assert.equal(item.progressPercent, 100);
  }
});

test('production and execution packages stay open despite implemented slices', () => {
  for (const id of [
    'AP-OPS-01',
    'AP-FIN-01',
    'AP-FIN-03',
    'PRODUCTION-WEB-01-PRODUCT',
    'PRODUCTION-WEB-01-MARKET',
  ]) {
    const item = WORK_PACKAGES.find(candidate => candidate.id === id);
    assert.ok(item);
    assert.notEqual(item.evidenceState, 'VERIFIED');
    assert.equal(item.progressPercent, null);
  }
});

test('CADS monetization is active but GitHub Marketplace remains an open authority', () => {
  const benchmark = WORK_PACKAGES.find(item => item.id === 'CA-PRODUCT-BENCHMARK-MARKETPLACE');
  const marketplace = WORK_PACKAGES.find(item => item.id === 'CA-PRODUCT-CADS-GITHUB-MARKETPLACE');

  assert.ok(benchmark);
  assert.ok(marketplace);
  assert.equal(benchmark.status, 'aktiv');
  assert.equal(marketplace.status, 'aktiv');
  assert.equal(benchmark.evidenceState, 'OFFEN');
  assert.equal(marketplace.evidenceState, 'OFFEN');
  assert.match(marketplace.nextStep, /Community-first/);
  assert.match(marketplace.nextStep, /Paid Plan IDs.*unassigned/);
  assert.ok(marketplace.evidenceRefs.includes('server/cads-commerce.mjs'));
  assert.ok(marketplace.evidenceRefs.includes('server/cads-marketplace-community.mjs'));
  assert.ok(marketplace.evidenceRefs.includes('apps/cads-github-app/marketplace-plans.json'));
});

test('MARKET production package reflects the merged private-provider read-only bridge', () => {
  const market = WORK_PACKAGES.find(item => item.id === 'PRODUCTION-WEB-01-MARKET');
  assert.ok(market);
  assert.equal(market.status, 'aktiv');
  assert.equal(market.evidenceState, 'OFFEN');
  assert.ok(market.evidenceRefs.includes('server/private-provider-query.mjs'));
  assert.ok(market.evidenceRefs.includes('services/provider-bridge-rs/src/main.rs'));
  assert.match(market.nextStep, /Kraken\/Binance Read-only Private-Provider-Pfad/);
});

test('observability keeps Grafana Cloud/Supabase as an existing operator-confirmed integration', () => {
  const observability = WORK_PACKAGES.find(item => item.id === 'CA-PLATFORM-OBSERVABILITY-BASELINE');
  assert.ok(observability);
  assert.equal(observability.evidenceState, 'VERIFIED');
  assert.match(observability.nextStep, /Grafana Cloud \+ Supabase/);
  assert.match(observability.nextStep, /technischen Readback/);
});
