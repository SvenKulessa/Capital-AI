import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateProductionHandoff } from './verify-production-handoff.mjs';
import { bindRuntimeIdentity, runtimeIdentityDocument } from './write-runtime-identity.mjs';

const sourceSha = 'a'.repeat(40);
const digest = 'sha256:' + 'b'.repeat(64);
const imageRef = 'ghcr.io/svenkulessa/capital-ai@' + digest;
const configDigest = 'sha256:' + 'e'.repeat(64);
const artifactDigest = 'sha256:' + 'd'.repeat(64);
const expectedServiceId = 'srv-test';
const expectedOwnerId = 'tea-test';

function fixtures() {
  return {
    candidate: {
      status: 'ATTESTED_CANDIDATE',
      deployEligible: false,
      sourceSha,
      imageRef,
      containerIdentity: {
        schema: 'CONTAINER_IDENTITY@1',
        schemaVersion: 1,
        source: {
          eventName: 'workflow_dispatch',
          sourceSha,
          testedSha: sourceSha,
          testedMergeSha: null,
          pullRequestHeadSha: null,
          baseMainSha: null,
        },
        digestTypes: {
          artifactArchiveDigest: 'GITHUB_ACTIONS_ARTIFACT_ARCHIVE_SHA256',
          localImageId: 'DOCKER_IMAGE_CONFIG_SHA256',
          ociIndexDigest: 'OCI_INDEX_SHA256',
          platformManifestDigest: 'OCI_PLATFORM_MANIFEST_SHA256',
          configDigest: 'OCI_IMAGE_CONFIG_SHA256',
          runtimeProviderDigest: 'RUNTIME_PROVIDER_PLATFORM_MANIFEST_SHA256',
        },
        digests: {
          artifactArchiveDigest: artifactDigest,
          localImageId: configDigest,
          ociIndexDigest: digest,
          platformManifestDigest: digest,
          configDigest,
          runtimeProviderDigest: null,
        },
      },
    },
    license: { status: 'APPROVED', deployEligible: true, applicationSourceSha: sourceSha },
    rulesets: [{
      name: 'main-production-protection',
      target: 'branch',
      enforcement: 'active',
      conditions: { ref_name: { include: ['refs/heads/main'], exclude: [] } },
      bypass_actors: [],
      rules: [
        { type: 'required_linear_history' },
        { type: 'deletion' },
        { type: 'non_fast_forward' },
        { type: 'pull_request', parameters: { allowed_merge_methods: ['squash'] } },
        { type: 'required_status_checks', parameters: {
          strict_required_status_checks_policy: true,
          do_not_enforce_on_create: false,
          required_status_checks: [{ context: 'Docker Security Gate', integration_id: 15368 }],
        } },
      ],
    }],
    service: { id: expectedServiceId, ownerId: expectedOwnerId, type: 'web_service', imagePath: imageRef },
    deploy: { id: 'dep-test', status: 'live', image: { ref: imageRef, sha: digest } },
    health: { buildIdentity: runtimeIdentityDocument(sourceSha) },
    expectedServiceId,
    expectedOwnerId,
    expectedMainSha: sourceSha,
    registryManifest: { digest, manifests: [{ digest, platform: { os: 'linux', architecture: 'amd64' } }] },
    registryPlatformManifest: { digest, manifest: { config: { digest: configDigest } } },
    registryScan: { Metadata: { ImageID: configDigest, ImageConfig: { os: 'linux', architecture: 'amd64' } } },
  };
}

test('all production handoff gates must pass before deployEligible becomes true', () => {
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
  input.registryManifest.manifests[0].digest = input.deploy.image.sha;
  input.registryPlatformManifest.digest = input.deploy.image.sha;
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


test('a syntactically valid unrelated provider SHA must not pass', () => {
  const input = fixtures();
  input.deploy.image.sha = 'sha256:' + 'f'.repeat(64);
  assert.ok(evaluateProductionHandoff(input).remainingGates.includes('RUNTIME_DIGEST'));
});

test('missing, ambiguous or foreign index evidence cannot bind the runtime', () => {
  for (const change of [
    i => { i.registryManifest = null; },
    i => { i.registryPlatformManifest = null; },
    i => { i.registryPlatformManifest.manifest.config.digest = 'sha256:' + 'f'.repeat(64); },
    i => { i.registryManifest.digest = 'sha256:' + 'f'.repeat(64); },
    i => { i.registryManifest.manifests.push(i.registryManifest.manifests[0]); },
    i => { i.registryScan.Metadata.ImageConfig.architecture = 'arm64'; },
  ]) {
    const input = fixtures(); change(input);
    assert.ok(evaluateProductionHandoff(input).remainingGates.includes('RUNTIME_DIGEST'));
  }
});

test('a historical candidate cannot silently satisfy the current-main contract', () => {
  const input = fixtures(); input.expectedMainSha = 'f'.repeat(40);
  assert.ok(evaluateProductionHandoff(input).remainingGates.includes('SOURCE_CURRENT_MAIN'));
});

test('handoff must consume the linear-history ruleset validator', () => {
  const input = fixtures();
  input.rulesets[0].rules = input.rulesets[0].rules.filter(r => r.type !== 'required_linear_history');
  assert.ok(evaluateProductionHandoff(input).remainingGates.includes('MAIN_PROTECTION'));
});


test('activated CodeQL and code-quality rules need separate source-bound result evidence', () => {
  const input = fixtures();
  input.rulesets[0].rules.push({ type: 'code_scanning' }, { type: 'code_quality' });
  const report = evaluateProductionHandoff(input);
  assert.ok(report.remainingGates.includes('REQUIRED_CODE_SCANNING_RESULTS'));
  assert.ok(report.remainingGates.includes('REQUIRED_CODE_QUALITY_RESULTS'));
  // A successful analyzer job alone is not a findings/policy readback.
  input.analysisResults = [{ type: 'code_scanning', status: 'PASS', sourceSha: 'f'.repeat(40), evidenceUrl: 'https://api.github.com/repos/SvenKulessa/Capital-AI/code-scanning/alerts' }];
  assert.ok(evaluateProductionHandoff(input).remainingGates.includes('REQUIRED_CODE_SCANNING_RESULTS'));
});

test('typed container identity blocks digest-class conflation', () => {
  const input = fixtures();
  input.candidate.containerIdentity.digests.ociIndexDigest = input.candidate.containerIdentity.digests.configDigest;
  const report = evaluateProductionHandoff(input);
  assert.ok(report.remainingGates.includes('CONTAINER_IDENTITY_CHAIN'));
});

test('final handoff report records provider digest in the typed runtime slot', () => {
  const report = evaluateProductionHandoff(fixtures());
  assert.equal(report.containerIdentity.digests.runtimeProviderDigest, digest);
  assert.equal(report.containerIdentity.digestTypes.runtimeProviderDigest, 'RUNTIME_PROVIDER_PLATFORM_MANIFEST_SHA256');
});
