import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  GROWTH_INTELLIGENCE_PLAN_PATH,
  buildGrowthIntelligenceDraftBundle,
} from './growth-intelligence-drafts.mjs';

test('offline Social Content Engine CLI projects the imported source snapshot', () => {
  const bundle = buildGrowthIntelligenceDraftBundle();
  assert.equal(bundle.contractVersion, 'CAPITAL_AI_GROWTH_INTELLIGENCE_DRAFT_BUNDLE@1');
  assert.equal(bundle.sourcePath, GROWTH_INTELLIGENCE_PLAN_PATH);
  const bytes = readFileSync(fileURLToPath(new URL('../../' + GROWTH_INTELLIGENCE_PLAN_PATH, import.meta.url)));
  assert.equal(bundle.sourceSha256, createHash('sha256').update(bytes).digest('hex'));
  assert.equal(bundle.drafts.length, 7);
  assert.equal(bundle.publicPublishAllowed, false);
  assert.equal(bundle.publicationState, 'DRAFT_ONLY');
  assert.equal(bundle.providerCalls, 0);
  assert.equal(bundle.campaignSpend, 0);
  assert.equal(bundle.mediaAssetsProduced, 0);
  assert.ok(bundle.drafts.every((draft) => draft.socialPackage.approvals.length === 0));
  assert.ok(bundle.drafts.every((draft) => draft.socialPackage.deliveries.length === 0));
});

test('repeat builds are content-addressed and byte-identical without provider state', () => {
  const a = JSON.stringify(buildGrowthIntelligenceDraftBundle());
  const b = JSON.stringify(buildGrowthIntelligenceDraftBundle());
  assert.equal(a, b);
});
