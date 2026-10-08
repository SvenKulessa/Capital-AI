import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCorrelation, classifyOpenPr, ACTIONS } from "./post-merge-correlation.mjs";
import './documentation-drift-remediation.test.mjs'; // DOC-SH-02 regression in Docker Security preflight

test("workflow passes the unescaped merged SHA and token to checkout and correlation", () => {
  const workflow = readFileSync(new URL('../.github/workflows/post-merge-correlation.yml', import.meta.url), 'utf8');
  assert.ok(!workflow.includes('\\' + '${{'), 'Backslash corrupts evaluated GitHub expressions');
  assert.match(workflow, /ref: \$\{\{ github\.event\.pull_request\.merge_commit_sha \}\}/);
  assert.match(workflow, /GH_TOKEN: \$\{\{ github\.token \}\}/);
  assert.match(workflow, /persist-credentials: false/);
});

const mainSha = "a".repeat(40);
const basePr = {
  number: 200,
  title: "Test",
  headSha: "b".repeat(40),
  baseSha: "c".repeat(40),
  aheadBy: 3,
  behindBy: 1,
  files: [],
  requiredChecksRevalidated: false,
};

test("unrelated stale PR is correlation-only, never auto-synced", () => {
  const r = classifyOpenPr({
    mergedFiles: ["README.md"],
    mainSha,
    mergedPr: 199,
    pr: { ...basePr, files: ["src/components/Foo.tsx"] },
  });
  assert.equal(r.action, ACTIONS.CORRELATE_ONLY);
  assert.equal(r.policy.natsHeadOnlyRedeploy, false);
  assert.equal(r.repair.autoMutationAllowed, false);
});

test("workflow overlap is manual review required", () => {
  const r = classifyOpenPr({
    mergedFiles: [".github/workflows/build-security.yml"],
    mainSha,
    mergedPr: 199,
    pr: { ...basePr, files: [".github/workflows/build-security.yml"] },
  });
  assert.equal(r.action, ACTIONS.MANUAL_REVIEW_REQUIRED);
  assert.equal(r.exactOverlap.length, 1);
});

test("relevant low-risk docs overlap requires sync without explicit admission", () => {
  const r = classifyOpenPr({
    mergedFiles: ["docs/architecture/FOO.md"],
    mainSha,
    mergedPr: 199,
    pr: { ...basePr, files: ["docs/architecture/FOO.md"] },
    patternState: {},
  });
  assert.equal(r.action, ACTIONS.SYNC_REQUIRED);
  assert.equal(r.repair.admissionState, "NOT_ADMITTED");
});

test("same low-risk fingerprint becomes repair candidate only with explicit admission", () => {
  const first = classifyOpenPr({
    mergedFiles: ["docs/architecture/FOO.md"],
    mainSha,
    mergedPr: 199,
    pr: { ...basePr, files: ["docs/architecture/FOO.md"] },
    patternState: {},
  });
  const state = {
    [first.repair.fixFingerprint]: {
      admissionState: "ADMITTED",
    },
  };
  const promoted = classifyOpenPr({
    mergedFiles: ["docs/architecture/FOO.md"],
    mainSha,
    mergedPr: 199,
    pr: { ...basePr, files: ["docs/architecture/FOO.md"], requiredChecksRevalidated: true },
    patternState: state,
  });
  assert.equal(promoted.action, ACTIONS.REPAIR_CANDIDATE);
  assert.equal(promoted.repair.autoMutationAllowed, true);
});

test("NATS is never redeployed from repository head alone", () => {
  const report = buildCorrelation({
    mainSha,
    mergedPr: 199,
    files: ["src/components/Foo.tsx"],
    openPrs: [{ ...basePr, files: ["deploy/Dockerfile.nats"] }],
  });
  assert.equal(report.globalPolicy.natsHeadOnlyRedeploy, false);
  assert.equal(report.globalPolicy.deploy, false);
});

test("technical checks block autonomous repair until required checks are revalidated", () => {
  const first = classifyOpenPr({
    mergedFiles: ["generated/documentary/index.json"],
    mainSha,
    mergedPr: 199,
    pr: { ...basePr, files: ["generated/documentary/index.json"], requiredChecksRevalidated: false },
    patternState: {},
  });
  const state = {
    [first.repair.fixFingerprint]: {
      admissionState: "ADMITTED",
    },
  };
  const promoted = classifyOpenPr({
    mergedFiles: ["generated/documentary/index.json"],
    mainSha,
    mergedPr: 199,
    pr: { ...basePr, files: ["generated/documentary/index.json"], requiredChecksRevalidated: false },
    patternState: state,
  });
  assert.equal(promoted.action, ACTIONS.REPAIR_CANDIDATE);
  assert.equal(promoted.technicalChecks.REQUIRED_CHECKS_REVALIDATED, false);
  assert.equal(promoted.mutationEligible, false);
  assert.equal(promoted.repair.autoMutationAllowed, false);
});

test("summary classifies all open PR actions deterministically", () => {
  const report = buildCorrelation({
    mainSha,
    mergedPr: 199,
    files: ["package-lock.json"],
    openPrs: [
      { ...basePr, number: 200, files: ["package-lock.json"] },
      { ...basePr, number: 201, behindBy: 0, files: ["README.md"] },
    ],
  });
  assert.equal(report.schema, "POST_MERGE_CORRELATION@3");
  assert.equal(report.technicalAdmission.explicitRepairAdmissionRequired, true);
  assert.equal(report.technicalAdmission.requiredChecksRevalidationRequired, true);
  assert.equal(report.summary.totalOpenPrs, 2);
  assert.equal(report.openPrs[0].action, ACTIONS.MANUAL_REVIEW_REQUIRED);
  assert.equal(report.openPrs[1].action, ACTIONS.NO_ACTION);
});


test("post-merge correlation stays within the single evidence commit boundary", () => {
  const workflow = readFileSync(new URL('../.github/workflows/post-merge-correlation.yml', import.meta.url), 'utf8');
  assert.match(workflow, /permissions:\n  contents: write\n  pull-requests: read\n  checks: read/);
  assert.match(workflow, /git add docs\/evidence\/linear-post-merge-correlation\.json/);
  assert.match(workflow, /git commit -m/);
  assert.match(workflow, /refs\/heads\/\$TARGET_BRANCH/);
  assert.doesNotMatch(workflow, /\bgh\s+pr\s+create\b|\bgh\s+pr\s+merge\b|enable-auto-merge/);
  assert.doesNotMatch(workflow, /git add -A|git add \./);
  assert.doesNotMatch(workflow, /select\(\.draft == true\)/);
  assert.match(workflow, /node scripts\/post-merge-followup\.mjs/);
  assert.match(workflow, /node --test scripts\/post-merge-followup\.test\.mjs/);
  assert.match(workflow, /actions\/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a/);
});

test('merge milestone workflow keeps GitHub expressions unescaped', () => {
  const workflow = readFileSync(new URL('../.github/workflows/merge-milestones.yml', import.meta.url), 'utf8');
  assert.ok(!workflow.includes('\\' + '${{'), 'Escaped expressions break checkout and tokens');
  assert.match(workflow, /ref: \$\{\{ github\.event\.pull_request\.merge_commit_sha \}\}/);
  assert.match(workflow, /GH_TOKEN: \$\{\{ github\.token \}\}/);
  assert.match(workflow, /SOURCE_SHA: \$\{\{ github\.event\.pull_request\.merge_commit_sha \}\}/);
  assert.match(workflow, /persist-credentials: false/);
});
