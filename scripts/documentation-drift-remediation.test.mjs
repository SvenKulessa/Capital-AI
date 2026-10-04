import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildDocumentationRepairPlan,
  applyDocumentationRepairPlan,
  transformMarker,
} from './documentation-drift-remediation.mjs';
import { classifyDocumentationRepair, DOCUMENTATION_ACTIONS } from './post-merge-correlation.mjs';

const MAIN = 'a'.repeat(40);
const OLD = 'b'.repeat(40);
const FINGERPRINT = 'STALE_CURRENT_MAIN_METADATA@1';

function rootFixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-remediation-'));
  for (const [file, content] of Object.entries(files)) {
    const absolute = path.join(root, file);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, content);
  }
  return root;
}

function profile() {
  return {
    selfHealing: {
      prProposal: {
        enabled: true,
        mode: 'PR_ONLY',
        approvedRepairFingerprint: FINGERPRINT,
        promotionEvidenceRef: 'docs/growth/DOCUMENTATION-DRIFT-VALIDATION-20261004.json',
        allowedTransformIds: [
          'CURRENT_MAIN_TO_IMPLEMENTATION_BASELINE',
          'MAIN_SNAPSHOT_TO_HISTORICAL_SOURCE',
          'MAIN_REF_TO_IMPLEMENTATION_BASELINE',
        ],
        allowedExactPaths: ['README.md', 'src/data/roadmapData.ts'],
        allowedPrefixes: ['docs/growth/', 'docs/architecture/'],
        forbiddenExactPaths: ['AGENTS.md'],
        forbiddenPrefixes: ['docs/security/', 'contracts/', '.github/', 'deploy/', 'server/', 'supabase/'],
        expectedMainShaRequired: true,
        autoMerge: false,
        productionAuthority: false,
      },
    },
  };
}

function validation() {
  return {
    repairFingerprint: FINGERPRINT,
    validation: {
      requiredIndependentPositiveCycles: 3,
      positiveIndependentCycles: 3,
    },
    promotion: {
      sameRepairFingerprint: true,
      deterministicLowRiskClass: true,
      eligibleForDocSh02: true,
      autoRepairEnabled: false,
      autoMergeAllowed: false,
      productionAuthority: false,
    },
  };
}

test('three validated marker forms map to bounded transforms', () => {
  assert.equal(transformMarker(`Current-main baseline for this slice: \`${OLD}`).transformId, 'CURRENT_MAIN_TO_IMPLEMENTATION_BASELINE');
  assert.equal(transformMarker(`Main-Snapshot ${OLD}`).transformId, 'MAIN_SNAPSHOT_TO_HISTORICAL_SOURCE');
  assert.deepEqual(
    transformMarker(`main@${OLD}`),
    { transformId: 'MAIN_REF_TO_IMPLEMENTATION_BASELINE', replacement: `implementation-baseline@${OLD}` },
  );
  assert.equal(transformMarker(`verifiedSourceSha: ${OLD}`), null);
});

test('promoted low-risk drift yields a PR-only repair plan and applies deterministically', () => {
  const file = 'docs/growth/example.md';
  const marker = `Current-main baseline for this slice: \`${OLD}`;
  const root = rootFixture({ [file]: `${marker}\`.\n` });
  const plan = buildDocumentationRepairPlan({
    root,
    expectedMainSha: MAIN,
    profile: profile(),
    validation: validation(),
    report: {
      mainSha: MAIN,
      findings: [{
        class: 'SOURCE_DRIFT',
        path: file,
        line: 1,
        marker,
        repairClass: 'STALE_DOCUMENTARY_PROJECTION',
        repairFingerprint: FINGERPRINT,
      }],
    },
  });
  assert.equal(plan.eligible, true);
  assert.equal(plan.policy.mode, 'PR_ONLY');
  assert.equal(plan.policy.autoMerge, false);
  assert.equal(plan.policy.productionAuthority, false);
  const result = applyDocumentationRepairPlan({ root, plan, expectedMainSha: MAIN, actualHeadSha: MAIN });
  assert.deepEqual(result.changedFiles, [file]);
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  assert.match(content, /^Implementation baseline for this slice:/);
  assert.doesNotMatch(content, /Current-main/);
});

test('security and root policy paths cannot become repair proposals', () => {
  const file = 'docs/security/POLICY.md';
  const marker = `main@${OLD}`;
  const root = rootFixture({ [file]: `Basis: \`${marker}\`\n` });
  const plan = buildDocumentationRepairPlan({
    root,
    expectedMainSha: MAIN,
    profile: profile(),
    validation: validation(),
    report: {
      mainSha: MAIN,
      findings: [{
        class: 'SOURCE_DRIFT',
        path: file,
        line: 1,
        marker,
        repairClass: 'STALE_DOCUMENTARY_PROJECTION',
        repairFingerprint: FINGERPRINT,
      }],
    },
  });
  assert.equal(plan.eligible, false);
  assert.ok(plan.blockers.includes(`PATH_NOT_ALLOWED:${file}`));
});

test('unsupported claim forms remain manual instead of being rewritten', () => {
  const file = 'docs/growth/example.md';
  const marker = `verifiedSourceSha: ${OLD}`;
  const root = rootFixture({ [file]: `${marker}\n` });
  const plan = buildDocumentationRepairPlan({
    root,
    expectedMainSha: MAIN,
    profile: profile(),
    validation: validation(),
    report: {
      mainSha: MAIN,
      findings: [{
        class: 'SOURCE_DRIFT',
        path: file,
        line: 1,
        marker,
        repairClass: 'STALE_DOCUMENTARY_PROJECTION',
        repairFingerprint: FINGERPRINT,
      }],
    },
  });
  assert.equal(plan.eligible, false);
  assert.ok(plan.blockers.includes(`UNSUPPORTED_TRANSFORM:${file}`));
});

