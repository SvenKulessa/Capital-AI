import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { verifySuppression } from './verify-dependency-suppressions.mjs';

const evidence = JSON.parse(fs.readFileSync('docs/security/evidence/dependency-decisions/typescript-7.0.2.json','utf8'));
const dependabotText = fs.readFileSync('.github/dependabot.yml','utf8');

test('exact TypeScript suppression is evidence-bound before review date', () => {
  const r = verifySuppression({ evidence, dependabotText, today: new Date('2026-10-02T08:00:00Z') });
  assert.equal(r.passed, true, r.failures.join(','));
});

test('review date fails closed', () => {
  const r = verifySuppression({ evidence, dependabotText, today: new Date('2026-10-09T00:00:00Z') });
  assert.equal(r.passed, false);
  assert.ok(r.failures.includes('SUPPRESSION_REVIEW_DUE'));
});

test('missing exact version is rejected', () => {
  const r = verifySuppression({ evidence, dependabotText: dependabotText.replace('- "7.0.2"','- "7.0.3"'), today: new Date('2026-10-02T08:00:00Z') });
  assert.equal(r.passed, false);
  assert.ok(r.failures.includes('DEPENDABOT_EXACT_VERSION_MISSING'));
});

function workflowStep(workflow, name) {
  const section = workflow.split(/(?=^      - name: )/m)
    .find(part => part.startsWith('      - name: ' + name + '\n'));
  assert.ok(section, 'Missing step: ' + name);
  return section;
}

test('daily CVE watch captures npm and policy evidence despite expired suppression', () => {
  const workflow = fs.readFileSync('.github/workflows/daily-dependency-security-watch.yml', 'utf8');
  const outdated = workflowStep(workflow, 'Capture available npm updates');
  const audit = workflowStep(workflow, 'Fail on high or critical npm advisories');
  const policy = workflowStep(workflow, 'Enforce due dependency suppression review');
  const regression = workflowStep(workflow, 'Validate dependency retry regression tests');
  const upload = workflowStep(workflow, 'Upload daily evidence');
  const summary = workflowStep(workflow, 'Summarize audit outcomes');

  for (const step of [outdated, audit, policy, regression, upload, summary]) {
    assert.match(step, /\n        if: always\(\)/,
      'Evidence or security failure would skip a required observation');
  }
  assert.ok(workflow.indexOf('Capture available npm updates') < workflow.indexOf('Enforce due dependency suppression review'));
  assert.ok(workflow.indexOf('Fail on high or critical npm advisories') < workflow.indexOf('Enforce due dependency suppression review'));
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
  assert.match(policy, /set -euo pipefail/);
  assert.match(policy, /node scripts\/verify-dependency-suppressions\.mjs \|/);
  assert.match(policy, /tee security-reports\/dependency-suppressions\.json/);
  assert.match(summary, /daily-dependency-summary\.json/);
  assert.match(summary, /SUPPRESSION_RESULT:/);
  assert.match(upload, /if-no-files-found: error/);
  assert.doesNotMatch(workflow, /continue-on-error:\s*true/);
});

test('overdue TypeScript review remains blocking on the observation day', () => {
  const r = verifySuppression({
    evidence, dependabotText, today: new Date('2026-10-11T12:00:00Z'),
  });
  assert.equal(r.passed, false);
  assert.ok(r.failures.includes('SUPPRESSION_REVIEW_DUE'));
  assert.equal(evidence.decision.state, 'BLOCKED');
  assert.equal(evidence.decision.classification, 'BINARY_AFFECTED');
  assert.equal(evidence.fingerprint.nativeArtifact.binarySha256, null);
});
