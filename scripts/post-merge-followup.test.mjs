import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizePostMerge } from './post-merge-followup.mjs';

const a = 'a'.repeat(40);
const b = 'b'.repeat(40);
const c = 'c'.repeat(40);
const runs = ['Docker Security Gate', 'Domain Governance']
  .map(name => ({ name, status: 'completed', conclusion: 'success', started_at: '2026-10-08T05:00:00Z' }));

test('postmerge evidence never authorizes sync, merge, licenses or production', () => {
  const result = summarizePostMerge({
    eventSha: a, currentMainSha: a, mergedPr: 257, targetPr: 250,
    selectedHead: b, liveHead: b, behindBy: 2, files: ['AGENTS.md'],
    checkRef: c, checkRuns: runs,
  });
  assert.equal(result.synchronizeNextPr.state, 'SYNC_REQUIRED_MANUAL_CODE_UPDATE');
  assert.equal(result.synchronizeNextPr.autoSync, false);
  assert.equal(result.requiredChecks.state, 'CI_SNAPSHOT_PASS_ONLY');
  assert.equal(result.requiredChecks.mergeApproval, false);
  assert.equal(result.humanOwnerApprovalRequired, false);
  assert.equal(result.licenseEvidence.rightsApproval, false);
  assert.equal(result.autoMerge, false);
  assert.equal(result.productionApproval, false);
});

test('changes to selected PR head cannot inherit green CI from the prior head', () => {
  const result = summarizePostMerge({
    eventSha: a, currentMainSha: a, mergedPr: 257, targetPr: 250,
    selectedHead: b, liveHead: c, behindBy: 1, checkRuns: runs, checkRef: c,
  });
  assert.equal(result.selectedHeadChanged, true);
  assert.equal(result.requiredChecks.state, 'REVALIDATION_REQUIRED');
});

test('missing and failing required checks stay NOT_PROVEN or BLOCKED', () => {
  const inputs = { eventSha: a, currentMainSha: a, mergedPr: 257, targetPr: 250, selectedHead: b, liveHead: b };
  assert.equal(summarizePostMerge(inputs).requiredChecks.state, 'NOT_PROVEN');
  const failed = runs.map(run => run.name === 'Docker Security Gate' ? { ...run, conclusion: 'failure' } : run);
  assert.equal(summarizePostMerge({ ...inputs, checkRuns: failed }).requiredChecks.state, 'BLOCKED');
});

test('separate license and security path signals are never approvals', () => {
  const result = summarizePostMerge({
    eventSha: a, currentMainSha: b, mergedPr: 257, targetPr: 250,
    files: ['docs/licenses/rights.md', 'deploy/Dockerfile.nats', 'src/components/Hero.tsx'],
  });
  assert.equal(result.newerMainObserved, true);
  assert.deepEqual(result.securityEvidence.affectedPaths, ['deploy/Dockerfile.nats']);
  assert.deepEqual(result.licenseEvidence.affectedPaths, ['docs/licenses/rights.md']);
  assert.equal(result.securityEvidence.evidenceCompleteness, 'NOT_PROVEN');
  assert.equal(result.licenseEvidence.rightsApproval, false);
});

test('no affected PR creates no mutation or fake check success', () => {
  const result = summarizePostMerge({ eventSha: a, currentMainSha: a, mergedPr: 257 });
  assert.equal(result.selectedPr, null);
  assert.equal(result.requiredChecks.state, 'NOT_APPLICABLE');
  assert.equal(result.securityEvidence.state, 'NOT_APPLICABLE');
  assert.equal(result.autoMerge, false);
});

test('governance and provenance changes are security evidence paths', () => {
  const files = [
    'AGENTS.md',
    '.agents/skills/registry.json',
    'scripts/container-evidence-identity.mjs',
    'scripts/container-evidence-identity.test.mjs',
    'scripts/verify-production-handoff.mjs',
    'scripts/registry-manifest-evidence.test.mjs',
    'scripts/post-merge-followup.mjs',
    'scripts/verify-main-ruleset.test.mjs',
  ];
  const result = summarizePostMerge({
    eventSha: a, currentMainSha: a, mergedPr: 703, targetPr: 705,
    selectedHead: b, liveHead: b, files,
  });
  assert.deepEqual(result.securityEvidence.affectedPaths, files);
  assert.equal(result.securityEvidence.state, 'REVIEW_REQUIRED');
  assert.equal(result.securityEvidence.evidenceCompleteness, 'NOT_PROVEN');
  assert.equal(result.requiredChecks.mergeApproval, false);
  assert.equal(result.autoMerge, false);
  assert.equal(result.productionApproval, false);
});

test('security evidence classification rejects lookalike and unrelated paths', () => {
  const files = [
    'AGENTS.md.bak',
    '.agents/skills/registry.json.old',
    'docs/AGENTS.md',
    'scripts/container-evidence-identity-extra.mjs',
    'scripts/post-merge-followup.test.mjs.tmp',
    'scripts/verify-main-ruleset.mjs.backup',
    'scripts/unrelated.mjs',
    'src/components/Hero.tsx',
  ];
  const result = summarizePostMerge({
    eventSha: a, currentMainSha: a, mergedPr: 703, targetPr: 705,
    selectedHead: b, liveHead: b, files,
  });
  assert.deepEqual(result.securityEvidence.affectedPaths, []);
  assert.equal(result.securityEvidence.evidenceCompleteness, 'NOT_PROVEN');
});

test('existing workflow, infrastructure and auth security paths remain recognized', () => {
  const files = [
    '.github/workflows/build-security.yml',
    'deploy/Dockerfile.nats',
    'supabase/migrations/20261113152000_oauth_client_default_deny.sql',
    'docs/security/OAUTH-RLS-P0-CUTOVER-20261113.md',
    'server/auth.mjs',
    'package-lock.json',
  ];
  const result = summarizePostMerge({
    eventSha: a, currentMainSha: a, mergedPr: 703, targetPr: 705,
    selectedHead: b, liveHead: b, files,
  });
  assert.deepEqual(result.securityEvidence.affectedPaths, files);
  assert.equal(result.licenseEvidence.rightsApproval, false);
});
