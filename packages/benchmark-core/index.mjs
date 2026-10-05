export const BENCHMARK_SCHEMA_VERSION = 'CAPITAL_AI_BENCHMARK_EVIDENCE@1';

export const BENCHMARK_TIERS = Object.freeze({
  starter: Object.freeze({
    label: 'Starter',
    capabilities: Object.freeze({
      standardProfiles: true,
      githubCheck: 'neutral',
      history: false,
      regressionDetection: false,
      evidenceExport: false,
      customProfiles: false,
      customThresholds: false,
      enforcedPrGate: false,
      api: false,
      selfHostedRunner: false,
    }),
  }),
  pro: Object.freeze({
    label: 'Pro',
    capabilities: Object.freeze({
      standardProfiles: true,
      githubCheck: 'neutral',
      history: true,
      regressionDetection: true,
      evidenceExport: true,
      customProfiles: false,
      customThresholds: false,
      enforcedPrGate: false,
      api: false,
      selfHostedRunner: false,
    }),
  }),
  enterprise: Object.freeze({
    label: 'Enterprise',
    capabilities: Object.freeze({
      standardProfiles: true,
      githubCheck: 'enforced',
      history: true,
      regressionDetection: true,
      evidenceExport: true,
      customProfiles: true,
      customThresholds: true,
      enforcedPrGate: true,
      api: true,
      selfHostedRunner: true,
    }),
  }),
});

const HEX40 = /^[0-9a-f]{40}$/i;
const SHA256 = /^sha256:[0-9a-f]{64}$/i;
const BROKERS = new Set(['nats-jetstream', 'kafka']);
const WORKERS = new Set(['node-typescript', 'rust']);

export function benchmarkEntitlementForTier(tier) {
  const entitlement = BENCHMARK_TIERS[tier];
  if (!entitlement) throw new RangeError('UNSUPPORTED_BENCHMARK_TIER');
  return entitlement;
}

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value;
}

function requireNonNegativeNumber(value, name) {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative finite number`);
  }
  return value;
}

export function createBenchmarkEvidence(input) {
  requireObject(input, 'input');
  const source = requireObject(input.source, 'source');
  const artifacts = requireObject(input.artifacts, 'artifacts');
  const matrix = requireObject(input.matrix, 'matrix');
  const metrics = requireObject(input.metrics, 'metrics');
  const security = requireObject(input.security, 'security');

  if (!HEX40.test(source.commitSha ?? '')) throw new TypeError('source.commitSha must be a 40-char git SHA');
  if (!SHA256.test(artifacts.brokerImageDigest ?? '')) throw new TypeError('artifacts.brokerImageDigest must be sha256:<64hex>');
  if (!SHA256.test(artifacts.workerImageDigest ?? '')) throw new TypeError('artifacts.workerImageDigest must be sha256:<64hex>');
  if (!SHA256.test(artifacts.sbomDigest ?? '')) throw new TypeError('artifacts.sbomDigest must be sha256:<64hex>');
  if (!BROKERS.has(matrix.broker)) throw new RangeError('UNSUPPORTED_BROKER');
  if (!WORKERS.has(matrix.worker)) throw new RangeError('UNSUPPORTED_WORKER');

  const latency = requireObject(metrics.latencyMs, 'metrics.latencyMs');
  requireNonNegativeNumber(latency.p50, 'metrics.latencyMs.p50');
  requireNonNegativeNumber(latency.p95, 'metrics.latencyMs.p95');
  requireNonNegativeNumber(latency.p99, 'metrics.latencyMs.p99');
  requireNonNegativeNumber(metrics.throughputPerSecond, 'metrics.throughputPerSecond');
  requireNonNegativeNumber(metrics.cpuPercent, 'metrics.cpuPercent');
  requireNonNegativeNumber(metrics.memoryMiB, 'metrics.memoryMiB');
  requireNonNegativeNumber(metrics.diskBytes, 'metrics.diskBytes');
  requireNonNegativeNumber(metrics.restartRecoveryMs, 'metrics.restartRecoveryMs');

  const vulnerabilities = Array.isArray(security.vulnerabilities) ? security.vulnerabilities : [];
  const reachabilityEvidence = Array.isArray(security.reachabilityEvidence) ? security.reachabilityEvidence : [];
  const evidenceRefs = Array.isArray(input.evidenceRefs) ? [...input.evidenceRefs] : [];

  return {
    schemaVersion: BENCHMARK_SCHEMA_VERSION,
    profileId: input.profileId ?? 'CAPITAL_AI_EVENT_BACKBONE@1',
    evaluatedAt: input.evaluatedAt ?? new Date().toISOString(),
    source: {
      repository: source.repository ?? null,
      commitSha: source.commitSha.toLowerCase(),
    },
    artifacts: {
      brokerImageDigest: artifacts.brokerImageDigest.toLowerCase(),
      workerImageDigest: artifacts.workerImageDigest.toLowerCase(),
      sbomDigest: artifacts.sbomDigest.toLowerCase(),
    },
    matrix: {
      broker: matrix.broker,
      worker: matrix.worker,
    },
    metrics: {
      latencyMs: {
        p50: latency.p50,
        p95: latency.p95,
        p99: latency.p99,
      },
      throughputPerSecond: metrics.throughputPerSecond,
      cpuPercent: metrics.cpuPercent,
      memoryMiB: metrics.memoryMiB,
      diskBytes: metrics.diskBytes,
      restartRecoveryMs: metrics.restartRecoveryMs,
      droppedEvents: requireNonNegativeNumber(metrics.droppedEvents ?? 0, 'metrics.droppedEvents'),
      duplicateEvents: requireNonNegativeNumber(metrics.duplicateEvents ?? 0, 'metrics.duplicateEvents'),
    },
    security: {
      vulnerabilities,
      reachabilityEvidence,
      secretsFound: requireNonNegativeNumber(security.secretsFound ?? 0, 'security.secretsFound'),
    },
    evidenceRefs,
    decision: {
      benchmarkValid: true,
      productionEligible: false,
      decisionEligible: false,
      reason: 'BENCHMARK_EVIDENCE_ONLY',
    },
  };
}
