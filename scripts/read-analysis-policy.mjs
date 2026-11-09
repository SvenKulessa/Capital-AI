import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHA = /^[0-9a-f]{40}$/;
const ROOT = 'repos/SvenKulessa/Capital-AI';
const EVIDENCE_URL = 'https://api.github.com/repos/SvenKulessa/Capital-AI/';

export function evaluateAnalysisReadback({ sourceSha, checks, ruleSuites, failures = [] }) {
  if (!SHA.test(sourceSha || '')) throw new Error('Invalid source SHA');
  const runs = Array.isArray(checks?.check_runs) ? checks.check_runs : [];
  const codeql = runs.filter(r => /^Analyze \(/.test(r.name || ''));
  const codeqlJobsPass = codeql.length > 0 && codeql.every(r =>
    r.head_sha === sourceSha && r.status === 'completed' && r.conclusion === 'success' && r.app?.id === 15368);
  const suites = Array.isArray(ruleSuites) ? ruleSuites : [];
  const matching = suites.filter(s => s.after_sha === sourceSha && s.result === 'pass');
  // A passing job is not a passing GitHub code-scanning or code-quality policy.
  // Rule-suite evaluation must be read and its per-rule results verified before
  // either policy may ever be emitted as PASS. The current API scope cannot do that.
  return ['code_scanning', 'code_quality'].map(type => ({
    type,
    status: 'NOT_PROVEN',
    sourceSha,
    evidenceUrl: EVIDENCE_URL + 'rulesets/rule-suites',
    codeqlJobsPass: type === 'code_scanning' ? codeqlJobsPass : undefined,
    matchingSuiteCount: matching.length,
    reason: failures.length ? 'PROVIDER_READBACK_UNAVAILABLE' : 'RULE_LEVEL_POLICY_EVIDENCE_NOT_VERIFIED',
    failures,
  }));
}

function gh(path) {
  try {
    return { data: JSON.parse(execFileSync('gh', ['api', '--paginate', path], { encoding: 'utf8', timeout: 15000, maxBuffer: 4_000_000 })), error: null };
  } catch (error) {
    return { data: null, error: 'READBACK_FAILED_' + (error.status ?? 'UNKNOWN') };
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [sourceSha, output] = process.argv.slice(2);
  if (!SHA.test(sourceSha || '') || !output) throw new Error('Usage: read-analysis-policy.mjs <source-sha> <output.json>');
  const checks = gh(ROOT + '/commits/' + sourceSha + '/check-runs?per_page=100');
  const suites = gh(ROOT + '/rulesets/rule-suites?per_page=100');
  const failures = [checks.error, suites.error].filter(Boolean);
  const result = evaluateAnalysisReadback({ sourceSha, checks: checks.data, ruleSuites: suites.data, failures });
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ status: 'NOT_PROVEN', checksReadable: !checks.error, rulesReadable: !suites.error }));
}
