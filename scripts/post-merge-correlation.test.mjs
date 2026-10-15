import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCorrelation, classifyOpenPr, ACTIONS } from "./post-merge-correlation.mjs";
import { planMilestoneDrafts } from "./merge-milestone-pr-plan.mjs";
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


test("post-merge correlation is read-only and cannot invalidate other PR head checks", () => {
  const workflow = readFileSync(new URL('../.github/workflows/post-merge-correlation.yml', import.meta.url), 'utf8');
  assert.match(workflow, /permissions:\n  contents: read\n  pull-requests: read\n  checks: read/);
  assert.doesNotMatch(workflow, /contents: write|pull-requests: write/);
  assert.match(workflow, /gh api --paginate "repos\/\$REPOSITORY\/pulls\/\$MERGED_PR\/files/);
  assert.match(workflow, /correlation\/selected\.json/);
  assert.match(workflow, /AUTHORITY.*EVIDENCE_ONLY|authority:.*EVIDENCE_ONLY|authority:"EVIDENCE_ONLY"/);
  assert.match(workflow, /node scripts\/post-merge-followup\.mjs/);
  assert.match(workflow, /node --test scripts\/post-merge-followup\.test\.mjs/);
  assert.match(workflow, /actions\/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9/);
  assert.match(workflow, /post-merge-followup-\$\{\{ github\.event\.pull_request\.number \}\}/);
  assert.doesNotMatch(workflow, /\bgit\s+(?:push|commit|add)\b|\bgh\s+pr\s+(?:create|merge)\b|enable-auto-merge/);
  assert.doesNotMatch(workflow, /\bgh\s+api\s+(?:-X|--method)\s+(?:POST|PATCH|PUT|DELETE)\b/);
  assert.doesNotMatch(workflow, /x-access-token|refs\/heads\/\$TARGET_BRANCH|git config user\./);
  assert.match(workflow, /PR-Branch unverändert/);
});

test('merge milestone workflow keeps GitHub expressions unescaped', () => {
  const workflow = readFileSync(new URL('../.github/workflows/merge-milestones.yml', import.meta.url), 'utf8');
  assert.ok(!workflow.includes('\\' + '${{'), 'Escaped expressions break checkout and tokens');
  assert.match(workflow, /ref: \$\{\{ github\.event\.pull_request\.merge_commit_sha \}\}/);
  assert.match(workflow, /GH_TOKEN: \$\{\{ github\.token \}\}/);
  assert.match(workflow, /SOURCE_SHA: \$\{\{ github\.event\.pull_request\.merge_commit_sha \}\}/);
  assert.match(workflow, /persist-credentials: false/);
});

test('merge milestone PR creation requires dedicated repo-scoped GitHub App', () => {
  const workflow = readFileSync(new URL('../.github/workflows/merge-milestones.yml', import.meta.url), 'utf8');
  assert.match(workflow, /permissions:\n  contents: read\n  pull-requests: read/);
  assert.match(workflow, /actions\/create-github-app-token@64ab729a6294000f5aa4a4bc0b73d1f32bc45510/);
  // Missing either App credential must skip minting and retain the draft artifact.
  assert.match(workflow, /id: app_credentials/);
  assert.ok(workflow.includes('APP_CLIENT_ID: ${{ vars.CAPITAL_AI_MILESTONE_APP_CLIENT_ID }}'));
  assert.ok(workflow.includes('APP_PRIVATE_KEY: ${{ secrets.CAPITAL_AI_MILESTONE_APP_PRIVATE_KEY }}'));
  assert.ok(workflow.includes("if: ${{ steps.app_credentials.outputs.ready == 'true' }}"));
  assert.ok(workflow.includes('echo "ready=false" >> "$GITHUB_OUTPUT"'));
  assert.match(workflow, /permission-contents: write/);
  assert.match(workflow, /permission-pull-requests: write/);
  assert.match(workflow, /repositories: Capital-AI/);
  assert.match(workflow, /GH_TOKEN: \$\{\{ steps\.milestone_app\.outputs\.token \}\}/);
  assert.doesNotMatch(workflow, /GH_TOKEN: \$\{\{ github\.token \}\}\n          REPOSITORY/);
  assert.match(workflow, /Report missing app authority without creating a PR/);
  assert.match(workflow, /milestone-drafts-/);
  assert.match(workflow, /Milestone branch \$branch exists without a matching PR; refusing overwrite/);
  assert.match(workflow, /remote_status != 2/);
  // The dedicated App opens only provenance-scoped drafts; each scope remains fail-closed.
  assert.match(workflow, /while IFS='\|' read -r scope number date_suffix/);
  assert.match(workflow, /node scripts\/merge-milestone-pr-plan\.mjs/);
  assert.ok(workflow.includes('branch="capital-ai-trust/milestone-merge-pr-$number-$date_suffix"'));
  assert.equal((workflow.match(/gh pr create --repo/g) ?? []).length, 1,
    'One bounded draft PR creation callsite handles each independently validated source');
  assert.ok(workflow.includes('targets+=("src/data/roadmapMergeReconciliation.json"'));
  assert.ok(workflow.includes('targets+=("src/data/controlCenterNews.json"'));
  assert.ok(workflow.includes('ROADMAP_DATE: ${{ steps.milestones.outputs.roadmap_date }}'));
  assert.ok(workflow.includes('NEWS_DATE: ${{ steps.milestones.outputs.news_date }}'));
  assert.ok(workflow.includes('"$date_suffix" =~ ^[0-9]{8}$'));
  assert.doesNotMatch(workflow, /gh pr merge|--auto|enable-auto-merge/);
});

test('manual milestone App validation mints a scoped token but never writes to GitHub', () => {
  const workflow = readFileSync(new URL('../.github/workflows/merge-milestones.yml', import.meta.url), 'utf8');
  assert.match(workflow, /  workflow_dispatch:/);
  assert.match(workflow, /validate_app:\n    if: github.event_name == 'workflow_dispatch' && github.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /audit:\n    if: github.event_name == 'pull_request' && github.event.pull_request.merged == true/);
  const [validateSection] = workflow.split(/\n  audit:\n/);
  assert.match(validateSection, /uses: actions\/create-github-app-token@64ab729a6294000f5aa4a4bc0b73d1f32bc45510/);
  assert.match(validateSection, /permission-contents: write/);
  assert.match(validateSection, /permission-pull-requests: write/);
  assert.match(validateSection, /owner: \$\{\{ github.repository_owner \}\}/);
  assert.match(validateSection, /repositories: Capital-AI/);
  assert.match(validateSection, /GH_TOKEN: \$\{\{ steps.validation_token.outputs.token \}\}/);
  assert.match(validateSection, /gh api "repos\/\$REPOSITORY"/);
  assert.match(validateSection, /gh api "repos\/\$REPOSITORY\/pulls\?state=open&per_page=1"/);
  assert.doesNotMatch(validateSection, /^\s*(?:gh\s+pr\s+(?:create|merge)|git\s+push|gh\s+api\s+-X\s+(?:POST|PATCH|DELETE))\b/m);
  assert.match(workflow, /APP_CONFIG_BLOCKED/);
  assert.match(workflow, /APP_TOKEN_VERIFIED/);
});

// Run the exact planner behavior in the existing Docker Security Gate BEFORE merge.
test("post-merge planner keeps split, combined, and single-source milestones distinct", () => {
  assert.deepEqual(planMilestoneDrafts({
    roadmapNumber: "482", roadmapDate: "20261014", newsNumber: "470", newsDate: "20261013",
  }), [
    {scope:"roadmap", number:"482", date:"20261014"},
    {scope:"news", number:"470", date:"20261013"},
  ]);
  assert.deepEqual(planMilestoneDrafts({
    roadmapNumber: "470", roadmapDate: "20261013", newsNumber: "470", newsDate: "20261013",
  }), [{scope:"combined", number:"470", date:"20261013"}]);
  assert.deepEqual(planMilestoneDrafts({roadmapNumber:"482", roadmapDate:"20261014"}),
    [{scope:"roadmap", number:"482", date:"20261014"}]);
  assert.deepEqual(planMilestoneDrafts(), []);
  assert.throws(() => planMilestoneDrafts({roadmapNumber:"482", roadmapDate:"20260230"}),
    /INVALID_MILESTONE_DATE/);
  assert.throws(() => planMilestoneDrafts({roadmapNumber:"482", newsNumber:"470", newsDate:"20261013"}),
    /INVALID_MILESTONE_IDENTITY/);
});

test("isolated Docker build includes the planner used by milestone regressions", () => {
  const docker = readFileSync(new URL("../Dockerfile", import.meta.url), "utf8");
  const ignore = readFileSync(new URL("../.dockerignore", import.meta.url), "utf8");
  assert.match(docker, /COPY [^\n]*scripts\/merge-milestone-pr-plan\.mjs/);
  assert.ok(ignore.includes("!scripts/merge-milestone-pr-plan.mjs"));
});
