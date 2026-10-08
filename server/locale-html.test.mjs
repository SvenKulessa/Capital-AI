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
