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
      const snapshot = `<main id="capital-ai-public-snapshot" lang="de"><h1>${article.title}</h1><p>${article.intro}</p><figure><img src="${article.image}" alt="${article.imageAlt}"></figure>`
        + article.sections.map(section => `<section><h2>${section.title}</h2><p>${section.body}</p></section>`).join('')
        + article.sources.map(source => `<a href="${source.url}">${source.label}</a>`).join('')
        + '<a href="/learning">Learning</a></main>';
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
    'X_ARTICLE_DESCRIPTION', 'X_ARTICLE_BLOGPOSTING', 'X_ARTICLE_FALLBACK',
    'X_ARTICLE_IMAGE_ALT', 'X_ARTICLE_SOURCES_AND_CTA', 'X_ARTICLE_NO_INTERNAL_LEAK',
    'X_ARTICLE_SVG',
  ]) assert.ok(checks.some(item => item.check === name && item.status === 'PASS'), name);
});

test('X-API live-readback rejects absent article data, metadata drift, leaked internals and missing SVG', async () => {
  const variants = [
    ['missing-intro', body => body.replace(X_ARTICLE.intro, '')],
    ['missing-alt', body => body.replace(X_ARTICLE.imageAlt, '')],
    ['stale-date', body => body.replace(X_ARTICLE.date, '2025-01-01')],
    ['bad-description', body => body.replace(SEO_CONTENT_MANIFEST.find(entry => entry.path === X_ARTICLE.path).description, 'not-the-description')],
    ['missing-source', body => body.replace(X_ARTICLE.sources[0].url, 'https://example.com/not-source')],
    ['missing-cta', body => body.replace('<a href="/learning">Learning</a>', '')],
    ['internal-leak', body => body + ' SOCIAL_X_TOKEN_ENCRYPTION_KEY'],
  ];
  for (const [name, mutate] of variants) {
    const report = await productionReadback({ fetchImpl: async (url, options) => {
      const response = fixture(url, options);
      if (new URL(url).pathname !== X_ARTICLE.path) return response;
      return new Response(mutate(await response.text()), { headers: { 'content-type': 'text/html' } });
    } });
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
