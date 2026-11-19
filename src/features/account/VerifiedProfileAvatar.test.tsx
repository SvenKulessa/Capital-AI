import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
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

test('failed CDN avatar remains a safe fallback until the verified URL changes', () => {
  const source = readFileSync(new URL('./VerifiedProfileAvatar.tsx', import.meta.url), 'utf8');
  assert.match(source, /failedUrl === verifiedUrl/);
  assert.match(source, /onError=\{\(\) => setFailedUrl\(verifiedUrl\)\}/);
  assert.doesNotMatch(source, /useEffect\(\(\) => setFailed\(false\)/);
  assert.match(source, /<UserRound/);
});

test('owner account links to existing profile avatar controls without bypassing scan gating', () => {
  const shell = readFileSync(new URL('./AccountPageShell.tsx', import.meta.url), 'utf8');
  const upload = readFileSync(new URL('./ProfileAvatarUpload.tsx', import.meta.url), 'utf8');
  const overview = readFileSync(new URL('../../components/OwnerOperationsVisualOverview.tsx', import.meta.url), 'utf8');
  const panel = readFileSync(new URL('../../components/OwnerAgentOperationsPanel.tsx', import.meta.url), 'utf8');
  assert.match(shell, /active === '\/profile\/dashboard'/);
  assert.match(shell, /onNavigate\('\/profile'\)/);
  assert.match(shell, /Profilbild verwalten/);
  assert.match(upload, /r\.status === 404/);
  assert.match(upload, /disabled=\{busy \|\| !available\}/);
  assert.match(upload, /Sicherheitsprüfung oder der private Speicher/);
  assert.match(overview, /Owner-Bereich · angemeldet/);
  assert.doesNotMatch(overview, /> Nur für Owner</);
  assert.match(panel, /!isVerified\(snapshot\.github\)/);
  assert.match(panel, /https:\/\/github\.com\/SvenKulessa\/Capital-AI\/pulls/);
  assert.doesNotMatch(upload, /PROFILE_AVATAR_UPLOAD_ENABLED\s*=\s*true/);
});
