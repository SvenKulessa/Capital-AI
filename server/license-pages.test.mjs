import {createHash} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from './index.mjs';
import { licenseMetadata } from '../shared/license-metadata.mjs';
import {
  VOCABULARY_CANONICAL_COUNT,
  VOCABULARY_PUBLIC_COUNT,
  vocabularyMetadata,
} from '../shared/vocabulary-metadata.mjs';
import { QUANT_PRO_IDS } from '../shared/vocabulary-access-policy.mjs';

async function readLegalTemplate(route) {
  try {
    return await readFile(new URL(`../public/${route}/index.html`, import.meta.url));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    // Production image retains built dist/, not source public/.
    return readFile(new URL(`../dist/${route}/index.html`, import.meta.url));
  }
}

test('license deep links expose crawlable metadata without changing API boundaries', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'capital-license-'));
  await writeFile(path.join(root, 'index.html'), await readFile(new URL('../index.html', import.meta.url)));
  // The production handler serves these routes from static HTML, not SPA fallback.
  for (const route of ['datenschutz', 'agb', 'impressum']) {
    await mkdir(path.join(root, route), { recursive: true });
    await writeFile(path.join(root, route, 'index.html'), await readLegalTemplate(route));
  }
  const server = createApp(root);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const [route, meta] of Object.entries(licenseMetadata)) {
      const r = await fetch(origin + route + '?title=%3Cscript%3E');
      assert.equal(r.status, 200);
      assert.equal(r.headers.get('cache-control'), 'no-store');
      assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
      const html = await r.text();
      assert.ok(html.includes(`<title>${meta.title.replaceAll('&', '&amp;')}</title>`));
      assert.ok(html.includes(`href="https://capital-ai.online${route}"`));
      assert.doesNotMatch(html, /FinTech-Forschung|Forschungsprojekt/);
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


test('all Vocabulary definitions are public and crawlable, including former Quant/Pro entries', async () => {
  assert.equal(VOCABULARY_CANONICAL_COUNT, vocabularyMetadata.length);
  assert.equal(VOCABULARY_PUBLIC_COUNT, vocabularyMetadata.length);
  assert.equal(vocabularyMetadata.length, VOCABULARY_CANONICAL_COUNT);
  const publicEntries = vocabularyMetadata;
  assert.equal(publicEntries.length, VOCABULARY_PUBLIC_COUNT);

  const root = await mkdtemp(path.join(tmpdir(), 'capital-vocabulary-'));
  await writeFile(path.join(root, 'index.html'), await readFile(new URL('../index.html', import.meta.url)));
  const server = createApp(root);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;

  try {
    const landingResponse = await fetch(origin + '/vocabulary');
    assert.equal(landingResponse.status, 200);
    const landingHtml = await landingResponse.text();
    assert.ok(landingHtml.includes(`<title>Capital-AI Vocabulary | ${VOCABULARY_PUBLIC_COUNT} Fachbegriffe &amp; Thesaurus</title>`));
    assert.match(landingHtml, /href="https:\/\/capital-ai\.online\/vocabulary"/);
    assert.match(landingHtml, /"@type":"DefinedTermSet"/);
    assert.ok(landingHtml.includes(`${VOCABULARY_PUBLIC_COUNT} konsolidierte Capital-AI Fachbegriffe`));
    assert.equal((landingHtml.match(/id="capital-ai-seo-jsonld"/g) || []).length, 1);
    assert.match(landingHtml, /href="\/vocabulary\/orderbuch"/);

    const termResponse = await fetch(origin + '/vocabulary/orderbuch?title=%3Cscript%3E');
    assert.equal(termResponse.status, 200);
    const termHtml = await termResponse.text();
    assert.match(termHtml, /<title>Orderbuch – Definition &amp; Thesaurus \| Capital-AI<\/title>/);
    assert.match(termHtml, /href="https:\/\/capital-ai\.online\/vocabulary\/orderbuch"/);
    assert.match(termHtml, /Echtzeit-Verzeichnis aller offenen Kauf-/);
    assert.match(termHtml, /Markttiefe/);
    assert.match(termHtml, /"@type":"DefinedTerm"/);
    assert.equal((termHtml.match(/id="capital-ai-seo-jsonld"/g) || []).length, 1);
    assert.doesNotMatch(termHtml, /sourcePath|sourceFile|sourceDocument|title=%3Cscript/);

    const sitemapResponse = await fetch(origin + '/sitemap.xml');
    assert.equal(sitemapResponse.status, 200);
    assert.match(sitemapResponse.headers.get('content-type') || '', /application\/xml/);
    const sitemap = await sitemapResponse.text();
    assert.equal((sitemap.match(/<loc>https:\/\/capital-ai\.online\/vocabulary\//g) || []).length, VOCABULARY_PUBLIC_COUNT);
    assert.match(sitemap, /<loc>https:\/\/capital-ai\.online\/vocabulary<\/loc>/);
    for (const entry of publicEntries) {
      assert.ok(sitemap.includes(`<loc>https://capital-ai.online${entry.path}</loc>`), entry.path);
    }
    const ownerGatedEntry = vocabularyMetadata.find((entry) => QUANT_PRO_IDS.has(entry.id));
    assert.ok(ownerGatedEntry);
    assert.equal(sitemap.includes(`<loc>https://capital-ai.online${ownerGatedEntry.path}</loc>`), true);
    const ownerGatedResponse = await fetch(origin + ownerGatedEntry.path);
    assert.equal(ownerGatedResponse.status, 200);
    assert.doesNotMatch(ownerGatedResponse.headers.get('x-robots-tag') ?? '', /noindex/);
    const formerlyRestrictedHtml = await ownerGatedResponse.text();
    assert.match(formerlyRestrictedHtml, /name="robots" content="index, follow/);
    assert.ok(formerlyRestrictedHtml.includes(ownerGatedEntry.description.replaceAll('&','&amp;')));
    for (const entry of publicEntries) {
      const response = await fetch(origin+entry.path);
      assert.equal(response.status,200,entry.path);
      assert.doesNotMatch(response.headers.get('x-robots-tag') ?? '',/noindex/,entry.path);
      const html = await response.text();
      assert.ok(html.includes(`href="https://capital-ai.online${entry.path}"`),entry.path);
      assert.match(html,/name="robots" content="index, follow/,entry.path);
    }

    const newTermHtml = await (await fetch(origin+'/vocabulary/brier-score')).text();
    assert.match(newTermHtml,/brier_score_loss/);
    assert.match(newTermHtml,/Fachquellen/);
    assert.match(newTermHtml,/Brier = Mittelwert/);
    assert.match(newTermHtml,/Synthetische Demo:/);

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

test('hub paths and legacy documents redirect once and keep subpage metadata and content separate', async () => {
  const { HUB_ROUTES, DOCUMENT_ROUTES } = await import('../shared/hub-routes.mjs');
  const root = await mkdtemp(path.join(tmpdir(),'capital-hub-routes-'));
  await writeFile(path.join(root,'index.html'),await readFile(new URL('../index.html',import.meta.url)));
  for (const [route,legacy] of Object.entries(DOCUMENT_ROUTES)) {
    await mkdir(path.dirname(path.join(root,legacy)),{recursive:true});
    const source = await readFile(new URL('../public'+legacy,import.meta.url)).catch(()=>readFile(new URL('../dist'+legacy,import.meta.url)));
    await writeFile(path.join(root,legacy),source);
  }
  const server=createApp(root);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  try {
    for (const route of HUB_ROUTES) {
      const redirected=await fetch(origin+route.hub+'?tab='+route.tab+'&ref=nav',{redirect:'manual'});
      assert.equal(redirected.status,301,route.path);
      assert.equal(redirected.headers.get('location'),route.path+'?ref=nav');
      const target=await fetch(origin+route.path);
      assert.equal(target.status,200,route.path);
      assert.equal(target.headers.get('x-robots-tag'),'noindex, nofollow');
      assert.ok((await target.text()).includes(route.title.replaceAll('&','&amp;')),route.path);
    }
    for (const [route,legacy] of Object.entries(DOCUMENT_ROUTES)) {
      const redirected=await fetch(origin+legacy,{redirect:'manual'});
      assert.equal(redirected.status,301,legacy);
      assert.equal(redirected.headers.get('location'),route);
      const target=await fetch(origin+route);
      assert.equal(target.status,200,route);
      const html=await target.text();
      assert.equal([...html.matchAll(/<footer\b/g)].length,1,route);
      assert.match(html,/cookie-preferences=1/);
      assert.doesNotMatch(html,/id="root"/);
    }
    for(const legacy of ['/downloads/capital-ai-byok-presentation.html','/documentation/byok.html']) {
      const response=await fetch(origin+legacy,{redirect:'manual'});
      assert.equal(response.status,301);
      assert.equal(response.headers.get('location'),'/dokumentation/byok');
    }
  } finally {
    server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
    await rm(root,{recursive:true});
  }
});


test('product tour serves browser-compatible MP4 MIME and hash-bound bytes',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'capital-tour-'));
  const directory=path.join(root,'learning/videos');await mkdir(directory,{recursive:true});
  const filename='capital-ai-tour-short-1080x1920.mp4';
  const bytes=await readFile(new URL('../public/learning/videos/'+filename,import.meta.url));
  const manifest=JSON.parse(await readFile(new URL('../public/learning/videos/capital-ai-tour-asset-manifest.json',import.meta.url)));
  await writeFile(path.join(directory,filename),bytes);
  const server=createApp(root);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const response=await fetch(`http://127.0.0.1:${server.address().port}/learning/videos/${filename}`);
    assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'video/mp4');
    const downloaded=Buffer.from(await response.arrayBuffer());
    assert.equal(createHash('sha256').update(downloaded).digest('hex'),manifest.assets.find(asset=>asset.path===filename).sha256);
    assert.match(manifest.renderer.videoCodec,/h264/);
  } finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await rm(root,{recursive:true});}
});
