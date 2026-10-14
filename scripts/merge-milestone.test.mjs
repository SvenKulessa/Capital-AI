import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { milestone, milestoneDay, sanitizedTitle, sourcePath, draftBlog } from './merge-milestone.mjs';
import { planMilestoneDrafts } from './merge-milestone-pr-plan.mjs';

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

test('different roadmap and news milestones are processed independently', () => {
  assert.deepEqual(planMilestoneDrafts({
    roadmapNumber: '482', roadmapDate: '20261014', newsNumber: '470', newsDate: '20261013',
  }), [
    { scope: 'roadmap', number: '482', date: '20261014' },
    { scope: 'news', number: '470', date: '20261013' },
  ]);
});

test('matching milestones remain one consolidated PR; single and empty milestones work', () => {
  assert.deepEqual(planMilestoneDrafts({
    roadmapNumber: '470', roadmapDate: '20261013', newsNumber: '470', newsDate: '20261013',
  }), [{ scope: 'combined', number: '470', date: '20261013' }]);
  assert.deepEqual(planMilestoneDrafts({ newsNumber: '470', newsDate: '20261013' }),
    [{ scope: 'news', number: '470', date: '20261013' }]);
  assert.deepEqual(planMilestoneDrafts({ roadmapNumber: '482', roadmapDate: '20261014' }),
    [{ scope: 'roadmap', number: '482', date: '20261014' }]);
  assert.deepEqual(planMilestoneDrafts(), []);
});

test('invalid scope inputs and malformed dates fail closed before writing any PR', () => {
  assert.throws(() => planMilestoneDrafts({ roadmapNumber: '482' }), /INVALID_MILESTONE_IDENTITY/);
  assert.throws(() => planMilestoneDrafts({ newsDate: '20261013' }), /INVALID_MILESTONE_IDENTITY/);
  assert.throws(() => planMilestoneDrafts({ roadmapNumber: '4; rm -rf /', roadmapDate: '20261014' }), /INVALID_MILESTONE_IDENTITY/);
  assert.throws(() => planMilestoneDrafts({ roadmapNumber: '482', roadmapDate: '20260230' }), /INVALID_MILESTONE_DATE/);
  assert.throws(() => planMilestoneDrafts({ newsNumber: '470', newsDate: '2026101x' }), /INVALID_MILESTONE_IDENTITY/);
});

test('workflow keeps independent provenance, dedicated App authority, legacy idempotency and no publication', () => {
  const workflow = readFileSync('.github/workflows/merge-milestones.yml', 'utf8');
  assert.match(workflow, /Open provenance-scoped milestone draft PRs/);
  assert.match(workflow, /node scripts\/merge-milestone-pr-plan\.mjs/);
  assert.match(workflow, /while IFS='\|' read -r scope number date_suffix/);
  assert.match(workflow, /milestone-merge-pr-\$number-\$date_suffix/);
  assert.match(workflow, /milestone-\$scope-pr-\$number-\$date_suffix/);
  assert.match(workflow, /targets\+=\("src\/data\/roadmapMergeReconciliation\.json"/);
  assert.match(workflow, /targets\+=\("src\/data\/controlCenterNews\.json"/);
  assert.match(workflow, /gh pr list --repo/);
  assert.match(workflow, /remote_status != 2/);
  assert.match(workflow, /steps\.milestone_app\.outputs\.token != ''/);
  assert.match(workflow, /--draft --title/);
  assert.equal((workflow.match(/gh pr create --repo/g) ?? []).length, 1);
  assert.doesNotMatch(workflow, /Roadmap and news milestones have different source PRs/);
  assert.doesNotMatch(workflow, /^\s*(?:gh\s+pr\s+merge|gh\s+release\s+create|node\s+scripts\/[^\n]*publish)/m);
});
