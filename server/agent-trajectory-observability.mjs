const MAX_SAMPLES = 256;
const rows = new Map();

function safeLabel(value, fallback = 'unknown') {
  const normalized = String(value || fallback).toLowerCase().replace(/[^a-z0-9_.:-]/g, '_');
  return normalized.slice(0, 80) || fallback;
}

function quantile(samples, q) {
  if (!samples.length) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q))];
}

export function recordAgentTrajectory(event) {
  if (!event || event.schema !== 'CAPITAL_AI_AGENT_TRAJECTORY@1') throw new Error('AGENT_TRAJECTORY_SCHEMA_INVALID');
  if (!Number.isFinite(event.durationMs) || event.durationMs < 0) throw new Error('AGENT_TRAJECTORY_DURATION_INVALID');
  const node = safeLabel(event.nodeId);
  const outcome = safeLabel(event.outcome);
  const key = node + '|' + outcome;
  const current = rows.get(key) || { count: 0, errors: 0, blocked: 0, retries: 0, sumMs: 0, maxMs: 0, samples: [] };
  current.count += 1;
  current.errors += event.outcome === 'error' ? 1 : 0;
  current.blocked += event.outcome === 'blocked' ? 1 : 0;
  current.retries += Math.max(0, Number(event.attempt || 1) - 1);
  current.sumMs += event.durationMs;
  current.maxMs = Math.max(current.maxMs, event.durationMs);
  current.samples.push(event.durationMs);
  if (current.samples.length > MAX_SAMPLES) current.samples.shift();
  rows.set(key, current);
}

export function agentTrajectorySnapshot() {
  return [...rows.entries()].map(([key, value]) => {
    const [node, outcome] = key.split('|');
    return {
      node,
      outcome,
      count: value.count,
      errors: value.errors,
      blocked: value.blocked,
      retries: value.retries,
      avgMs: value.count ? +(value.sumMs / value.count).toFixed(3) : 0,
      p50Ms: +quantile(value.samples, 0.50).toFixed(3),
      p95Ms: +quantile(value.samples, 0.95).toFixed(3),
      maxMs: +value.maxMs.toFixed(3),
    };
  });
}

export function evaluateAgentTrajectorySlo({ maxP95Ms = 250, maxErrorRate = 0.01 } = {}) {
  const snapshot = agentTrajectorySnapshot();
  const total = snapshot.reduce((sum, row) => sum + row.count, 0);
  const errors = snapshot.reduce((sum, row) => sum + row.errors, 0);
  const p95Ms = snapshot.reduce((max, row) => Math.max(max, row.p95Ms), 0);
  const errorRate = total ? errors / total : 0;
  return Object.freeze({
    schema: 'CAPITAL_AI_AGENT_TRAJECTORY_SLO@1',
    observedRuns: total,
    p95Ms,
    errorRate,
    thresholds: { maxP95Ms, maxErrorRate },
    pass: total > 0 && p95Ms <= maxP95Ms && errorRate <= maxErrorRate,
    productionApproval: false,
  });
}

export function renderAgentTrajectoryPrometheusMetrics() {
  const lines = [
    '# HELP capital_ai_agent_trajectory_events_total Agent trajectory events by node and outcome.',
    '# TYPE capital_ai_agent_trajectory_events_total counter',
    '# HELP capital_ai_agent_trajectory_duration_ms Agent trajectory latency projection.',
    '# TYPE capital_ai_agent_trajectory_duration_ms gauge',
    '# HELP capital_ai_agent_trajectory_retries_total Agent retry attempts beyond the first try.',
    '# TYPE capital_ai_agent_trajectory_retries_total counter',
  ];
  for (const row of agentTrajectorySnapshot()) {
    const labels = `node="${row.node}",outcome="${row.outcome}"`;
    lines.push(`capital_ai_agent_trajectory_events_total{${labels}} ${row.count}`);
    lines.push(`capital_ai_agent_trajectory_duration_ms{${labels},quantile="0.50"} ${row.p50Ms}`);
    lines.push(`capital_ai_agent_trajectory_duration_ms{${labels},quantile="0.95"} ${row.p95Ms}`);
    lines.push(`capital_ai_agent_trajectory_retries_total{${labels}} ${row.retries}`);
  }
  return lines.join('\n') + '\n';
}

export function resetAgentTrajectoryMetricsForTests() {
  rows.clear();
}
