import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateProductionHandoff } from './verify-production-handoff.mjs';
import { bindRuntimeIdentity, runtimeIdentityDocument } from './write-runtime-identity.mjs';

const sourceSha = 'a'.repeat(40);
const digest = 'sha256:' + 'b'.repeat(64);
const imageRef = 'ghcr.io/svenkulessa/capital-ai@' + digest;
const expectedServiceId = 'srv-test';
const expectedOwnerId = 'tea-test';

function fixtures() {
  return {
    candidate: { status: 'ATTESTED_CANDIDATE', deployEligible: false, sourceSha, imageRef },
    license: { status: 'APPROVED', deployEligible: true, applicationSourceSha: sourceSha },
    rulesets: [{
      name: 'main-production-protection',
      target: 'branch',
      enforcement: 'active',
      conditions: { ref_name: { include: ['refs/heads/main'], exclude: [] } },
      bypass_actors: [],
      rules: [
        { type: 'deletion' },
        { type: 'non_fast_forward' },
        { type: 'pull_request', parameters: {} },
        { type: 'required_status_checks', parameters: {
          strict_required_status_checks_policy: true,
          required_status_checks: [{ context: 'Docker Security Gate' }],
        } },
      ],
    }],
    service: { id: expectedServiceId, ownerId: expectedOwnerId, type: 'web_service', imagePath: imageRef },
    deploy: { id: 'dep-test', status: 'live', image: { ref: imageRef, sha: digest } },
    health: { buildIdentity: runtimeIdentityDocument(sourceSha) },
    expectedServiceId,
    expectedOwnerId,
  };
}

test('all five production handoff gates must pass before deployEligible becomes true', () => {
  const report = evaluateProductionHandoff(fixtures());
  assert.equal(report.deployEligible, true);
  assert.deepEqual(report.remainingGates, []);
});

test('open redistribution review remains fail closed', () => {
  const input = fixtures();
  input.license.status = 'REVIEW_OPEN';
  input.license.deployEligible = false;
  const report = evaluateProductionHandoff(input);
  assert.equal(report.deployEligible, false);
  assert.ok(report.remainingGates.includes('LICENSE_REDISTRIBUTION_REVIEW'));
});

test('a mutable or different Render image cannot satisfy the image-source gate', () => {
  const input = fixtures();
  input.service.imagePath = 'ghcr.io/svenkulessa/capital-ai:latest';
  const report = evaluateProductionHandoff(input);
  assert.ok(report.remainingGates.includes('RENDER_IMAGE_SOURCE'));
});

test('immutable Render image ref is the manifest binding while provider image sha is recorded separately', () => {
  const input = fixtures();
  input.deploy.image.sha = 'sha256:' + 'c'.repeat(64);
  const report = evaluateProductionHandoff(input);
  assert.equal(report.remainingGates.includes('RUNTIME_DIGEST'), false);
  const gate = report.gates.find(g => g.name === 'RUNTIME_DIGEST');
  assert.equal(gate.evidence.manifestRefMatches, true);
  assert.equal(gate.evidence.providerImageSha, 'sha256:' + 'c'.repeat(64));
});

test('a deploy whose immutable image ref differs from the candidate remains blocked', () => {
  const input = fixtures();
  input.deploy.image.ref = 'ghcr.io/svenkulessa/capital-ai@sha256:' + 'd'.repeat(64);
  const report = evaluateProductionHandoff(input);
  assert.ok(report.remainingGates.includes('RUNTIME_DIGEST'));
});

test('runtime identity must be image-bound, not supplied as an unrelated health field', () => {
  const input = fixtures();
  input.health = { sourceSha, buildIdentity: { bound: false, sourceSha: null } };
  const report = evaluateProductionHandoff(input);
  assert.ok(report.remainingGates.includes('RUNTIME_IDENTITY'));
});

test('main protection must require the Docker Security Gate with strict checks and no bypass', () => {
  const input = fixtures();
  input.rulesets[0].rules.find(r => r.type === 'required_status_checks').parameters.required_status_checks = [];
  const report = evaluateProductionHandoff(input);
  assert.ok(report.remainingGates.includes('MAIN_PROTECTION'));
});

test('runtime identity binding is deterministic, image-contained and rejects non-SHA input', () => {
  assert.deepEqual(runtimeIdentityDocument(sourceSha), runtimeIdentityDocument(sourceSha));
  const template = "const embeddedSourceSha = '__CAPITAL_AI_SOURCE_SHA_UNBOUND__';\n" +
    "const embeddedBuilder = '__CAPITAL_AI_BUILDER_UNBOUND__';\n";
  const bound = bindRuntimeIdentity(template, sourceSha);
  assert.match(bound, new RegExp(sourceSha));
  assert.match(bound, /SvenKulessa\/Capital-AI\/\.github\/workflows\/build-security\.yml/);
  assert.doesNotMatch(bound, /__CAPITAL_AI_.*_UNBOUND__/);
  assert.throws(() => runtimeIdentityDocument('main'));
});
