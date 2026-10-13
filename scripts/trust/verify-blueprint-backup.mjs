#!/usr/bin/env node
/**
 * CAPITAL-AI: immutable encrypted-blueprint backup verification.
 * Verifies the downloaded cloud ciphertext against independently pinned metadata.
 * Optionally verifies a locally restored Markdown file against the original
 * known SHA-256. NEVER decrypts and NEVER reads any recovery key.
 * A matching Markdown hash proves content identity, NOT cryptographic decryption.
 */
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const BLUEPRINT_BACKUPS = Object.freeze({
  'CAP-BP-001': Object.freeze({
    version: '1.0.0',
    cipherBytes: 13927,
    cipherSha256: '4b2cb25c7c9e0884065c649ac0d86ae9b7d305ede94b53fbbe1ba7810a1d6787',
    originalBytes: 30462,
    originalSha256: '54f07ffeb1e5eb533027840595c8bf3c659eae34a5acdf32ec56db3471f9d4e1',
  }),
  'CAP-BP-002': Object.freeze({
    version: '1.0.0',
    cipherBytes: 16344,
    cipherSha256: 'd3570feff6fa04f9367fdebc4690938c3000f2d42f0bc4770420e6aac1bc8c91',
    originalBytes: 36545,
    originalSha256: '1f96b6de3601cf40dd91069226ab3e9719de5d291c83c70865fd4b64a22f74ba',
  }),
});

function invalid(message) { throw new Error(message); }
async function sha256RegularFile(path, { bytes, magic } = {}) {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink()) invalid('not_regular_file');
  if (stat.size !== bytes) invalid('byte_length_mismatch');
  const fh = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    const liveStat = await fh.stat();
    if (!liveStat.isFile() || liveStat.size !== bytes || liveStat.ino !== stat.ino || liveStat.dev !== stat.dev) invalid('source_changed');
    if (magic) {
      const prefix = Buffer.alloc(magic.length);
      const { bytesRead } = await fh.read(prefix, 0, prefix.length, 0);
      if (bytesRead !== prefix.length || !prefix.equals(magic)) invalid('cipher_format_mismatch');
    }
    const hash = createHash('sha256');
    const stream = fh.createReadStream({ start: 0, autoClose: false });
    for await (const chunk of stream) hash.update(chunk);
    const finalStat = await fh.stat();
    if (finalStat.size !== bytes || finalStat.mtimeMs !== liveStat.mtimeMs || finalStat.ino !== liveStat.ino) invalid('source_changed');
    return hash.digest('hex');
  } finally { await fh.close(); }
}

export async function verifyBlueprintBackup({ sku, cipherPath, restoredPath, expected = BLUEPRINT_BACKUPS[sku] }) {
  if (!BLUEPRINT_BACKUPS[sku] || !expected) invalid('unsupported_sku');
  if (typeof cipherPath !== 'string' || cipherPath.length === 0) invalid('cipher_required');
  const cipherSha = await sha256RegularFile(cipherPath, { bytes: expected.cipherBytes, magic: Buffer.from('CAIBK1\0') });
  if (cipherSha !== expected.cipherSha256) invalid('cipher_hash_mismatch');
  let restore = 'NOT_PROVEN';
  if (restoredPath !== undefined) {
    if (typeof restoredPath !== 'string' || restoredPath.length === 0) invalid('restored_file_required');
    const originalSha = await sha256RegularFile(restoredPath, { bytes: expected.originalBytes });
    if (originalSha !== expected.originalSha256) invalid('original_hash_mismatch');
    restore = 'PLAINTEXT_IDENTITY_VERIFIED__DECRYPTION_NOT_ATTESTED';
  }
  return Object.freeze({
    schema: 'CAPITAL_AI_BACKUP_CHECK@1',
    sku, version: expected.version,
    cipherBytes: expected.cipherBytes,
    cipherSha256: cipherSha,
    ciphertext: 'VERIFIED',
    plaintext: restore,
    cryptoAuthentication: 'NOT_PROVEN_BY_THIS_TOOL',
    keyRead: false, plaintextUploaded: false,
  });
}

function parseArgs(argv) {
  const values = {};
  for (let i = 0; i < argv.length; i += 2) {
    const arg = argv[i];
    if (!['--sku', '--cipher', '--restored'].includes(arg) || values[arg] !== undefined || typeof argv[i + 1] !== 'string' || argv[i + 1].startsWith('--')) invalid('usage: --sku CAP-BP-001|CAP-BP-002 --cipher PATH [--restored PATH]');
    values[arg] = argv[i + 1];
  }
  return { sku: values['--sku'], cipherPath: values['--cipher'], ...(values['--restored'] ? { restoredPath: values['--restored'] } : {}) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try { console.log(JSON.stringify(await verifyBlueprintBackup(parseArgs(process.argv.slice(2))))); }
  catch (error) { console.error('BACKUP_VERIFICATION_FAILED:', error.message); process.exitCode = 1; }
}
