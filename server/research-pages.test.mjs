import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from './index.mjs';
import { researchMetadata } from '../shared/research-metadata.mjs';

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
