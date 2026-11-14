import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createContainerIdentity,
  normalizeSha256,
  setContainerDigests,
  validateContainerIdentity,
} from './container-evidence-identity.mjs';
import { evaluateProductionHandoff } from './verify-production-handoff.mjs';

const head = 'a'.repeat(40);
const merge = 'b'.repeat(40);
const base = 'c'.repeat(40);
const digest = char => 'sha256:' + char.repeat(64);

test('pull-request identity distinguishes tested merge, PR head and base main', () => {
  const identity = createContainerIdentity({
    GITHUB_EVENT_NAME: 'pull_request',
    GITHUB_SHA: merge,
    CAPITAL_PR_HEAD_SHA: head,
    CAPITAL_BASE_MAIN_SHA: base,
  });
  assert.equal(identity.source.sourceSha, head);
  assert.equal(identity.source.testedSha, merge);
  assert.equal(identity.source.testedMergeSha, merge);
  assert.equal(identity.source.pullRequestHeadSha, head);
  assert.equal(identity.source.baseMainSha, base);
});

test('push identity has no synthetic merge SHA', () => {
  const identity = createContainerIdentity({ GITHUB_EVENT_NAME: 'push', GITHUB_SHA: head });
  assert.equal(identity.source.sourceSha, head);
  assert.equal(identity.source.testedMergeSha, null);
  assert.equal(identity.source.pullRequestHeadSha, null);
  assert.equal(identity.source.baseMainSha, null);
});

test('artifact digest output is normalized without conflating digest classes', () => {
  const identity = createContainerIdentity({ GITHUB_EVENT_NAME: 'push', GITHUB_SHA: head });
  const updated = setContainerDigests(identity, {
    artifactArchiveDigest: '1'.repeat(64),
    localImageId: digest('2'),
    ociIndexDigest: digest('3'),
    platformManifestDigest: digest('4'),
    configDigest: digest('2'),
  });
  assert.equal(updated.digests.artifactArchiveDigest, digest('1'));
  assert.notEqual(updated.digests.ociIndexDigest, updated.digests.platformManifestDigest);
  assert.equal(updated.digests.localImageId, updated.digests.configDigest);
  assert.equal(normalizeSha256('5'.repeat(64)), digest('5'));
});

test('runtime provider digest must bind to the platform manifest digest', () => {
  const identity = createContainerIdentity({ GITHUB_EVENT_NAME: 'push', GITHUB_SHA: head });
  const platform = setContainerDigests(identity, { platformManifestDigest: digest('6') });
  assert.throws(() => setContainerDigests(platform, { runtimeProviderDigest: digest('7') }));
  assert.doesNotThrow(() => validateContainerIdentity(
    setContainerDigests(platform, { runtimeProviderDigest: digest('6') }),
  ));
});


test('Render source SHA cannot be treated as an OCI platform-manifest digest', () => {
  const renderGitSha = head; // Git SHA and OCI digests are different evidence classes.
  const identity = createContainerIdentity({
    GITHUB_EVENT_NAME: 'push',
    GITHUB_SHA: renderGitSha,
    RENDER_GIT_COMMIT: renderGitSha,
  });
  assert.equal(identity.source.sourceSha, renderGitSha);
  assert.equal(identity.digests.runtimeProviderDigest, null);
  assert.equal(identity.digests.platformManifestDigest, null);
  assert.throws(() => setContainerDigests(identity, {
    runtimeProviderDigest: renderGitSha,
  }), /Invalid SHA-256 digest/);
});

test('Git-based Render LIVE metadata and health SHA cannot satisfy OCI release gates', () => {
  const identity = createContainerIdentity({ GITHUB_EVENT_NAME: 'push', GITHUB_SHA: head });
  const candidateRef = 'ghcr.io/svenkulessa/capital-ai@' + digest('d');
  const base = {
    candidate: {
      status: 'ATTESTED_CANDIDATE',
      deployEligible: false,
      sourceSha: head,
      imageRef: candidateRef,
      containerIdentity: identity,
    },
    license: { status: 'APPROVED', deployEligible: true, applicationSourceSha: head },
    rulesets: [],
    service: {
      id: 'srv-render-source',
      ownerId: 'tea-render',
      type: 'web_service',
      repo: 'https://github.com/SvenKulessa/Capital-AI',
      branch: 'main',
    },
    deploy: { id: 'dep-render-source', status: 'live', commit: { id: head } },
    expectedServiceId: 'srv-render-source',
    expectedOwnerId: 'tea-render',
    expectedMainSha: head,
    registryManifest: null,
    registryScan: null,
    registryPlatformManifest: null,
  };
  for (const buildIdentity of [
    { bound: false, sourceSha: null },
    { bound: true, sourceSha: head, builder: 'RENDER_DEPLOYMENT_ENVIRONMENT' },
    // Even a claimed builder string cannot replace the missing provider/registry evidence.
    { bound: true, sourceSha: head, builder: 'SvenKulessa/Capital-AI/.github/workflows/build-security.yml' },
  ]) {
    const report = evaluateProductionHandoff({
      ...base,
      health: {
        status: 'ok',
        runtimeIdentity: { sourceSha: head, evidence: 'RENDER_DEPLOYMENT_ENVIRONMENT' },
        buildIdentity,
      },
    });
    assert.equal(report.status, 'PRODUCTION_HANDOFF_BLOCKED');
    assert.equal(report.deployEligible, false);
    for (const gate of ['CONTAINER_IDENTITY_CHAIN', 'RENDER_IMAGE_SOURCE', 'RUNTIME_DIGEST']) {
      assert.ok(report.remainingGates.includes(gate), gate);
    }
    if (buildIdentity.builder !== 'SvenKulessa/Capital-AI/.github/workflows/build-security.yml') {
      assert.ok(report.remainingGates.includes('RUNTIME_IDENTITY'));
    }
    assert.equal(report.containerIdentity.digests.runtimeProviderDigest, null);
  }
});

test('non-PR identity ignores inherited PR environment and binds source to tested SHA', () => {
  for (const eventName of ['push', 'workflow_dispatch', 'schedule', 'local']) {
    const identity = createContainerIdentity({
      GITHUB_EVENT_NAME: eventName,
      GITHUB_SHA: head,
      CAPITAL_PR_HEAD_SHA: merge,
      CAPITAL_BASE_MAIN_SHA: base,
    });
    assert.equal(identity.source.sourceSha, head, eventName);
    assert.equal(identity.source.testedSha, head, eventName);
    assert.equal(identity.source.pullRequestHeadSha, null, eventName);
    assert.equal(identity.source.baseMainSha, null, eventName);
  }
});

test('non-PR identity validator rejects a forged source SHA', () => {
  const identity = createContainerIdentity({ GITHUB_EVENT_NAME: 'push', GITHUB_SHA: head });
  assert.throws(
    () => validateContainerIdentity({ ...identity, source: { ...identity.source, sourceSha: merge } }),
    /sourceSha must equal testedSha outside pull_request/,
  );
});

test('non-PR identity validator rejects injected PR fields', () => {
  const identity = createContainerIdentity({ GITHUB_EVENT_NAME: 'push', GITHUB_SHA: head });
  for (const injected of [
    { pullRequestHeadSha: merge },
    { baseMainSha: base },
  ]) {
    assert.throws(
      () => validateContainerIdentity({ ...identity, source: { ...identity.source, ...injected } }),
      /pullRequestHeadSha and baseMainSha must be null outside pull_request/,
    );
  }
});
