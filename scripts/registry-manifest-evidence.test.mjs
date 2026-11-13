import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectRegistryManifest, verifyRegistryManifest } from './registry-manifest-evidence.mjs';

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

const manifestScript = fileURLToPath(new URL('./registry-manifest-evidence.mjs', import.meta.url));
const rawDigest = bytes => 'sha256:' + createHash('sha256').update(bytes).digest('hex');

for (const [mediaType, configMediaType] of [
  [single.mediaType, single.config.mediaType],
  ['application/vnd.docker.distribution.manifest.v2+json', 'application/vnd.docker.container.image.v1+json'],
]) {
  test(`raw single manifest CLI verifies bytes and selects ${mediaType}`, t => {
    const directory = mkdtempSync(join(tmpdir(), 'registry-manifest-'));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const path = join(directory, 'manifest.json');
    const raw = Buffer.from(JSON.stringify({
      schemaVersion: 2, mediaType, config: { mediaType: configMediaType, digest: config }, layers: [],
    }, null, 2));
    const digest = rawDigest(raw);
    writeFileSync(path, raw);
    const run = () => spawnSync(process.execPath, [manifestScript, path, digest], { encoding: 'utf8' });
    const result = run();
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      referenceDigest: digest, ociIndexDigest: null, platformManifestDigest: digest, mediaType,
    });

    writeFileSync(path, Buffer.concat([raw, Buffer.from('\n')]));
    const tampered = run();
    assert.equal(tampered.status, 1);
    assert.match(tampered.stderr, /bytes do not match/);
  });
}

test('OCI index selects unique linux/amd64 digest and retains index digest separately', () => {
  const raw = Buffer.from(JSON.stringify({
    schemaVersion: index.schemaVersion, mediaType: index.mediaType, manifests: index.manifests,
  }));
  const digest = rawDigest(raw);
  assert.deepEqual(selectRegistryManifest(verifyRegistryManifest(raw, digest)), {
    referenceDigest: digest,
    ociIndexDigest: digest,
    platformManifestDigest: single.digest,
    mediaType: index.mediaType,
  });
});

test('digest mismatch fails before parsing the raw manifest', () => {
  assert.throws(() => verifyRegistryManifest(Buffer.from('invalid JSON'), hash('a')), /bytes do not match/);
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
