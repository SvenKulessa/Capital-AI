// SmartClip offline PNG ingestion. No external requests, filesystem writes or billing coupling.
// Asset provenance is user-supplied and never constitutes an independent rights clearance.
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([137,80,78,71,13,10,26,10]);
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_PIXELS = 16 * 1024 * 1024;
const SHA256 = /^[0-9a-f]{64}$/;
const RIGHTS = new Set(['original', 'ai_generated', 'third_party_licensed']);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const tag = Buffer.from(type, 'ascii');
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  tag.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function provenance(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      !RIGHTS.has(input.rightsBasis) ||
      typeof input.sourceDescription !== 'string' ||
      input.sourceDescription.trim().length < 3 ||
      input.sourceDescription.length > 256) throw Error('provenance_required');
  if (input.rightsBasis === 'ai_generated' &&
      (typeof input.generator !== 'string' || input.generator.trim().length < 2 ||
       input.generator.length > 128)) throw Error('generator_required');
  if (input.rightsBasis === 'third_party_licensed' &&
      (typeof input.licenseEvidenceSha256 !== 'string' ||
       !SHA256.test(input.licenseEvidenceSha256))) throw Error('license_evidence_required');
  return Object.freeze({
    rightsBasis: input.rightsBasis,
    sourceDescription: input.sourceDescription.trim(),
    ...(input.rightsBasis === 'ai_generated' ? { generator: input.generator.trim() } : {}),
    ...(input.rightsBasis === 'third_party_licensed'
      ? { licenseEvidenceSha256: input.licenseEvidenceSha256 } : {}),
    verification: 'USER_ATTESTED_NOT_INDEPENDENTLY_VERIFIED',
    publicReleaseApproved: false,
  });
}

/**
 * Accepts only non-interlaced, 8-bit truecolor/truecolor+alpha PNG.
 * Decodes within strict limits to verify all scanlines; reconstructs only
 * IHDR/IDAT/IEND, discarding EXIF, textual, color-profile and other ancillary chunks.
 * Never execute or parse SVG, animated formats, or supplied remote URLs.
 */
export function ingestSmartclipPng(bytes, origin) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 45 ||
      bytes.byteLength > MAX_BYTES) throw Error('invalid_image_size');
  const raw = Buffer.from(bytes);
  if (!raw.subarray(0, 8).equals(SIGNATURE)) throw Error('png_signature');
  const cleaned = [];
  const compressed = [];
  let pos = 8, ihdr = null, ended = false, hasIdat = false, idatClosed = false;
  while (pos < raw.length) {
    if (pos + 12 > raw.length) throw Error('truncated_png');
    const length = raw.readUInt32BE(pos);
    if (length > MAX_BYTES || pos + 12 + length > raw.length) throw Error('truncated_png');
    const name = raw.toString('ascii', pos + 4, pos + 8);
    if (!/^[A-Za-z]{4}$/.test(name)) throw Error('invalid_chunk');
    const data = raw.subarray(pos + 8, pos + 8 + length);
    const expected = raw.readUInt32BE(pos + 8 + length);
    if (crc32(raw.subarray(pos + 4, pos + 8 + length)) !== expected) throw Error('png_crc');
    if (name === 'IHDR') {
      if (ihdr || pos !== 8 || length !== 13) throw Error('png_ihdr');
      const width = data.readUInt32BE(0), height = data.readUInt32BE(4);
      if (!width || !height || width > 4096 || height > 4096 ||
          width * height > MAX_PIXELS ||
          data[8] !== 8 || ![2,6].includes(data[9]) ||
          data[10] !== 0 || data[11] !== 0 || data[12] !== 0) throw Error('png_unsupported');
      ihdr = { width, height, channels: data[9] === 6 ? 4 : 3 };
      cleaned.push(chunk('IHDR', data));
    } else if (name === 'IDAT') {
      if (!ihdr || idatClosed || length === 0) throw Error('png_idat');
      hasIdat = true;
      compressed.push(data);
    } else if (name === 'IEND') {
      if (!hasIdat || length !== 0 || pos + 12 !== raw.length) throw Error('png_end');
      ended = true;
    } else {
      if (!ihdr || ended || name[0] === name[0].toUpperCase()) throw Error('png_critical_chunk');
      if (hasIdat) idatClosed = true;
      // Discard all ancillary metadata, including EXIF/text/ICC.
    }
    pos += 12 + length;
    if (ended) break;
  }
  if (!ended || !ihdr) throw Error('png_incomplete');
  const stride = ihdr.width * ihdr.channels;
  const expectedLength = ihdr.height * (stride + 1);
  let decoded;
  const compressedBytes = Buffer.concat(compressed);
  let consumed;
  try {
    const inflated = inflateSync(compressedBytes, { maxOutputLength: expectedLength + 1, info: true });
    decoded = inflated.buffer;
    consumed = inflated.engine.bytesWritten;
  } catch { throw Error('png_deflate'); }
  // Never preserve bytes outside the single validated zlib stream in the sanitized IDAT.
  if (consumed !== compressedBytes.length) throw Error('png_deflate_trailing');
  if (decoded.length !== expectedLength) throw Error('png_scanlines');
  for (let y = 0; y < ihdr.height; y++) {
    if (decoded[y * (stride + 1)] > 4) throw Error('png_filter');
  }
  const sanitized = Buffer.concat([
    SIGNATURE, cleaned[0], chunk('IDAT', Buffer.concat(compressed)), chunk('IEND', Buffer.alloc(0)),
  ]);
  const rights = provenance(origin);
  return Object.freeze({
    mime: 'image/png',
    width: ihdr.width,
    height: ihdr.height,
    byteLength: sanitized.length,
    sha256: digest(sanitized),
    sourceSha256: digest(raw),
    bytes: sanitized,
    provenance: rights,
    preview: 'LOCAL_ONLY',
    publishing: 'BLOCKED_PENDING_INDEPENDENT_RIGHTS_REVIEW',
  });
}
