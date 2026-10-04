import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from './index.mjs';
import { researchMetadata } from '../shared/research-metadata.mjs';
import {
  VOCABULARY_PUBLIC_COUNT,
  vocabularyMetadata,
} from '../shared/vocabulary-metadata.mjs';

test('research deep links expose crawlable metadata without changing API boundaries', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'capital-research-'));
  await writeFile(path.join(root, 'index.html'), await readFile(new URL('../index.html', import.meta.url)));
  const server = createApp(root);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const [route, meta] of Object.entries(researchMetadata)) {
      const r = await fetch(origin + route + '?title=%3Cscript%3E');
      assert.equal(r.status, 200);
      assert.equal(r.headers.get('cache-control'), 'no-store');
      assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
      const html = await r.text();
      assert.ok(html.includes(`<title>${meta.title.replaceAll('&', '&amp;')}</title>`));
      assert.ok(html.includes(`href="https://capital-ai.online${route}"`));
      assert.match(html, /FinTech-Forschung|Forschungsprojekt/);
      assert.doesNotMatch(html, /title=%3Cscript/);
    }
    for (const route of ['/impressum', '/datenschutz', '/agb']) assert.equal((await fetch(origin + route)).status, 200);
    assert.equal((await fetch(origin + '/api/datenprovider-lizenzen')).status, 404);
    assert.equal((await fetch(origin + '/research-missing.js')).status, 404);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(root, { recursive: true });
  }
});


test('vocabulary landing, 294 detail routes, sitemap and robots are crawlable without hydration', async () => {
  assert.equal(VOCABULARY_PUBLIC_COUNT, 294);
  assert.equal(vocabularyMetadata.length, 294);

  const root = await mkdtemp(path.join(tmpdir(), 'capital-vocabulary-'));
  await writeFile(path.join(root, 'index.html'), await readFile(new URL('../index.html', import.meta.url)));
  const server = createApp(root);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;

  try {
    const landingResponse = await fetch(origin + '/vocabulary');
    assert.equal(landingResponse.status, 200);
    const landingHtml = await landingResponse.text();
    assert.match(landingHtml, /<title>Capital-AI Vocabulary \| 294 Fachbegriffe &amp; Thesaurus<\/title>/);
    assert.match(landingHtml, /href="https:\/\/capital-ai\.online\/vocabulary"/);
    assert.match(landingHtml, /"@type":"DefinedTermSet"/);
    assert.match(landingHtml, /294 konsolidierte Fachbegriffe/);
    assert.match(landingHtml, /href="\/vocabulary\/orderbuch"/);

    const termResponse = await fetch(origin + '/vocabulary/orderbuch?title=%3Cscript%3E');
    assert.equal(termResponse.status, 200);
    const termHtml = await termResponse.text();
    assert.match(termHtml, /<title>Orderbuch – Definition &amp; Thesaurus \| Capital-AI<\/title>/);
    assert.match(termHtml, /href="https:\/\/capital-ai\.online\/vocabulary\/orderbuch"/);
    assert.match(termHtml, /Echtzeit-Verzeichnis aller offenen Kauf-/);
    assert.match(termHtml, /Markttiefe/);
    assert.match(termHtml, /"@type":"DefinedTerm"/);
    assert.doesNotMatch(termHtml, /sourcePath|sourceFile|sourceDocument|title=%3Cscript/);

    const sitemapResponse = await fetch(origin + '/sitemap.xml');
    assert.equal(sitemapResponse.status, 200);
    assert.match(sitemapResponse.headers.get('content-type') || '', /application\/xml/);
    const sitemap = await sitemapResponse.text();
    assert.equal((sitemap.match(/<loc>https:\/\/capital-ai\.online\/vocabulary\//g) || []).length, 294);
    assert.match(sitemap, /<loc>https:\/\/capital-ai\.online\/vocabulary<\/loc>/);
    for (const entry of vocabularyMetadata) {
      assert.ok(sitemap.includes(`<loc>https://capital-ai.online${entry.path}</loc>`), entry.path);
    }

    const robotsResponse = await fetch(origin + '/robots.txt');
    assert.equal(robotsResponse.status, 200);
    const robots = await robotsResponse.text();
    assert.match(robots, /User-agent: \*/);
    assert.match(robots, /Sitemap: https:\/\/capital-ai\.online\/sitemap\.xml/);

    assert.equal((await fetch(origin + '/vocabulary/not-a-real-term')).status, 404);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(root, { recursive: true });
  }
});
