import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProfileImageMetadata, canPublishProfileImage, selectProfileAvatar } from './profile-image-policy.mjs';

const hash = 'a'.repeat(64);
const metadata = validateProfileImageMetadata({ mime: 'image/png', size: 1024, filename: 'avatar.png' });
const clean = { status: 'clean', engine: 'clamav', sha256: hash, signatureVersion: '1' };

test('accepts constrained image metadata', () => assert.equal(metadata.ok, true));
for (const [mime, size, filename] of [
  ['image/svg+xml', 10, 'a.svg'], ['image/png', 0, 'a.png'],
  ['image/png', 2097153, 'a.png'], ['image/png', 12, '../a.png'],
  ['image/png', 12, 'a\\b.png'], ['image/png', 12, ''],
  ['image/png', NaN, 'a.png'], ['image/png', 1.5, 'a.png'],
]) test('rejects unsafe metadata: ' + JSON.stringify([mime,size,filename]), () =>
  assert.equal(validateProfileImageMetadata({ mime, size, filename }).ok, false));

test('admits matching clean scan', () => assert.equal(canPublishProfileImage({ metadata, magicMime: 'image/png', scan: clean, sha256: hash }), true));
for (const override of [
  { scan: null }, { scan: { ...clean, status: 'infected' } },
  { scan: { ...clean, sha256: 'b'.repeat(64) } },
  { scan: { ...clean, engine: 'untrusted' } },
  { scan: { ...clean, signatureVersion: null } },
  { magicMime: 'image/svg+xml' }, { sha256: 'bad' }, { metadata: { ok: false } },
]) test('fails closed on invalid scan evidence: ' + Object.keys(override)[0], () =>
  assert.equal(canPublishProfileImage({ metadata, magicMime: 'image/png', scan: clean, sha256: hash, ...override }), false));

test('approved local upload wins over provider', () => assert.equal(selectProfileAvatar({
  approvedUpload: { admitted: true, url: '/api/profile/avatar/123' }, loginProvider: 'google',
  providerAvatars: { google: 'https://lh3.googleusercontent.com/a' },
}), '/api/profile/avatar/123'));
test('uses only signed-in provider', () => assert.equal(selectProfileAvatar({
  loginProvider: 'x', providerAvatars: { google: 'https://lh3.googleusercontent.com/a', x: 'https://pbs.twimg.com/a' },
}), 'https://pbs.twimg.com/a'));
for (const url of ['http://pbs.twimg.com/a', 'https://evil.example/a', 'https://pbs.twimg.com.evil.example/a',
  'https://user:pass@pbs.twimg.com/a', 'javascript:alert(1)'])
  test('rejects untrusted avatar URL ' + url, () => assert.equal(selectProfileAvatar({
    loginProvider: 'x', providerAvatars: { x: url },
  }), null));
test('unverified upload never overrides provider', () => assert.equal(selectProfileAvatar({
  approvedUpload: { admitted: false, url: '/api/profile/avatar/123' }, loginProvider: 'google',
  providerAvatars: { google: 'https://lh3.googleusercontent.com/a' },
}), 'https://lh3.googleusercontent.com/a'));
