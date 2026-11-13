import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const MAGIC = Buffer.from('CAPITAL-AI-YOUTUBE-MEDIA@1\n');
const RECEIPT_MAGIC = Buffer.from('CAPITAL-AI-YOUTUBE-RECEIPT@1\n');
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const MEDIA_LIMIT = 100 * 1024 * 1024;

function keyBytes(key) {
  if (!/^[a-f0-9]{64}$/.test(key ?? '')) throw Error('MEDIA_KEY_INVALID');
  return Buffer.from(key, 'hex');
}

export function verifyVerificationMedia(media, expectedSha256) {
  if (!Buffer.isBuffer(media) || media.length === 0 || media.length > MEDIA_LIMIT) throw Error('MEDIA_LIMIT');
  const sha256 = createHash('sha256').update(media).digest('hex');
  if (expectedSha256 !== sha256) throw Error('HASH_MISMATCH');
  if (media.subarray(4, 8).toString() !== 'ftyp') throw Error('MP4_REQUIRED');
  return { sha256, sizeBytes: media.length };
}

export function sealVerificationMedia(media, key, expectedSha256) {
  verifyVerificationMedia(media, expectedSha256);
  return seal(media, key, MAGIC);
}

function seal(bytes, key, magic) {
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv('aes-256-gcm', keyBytes(key), nonce);
  cipher.setAAD(magic);
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([magic, nonce, cipher.getAuthTag(), ciphertext]);
}

export function openVerificationMedia(envelope, key, expectedSha256) {
  const media = open(envelope, key, MAGIC, MEDIA_LIMIT);
  verifyVerificationMedia(media, expectedSha256);
  return media;
}

function open(envelope, key, magic, limit) {
  const payloadStart = magic.length + NONCE_BYTES + TAG_BYTES;
  if (!Buffer.isBuffer(envelope) || envelope.length <= payloadStart || envelope.length > limit + payloadStart ||
      !envelope.subarray(0, magic.length).equals(magic)) throw Error('MEDIA_ENVELOPE_INVALID');
  const nonceEnd = magic.length + NONCE_BYTES;
  const decipher = createDecipheriv('aes-256-gcm', keyBytes(key), envelope.subarray(magic.length, nonceEnd));
  decipher.setAAD(magic);
  decipher.setAuthTag(envelope.subarray(nonceEnd, payloadStart));
  return Buffer.concat([decipher.update(envelope.subarray(payloadStart)), decipher.final()]);
}

export function sealVerificationReceipt(receipt, key) {
  return seal(Buffer.from(JSON.stringify(receipt)), key, RECEIPT_MAGIC);
}

export function openVerificationReceipt(envelope, key) {
  return JSON.parse(open(envelope, key, RECEIPT_MAGIC, 65536).toString('utf8'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [source, destination] = process.argv.slice(2);
    const key = process.env.YOUTUBE_DEMO_MEDIA_KEY;
    if (source === '--open-receipt') {
      console.log(JSON.stringify(openVerificationReceipt(await readFile(destination), key)));
    } else {
      const envelope = sealVerificationMedia(await readFile(source), key, process.env.DEMO_SHA256);
      await writeFile(destination, envelope, { flag: 'wx', mode: 0o600 });
      console.log('YOUTUBE_DEMO_MEDIA_SEALED');
    }
  } catch {
    console.error('YOUTUBE_DEMO_ENVELOPE_OPERATION_STOPPED');
    process.exitCode = 1;
  }
}
