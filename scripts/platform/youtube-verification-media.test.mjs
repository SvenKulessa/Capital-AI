import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { openVerificationMedia, sealVerificationMedia } from './youtube-verification-media.mjs';

const media = Buffer.from('0000ftypprivate test footage');
const hash = createHash('sha256').update(media).digest('hex');
const key = 'ab'.repeat(32);

test('sealed media round trips exactly without exposing plaintext', () => {
  const envelope = sealVerificationMedia(media, key, hash);
  assert.equal(envelope.includes(media), false);
  assert.notDeepEqual(envelope, sealVerificationMedia(media, key, hash));
  assert.deepEqual(openVerificationMedia(envelope, key, hash), media);
});

test('plaintext, a wrong key, altered ciphertext and a wrong digest fail closed', () => {
  const envelope = sealVerificationMedia(media, key, hash);
  assert.throws(() => openVerificationMedia(media, key, hash), /MEDIA_ENVELOPE_INVALID/);
  assert.throws(() => openVerificationMedia(envelope, 'bc'.repeat(32), hash));
  assert.throws(() => openVerificationMedia(envelope, key, '0'.repeat(64)), /HASH_MISMATCH/);
  envelope[envelope.length - 1] ^= 1;
  assert.throws(() => openVerificationMedia(envelope, key, hash));
});
