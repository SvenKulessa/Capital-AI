import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAnalysisEvidence } from './github-analysis-policy.mjs';

const sha = 'a'.repeat(40);
const rules = [{ type: 'code_scanning' }, { type: 'code_quality' }];
const suite = {
  id: 42, after_sha: sha, ref: 'refs/heads/main', result: 'pass',
  rule_evaluations: [
    { rule_type: 'code_scanning', enforcement: 'active', result: 'pass' },
    { rule_type: 'code_quality', enforcement: 'active', result: 'pass' },
  ],
};
const analysis = { commit_sha: sha, ref: 'refs/heads/main', tool: { name: 'CodeQL' } };
function input() {
  return { sourceSha: sha, activeRules: rules, ruleSuite: structuredClone(suite), codeqlAnalyses: [analysis], codeScanningAlerts: [], codeQualityFindings: [], complete: true };
}
const state = (result, type) => result.find(row => row.type === type).status;

test('complete commit-bound provider evidence can PASS both active policies', () => {
  const report = evaluateAnalysisEvidence(input());
  assert.equal(state(report, 'code_scanning'), 'PASS');
  assert.equal(state(report, 'code_quality'), 'PASS');
  assert.match(report[0].evidenceUrl, /rule-suites\/42$/);
});

test('stale commit, bypass, missing suite and API incompleteness never PASS', () => {
  for (const change of [
    i => { i.ruleSuite.after_sha = 'f'.repeat(40); },
    i => { i.ruleSuite.result = 'bypass'; },
    i => { i.ruleSuite = null; },
    i => { i.complete = false; },
    i => { i.codeqlAnalyses = []; },
  ]) {
    const i = input(); change(i);
    const outcomes = evaluateAnalysisEvidence(i);
    assert.equal(outcomes.find(row => row.type === 'code_scanning').status, 'NOT_PROVEN');
    if (i.codeqlAnalyses.length > 0) {
      assert.equal(outcomes.find(row => row.type === 'code_quality').status, 'NOT_PROVEN');
    }
  }
});

test('policy fails if either active rule fails or is not present', () => {
  for (const change of [
    i => { i.ruleSuite.rule_evaluations[0].result = 'fail'; },
    i => { i.ruleSuite.rule_evaluations.pop(); },
    i => { i.ruleSuite.rule_evaluations[1].enforcement = 'evaluate'; },
  ]) {
    const i = input(); change(i);
    assert.equal(state(evaluateAnalysisEvidence(i), 'code_quality') === 'PASS' && state(evaluateAnalysisEvidence(i), 'code_scanning') === 'PASS', false);
  }
});

test('open code scanning alerts and code quality findings block their respective policy', () => {
  let i = input(); i.codeScanningAlerts = [{ state: 'open', number: 1 }];
  assert.equal(state(evaluateAnalysisEvidence(i), 'code_scanning'), 'NOT_PROVEN');
  i = input(); i.codeQualityFindings = [{ state: 'open', number: 2 }];
  assert.equal(state(evaluateAnalysisEvidence(i), 'code_quality'), 'NOT_PROVEN');
});

test('policy is not misrepresented as evaluated if the active rule is absent', () => {
  const i = input(); i.activeRules = [{ type: 'code_scanning' }];
  const rows = evaluateAnalysisEvidence(i);
  assert.deepEqual(rows.map(r => r.type), ['code_scanning']);
});
