import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createApp } from './index.mjs';
import {
  SEO_INDEXING_STATES,
  SEO_ROUTE_POLICY,
  isSeoIndexable,
  resolveSeoIndexingPolicy,
  seoIndexableStaticPaths,
} from '../shared/seo-indexing-policy.mjs';

async function readIndexTemplate() {
  try {
    return await readFile(new URL('../index.html', import.meta.url));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    return readFile(new URL('../dist/index.html', import.meta.url));
  }
}

const EXPECTED_INDEX_PATHS = [
  '/',
  '/learning',
  '/vocabulary',
  '/faq',
  '/lizenz',
  '/datenprovider-lizenzen',
  '/opensource-lizenzen',
  '/impressum',
  '/datenschutz',
  '/agb',
];

test('SEO-00 classifies every inventory entry and keeps the static INDEX allowlist explicit', () => {
  const allowed = new Set(Object.values(SEO_INDEXING_STATES));
  assert.ok(SEO_ROUTE_POLICY.length > EXPECTED_INDEX_PATHS.length);
  for (const entry of SEO_ROUTE_POLICY) {
    assert.ok(entry.path.startsWith('/'));
    assert.ok(allowed.has(entry.classification), `${entry.path}: invalid classification`);
    assert.ok(entry.contentType);
    assert.ok(entry.reason);
  }
  assert.deepEqual(seoIndexableStaticPaths(), EXPECTED_INDEX_PATHS);
});

test('SEO-00 is fail-closed for private, claim-sensitive, alias and unknown routes', () => {
  assert.equal(resolveSeoIndexingPolicy('/profile').classification, 'PRIVATE');
  assert.equal(resolveSeoIndexingPolicy('/control-center').classification, 'PRIVATE');
  assert.equal(resolveSeoIndexingPolicy('/profile/security').classification, 'PRIVATE');
  assert.equal(resolveSeoIndexingPolicy('/profile/key-vault').classification, 'PRIVATE');
  assert.equal(resolveSeoIndexingPolicy('/tokenomics').classification, 'BLOCKED');
  assert.equal(resolveSeoIndexingPolicy('/whale-radar').classification, 'BLOCKED');
  assert.equal(resolveSeoIndexingPolicy('/login').classification, 'NOINDEX');
  for (const locale of ['de','en','it','fr','pt','es']) {
    assert.equal(resolveSeoIndexingPolicy(`/${locale}/`).classification, 'NOINDEX');
    assert.equal(isSeoIndexable(`/${locale}/`), false);
  }
  assert.equal(resolveSeoIndexingPolicy('/dokumentation').classification, 'NOINDEX');
  assert.equal(resolveSeoIndexingPolicy('/documentation/byok.html').classification, 'NOINDEX');
  assert.equal(resolveSeoIndexingPolicy('/research').classification, 'BLOCKED');
  assert.equal(resolveSeoIndexingPolicy('/forschung').classification, 'BLOCKED');
  assert.equal(resolveSeoIndexingPolicy('/not-inventory').classification, 'BLOCKED');
  assert.equal(resolveSeoIndexingPolicy('/api/auth/session').classification, 'PRIVATE');
  assert.equal(resolveSeoIndexingPolicy('/healthz').classification, 'NOINDEX');
  assert.equal(resolveSeoIndexingPolicy('/llms.txt').classification, 'NOINDEX');
  assert.equal(resolveSeoIndexingPolicy('/sitemap.md').classification, 'NOINDEX');
  assert.equal(resolveSeoIndexingPolicy('/.well-known/security.txt').classification, 'NOINDEX');
  assert.equal(resolveSeoIndexingPolicy('/.well-known/change-password').classification, 'NOINDEX');
  assert.equal(isSeoIndexable('/vocabulary/orderbuch'), true);
});

