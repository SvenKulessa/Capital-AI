import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createApp } from './index.mjs';

test('country and manual locale bootstrap is privacy-safe and consistent', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'capital-i18n-'));
  const template = await readFile(new URL('../index.html', import.meta.url));
  await writeFile(path.join(root, 'index.html'), template);
  const server = createApp(root);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const cases = [
      { country:'DE', expected:'de' }, { country:'IT', expected:'it' },
      { country:'FR', expected:'fr' }, { country:'PT', expected:'pt' },
      { country:'BR', expected:'pt' }, { country:'ES', expected:'es' },
      { country:'PL', expected:'en', acceptLanguage:'de' },
    ];
    for (const {country,expected,acceptLanguage} of cases) {
      const response = await fetch(origin, {headers:{
        'CF-IPCountry':country, ...(acceptLanguage ? {'Accept-Language':acceptLanguage} : {})
      }});
      assert.equal(response.status,200);
      assert.equal(response.headers.get('Content-Language'),expected,country);
      assert.equal(response.headers.get('Cache-Control'),'no-store');
      assert.match(await response.text(),new RegExp(`<html lang="${expected}" data-locale-source="country"`),country);
    }
    const site = 'https://capital-ai.online';
    const headings = {
      de: 'Marktnews verstehen.',
      en: 'Understand financial terms.',
      it: 'Comprendi i termini finanziari.',
      fr: 'Comprenez les termes financiers.',
      pt: 'Compreenda os termos financeiros.',
      es: 'Comprende los términos financieros.',
    };
    const alternates = [
      ...Object.keys(headings).map(code => [code, `${site}/${code}/`]),
      ['x-default', site + '/'],
    ];
    const sitemap = await (await fetch(origin + '/sitemap.xml')).text();
    assert.match(sitemap, /xmlns:xhtml="http:\/\/www.w3.org\/1999\/xhtml"/);
    assert.equal(await (await fetch(origin + '/sitemap-main.xml')).text(), sitemap);
    for (const [code, canonical] of alternates) {
      const path = new URL(canonical).pathname;
      const response = await fetch(origin + path, {headers:{
        'CF-IPCountry':'DE', Cookie:'capital_ai_locale=es',
      }});
      assert.equal(response.status, 200, path);
      assert.equal(response.headers.get('X-Robots-Tag'), null, path);
      const html = await response.text();
      assert.match(html, /<meta name="robots" content="index, follow,/);
      assert.deepEqual([...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map(([, href]) => href), [canonical]);
      assert.deepEqual([...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map(([, lang, href]) => [lang, href]), alternates);
      const sitemapEntry = sitemap.split('<url>').find(entry => entry.startsWith(`<loc>${canonical}</loc>`))?.split('</url>')[0] ?? '';
      assert.deepEqual([...sitemapEntry.matchAll(/<xhtml:link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map(([, lang, href]) => [lang, href]), alternates);
      if (code === 'x-default') continue;
      assert.equal(response.headers.get('Content-Language'), code);
      assert.ok(html.includes(`<html lang="${code}" data-locale-source="path"`));
      const main = html.match(/<main class="localized-landing"[\s\S]+?<\/main>/)?.[0];
      assert.ok(main?.includes(`<h1>${headings[code]}`), path);
      assert.ok(main.includes('<a href="/learning">'), path);
      assert.ok(main.includes('<a href="/marketscreener">'), path);
      assert.doesNotMatch(main, /<script|Für die interaktive Anwendung/);
    }
    for (const alias of ['/en', '/EN/', '/en//']) {
      const response = await fetch(origin + alias + '?source=fixture', { redirect: 'manual' });
      assert.equal(response.status, 301);
      assert.equal(response.headers.get('Location'), '/en/?source=fixture');
    }
    const nested = await fetch(origin + '/en/profile');
    assert.equal(nested.headers.get('X-Robots-Tag'), 'noindex, nofollow');
    assert.doesNotMatch(await nested.text(), /rel="alternate" hreflang=/);
    const manual = await fetch(origin,{headers:{'CF-IPCountry':'DE','Cookie':'capital_ai_locale=es'}});
    assert.equal(manual.headers.get('Content-Language'),'es');
    assert.match(await manual.text(),/<html lang="es" data-locale-source="manual"/);
    const browser = await fetch(origin,{headers:{'Accept-Language':'fr-CH,fr;q=0.9'}});
    assert.match(await browser.text(),/<html lang="fr" data-locale-source="browser"/);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(root,{recursive:true,force:true});
  }
});
