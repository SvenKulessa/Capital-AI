import assert from 'node:assert/strict';
import test from 'node:test';

import {
  agentTrajectorySnapshot,
  evaluateAgentTrajectorySlo,
  recordAgentTrajectory,
  renderAgentTrajectoryPrometheusMetrics,
  resetAgentTrajectoryMetricsForTests,
} from './agent-trajectory-observability.mjs';

function event(overrides = {}) {
  return {
    schema: 'CAPITAL_AI_AGENT_TRAJECTORY@1',
    nodeId: 'research',
    outcome: 'ok',
    durationMs: 20,
    attempt: 1,
    ...overrides,
  };
}

test('trajectory metrics stay low-cardinality and project p50/p95 without run identifiers', () => {
  resetAgentTrajectoryMetricsForTests();
  recordAgentTrajectory(event({ durationMs: 10 }));
  recordAgentTrajectory(event({ durationMs: 20, attempt: 2 }));
  recordAgentTrajectory(event({ durationMs: 30 }));
  const snapshot = agentTrajectorySnapshot();
  assert.equal(snapshot.length, 1);
  assert.equal(snapshot[0].count, 3);
  assert.equal(snapshot[0].retries, 1);
  assert.equal(snapshot[0].p50Ms, 20);
  assert.equal(snapshot[0].p95Ms, 20);

  const prometheus = renderAgentTrajectoryPrometheusMetrics();
  assert.match(prometheus, /capital_ai_agent_trajectory_events_total\{node="research",outcome="ok"\} 3/);
  assert.doesNotMatch(prometheus, /agentRunId|graphRunId|traceId|actorRef/);
});

test('SLO projection is evidence only and never production approval', () => {
  resetAgentTrajectoryMetricsForTests();
  recordAgentTrajectory(event({ durationMs: 25 }));
  const slo = evaluateAgentTrajectorySlo({ maxP95Ms: 50, maxErrorRate: 0 });
  assert.equal(slo.pass, true);
  assert.equal(slo.productionApproval, false);

  recordAgentTrajectory(event({ outcome: 'error', durationMs: 80 }));
  const failed = evaluateAgentTrajectorySlo({ maxP95Ms: 50, maxErrorRate: 0 });
  assert.equal(failed.pass, false);
  assert.equal(failed.productionApproval, false);
});

test('invalid trajectory evidence fails closed', () => {
  resetAgentTrajectoryMetricsForTests();
  assert.throws(() => recordAgentTrajectory({}), /AGENT_TRAJECTORY_SCHEMA_INVALID/);
  assert.throws(() => recordAgentTrajectory(event({ durationMs: -1 })), /AGENT_TRAJECTORY_DURATION_INVALID/);
});
