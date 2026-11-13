import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REQUIRED_CONTEXT = 'Docker Security Gate';

function targetsMain(ruleset) {
  const include = ruleset?.conditions?.ref_name?.include || [];
  return include.includes('refs/heads/main') || include.includes('~DEFAULT_BRANCH');
}

function statusRule(ruleset) {
  return (ruleset?.rules || []).find(rule => rule.type === 'required_status_checks');
}

export function verifyMainRuleset(ruleset, { sourceSha = null, checkRuns = [] } = {}) {
  const rules = Array.isArray(ruleset?.rules) ? ruleset.rules : [];
  const types = new Set(rules.map(rule => rule.type));
  const status = statusRule(ruleset);
  const requiredChecks = status?.parameters?.required_status_checks || [];
  const contexts = requiredChecks.map(item => item.context);
  const findings = [];
  const originEvidence = requiredChecks.map(check => {
    const explicitApp = check.integration_id === 15368;
    const appMismatch = check.integration_id != null && !explicitApp;
    const matchingCheck = Array.isArray(checkRuns) && checkRuns.some(run =>
      run?.name === check.context && run?.app?.id === 15368 &&
      run?.head_sha === sourceSha && run?.status === 'completed' &&
      run?.conclusion === 'success');
    return { context: check.context, explicitApp, appMismatch, matchingCheck };
  });
  const policyAppBound = requiredChecks.length > 0 &&
    originEvidence.every(item => item.explicitApp);
  const checkRunAppVerified = requiredChecks.length > 0 &&
    originEvidence.every(item => item.matchingCheck);
  const originVerified = requiredChecks.length > 0 &&
    originEvidence.every(item => !item.appMismatch && (item.explicitApp || item.matchingCheck));

  if (ruleset?.name !== 'main-production-protection') findings.push('unexpected_name');
  if (ruleset?.target !== 'branch') findings.push('target_not_branch');
  if (ruleset?.enforcement !== 'active') findings.push('not_active');
  if (!targetsMain(ruleset)) findings.push('main_not_targeted');
  if ((ruleset?.conditions?.ref_name?.exclude || []).length) findings.push('main_exclusions_present');
  if ((ruleset?.bypass_actors || []).length !== 0) findings.push('bypass_present');
  if (!types.has('deletion')) findings.push('deletion_not_blocked');
  if (!types.has('non_fast_forward')) findings.push('non_fast_forward_not_blocked');
  if (!types.has('required_linear_history')) findings.push('linear_history_not_required');
  const methods = rules.find(rule => rule.type === 'pull_request')?.parameters?.allowed_merge_methods || [];
  if (!methods.some(method => ['squash', 'rebase'].includes(method))) findings.push('linear_merge_method_missing');
  if (!types.has('pull_request')) findings.push('pull_request_not_required');
  if (!status) findings.push('required_status_checks_missing');
  if (status && status.parameters?.strict_required_status_checks_policy !== true) findings.push('strict_checks_disabled');
  if (status && status.parameters?.do_not_enforce_on_create !== false) findings.push('checks_not_enforced_on_create');
  if (!contexts.includes(REQUIRED_CONTEXT)) findings.push('docker_security_gate_not_required');
  if (!originVerified) findings.push('required_check_identity_unbound');

  return {
    schemaVersion: 1,
    pass: findings.length === 0,
    requiredContext: REQUIRED_CONTEXT,
    findings,
    observed: {
      id: ruleset?.id ?? null,
      name: ruleset?.name ?? null,
      enforcement: ruleset?.enforcement ?? null,
      bypassActors: ruleset?.bypass_actors || [],
      requiredContexts: contexts,
      policyAppBound,
      checkRunAppVerified,
      originEvidence,
      ruleTypes: [...types].sort(),
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = process.argv[2];
  if (!file) throw new Error('Ruleset JSON path required');
  const report = verifyMainRuleset(JSON.parse(readFileSync(file, 'utf8')));
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exitCode = 1;
}
