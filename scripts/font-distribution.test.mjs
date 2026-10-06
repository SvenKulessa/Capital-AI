import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));

test('distributed fonts and OFL match the pinned upstream blobs', () => {
  const provenance = JSON.parse(read('public/fonts/provenance.json'));
  assert.equal(provenance.upstreamCommit, '23e54b51ddffbc7713c583748e3bd86f62b1fa4a');
  for (const file of provenance.files) {
    const bytes = read(file.path);
    assert.equal(bytes.length, file.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256);
    assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), file.upstreamGitBlob);
  }
  assert.deepEqual(read('public/fonts/OFL.txt'), read('docs/security/evidence/license-sources/Plus-Jakarta-Sans-OFL.txt'));
});

test('font requests and license access stay on the application origin', () => {
  const html = read('index.html').toString();
  assert.doesNotMatch(html, /fonts\.(?:googleapis|gstatic)\.com/);
  assert.match(html, /href="\/fonts\/plus-jakarta-sans.css"/);
  const css = read('public/fonts/plus-jakarta-sans.css').toString();
  assert.match(css, /PlusJakartaSans-Regular\.ttf/);
  assert.match(css, /PlusJakartaSans-Italic\.ttf/);
  assert.doesNotMatch(css, /https?:\/\//);
  assert.match(read('src/features/documentation/DocumentationHub.tsx').toString(), /href: '\/fonts\/OFL.txt'/);
});
