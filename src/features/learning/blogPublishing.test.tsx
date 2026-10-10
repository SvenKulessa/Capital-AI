import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdtemp, writeFile, rm, readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { BlogPage } from './BlogPage';
import { BLOG_ARTICLES } from '../../../shared/blog-articles.mjs';
import { resolveNavigationTarget } from '../../utils/appNavigation';
import { seoMetadataForPath } from '../../../shared/seo-metadata.mjs';
import { createApp } from '../../../server/index.mjs';

test('public blog renders complete article and accessible navigation without entitlement', () => {
  const article = BLOG_ARTICLES[0];
  const html = renderToStaticMarkup(<BlogPage path={article.path} />);
  assert.equal(resolveNavigationTarget(article.path + '?ref=learning'), article.path + '?ref=learning');
  for (const section of article.sections) assert.ok(html.includes(section.body));
  assert.match(html, /<div lang="de"/);
  assert.match(html, /<h1 id="blog-title"/);
  assert.match(html, /alt="Vier Informationswege/);
  assert.match(html, /href="\/blog"/);
  assert.doesNotMatch(html, /DRAFT|LEGAL_ENGINE|publishReady|Anmelden/);
  assert.match(renderToStaticMarkup(<BlogPage path="/blog" />), /href="\/blog\/barrierefreie-finanzcharts"/);
  assert.match(renderToStaticMarkup(<BlogPage path="/blog/unbekannt" />), /Beitrag nicht gefunden/);
});

test('public HTTP response contains full article, reachable image, SEO and 404 for unknown posts', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'capital-blog-'));
  const article = BLOG_ARTICLES[0];
  let template;
  try { template = await readFile(new URL('../../../index.html', import.meta.url)); }
  catch { template = await readFile(new URL('../../../dist/index.html', import.meta.url)); }
  await writeFile(path.join(root, 'index.html'), template);
  await mkdir(path.dirname(path.join(root, article.image)), { recursive: true });
  let image;
  try { image = await readFile(new URL('../../../public' + article.image, import.meta.url)); }
  catch { image = await readFile(new URL('../../../dist' + article.image, import.meta.url)); }
  await writeFile(path.join(root, article.image), image);
  const server = createApp(root);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    const response = await fetch(origin + article.path, { headers: { 'Accept-Language': 'en' } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-language'), 'de');
    const html = await response.text();
    for (const section of article.sections) assert.ok(html.includes(section.body), section.title);
    assert.ok(html.includes(`href="https://capital-ai.online${article.path}"`));
    assert.match(html, /"@type":"BlogPosting"/);
    assert.match(html, /<meta name="robots" content="index, follow/);
    assert.match(await (await fetch(origin + '/blog')).text(), /href="\/blog\/barrierefreie-finanzcharts"/);
    const asset = await fetch(origin + article.image);
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get('content-type') ?? '', /image\/svg\+xml/);
    assert.match(await asset.text(), /<title/);
    const unknown = await fetch(origin + '/blog/unbekannt');
    assert.equal(unknown.status, 404);
    assert.equal(unknown.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.ok((await (await fetch(origin + '/sitemap.xml')).text()).includes(`https://capital-ai.online${article.path}`));
    const metadata = seoMetadataForPath(article.path);
    assert.equal(metadata?.ogType, 'article');
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
});
