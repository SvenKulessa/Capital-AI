// CAPITAL_AI_RECOVERY_PROVENANCE_V1 - local read-only consistency check.
// No cloud requests, credentials, decryption, or claim of provider provenance.
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { open, realpath, readFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const SHA256 = /^[a-f0-9]{64}$/;
const DECIMAL_POSITIVE = /^[1-9][0-9]*$/;

function requireCheck(condition, reason) {
  if (!condition) throw new Error(reason);
}
function sha(value) { return typeof value === 'string' && SHA256.test(value); }

export function validateManifest(manifest) {
  requireCheck(manifest && typeof manifest === 'object' && !Array.isArray(manifest),
    'manifest must be an object');
  requireCheck(manifest.contract === 'CAPITAL_AI_RECOVERY_PROVENANCE_V1', 'contract mismatch');
  requireCheck(manifest.source_project === 'ryzywoktpmyhwzxmstyu', 'source identity mismatch');
  requireCheck(manifest.target_project === 'wcvorlvhwvuprqsjcten', 'target identity mismatch');
  requireCheck(manifest.status !== 'VERIFIED' && manifest.final_status !== 'VERIFIED',
    'do not pre-assert provider verification');
  const gcs = manifest.gcs;
  requireCheck(gcs && typeof gcs === 'object', 'GCS evidence missing');
  requireCheck(typeof gcs.generation === 'string' && DECIMAL_POSITIVE.test(gcs.generation),
    'GCS generation missing or invalid');
  requireCheck(typeof gcs.metageneration === 'string' && DECIMAL_POSITIVE.test(gcs.metageneration),
    'GCS metageneration missing or invalid');
  requireCheck(sha(gcs.encrypted_blob_sha256) && sha(gcs.independent_download_sha256),
    'encrypted and downloaded SHA-256 evidence required');
  requireCheck(gcs.encrypted_blob_sha256 === gcs.independent_download_sha256,
    'independent encrypted-blob hashes mismatch');
  const storage = manifest.storage;
  requireCheck(storage && Array.isArray(storage.objects) && storage.objects.length > 0,
    'independent Storage object-byte inventory required');
  requireCheck(Number.isSafeInteger(storage.binary_object_count)
    && storage.binary_object_count === storage.objects.length,
    'Storage object count mismatch');
  const paths = new Set();
  for (const object of storage.objects) {
    requireCheck(object && typeof object === 'object', 'invalid Storage object entry');
    requireCheck(typeof object.path === 'string' && object.path.length > 0,
      'Storage object relative path required');
    requireCheck(!isAbsolute(object.path) && !object.path.split(/[\\/]/).includes('..')
      && !object.path.split(/[\\/]/).includes('.') && !object.path.includes('\\')
      && !object.path.includes('\0'),
      'unsafe Storage object path');
    requireCheck(!paths.has(object.path), 'duplicate Storage object path');
    paths.add(object.path);
    requireCheck(sha(object.sha256), 'Storage object SHA-256 required');
  }
  return manifest;
}
function inside(root, pathname) {
  const rel = relative(root, pathname);
  return rel === '' || (rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel));
}
async function hashRegularFile(file) {
  // O_NOFOLLOW rejects a final-component symlink; fstat verifies opened inode.
  const fd = await open(file, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    const before = await fd.stat();
    requireCheck(before.isFile(), 'evidence input must be a regular file');
    const h = createHash('sha256');
    for await (const bytes of fd.createReadStream({ autoClose: false })) h.update(bytes);
    const after = await fd.stat();
    requireCheck(before.ino === after.ino && before.size === after.size
      && before.mtimeMs === after.mtimeMs, 'evidence file changed during hashing');
    return h.digest('hex');
  } finally {
    await fd.close();
  }
}
export async function verifyLocalEvidence(manifest, downloadedBlob, storageRoot) {
  validateManifest(manifest);
  const actual = await hashRegularFile(downloadedBlob);
  requireCheck(actual === manifest.gcs.encrypted_blob_sha256, 'downloaded encrypted bytes mismatch');
  const realRoot = await realpath(storageRoot);
  for (const object of manifest.storage.objects) {
    const candidate = resolve(realRoot, object.path);
    requireCheck(inside(realRoot, candidate), 'Storage path leaves configured root');
    const actualPath = await realpath(candidate);
    requireCheck(inside(realRoot, actualPath), 'Storage path resolves outside configured root');
    const digest = await hashRegularFile(candidate);
    requireCheck(digest === object.sha256, 'Storage byte hash mismatch');
  }
  return { status: 'LOCAL_BYTES_VERIFIED_NOT_PROVIDER', storageObjects: manifest.storage.objects.length };
}
async function main(argv) {
  requireCheck(argv.length === 3,
    'usage: node verify-recovery-provenance.mjs manifest.json encrypted-download storage-root');
  const [manifestPath, blobPath, storageRoot] = argv;
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const result = await verifyLocalEvidence(manifest, blobPath, storageRoot);
  console.log(result.status + ': ' + result.storageObjects + ' storage objects; no provider attestation');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => {
    // Do not print paths, file contents or credentials.
    console.error('BLOCKED: ' + (error instanceof SyntaxError ? 'invalid manifest JSON' : error.message));
    process.exitCode = 1;
  });
}
