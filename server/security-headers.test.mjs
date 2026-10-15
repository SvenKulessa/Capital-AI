import test from 'node:test';
import assert from 'node:assert/strict';
import { SECURITY_HEADERS, contentSecurityPolicyForHtml, strictContentSecurityPolicyForHtml } from './security-headers.mjs';

test('strict security headers keep HSTS preload opt-out and origin isolation', () => {
  assert.equal(SECURITY_HEADERS['Strict-Transport-Security'], 'max-age=31536000');
  assert.equal(SECURITY_HEADERS['Cross-Origin-Opener-Policy'], 'same-origin-allow-popups');
  assert.equal(SECURITY_HEADERS['Cross-Origin-Resource-Policy'], 'same-origin');
  assert.doesNotMatch(SECURITY_HEADERS['Content-Security-Policy'], /script-src[^;]*unsafe-inline|img-src[^;]*https:/);
  assert.doesNotMatch(SECURITY_HEADERS['Content-Security-Policy-Report-Only'], /unsafe-inline/);
  assert.match(SECURITY_HEADERS['Content-Security-Policy'], /googletagmanager\.com\/gtag\/js/);
  assert.doesNotMatch(SECURITY_HEADERS['Strict-Transport-Security'], /preload/);
});

test('HTML receives exact hashes for inline CSS and known attribute styles', () => {
  const html = '<style>body { color: red; }</style><div style="display:flex;gap:1rem"></div>';
  const policy = strictContentSecurityPolicyForHtml(html);
  assert.match(policy, /style-src 'self' 'sha256-/);
  assert.match(policy, /style-src-attr 'unsafe-hashes' 'sha256-/);
  assert.doesNotMatch(policy, /unsafe-inline|img-src[^;]*https:/);
  assert.notEqual(strictContentSecurityPolicyForHtml('<style>body { color: blue; }</style>'), policy);
  assert.match(strictContentSecurityPolicyForHtml('<main>safe</main>'), /style-src-attr 'none'/);
});

test('SEO JSON-LD is allowed only by content-specific script hash', () => {
  const html = '<script id="capital-ai-seo-jsonld" type="application/ld+json">{"@context":"https://schema.org"}</script>';
  const csp = contentSecurityPolicyForHtml(html);
  assert.match(csp, /script-src 'self' https:\/\/www\.googletagmanager\.com\/gtag\/js 'sha256-/);
  assert.notEqual(csp, contentSecurityPolicyForHtml(html.replace('schema.org', 'example.org')));
});

test('enforced policy preserves dynamic styles and keeps executable inline scripts blocked', () => {
  const policy = contentSecurityPolicyForHtml('<main>safe</main>');
  assert.match(policy, /style-src 'self' 'unsafe-inline'/);
  assert.doesNotMatch(policy, /script-src[^;]*unsafe-inline/);
  assert.equal(SECURITY_HEADERS['Cross-Origin-Opener-Policy'], 'same-origin-allow-popups');
  assert.doesNotMatch(SECURITY_HEADERS['Strict-Transport-Security'], /includeSubDomains/);
});
