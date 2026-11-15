import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {editorialScore, selectHomeEdition} from './home-editorial-edition.mjs';

const published = JSON.parse(await readFile(new URL('../../src/features/home/homeEditorialEdition.json', import.meta.url)));
const example = published.stories[0];
const asOf = '2026-11-15';
const edition = {...published, date: asOf, stories: published.stories.map((story, i) => ({
  ...story,
  source: {...story.source, date: i === 2 ? '2026-10-29' : '2026-11-12'},
  editorial: {relevance: i === 2 ? 4 : 5, impact: i === 2 ? 3 : 4},
}))};
const candidate = {
  ...example,
  id: 'synthetic-network-update',
  title: 'Synthetische Netzwerkänderung',
  source: {name: 'Solana', url: 'https://solana.com/news/synthetic-network-update', date: '2026-11-14'},
  editorial: {relevance: 5, impact: 5},
};

test('replaces the weakest eligible entry and keeps its graphic and source together', () => {
  const next = selectHomeEdition(edition, [candidate, candidate], asOf);
  assert.equal(next.stories.length, 3);
  assert.equal(next.stories[2].id, candidate.id);
  assert.deepEqual(next.stories[2].graphic, candidate.graphic);
  assert.equal(next.stories[2].source.label, '14. November 2026');
  assert.equal(editorialScore(candidate, asOf), 98);
});

test('retains the same edition with no new and more relevant candidate', () => {
  assert.equal(selectHomeEdition(edition, [], asOf), edition);
  assert.equal(selectHomeEdition(edition, [edition.stories[0]], asOf), edition);
  assert.equal(selectHomeEdition(edition, [{...candidate, title: example.title}], asOf), edition);
  assert.equal(selectHomeEdition(edition, [{...candidate, editorial: {relevance: 1, impact: 0}}], asOf), edition);
  assert.equal(selectHomeEdition(edition, [{...candidate, source: {...candidate.source, date: '2026-10-28'}}], asOf), edition);
  assert.equal(selectHomeEdition(edition, [{...candidate, editorial: {relevance: 3, impact: 2}}], asOf), edition);
});

test('rejects malformed sources, future dates and absent visuals', () => {
  assert.throws(() => selectHomeEdition(edition, [{...candidate, graphic: null}], asOf), /Invalid editorial/);
  assert.throws(() => selectHomeEdition(edition, [{...candidate, source: {...candidate.source, url: 'https://solana.com.evil.test/news'}}], asOf), /allowlist/);
  assert.throws(() => selectHomeEdition(edition, [{...candidate, source: {...candidate.source, date: '2026-11-16'}}], asOf), /Future/);
});
