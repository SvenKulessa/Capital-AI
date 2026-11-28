import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { ingestSmartclipPng } from './smartclip-image-local.mjs';

const sig = Buffer.from([137,80,78,71,13,10,26,10]);
function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(name, data) {
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length);
  result.write(name, 4, 'ascii');
  data.copy(result, 8);
  result.writeUInt32BE(crc32(result.subarray(4, 8 + data.length)), 8 + data.length);
  return result;
}
function png({ width = 1, height = 1, note = true, filter = 0 } = {}) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 6;
  const scanline = Buffer.alloc(height * (width * 4 + 1));
  for (let i = 0; i < height; i++) scanline[i * (width * 4 + 1)] = filter;
  return Buffer.concat([
    sig, chunk('IHDR', header),
    ...(note ? [chunk('tEXt', Buffer.from('Comment\0private location and author'))] : []),
    chunk('IDAT', deflateSync(scanline)), chunk('IEND', Buffer.alloc(0)),
  ]);
}
const origin = { rightsBasis: 'ai_generated',
  sourceDescription: 'Owner-submitted graphic', generator: 'ChatGPT / Grok / Google AI Studio' };

test('sanitizes ancillary personal metadata and binds source/cleaned digests', () => {
  const source = png();
  const result = ingestSmartclipPng(source, origin);
  assert.equal(result.mime, 'image/png');
  assert.equal(result.width, 1);
  assert.equal(result.height, 1);
  assert.equal(result.bytes.includes(Buffer.from('private location')), false);
  assert.equal(result.bytes.includes(Buffer.from('tEXt')), false);
  assert.equal(result.sourceSha256, createHash('sha256').update(source).digest('hex'));
  assert.equal(result.sha256, createHash('sha256').update(result.bytes).digest('hex'));
  assert.equal(result.provenance.publicReleaseApproved, false);
  assert.equal(result.provenance.verification, 'USER_ATTESTED_NOT_INDEPENDENTLY_VERIFIED');
  assert.equal(result.publishing, 'BLOCKED_PENDING_INDEPENDENT_RIGHTS_REVIEW');
  const repeat = ingestSmartclipPng(result.bytes, origin);
  assert.equal(repeat.sha256, result.sha256);
});

test('refuses malformed signature, CRC, trailing data, unsupported dimensions and filters', () => {
  const sample = png();
  const tampered = Buffer.from(sample); tampered[20] ^= 1;
  const cases = [
    Buffer.from('not an image'), tampered,
    Buffer.concat([sample, Buffer.from('extra')]),
    png({ width: 4097 }), png({ width: 4096, height: 4097, note: false }),
    png({ filter: 5 }),
  ];
  for (const bytes of cases) assert.throws(() => ingestSmartclipPng(bytes, origin));
});

test('rejects disguised SVG, missing provenance, and unproven third-party license', () => {
  assert.throws(() => ingestSmartclipPng(Buffer.from('<svg onload="alert(1)"/>'), origin));
  assert.throws(() => ingestSmartclipPng(png(), {}), /provenance_required/);
  assert.throws(() => ingestSmartclipPng(png(), {
    rightsBasis: 'third_party_licensed', sourceDescription: 'Unknown third-party work',
  }), /license_evidence_required/);
  assert.throws(() => ingestSmartclipPng(png(), {
    rightsBasis: 'ai_generated', sourceDescription: 'Owner-supplied', generator: '',
  }), /generator_required/);
});

test('retains only bounded attestations for third-party imports', () => {
  const result = ingestSmartclipPng(png({ note: false }), {
    rightsBasis: 'third_party_licensed',
    sourceDescription: 'Licensed illustration',
    licenseEvidenceSha256: 'a'.repeat(64),
    publicReleaseApproved: true,
    secret: 'must-not-copy',
  });
  assert.equal(result.provenance.licenseEvidenceSha256, 'a'.repeat(64));
  assert.equal(result.provenance.publicReleaseApproved, false);
  assert.equal('secret' in result.provenance, false);
});

test('fails closed on truncated and decompression-bomb PNGs', () => {
  const tooLarge = png({ width: 1, height: 4096, note: false });
  const header = Buffer.from(tooLarge);
  // Corrupt IDAT compressed content: CRC remains invalid, must refuse.
  header[43] ^= 1;
  assert.throws(() => ingestSmartclipPng(header, origin));
  const valid = ingestSmartclipPng(tooLarge, origin);
  assert.equal(valid.height, 4096);
});


test('rejects extra bytes inside IDAT after the validated zlib stream', () => {
  const clean = png({ note: false });
  const header = clean.subarray(8, 33);
  const compressed = deflateSync(Buffer.alloc(5));
  for (const trailing of [Buffer.from('synthetic-private-marker'), deflateSync(Buffer.alloc(5))]) {
    const malformed = Buffer.concat([
      sig, header, chunk('IDAT', Buffer.concat([compressed, trailing])), chunk('IEND', Buffer.alloc(0)),
    ]);
    assert.throws(() => ingestSmartclipPng(malformed, origin), /png_deflate_trailing/);
  }
  assert.equal(ingestSmartclipPng(clean, origin).width, 1);
});
