import assert from 'node:assert/strict';
import test from 'node:test';

import { VOCABULARY_TERMS } from '../vocabularyData';
import {
  VOCABULARY_PUBLIC_COUNT,
  vocabularyMetadata,
} from '../../../shared/vocabulary-metadata.mjs';

function normalize(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('de-DE').replace(/[^a-z0-9äöüß]+/g, '');
}

test('repository vocabulary is deduplicated and exposes exactly three thesaurus entries per term', () => {
  assert.equal(VOCABULARY_TERMS.length, 294, 'expected the merged four-repository vocabulary count');
  assert.equal(VOCABULARY_PUBLIC_COUNT, VOCABULARY_TERMS.length, 'SEO projection count must match visible vocabulary');

  const normalizedTerms = VOCABULARY_TERMS.map((term) => normalize(term.term));
  assert.equal(new Set(normalizedTerms).size, normalizedTerms.length, 'term names must be deduplicated');

  for (const term of VOCABULARY_TERMS) {
    assert.equal(term.thesaurus.length, 3, `${term.id} must expose exactly three thesaurus entries`);
    for (const equivalent of term.thesaurus) {
      assert.ok(equivalent.trim().length > 0, `${term.id} contains an empty thesaurus entry`);
    }
  }
});

test('presentation vocabulary does not expose repository path provenance', () => {
  for (const term of VOCABULARY_TERMS) {
    assert.equal('sourcePath' in term, false);
    assert.equal('sourceFile' in term, false);
    assert.equal('sourceDocument' in term, false);
  }
});


test('SEO vocabulary projection is one-to-one with visible terms', () => {
  const vocabularyIds = VOCABULARY_TERMS.map((term) => term.id).sort();
  const seoIds = vocabularyMetadata.map((entry) => entry.id).sort();

  assert.deepEqual(seoIds, vocabularyIds);
  assert.equal(new Set(vocabularyMetadata.map((entry) => entry.path)).size, vocabularyMetadata.length);

  for (const entry of vocabularyMetadata) {
    assert.equal(entry.path, `/vocabulary/${entry.id}`);
    assert.equal(entry.thesaurus.length, 3);
    assert.equal('sourcePath' in entry, false);
    assert.equal('sourceFile' in entry, false);
    assert.equal('sourceDocument' in entry, false);
  }
});
