import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createContainerIdentity,
  normalizeSha256,
  setContainerDigests,
  validateContainerIdentity,
} from './container-evidence-identity.mjs';

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
