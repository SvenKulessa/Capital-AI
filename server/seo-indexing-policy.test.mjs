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

const EXPECTED_INDEX_PATHS = [
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
  assert.equal(resolveSeoIndexingPolicy('/tokenomics').classification, 'BLOCKED');
  assert.equal(resolveSeoIndexingPolicy('/whale-radar').classification, 'BLOCKED');
  assert.equal(resolveSeoIndexingPolicy('/login').classification, 'NOINDEX');
  assert.equal(resolveSeoIndexingPolicy('/dokumentation').classification, 'NOINDEX');
  assert.equal(resolveSeoIndexingPolicy('/documentation/byok.html').classification, 'NOINDEX');
  assert.equal(resolveSeoIndexingPolicy('/research').classification, 'BLOCKED');
  assert.equal(resolveSeoIndexingPolicy('/not-inventory').classification, 'BLOCKED');
  assert.equal(resolveSeoIndexingPolicy('/api/auth/session').classification, 'PRIVATE');
  assert.equal(resolveSeoIndexingPolicy('/healthz').classification, 'NOINDEX');
  assert.equal(isSeoIndexable('/vocabulary/orderbuch'), true);
});

test('server enforces INDEX versus noindex and derives sitemap from SEO-00 policy', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'capital-seo00-'));
  await writeFile(path.join(root, 'index.html'), await readFile(new URL('../index.html', import.meta.url)));
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

    for (const route of ['/login', '/profile', '/control-center', '/tokenomics', '/whale-radar', '/dokumentation', '/not-inventory']) {
      const response = await fetch(origin + route);
      assert.equal(response.status, 200, route);
      assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow', route);
      assert.match(await response.text(), /<meta name="robots" content="noindex, nofollow"/, route);
    }

    const staticDoc = await fetch(origin + '/documentation/byok.html');
    assert.equal(staticDoc.status, 200);
    assert.equal(staticDoc.headers.get('x-robots-tag'), 'noindex, nofollow');

    const api = await fetch(origin + '/api/not-real');
    assert.equal(api.status, 404);
    assert.equal(api.headers.get('x-robots-tag'), 'noindex, nofollow');

    const sitemapResponse = await fetch(origin + '/sitemap.xml');
    assert.equal(sitemapResponse.status, 200);
    const sitemap = await sitemapResponse.text();
    for (const route of EXPECTED_INDEX_PATHS) {
      const url = route === '/' ? 'https://capital-ai.online/' : `https://capital-ai.online${route}`;
      assert.ok(sitemap.includes(`<loc>${url}</loc>`), route);
    }
    for (const route of ['/login', '/profile', '/control-center', '/tokenomics', '/dokumentation', '/architecture']) {
      assert.ok(!sitemap.includes(`<loc>https://capital-ai.online${route}</loc>`), route);
    }
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(root, { recursive: true });
  }
});
