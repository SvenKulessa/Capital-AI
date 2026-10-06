import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const contract = JSON.parse(readFileSync(new URL('../contracts/agent-orchestration-benchmark.json', import.meta.url), 'utf8'));
const script = readFileSync(new URL('./benchmark-agent-orchestration.mjs', import.meta.url), 'utf8');

test('agent orchestration benchmark is exact-version, identical-workload and non-production', () => {
  assert.equal(contract.schemaVersion, 'CAPITAL_AI_AGENT_ORCHESTRATION_BENCHMARK@1');
  assert.deepEqual(contract.candidate, {
    package: '@langchain/langgraph',
    version: '1.4.19',
    runtimePromotion: false,
  });
  assert.equal(contract.benchmarkEnvironment, 'isolated-nonproduction');
  assert.deepEqual(contract.workloads.map(item => item.requestedCapability), [
    'research', 'market-read', 'portfolio-proposal', 'truth-review',
  ]);
  assert.equal(contract.functionalGate.identicalStateFingerprintRequired, true);
  assert.equal(contract.functionalGate.authorityEscalationAllowed, false);
  assert.equal(contract.performanceEvidence.productionApproval, false);
});

test('benchmark script requires exact LangGraph and compares state fingerprints before reporting performance', () => {
  assert.match(script, /EXACT_LANGGRAPH_VERSION = '1\.4\.19'/);
  assert.match(script, /CAPITAL_AI_BENCHMARK_ENV/);
  assert.match(script, /agentStateFingerprint\(direct\) !== agentStateFingerprint\(viaGraph\)/);
  assert.match(script, /LANGGRAPH_DEPENDENCY_NOT_PINNED/);
  assert.match(script, /productionApproval: false/);
});
