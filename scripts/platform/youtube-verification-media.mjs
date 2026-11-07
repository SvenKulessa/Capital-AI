import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const MAGIC = Buffer.from('CAPITAL-AI-YOUTUBE-MEDIA@1\n');
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
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv('aes-256-gcm', keyBytes(key), nonce);
  cipher.setAAD(MAGIC);
  const ciphertext = Buffer.concat([cipher.update(media), cipher.final()]);
  return Buffer.concat([MAGIC, nonce, cipher.getAuthTag(), ciphertext]);
}

export function openVerificationMedia(envelope, key, expectedSha256) {
  const payloadStart = MAGIC.length + NONCE_BYTES + TAG_BYTES;
  if (!Buffer.isBuffer(envelope) || envelope.length <= payloadStart || envelope.length > MEDIA_LIMIT + payloadStart ||
      !envelope.subarray(0, MAGIC.length).equals(MAGIC)) throw Error('MEDIA_ENVELOPE_INVALID');
  const nonceEnd = MAGIC.length + NONCE_BYTES;
  const decipher = createDecipheriv('aes-256-gcm', keyBytes(key), envelope.subarray(MAGIC.length, nonceEnd));
  decipher.setAAD(MAGIC);
  decipher.setAuthTag(envelope.subarray(nonceEnd, payloadStart));
  const media = Buffer.concat([decipher.update(envelope.subarray(payloadStart)), decipher.final()]);
  verifyVerificationMedia(media, expectedSha256);
  return media;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [source, destination] = process.argv.slice(2);
    const envelope = sealVerificationMedia(await readFile(source), process.env.YOUTUBE_DEMO_MEDIA_KEY, process.env.DEMO_SHA256);
    await writeFile(destination, envelope, { flag: 'wx', mode: 0o600 });
    console.log('YOUTUBE_DEMO_MEDIA_SEALED');
  } catch {
    console.error('YOUTUBE_DEMO_MEDIA_SEAL_STOPPED');
    process.exitCode = 1;
  }
}
