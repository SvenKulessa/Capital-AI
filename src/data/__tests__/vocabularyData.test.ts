import assert from 'node:assert/strict';
import test from 'node:test';

import { VOCABULARY_TERMS } from '../vocabularyData';

function normalize(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('de-DE').replace(/[^a-z0-9äöüß]+/g, '');
}

test('repository vocabulary is deduplicated and exposes exactly three thesaurus entries per term', () => {
  assert.ok(VOCABULARY_TERMS.length > 250, 'expected the four-repository vocabulary projection');

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
