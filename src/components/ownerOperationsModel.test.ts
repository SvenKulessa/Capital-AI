import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AGENT_ROLES, agentFromTitle, evidenceState, ga4EventCount,
  isSnapshotStale, readDashboardSnapshot, visiblePullRequests,
} from './ownerOperationsModel';
const sha = 'a'.repeat(40);
const base = {
  schema: 'CAPITAL_AI_EVIDENCE_DASHBOARD_READBACK@1',
  private: true, readOnly: true, syntheticDataUsed: false, generatedAt: '2026-11-19T04:00:00Z',
  github: { status: 'VERIFIED_PROVIDER_READ', mainSha: sha, pullRequests: [
    { number: 800, title: '[CAPITAL-AI-PLATFORM] Owner Evidence', draft: false, headSha: sha, updatedAt: '2026-11-19T04:00:00Z' },
    { number: 801, title: '[CAPITAL-AI-GROWTH] Attribution', draft: true, headSha: sha, updatedAt: null },
  ], ci: { status: 'NOT_PROVEN', runs: [] } },
  render: { status: 'NOT_PROVEN', reason: 'RENDER_CREDENTIAL_NOT_CONFIGURED' },
  ga4: { status: 'VERIFIED_PROVIDER_READ', events: [
    { eventName: 'page_view', eventCount: 3 }, { eventName: 'purchase', eventCount: 0 },
  ], revenue: null, revenueStatus: 'NOT_PROVEN_NOT_QUERIED' },
  comparison: { mainVsDeploy: 'NOT_PROVEN', runtimeBuildIdentity: 'NOT_PROVEN_INDEPENDENT_READBACK' },
};
test('rejects synthetic, public and malformed trust-boundary payloads', () => {
  assert.equal(readDashboardSnapshot({ ...base, syntheticDataUsed: true }), null);
  assert.equal(readDashboardSnapshot({ ...base, private: false }), null);
  assert.equal(readDashboardSnapshot({ ...base, readOnly: false }), null);
  assert.equal(readDashboardSnapshot({ ...base, generatedAt: '' }), null);
  assert.equal(readDashboardSnapshot({ ...base, github: { ...base.github, pullRequests: {} } }), null);
  assert.ok(readDashboardSnapshot(base));
});
test('agent filters use anchored PR labels without inventing runtime statuses', () => {
  const s = readDashboardSnapshot(base)!;
  assert.deepEqual(AGENT_ROLES, ['TRUST','SECURITY','PLATFORM','PRODUCT','MARKET','GROWTH']);
  assert.equal(agentFromTitle('[CAPITAL-AI-PLATFORM] Evidence'), 'PLATFORM');
  assert.equal(agentFromTitle('[CAPITAL-AI-SECURITY] CodeQL'), 'SECURITY');
  assert.equal(agentFromTitle('[CAPITAL-AI-SECURITY] OAuth isolation'), 'SECURITY');
  assert.equal(agentFromTitle('text [CAPITAL-AI-PLATFORM]'), null);
  assert.equal(visiblePullRequests(s, 'PLATFORM').length, 1);
  assert.equal(visiblePullRequests(s, 'SECURITY').length, 0);
  const securitySnapshot = readDashboardSnapshot({ ...base, github: { ...base.github, pullRequests: [{ number: 802, title: '[CAPITAL-AI-SECURITY] Hardening', draft: false, headSha: sha, updatedAt: null }] } })!;
  assert.equal(visiblePullRequests(securitySnapshot, 'SECURITY').length, 1);
  assert.equal(visiblePullRequests(s, 'ALL', '801').length, 1);
});
test('no inferred revenue, lead, CI success or Render success', () => {
  const s = readDashboardSnapshot(base)!;
  assert.equal(ga4EventCount(s, 'purchase'), 0);
  assert.equal(ga4EventCount(s, 'generate_lead'), null);
  assert.equal(evidenceState(s, 'revenue'), 'NOT_PROVEN');
  assert.equal(evidenceState(s, 'runtime'), 'NOT_PROVEN');
  assert.equal(evidenceState(s, 'ci'), 'NOT_PROVEN');
  assert.equal(evidenceState(s, 'render'), 'NOT_PROVEN');
  assert.equal(evidenceState(s, 'github'), 'VERIFIED');
});
test('age and future clock drift invalidate claimed snapshot freshness', () => {
  const s = readDashboardSnapshot(base)!;
  assert.equal(isSnapshotStale(s, Date.parse('2026-11-19T04:05:00Z')), false);
  assert.equal(isSnapshotStale(s, Date.parse('2026-11-19T04:11:00Z')), true);
  assert.equal(isSnapshotStale(s, Date.parse('2026-11-19T03:58:00Z')), true);
});
