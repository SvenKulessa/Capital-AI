import test from 'node:test';
import assert from 'node:assert/strict';
import { selectRegistryManifest } from './registry-manifest-evidence.mjs';

const hash = char => 'sha256:' + char.repeat(64);
const config = hash('c');
const single = {
  schemaVersion: 2,
  mediaType: 'application/vnd.oci.image.manifest.v1+json',
  digest: hash('a'),
  config: { mediaType: 'application/vnd.oci.image.config.v1+json', digest: config },
  layers: [],
};
const index = {
  schemaVersion: 2,
  mediaType: 'application/vnd.oci.image.index.v1+json',
  digest: hash('b'),
  manifests: [
    { mediaType: single.mediaType, digest: single.digest, platform: { os: 'linux', architecture: 'amd64' } },
    { mediaType: single.mediaType, digest: hash('d'), platform: { os: 'linux', architecture: 'arm64' } },
  ],
};

test('single OCI manifest keeps index digest null and platform digest equal to reference', () => {
  assert.deepEqual(selectRegistryManifest(single), {
    referenceDigest: single.digest,
    ociIndexDigest: null,
    platformManifestDigest: single.digest,
    mediaType: single.mediaType,
  });
});

test('single Docker schema2 manifest is supported', () => {
  const docker = { ...single, mediaType: 'application/vnd.docker.distribution.manifest.v2+json' };
  assert.equal(selectRegistryManifest(docker).ociIndexDigest, null);
});

test('OCI index selects unique linux/amd64 digest and retains index digest separately', () => {
  assert.deepEqual(selectRegistryManifest(index), {
    referenceDigest: index.digest,
    ociIndexDigest: index.digest,
    platformManifestDigest: single.digest,
    mediaType: index.mediaType,
  });
});

test('Docker manifest list is supported', () => {
  assert.equal(selectRegistryManifest({ ...index, mediaType: 'application/vnd.docker.distribution.manifest.list.v2+json' }).platformManifestDigest, single.digest);
});

test('missing, duplicate and wrong-platform index entries fail closed', () => {
  for (const manifests of [
    [], [index.manifests[1]], [index.manifests[0], index.manifests[0]],
    [{ ...index.manifests[0], platform: { os: 'linux', architecture: 'arm64' } }],
  ]) assert.throws(() => selectRegistryManifest({ ...index, manifests }));
});

test('unrecognized manifest type, malformed digest and mixed index/single fields fail closed', () => {
  assert.throws(() => selectRegistryManifest({ ...single, mediaType: 'application/json' }));
  assert.throws(() => selectRegistryManifest({ ...single, digest: 'sha256:bad' }));
  assert.throws(() => selectRegistryManifest({ ...single, manifests: [] }));
  assert.throws(() => selectRegistryManifest({ ...index, config: single.config }));
});