test('server enforces INDEX versus noindex and derives sitemap from SEO-00 policy', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'capital-seo00-'));
  await writeFile(path.join(root, 'index.html'), await readIndexTemplate());
  // Model the actual dist layout for bootstrap-independent legal pages.
  for (const route of ['datenschutz', 'agb']) {
    await mkdir(path.join(root, route), { recursive: true });
    await writeFile(path.join(root, route, 'index.html'), await readFile(new URL(`../public/${route}/index.html`, import.meta.url)));
  }
  await mkdir(path.join(root, 'documentation'), { recursive: true });
  await writeFile(
    path.join(root, 'documentation', 'byok.html'),
    '<!doctype html><html><head><meta name="robots" content="index, follow"><link rel="canonical" href="https://capital-ai.online/"></head><body><h1>BYOK</h1></body></html>',
  );

  const server = createApp(root);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;

  try {
    const home = await fetch(origin + '/');
    assert.equal(home.status, 200);
    assert.equal(home.headers.get('x-robots-tag'), null);
    assert.match(await home.text(), /<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large"/);

    const faq = await fetch(origin + '/faq');
    assert.equal(faq.status, 200);
    assert.equal(faq.headers.get('x-robots-tag'), null);
    const faqHtml = await faq.text();
    assert.match(faqHtml, /href="https:\/\/capital-ai\.online\/faq"/);
    assert.match(faqHtml, /property="og:url" content="https:\/\/capital-ai\.online\/faq"/);
    assert.match(faqHtml, /<title>Capital-AI \| FAQ &amp; Hilfe<\/title>/);
    assert.match(faqHtml, /id="capital-ai-seo-jsonld"/);

    for (const route of ['/login', '/profile', '/profile/security', '/profile/key-vault', '/tokenomics', '/whale-radar', '/dokumentation', '/not-inventory']) {
      const response = await fetch(origin + route);
      assert.equal(response.status, 200, route);
      assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow', route);
      const html = await response.text();
      assert.match(html, /<meta name="robots" content="noindex, nofollow"/, route);
      assert.doesNotMatch(html, /rel="canonical"/, route);
      assert.doesNotMatch(html, /type="application\/ld\+json"/, route);
    }

    const controlCenter = await fetch(origin + '/control-center');
    assert.equal(controlCenter.status, 404);
    assert.equal(controlCenter.headers.get('x-robots-tag'), 'noindex, nofollow');

    const staticDoc = await fetch(origin + '/documentation/byok.html');
    assert.equal(staticDoc.status, 200);
    assert.equal(staticDoc.headers.get('x-robots-tag'), 'noindex, nofollow');

    const api = await fetch(origin + '/api/not-real');
    assert.equal(api.status, 404);
    assert.equal(api.headers.get('x-robots-tag'), 'noindex, nofollow');

    // SEO discovery contract: compare raw HTTP semantics, not crawler markdown rendering.
    const robotsResponse = await fetch(origin + '/robots.txt');
    assert.equal(robotsResponse.status, 200);
    assert.match(robotsResponse.headers.get('content-type') || '', /^text\/plain/i);
    const robots = await robotsResponse.text();
    assert.equal(robots, 'User-agent: *\\nAllow: /\\nSitemap: https://capital-ai.online/sitemap.xml\\n'.replaceAll('\\n', '\n'));
    assert.doesNotMatch(robots, /(?:\/profile|\/control-center|\/api\/)/);

    const sitemapResponse = await fetch(origin + '/sitemap.xml');
    assert.equal(sitemapResponse.status, 200);
    assert.match(sitemapResponse.headers.get('content-type') || '', /^application\/xml/i);
    const sitemap = await sitemapResponse.text();
    assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    assert.doesNotMatch(sitemap, /<lastmod>/, 'No invented timestamp: introduce lastmod only from evidence-backed per-route dates');
    for (const route of EXPECTED_INDEX_PATHS) {
      const url = route === '/' ? 'https://capital-ai.online/' : `https://capital-ai.online${route}`;
      assert.ok(sitemap.includes(`<loc>${url}</loc>`), route);
    }
    for (const route of ['/login', '/profile', '/control-center', '/tokenomics', '/dokumentation', '/architecture']) {
      assert.ok(!sitemap.includes(`<loc>https://capital-ai.online${route}</loc>`), route);
    }

    for (const discoveryPath of ['/llms.txt', '/sitemap.md']) {
      const response = await fetch(origin + discoveryPath);
      assert.equal(response.status, 200, discoveryPath);
      assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
      assert.match(response.headers.get('content-type') || '', discoveryPath === '/llms.txt' ? /^text\/plain/ : /^text\/markdown/);
      const body = await response.text();
      assert.match(body, /^# CAPITAL-AI/m);
      assert.match(body, /https:\/\/capital-ai\.online\/learning/);
      assert.doesNotMatch(body, /\/(?:profile|control-center|pricing|api\/)/);
      if (discoveryPath === '/llms.txt') {
        for (const match of body.matchAll(/\]\((https:\/\/capital-ai\.online\/[^)]*)\)/g)) {
          const linkedPath = new URL(match[1]).pathname;
          assert.equal(resolveSeoIndexingPolicy(linkedPath).classification, 'INDEX', linkedPath);
        }
      }
    }
    // SEO-03: an actual first HTTP response must contain indexable content
    // for humans and crawlers that do not execute JavaScript.
    for (const route of ['/', '/faq', '/impressum', '/datenschutz', '/agb']) {
      const response = await fetch(origin + route);
      assert.equal(response.status, 200, route);
      const html = await response.text();
      const metadataTitle = route === '/' ? 'Capital-AI' : null;
      if (route === '/datenschutz' || route === '/agb') {
        assert.match(html, /<html lang="de"/, route);
        assert.match(html, /<nav aria-label="Rechtliche Informationen">/, route);
        assert.doesNotMatch(html, /<script\\b|capital-ai-bootstrap-fallback/, route);
      } else {
        assert.match(html, /id="capital-ai-public-snapshot" lang="de"/, route);
        assert.match(html, /<nav aria-label="Öffentliche Seiten">/, route);
      }
      assert.match(html, /<h1>[^<]+<\/h1>/, route);
      if (metadataTitle) assert.match(html, /<h1>Capital-AI/, route);
      assert.doesNotMatch(html, /\/profile\/key-vault|\/control-center|\/api\/billing/, route);
      assert.doesNotMatch(html, /"@type":"Offer"|<script[^>]*src="https:\/\//, route);
      if (route === '/') {
        assert.match(html, /href="\/pricing">Tarife und Leistungen ansehen<\/a>/);
        assert.match(html, /href="\/login">Anmelden<\/a>/);
      }
    }
    for (const route of ['/pricing', '/login', '/profile', '/control-center', '/en', '/not-inventory']) {
      const response = await fetch(origin + route);
      const html = await response.text();
      assert.doesNotMatch(html, /capital-ai-public-snapshot/, route);
    }
    const richVocabulary = await (await fetch(origin + '/vocabulary')).text();
    assert.match(richVocabulary, /<main><article><h1>Capital-AI Vocabulary<\/h1>/);
    assert.doesNotMatch(richVocabulary, /capital-ai-public-snapshot/);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(root, { recursive: true });
  }
});
