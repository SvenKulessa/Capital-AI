/** Private disk-backed Blueprint vault: AES-256-GCM, immutable records, explicit hash/evidence. */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, mkdir, open, link, unlink, statfs } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

const MAX_PLAINTEXT = 1_048_576;
const MAX_CIPHERTEXT = 1_500_000;
const SKUS = new Set(['CAP-BP-001', 'CAP-BP-002']);
const VERSION = '1.0.0';
const HEX = /^[a-f0-9]{64}$/;
const ROOT = '/var/data/capital-ai-private-blueprints';
const sha = buffer => createHash('sha256').update(buffer).digest('hex');

function valid(sku, digest) {
  if (!SKUS.has(sku) || !HEX.test(digest ?? '')) throw new Error('BLUEPRINT_IDENTITY_INVALID');
}
function checkedKey(value) {
  return typeof value === 'string' && HEX.test(value) && !/^0{64}$/.test(value) ? Buffer.from(value, 'hex') : null;
}
function fileName(sku) { return sku + '-v' + VERSION + '.caibak'; }
function envelope(key, sku, plain, digest) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from('CAPITAL_AI_BLUEPRINT_VAULT@1|' + sku + '|' + VERSION + '|' + digest));
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.from(JSON.stringify({
    schema: 'CAPITAL_AI_BLUEPRINT_VAULT@1', sku, version: VERSION,
    bytes: plain.length, sha256: digest, iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'), content: encrypted.toString('base64'),
  }));
}
function decode(key, sku, body, expectedHash) {
  valid(sku, expectedHash);
  if (!Buffer.isBuffer(body) || body.length < 160 || body.length > MAX_CIPHERTEXT) throw new Error('BLUEPRINT_CIPHER_SIZE_INVALID');
  let record;
  try { record = JSON.parse(body.toString('utf8')); }
  catch { throw new Error('BLUEPRINT_CIPHER_FORMAT_INVALID'); }
  if (record?.schema !== 'CAPITAL_AI_BLUEPRINT_VAULT@1' || record.sku !== sku
    || record.version !== VERSION || record.sha256 !== expectedHash
    || !Number.isSafeInteger(record.bytes) || record.bytes < 128 || record.bytes > MAX_PLAINTEXT
    || typeof record.content !== 'string' || typeof record.iv !== 'string'
    || typeof record.tag !== 'string') throw new Error('BLUEPRINT_CIPHER_IDENTITY_INVALID');
  const iv = Buffer.from(record.iv, 'base64');
  const tag = Buffer.from(record.tag, 'base64');
  const encrypted = Buffer.from(record.content, 'base64');
  if (iv.length !== 12 || tag.length !== 16 || encrypted.length !== record.bytes) throw new Error('BLUEPRINT_CIPHER_FORMAT_INVALID');
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(Buffer.from('CAPITAL_AI_BLUEPRINT_VAULT@1|' + sku + '|' + VERSION + '|' + expectedHash));
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    if (plain.length !== record.bytes || sha(plain) !== expectedHash) throw new Error('BLUEPRINT_DIGEST_INVALID');
    return plain;
  } catch { throw new Error('BLUEPRINT_CIPHER_AUTH_FAILED'); }
}
async function regularFile(path) {
  const before = await lstat(path);
  if (!before.isFile() || before.isSymbolicLink() || before.size > MAX_CIPHERTEXT) throw new Error('BLUEPRINT_FILE_INVALID');
  const file = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.ino !== before.ino || stat.dev !== before.dev) throw new Error('BLUEPRINT_FILE_CHANGED');
    const data = await file.readFile();
    const after = await file.stat();
    if (after.size !== stat.size || after.mtimeMs !== stat.mtimeMs || data.length !== stat.size) throw new Error('BLUEPRINT_FILE_CHANGED');
    return data;
  } finally { await file.close(); }
}
export function createBlueprintDiskVault({ root = ROOT, keyHex = process.env.BLUEPRINT_DISK_ENCRYPTION_KEY } = {}) {
  const dir = resolve(root);
  const key = checkedKey(keyHex);
  // No arbitrary filesystem roots at production runtime. Tests may supply a temporary root.
  if (!dir || basename(dir) === '.' || dir === '/') throw new Error('BLUEPRINT_DISK_ROOT_INVALID');
  async function directory() {
    if (!key) throw new Error('BLUEPRINT_DISK_KEY_REQUIRED');
    const parent = await lstat(dirname(dir)); // /var/data is the owner-provisioned disk.
    if (!parent.isDirectory() || parent.isSymbolicLink()) throw new Error('BLUEPRINT_MOUNT_UNAVAILABLE');
    await mkdir(dir, { mode: 0o700 }).catch(e => { if (e.code !== 'EEXIST') throw e; });
    const d = await lstat(dir);
    if (!d.isDirectory() || d.isSymbolicLink() || (d.mode & 0o077) !== 0) throw new Error('BLUEPRINT_DISK_PERMISSIONS_INVALID');
    return dir;
  }
  async function writeCipher(sku, body, digest) {
    valid(sku, digest);
    const bytes = decode(key, sku, body, digest);
    await directory();
    const target = join(dir, fileName(sku));
    const tmp = join(dir, '.private-' + randomBytes(16).toString('hex'));
    let fh;
    try {
      fh = await open(tmp, 'wx', 0o600);
      await fh.writeFile(body);
      await fh.sync();
      await fh.close(); fh = null;
      await link(tmp, target); // hard-link create is atomic and never overwrites an existing artifact
      const dh = await open(dir, constants.O_RDONLY | (constants.O_DIRECTORY || 0));
      try { await dh.sync(); } finally { await dh.close(); }
    } finally {
      if (fh) await fh.close();
      await unlink(tmp).catch(() => {});
    }
    return { sku, version: VERSION, bytes: bytes.length, sha256: digest, ciphertextSha256: sha(body) };
  }
  return Object.freeze({
    configured: () => Boolean(key),
    async verify() {
      if (!key) return { available: false, reason: 'ENCRYPTION_KEY_REQUIRED', persistence: 'NOT_PROVEN' };
      try {
        await directory();
        const probe = join(dir, '.probe-' + randomBytes(16).toString('hex'));
        const f = await open(probe, 'wx', 0o600);
        try { await f.sync(); } finally { await f.close(); await unlink(probe); }
        const fs = await statfs(dir);
        return { available: true, encrypted: true, writable: true, freeBytes: fs.bavail * fs.bsize, persistence: 'RESTORE_NOT_PROVEN' };
      } catch {
        return { available: false, reason: 'DISK_OR_PERMISSION_UNAVAILABLE', persistence: 'NOT_PROVEN' };
      }
    },
    async put(sku, plaintext, expectedHash) {
      valid(sku, expectedHash);
      if (!key) throw new Error('BLUEPRINT_DISK_KEY_REQUIRED');
      if (!Buffer.isBuffer(plaintext) || plaintext.length < 128 || plaintext.length > MAX_PLAINTEXT || sha(plaintext) !== expectedHash) throw new Error('BLUEPRINT_SOURCE_MISMATCH');
      return writeCipher(sku, envelope(key, sku, plaintext, expectedHash), expectedHash);
    },
    async restore(sku, ciphertext, expectedHash) {
      if (!key) throw new Error('BLUEPRINT_DISK_KEY_REQUIRED');
      return writeCipher(sku, ciphertext, expectedHash);
    },
    async read(sku, expectedHash) {
      valid(sku, expectedHash);
      if (!key) throw new Error('BLUEPRINT_DISK_KEY_REQUIRED');
      await directory();
      let bytes;
      try { bytes = await regularFile(join(dir, fileName(sku))); }
      catch(e) { if (e.code === 'ENOENT') return null; throw e; }
      return decode(key, sku, bytes, expectedHash);
    },
    async backup(sku, expectedHash) {
      valid(sku, expectedHash);
      if (!key) throw new Error('BLUEPRINT_DISK_KEY_REQUIRED');
      await directory();
      const bytes = await regularFile(join(dir, fileName(sku)));
      decode(key, sku, bytes, expectedHash);
      return { bytes, sha256: sha(bytes), name: fileName(sku), plaintextSha256: expectedHash };
    },
  });
}
