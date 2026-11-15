import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  advanceNewsEdition, retireNews, newsArchivePath, proposeMarketImpact, newsBiCsv, publishedNews,
} from '../../shared/news-lifecycle.mjs';

const original = JSON.parse(readFileSync(new URL('../../src/features/home/homeEditorialEdition.json', import.meta.url), 'utf8'));
const empty = {version: 1, overview: [], archive: []};
const nextWith = (previous, n) => ({
  ...previous, date: '2026-11-15',
  stories: [ { ...previous.stories[0], id: 'new-' + n,
    source: {...previous.stories[0].source, url: 'https://polygon.technology/blog/synthetic-' + n} },
    ...previous.stories.slice(0, 2)],
});
test('displaced stories go to overview (max 3), then dated category folders in archive', () => {
  let before = original;
  let index = empty;
  for (let n = 1; n <= 5; n++) {
    const after = nextWith(before, n);
    index = retireNews(before, after, index, '2026-11-15');
    assert.ok(index.overview.length <= 3);
    before = after;
  }
  assert.equal(index.overview.length, 3);
  assert.equal(index.archive.length, 2);
  assert.equal(new Set([...index.overview, ...index.archive].map(x => x.id)).size, 5);
  assert.match(index.archive[0].archivePath, /^news-archive\/[a-z]+\/2026\/11\/\d{2}\/[a-z0-9-]+\.json$/);
  assert.equal(index.archive[0].rights.status, 'REVIEW_REQUIRED');
  assert.equal(index.archive[0].marketImpact.status, 'NOT_PROVEN');
});
test('no replacement keeps previous history and prevents replay, duplicates or mutation', () => {
  assert.equal(retireNews(original, original, empty), empty);
  const after = nextWith(original, 1);
  const state = retireNews(original, after, empty);
  assert.throws(() => retireNews(original, after, state), /replay/);
  assert.throws(() => retireNews(original, {...after, stories: [after.stories[0], after.stories[0], after.stories[2]]}, empty), /Duplicate/);
  assert.throws(() => retireNews(original, {...original, stories: original.stories.map((s, i) => i ? s : {...s, title: 'Tampered'})}, empty), /snapshot changed/);
  assert.throws(() => newsArchivePath({...original.stories[0], id:'../escape'}), /Invalid news ID/);
});
test('existing content selection is reused without duplicating lifecycle, no fabricated replacement', () => {
  const output = advanceNewsEdition(original, empty, [], '2026-11-15');
  assert.equal(output.edition, original);
  assert.equal(output.index, empty);
});
test('retrospective impact remains pending despite numerical calculation; provenance and dates required', () => {
  const story = retireNews(original, nextWith(original, 1), empty).overview[0];
  const input = {asset:'POL', benchmark:'MARKET', provider:'Licensed Provider', licenseEvidenceRef:'license:123',
    dataEvidenceRef:'data:456', reviewer:'Reviewer', assessedAt:'2026-12-15', observedAt:'2026-12-15',
    assetBefore:100, assetAfter:112, benchmarkBefore:100, benchmarkAfter:106,
    persistence:3, breadth:2, windowDays:30};
  const result = proposeMarketImpact(story, input);
  assert.equal(result.status, 'REVIEW_REQUIRED');
  assert.equal(result.verifiedScore, null);
  assert.ok(result.proposedScore > 0);
  assert.ok(Math.abs(result.relativeChangePp - 6) < 0.001);
  assert.throws(() => proposeMarketImpact(story, {...input, licenseEvidenceRef:''}), /provenance/);
  assert.throws(() => proposeMarketImpact(story, {...input, assetBefore:0}), /market data/);
  assert.throws(() => proposeMarketImpact(story, {...input, observedAt:'2026-01-01'}), /window/);
});
test('public projection and CSV fail closed, avoid formula injection', () => {
  const story = retireNews(original, nextWith(original, 1), empty).overview[0];
  assert.equal(publishedNews([story]).length, 0);
  assert.equal(publishedNews([{...story, rights:{status:'APPROVED',evidenceRef:'review:123'}}]).length, 1);
  const csv = newsBiCsv([{...story, id:'=HYPERLINK("evil")'}]);
  assert.match(csv, /'=/);
  assert.match(csv, /NOT_PROVEN/);
  assert.doesNotMatch(csv, /,100,/);
});
