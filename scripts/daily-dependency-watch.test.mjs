import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function workflowStep(workflow, name) {
  const section = workflow.split(/(?=^      - name: )/m)
    .find(part => part.startsWith('      - name: ' + name + '\n'));
  assert.ok(section, 'Missing step: ' + name);
  return section;
}

test('daily CVE watch retains advisory and retry evidence without automatic suppression verifier', () => {
  const workflow = fs.readFileSync('.github/workflows/daily-dependency-security-watch.yml', 'utf8');
  const outdated = workflowStep(workflow, 'Capture available npm updates');
  const audit = workflowStep(workflow, 'Fail on high or critical npm advisories');
  const regression = workflowStep(workflow, 'Validate dependency retry regression tests');
  const upload = workflowStep(workflow, 'Upload daily evidence');
  const summary = workflowStep(workflow, 'Summarize audit outcomes');

  for (const step of [outdated, audit, regression, upload, summary]) {
    assert.match(step, /\n        if: always\(\)/,
      'Evidence or security failure would skip a required observation');
  }
  assert.match(outdated, /npm outdated --json > security-reports\/npm-outdated\.json/);
  assert.match(outdated, /npm-outdated-status\.json/);
  assert.match(outdated, /jq -e/);
  assert.match(outdated, /exit 2/);
  assert.match(audit, /npm audit --audit-level=high --json > security-reports\/npm-audit\.json/);
  assert.match(audit, /npm-audit-status\.json/);
  assert.match(audit, /jq -e/);
  assert.match(audit, /exit "\$status"/);
  assert.match(regression, /set -euo pipefail/);
  assert.match(regression, /tee security-reports\/dependency-policy-tests\.log/);
  assert.match(summary, /daily-dependency-summary\.json/);
  assert.match(summary, /suppressionPolicy:"NOT_ENFORCED_OWNER_REQUEST"/);
  assert.doesNotMatch(workflow, /Enforce due dependency suppression review|node scripts\/verify-dependency-suppressions\.mjs/);
  assert.match(upload, /if-no-files-found: error/);
  assert.doesNotMatch(workflow, /continue-on-error:\s*true/);
});
