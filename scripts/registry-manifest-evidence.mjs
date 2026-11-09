import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHA = /^sha256:[a-f0-9]{64}$/;
const IMAGE_TYPES = new Set([
  'application/vnd.oci.image.manifest.v1+json',
  'application/vnd.docker.distribution.manifest.v2+json',
]);
const INDEX_TYPES = new Set([
  'application/vnd.oci.image.index.v1+json',
  'application/vnd.docker.distribution.manifest.list.v2+json',
]);

export function selectRegistryManifest(manifest) {
  if (!manifest || manifest.schemaVersion !== 2 || !SHA.test(manifest.digest || '')) {
    throw new Error('Missing schemaVersion=2 or immutable registry digest');
  }
  const { mediaType, digest } = manifest;
  if (IMAGE_TYPES.has(mediaType)) {
    if (Object.hasOwn(manifest, 'manifests') ||
        !SHA.test(manifest.config?.digest || '') || !Array.isArray(manifest.layers)) {
      throw new Error('Invalid single-platform image manifest');
    }
    return { referenceDigest: digest, ociIndexDigest: null, platformManifestDigest: digest, mediaType };
  }
  if (!INDEX_TYPES.has(mediaType) || Object.hasOwn(manifest, 'config') || !Array.isArray(manifest.manifests)) {
    throw new Error('Unsupported registry manifest media type');
  }
  const entries = manifest.manifests.filter(entry =>
    entry?.platform?.os === 'linux' && entry?.platform?.architecture === 'amd64');
  if (entries.length !== 1 || !IMAGE_TYPES.has(entries[0].mediaType) || !SHA.test(entries[0].digest || '')) {
    throw new Error('Expected exactly one typed linux/amd64 platform manifest');
  }
  return { referenceDigest: digest, ociIndexDigest: digest, platformManifestDigest: entries[0].digest, mediaType };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (!process.argv[2]) throw new Error('Manifest JSON path required');
    const selected = selectRegistryManifest(JSON.parse(readFileSync(process.argv[2], 'utf8')));
    console.log(JSON.stringify(selected));
  } catch (error) {
    console.error('REGISTRY_MANIFEST_NOT_PROVEN: ' + error.message);
    process.exitCode = 1;
  }
}
