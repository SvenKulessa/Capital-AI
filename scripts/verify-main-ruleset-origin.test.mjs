import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyMainRuleset } from './verify-main-ruleset.mjs';

const sha = 'a'.repeat(40);
const required = [{ context: 'Docker Security Gate' }, { context: 'Domain Governance' }];
const ruleset = {
  name: 'main-production-protection', target: 'branch', enforcement: 'active',
  conditions: { ref_name: { include: ['refs/heads/main'], exclude: [] } }, bypass_actors: [],
  rules: [
    { type: 'deletion' }, { type: 'non_fast_forward' }, { type: 'pull_request', parameters: { allowed_merge_methods: ['squash'] } },
    { type: 'required_linear_history' },
    { type: 'required_status_checks', parameters: { strict_required_status_checks_policy: true, do_not_enforce_on_create: false, required_status_checks: required } },
  ],
};
const checkRuns = required.map(({ context }) => ({ name: context, head_sha: sha, status: 'completed', conclusion: 'success', app: { id: 15368 } }));

test('optional integration_id may be correlated with exact successful GitHub App check runs', () => {
  const report = verifyMainRuleset(ruleset, { sourceSha: sha, checkRuns });
  assert.equal(report.pass, true);
  assert.equal(report.observed.policyAppBound, false);
  assert.equal(report.observed.checkRunAppVerified, true);
});

test('missing check-run provenance does not silently approve an unbound policy', () => {
  assert.equal(verifyMainRuleset(ruleset).pass, false);
  assert.equal(verifyMainRuleset(ruleset, { sourceSha: sha, checkRuns: checkRuns.slice(0, 1) }).pass, false);
});

test('foreign app, wrong SHA and failed check run are rejected', () => {
  for (const change of [
    run => { run.app.id = 999; },
    run => { run.head_sha = 'f'.repeat(40); },
    run => { run.conclusion = 'failure'; },
  ]) {
    const modified = structuredClone(checkRuns); change(modified[0]);
    assert.equal(verifyMainRuleset(ruleset, { sourceSha: sha, checkRuns: modified }).pass, false);
  }
});

test('explicit foreign integration id remains forbidden even if a good check run exists', () => {
  const configured = structuredClone(ruleset);
  configured.rules.at(-1).parameters.required_status_checks[0].integration_id = 999;
  assert.equal(verifyMainRuleset(configured, { sourceSha: sha, checkRuns }).pass, false);
});
