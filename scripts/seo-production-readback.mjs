// Anonymous GETs only: no checkout, credentials, publishing or crawler submission.
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { SEO_CONTENT_MANIFEST } from '../shared/seo-content-manifest.mjs';
import { blogArticleForPath } from '../shared/blog-articles.mjs';

const X_ARTICLE = blogArticleForPath('/blog/x-api-expansions-kosten');

const CANONICAL_ORIGIN = 'https://capital-ai.online';
const MAX_BYTES = 2 * 1024 * 1024;

async function boundedText(response) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw new Error('response_too_large');
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString('utf8');
  } finally {
    await reader.cancel().catch(() => {});
  }
}

export async function productionReadback({ origin = CANONICAL_ORIGIN, full = false, fetchImpl = fetch } = {}) {
  const target = new URL(origin);
  if (target.protocol !== 'https:' || target.username || target.password || target.search || target.hash || target.pathname !== '/') {
    throw new Error('origin_must_be_https_without_credentials_or_path');
  }
  const entries = full ? SEO_CONTENT_MANIFEST : SEO_CONTENT_MANIFEST.filter((entry, index) =>
    entry.contentType !== 'vocabulary-term' || index === SEO_CONTENT_MANIFEST.length - 1 ||
    entry === SEO_CONTENT_MANIFEST.find(item => item.contentType === 'vocabulary-term'));
  const checks = [];
  const add = (path, check, pass) => checks.push({ path, check, status: pass ? 'PASS' : 'FAIL' });
  async function get(path, inspect) {
    try {
      const response = await fetchImpl(target.origin + path, {
        method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'CAPITAL-AI-Public-Readback/1.0', 'Accept-Language': 'de' },
      });
      add(path, 'HTTP_200_NO_REDIRECT', response.status === 200);
      if (response.status !== 200) { await response.body?.cancel(); return; }
      await inspect(response, await boundedText(response));
    } catch {
      // Never persist response bodies, provider values or exception text.
      add(path, 'BOUNDED_RESPONSE_AVAILABLE', false);
    }
  }
  for (const entry of entries) {
    await get(entry.path, (response, html) => {
      add(entry.path, 'HTML_CONTENT_TYPE', /text\/html/i.test(response.headers.get('content-type') || ''));
      add(entry.path, 'CANONICAL', html.includes(`<link rel="canonical" href="${entry.canonical}"`));
      // Standalone legal documents use Google's default INDEX semantics and
      // intentionally have no React root. Still reject explicit indexing bans.
      const legal = ['/impressum', '/datenschutz', '/agb'].includes(entry.path);
      const robots = [...html.matchAll(/<meta\b[^>]*>/gi)].map(m => m[0])
        .filter(tag => /name\s*=\s*["'](?:robots|googlebot)["']/i.test(tag));
      const blocked = /noindex|\bnone\b/i.test(response.headers.get('x-robots-tag') || '') ||
        robots.some(tag => /content\s*=\s*["'][^"']*\b(?:noindex|none)\b/i.test(tag));
      add(entry.path, 'INDEXABLE', !blocked && (legal || /<meta name="robots" content="index, follow/i.test(html)));
      add(entry.path, 'CRAWLABLE_CONTENT', /<main\b[^>]*>[\s\S]*?<h1\b[^>]*>[^<]+<\/h1>[\s\S]*?<\/main>/i.test(html));
      const scripts = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
      let schemaValid = scripts.length > 0;
      for (const [, body] of scripts) {
        try { JSON.parse(body); } catch { schemaValid = false; }
      }
      add(entry.path, 'JSON_LD_VALID', schemaValid);
      if (entry.path === X_ARTICLE.path) {
        add(entry.path, 'X_ARTICLE_DESCRIPTION',
          html.includes(`<meta name="description" content="${entry.description}"`));
        let blogPosting = null;
        for (const [, body] of scripts) {
          try {
            const parsed = JSON.parse(body);
            const nodes = Array.isArray(parsed?.['@graph']) ? parsed['@graph'] : [parsed];
            blogPosting ||= nodes.find(node => node?.['@type'] === 'BlogPosting'
              && node?.url === entry.canonical);
          } catch { /* malformed JSON-LD already fails the generic check */ }
        }
        add(entry.path, 'X_ARTICLE_BLOGPOSTING',
          blogPosting?.headline === X_ARTICLE.title
          && blogPosting?.datePublished === X_ARTICLE.date);
        add(entry.path, 'X_ARTICLE_FALLBACK',
          /<main id="capital-ai-public-snapshot" lang="de">/.test(html)
          && html.includes(X_ARTICLE.intro)
          && X_ARTICLE.sections.every(section => html.includes(section.body))
          && html.includes(`<time datetime="${X_ARTICLE.date}">${X_ARTICLE.date}</time>`));
        add(entry.path, 'X_ARTICLE_SKIP_LINK',
          /<a href="#capital-ai-public-snapshot" class="[^"]*focus:not-sr-only[^"]*">Zum Hauptinhalt springen<\/a>\s*<main id="capital-ai-public-snapshot" lang="de">/.test(html));
        add(entry.path, 'X_ARTICLE_IMAGE_ALT',
          html.includes(`src="${X_ARTICLE.image}" alt="${X_ARTICLE.imageAlt}"`));
        add(entry.path, 'X_ARTICLE_SOURCES_AND_CTA',
          X_ARTICLE.sources.every(source => html.includes(`href="${source.url}"`))
          && html.includes('href="/learning/lernimpulse"'));
        add(entry.path, 'X_ARTICLE_NO_INTERNAL_LEAK',
          !/SOCIAL_X_TOKEN_ENCRYPTION_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|SOLO_MAINTAINER_FLOW|\/api\/social-media\/x\/url-context|\/server\/social-media\//i.test(html));
      }
    });
  }
  await get(X_ARTICLE.image, (response, svg) => add(X_ARTICLE.image, 'X_ARTICLE_SVG',
    /image\/svg\+xml/i.test(response.headers.get('content-type') || '')
    && /<svg\b/i.test(svg) && /<title(?:\s|>)/i.test(svg)));
  await get('/robots.txt', (_response, body) => add('/robots.txt', 'CANONICAL_SITEMAP', body.includes(`Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml`)));
  await get('/sitemap.xml', (_response, body) => {
    const locations = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
    add('/sitemap.xml', 'EXACT_INDEX_ALLOWLIST', locations.length === SEO_CONTENT_MANIFEST.length &&
      new Set(locations).size === locations.length && SEO_CONTENT_MANIFEST.every(entry => locations.includes(entry.canonical)));
  });
  for (const path of ['/llms.txt', '/sitemap.md']) {
    await get(path, (_response, body) => add(path, 'PUBLIC_DISCOVERY', body.includes(`${CANONICAL_ORIGIN}/learning`) &&
      !/\/profile|\/control-center|\/api\//.test(body)));
  }
  await get('/login', (response, html) => add('/login', 'NOINDEX', /noindex/i.test(response.headers.get('x-robots-tag') || '') &&
    /<meta name="robots" content="noindex/i.test(html)));
  let runtimeIdentity = { status: 'NOT_PROVEN', sourceSha: null };
  await get('/healthz', (_response, body) => {
    const health = JSON.parse(body);
    add('/healthz', 'HEALTH_OK', health.status === 'ok');
    const identity = health.buildIdentity;
    if (identity?.bound === true && /^[0-9a-f]{40}$/.test(identity.sourceSha || '')) {
      runtimeIdentity = { status: 'RUNTIME_VERIFIED', sourceSha: identity.sourceSha };
    }
  });
  let commerce = { checkoutConfigured: false, purchaseEvidence: 'NOT_PROVEN', marketplaceReady: false };
  await get('/api/billing/subscriptions/readiness', (_response, body) => {
    const data = JSON.parse(body);
    add('/api/billing/subscriptions/readiness', 'SUBSCRIPTION_CONTRACT', data.schema === 'CAPITAL_AI_SUBSCRIPTION_COMMERCE_READINESS@1');
    commerce.checkoutConfigured = data.enabled === true;
  });
  await get('/api/cads/commerce/readiness', (_response, body) => {
    const data = JSON.parse(body);
    add('/api/cads/commerce/readiness', 'CADS_CONTRACT', data.schema === 'CAPITAL_AI_CADS_COMMERCE_READINESS@1');
    commerce.marketplaceReady = data.githubMarketplace?.runtimeReady === true;
  });
  return {
    schema: 'CAPITAL_AI_PUBLIC_PRODUCTION_READBACK@1', observedAt: new Date().toISOString(),
    origin: target.origin, scope: full ? 'ALL_INDEX_ROUTES' : 'STATIC_AND_TWO_VOCABULARY_SAMPLES',
    fetchedIndexRoutes: entries.length, seoStatus: checks.every(check => check.status === 'PASS') ? 'PASS' : 'FAIL',
    runtimeIdentity, commerce, productionReady: false, checks,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2);
    const value = (flag) => {
      const index = args.indexOf(flag);
      if (index < 0) return undefined;
      if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`missing_${flag}_value`);
      return args[index + 1];
    };
    const report = await productionReadback({ origin: value('--origin'), full: args.includes('--full') });
    const output = value('--output');
    if (output) await writeFile(output, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.seoStatus === 'PASS' ? 0 : 1;
  } catch {
    console.error('PUBLIC_READBACK_FAILED');
    process.exitCode = 1;
  }
}
