import test from 'node:test';
import assert from 'node:assert/strict';
import { productionReadback } from './seo-production-readback.mjs';
import { SEO_CONTENT_MANIFEST } from '../shared/seo-content-manifest.mjs';

function fixture(url, options) {
  assert.equal(options.method, 'GET');
  assert.equal(options.redirect, 'manual');
  assert.equal(options.headers.Authorization, undefined);
  const path = new URL(url).pathname;
  const entry = SEO_CONTENT_MANIFEST.find(item => item.path === path);
  let body;
  if (entry) body = `<link rel="canonical" href="${entry.canonical}"><meta name="robots" content="index, follow"><div id="root"><main><h1>Content</h1></main></div><script type="application/ld+json">{"@type":"WebPage"}</script>`;
  else if (path === '/robots.txt') body = 'Sitemap: https://capital-ai.online/sitemap.xml';
  else if (path === '/sitemap.xml') body = '<urlset>' + SEO_CONTENT_MANIFEST.map(item => `<url><loc>${item.canonical}</loc></url>`).join('') + '</urlset>';
  else if (path === '/login') return new Response('<meta name="robots" content="noindex, nofollow">', { headers: { 'x-robots-tag': 'noindex, nofollow' } });
  else if (path === '/healthz') body = JSON.stringify({ status: 'ok', buildIdentity: { bound: false, sourceSha: null } });
  else if (path.includes('subscriptions')) body = JSON.stringify({ schema: 'CAPITAL_AI_SUBSCRIPTION_COMMERCE_READINESS@1', enabled: true });
  else if (path.includes('commerce')) body = JSON.stringify({ schema: 'CAPITAL_AI_CADS_COMMERCE_READINESS@1', githubMarketplace: { runtimeReady: false } });
  else body = 'https://capital-ai.online/learning';
  return new Response(body, { headers: { 'content-type': entry ? 'text/html' : 'text/plain' } });
}

test('anonymous readback distinguishes SEO PASS, configured commerce and unproven purchase/runtime', async () => {
  const report = await productionReadback({ fetchImpl: fixture });
  assert.equal(report.seoStatus, 'PASS');
  assert.equal(report.runtimeIdentity.status, 'NOT_PROVEN');
  assert.equal(report.commerce.checkoutConfigured, true);
  assert.equal(report.commerce.purchaseEvidence, 'NOT_PROVEN');
  assert.equal(report.productionReady, false);
});

test('redirects and malformed JSON-LD fail without following or retaining response content', async () => {
  for (const makeResponse of [() => new Response(null, { status: 302, headers: { location: 'https://example.com/private' } }),
    () => new Response('sensitive-response-value', { headers: { 'content-type': 'text/html' } })]) {
    const report = await productionReadback({ fetchImpl: (url, options) => new URL(url).pathname === '/' ? makeResponse() : fixture(url, options) });
    assert.equal(report.seoStatus, 'FAIL');
    assert.ok(!JSON.stringify(report).includes('sensitive-response-value'));
  }
});

test('unexpected sitemap entries, private discovery URLs and oversized bodies fail', async () => {
  const report = await productionReadback({ fetchImpl: (url, options) => {
    const path = new URL(url).pathname;
    if (path === '/sitemap.xml') return new Response('<loc>https://capital-ai.online/profile</loc>');
    if (path === '/llms.txt') return new Response('https://capital-ai.online/learning /profile');
    if (path === '/') return new Response('x'.repeat(2 * 1024 * 1024 + 1));
    return fixture(url, options);
  } });
  assert.equal(report.seoStatus, 'FAIL');
  assert.ok(report.checks.some(item => item.check === 'BOUNDED_RESPONSE_AVAILABLE' && item.status === 'FAIL'));
});

test('origin must not include credentials, HTTP or path', async () => {
  for (const origin of ['http://capital-ai.online', 'https://user:secret@capital-ai.online', 'https://capital-ai.online/profile']) {
    await assert.rejects(productionReadback({ origin, fetchImpl: fixture }));
  }
});
