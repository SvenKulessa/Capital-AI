import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';
import { assessRoadmapSourceLineage, ROADMAP_LINEAGE_SOURCE } from '../../../shared/roadmap-source-lineage.mjs';
import { createRepositoryToolCatalog } from '../../../server/repository-tool-catalog.mjs';
import {
  projectRoadmapDelta,
  serializeRoadmapOwnerLineageEvidence,
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
  assert.match(deltaPanel, /Bereinigten Lineage-Nachweis kopieren/);
  assert.match(deltaPanel, /manualEvidence/);
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


const LINEAGE_HEAD = '1b95b92f2738b99ca2d06cd7bcd6219ae01e54d8';
const LINEAGE_TREE = ROADMAP_LINEAGE_SOURCE.protectedBlobs.map(source => ({
  type: 'blob',
  path: source.path,
  sha: source.sha,
}));
const LINEAGE_COMPARE = {
  status: 'ahead',
  ahead_by: 1,
  behind_by: 0,
  total_commits: 1,
  base_commit: { sha: ROADMAP_LINEAGE_SOURCE.baselineMainSha },
  merge_base_commit: { sha: ROADMAP_LINEAGE_SOURCE.baselineMainSha },
  commits: [{ sha: LINEAGE_HEAD }],
};

test('GitHub ancestry and exact pinned blobs preserve code source across an unchanged fast-forward commit', () => {
  assert.equal(ROADMAP_DELTA_BASELINE.baselineMainSha, ROADMAP_LINEAGE_SOURCE.baselineMainSha);
  const proof = assessRoadmapSourceLineage({
    headSha: LINEAGE_HEAD, compare: LINEAGE_COMPARE, tree: LINEAGE_TREE,
  });
  assert.ok(proof);
  assert.equal(proof.schema, 'CAPITAL_AI_ROADMAP_SOURCE_LINEAGE@1');
  assert.equal(proof.status, 'SOURCE_UNCHANGED');
  assert.equal(proof.observedMainSha, LINEAGE_HEAD);
  assert.equal(proof.aheadCommits, 1);

  const projected = projectRoadmapDelta({
    repository: ROADMAP_LINEAGE_SOURCE.repository,
    sourceSha: LINEAGE_HEAD, freshness: 'LIVE', roadmapLineage: proof,
  });
  assert.equal(projected.mainMatched, false);
  assert.equal(projected.lineageMatched, true);
  assert.equal(projected.sourceMatched, true);
  assert.equal(projected.items.find(item => item.scopeId === 'VOCAB-ARCHITECTURE')?.code, 'VERIFIED');
  assert.ok(projected.items.every(item => item.ci === 'NOT_PROVEN' && item.runtime === 'NOT_PROVEN'));
  assert.equal(projected.items.find(item => item.scopeId === 'BLUEPRINT-COMMERCE')?.rights, 'BLOCKED');
  assert.equal(projected.items.find(item => item.scopeId === 'SOCIAL-X-PILOT')?.code, 'IN_PROGRESS');
});

test('changed blobs, forks, wrong head, incomplete commit ancestry and oversized histories fail closed', () => {
  const valid = { headSha: LINEAGE_HEAD, compare: LINEAGE_COMPARE, tree: LINEAGE_TREE };
  const negatives = [
    { ...valid, headSha: 'f'.repeat(40) },
    { ...valid, compare: { ...LINEAGE_COMPARE, status: 'diverged', behind_by: 1 } },
    { ...valid, compare: { ...LINEAGE_COMPARE, merge_base_commit: { sha: 'f'.repeat(40) } } },
    { ...valid, compare: { ...LINEAGE_COMPARE, total_commits: 31, ahead_by: 31 } },
    { ...valid, compare: { ...LINEAGE_COMPARE, commits: [] } },
    { ...valid, compare: { ...LINEAGE_COMPARE, commits: [{ sha: 'f'.repeat(40) }] } },
    { ...valid, tree: LINEAGE_TREE.map(row => row.path === LINEAGE_TREE[0].path
      ? { ...row, sha: 'f'.repeat(40) } : row) },
    { ...valid, tree: LINEAGE_TREE.slice(0, 1) },
    { ...valid, tree: [...LINEAGE_TREE, LINEAGE_TREE[0]] },
  ];
  for (const [index, caseInput] of negatives.entries()) {
    assert.equal(assessRoadmapSourceLineage(caseInput), null, 'negative-case ' + index);
  }
});

test('fast-forward limit admits exactly 30 complete commits and rejects 31 complete commits', () => {
  const makeCompare = (count: number) => ({
    ...LINEAGE_COMPARE,
    ahead_by: count,
    total_commits: count,
    // Full and syntactically valid ordered history; the last commit is the requested head.
    commits: Array.from({ length: count }, (_, i) => ({
      sha: i === count - 1 ? LINEAGE_HEAD : (i + 1).toString(16).padStart(40, '0'),
    })),
  });
  assert.equal(ROADMAP_LINEAGE_SOURCE.maxAheadCommits, 30);
  const atLimit = assessRoadmapSourceLineage({
    headSha: LINEAGE_HEAD,
    compare: makeCompare(30),
    tree: LINEAGE_TREE,
  });
  assert.ok(atLimit, 'exactly 30 complete commits with unchanged protected blobs are admissible');
  assert.equal(atLimit.aheadCommits, 30);

  const overLimit = assessRoadmapSourceLineage({
    headSha: LINEAGE_HEAD,
    compare: makeCompare(31),
    tree: LINEAGE_TREE,
  });
  assert.equal(overLimit, null, '31 complete commits exceed the explicit source-provenance limit');
  assert.equal(assessRoadmapSourceLineage({
    headSha: LINEAGE_HEAD,
    compare: makeCompare(0),
    tree: LINEAGE_TREE,
  }), null, 'zero commits do not prove a forward lineage');
});

test('untrusted, cached and stale client lineage cannot authorize source VERIFIED', () => {
  const proof = assessRoadmapSourceLineage({
    headSha: LINEAGE_HEAD, compare: LINEAGE_COMPARE, tree: LINEAGE_TREE,
  });
  assert.ok(proof);
  const candidates = [
    { ...proof, observedMainSha: 'f'.repeat(40) },
    { ...proof, baselineMainSha: 'f'.repeat(40) },
    { ...proof, status: 'VERIFIED' },
    { ...proof, protectedBlobs: [{ ...proof.protectedBlobs[0], sha: 'f'.repeat(40) }, proof.protectedBlobs[1]] },
  ];
  for (const forged of candidates) {
    const state = projectRoadmapDelta({
      repository: ROADMAP_LINEAGE_SOURCE.repository,
      sourceSha: LINEAGE_HEAD, freshness: 'LIVE', roadmapLineage: forged,
    });
    assert.equal(state.sourceMatched, false);
    assert.ok(state.items.every(item => item.code === 'NOT_PROVEN'));
  }
  for (const freshness of ['CACHED', 'STALE'] as const) {
    const state = projectRoadmapDelta({
      repository: ROADMAP_LINEAGE_SOURCE.repository,
      sourceSha: LINEAGE_HEAD, freshness, roadmapLineage: proof,
    });
    assert.equal(state.sourceMatched, false);
  }
});

test('existing owner catalog adds bounded lineage evidence and fails closed without GitHub proof', async () => {
  const pathTree = [
    { type: 'blob', path: 'package.json', sha: 'c'.repeat(40) },
    { type: 'blob', path: 'package-lock.json', sha: 'd'.repeat(40) },
    ...LINEAGE_TREE,
  ];
  const calls: string[] = [];
  const compareFetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith('/branches/main')) {
      return new Response(JSON.stringify({ commit: { sha: LINEAGE_HEAD } }));
    }
    if (url.includes('/git/trees/')) {
      return new Response(JSON.stringify({ tree: pathTree, truncated: false }));
    }
    if (url.includes('/compare/')) {
      return new Response(JSON.stringify(LINEAGE_COMPARE));
    }
    if (url.endsWith('/package.json')) {
      return new Response(JSON.stringify({ name: 'capital-ai', version: '0.8.0-alpha.1' }));
    }
    if (url.endsWith('/package-lock.json')) {
      return new Response(JSON.stringify({ packages: {} }));
    }
    return new Response('', { status: 404 });
  };
  const catalog = createRepositoryToolCatalog({ fetchImpl: compareFetch, now: () => 123_456 });
  const state = await catalog.snapshot();
  assert.equal(state.freshness, 'LIVE');
  assert.equal(state.sourceSha, LINEAGE_HEAD);
  assert.equal(state.roadmapLineage?.observedMainSha, LINEAGE_HEAD);
  assert.equal(calls.filter(url => url.includes('/compare/')).length, 1);
  assert.equal((await catalog.snapshot()).freshness, 'CACHED');
  assert.equal(calls.filter(url => url.includes('/compare/')).length, 1);

  const broken = createRepositoryToolCatalog({
    fetchImpl: async (input: RequestInfo | URL) => String(input).includes('/compare/')
      ? new Response('', { status: 503 })
      : compareFetch(input),
  });
  const fallback = await broken.snapshot();
  assert.equal(fallback.freshness, 'LIVE');
  assert.equal(fallback.roadmapLineage, null);
});


