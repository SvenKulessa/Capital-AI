import { readFileSync } from 'node:fs';

const SHA = /^sha256:[0-9a-f]{64}$/;
const SINGLE = new Set(['application/vnd.oci.image.manifest.v1+json', 'application/vnd.docker.distribution.manifest.v2+json']);
const INDEX = new Set(['application/vnd.oci.image.index.v1+json', 'application/vnd.docker.distribution.manifest.list.v2+json']);

export function classifyRegistryManifest(manifest) {
  if (!manifest || !SHA.test(manifest.digest || '')) throw new Error('Missing immutable registry digest');
  const { digest, mediaType } = manifest;
  if (SINGLE.has(mediaType)) {
    if (manifest.manifests !== undefined || !SHA.test(manifest.config?.digest || '')) throw new Error('Malformed single image manifest');
    return { referenceDigest: digest, indexDigest: null, platformDigest: digest };
  }
  if (!INDEX.has(mediaType) || !Array.isArray(manifest.manifests)) throw new Error('Unsupported registry manifest media type');
  const matches = manifest.manifests.filter(m => m?.platform?.os === 'linux' && m?.platform?.architecture === 'amd64');
  if (matches.length !== 1 || !SINGLE.has(matches[0].mediaType) || !SHA.test(matches[0].digest || '')) {
    throw new Error('Expected exactly one valid linux/amd64 platform manifest');
  }
  return { referenceDigest: digest, indexDigest: digest, platformDigest: matches[0].digest };
}

if (process.argv[1]?.endsWith('/registry-manifest.mjs')) {
  const [path] = process.argv.slice(2);
  if (!path) throw new Error('Usage: registry-manifest.mjs <manifest.json>');
  console.log(JSON.stringify(classifyRegistryManifest(JSON.parse(readFileSync(path, 'utf8')))));
}
