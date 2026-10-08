import test from 'node:test';
import assert from 'node:assert/strict';
import { totpQrImage } from './totpEnrollment';

test('TOTP QR renders raw SVG, XML-prefixed SVG and provider data URLs', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
  assert.equal(totpQrImage(svg), 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  assert.equal(totpQrImage('<?xml version="1.0"?>\n' + svg), totpQrImage(svg));
  assert.equal(totpQrImage('data:image/png;base64,aA=='), 'data:image/png;base64,aA==');
});
test('TOTP QR rejects remote services, HTML, script URLs and oversized payloads', () => {
  for (const value of [undefined, 'https://example.test/qr', 'javascript:alert(1)', '<img src=x>', 'a'.repeat(220001)]) {
    assert.equal(totpQrImage(value), '');
  }
});