test('owner lineage export contains only fresh, explicitly allowed source fields', () => {
  const proof = assessRoadmapSourceLineage({
    headSha: LINEAGE_HEAD, compare: LINEAGE_COMPARE, tree: LINEAGE_TREE,
  });
  assert.ok(proof);
  const observedAt = '2026-11-07T07:30:00.000Z';
  const currentMs = Date.parse(observedAt) + 20_000;
  const untrustedRawPayload = {
    repository: ROADMAP_LINEAGE_SOURCE.repository,
    sourceSha: LINEAGE_HEAD,
    deployedSha: LINEAGE_HEAD,
    observedAt,
    freshness: 'LIVE' as const,
    roadmapLineage: proof,
    authorization: 'DO_NOT_EXPORT',
    privateTenantId: 'DO_NOT_EXPORT',
    sessionCookie: 'DO_NOT_EXPORT',
    accessToken: 'DO_NOT_EXPORT',
  };
  const text = serializeRoadmapOwnerLineageEvidence(untrustedRawPayload, currentMs);
  assert.ok(text);
  assert.doesNotMatch(text, /DO_NOT_EXPORT|authorization|sessionCookie|accessToken|privateTenantId/);
  const evidence = JSON.parse(text);
  assert.deepEqual(Object.keys(evidence), [
    'schema', 'capture', 'scope', 'repository', 'sourceSha',
    'deployedSha', 'observedAt', 'freshness', 'roadmapLineage', 'ciRuntimeRights',
  ]);
  assert.equal(evidence.schema, 'CAPITAL_AI_ROADMAP_OWNER_READBACK@1');
  assert.equal(evidence.capture, 'owner_control_center_manual_copy');
  assert.equal(evidence.scope, 'SOURCE_LINEAGE_ONLY');
  assert.equal(evidence.sourceSha, LINEAGE_HEAD);
  assert.equal(evidence.roadmapLineage.status, 'SOURCE_UNCHANGED');
  assert.equal(evidence.roadmapLineage.observedMainSha, LINEAGE_HEAD);
  assert.deepEqual(evidence.roadmapLineage.protectedBlobs, LINEAGE_TREE.map(row => ({
    path: row.path, sha: row.sha,
  })));
  assert.equal(evidence.ciRuntimeRights, 'NOT_INFERRED');
});

