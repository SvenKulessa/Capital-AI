import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AGENT_ROLES, agentFromTitle, evidenceState, ga4DiagnosticLabel, ga4EventCount, ga4RealtimeEventCount,
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
  ], realtimeStatus: 'VERIFIED_PROVIDER_READ', realtimeEvents: [
    { eventName: 'page_view', eventCount: 2 },
  ], revenue: null, revenueStatus: 'NOT_PROVEN_NOT_QUERIED' },
  comparison: { mainVsDeploy: 'NOT_PROVEN', runtimeBuildIdentity: 'NOT_PROVEN_INDEPENDENT_READBACK' },
};
test('rejects synthetic, public and malformed trust-boundary payloads', () => {
  assert.equal(readDashboardSnapshot({ ...base, syntheticDataUsed: true }), null);
  assert.equal(readDashboardSnapshot({ ...base, private: false }), null);
  assert.equal(readDashboardSnapshot({ ...base, readOnly: false }), null);
  assert.equal(readDashboardSnapshot({ ...base, generatedAt: '' }), null);
  assert.equal(readDashboardSnapshot({ ...base, github: { ...base.github, pullRequests: {} } }), null);
  assert.equal(readDashboardSnapshot({ ...base, ga4: { ...base.ga4, realtimeEvents: {} } }), null);
  assert.ok(readDashboardSnapshot(base));
});
test('TypeScript evidence requires blocked repo decision and exact immutable main provenance', () => {
  const ts = {
    status: 'VERIFIED_PROVIDER_READ', state: 'BLOCKED', classification: 'BINARY_AFFECTED',
    dependency: 'typescript', currentVersion: '6.0.3', candidateVersion: '7.0.2',
    evaluatedAt: '2026-11-19T06:10:46.574Z', reviewOnOrAfter: '2026-12-03',
    reasonCode: 'NATIVE_BUILD_TOOL_BINARY_VULNERABILITY', binarySha256: 'sha256:' + 'f'.repeat(64),
    evidenceScope: 'REPOSITORY_DECISION_HISTORICAL_SCAN_NOT_LIVE_BINARY_VERIFICATION',
    evidenceUrl: 'https://github.com/SvenKulessa/Capital-AI/blob/' + sha +
      '/docs/security/evidence/dependency-decisions/typescript-7.0.2.json',
  };
  assert.ok(readDashboardSnapshot({ ...base, github: { ...base.github, typescript: ts } }));
  for (const change of [
    { state: 'APPROVED' }, { classification: 'NOT_AFFECTED' }, { evidenceUrl: 'https://evil.example/decision' },
    { evidenceUrl: ts.evidenceUrl.replace(sha, 'b'.repeat(40)) }, { binarySha256: 'oops' },
    { currentVersion: ['6.0.3'] }, { reviewOnOrAfter: '2026-02-31' },
  ]) {
    assert.equal(readDashboardSnapshot({ ...base, github: { ...base.github, typescript: { ...ts, ...change } } }), null);
  }
  assert.ok(readDashboardSnapshot({ ...base, github: { ...base.github,
    typescript: { status: 'NOT_PROVEN', reason: 'TS7_EVIDENCE_UNAVAILABLE' } } }));
  assert.equal(readDashboardSnapshot({ ...base, github: { ...base.github,
    typescript: { status: 'NOT_PROVEN', reason: 'secret-provider-error' } } }), null);
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
  assert.equal(ga4RealtimeEventCount(s, 'page_view'), 2);
  assert.equal(ga4RealtimeEventCount(s, 'generate_lead'), null);
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

test('GA4 realtime values remain NOT_PROVEN if source is missing, unverified or malformed', () => {
  const s = readDashboardSnapshot(base)!;
  s.ga4.realtimeStatus = 'NOT_PROVEN';
  assert.equal(ga4RealtimeEventCount(s, 'page_view'), null);
  s.ga4.realtimeStatus = 'VERIFIED_PROVIDER_READ';
  s.ga4.realtimeEvents = [{ eventName: 'page_view', eventCount: -1 }];
  assert.equal(ga4RealtimeEventCount(s, 'page_view'), null);
  s.ga4.status = 'NOT_PROVEN';
  assert.equal(ga4RealtimeEventCount(s, 'page_view'), null);
});

test('owner-only GA4 diagnostic labels reject arbitrary provider error text', () => {
  assert.match(ga4DiagnosticLabel('GA4_PROPERTY_CONFIG_MISSING'), /Property/);
  assert.match(ga4DiagnosticLabel('GA4_MCP_RUNTIME_UNAVAILABLE'), /MCP/);
  assert.match(ga4DiagnosticLabel('GA4_PROPERTY_ACCESS_NOT_PROVEN'), /Zugriff/);
  assert.equal(ga4DiagnosticLabel('GA4_MCP_RUNTIME_UNAVAILABLE secret-token'), 'GA4-Readback nicht nachgewiesen');
  assert.equal(ga4DiagnosticLabel('confidential provider error'), 'GA4-Readback nicht nachgewiesen');
});

test('AcodeX archive is separately validated and never promoted to live provider status', () => {
  const archive = {
    workstream: 'PLATFORM / ACODEX_P1_V2', evidenceVersion: '1.1.0',
    classification: 'HISTORICAL_REFERENCE_ONLY',
    provenance: 'OWNER_TERMINAL_OUTPUT_AND_DRIVE_SHA256_READBACK',
    archiveStatus: 'VERIFIED', currentDeviceStatus: 'NOT_PROVEN',
    baselineUtc: '2026-11-18T23:11:25Z', expectedStartUtc: '2026-11-19T00:41:03Z',
    latestSuccessUtc: '2026-11-19T00:41:28Z', checkedUtc: '2026-11-19T00:43:05Z',
    healthExit: 0, outerExit: 0, guardAuditExit: 0, lockClear: true,
    newOAuthFailures: 0, newPullFailures: 0,
    evidence: {
      v1: { url: 'https://drive.google.com/file/d/1x_bhZ_HdgL-OKuHlPgYIk--5DB0KtwOA/view?usp=drivesdk', sha256: '991b97eef4f31a69ece605347d9b6aeebc8405f0fcd30ee7e96d03869c5e5afd' },
      v11: { url: 'https://drive.google.com/file/d/18s5PsFUI2qc-0s58O-f3ECCrYA8bu9T2/view?usp=drivesdk', sha256: '89b2215cf85420928c70271dffa38ee4ad51ccd07d1832b4bb35192e28c892a3' },
      standard: { url: 'https://drive.google.com/file/d/1CZTMusHxrA2ZR6xp-Q-iPVFcNwNTyb_h/view?usp=drivesdk', sha256: 'be03a2c479eddc1a40d4bad133e34b41e20039aa27ee5a776b05a24571d9eb17' },
    },
  };
  const snapshot = readDashboardSnapshot({ ...base, acodex: archive });
  assert.ok(snapshot);
  assert.equal(snapshot.acodex?.archiveStatus, 'VERIFIED');
  assert.equal(snapshot.acodex?.currentDeviceStatus, 'NOT_PROVEN');
  assert.equal(evidenceState(snapshot, 'ci'), 'NOT_PROVEN');
  assert.equal(readDashboardSnapshot(base)?.acodex, undefined); // backwards-compatible, absent is not live
  assert.equal(readDashboardSnapshot({ ...base, acodex: { ...archive, currentDeviceStatus: 'VERIFIED' } }), null);
  assert.equal(readDashboardSnapshot({ ...base, acodex: { ...archive, archiveStatus: 'NOT_PROVEN' } }), null);
  assert.equal(readDashboardSnapshot({ ...base, acodex: { ...archive, healthExit: 1 } }), null);
  assert.equal(readDashboardSnapshot({ ...base, acodex: { ...archive, checkedUtc: 'not-a-time' } }), null);
  assert.equal(readDashboardSnapshot({ ...base, acodex: { ...archive, evidence: { ...archive.evidence, v11: { ...archive.evidence.v11, sha256: 'x'.repeat(64) } } } }), null);
  assert.equal(readDashboardSnapshot({ ...base, acodex: { ...archive, evidence: { ...archive.evidence, v11: { ...archive.evidence.v11, url: 'https://evil.example/exfiltrate?token=fixture' } } } }), null);
});
