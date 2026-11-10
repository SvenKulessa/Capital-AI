import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const workflow = readFileSync(new URL('../.github/workflows/domain-governance.yml', import.meta.url), 'utf8');
const marker = '      - name: Validate merge-group identity (queue only)\n';
const start = workflow.indexOf(marker);
assert.ok(start !== -1, 'Merge-group step must exist');
const step = workflow.slice(start);
const run = step.split('        run: |\n')[1];
assert.ok(run, 'Expected an inline shell validation step');
const script = run.split('\n').map(line => line.startsWith('          ') ? line.slice(10) : line).join('\n');
const good = {
  GITHUB_EVENT_NAME: 'merge_group',
  GITHUB_REPOSITORY: 'SvenKulessa/Capital-AI',
  GITHUB_REF: 'refs/heads/gh-readonly-queue/main/pr-42-' + 'b'.repeat(40),
  GITHUB_SHA: 'b'.repeat(40),
  MERGE_GROUP_ACTION: 'checks_requested',
  MERGE_GROUP_HEAD_REF: 'refs/heads/gh-readonly-queue/main/pr-42-' + 'b'.repeat(40),
  MERGE_GROUP_BASE_REF: 'refs/heads/main',
  MERGE_GROUP_HEAD_SHA: 'b'.repeat(40),
  MERGE_GROUP_BASE_SHA: 'a'.repeat(40),
};
function simulate(change = {}) {
  return spawnSync('bash', ['-e', '-c', script], {
    encoding: 'utf8',
    env: { ...process.env, ...good, ...change },
  });
}
test('existing PR naming checks and required check identity are unchanged', () => {
  assert.match(workflow, /^name: Domain Governance$/m);
  assert.match(workflow, /^    name: Domain Governance$/m);
  assert.match(workflow, /^  pull_request:\n    types: \[opened, edited, synchronize, reopened\]$/m);
  assert.match(workflow, /^      - name: Validate branch and PR title\n        if: github.event_name == 'pull_request'$/m);
  assert.match(workflow, /if \[\[ "\$PR_USER" == "dependabot\[bot\]" \]\]/);
  assert.match(workflow, /branch_re='\^capital-ai-/);
  assert.match(workflow, /^  merge_group:\n    types: \[checks_requested\]\n    branches: \[main\]$/m);
  assert.match(workflow, /^permissions:\n  contents: read$/m);
  assert.equal((workflow.match(/name: Domain Governance/g) || []).length, 2);
});
test('valid GitHub queue metadata passes without credentials or network requests', () => {
  const result = simulate();
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.match(result.stdout, /merge-group identity verified/);
});
test('non-queue, missing and cross-repository contexts fail closed', () => {
  const rejected = [
    { GITHUB_EVENT_NAME: 'pull_request' },
    { GITHUB_REPOSITORY: 'other/repo' },
    { MERGE_GROUP_ACTION: 'destroyed' },
    { MERGE_GROUP_BASE_REF: 'refs/heads/production' },
    { MERGE_GROUP_HEAD_REF: 'refs/heads/main' },
    { GITHUB_REF: 'refs/heads/main' },
    { GITHUB_SHA: 'c'.repeat(40) },
    { MERGE_GROUP_HEAD_SHA: 'not-a-sha' },
    { MERGE_GROUP_BASE_SHA: 'b'.repeat(40) },
    { MERGE_GROUP_BASE_SHA: 'INVALID' },
  ];
  for (const change of rejected) {
    const result = simulate(change);
    assert.notEqual(result.status, 0, 'Should reject ' + JSON.stringify(change));
  }
});

test('GitHub Actions expressions use five exact unescaped bindings', () => {
  const start = '$' + '{{';
  const invalid = String.fromCharCode(92) + start;
  assert.equal(workflow.includes(invalid), false, 'Escaped expressions cannot bind GitHub context');
  for (const field of ['action', 'merge_group.head_sha', 'merge_group.base_sha', 'merge_group.head_ref', 'merge_group.base_ref']) {
    assert.ok(workflow.includes(start + ' github.event.' + field + ' }}'), 'Missing required GitHub expression: ' + field);
  }
});