test('expected-main mismatch blocks the proposal before any write', () => {
  const file = 'README.md';
  const marker = `Main-Snapshot ${OLD}`;
  const root = rootFixture({ [file]: `${marker}\n` });
  const plan = buildDocumentationRepairPlan({
    root,
    expectedMainSha: MAIN,
    profile: profile(),
    validation: validation(),
    report: {
      mainSha: OLD,
      findings: [{
        class: 'SOURCE_DRIFT',
        path: file,
        line: 1,
        marker,
        repairClass: 'STALE_DOCUMENTARY_PROJECTION',
        repairFingerprint: FINGERPRINT,
      }],
    },
  });
  assert.equal(plan.eligible, false);
  assert.ok(plan.blockers.includes('REPORT_MAIN_SHA_MISMATCH'));
});

test('source digest drift blocks apply even when plan was previously eligible', () => {
  const file = 'README.md';
  const marker = `Main-Snapshot ${OLD}`;
  const root = rootFixture({ [file]: `${marker}\n` });
  const plan = buildDocumentationRepairPlan({
    root,
    expectedMainSha: MAIN,
    profile: profile(),
    validation: validation(),
    report: {
      mainSha: MAIN,
      findings: [{
        class: 'SOURCE_DRIFT',
        path: file,
        line: 1,
        marker,
        repairClass: 'STALE_DOCUMENTARY_PROJECTION',
        repairFingerprint: FINGERPRINT,
      }],
    },
  });
  assert.equal(plan.eligible, true);
  fs.appendFileSync(path.join(root, file), 'concurrent change\n');
  assert.throws(
    () => applyDocumentationRepairPlan({ root, plan, expectedMainSha: MAIN, actualHeadSha: MAIN }),
    /source digest changed/,
  );
});

test('post-merge correlation promotes only an eligible PR-only documentation plan', () => {
  const plan = {
    schema: 'DOCUMENTATION_DRIFT_REPAIR_PLAN@1',
    expectedMainSha: MAIN,
    repairFingerprint: FINGERPRINT,
    findingsCount: 1,
    operations: [{ path: 'docs/growth/example.md' }],
    blockers: [],
    eligible: true,
    promotion: { promoted: true },
    policy: { mode: 'PR_ONLY', autoMerge: false, productionAuthority: false, directMainMutation: false },
  };
  const result = classifyDocumentationRepair({ mainSha: MAIN, plan });
  assert.equal(result.action, DOCUMENTATION_ACTIONS.PR_PROPOSAL_CANDIDATE);
  assert.equal(result.prOnly, true);
  assert.equal(result.autoMerge, false);
  assert.equal(result.productionAuthority, false);
  assert.equal(result.expectedMainSha, MAIN);
});

test('post-merge correlation fails closed on expected-main mismatch or unsafe plan', () => {
  const mismatch = classifyDocumentationRepair({
    mainSha: MAIN,
    plan: {
      schema: 'DOCUMENTATION_DRIFT_REPAIR_PLAN@1',
      expectedMainSha: OLD,
      repairFingerprint: FINGERPRINT,
      findingsCount: 1,
      operations: [{ path: 'docs/growth/example.md' }],
      blockers: [],
      eligible: true,
      promotion: { promoted: true },
      policy: { mode: 'PR_ONLY', autoMerge: false, productionAuthority: false, directMainMutation: false },
    },
  });
  assert.equal(mismatch.action, DOCUMENTATION_ACTIONS.MANUAL_REVIEW_REQUIRED);

  const unsafe = classifyDocumentationRepair({
    mainSha: MAIN,
    plan: {
      schema: 'DOCUMENTATION_DRIFT_REPAIR_PLAN@1',
      expectedMainSha: MAIN,
      repairFingerprint: FINGERPRINT,
      findingsCount: 1,
      operations: [{ path: 'docs/security/POLICY.md' }],
      blockers: [],
      eligible: true,
      promotion: { promoted: true },
      policy: { mode: 'PR_ONLY', autoMerge: false, productionAuthority: false, directMainMutation: false },
    },
  });
  assert.equal(unsafe.action, DOCUMENTATION_ACTIONS.MANUAL_REVIEW_REQUIRED);
});


test('repository promotion config is bounded to the validated fingerprint', () => {
  const repositoryProfile = JSON.parse(fs.readFileSync(new URL('../documentary/documentation-drift-profile.json', import.meta.url), 'utf8'));
  const repositoryValidation = JSON.parse(fs.readFileSync(new URL('../docs/growth/DOCUMENTATION-DRIFT-VALIDATION-20261004.json', import.meta.url), 'utf8'));
  const proposal = repositoryProfile.selfHealing.prProposal;
  assert.equal(repositoryProfile.selfHealing.autoRepairEnabled, false);
  assert.equal(proposal.enabled, true);
  assert.equal(proposal.mode, 'PR_ONLY');
  assert.equal(proposal.approvedRepairFingerprint, FINGERPRINT);
  assert.equal(repositoryValidation.repairFingerprint, FINGERPRINT);
  assert.equal(repositoryValidation.validation.positiveIndependentCycles, 3);
  assert.equal(repositoryValidation.promotion.eligibleForDocSh02, true);
  assert.equal(repositoryValidation.promotion.autoRepairEnabled, false);
  assert.equal(proposal.autoMerge, false);
  assert.equal(proposal.directMainMutation, false);
  assert.equal(proposal.productionAuthority, false);
  assert.ok(proposal.forbiddenPrefixes.includes('docs/security/'));
  assert.ok(proposal.forbiddenPrefixes.includes('.github/'));
  assert.ok(proposal.forbiddenExactPaths.includes('AGENTS.md'));
});
