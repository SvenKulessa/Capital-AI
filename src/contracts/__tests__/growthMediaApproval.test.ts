import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GROWTH_MEDIA_APPROVAL_POLICY_VERSION,
  assertGrowthMediaApproval,
} from '../growthMediaApproval.ts';

const base = {
  policyVersion: GROWTH_MEDIA_APPROVAL_POLICY_VERSION,
  socialEngineGateRef: 'CAPITAL-AI-GROWTH/social-engine-completion-gate.json',
  socialEngineGateState: 'PASS',
  approvalEvidenceRef: 'approval:media:1',
  sourceRightsEvidenceRef: 'rights:source:1',
  outputCommercialUseEvidenceRef: 'rights:output:1',
  brandApprovalRef: 'brand:capital-ai:1',
  claimApprovalRefs: [],
  inputAssetHashes: [],
  draftOnly: true,
  publicPublishAllowed: false,
} as const;

test('image generation requires rights, brand and draft-only approval', () => {
  const approval = assertGrowthMediaApproval({
    ...base,
    capability: 'IMAGE_GENERATION',
  }, 'IMAGE_GENERATION');

  assert.equal(approval.publicPublishAllowed, false);
});

test('TTS predefined voice is allowed without replication consent', () => {
  const approval = assertGrowthMediaApproval({
    ...base,
    capability: 'TTS',
    voice: {
      mode: 'PREDEFINED',
      voiceId: 'Kore',
    },
  }, 'TTS');

  assert.equal(approval.voice?.mode, 'PREDEFINED');
});

test('designed or replicated voice requires consent and revocation readback', () => {
  assert.throws(
    () => assertGrowthMediaApproval({
      ...base,
      capability: 'TTS',
      voice: {
        mode: 'REPLICATED',
        voiceId: 'owner-voice',
      },
    }, 'TTS'),
    /VOICE_CONSENT_REQUIRED/,
  );

  const approval = assertGrowthMediaApproval({
    ...base,
    capability: 'TTS',
    voice: {
      mode: 'DESIGNED',
      voiceId: 'capital-ai-narrator',
      consentEvidenceRef: 'voice-consent:1',
      revocationCheckedAt: '2026-10-06T19:30:00.000Z',
    },
  }, 'TTS');

  assert.equal(approval.voice?.consentEvidenceRef, 'voice-consent:1');
});

test('media approval cannot grant public publication authority', () => {
  assert.throws(() => assertGrowthMediaApproval({
    ...base,
    capability: 'IMAGE_GENERATION',
    publicPublishAllowed: true,
  }, 'IMAGE_GENERATION'));
});
