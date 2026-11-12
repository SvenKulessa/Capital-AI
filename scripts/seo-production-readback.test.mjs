import test from 'node:test';
import assert from 'node:assert/strict';
import { productionReadback } from './seo-production-readback.mjs';
import { SEO_CONTENT_MANIFEST } from '../shared/seo-content-manifest.mjs';
import { blogArticleForPath } from '../shared/blog-articles.mjs';

const X_ARTICLE = blogArticleForPath('/blog/x-api-expansions-kosten');

function fixture(url, options) {
  assert.equal(options.method, 'GET');
  assert.equal(options.redirect, 'manual');
  assert.equal(options.headers.Authorization, undefined);
  const path = new URL(url).pathname;
  const entry = SEO_CONTENT_MANIFEST.find(item => item.path === path);
  let body;
  if (entry) {
    body = `<link rel="canonical" href="${entry.canonical}"><meta name="robots" content="index, follow"><div id="root"><main><h1>Content</h1></main></div><script type="application/ld+json">{"@type":"WebPage"}</script>`;
    if (path === X_ARTICLE.path) {
      const article = X_ARTICLE;
      const snapshot = '<a href="#capital-ai-public-snapshot" class="sr-only focus:not-sr-only">Zum Hauptinhalt springen</a>' + `<main id="capital-ai-public-snapshot" lang="de"><h1>${article.title}</h1><time datetime="${article.date}">${article.date}</time><p>${article.intro}</p><figure><img src="${article.image}" alt="${article.imageAlt}"></figure>`
        + article.sections.map(section => `<section><h2>${section.title}</h2><p>${section.body}</p></section>`).join('')
        + article.sources.map(source => `<a href="${source.url}">${source.label}</a>`).join('')
        + '<a href="/learning/lernimpulse">Weitere Lernimpulse entdecken</a></main>';
      body = body.replace('<main><h1>Content</h1></main>', snapshot)
        .replace('{"@type":"WebPage"}', JSON.stringify({ '@graph': [{ '@type': 'BlogPosting',
          headline: article.title, datePublished: article.date, url: entry.canonical }] }));
      body += `<meta name="description" content="${entry.description}">`;
    }
  }
  else if (path === X_ARTICLE.image) return new Response(
    '<svg xmlns="http://www.w3.org/2000/svg"><title>Originalillustration</title></svg>',
    { headers: { 'content-type': 'image/svg+xml' } });
  else if (path === '/robots.txt') body = 'Sitemap: https://capital-ai.online/sitemap.xml';
  else if (path === '/sitemap.xml') body = '<urlset>' + SEO_CONTENT_MANIFEST.map(item => `<url><loc>${item.canonical}</loc></url>`).join('') + '</urlset>';
  else if (path === '/login') return new Response('<meta name="robots" content="noindex, nofollow">', { headers: { 'x-robots-tag': 'noindex, nofollow' } });
  else if (path === '/marketscreener/dokumentation') return new Response(
    '<html><head><title>Screener-Blueprint · Vorschau</title></head><body><div id="root"><main id="capital-ai-blueprint-preview" lang="de"><h1>Screener-Blueprint · Vorschau</h1><h2>Synthetisches Beispiel</h2><a href="/pricing">Bestehende Angebote vergleichen</a></main></div></body></html>',
    { headers: { 'content-type': 'text/html', 'x-robots-tag': 'noindex, nofollow' } });
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


test('standalone legal HTML is crawlable with default index semantics, but explicit bans and empty shells fail', async () => {
  for (const variant of ['valid','noindex','none','empty']) {
    const report = await productionReadback({fetchImpl: async (url, options) => {
      const response = fixture(url, options);
      if (!['/impressum','/datenschutz','/agb'].includes(new URL(url).pathname)) return response;
      let body = (await response.text()).replace('<meta name="robots" content="index, follow">','')
        .replace('<div id="root">','').replace('</div>','');
      if (variant === 'noindex') body += "<meta content='noindex' name='googlebot'>";
      if (variant === 'none') body += '<meta name="robots" content="none">';
      if (variant === 'empty') body = body.replace('<main><h1>Content</h1></main>','<div id="root"></div>');
      return new Response(body,{headers:{'content-type':'text/html'}});
    }});
    assert.equal(report.seoStatus, variant === 'valid' ? 'PASS' : 'FAIL', variant);
  }
});

test('X-API article live-readback binds complete fallback, SEO, source links and SVG', async () => {
  const report = await productionReadback({ fetchImpl: fixture });
  const checks = report.checks.filter(item => item.path === X_ARTICLE.path || item.path === X_ARTICLE.image);
  for (const name of [
    'X_ARTICLE_DESCRIPTION', 'X_ARTICLE_BLOGPOSTING', 'X_ARTICLE_FALLBACK', 'X_ARTICLE_SKIP_LINK',
    'X_ARTICLE_IMAGE_ALT', 'X_ARTICLE_SOURCES_AND_CTA', 'X_ARTICLE_NO_INTERNAL_LEAK',
    'X_ARTICLE_SVG',
  ]) assert.ok(checks.some(item => item.check === name && item.status === 'PASS'), name);
});

test('X-API live-readback rejects absent article data, metadata drift, leaked internals and missing SVG', async () => {
  const variants = [
    ['missing-intro', body => body.replace(X_ARTICLE.intro, '')],
    ['missing-skip-link', body => body.replace('href="#capital-ai-public-snapshot"', 'href="#missing-target"')],
    ['missing-alt', body => body.replace(X_ARTICLE.imageAlt, '')],
    ['stale-date', body => body.replace(X_ARTICLE.date, '2025-01-01')],
    ['bad-description', body => {
      const description = SEO_CONTENT_MANIFEST.find(entry => entry.path === X_ARTICLE.path).description;
      const expectedTag = `<meta name="description" content="${description}">`;
      assert.ok(body.includes(expectedTag), 'fixture must contain exact description meta tag');
      return body.replace(expectedTag, '<meta name="description" content="not-the-description">');
    }],
    ['missing-source', body => body.replace(X_ARTICLE.sources[0].url, 'https://example.com/not-source')],
    ['missing-cta', body => body.replace('<a href="/learning/lernimpulse">Weitere Lernimpulse entdecken</a>', '')],
    ['internal-leak', body => body + ' SOCIAL_X_TOKEN_ENCRYPTION_KEY'],
  ];
  for (const [name, mutate] of variants) {
    let mutationApplied = false;
    const report = await productionReadback({ fetchImpl: async (url, options) => {
      const response = fixture(url, options);
      if (new URL(url).pathname !== X_ARTICLE.path) return response;
      const original = await response.text();
      const changed = mutate(original);
      mutationApplied = changed !== original;
      return new Response(changed, { headers: { 'content-type': 'text/html' } });
    } });
    // Inspect outside productionReadback: its bounded GET intentionally catches
    // fetch errors and would otherwise turn a broken fixture into a false PASS.
    assert.ok(mutationApplied, `fixture mutation must change HTML: ${name}`);
    assert.equal(report.seoStatus, 'FAIL', name);
    assert.ok(report.checks.some(item => item.path === X_ARTICLE.path && item.status === 'FAIL'), name);
  }
  const missingImage = await productionReadback({ fetchImpl: (url, options) =>
    new URL(url).pathname === X_ARTICLE.image
      ? new Response('not found', { status: 404 }) : fixture(url, options) });
  assert.equal(missingImage.seoStatus, 'FAIL');
  assert.ok(missingImage.checks.some(item => item.path === X_ARTICLE.image
    && item.check === 'HTTP_200_NO_REDIRECT' && item.status === 'FAIL'));
});


test('public health readback verifies Render runtime SHA independently of unbound build identity', async () => {
  const liveSha = '60ac07207a0d0cb40695ec065ed2cc4a89c81ae0';
  const fetchImpl = (url, options) => new URL(url).pathname === '/healthz'
    ? new Response(JSON.stringify({ status: 'ok',
        buildIdentity: { bound: false, sourceSha: null },
        runtimeIdentity: { sourceSha: liveSha, evidence: 'RENDER_DEPLOYMENT_ENVIRONMENT' },
      }), { headers: { 'content-type': 'application/json' } })
    : fixture(url, options);
  const report = await productionReadback({ fetchImpl });
  assert.equal(report.healthReadback.httpStatus, 200);
  assert.equal(report.healthReadback.status, 'ok');
  assert.equal(report.healthReadback.buildIdentityBound, false);
  assert.deepEqual(report.runtimeIdentity, { status: 'RUNTIME_VERIFIED',
    sourceSha: liveSha, evidence: 'RENDER_DEPLOYMENT_ENVIRONMENT' });
  assert.equal(report.seoStatus, 'PASS');
});

test('untrusted runtime provenance, invalid SHA and build-only evidence fail closed', async () => {
  const liveSha = 'a'.repeat(40);
  const scenarios = [
    { status: 'ok', runtimeIdentity: { sourceSha: liveSha, evidence: 'UNTRUSTED' } },
    { status: 'ok', runtimeIdentity: { sourceSha: 'short', evidence: 'RENDER_DEPLOYMENT_ENVIRONMENT' } },
    { status: 'down', runtimeIdentity: { sourceSha: liveSha, evidence: 'RENDER_DEPLOYMENT_ENVIRONMENT' } },
    { status: 'ok', buildIdentity: { bound: true, sourceSha: liveSha } },
  ];
  for (const health of scenarios) {
    const report = await productionReadback({ fetchImpl: (url, options) =>
      new URL(url).pathname === '/healthz'
        ? new Response(JSON.stringify(health))
        : fixture(url, options) });
    assert.equal(report.runtimeIdentity.status, 'NOT_PROVEN');
    assert.equal(report.runtimeIdentity.sourceSha, null);
    assert.equal(report.healthReadback.httpStatus, 200);
    if (health.status !== 'ok') assert.equal(report.seoStatus, 'FAIL');
  }
});

test('health HTTP redirects do not masquerade as a verified runtime', async () => {
  const report = await productionReadback({ fetchImpl: (url, options) =>
    new URL(url).pathname === '/healthz'
      ? new Response(null, { status: 302, headers: { location: 'https://example.invalid' } })
      : fixture(url, options) });
  assert.equal(report.healthReadback.httpStatus, 302);
  assert.equal(report.healthReadback.status, 'NOT_PROVEN');
  assert.equal(report.runtimeIdentity.status, 'NOT_PROVEN');
  assert.equal(report.seoStatus, 'FAIL');
});

test('raw server Blueprint HTML is accessible without JavaScript, noindexed and has safe pricing CTA', async () => {
  const report = await productionReadback({ fetchImpl: fixture });
  const checks = report.checks.filter(item => item.path === '/marketscreener/dokumentation');
  assert.deepEqual(checks.map(item => item.check), [
    'HTTP_200_NO_REDIRECT', 'BLUEPRINT_NOJS_SERVER_HTML',
    'BLUEPRINT_NOINDEX', 'BLUEPRINT_NO_INTERNAL_LEAK',
  ]);
  assert.ok(checks.every(item => item.status === 'PASS'));
  assert.equal(report.seoStatus, 'PASS');
});

test('raw Blueprint server contract fails closed on absent preview, CTA, noindex, redirects and leaked billing internals', async () => {
  const path = '/marketscreener/dokumentation';
  const variants = [
    ['missing-root', s => s.replace('capital-ai-blueprint-preview', 'missing-blueprint-root')],
    ['missing-example', s => s.replace('Synthetisches Beispiel', 'Beispiel fehlt')],
    ['missing-cta', s => s.replace('href="/pricing"', 'href="/missing-pricing"')],
    ['bootstrap-error', () => 'Die Anwendung konnte nicht gestartet werden'],
    ['internal-billing', s => s + '/api/billing'],
  ];
  for (const [name, modify] of variants) {
    const report = await productionReadback({ fetchImpl: async (url, options) => {
      if (new URL(url).pathname !== path) return fixture(url, options);
      const response = fixture(url, options);
      return new Response(modify(await response.text()), { headers: response.headers });
    } });
    assert.equal(report.seoStatus, 'FAIL', name);
    assert.ok(report.checks.some(item => item.path === path && item.status === 'FAIL'), name);
    assert.equal(JSON.stringify(report).includes('Die Anwendung konnte nicht gestartet werden'), false);
  }
  const noindex = await productionReadback({ fetchImpl: (url, options) => {
    if (new URL(url).pathname !== path) return fixture(url, options);
    return new Response('<main id="capital-ai-blueprint-preview" lang="de"><h2>Synthetisches Beispiel</h2><a href="/pricing">Bestehende Angebote vergleichen</a></main>', { headers: { 'content-type': 'text/html' } });
  } });
  assert.equal(noindex.seoStatus, 'FAIL');
  assert.ok(noindex.checks.some(item => item.check === 'BLUEPRINT_NOINDEX' && item.status === 'FAIL'));
  const redirect = await productionReadback({ fetchImpl: (url, options) =>
    new URL(url).pathname === path
      ? new Response(null, { status: 302, headers: { location: 'https://example.invalid' } })
      : fixture(url, options) });
  assert.equal(redirect.seoStatus, 'FAIL');
  assert.ok(redirect.checks.some(item => item.path === path
    && item.check === 'HTTP_200_NO_REDIRECT' && item.status === 'FAIL'));
});
