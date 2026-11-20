import test from 'node:test';
import assert from 'node:assert/strict';
import { SECURITY_RESEARCH_VOCABULARY } from './security-research-vocabulary.mjs';
import { vocabularyMetadata, vocabularyMetadataByPath } from './vocabulary-metadata.mjs';

const expected = new Set([
  'learning-null-denominator',
  'learning-clopper-pearson-upper-bound',
  'learning-system-on-chip-soc',
  'learning-digital-object-identifier-doi',
  'learning-arxiv-identifier',
]);
test('SECURITY_RESEARCH terms are unique, public, categorized and source-linked', () => {
  assert.equal(SECURITY_RESEARCH_VOCABULARY.length, 5);
  assert.deepEqual(new Set(SECURITY_RESEARCH_VOCABULARY.map(term => term.id)), expected);
  for (const term of SECURITY_RESEARCH_VOCABULARY) {
    assert.ok(['DATA_EVIDENCE', 'MOBILE_RUNTIME'].includes(term.category));
    assert.equal(term.thesaurus.length, 3);
    assert.ok(term.shortDefinition.length > 30);
    assert.ok(term.sources.every(source => new URL(source.url).protocol === 'https:'));
    const seo = vocabularyMetadataByPath.get('/vocabulary/' + term.id);
    assert.ok(seo, term.id + ' absent from canonical SEO projection');
    assert.equal(seo.term, term.term);
    assert.equal(seo.category, term.categoryLabel);
  }
  assert.equal(new Set(vocabularyMetadata.map(term => term.id)).size, vocabularyMetadata.length);
});
test('statistics entries cannot assert real-world malware detection', () => {
  const all = SECURITY_RESEARCH_VOCABULARY.map(term => term.shortDefinition + ' ' + term.detailedExplanation).join(' ');
  assert.doesNotMatch(all, /AI-DeviceCare erkennt (?:alle|zuverlässig) Malware/i);
  assert.match(SECURITY_RESEARCH_VOCABULARY.find(term => term.id === 'learning-null-denominator').detailedExplanation, /NOT_PROVEN/);
});
