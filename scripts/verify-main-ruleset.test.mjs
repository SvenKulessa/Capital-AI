import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyMainRuleset } from './verify-main-ruleset.mjs';

function validRuleset() {
  return {
    id: 1,
    name: 'main-production-protection',
    target: 'branch',
    enforcement: 'active',
    bypass_actors: [],
    conditions: { ref_name: { include: ['~DEFAULT_BRANCH', 'refs/heads/main'], exclude: [] } },
    rules: [
      { type: 'deletion' },
      { type: 'non_fast_forward' },
      { type: 'required_linear_history' },
      { type: 'pull_request', parameters: { required_approving_review_count: 0, allowed_merge_methods: ['squash', 'rebase'] } },
      {
        type: 'required_status_checks',
        parameters: {
          strict_required_status_checks_policy: true,
          do_not_enforce_on_create: false,
          required_status_checks: [{ context: 'Docker Security Gate' }],
        },
      },
    ],
  };
}

test('accepts the exact fail-closed main protection contract', () => {
  const report = verifyMainRuleset(validRuleset());
  assert.equal(report.pass, true);
  assert.deepEqual(report.findings, []);
});

test('rejects bypass actors', () => {
  const ruleset = validRuleset();
  ruleset.bypass_actors = [{ actor_id: 1, actor_type: 'OrganizationAdmin', bypass_mode: 'always' }];
  assert.ok(verifyMainRuleset(ruleset).findings.includes('bypass_present'));
});

test('rejects non-strict or missing Docker Security Gate checks', () => {
  const ruleset = validRuleset();
  const status = ruleset.rules.find(rule => rule.type === 'required_status_checks');
  status.parameters.strict_required_status_checks_policy = false;
  status.parameters.required_status_checks = [];
  const findings = verifyMainRuleset(ruleset).findings;
  assert.ok(findings.includes('strict_checks_disabled'));
  assert.ok(findings.includes('docker_security_gate_not_required'));
});

test('rejects direct-push escape hatches', () => {
  const ruleset = validRuleset();
  ruleset.rules = ruleset.rules.filter(rule => !['pull_request', 'non_fast_forward'].includes(rule.type));
  const findings = verifyMainRuleset(ruleset).findings;
  assert.ok(findings.includes('pull_request_not_required'));
  assert.ok(findings.includes('non_fast_forward_not_blocked'));
});

test('rejects missing linear history and merge-only configuration', () => {
  const ruleset = validRuleset();
  ruleset.rules = ruleset.rules.filter(rule => rule.type !== 'required_linear_history');
  ruleset.rules.find(rule => rule.type === 'pull_request').parameters.allowed_merge_methods = ['merge'];
  const findings = verifyMainRuleset(ruleset).findings;
  assert.ok(findings.includes('linear_history_not_required'));
  assert.ok(findings.includes('linear_merge_method_missing'));
});
