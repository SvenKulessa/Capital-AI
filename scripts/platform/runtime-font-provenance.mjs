import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIGEST = /^sha256:[a-f0-9]{64}$/;
const SHA40 = /^[a-f0-9]{40}$/;
const SHA = /^[a-f0-9]{64}$/;
const MAX_FONT_BYTES = 2 * 1024 * 1024;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

// Explicit allowlist: never read a filesystem path supplied by asset metadata.
export const EXPECTED_FONT_FILES = Object.freeze([
  { repo: 'public/fonts/PlusJakartaSans-Regular.ttf', output: 'runtime-font-regular.ttf' },
  { repo: 'public/fonts/PlusJakartaSans-Italic.ttf', output: 'runtime-font-italic.ttf' },
  { repo: 'public/fonts/OFL.txt', output: 'runtime-font-ofl.txt' },
]);

/** Byte-bound CI-image evidence only; never confers license, registry or publication authority. */
export function verifyRuntimeFontProvenance({ manifest, imageId, inventory, repositoryBytes, imageBytes }) {
  if (manifest?.schemaVersion !== 1 || manifest.family !== 'Plus Jakarta Sans' ||
      manifest.license !== 'OFL-1.1' || manifest.modification !== 'NONE_UNMODIFIED_UPSTREAM_BYTES' ||
      manifest.upstreamRepository !== 'google/fonts' || !SHA40.test(manifest.upstreamCommit || '') ||
      !Array.isArray(manifest.files) || manifest.files.length !== EXPECTED_FONT_FILES.length) {
    throw new Error('Unsupported or incomplete pinned font manifest');
  }
  if (inventory?.schema !== 'OS_SOURCE_NOTICE_INVENTORY@1' ||
      !SHA40.test(inventory.sourceSha || '') || !SHA40.test(inventory.testedSha || '') ||
      !DIGEST.test(inventory.imageConfigDigest || '') ||
      imageId?.trim() !== inventory.imageConfigDigest ||
      inventory.sourceDeliveryProven !== false || inventory.redistributionApproved !== false) {
    throw new Error('Unbound or legally elevated CI image provenance');
  }
  const byPath = new Map();
  for (const entry of manifest.files) {
    if (typeof entry?.path !== 'string' || byPath.has(entry.path) ||
        !Number.isSafeInteger(entry.bytes) || entry.bytes <= 0 || entry.bytes > MAX_FONT_BYTES ||
        !SHA.test(entry.sha256 || '') || !SHA40.test(entry.upstreamGitBlob || '')) {
      throw new Error('Malformed, duplicate or oversized font provenance entry');
    }
    byPath.set(entry.path, entry);
  }
  const files = EXPECTED_FONT_FILES.map(expected => {
    const item = byPath.get(expected.repo);
    if (!item) throw new Error('Required font or OFL file is missing from pinned provenance');
    const repoBytes = repositoryBytes?.[expected.repo];
    const ciBytes = imageBytes?.[expected.output];
    if (!Buffer.isBuffer(repoBytes) || !Buffer.isBuffer(ciBytes) ||
        !repoBytes.length || repoBytes.length > MAX_FONT_BYTES ||
        !ciBytes.length || ciBytes.length > MAX_FONT_BYTES ||
        repoBytes.length !== item.bytes || hash(repoBytes) !== item.sha256) {
      throw new Error('Source font bytes do not match pinned upstream provenance');
    }
    if (!repoBytes.equals(ciBytes)) {
      throw new Error('Runtime CI image font bytes differ from pinned source');
    }
    return { path: '/app/dist/fonts/' + expected.repo.slice('public/fonts/'.length),
      sizeBytes: ciBytes.length, sha256: hash(ciBytes),
      sourceByteMatch: true, imageByteMatch: true };
  });
  const licenseHash = files.find(x => x.path.endsWith('/OFL.txt'))?.sha256;
  if (inventory.fontOflSha256 !== 'sha256:' + licenseHash) {
    throw new Error('Runtime font OFL does not match bound OS source inventory');
  }
  if (byPath.size !== EXPECTED_FONT_FILES.length) throw new Error('Unexpected font in provenance');
  return {
    schema: 'CAPITAL_AI_RUNTIME_FONT_BYTE_PROVENANCE@1',
    authority: 'READ_ONLY_CI_IMAGE_BYTE_CHECK_NOT_REGISTRY_OR_LEGAL_ADMISSION',
    sourceSha: inventory.sourceSha, testedSha: inventory.testedSha,
    imageConfigDigest: inventory.imageConfigDigest,
    fontFamily: manifest.family, declaredLicense: manifest.license,
    files,
    sourceDeliveryProven: false, redistributionApproved: false,
    registryImageIdentity: 'NOT_PROVEN', runtimeProviderIdentity: 'NOT_PROVEN',
    readyForCutover: false,
  };
}

function boundedRead(path) {
  const info = statSync(path);
  if (!info.isFile() || info.size < 1 || info.size > MAX_FONT_BYTES) {
    throw new Error('Missing or oversized font evidence bytes');
  }
  return readFileSync(path);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 7) {
      throw new Error('Usage: runtime-font-provenance.mjs <manifest> <image-id> <os-inventory> <reports-dir> <output>');
    }
    const [, , manifestFile, imageIdFile, inventoryFile, reportsDir, out] = process.argv;
    const report = verifyRuntimeFontProvenance({
      manifest: JSON.parse(readFileSync(manifestFile, 'utf8')),
      imageId: readFileSync(imageIdFile, 'utf8'),
      inventory: JSON.parse(readFileSync(inventoryFile, 'utf8')),
      repositoryBytes: Object.fromEntries(EXPECTED_FONT_FILES.map(x => [x.repo, boundedRead(x.repo)])),
      imageBytes: Object.fromEntries(EXPECTED_FONT_FILES.map(x => [x.output, boundedRead(resolve(reportsDir, x.output))])),
    });
    writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
    process.stdout.write(JSON.stringify({ schema: report.schema, imageConfigDigest: report.imageConfigDigest,
      verifiedFiles: report.files.length, redistributionApproved: false, readyForCutover: false }) + '\n');
  } catch (error) {
    process.stderr.write('RUNTIME_FONT_PROVENANCE_NOT_PROVEN: ' + error.message + '\n');
    process.exitCode = 2;
  }
}
