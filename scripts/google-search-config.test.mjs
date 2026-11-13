import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createGoogleMaintenance, GSC_SEARCH_CONFIGURATION_PATHS } from '../server/google-maintenance-api.mjs';
import { SEO_CONTENT_MANIFEST } from '../shared/seo-content-manifest.mjs';
import { SEO_PUBLIC_IMAGE_PATHS } from '../shared/seo-indexing-policy.mjs';
import { runSearchConfiguration, SEARCH_CONFIGURATION } from './google-search-config.mjs';

const origin = 'https://capital-ai.online';
async function fixture({ permission = 'siteOwner', sites, blockedImage = false, badLogo = false, inspectFails = false, alreadyRegistered = false, invalidSitemap = false } = {}) {
  let html;
  try { html = await readFile(new URL('../index.html', import.meta.url), 'utf8'); }
  catch { html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8'); }
  const calls = [];
  let registered = alreadyRegistered;
  const png = Buffer.alloc(24);
  Buffer.from([137,80,78,71,13,10,26,10]).copy(png);
  png.writeUInt32BE(badLogo ? 16 : 512, 16); png.writeUInt32BE(512, 20);
  const fetchImpl = async (input, options) => {
    const url = new URL(input);
    calls.push({ url: url.href, method: options.method, redirect: options.redirect, body: options.body });
    if (url.origin === origin) {
      assert.equal(options.headers?.Authorization, undefined);
      if (url.pathname === '/') return new Response(html, { headers: { 'content-type': 'text/html' } });
      if (url.pathname === '/robots.txt') return new Response('User-agent: *\nAllow: /\nSitemap: ' + SEARCH_CONFIGURATION.sitemap);
      if (url.pathname === '/sitemap.xml') return new Response('<urlset>' + SEO_CONTENT_MANIFEST.map(entry => '<url><loc>' + entry.canonical + '</loc></url>').join('') + (invalidSitemap ? '<url><loc>https://capital-ai.online/profile</loc></url>' : '') + '</urlset>', { headers: { 'content-type': 'application/xml' } });
      assert.ok(SEO_PUBLIC_IMAGE_PATHS.includes(url.pathname));
      return new Response(png, { headers: { 'content-type': 'image/png', ...(blockedImage ? { 'x-robots-tag': 'noindex' } : {}) } });
    }
    assert.equal(options.headers.Authorization, 'Bearer private-token');
    if (url.hostname === 'searchconsole.googleapis.com') {
      if (inspectFails) return new Response('secret-provider-error', { status: 403 });
      const inspection = JSON.parse(options.body);
      assert.equal(inspection.siteUrl, SEARCH_CONFIGURATION.property);
      assert.ok(GSC_SEARCH_CONFIGURATION_PATHS.some(path => origin + path === inspection.inspectionUrl));
      return Response.json({ inspectionResult: { indexStatusResult: { verdict: 'NEUTRAL', indexingState: 'BLOCKED_BY_META_TAG', googleCanonical: 'https://private.example/secret', coverageState: 'private-value' } } });
    }
    assert.equal(url.hostname, 'www.googleapis.com', 'Search-only operation must never call Analytics');
    if (url.pathname === '/webmasters/v3/sites') return Response.json({ siteEntry: sites || [{ siteUrl: SEARCH_CONFIGURATION.property, permissionLevel: permission }] });
    assert.ok(url.pathname.startsWith('/webmasters/v3/sites/sc-domain%3Acapital-ai.online/sitemaps'));
    if (options.method === 'PUT') {
      assert.equal(url.pathname, '/webmasters/v3/sites/sc-domain%3Acapital-ai.online/sitemaps/' + encodeURIComponent(SEARCH_CONFIGURATION.sitemap));
      registered = true;
      return new Response(null, { status: 204 });
    }
    return Response.json({ sitemap: registered ? [{ path: SEARCH_CONFIGURATION.sitemap, errors: '0', isPending: false }] : [] });
  };
  const run = mode => runSearchConfiguration(mode, { fetchImpl, env: { GOOGLE_MAINTENANCE_ACCESS_TOKEN: 'private-token', GOOGLE_MAINTENANCE_GA4_WRITES_ENABLED: 'true', GOOGLE_MAINTENANCE_GSC_WRITES_ENABLED: 'true' } });
  return { run, calls, fetchImpl };
}

test('plan needs no credentials or network and never claims connector/Google logo completion', async () => {
  const result = await runSearchConfiguration('plan', { fetchImpl: () => assert.fail('no network'), env: {} });
  assert.equal(result.status, 'PLAN_ONLY');
  assert.equal(result.readOnly, true);
  assert.equal(result.googleLogoDisplayed, 'NOT_PROVEN');
  assert.equal(result.connectorConnected, 'NOT_PROVEN');
  await assert.rejects(runSearchConfiguration('arbitrary'), /INVALID_MODE/);
});

test('audit overrides ambient write flags, discovers the exact property and reads fixed index snapshots', async () => {
  const f = await fixture(); const result = await f.run('audit');
  assert.equal(result.status, 'AUDIT_COMPLETE');
  assert.equal(result.publicSurface.status, 'PASS');
  assert.equal(result.sitemap.status, 'NOT_REGISTERED');
  assert.equal(result.crawlRequested, false);
  assert.equal(result.inspection.source, 'GOOGLE_INDEX_SNAPSHOT_NOT_LIVE_TEST');
  assert.deepEqual(result.inspection.urls.map(item => item.path), GSC_SEARCH_CONFIGURATION_PATHS);
  assert.deepEqual(result.inspection.urls.map(item => item.expectedIndexing), ['INDEX', 'INDEX', 'NOINDEX', 'NOINDEX']);
  assert.ok(f.calls.every(call => ['GET','POST'].includes(call.method)));
  assert.equal(f.calls.filter(call => call.method === 'POST').length, 4);
  assert.ok(f.calls.every(call => call.redirect === 'error'));
  assert.doesNotMatch(JSON.stringify(result), /private-token|private-value|private\.example/);
});

test('apply submits only the canonical sitemap once and repeated execution is idempotent', async () => {
  const f = await fixture(); const result = await f.run('apply');
  assert.equal(result.submission.status, 'SITEMAP_SUBMISSION_VERIFIED');
  assert.equal(result.submission.indexingGuaranteed, false);
  assert.equal(result.sitemap.status, 'REGISTERED');
  assert.equal(result.readOnly, false);
  await f.run('apply');
  assert.equal(f.calls.filter(call => call.method === 'PUT').length, 1);
  assert.ok(f.calls.every(call => !['DELETE','PATCH'].includes(call.method)));
});

test('an unrelated property cannot be guessed or created', async () => {
  const f = await fixture({ sites: [{ siteUrl: 'https://other.example/', permissionLevel: 'siteOwner' }] });
  const result = await f.run('apply');
  assert.equal(result.status, 'INCOMPLETE');
  assert.equal(result.error, 'GSC_EXPECTED_PROPERTY_NOT_ACCESSIBLE');
  assert.equal(f.calls.filter(call => call.method === 'PUT' || call.method === 'POST').length, 0);
});

test('restricted readers may audit but cannot apply', async () => {
  const f = await fixture({ permission: 'siteRestrictedUser' });
  assert.equal((await f.run('audit')).providerStatus, 'PROVIDER_READ_VERIFIED');
  assert.equal((await f.run('apply')).error, 'GSC_WRITE_PERMISSION_INSUFFICIENT');
  assert.equal(f.calls.filter(call => call.method === 'PUT').length, 0);
});

for (const invalid of [{ blockedImage: true }, { badLogo: true }, { invalidSitemap: true }]) {
  test('invalid public configuration blocks apply: ' + JSON.stringify(invalid), async () => {
    const f = await fixture(invalid); const result = await f.run('apply');
    assert.equal(result.publicSurface.status, 'FAIL');
    assert.equal(result.error, 'PUBLIC_CONFIGURATION_INVALID');
    assert.equal(f.calls.filter(call => call.method === 'PUT').length, 0);
  });
}

test('inspection failure preserves confirmed submission without claiming indexing or retrying writes', async () => {
  const f = await fixture({ inspectFails: true }); const result = await f.run('apply');
  assert.equal(result.submission.status, 'SITEMAP_SUBMISSION_VERIFIED');
  assert.equal(result.status, 'INCOMPLETE');
  assert.equal(result.error, 'GOOGLE_HTTP_403');
  assert.equal(result.googleLogoDisplayed, 'NOT_PROVEN');
  assert.doesNotMatch(JSON.stringify(result), /secret-provider-error/);
  assert.equal(f.calls.filter(call => call.method === 'PUT').length, 1);
});

test('missing credentials leave public evidence available and no secret-bearing error text', async () => {
  const f = await fixture(); const result = await runSearchConfiguration('audit', { fetchImpl: f.fetchImpl, env: {} });
  assert.equal(result.publicSurface.status, 'PASS');
  assert.equal(result.error, 'GOOGLE_IDENTITY_NOT_CONFIGURED');
  assert.equal(result.providerStatus, 'NOT_PROVEN');
});

test('new API operations reject arbitrary URLs and disclose only the exact property', async () => {
  const api = createGoogleMaintenance({ env: {} });
  for (const name of ['gsc_get_expected_site','gsc_inspect_search_configuration']) {
    await assert.rejects(api.call(name, { url: 'https://other.example/' }), /UNSUPPORTED_ARGUMENT/);
  }
});

test('CLI rejects extra arguments before network; existing federation workflow isolates Search from GA4 and Render', async () => {
  const child = spawnSync(process.execPath, ['scripts/google-search-config.mjs','apply','unexpected'], { encoding: 'utf8' });
  assert.equal(child.status, 1);
  assert.equal(child.stderr.trim(), 'GOOGLE_SEARCH_CONFIG_INVALID_INVOCATION');
  const workflow = await readFile(new URL('../.github/workflows/google-learning-setup.yml', import.meta.url), 'utf8');
  assert.match(workflow, /options: \[learning, search\]/);
  assert.match(workflow, /inputs\.target != 'search' &&/);
  assert.match(workflow, /if: inputs\.mode == 'apply' && inputs\.target != 'search'/);
  assert.match(workflow, /node scripts\/google-search-config\.mjs "\$MODE"\s+exit/);
});
