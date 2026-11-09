import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyRegistryManifest } from './registry-manifest.mjs';
import { verifyRegistryCve } from './registry-cve-gate.mjs';

const sha = ch => 'sha256:' + ch.repeat(64);
const config = sha('c');
const platform = { mediaType: 'application/vnd.oci.image.manifest.v1+json', config: { digest: config } };
const index = { mediaType: 'application/vnd.oci.image.index.v1+json', manifests: [
  { digest: sha('b'), mediaType: platform.mediaType, platform: { os: 'linux', architecture: 'amd64' } },
  { digest: sha('d'), mediaType: platform.mediaType, platform: { os: 'linux', architecture: 'arm64' } },
] };

test('single OCI or Docker manifest has no index digest', () => {
  for (const mediaType of ['application/vnd.oci.image.manifest.v1+json', 'application/vnd.docker.distribution.manifest.v2+json']) {
    const result = classifyRegistryManifest({ digest: sha('a'), mediaType, config: platform.config });
    assert.deepEqual(result, { referenceDigest: sha('a'), indexDigest: null, platformDigest: sha('a') });
  }
});
test('index or Docker manifest list chooses exactly one linux/amd64 platform', () => {
  for (const mediaType of ['application/vnd.oci.image.index.v1+json', 'application/vnd.docker.distribution.manifest.list.v2+json']) {
    assert.deepEqual(classifyRegistryManifest({ digest: sha('a'), ...index, mediaType }), {
      referenceDigest: sha('a'), indexDigest: sha('a'), platformDigest: sha('b'),
    });
  }
});
test('manifest ambiguity, foreign media type and malformed digests fail closed', () => {
  const valid = { digest: sha('a'), ...index };
  for (const input of [
    { ...valid, manifests: [index.manifests[0], index.manifests[0]] },
    { ...valid, manifests: [index.manifests[1]] },
    { ...valid, mediaType: 'application/json' },
    { ...valid, digest: 'sha256:bad' },
    { ...valid, manifests: [{ ...index.manifests[0], digest: sha('x') }] },
    { digest: sha('a'), mediaType: platform.mediaType, manifests: [] },
  ]) assert.throws(() => classifyRegistryManifest(input));
});
test('CVE regression is rejected even when MEDIUM; missing reports fail closed', () => {
  const clean = { Results: [{ Vulnerabilities: [] }] };
  assert.deepEqual(verifyRegistryCve(clean), { pass: true, matches: 0 });
  assert.deepEqual(verifyRegistryCve({ Results: [{ Vulnerabilities: [{ VulnerabilityID: 'CVE-2026-4738', Severity: 'MEDIUM' }] }] }), { pass: false, matches: 1 });
  assert.throws(() => verifyRegistryCve({}));
  assert.throws(() => verifyRegistryCve({ Results: [{ Vulnerabilities: 'invalid' }] }));
});
