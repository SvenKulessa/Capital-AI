import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';
import {
  projectRoadmapDelta,
  ROADMAP_DELTA_BASELINE,
  ROADMAP_DELTA_HISTORY,
  ROADMAP_DELTA_ITEMS,
} from '../roadmapDeltaReconciliation';
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
  assert.equal(ROADMAP_RECONCILIATION.packageCount, 105);
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
  assert.match(marketplace.nextStep, /Paid Billing\/Entitlement Runtime ist implementiert/);
  assert.match(marketplace.nextStep, /capital-ai-online\/CADS/);
  assert.doesNotMatch(marketplace.nextStep, /CAPITAL_AI_EVENT_BACKBONE@1/);
  assert.match(marketplace.nextStep, /Verified Publisher/);
  assert.ok(marketplace.evidenceRefs.includes('server/cads-commerce.mjs'));
  assert.ok(marketplace.evidenceRefs.includes('server/cads-marketplace.mjs'));
  assert.ok(marketplace.evidenceRefs.includes('apps/cads-github-app/marketplace-plans.production.json'));
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

test('chat-to-main delta contract is scoped, versioned and references existing roadmap packages', () => {
  assert.equal(ROADMAP_DELTA_BASELINE.schema, 'CAPITAL_AI_CHAT_MAIN_DELTA@1');
  assert.equal(ROADMAP_DELTA_BASELINE.issue, 598);
  assert.match(ROADMAP_DELTA_BASELINE.baselineMainSha, /^[0-9a-f]{40}$/);
  assert.equal(ROADMAP_DELTA_BASELINE.scope, 'FOUR_EVIDENCE_SLICES');
  assert.equal(ROADMAP_DELTA_ITEMS.length, 4);
  assert.equal(new Set(ROADMAP_DELTA_ITEMS.map(item => item.scopeId)).size, 4);
  const ids = new Set(WORK_PACKAGES.map(item => item.id));
  assert.equal(WORK_PACKAGES.length, ROADMAP_RECONCILIATION.packageSources.length);
  for (const item of ROADMAP_DELTA_ITEMS) {
    if (item.roadmapId) assert.ok(ids.has(item.roadmapId), item.scopeId);
    assert.match(item.sourceUrl, /^https:\/\/github\.com\/SvenKulessa\/Capital-AI\//);
    assert.match(item.trackingUrl, /^https:\/\/github\.com\/SvenKulessa\/Capital-AI\//);
    assert.ok(item.nextStep.length > 20);
  }
});

test('matching LIVE main preserves only source-level code evidence, never runtime or rights approval', () => {
  const delta = projectRoadmapDelta({
    repository: ROADMAP_DELTA_BASELINE.repository,
    sourceSha: ROADMAP_DELTA_BASELINE.baselineMainSha,
    freshness: 'LIVE',
  });
  assert.equal(delta.mainMatched, true);
  assert.equal(delta.items.find(item => item.scopeId === 'VOCAB-ARCHITECTURE')?.code, 'VERIFIED');
  assert.equal(delta.items.find(item => item.scopeId === 'PRIVATE-NOTES-OCC-V2')?.code, 'IN_PROGRESS');
  assert.equal(delta.items.find(item => item.scopeId === 'BLUEPRINT-COMMERCE')?.rights, 'BLOCKED');
  assert.ok(delta.items.every(item => item.ci === 'NOT_PROVEN' && item.runtime === 'NOT_PROVEN'));
  assert.ok(delta.items.every(item => item.scopeId !== 'SOCIAL-X-PILOT' || item.rights === 'REVIEW_REQUIRED'));
});

test('a different main SHA invalidates all pinned code claims instead of promoting PR-only work', () => {
  const changedMain = 'f'.repeat(40);
  const delta = projectRoadmapDelta({
    repository: ROADMAP_DELTA_BASELINE.repository,
    sourceSha: changedMain,
    freshness: 'LIVE',
  });
  assert.equal(delta.mainMatched, false);
  assert.equal(delta.observedMainSha, changedMain);
  assert.ok(delta.items.every(item => item.code === 'NOT_PROVEN'));
  assert.equal(delta.items.find(item => item.scopeId === 'BLUEPRINT-COMMERCE')?.rights, 'BLOCKED');
});

test('missing, cached, stale, malformed or wrong-repository readbacks fail closed', () => {
  const input = [
    null,
    { repository: ROADMAP_DELTA_BASELINE.repository, sourceSha: ROADMAP_DELTA_BASELINE.baselineMainSha, freshness: 'CACHED' as const },
    { repository: ROADMAP_DELTA_BASELINE.repository, sourceSha: ROADMAP_DELTA_BASELINE.baselineMainSha, freshness: 'STALE' as const },
    { repository: 'other/repository', sourceSha: ROADMAP_DELTA_BASELINE.baselineMainSha, freshness: 'LIVE' as const },
    { repository: ROADMAP_DELTA_BASELINE.repository, sourceSha: 'not-a-sha', freshness: 'LIVE' as const },
  ];
  for (const readback of input) {
    const delta = projectRoadmapDelta(readback);
    assert.equal(delta.mainMatched, false);
    assert.ok(delta.items.every(item => item.code === 'NOT_PROVEN'));
  }
});

test('chat-to-main delta display remains in owner-only Control Center without new network calls', () => {
  const shell = readFileSync(new URL('../../components/ControlCenterPage.tsx', import.meta.url), 'utf8');
  const roadmap = readFileSync(new URL('../../components/RoadmapPanel.tsx', import.meta.url), 'utf8');
  const deltaPanel = readFileSync(new URL('../../components/RoadmapDeltaPanel.tsx', import.meta.url), 'utf8');
  assert.match(shell, /if \(ownerAccess !== 'allowed'\) return null/);
  assert.match(shell, /activeTab === 'roadmap' && <RoadmapPanel \/>/);
  assert.match(roadmap, /<RoadmapDeltaPanel readback=\{repositoryStatus\} \/>/);
  assert.match(deltaPanel, /projectRoadmapDelta\(readback\)/);
  assert.match(deltaPanel, /delta\.items\.map/);
  assert.doesNotMatch(deltaPanel, /fetch\s*\(/);
  assert.doesNotMatch(deltaPanel, /publish\(/i);
});

test('revision 2 preserves the original main evidence snapshot without mutating the 105-package historical review', () => {
  assert.equal(ROADMAP_DELTA_BASELINE.revision, 2);
  assert.equal(ROADMAP_DELTA_BASELINE.supportingMergePr, 601);
  assert.equal(ROADMAP_DELTA_HISTORY.length, 1);
  const historical = ROADMAP_DELTA_HISTORY[0];
  assert.equal(historical.revision, 1);
  assert.equal(historical.baselineMainSha, '2736bf98acff8ff19d789f70d44a04f3046f690f');
  assert.equal(ROADMAP_DELTA_BASELINE.previousBaselineMainSha, historical.baselineMainSha);
  assert.equal(ROADMAP_DELTA_BASELINE.baselineMainSha, '6c2f695a79a739de4e0770140396b36b72ab26f7');
  assert.notEqual(ROADMAP_DELTA_BASELINE.baselineMainSha, historical.baselineMainSha);
  assert.equal(ROADMAP_RECONCILIATION.packageCount, 105);
  assert.equal(WORK_PACKAGES.length, ROADMAP_RECONCILIATION.packageSources.length);
});

test('old LIVE main snapshot cannot authorize a new code verification after revision bump', () => {
  const historical = ROADMAP_DELTA_HISTORY[0];
  const priorReadback = projectRoadmapDelta({
    repository: historical.repository,
    sourceSha: historical.baselineMainSha,
    freshness: 'LIVE',
  });
  assert.equal(priorReadback.mainMatched, false);
  assert.ok(priorReadback.items.every(item => item.code === 'NOT_PROVEN'));
  assert.equal(priorReadback.items.find(item => item.scopeId === 'BLUEPRINT-COMMERCE')?.rights, 'BLOCKED');
});

test('revision 2 source evidence remains distinct from runtime, CI and publishing rights', () => {
  const current = projectRoadmapDelta({
    repository: ROADMAP_DELTA_BASELINE.repository,
    sourceSha: ROADMAP_DELTA_BASELINE.baselineMainSha,
    freshness: 'LIVE',
  });
  assert.equal(current.mainMatched, true);
  assert.equal(current.items.find(item => item.scopeId === 'VOCAB-ARCHITECTURE')?.code, 'VERIFIED');
  assert.ok(current.items.every(item => item.ci === 'NOT_PROVEN' && item.runtime === 'NOT_PROVEN'));
  assert.equal(current.items.find(item => item.scopeId === 'PRIVATE-NOTES-OCC-V2')?.code, 'IN_PROGRESS');
  assert.equal(current.items.find(item => item.scopeId === 'SOCIAL-X-PILOT')?.code, 'IN_PROGRESS');
  assert.equal(current.items.find(item => item.scopeId === 'BLUEPRINT-COMMERCE')?.rights, 'BLOCKED');
  assert.ok(current.items.filter(item => item.sourceUrl.includes('/blob/'))
    .every(item => item.sourceUrl.includes(ROADMAP_DELTA_BASELINE.baselineMainSha)));
});
