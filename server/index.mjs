import http from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { quote, health, startStreams } from './market.mjs';
import { createAuth } from './auth.mjs';
import { createUserProviderVault } from './user-provider-vault.mjs';
import { createTelegram } from './telegram.mjs';
import { createPrivacy } from './privacy.mjs';
import { createLimiter } from './http-security.mjs';
import { infrastructure } from './infrastructure.mjs';
import { createMobileScorer } from './mobile-scorer.mjs';
import { createScorerProxy } from './scorer-proxy.mjs';
import { serveMtaSts } from './mta-sts.mjs';
import { researchMetadata } from '../shared/research-metadata.mjs';
import { BILLING_CATALOG } from './billing-catalog.mjs';
import {
  VOCABULARY_PUBLIC_COUNT,
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
const publicVocabularyMetadata = {
  '/learning': {
    title: 'Capital-AI | Learning Portal & Fachbegriffe',
    description: `Learning Portal von Capital-AI mit ${VOCABULARY_PUBLIC_COUNT} konsolidierten Fachbegriffen aus Marktanalyse, Scoring, Daten, Plattform, Security, Produkt, Governance und Mobile Runtime.`,
  },
  '/vocabulary': {
    title: `Capital-AI Vocabulary | ${VOCABULARY_PUBLIC_COUNT} Fachbegriffe & Thesaurus`,
    description: `${VOCABULARY_PUBLIC_COUNT} konsolidierte Capital-AI Fachbegriffe mit Definitionen und jeweils drei Thesaurus-Begriffen aus Marktanalyse, Scoring, Daten, Plattform, Security, Produkt, Governance und Mobile Runtime.`,
  },
};
const sitemapBasePaths = [
  '/',
  '/learning',
  '/vocabulary',
  '/faq',
  '/forschung',
  '/lizenz',
  '/datenprovider-lizenzen',
  '/opensource-lizenzen',
  '/impressum',
  '/datenschutz',
  '/agb',
];

function escapeHtml(text) {
  return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
function escapeXml(text) {
  return escapeHtml(text).replaceAll("'", '&apos;');
}
function normalizedPublicPath(pathname) {
  return pathname.toLowerCase().replace(/\/+$/, '') || '/';
}
function vocabularyFallback(entry) {
  const thesaurus = entry.thesaurus.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  return `<main><article><p><a href="/vocabulary">Capital-AI Vocabulary</a></p><h1>${escapeHtml(entry.term)}</h1><p>${escapeHtml(entry.description)}</p><p>Kategorie: ${escapeHtml(entry.category)}</p><h2>Thesaurus</h2><ul>${thesaurus}</ul></article></main>`;
}
function vocabularyLandingFallback() {
  const links = vocabularyMetadata
    .map(entry => `<li><a href="${entry.path}">${escapeHtml(entry.term)}</a> – ${escapeHtml(entry.category)}</li>`)
    .join('');
  return `<main><article><h1>Capital-AI Vocabulary</h1><p>${VOCABULARY_PUBLIC_COUNT} konsolidierte Fachbegriffe mit Definitionen und jeweils drei Thesaurus-Begriffen.</p><ul>${links}</ul></article></main>`;
}
function injectVocabularySeo(html, pathname) {
  const entry = vocabularyMetadataByPath.get(pathname);
  const landing = publicVocabularyMetadata[pathname];
  if (!entry && !landing) return html;

  const title = entry ? vocabularyTitle(entry) : landing.title;
  const description = entry ? vocabularyDescription(entry) : landing.description;
  const canonicalPath = entry ? entry.path : pathname;
  const canonicalUrl = `https://capital-ai.online${canonicalPath}`;
  const schema = entry
    ? {
        '@context': 'https://schema.org',
        '@type': 'DefinedTerm',
        name: entry.term,
        description: entry.description,
        alternateName: entry.thesaurus,
        termCode: entry.id,
        url: canonicalUrl,
        inDefinedTermSet: 'https://capital-ai.online/vocabulary',
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'DefinedTermSet',
        name: pathname === '/vocabulary' ? 'Capital-AI Vocabulary' : 'Capital-AI Learning Portal',
        url: canonicalUrl,
        numberOfItems: VOCABULARY_PUBLIC_COUNT,
      };
  const safeJsonLd = JSON.stringify(schema).replaceAll('<', '\\u003c');
  let body = html
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(description)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(description)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*("\s*\/?>)/, `$1${canonicalUrl}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(title)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(description)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*("\s*\/?>)/, `$1${canonicalUrl}$2`)
    .replace('</head>', `<script type="application/ld+json">${safeJsonLd}</script></head>`);

  const fallback = entry
    ? vocabularyFallback(entry)
    : pathname === '/vocabulary'
      ? vocabularyLandingFallback()
      : `<main><article><h1>Capital-AI Learning Portal</h1><p>${escapeHtml(description)}</p><p><a href="/vocabulary">Zum Vocabulary mit ${VOCABULARY_PUBLIC_COUNT} Fachbegriffen</a></p></article></main>`;
  body = body.replace(
    /<div id="root">[\s\S]*?<script type="module"/,
    `<div id="root">${fallback}</div>\n    <script type="module"`,
  );
  return body;
}
function end(res, body) { res.end(res.capitalAiHeadOnly ? undefined : body); }
function json(res, status, body) { res.writeHead(status, { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); end(res, JSON.stringify(body)); }

export function createApp(root = defaultRoot, options = {}) {
  let inflight = 0;
  const auth = createAuth(options);
  const userProviderVault = createUserProviderVault({ ...options, auth });
  const telegram = createTelegram({ ...options, auth });
  const privacy = createPrivacy({ ...options, auth });
  const marketLimit = createLimiter(120);
  const runtimeEnv = options.env || process.env;
  const mobileScorer = createMobileScorer(runtimeEnv);
  const scorerProxy = createScorerProxy({ env: runtimeEnv, fetchImpl: options.fetchImpl || fetch, sourcePolicy: options.sourcePolicy });
  const server = http.createServer({ maxHeaderSize: 8192, requestTimeout: 10000, headersTimeout: 10000, keepAliveTimeout: 5000 }, async (req, res) => {
  let url;
  const requestContext = beginRequest(req);
  res.capitalAiHeadOnly = req.method === 'HEAD';
  res.setHeader('x-request-id', requestContext.requestId);
  if ((req.url?.length || 0) > 2048) return json(res, 414, { error: 'uri_too_long' });
  try { url = new URL(req.url, 'http://localhost'); } catch { return json(res, 400, { error: 'bad_request' }); }
  res.once('finish', () => finishRequest(req, res, requestContext, url.pathname));
  // Apply headers to API responses and OIDC redirects alike.
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  if (serveMtaSts(req, res, url)) return;
  if (await auth.handle(req, res, url, json)) return;
  if (await userProviderVault.handle(req, res, url, json)) return;
  if (await privacy(req, res, url, json)) return;
  if (await telegram(req, res, url, json)) return;
  if ((url.pathname === '/api/mobile/enterprise-score' || url.pathname === '/api/mobile/scorer/events') && !auth.session(req)) return json(res, 401, { error: 'authentication_required' });
  if (await scorerProxy.handle(req, res, url, json, requestContext.requestId)) return;
  if (await mobileScorer.handle(req, res, url, json, headers)) return;
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.setHeader('Allow', 'GET, HEAD'); return json(res, 405, { error: 'method_not_allowed' }); }
  if (url.pathname === '/healthz') return json(res, 200, { ...health(), buildIdentity });
  if (url.pathname === '/metrics') {
    if (!metricsAuthorized(req)) {
      writeAuditEvent({ eventType: 'observability.metrics.denied', requestId: requestContext.requestId, result: 'DENIED' });
      return json(res, 404, { error: 'not_found' });
    }
    res.writeHead(200, { ...headers, 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8', 'Cache-Control': 'no-store' });
    return end(res, renderPrometheusMetrics());
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
    try {
      const [status, body] = await quote(url.searchParams.get('symbol') || '');
      if (status === 503 && body?.error === 'open_data_source_not_configured') res.capitalAiFailureClass = 'policy_blocked';
      return json(res, status, body);
    }
    catch { return json(res, 503, { error: 'market_data_unavailable' }); }
    finally { inflight--; }
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
  if (publicPath === '/robots.txt') {
    res.writeHead(200, { ...headers, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
    return end(res, 'User-agent: *\nAllow: /\nSitemap: https://capital-ai.online/sitemap.xml\n');
  }
  if (publicPath === '/sitemap.xml') {
    const paths = [...new Set([...sitemapBasePaths, ...vocabularyMetadata.map(entry => entry.path)])];
    const xml = '<?xml version="1.0" encoding="UTF-8"?>' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      paths.map(route => `<url><loc>https://capital-ai.online${escapeXml(route)}</loc></url>`).join('') +
      '</urlset>';
    res.writeHead(200, { ...headers, 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
    return end(res, xml);
  }
  if (publicPath.startsWith('/vocabulary/') && !vocabularyMetadataByPath.has(publicPath)) {
    res.writeHead(404, headers);
    return end(res, );
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
    res.writeHead(200, { ...headers, 'Cache-Control': path.extname(file) === '.html' ? 'no-store' : 'public, max-age=3600', 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }); end(res, body);
  } catch { res.writeHead(404, headers); end(res); }
});
  server.maxConnections = 256;
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
