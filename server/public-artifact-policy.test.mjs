import test from 'node:test';
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
