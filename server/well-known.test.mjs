import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SECURITY_TXT_CANONICAL,
  SECURITY_TXT_EXPIRES,
  securityTxt,
  serveWellKnown,
} from './well-known.mjs';

function response() {
  return {
    writeHead(status, headers) {
      this.status = status;
      this.headers = headers;
    },
    end(body) {
      this.body = body;
    },
  };
}

test('security.txt exposes the exact RFC 9116 well-known path', () => {
  const res = response();
  assert.equal(
    serveWellKnown(
      { method: 'GET' },
      res,
      new URL('https://capital-ai.online/.well-known/security.txt'),
    ),
    true,
  );
  assert.equal(res.status, 200);
  assert.equal(res.headers['Content-Type'], 'text/plain; charset=utf-8');
  assert.equal(res.headers['Content-Length'], Buffer.byteLength(securityTxt));
  assert.match(res.body, /^Contact: mailto:support@capital-ai\.online$/m);
  assert.match(res.body, new RegExp(`^Expires: ${SECURITY_TXT_EXPIRES}$`, 'm'));
  assert.match(res.body, /^Preferred-Languages: de, en$/m);
  assert.match(res.body, new RegExp(`^Canonical: ${SECURITY_TXT_CANONICAL.replaceAll('.', '\\.')}$`, 'm'));
});

test('security.txt expiry remains current and less than one year ahead', () => {
  const now = Date.now();
  const expiry = Date.parse(SECURITY_TXT_EXPIRES);
  assert.ok(expiry > now, 'security.txt expiry must be renewed before it becomes stale');
  assert.ok(expiry - now < 365 * 24 * 60 * 60 * 1000);
});

test('HEAD exposes security.txt headers without body', () => {
  const res = response();
  assert.equal(
    serveWellKnown(
      { method: 'HEAD' },
      res,
      new URL('https://capital-ai.online/.well-known/security.txt'),
    ),
    true,
  );
  assert.equal(res.status, 200);
  assert.equal(res.body, undefined);
});

test('security.txt cannot be changed over HTTP and other well-known paths stay closed', () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const res = response();
    assert.equal(
      serveWellKnown(
        { method },
        res,
        new URL('https://capital-ai.online/.well-known/security.txt'),
      ),
      true,
    );
    assert.equal(res.status, 405);
    assert.equal(res.headers.Allow, 'GET, HEAD');
  }

  for (const pathname of [
    '/.well-known/security.txt/',
    '/.well-known/security.txt.bak',
    '/.well-known/assetlinks.json',
    '/.well-known/apple-app-site-association',
    '/.well-known/secret',
  ]) {
    assert.equal(
      serveWellKnown({ method: 'GET' }, response(), new URL(pathname, 'https://capital-ai.online')),
      false,
    );
  }
});