test('owner lineage export is unavailable for stale, tampered, missing or oversized proofs', () => {
  const proof = assessRoadmapSourceLineage({
    headSha: LINEAGE_HEAD, compare: LINEAGE_COMPARE, tree: LINEAGE_TREE,
  });
  assert.ok(proof);
  const observedAt = '2026-11-07T07:30:00.000Z';
  const currentMs = Date.parse(observedAt);
  const valid = {
    repository: ROADMAP_LINEAGE_SOURCE.repository,
    sourceSha: LINEAGE_HEAD,
    deployedSha: LINEAGE_HEAD,
    observedAt,
    freshness: 'LIVE' as const,
    roadmapLineage: proof,
  };
  const badSnapshots = [
    null,
    { ...valid, freshness: 'CACHED' as const },
    { ...valid, freshness: 'STALE' as const },
    { ...valid, repository: 'unknown/repository' },
    { ...valid, roadmapLineage: null },
    { ...valid, roadmapLineage: { ...proof, observedMainSha: 'f'.repeat(40) } },
    { ...valid, roadmapLineage: { ...proof, protectedBlobs: [{ ...proof.protectedBlobs[0], sha: 'f'.repeat(40) }, proof.protectedBlobs[1]] } },
    { ...valid, observedAt: 'not-a-time' },
  ];
  for (const snapshot of badSnapshots) {
    assert.equal(serializeRoadmapOwnerLineageEvidence(snapshot, currentMs), null);
  }
  assert.equal(serializeRoadmapOwnerLineageEvidence(valid, currentMs + 600_001), null,
    'old LIVE snapshot is not fresh evidence');
  assert.equal(serializeRoadmapOwnerLineageEvidence(valid, currentMs - 120_001), null,
    'future timestamp is not accepted beyond clock skew');
  assert.equal(serializeRoadmapOwnerLineageEvidence(valid, Number.NaN), null);
});
