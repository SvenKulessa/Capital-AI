import test from 'node:test';
import assert from 'node:assert/strict';
import { projectSocialTrendCandidates, socialTrendRecordSha256 } from './social-trend-projection.mjs';
const asOf = '2026-11-24T12:00:00.000Z';
const record = (i, views = 100, overrides = {}) => ({ platform: 'X', postId: String(i), sourceUrl: 'https://x.com/example/status/' + i, publishedAt: '2026-11-22T12:00:00.000Z', observedAt: asOf, views, metric: 'views', niche: 'fintech', format: 'post', accountBand: 'small', ...overrides });
const baseline = () => Array.from({ length: 30 }, (_, i) => record(i + 1));
const grant = r => ({ recordSha256: socialTrendRecordSha256(r, asOf), analyticsAllowed: true, evidenceRef: 'synthetic-test-only' });
const project = (rows, grants = rows.map(grant)) => projectSocialTrendCandidates(rows, { asOf, trustedAnalyticsGrants: grants });

test('source-recorded outlier uses 30 comparable peers without publishing authority', () => {
  const rows = [...baseline(), record(31, 250)];
  const out = project(rows);
  assert.equal(out.analyzedTrendsCount, 31);
  assert.equal(out.candidates.length, 1);
  assert.equal(out.candidates[0].peerCount, 30);
  assert.equal(out.candidates[0].medianPeerViews, 100);
  assert.equal(out.candidates[0].medianRatio, 2.5);
  assert.equal(out.candidates[0].status, 'SOURCE_RECORDED_NOT_AUTHENTICATED');
  assert.equal(out.providerCalls, 0);
  assert.equal(out.publicPublishAllowed, false);
  assert.equal(out.providerAuthentication, 'NOT_PROVEN');
  assert.deepEqual(project([...rows].reverse()), out);
});
test('missing payload, zero median, ties and mixed cohorts cannot establish outliers', () => {
  assert.equal(project([]).status, 'NOT_PROVEN');
  assert.equal(project([...baseline().slice(1), record(31, 250)]).analyzedTrendsCount, 0);
  assert.equal(project([...baseline().map((_, i) => record(i + 1, 0)), record(31, 250)]).candidates.length, 0);
  assert.equal(project([...baseline(), record(31)]).candidates.length, 0);
  for (const overrides of [{ metric: 'impressions' }, { niche: 'crypto' }, { accountBand: 'large' }, { publishedAt: '2026-11-21T12:00:00.000Z' }, { format: 'video' }]) {
    assert.equal(project([...baseline(), record(31, 250, overrides)]).candidates.length, 0);
  }
});
test('duplicates, stale data, foreign URLs, extra fields and altered metrics fail closed', () => {
  const candidate = record(31, 250);
  const rows = [...baseline(), candidate];
  assert.equal(project([...rows, { ...candidate, views: -1 }]).candidates.length, 0);
  for (const overrides of [{ sourceUrl: 'https://evil.example/status/31' }, { sourceUrl: 'https://x.com/example/status/99' }, { sourceUrl: 'https://x.com/example/status/31?token=secret' }, { observedAt: '2026-11-23T11:00:00.000Z' }, { views: -1 }, { rightsVerified: true }]) {
    assert.equal(project([...baseline(), { ...candidate, ...overrides }]).candidates.length, 0);
  }
  assert.equal(project(rows, rows.slice(0, 30).map(grant)).rightsBlockedCount, 1);
  assert.equal(project(rows, [...rows.map(grant), grant(candidate)]).rightsBlockedCount, 1);
  assert.equal(project([...baseline(), record(31, 300)], rows.map(grant)).rightsBlockedCount, 1);
  assert.equal(project(rows, []).analyzedTrendsCount, 0);
});
test('separate platform URL and format contracts', () => {
  for (const r of [record(31, 200, { platform: 'TikTok', sourceUrl: 'https://www.tiktok.com/@example/video/31', format: 'short' }), record(31, 200, { platform: 'Instagram', sourceUrl: 'https://www.instagram.com/reel/31/', format: 'reel' }), record(31, 200, { platform: 'YouTube', sourceUrl: 'https://www.youtube.com/shorts/31', format: 'short' }), record(31, 200, { platform: 'YouTube', sourceUrl: 'https://www.youtube.com/watch?v=31', format: 'long' })]) assert.match(socialTrendRecordSha256(r, asOf), /^[a-f0-9]{64}$/);
  assert.throws(() => project(Array(1001).fill(record(1))), /SOCIAL_TREND_BATCH_INVALID/);
});
