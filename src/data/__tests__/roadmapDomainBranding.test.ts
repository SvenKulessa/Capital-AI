import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { PROJECT_OWNERS, WORK_PACKAGES } from '../roadmapData';

const EXPECTED = ['PRODUCT', 'MARKET', 'PLATFORM', 'TRUST', 'GROWTH'] as const;

test('roadmap domain branding registry maps all five canonical domains exactly once', () => {
  assert.deepEqual(PROJECT_OWNERS.map(project => project.id), EXPECTED);
  assert.equal(new Set(PROJECT_OWNERS.map(project => project.badgeAsset)).size, EXPECTED.length);
  assert.equal(new Set(PROJECT_OWNERS.map(project => project.badgeSha256)).size, EXPECTED.length);
});

test('every roadmap domain badge is hash-bound and has accessible SVG metadata', () => {
  for (const project of PROJECT_OWNERS) {
    const assetPath = fileURLToPath(project.badgeAsset);
    const content = readFileSync(assetPath, 'utf8');
    const sha256 = createHash('sha256').update(content).digest('hex');

    assert.equal(sha256, project.badgeSha256, `${project.id} badge SHA-256 drift`);
    assert.match(content, /<title id="title">CAPITAL-AI-/);
    assert.match(content, /<desc id="desc">/);
    assert.match(content, /width="256" height="256" viewBox="0 0 256 256"/);
    assert.match(content, /LicenseRef-CAPITAL-AI-PROPRIETARY-BADGE-1\.0/);
    assert.match(project.licensePath, /^CAPITAL-AI-[A-Z]+\/.*\.LICENSE\.md$/);
  }
});

test('roadmap panel renders domain badges on filter and work-package cards responsively', () => {
  const panel = readFileSync(new URL('../../components/RoadmapPanel.tsx', import.meta.url), 'utf8');

  assert.match(panel, /aria-label="CAPITAL-AI Roadmap Domains"/);
  assert.match(panel, /src=\{project\.badgeAsset\}/);
  assert.match(panel, /grid-cols-1 sm:grid-cols-2 xl:grid-cols-5/);
  assert.match(panel, /sm:flex-row sm:items-start sm:justify-between/);
  assert.match(panel, /h-24 w-24 sm:h-28 sm:w-28/);
  assert.match(panel, /h-20 w-20 shrink-0 sm:h-24 sm:w-24/);
});

test('SEO roadmap is consolidated into one chronological GROWTH work package', () => {
  const seoPackages = WORK_PACKAGES.filter(item =>
    item.id === 'CA-GROWTH-SEO-ARCHITECTURE' || item.id.startsWith('AP-SEO-')
  );

  assert.equal(seoPackages.length, 1);
  const [seo] = seoPackages;
  assert.equal(seo.id, 'CA-GROWTH-SEO-ARCHITECTURE');
  assert.equal(seo.owner, 'GROWTH');
  assert.equal(seo.evidenceState, 'OFFEN');
  assert.equal(seo.deliverables.length, 12);
  seo.deliverables.forEach((deliverable, index) => {
    assert.match(deliverable, new RegExp(`^${String(index + 1).padStart(2, '0')} · SEO-`));
  });
});

test('roadmap panel renders work-package deliverables in stored order', () => {
  const panel = readFileSync(new URL('../../components/RoadmapPanel.tsx', import.meta.url), 'utf8');

  assert.match(panel, /item\.deliverables\.map/);
  assert.match(panel, /Arbeitspunkte · Reihenfolge wie in der Roadmap/);
  assert.match(panel, /list-decimal/);
});



test('MARKET production package is one chronological fail-closed commercial work package', () => {
  const market = WORK_PACKAGES.find(item => item.id === 'PRODUCTION-WEB-01-MARKET');

  assert.ok(market);
  assert.equal(market.owner, 'MARKET');
  assert.equal(market.status, 'aktiv');
  assert.equal(market.evidenceState, 'OFFEN');
  assert.equal(market.progressPercent, null);
  assert.equal(market.deliverables.length, 20);
  market.deliverables.forEach((deliverable, index) => {
    assert.match(deliverable, new RegExp(`^${String(index + 1).padStart(2, '0')} · MARKET-`));
  });

  for (const legacyId of ['AP-FIN-01', 'AP-FIN-02', 'AP-FIN-03']) {
    assert.ok(WORK_PACKAGES.some(item => item.id === legacyId), `${legacyId} remains traceable in the roadmap`);
  }
});


test('multi-agent roadmap remains planning-only until owner architecture decision', () => {
  const orchestration = WORK_PACKAGES.find(item => item.id === 'CA-PRODUCT-MULTI-AGENT-ORCHESTRATION');
  const trajectory = WORK_PACKAGES.find(item => item.id === 'CA-PLATFORM-AGENT-TRAJECTORY-OBSERVABILITY');
  const control = WORK_PACKAGES.find(item => item.id === 'CA-PRODUCT-AGENT-PATH-CONTROL-CENTER');
  const rebalance = WORK_PACKAGES.find(item => item.id === 'AP-AGT-03');

  assert.ok(orchestration);
  assert.ok(trajectory);
  assert.ok(control);
  assert.ok(rebalance);

  assert.equal(orchestration.status, 'planning');
  assert.equal(orchestration.evidenceState, 'UNGEKLÄRT');
  assert.match(orchestration.nextStep, /Owner entscheidet Architekturvariante A\/B\/C/);

  assert.equal(trajectory.status, 'planning');
  assert.match(trajectory.deliverables.join(' '), /CAPITAL_AI_AGENT_TRAJECTORY@1/);
  assert.match(trajectory.description, /Operational Telemetry ersetzt keinen Security Audit/);

  assert.equal(control.status, 'planning');
  assert.ok(control.dependencies?.includes('CA-PLATFORM-AGENT-TRAJECTORY-OBSERVABILITY'));

  assert.match(rebalance.description, /Proposal-only/);
  assert.match(rebalance.description, /kein Agent erhält aus dem Graph-Routing selbst Trading- oder Mutation-Authority/);
  assert.ok(rebalance.dependencies?.includes('CA-PRODUCT-MULTI-AGENT-ORCHESTRATION'));
  assert.ok(rebalance.dependencies?.includes('CA-TRUST-AUTONOMOUS-RESEARCH-GOVERNANCE'));
});
