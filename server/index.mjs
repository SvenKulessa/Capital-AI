import http from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assetValues, quote, health, startStreams } from './market.mjs';
import { createAuth } from './auth.mjs';
import { createUserProviderVault } from './user-provider-vault.mjs';
import { createPrivateProviderQuery } from './private-provider-query.mjs';
import { createUniswapTrading } from './uniswap-trading.mjs';
import { createKrakenOrderDryRun } from './kraken-order-dry-run.mjs';
import { createTelegram } from './telegram.mjs';
import { createPrivacy } from './privacy.mjs';
import { createLimiter } from './http-security.mjs';
import { infrastructure } from './infrastructure.mjs';
import { createMobileScorer } from './mobile-scorer.mjs';
import { createScorerProxy } from './scorer-proxy.mjs';
import { serveMtaSts } from './mta-sts.mjs';
import { serveWellKnown } from './well-known.mjs';
import { researchMetadata } from '../shared/research-metadata.mjs';
import { seoMetadataForPath } from '../shared/seo-metadata.mjs';
import {
  isSeoIndexable,
  robotsDirectiveFor,
  seoIndexableStaticPaths,
} from '../shared/seo-indexing-policy.mjs';
import { BILLING_CATALOG } from './billing-catalog.mjs';
import { createVocabularyCheckout } from './vocabulary-checkout.mjs';
import { createSubscriptionCheckout } from './subscription-checkout.mjs';
import { createBenchmarkRuns } from './benchmark-runs.mjs';
import { createCadsCommerce } from './cads-commerce.mjs';
import { createCadsMarketplace } from './cads-marketplace.mjs';
import { createBenchmarkStore } from './benchmark-store.mjs';
import { isBlockedPublicArtifactPath } from './public-artifact-policy.mjs';
import { QUANT_PRO_IDS } from './vocabulary-quant-pro-index.mjs';
import {
  vocabularyMetadata,
  vocabularyMetadataByPath,
  vocabularyTitle,
  vocabularyDescription,
} from '../shared/vocabulary-metadata.mjs';
import { beginRequest, finishRequest, metricsAuthorized, renderPrometheusMetrics, writeAuditEvent } from './observability.mjs';
import { cadsSnapshot } from './cads-observability.mjs';

