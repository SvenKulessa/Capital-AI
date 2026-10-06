import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSocialEngineCompletionGate } from './validate-social-engine-completion-gate.mjs';

test('Punkt 6 hält Finance-Scoring bis zu Lizenz-PASS und Social-Engine-Cutover fail-closed', () => {
  const result = evaluateSocialEngineCompletionGate();

  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.runtime.present, 0);
  assert.equal(result.runtime.required, 13);
  assert.equal(result.renderer.present, 0);
  assert.equal(result.renderer.required, 2);
  assert.equal(result.evidence.present, 6);
  assert.equal(result.evidence.required, 6);
  assert.equal(result.licenseEvidence.status, 'POINT_4_ARTIFACT_LOCK_ADVANCED_FAIL_CLOSED');
  assert.equal(result.licenseEvidence.requiredStatus, 'POINT_4_PASS');
  assert.equal(result.licenseEvidence.pass, false);
  assert.deepEqual(result.financeScoringRuntimePresentBeforePass, []);
  assert.equal(result.followUpBacklogStatus, 'BLOCKED_BY_SOCIAL_MEDIA_ENGINE_MIGRATION');
});
