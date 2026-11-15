import test from 'node:test';
import assert from 'node:assert/strict';
import {safeAccountAvatarUrl, accountAvatarForVerifiedUser} from './account-avatar.mjs';

test('provider avatar is presentation only and accepts listed HTTPS CDNs', () => {
  assert.equal(safeAccountAvatarUrl('https://lh3.googleusercontent.com/a/example'), 'https://lh3.googleusercontent.com/a/example');
  assert.equal(safeAccountAvatarUrl('https://pbs.twimg.com/profile_images/abc.png'), 'https://pbs.twimg.com/profile_images/abc.png');
  assert.equal(safeAccountAvatarUrl('/api/profile/avatar/photo123'), '/api/profile/avatar/photo123');
  assert.equal(accountAvatarForVerifiedUser({user_metadata:{picture:'https://lh3.googleusercontent.com/a/example'}}),
    'https://lh3.googleusercontent.com/a/example');
  assert.equal(accountAvatarForVerifiedUser({user_metadata:{avatar_url:'https://invalid.example/evil'},identities:[{identity_data:{picture:'https://pbs.twimg.com/p.png'}}]}),
    'https://pbs.twimg.com/p.png');
});

test('rejects active content, tracking and cross-boundary image URLs', () => {
  for (const value of [
    'http://lh3.googleusercontent.com/a/x',
    'javascript:alert(1)', 'data:image/svg+xml,<svg/>', 'file:///etc/passwd',
    'https://localhost/private', 'https://127.0.0.1/private',
    'https://lh3.googleusercontent.com.attacker.org/avatar',
    'https://user:pass@pbs.twimg.com/p.png',
    '/api/profile/avatar/../logout', '/api/profile/avatar/id?token=secret',
    'https://pbs.twimg.com/img#secret',
  ]) assert.equal(safeAccountAvatarUrl(value), null, value);
  assert.equal(accountAvatarForVerifiedUser(null), null);
  assert.equal(accountAvatarForVerifiedUser({user_metadata:{avatar_url:'https://evil.test/photo.png'}}), null);
  assert.equal(safeAccountAvatarUrl('x'.repeat(2049)), null);
});
