import assert from 'node:assert/strict';
import test from 'node:test';

import { VOCABULARY_TERMS, vocabularySkillLevel } from '../vocabularyData';
import videoLesson from '../../../shared/video-learning-demo.json';
import {
  VOCABULARY_CANONICAL_COUNT,
  VOCABULARY_PUBLIC_COUNT,
  vocabularyMetadata,
} from '../../../shared/vocabulary-metadata.mjs';
import researchedVocabulary from '../../../shared/researched-vocabulary.json';

function normalize(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('de-DE').replace(/[^a-z0-9äöüß]+/g, '');
}

test('every canonical glossary definition is public and the total stays synchronized', () => {
  assert.ok(VOCABULARY_TERMS.length > 0);
  assert.equal(
    VOCABULARY_TERMS.length,
    VOCABULARY_CANONICAL_COUNT,
    'public glossary must cover the complete canonical catalog',
  );
  assert.equal(VOCABULARY_CANONICAL_COUNT, vocabularyMetadata.length);
  assert.ok(VOCABULARY_TERMS.some(term=>term.id==='quant-point-in-time-demo')); 
  assert.equal(VOCABULARY_PUBLIC_COUNT, VOCABULARY_TERMS.length, 'public Vocabulary count matches browser-safe entries');
  assert.equal(VOCABULARY_TERMS.some((term) => term.level === 'Quant / Pro'), true);

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

test('canonical metadata covers all public terms exactly once', () => {
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


test('researched glossary additions include primary sources, complete lessons and no duplicate IDs',()=>{
  const ids = new Set(VOCABULARY_TERMS.map(term=>term.id));
  assert.equal(ids.size,VOCABULARY_TERMS.length);
  for(const term of researchedVocabulary) {
    assert.ok(ids.has(term.id));
    assert.ok(term.practicalExample.startsWith('Synthetische Demo:'));
    assert.ok(term.shortDefinition && term.detailedExplanation && term.formulaOrRule && term.keyTakeaway);
    assert.equal(term.thesaurus.length,3);
    assert.ok(term.sources.length>0);
    for(const source of term.sources) assert.ok(['scikit-learn.org','www.ecb.europa.eu','data.ecb.europa.eu'].includes(new URL(source.url).hostname));
  }
});

test('simple video lesson uses an actual Elite glossary term and no repository instructions',()=>{
 const term=VOCABULARY_TERMS.find(term=>term.term===videoLesson.term);
 assert.ok(term);assert.equal(vocabularySkillLevel(term),videoLesson.skillLevel);
 assert.equal(videoLesson.skillLevel,'Elite');
 assert.doesNotMatch(JSON.stringify(videoLesson),/PR #|github|supabase|repo|npm |git |api[_ -]?key|secret/i);
});
