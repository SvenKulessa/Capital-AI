import test from 'node:test';
import assert from 'node:assert/strict';
import { SECURITY_HEADERS, contentSecurityPolicyForHtml } from './security-headers.mjs';

test('strict security headers keep HSTS preload opt-out and origin isolation', () => {
  assert.equal(SECURITY_HEADERS['Strict-Transport-Security'], 'max-age=31536000; includeSubDomains');
  assert.equal(SECURITY_HEADERS['Cross-Origin-Opener-Policy'], 'same-origin');
  assert.equal(SECURITY_HEADERS['Cross-Origin-Resource-Policy'], 'same-origin');
  assert.doesNotMatch(SECURITY_HEADERS['Content-Security-Policy'], /unsafe-inline|img-src[^;]*https:/);
  assert.match(SECURITY_HEADERS['Content-Security-Policy'], /googletagmanager\.com\/gtag\/js/);
  assert.doesNotMatch(SECURITY_HEADERS['Strict-Transport-Security'], /preload/);
});

test('HTML receives exact hashes for inline CSS and known attribute styles', () => {
  const html = '<style>body { color: red; }</style><div style="display:flex;gap:1rem"></div>';
  const policy = contentSecurityPolicyForHtml(html);
  assert.match(policy, /style-src 'self' 'sha256-/);
  assert.match(policy, /style-src-attr 'unsafe-hashes' 'sha256-/);
  assert.doesNotMatch(policy, /unsafe-inline|img-src[^;]*https:/);
  assert.notEqual(contentSecurityPolicyForHtml('<style>body { color: blue; }</style>'), policy);
  assert.match(contentSecurityPolicyForHtml('<main>safe</main>'), /style-src-attr 'none'/);
});

test('SEO JSON-LD is allowed only by content-specific script hash', () => {
  const html = '<script id="capital-ai-seo-jsonld" type="application/ld+json">{"@context":"https://schema.org"}</script>';
  const csp = contentSecurityPolicyForHtml(html);
  assert.match(csp, /script-src 'self' https:\/\/www\.googletagmanager\.com\/gtag\/js 'sha256-/);
  assert.notEqual(csp, contentSecurityPolicyForHtml(html.replace('schema.org', 'example.org')));
});
