import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { PROJECT_OWNERS, ROADMAP_STRATEGIC_PRIORITIES, WORK_PACKAGES } from '../roadmapData';

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
  assert.match(panel, /Domains auswählen/);
  assert.match(panel, /Status auswählen/);
  assert.match(panel, /selectedStates\.includes\(item\.evidenceState\)/);
  assert.match(panel, /type="checkbox"/);
  assert.match(panel, /checked=\{selectedOwners\.includes\(project\.id\)\}/);
  assert.match(panel, /sm:flex-row sm:items-start sm:justify-between/);
  assert.match(panel, /h-8 w-8/);
  assert.match(panel, /h-20 w-20 shrink-0 sm:h-24 sm:w-24/);
});

test('owner strategy places learning commerce marketing truthful website search SEO and social pipeline first', () => {
  const focus = ROADMAP_STRATEGIC_PRIORITIES;
  assert.deepEqual(focus.map(item => item.id), [
    'COMMERCE-LEARNING',
    'MARKETING-DISTRIBUTION',
    'WEBSITE-CORRECTNESS',
    'SEARCH-SEO',
    'CONTENT-SOCIAL-PIPELINE',
  ]);
  assert.deepEqual(focus.map(item => item.rank), [1, 2, 3, 4, 5]);
  assert.ok(focus.every(item => item.level === 'TOP' && item.evidenceState === 'OFFEN'));
  const packages = new Map(WORK_PACKAGES.map(item => [item.id, item]));
  for (const item of focus) {
    assert.ok(item.objective && item.nextAction, item.id);
    assert.ok(item.domains.length > 0 && item.workPackageIds.length > 0, item.id);
    for (const id of item.workPackageIds) {
      assert.ok(packages.has(id), item.id + ': missing roadmap package ' + id);
    }
  }
  for (const id of [
    'CA-GROWTH-SEO-ARCHITECTURE',
    'CA-GROWTH-CONTENT-ENGINE',
    'CA-GROWTH-CONTENT-SOCIAL-PACKAGE',
    'PRODUCTION-WEB-01-PRODUCT',
    'PRODUCTION-WEB-01-GROWTH',
  ]) {
    assert.equal(packages.get(id)?.priority, 'Kritisch', id);
  }
});

test('roadmap UI makes strategic priorities visible before filtered work packages', () => {
  const panel = readFileSync(new URL('../../components/RoadmapPanel.tsx', import.meta.url), 'utf8');
  assert.match(panel, /ROADMAP_STRATEGIC_PRIORITIES\.map/);
  assert.match(panel, /aria-labelledby="roadmap-strategy-heading"/);
  assert.match(panel, /Oberste Priorität · Umsatz, Reichweite und belastbare Website/);
  assert.match(panel, /STRATEGIC_PACKAGE_RANK\.get\(a\.id\)/);
  assert.ok(panel.indexOf('roadmap-strategy-heading') < panel.indexOf('Roadmap Statusfilter'));
});

test('AGENTS.md mandates 1–3 evidence-based next-chat suggestions in every domain without new gates', () => {
  const agents = readFileSync(new URL('../../../AGENTS.md', import.meta.url), 'utf8');
  assert.match(agents, /## Verbindliche nächste Schritte im Domain-Chat \(1–3 Vorschläge\)/);
  assert.match(agents, /PRODUCT, MARKET, PLATFORM, TRUST und GROWTH/);
  assert.match(agents, /am Ende 1 bis 3 konkrete/);
  assert.match(agents, /🔧 OFFEN \/ NÄCHSTE SCHRITTE/);
  assert.match(agents, /keine.*zusätzliche technische, rechtliche oder organisatorische Freigabeschicht/);
  assert.match(agents, /👋⚙️/);
  assert.match(agents, /Docker Security Gate/);
  assert.match(agents, /Domain Governance/);
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

test('Control Center roadmap reads GitHub main on a 90-minute bounded refresh while retaining review evidence', () => {
  const panel = readFileSync(new URL('../../components/RoadmapPanel.tsx', import.meta.url), 'utf8');
  assert.match(panel, /90 \* 60 \* 1000/);
  assert.match(panel, /\/api\/internal\/repository-tools/);
  assert.match(panel, /credentials: 'same-origin'/);
  assert.match(panel, /cache: 'no-store'/);
  assert.match(panel, /controller\.abort\(\)/);
  assert.match(panel, /mergeAudit\.lastReconciledPr/);
  assert.match(panel, /ROADMAP_SNAPSHOT\.repository/);
  assert.match(panel, /repositoryStatus\.sourceSha/);
  assert.match(panel, /selectedOwners\.includes\(item\.owner\)/);
  assert.match(panel, /selectedStates\.includes\(item\.evidenceState\)/);
});