const moduleRoot = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(moduleRoot, '../dist');
const embeddedSourceSha = '__CAPITAL_AI_SOURCE_SHA_UNBOUND__';
const embeddedBuilder = '__CAPITAL_AI_BUILDER_UNBOUND__';
const buildIdentity =
  /^[0-9a-f]{40}$/.test(embeddedSourceSha) &&
  embeddedBuilder === 'SvenKulessa/Capital-AI/.github/workflows/build-security.yml'
    ? { bound: true, sourceSha: embeddedSourceSha, builder: embeddedBuilder }
    : { bound: false, sourceSha: null };
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const headers = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Strict-Transport-Security': 'max-age=31536000', 'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" };
const publicVocabularyEntries = vocabularyMetadata.filter(entry => !QUANT_PRO_IDS.has(entry.id));
const publicVocabularyCount = publicVocabularyEntries.length;
const publicVocabularyMetadata = {
  '/learning': {
    title: 'Capital-AI | Learning Portal & Fachbegriffe',
    description: `Learning Portal von Capital-AI mit ${publicVocabularyCount} konsolidierten Fachbegriffen aus Marktanalyse, Scoring, Daten, Plattform, Security, Produkt, Governance und Mobile Runtime.`,
  },
  '/vocabulary': {
    title: `Capital-AI Vocabulary | ${publicVocabularyCount} Fachbegriffe & Thesaurus`,
    description: `${publicVocabularyCount} konsolidierte Capital-AI Fachbegriffe mit Definitionen und jeweils drei Thesaurus-Begriffen aus Marktanalyse, Scoring, Daten, Plattform, Security, Produkt, Governance und Mobile Runtime.`,
  },
};
function escapeHtml(text) {
  return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
function escapeXml(text) {
  return escapeHtml(text).replaceAll("'", '&apos;');
}
const OWNER_ONLY_UI_PATHS = new Set(['/control-center', '/control', '/admin', '/roadmap', '/cost-center']);

function normalizedPublicPath(pathname) {
  return pathname.toLowerCase().replace(/\/+$/, '') || '/';
}
const SEO_JSONLD_OPEN = '<script id="capital-ai-seo-jsonld" type="application/ld+json">';
const SEO_JSONLD_CLOSE = '</script>';

function removeSeoJsonLd(html) {
  const start = html.indexOf(SEO_JSONLD_OPEN);
  if (start < 0) return html;
  const end = html.indexOf(SEO_JSONLD_CLOSE, start + SEO_JSONLD_OPEN.length);
  if (end < 0) return html;
  return html.slice(0, start) + html.slice(end + SEO_JSONLD_CLOSE.length);
}

function upsertSeoJsonLd(html, jsonLd) {
  const safeJsonLd = JSON.stringify(jsonLd).replaceAll('<', '\\u003c');
  const script = `${SEO_JSONLD_OPEN}${safeJsonLd}${SEO_JSONLD_CLOSE}`;
  const start = html.indexOf(SEO_JSONLD_OPEN);

  if (start >= 0) {
    const end = html.indexOf(SEO_JSONLD_CLOSE, start + SEO_JSONLD_OPEN.length);
    if (end >= 0) {
      return html.slice(0, start) + script + html.slice(end + SEO_JSONLD_CLOSE.length);
    }
  }
  return html.replace('</head>', `${script}\n  </head>`);
}

function injectSeoMetadata(html, pathname) {
  const metadata = seoMetadataForPath(pathname);
  if (!metadata) return html;

  let body = html
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(metadata.title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(metadata.description)}$2`)
    .replace(/(<meta name="robots" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(metadata.robots)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*("\s*\/?>)/, `$1${escapeHtml(metadata.canonical)}$2`)
    .replace(/(<meta property="og:type" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(metadata.ogType)}$2`)
    .replace(/(<meta property="og:site_name" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(metadata.ogSiteName)}$2`)
    .replace(/(<meta property="og:locale" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(metadata.ogLocale)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(metadata.title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(metadata.description)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(metadata.canonical)}$2`)
    .replace(/(<meta property="og:image" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(metadata.ogImage)}$2`)
    .replace(/(<meta property="og:image:alt" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(metadata.ogImageAlt)}$2`)
    .replace(/(<meta name="twitter:card" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(metadata.twitterCard)}$2`)
    .replace(/(<meta name="twitter:site" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(metadata.twitterSite)}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(metadata.title)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(metadata.description)}$2`)
    .replace(/(<meta name="twitter:image" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(metadata.ogImage)}$2`)
    .replace(/(<meta name="twitter:image:alt" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(metadata.ogImageAlt)}$2`);

  body = upsertSeoJsonLd(body, metadata.jsonLd);
  return body;
}

