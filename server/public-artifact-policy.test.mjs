import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { isBlockedPublicArtifactPath, publicArtifactPolicySnapshot } from './public-artifact-policy.mjs';

test('commercial Blueprint static downloads are fail-closed', () => {
  assert.equal(isBlockedPublicArtifactPath('/downloads/blueprints/TIER_1_4_LIVE.md'), true);
  assert.equal(isBlockedPublicArtifactPath('/downloads/blueprints/secret.JSON'), true);
  assert.equal(isBlockedPublicArtifactPath('/downloads/CAPITAL-AI_BYOK_2026-10-05.md'), false);
  assert.equal(isBlockedPublicArtifactPath('/branding/badges/data-pipeline-blueprint.svg'), false);
  assert.deepEqual(publicArtifactPolicySnapshot(), {
    schema: 'CAPITAL_AI_PUBLIC_ARTIFACT_POLICY@1',
    blockedPrefixes: ['/downloads/blueprints/'],
    blueprintFullArtifactsPublic: false,
  });
});

test('public homepage excludes the internal content-engine status panel while preserving the product entry points', () => {
  const source = readFileSync(new URL('../src/features/home/HomePage.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /ContentEngineConcept|SocialContentEngineStatus/);
  assert.match(source, /<Hero onExploreProduct=/);
  assert.match(source, /<HomeHubDirectory/);
  assert.match(source, /<HomeEditorialNews/);
  assert.match(source, /keine verifizierten Live-Kurse/);
});
