import test from 'node:test';
import assert from 'node:assert/strict';

import { vocabularyMetadata } from '../shared/vocabulary-metadata.mjs';
import { seoIndexableStaticPaths } from '../shared/seo-indexing-policy.mjs';
import {
  SEO_CONTENT_MANIFEST,
  SEO_CONTENT_SOURCE_SHA,
  SEO_CONTENT_BY_PATH,
  seoContentForPath,
  validateSeoContentManifest,
} from '../shared/seo-content-manifest.mjs';

test('SEO-01 manifest covers every INDEX route exactly once', () => {
  const expected = [...seoIndexableStaticPaths(), ...vocabularyMetadata.map((entry) => entry.path)].sort();
  const actual = SEO_CONTENT_MANIFEST.map((entry) => entry.path).sort();

  assert.deepEqual(actual, expected);
  assert.equal(SEO_CONTENT_MANIFEST.length, expected.length);
  assert.equal(SEO_CONTENT_BY_PATH.size, expected.length);
  assert.deepEqual(validateSeoContentManifest(), []);
});

test('SEO-01 provenance and eligibility are explicit for every manifest entry', () => {
  assert.match(SEO_CONTENT_SOURCE_SHA, /^[0-9a-f]{40}$/);
  for (const entry of SEO_CONTENT_MANIFEST) {
    assert.equal(entry.sourceSha, SEO_CONTENT_SOURCE_SHA);
    assert.equal(entry.searchEligible, true);
    assert.equal(typeof entry.socialEligible, 'boolean');
    assert.equal(typeof entry.aiSearchEligible, 'boolean');
    assert.equal(entry.license, 'PROPRIETARY');
    assert.ok(entry.sourceRefs.length > 0);
    assert.ok(entry.canonical.startsWith('https://capital-ai.online/'));
    assert.notEqual(entry.structuredDataType, 'FinancialService');
  }
});

test('SEO-01 has unique slugs, canonicals and titles', () => {
  for (const key of ['slug', 'canonical', 'title']) {
    const values = SEO_CONTENT_MANIFEST.map((entry) => entry[key]);
    assert.equal(new Set(values).size, values.length, key);
  }
});

test('SEO-01 returns only admitted content paths', () => {
  assert.equal(seoContentForPath('/').slug, 'home');
  assert.equal(seoContentForPath('/vocabulary/orderbuch').structuredDataType, 'DefinedTerm');
  assert.equal(seoContentForPath('/profile'), null);
  assert.equal(seoContentForPath('/tokenomics'), null);
  assert.equal(seoContentForPath('/not-inventory'), null);
});
