import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAnalysisReadback } from './read-analysis-policy.mjs';

const sourceSha = 'a'.repeat(40);
test('passing CodeQL jobs cannot impersonate GitHub policy evaluation', () => {
  const checks = { check_runs: [{ name: 'Analyze (python)', head_sha: sourceSha, status: 'completed', conclusion: 'success', app: { id: 15368 } }] };
  const result = evaluateAnalysisReadback({ sourceSha, checks, ruleSuites: [{ after_sha: sourceSha, result: 'pass' }] });
  assert.deepEqual(result.map(x => x.status), ['NOT_PROVEN', 'NOT_PROVEN']);
  assert.equal(result[0].codeqlJobsPass, true);
});
test('missing provider permissions and stale SHA remain NOT_PROVEN', () => {
  const result = evaluateAnalysisReadback({ sourceSha, checks: {}, ruleSuites: [], failures: ['READBACK_FAILED_403'] });
  assert.equal(result[0].reason, 'PROVIDER_READBACK_UNAVAILABLE');
  assert.equal(result[1].status, 'NOT_PROVEN');
  assert.throws(() => evaluateAnalysisReadback({ sourceSha: 'main' }));
});
