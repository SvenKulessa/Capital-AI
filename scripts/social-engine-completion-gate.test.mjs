import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSocialEngineCompletionGate } from './validate-social-engine-completion-gate.mjs';

test('Punkt 6 hält Finance-Scoring bis zu Lizenz-PASS und Social-Engine-Cutover fail-closed', () => {
  const result = evaluateSocialEngineCompletionGate();

  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.runtime.present, 7);
  assert.equal(result.runtime.required, 13);
  assert.equal(result.renderer.present, 2);
  assert.equal(result.renderer.required, 2);
  assert.equal(result.evidence.present, 7);
  assert.equal(result.evidence.required, 7);
  assert.equal(result.licenseEvidence.status, 'POINT_4_AUDIO_MODELS_REMOVED_FAIL_CLOSED');
  assert.equal(result.licenseEvidence.requiredStatus, 'POINT_4_PASS');
  assert.equal(result.licenseEvidence.pass, false);
  assert.deepEqual(result.financeScoringRuntimePresentBeforePass, []);
  assert.equal(result.followUpBacklogStatus, 'BLOCKED_BY_SOCIAL_MEDIA_ENGINE_MIGRATION');
});
