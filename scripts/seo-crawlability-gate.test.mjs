import test from 'node:test';
import assert from 'node:assert/strict';
import { runCrawlabilityGate, expectedIndexPaths, parseSitemapLocs } from './seo-crawlability-gate.mjs';

test('parseSitemapLocs extracts pathnames correctly', () => {
  const xml = `<?xml version="1.0"?>
<urlset>
  <url><loc>https://capital-ai.online/</loc></url>
  <url><loc>https://capital-ai.online/learning</loc></url>
  <url><loc>https://capital-ai.online/vocabulary/orderbuch</loc></url>
</urlset>`;
  assert.deepEqual(parseSitemapLocs(xml), ['/', '/learning', '/vocabulary/orderbuch']);
});

test('expectedIndexPaths returns only INDEX static and public vocabulary paths', () => {
  const paths = expectedIndexPaths();
  assert.ok(paths.includes('/'));
  assert.ok(paths.includes('/learning'));
  assert.ok(!paths.includes('/login'));
  assert.ok(!paths.includes('/api/healthz'));
  assert.ok(paths.every(p => p.startsWith('/') || p === '/'));
});

test('runCrawlabilityGate fails closed on sitemap extras and missing robots', async () => {
  const expected = expectedIndexPaths();
  const goodXml = '<?xml version="1.0"?><urlset>' +
    expected.map(p => `<url><loc>https://capital-ai.online${p}</loc></url>`).join('') +
    '</urlset>';

  let call = 0;
  const fetchImpl = async (url) => {
    call += 1;
    if (url.endsWith('/robots.txt')) {
      return new Response('User-agent: *\nAllow: /\nSitemap: https://capital-ai.online/sitemap.xml\n', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      });
    }
    if (url.endsWith('/sitemap.xml')) {
      return new Response(goodXml, { status: 200, headers: { 'content-type': 'application/xml' } });
    }
    // spot checks
    return new Response('<html><head></head><body><h1>ok</h1></body></html>', {
      status: 200,
      headers: { 'content-type': 'text/html', 'x-robots-tag': 'index, follow' },
    });
  };

  const report = await runCrawlabilityGate({ origin: 'https://capital-ai.online', fetchImpl });
  assert.equal(report.status, 'PASS', JSON.stringify(report.checks.filter(c => c.status === 'FAIL')));
  assert.ok(report.sitemapUrlCount > 0);
  assert.equal(report.failedCount, 0);
});

test('runCrawlabilityGate detects private path in sitemap', async () => {
  const xml = `<?xml version="1.0"?><urlset>
    <url><loc>https://capital-ai.online/</loc></url>
    <url><loc>https://capital-ai.online/login</loc></url>
  </urlset>`;
  const fetchImpl = async (url) => {
    if (url.endsWith('/robots.txt')) {
      return new Response('User-agent: *\nSitemap: https://capital-ai.online/sitemap.xml\n', { status: 200 });
    }
    if (url.endsWith('/sitemap.xml')) {
      return new Response(xml, { status: 200, headers: { 'content-type': 'application/xml' } });
    }
    return new Response('ok', { status: 200 });
  };
  const report = await runCrawlabilityGate({ origin: 'https://capital-ai.online', fetchImpl });
  assert.equal(report.status, 'FAIL');
  assert.ok(report.checks.some(c => c.check === 'SITEMAP_ONLY_INDEX_ROUTES' && c.status === 'FAIL'));
  assert.ok(report.checks.some(c => c.check === 'SITEMAP_NO_PRIVATE_OR_API' && c.status === 'FAIL'));
});