function applySeoIndexingPolicy(html, pathname) {
  const directive = robotsDirectiveFor(pathname);
  let body = html.replace(
    /(<meta name="robots" content=")[^"]*("\s*\/?>)/,
    `$1${directive}$2`,
  );

  if (!isSeoIndexable(pathname)) {
    body = body
      .replace(/\s*<link rel="canonical" href="[^"]*"\s*\/?>/g, '')
      .replace(/\s*<meta property="og:url" content="[^"]*"\s*\/?>/g, '');
    body = removeSeoJsonLd(body);
  }
  return body;
}
function vocabularyFallback(entry) {
  const thesaurus = entry.thesaurus.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  return `<main><article><p><a href="/vocabulary">Capital-AI Vocabulary</a></p><h1>${escapeHtml(entry.term)}</h1><p>${escapeHtml(entry.description)}</p><p>Kategorie: ${escapeHtml(entry.category)}</p><h2>Thesaurus</h2><ul>${thesaurus}</ul></article></main>`;
}
function vocabularyLandingFallback() {
  const links = publicVocabularyEntries
    .map(entry => `<li><a href="${entry.path}">${escapeHtml(entry.term)}</a> – ${escapeHtml(entry.category)}</li>`)
    .join('');
  return `<main><article><h1>Capital-AI Vocabulary</h1><p>${publicVocabularyCount} konsolidierte Fachbegriffe mit Definitionen und jeweils drei Thesaurus-Begriffen.</p><ul>${links}</ul></article></main>`;
}
function injectVocabularySeo(html, pathname) {
  const candidateEntry = vocabularyMetadataByPath.get(pathname);
  const entry = candidateEntry && !QUANT_PRO_IDS.has(candidateEntry.id) ? candidateEntry : null;
  const landing = publicVocabularyMetadata[pathname];
  if (!entry && !landing) return html;

  const title = entry ? vocabularyTitle(entry) : landing.title;
  const description = entry ? vocabularyDescription(entry) : landing.description;
  const canonicalPath = entry ? entry.path : pathname;
  const canonicalUrl = `https://capital-ai.online${canonicalPath}`;
  let body = html
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(description)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(description)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*("\s*\/?>)/, `$1${canonicalUrl}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(title)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(description)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*("\s*\/?>)/, `$1${canonicalUrl}$2`);

  const fallback = entry
    ? vocabularyFallback(entry)
    : pathname === '/vocabulary'
      ? vocabularyLandingFallback()
      : `<main><article><h1>Capital-AI Learning Portal</h1><p>${escapeHtml(description)}</p><p><a href="/vocabulary">Zum Vocabulary mit ${publicVocabularyCount} Fachbegriffen</a></p></article></main>`;
  body = body.replace(
    '<div id="root"></div>',
    `<div id="root">${fallback}</div>`,
  );
  return body;
}
function json(res, status, body) { res.writeHead(status, { ...headers, 'X-Robots-Tag': 'noindex, nofollow', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); }

export function createApp(root = defaultRoot, options = {}) {
  let inflight = 0;
  const auth = createAuth(options);
  const userProviderVault = createUserProviderVault({ ...options, auth });
  const privateProviderQuery = createPrivateProviderQuery({ env: options.env || process.env, auth, vault: userProviderVault });
  if ((options.env || process.env).PRIVATE_PROVIDER_BRIDGE_ENABLED === 'true') {
    void privateProviderQuery.start().catch(() => {});
  }
  const krakenOrderDryRun = createKrakenOrderDryRun({
    env: options.env || process.env,
    fetchImpl: options.fetchImpl || fetch,
    auth,
    vault: userProviderVault,
    audit: writeAuditEvent,
  });
  const uniswapTrading = createUniswapTrading({ env: options.env || process.env, fetchImpl: options.fetchImpl || fetch, auth });
  const telegram = createTelegram({ ...options, auth });
  const privacy = createPrivacy({ ...options, auth });
  const marketLimit = createLimiter(120);
  const runtimeEnv = options.env || process.env;
  const mobileScorer = createMobileScorer(runtimeEnv);
  const scorerProxy = createScorerProxy({ env: runtimeEnv, fetchImpl: options.fetchImpl || fetch, sourcePolicy: options.sourcePolicy });
  const vocabularyCheckout = createVocabularyCheckout({ env: runtimeEnv, fetchImpl: options.fetchImpl || fetch, auth });
  const subscriptionCheckout = createSubscriptionCheckout({ env: runtimeEnv, fetchImpl: options.fetchImpl || fetch, auth });
  const benchmarkStore = options.benchmarkStore ?? createBenchmarkStore({ env: runtimeEnv, fetchImpl: options.fetchImpl || fetch });
  const benchmarkRuns = createBenchmarkRuns({ env: runtimeEnv, auth, store: benchmarkStore });
  const cadsMarketplace = createCadsMarketplace({ env: runtimeEnv, fetchImpl: options.fetchImpl || fetch, audit: writeAuditEvent });
  cadsMarketplace.start();
  const cadsCommerce = createCadsCommerce({ auth, env: runtimeEnv });
  const server = http.createServer({ maxHeaderSize: 8192, requestTimeout: 10000, headersTimeout: 10000, keepAliveTimeout: 5000 }, async (req, res) => {
  let url;
  const requestContext = beginRequest(req);
  res.setHeader('x-request-id', requestContext.requestId);
  if ((req.url?.length || 0) > 2048) return json(res, 414, { error: 'uri_too_long' });
  try { url = new URL(req.url, 'http://localhost'); } catch { return json(res, 400, { error: 'bad_request' }); }
  res.once('finish', () => finishRequest(req, res, requestContext, url.pathname));
  if (!isSeoIndexable(normalizedPublicPath(url.pathname))) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }
  // Apply headers to API responses and OIDC redirects alike.
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  if (serveMtaSts(req, res, url)) return;
  if (serveWellKnown(req, res, url)) return;
  if (await auth.handle(req, res, url, json)) return;
  if (await userProviderVault.handle(req, res, url, json)) return;
  if (await privateProviderQuery.handle(req, res, url, json, requestContext.requestId)) return;
  if (await krakenOrderDryRun.handle(req, res, url, json, requestContext.requestId)) return;
  if (await uniswapTrading.handle(req, res, url, json)) return;
  if (await privacy(req, res, url, json)) return;
  if (await telegram(req, res, url, json)) return;
  if (await vocabularyCheckout.handle(req, res, url, json)) return;
  if (await subscriptionCheckout.handle(req, res, url, json)) return;
  if (await benchmarkRuns.handle(req, res, url, json)) return;
  if (await cadsMarketplace.handle(req, res, url, json)) return;
  if (await cadsCommerce.handle(req, res, url, json)) return;
  if (url.pathname === '/api/mobile/enterprise-score' || url.pathname === '/api/mobile/scorer/events') {
    const mobileIdentity = await auth.verify(req, res);
    if (!mobileIdentity) return json(res, 401, { error: 'authentication_required' });
  }
  if (await scorerProxy.handle(req, res, url, json, requestContext.requestId)) return;
  if (await mobileScorer.handle(req, res, url, json, headers)) return;
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return json(res, 405, { error: 'method_not_allowed' }); }
  if (url.pathname === '/healthz') return json(res, 200, { ...health(), buildIdentity });
  if (url.pathname === '/metrics') {
    if (!metricsAuthorized(req)) {
      writeAuditEvent({ eventType: 'observability.metrics.denied', requestId: requestContext.requestId, result: 'DENIED' });
      return json(res, 404, { error: 'not_found' });
    }
    res.writeHead(200, { ...headers, 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(renderPrometheusMetrics());
  }
  if (url.pathname === '/api/internal/cads') {
    if (!metricsAuthorized(req)) {
      writeAuditEvent({ eventType: 'observability.cads.denied', requestId: requestContext.requestId, result: 'DENIED' });
      return json(res, 404, { error: 'not_found' });
    }
    return json(res, 200, {
      schema: 'CAPITAL_AI_CADS_SNAPSHOT@1',
      sourceSha: process.env.RENDER_GIT_COMMIT || null,
      infrastructure: infrastructure.status(),
      operations: cadsSnapshot(),
    });
  }
  if (url.pathname === '/api/market/quote') {
    if (!marketLimit()) { res.setHeader('Retry-After', '60'); return json(res, 429, { error: 'rate_limited' }); }
    if (inflight >= 8) { res.setHeader('Retry-After', '5'); return json(res, 429, { error: 'busy' }); }
    inflight++;
    try { const [status, body] = await quote(url.searchParams.get('symbol') || ''); return json(res, status, body); }
    catch { return json(res, 503, { error: 'market_data_unavailable' }); }
    finally { inflight--; }
  }
  if (url.pathname === '/api/market/values') {
    if (!marketLimit()) return json(res, 429, { error: 'rate_limited' });
    const [status, body] = await assetValues();
    return json(res, status, body);
  }
  if (url.pathname === '/api/market/status') return json(res, 200, health());
  if (url.pathname === '/api/billing/catalog') return json(res, 200, BILLING_CATALOG);
  if (url.pathname === '/api/market/evidence') {
    if (!marketLimit()) return json(res, 429, { error: 'rate_limited' });
    if (inflight >= 8) return json(res, 429, { error: 'busy' });
    inflight++;
    try { const record = await infrastructure.replay(url.searchParams.get('id') || '');
      return json(res, 200, { evidenceId: url.searchParams.get('id'), fact: record.fact, hashVerified: true }); }
    catch { return json(res, 503, { error: 'evidence_unavailable' }); }
    finally { inflight--; }
  }
  if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'not_found' });

  const publicPath = normalizedPublicPath(url.pathname);
  if (OWNER_ONLY_UI_PATHS.has(publicPath)) {
    const ownerAllowed = await auth.authorizeIamRole(req, res, 'owner');
    if (!ownerAllowed) {
      res.writeHead(404, { ...headers, 'Cache-Control': 'no-store' });
      res.end();
      return;
    }
  }
  if (publicPath === '/robots.txt') {
    res.writeHead(200, { ...headers, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
    return res.end('User-agent: *\nAllow: /\nSitemap: https://capital-ai.online/sitemap.xml\n');
  }
  if (publicPath === '/sitemap.xml') {
    const paths = [...new Set([...seoIndexableStaticPaths(), ...publicVocabularyEntries.map(entry => entry.path)])];
    const xml = '<?xml version="1.0" encoding="UTF-8"?>' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      paths.map(route => `<url><loc>https://capital-ai.online${escapeXml(route)}</loc></url>`).join('') +
      '</urlset>';
    res.writeHead(200, { ...headers, 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
    return res.end(xml);
  }
  if (isBlockedPublicArtifactPath(publicPath)) {
    res.writeHead(404, { ...headers, 'Cache-Control': 'no-store' });
    res.end();
    return;
  }
  if (publicPath.startsWith('/vocabulary/')) {
    const vocabularyEntry = vocabularyMetadataByPath.get(publicPath);
    if (!vocabularyEntry || QUANT_PRO_IDS.has(vocabularyEntry.id)) {
      res.writeHead(404, { ...headers, 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' });
      return res.end();
    }
  }

  let asset;
  try { asset = path.resolve(root, '.' + decodeURIComponent(url.pathname)); } catch { return json(res, 400, { error: 'bad_request' }); }
  if (!asset.startsWith(root + path.sep) && asset !== root) return json(res, 400, { error: 'bad_path' });
  if (path.relative(root, asset).split(path.sep).some(part => part.startsWith('.'))) return json(res, 404, { error: 'not_found' });
  try {
    const file = await stat(asset).then(s => s.isFile() ? asset : path.join(root, 'index.html')).catch(() =>
      path.extname(asset) || url.pathname.startsWith('/api/') ? asset : path.join(root, 'index.html'));
    const resolved = await realpath(file);
    if (!resolved.startsWith(root + path.sep) || (await stat(resolved)).size > 20 * 1024 * 1024) return json(res, 404, { error: 'not_found' });
    let body = await readFile(resolved);
    const publicPath = normalizedPublicPath(url.pathname);
    if (path.extname(file) === '.html') {
      body = Buffer.from(injectVocabularySeo(body.toString('utf8'), publicPath));
    }
    // Research/legal titles are visible to crawlers before client hydration.
    const researchPath = publicPath;
    if (path.extname(file) === '.html' && Object.hasOwn(researchMetadata, researchPath)) {
      const meta = researchMetadata[researchPath];
      body = Buffer.from(body.toString('utf8')
        .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(meta.title)}</title>`)
        .replace(/(<meta name="description" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(meta.description)}$2`)
        .replace(/(<meta property="og:title" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(meta.title)}$2`)
        .replace(/(<meta property="og:description" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(meta.description)}$2`)
        .replace(/(<link rel="canonical" href=")[^"]*("\s*\/?>)/, `$1https://capital-ai.online${researchPath}$2`));
    }
    if (path.extname(file) === '.html') {
      body = Buffer.from(injectSeoMetadata(body.toString('utf8'), publicPath));
      body = Buffer.from(applySeoIndexingPolicy(body.toString('utf8'), publicPath));
    }
    res.writeHead(200, { ...headers, 'Cache-Control': path.extname(file) === '.html' ? 'no-store' : 'public, max-age=3600', 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(body);
  } catch { res.writeHead(404, headers); res.end(); }
});
  server.maxConnections = 256;
  server.once('close', () => { cadsMarketplace.close(); void privateProviderQuery.close(); });
  return server;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createApp();
  await infrastructure.start();
  let unsubscribePubsubProbe = null;
  try { unsubscribePubsubProbe = await infrastructure.subscribeQuotes(() => {}); } catch { /* health remains fail-closed */ }
  const stop = startStreams();
  const reconnect = setInterval(() => { if (infrastructure.status().status !== 'connected') void infrastructure.start(); }, 15000);
  reconnect.unref();
  server.listen(Number(process.env.PORT || 10000), '0.0.0.0');
  const shutdown = () => {
    clearInterval(reconnect); stop(); server.close(() => { void Promise.resolve(unsubscribePubsubProbe?.()).finally(() => infrastructure.close()).finally(() => process.exit(0)); });
    setTimeout(() => { server.closeAllConnections(); process.exit(1); }, 10000).unref();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
