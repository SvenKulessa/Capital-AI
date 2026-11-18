import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { safeAccountAvatarUrl } from '../../../shared/account-avatar-policy.mjs';
import { VerifiedProfileAvatar } from './VerifiedProfileAvatar';

test('authenticated provider picture renders without a referrer and with accessible alt text', () => {
  const html = renderToStaticMarkup(<VerifiedProfileAvatar avatarUrl="https://lh3.googleusercontent.com/a/avatar.jpg" name="Test User" />);
  assert.match(html, /<img/);
  assert.match(html, /src="https:\/\/lh3.googleusercontent.com\/a\/avatar.jpg"/);
  assert.match(html, /referrerPolicy="no-referrer"/i);
  assert.match(html, /alt="Profilbild von Test User"/);
});

test('missing, untrusted or active-content profile pictures render an inert fallback', () => {
  for (const avatarUrl of [
    null, undefined, '', 'http://lh3.googleusercontent.com/p.png',
    'data:image/svg+xml,<svg onload="alert(1)"/>',
    'https://example.com/tracker.png', 'https://pbs.twimg.com.evil.test/track',
    '/api/profile/avatar/../../../etc/passwd',
  ]) {
    const html = renderToStaticMarkup(<VerifiedProfileAvatar avatarUrl={avatarUrl} name="Test" />);
    assert.match(html, /Profilbild von Test nicht verfügbar/);
    assert.doesNotMatch(html, /<img/);
  }
});

test('shared policy accepts only verified CDN hosts and same-origin avatar route', () => {
  const safe = [
    'https://pbs.twimg.com/profile_images/test.jpg',
    'https://lh3.googleusercontent.com/a/photo.jpg',
    'https://images.notion.so/example',
    '/api/profile/avatar/abc123',
  ];
  for (const url of safe) assert.equal(safeAccountAvatarUrl(url), url);
  for (const url of [
    'https://user:pass@pbs.twimg.com/a.png',
    'https://lh3.googleusercontent.com:8443/a',
    'https://pbs.twimg.com/a.png#fragment',
    '//pbs.twimg.com/a.png',
    'javascript:alert(1)',
  ]) assert.equal(safeAccountAvatarUrl(url), null);
});
