import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { PROJECT_OWNERS } from '../roadmapData';

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
