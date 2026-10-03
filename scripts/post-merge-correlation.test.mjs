import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCorrelation, classifyOpenPr, ACTIONS } from "./post-merge-correlation.mjs";

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

test("relevant low-risk docs overlap requires sync before promotion", () => {
  const r = classifyOpenPr({
    mergedFiles: ["docs/architecture/FOO.md"],
    mainSha,
    mergedPr: 199,
    pr: { ...basePr, files: ["docs/architecture/FOO.md"] },
    patternState: {},
  });
  assert.equal(r.action, ACTIONS.SYNC_REQUIRED);
  assert.equal(r.repair.promotionState, "OBSERVE_ONLY");
});

test("same low-risk fingerprint becomes repair candidate only after 3 positive cycles", () => {
  const first = classifyOpenPr({
    mergedFiles: ["docs/architecture/FOO.md"],
    mainSha,
    mergedPr: 199,
    pr: { ...basePr, files: ["docs/architecture/FOO.md"] },
    patternState: {},
  });
  const state = {
    [first.repair.fixFingerprint]: {
      positiveValidationCount: 3,
      promotionState: "PROMOTED",
    },
  };
  const promoted = classifyOpenPr({
    mergedFiles: ["docs/architecture/FOO.md"],
    mainSha,
    mergedPr: 199,
    pr: { ...basePr, files: ["docs/architecture/FOO.md"] },
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

test("five-stage approval blocks autonomous repair until verify is present", () => {
  const first = classifyOpenPr({
    mergedFiles: ["generated/documentary/index.json"],
    mainSha,
    mergedPr: 199,
    pr: { ...basePr, files: ["generated/documentary/index.json"], requiredChecksRevalidated: false },
    patternState: {},
  });
  const state = {
    [first.repair.fixFingerprint]: {
      positiveValidationCount: 3,
      promotionState: "PROMOTED",
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
  assert.equal(promoted.approve5.A5_VERIFY, false);
  assert.equal(promoted.fiveStageComplete, false);
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
  assert.equal(report.schema, "POST_MERGE_CORRELATION@2");
  assert.equal(report.rule3.minimumIndependentPositiveValidationCycles, 3);
  assert.equal(report.rule5.stages.length, 5);
  assert.equal(report.summary.totalOpenPrs, 2);
  assert.equal(report.openPrs[0].action, ACTIONS.MANUAL_REVIEW_REQUIRED);
  assert.equal(report.openPrs[1].action, ACTIONS.NO_ACTION);
});
