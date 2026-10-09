import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PROCESSING_ACTIVITIES } from '../src/privacy/privacyPolicy.ts';

const source = await readFile(new URL('../server/index.mjs', import.meta.url), 'utf8');

for (const route of ['datenschutz', 'agb']) {
  test(`/${route}/ is public HTML, not an application bootstrap`, async () => {
    const html = await readFile(new URL(`../public/${route}/index.html`, import.meta.url), 'utf8');
    assert.match(html, /<!doctype html>/i);
    assert.match(html, /<html lang="de">/);
    assert.match(html, /<main>/);
    assert.match(html, /<h1>/);
    assert.match(html, new RegExp(`https:\\/\\/capital-ai\\.online\\/${route}\\/`));
    assert.doesNotMatch(html, /<script\b|id="root"|capital-ai-bootstrap-fallback/i);
    assert.ok(html.length > 3000, 'Legal page must have substantive content');
    assert.ok(source.includes(`'/${route}'`), 'Server must match the canonical route');
    assert.ok(source.includes('staticLegalPath'), 'Server must serve the standalone path');
  });
}

test('Privacy notice discloses Google OAuth data handling and data-subject rights', async () => {
  const html = await readFile(new URL('../public/datenschutz/index.html', import.meta.url), 'utf8');
  for (const term of ['Google OAuth', 'Supabase Auth', 'E-Mail-Adresse', 'Rechtsgrundlage', 'Löschung', 'Empfänger', 'Betroffenenrechte', 'Drittland']) {
    assert.ok(html.includes(term), `Missing: ${term}`);
  }
});

test('Standalone privacy page retains every canonical processing disclosure', async () => {
  const html = await readFile(new URL('../public/datenschutz/index.html', import.meta.url), 'utf8');
  const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  for (const activity of PROCESSING_ACTIVITIES) {
    for (const value of [activity.title, activity.purpose, activity.legalBasis, activity.transfer, activity.retention,
      ...activity.dataCategories, ...activity.recipients, ...activity.technicalControls]) {
      assert.ok(html.includes(escape(value)), `Missing canonical disclosure for ${activity.id}: ${value}`);
    }
  }
  assert.doesNotMatch(html, /ZITADEL/i);
});
