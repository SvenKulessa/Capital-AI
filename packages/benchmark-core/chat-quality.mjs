export const CHAT_BENCHMARK_VERSION = 'SOLO2_CHAT_BENCHMARK@1';

export const CHAT_BENCHMARK_DIMENSIONS = Object.freeze({
  taskCompletion: 25,
  evidenceQuality: 20,
  executionEfficiency: 15,
  technicalQuality: 15,
  trustAndSafety: 15,
  communicationAndAccessibility: 10,
});

const STATUSES = new Set(['VERIFIED', 'PARTIAL', 'NOT_PROVEN', 'NOT_APPLICABLE', 'BLOCKED']);

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
  return value;
}

function requireRefs(value, name) {
  if (!Array.isArray(value) || value.some(ref => typeof ref !== 'string' || !ref.trim())) {
    throw new TypeError(`${name} must be a non-empty string array`);
  }
  return [...new Set(value.map(ref => ref.trim()))];
}

export function createChatBenchmark(input) {
  requireObject(input, 'input');
  const dimensions = requireObject(input.dimensions, 'dimensions');
  const results = {};
  let earned = 0;
  let applicable = 0;
  let evaluable = 0;

  for (const [id, maxScore] of Object.entries(CHAT_BENCHMARK_DIMENSIONS)) {
    const item = requireObject(dimensions[id], `dimensions.${id}`);
    if (!STATUSES.has(item.status)) throw new RangeError(`UNSUPPORTED_CHAT_BENCHMARK_STATUS:${id}`);
    const score = item.score;
    if (!Number.isFinite(score) || score < 0 || score > maxScore) throw new RangeError(`INVALID_CHAT_BENCHMARK_SCORE:${id}`);
    const evidenceRefs = item.status === 'NOT_APPLICABLE' ? [] : requireRefs(item.evidenceRefs, `dimensions.${id}.evidenceRefs`);
    if (item.status === 'VERIFIED' && evidenceRefs.length === 0) {
      throw new RangeError(`VERIFIED_CHAT_BENCHMARK_EVIDENCE_REQUIRED:${id}`);
    }
    const findings = Array.isArray(item.findings) ? item.findings.filter(value => typeof value === 'string') : [];
    const improvementActions = Array.isArray(item.improvementActions) ? item.improvementActions.filter(value => typeof value === 'string') : [];
    results[id] = { score, maxScore, status: item.status, evidenceRefs, findings, improvementActions };
    if (item.status !== 'NOT_APPLICABLE') applicable += maxScore;
    if (!['NOT_APPLICABLE', 'NOT_PROVEN'].includes(item.status)) {
      earned += score;
      evaluable += maxScore;
    }
  }

  const score = applicable ? Math.round(100 * earned / applicable) : 0;
  const coverage = applicable ? Math.round(100 * evaluable / applicable) : 0;
  return Object.freeze({
    schemaVersion: CHAT_BENCHMARK_VERSION,
    benchmarkId: String(input.benchmarkId || ''),
    evaluatedAt: input.evaluatedAt || new Date().toISOString(),
    taskClass: String(input.taskClass || 'UNCLASSIFIED'),
    score,
    coverage,
    dimensions: Object.freeze(results),
    publishable: coverage === 100 && Object.values(results).every(item => item.status === 'VERIFIED'),
    decision: Object.freeze({ productionEligible: false, decisionEligible: false, reason: 'BENCHMARK_EVIDENCE_ONLY' }),
  });
}

export function createPublicChatBenchmarkProjection(benchmark) {
  requireObject(benchmark, 'benchmark');
  if (benchmark.schemaVersion !== CHAT_BENCHMARK_VERSION || benchmark.publishable !== true) return null;
  return Object.freeze({
    schemaVersion: benchmark.schemaVersion,
    evaluatedAt: benchmark.evaluatedAt,
    taskClass: benchmark.taskClass,
    score: benchmark.score,
    coverage: benchmark.coverage,
    dimensions: Object.fromEntries(Object.entries(benchmark.dimensions).map(([id, item]) => [id, { score: item.score, maxScore: item.maxScore, status: item.status }])),
  });
}
