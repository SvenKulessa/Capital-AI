// Anonymous, read-only crawlability gate for SEO-03.
// Checks sitemap consistency with INDEX policy and robots.txt contract.
// No credentials, no writes, no crawler submission.
import { pathToFileURL } from 'node:url';
import {
  isSeoIndexable,
  seoIndexableStaticPaths,
} from '../shared/seo-indexing-policy.mjs';
import { vocabularyMetadata } from '../shared/vocabulary-metadata.mjs';

const CANONICAL_ORIGIN = 'https://capital-ai.online';
const MAX_BYTES = 1_000_000;

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

export function expectedIndexPaths() {
  const staticPaths = seoIndexableStaticPaths();
  const vocabularyPaths = (vocabularyMetadata || [])
    .map(entry => entry.path || entry.canonicalPath || `/vocabulary/${entry.slug || entry.id}`)
    .filter(path => path && isSeoIndexable(path));
  return [...new Set([...staticPaths, ...vocabularyPaths])].sort();
}

export function parseSitemapLocs(xml) {
  const matches = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)];
  return matches.map(m => {
    const url = m[1];
    try {
      const parsed = new URL(url);
      return parsed.pathname === '' ? '/' : parsed.pathname;
    } catch {
      return null;
    }
  }).filter(Boolean);
}

export async function runCrawlabilityGate({
  origin = CANONICAL_ORIGIN,
  fetchImpl = fetch,
} = {}) {
  const target = new URL(origin);
  if (target.protocol !== 'https:' || target.username || target.password || target.pathname !== '/') {
    throw new Error('origin_must_be_https_without_credentials_or_path');
  }

  const checks = [];
  const add = (check, pass, detail = null) => checks.push({ check, status: pass ? 'PASS' : 'FAIL', detail });

  async function get(path) {
    const response = await fetchImpl(target.origin + path, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'CAPITAL-AI-Crawlability-Gate/1.0', 'Accept': '*/*' },
    });
    const text = await boundedText(response);
    return { status: response.status, headers: response.headers, text };
  }

  // robots.txt contract
  const robots = await get('/robots.txt');
  add('ROBOTS_HTTP_200', robots.status === 200);
  add('ROBOTS_HAS_SITEMAP', /Sitemap:\s*https:\/\/capital-ai\.online\/sitemap\.xml/i.test(robots.text));
  add('ROBOTS_USER_AGENT_STAR', /User-agent:\s*\*/i.test(robots.text));

  // sitemap consistency
  const sitemap = await get('/sitemap.xml');
  add('SITEMAP_HTTP_200', sitemap.status === 200);
  add('SITEMAP_XML_CONTENT_TYPE', /xml/i.test(sitemap.headers.get('content-type') || ''));
  const sitemapPaths = parseSitemapLocs(sitemap.text);
  add('SITEMAP_HAS_URLS', sitemapPaths.length > 0);

  const expected = expectedIndexPaths();
  const expectedSet = new Set(expected);
  const sitemapSet = new Set(sitemapPaths);

  const extras = sitemapPaths.filter(p => !expectedSet.has(p));
  const missing = expected.filter(p => !sitemapSet.has(p));

  add('SITEMAP_ONLY_INDEX_ROUTES', extras.length === 0, extras.length ? { extras: extras.slice(0, 10) } : null);
  add('SITEMAP_COVERS_EXPECTED_INDEX', missing.length === 0, missing.length ? { missing: missing.slice(0, 10) } : null);
  add('SITEMAP_NO_PRIVATE_OR_API', !sitemapPaths.some(p => p.startsWith('/api/') || p.startsWith('/login') || p.startsWith('/profile') || p.startsWith('/dashboard')));

  // Spot-check a few public INDEX routes return 200 and are not noindex
  const spot = ['/', '/learning', '/vocabulary', '/faq'].filter(p => expectedSet.has(p));
  for (const path of spot) {
    const page = await get(path);
    add(`SPOT_${path.replace(/\//g, '_')}_HTTP_200`, page.status === 200);
    const robotsTag = page.headers.get('x-robots-tag') || '';
    const blocked = /noindex/i.test(robotsTag) || /noindex/i.test(page.text);
    add(`SPOT_${path.replace(/\//g, '_')}_NOT_NOINDEX`, !blocked);
  }

  const failed = checks.filter(c => c.status === 'FAIL');
  return {
    schema: 'CAPITAL_AI_SEO_CRAWLABILITY_GATE@1',
    observedAt: new Date().toISOString(),
    origin: target.origin,
    expectedIndexCount: expected.length,
    sitemapUrlCount: sitemapPaths.length,
    checks,
    status: failed.length === 0 ? 'PASS' : 'FAIL',
    failedCount: failed.length,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const args = process.argv.slice(2);
  const originIdx = args.indexOf('--origin');
  const origin = originIdx >= 0 ? args[originIdx + 1] : CANONICAL_ORIGIN;
  const outputIdx = args.indexOf('--output');
  const output = outputIdx >= 0 ? args[outputIdx + 1] : null;

  const report = await runCrawlabilityGate({ origin });
  const json = JSON.stringify(report, null, 2);
  if (output) {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(output, json + '\n');
  }
  console.log(json);
  if (report.status !== 'PASS') process.exitCode = 1;
}
