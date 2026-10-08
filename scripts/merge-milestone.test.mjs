import test from 'node:test';
import assert from 'node:assert/strict';
import { milestone, milestoneDay, sanitizedTitle, sourcePath, draftBlog } from './merge-milestone.mjs';

const make = number => ({
  number, merged_at: new Date(Date.UTC(2026, 9, 1, 0, number)).toISOString(),
  title: 'Change ' + number,
});

test('milestones fire only for complete groups of ten and twenty merges', () => {
  assert.equal(milestone(Array.from({length: 9}, (_, i) => make(i + 1)), 10), null);
  assert.equal(milestone(Array.from({length: 19}, (_, i) => make(i + 1)), 20), null);
  const ten = milestone(Array.from({length: 19}, (_, i) => make(i + 1)), 10);
  assert.equal(ten.last.number, 10);
  assert.equal(ten.batch.length, 10);
  const twenty = milestone(Array.from({length: 25}, (_, i) => make(i + 1)), 20);
  assert.equal(twenty.last.number, 20);
  assert.equal(twenty.batch.length, 20);
});

test('source-linked titles are sanitized and never claim publication', () => {
  const batch = milestone(Array.from({length: 20}, (_, i) => make(i + 1)), 20);
  const article = draftBlog(batch, 'a'.repeat(40));
  assert.match(article, /Entwurf – nicht veröffentlicht/);
  assert.match(article, /PR #20/);
  assert.equal(sanitizedTitle('<script>alert(1)</script>'), 'script alert(1) /script');
});

test('file evidence cannot escape the repository root', () => {
  assert.equal(sourcePath('../secrets'), null);
  assert.equal(sourcePath('/dev/null'), null);
  assert.equal(sourcePath('src/data/roadmapData.ts'), 'src/data/roadmapData.ts');
});

test('milestone date is stable across retries and rejects invalid merge timestamps', () => {
  assert.equal(milestoneDay('2026-10-08T05:48:16Z'), '20261008');
  assert.equal(milestoneDay('2026-10-08T23:59:59.500Z'), '20261008');
  assert.throws(() => milestoneDay('20261008'), /INVALID_MILESTONE_MERGED_AT/);
  assert.throws(() => milestoneDay('2026-13-08T05:48:16Z'), /INVALID_MILESTONE_MERGED_AT/);
});
