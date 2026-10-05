import assert from 'node:assert/strict';
import test from 'node:test';

import { VOCABULARY_TERMS } from '../vocabularyData';
import {
  VOCABULARY_CANONICAL_COUNT,
  VOCABULARY_PUBLIC_COUNT,
  vocabularyMetadata,
} from '../../../shared/vocabulary-metadata.mjs';
import { QUANT_PRO_COUNT, QUANT_PRO_IDS } from '../../../shared/vocabulary-access-policy.mjs';

function normalize(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('de-DE').replace(/[^a-z0-9äöüß]+/g, '');
}

test('browser vocabulary contains no paid Quant/Pro payload and canonical total remains stable', () => {
  assert.ok(VOCABULARY_TERMS.length > 0);
  assert.ok(QUANT_PRO_COUNT > 0);
  assert.equal(
    VOCABULARY_TERMS.length + QUANT_PRO_COUNT,
    VOCABULARY_CANONICAL_COUNT,
    'public plus owner-gated Quant/Pro index must preserve the canonical merged count',
  );
  assert.equal(VOCABULARY_CANONICAL_COUNT, 294, 'canonical vocabulary count remains stable');
  assert.equal(VOCABULARY_PUBLIC_COUNT, VOCABULARY_TERMS.length, 'public Vocabulary count matches browser-safe entries');
  assert.equal(VOCABULARY_TERMS.some((term) => term.level === 'Quant / Pro'), false);

  const normalizedTerms = VOCABULARY_TERMS.map((term) => normalize(term.term));
  assert.equal(new Set(normalizedTerms).size, normalizedTerms.length, 'public term names must be deduplicated');

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

test('canonical metadata covers public and server-only terms exactly once', () => {
  const vocabularyIds = [...VOCABULARY_TERMS.map((term) => term.id), ...QUANT_PRO_IDS].sort();
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
