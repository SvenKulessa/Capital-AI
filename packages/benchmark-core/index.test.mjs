import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BENCHMARK_SCHEMA_VERSION,
  benchmarkEntitlementForTier,
  createBenchmarkEvidence,
} from './index.mjs';

const digest = 'sha256:' + 'a'.repeat(64);
const base = {
  profileId: 'CAPITAL_AI_EVENT_BACKBONE@1',
  evaluatedAt: '2026-10-05T15:56:00.000Z',
  source: {
    repository: 'SvenKulessa/Capital-AI',
    commitSha: 'e3dff55bb85a2efc5fbbea8dd435cb31f0c11408',
  },
  artifacts: {
    brokerImageDigest: digest,
    workerImageDigest: digest,
    sbomDigest: digest,
  },
  matrix: {
    broker: 'nats-jetstream',
    worker: 'node-typescript',
  },
  metrics: {
    latencyMs: { p50: 1, p95: 2, p99: 3 },
    throughputPerSecond: 1000,
    cpuPercent: 10,
    memoryMiB: 128,
    diskBytes: 4096,
    restartRecoveryMs: 250,
    droppedEvents: 0,
    duplicateEvents: 0,
  },
  security: {
    vulnerabilities: [],
    reachabilityEvidence: [],
    secretsFound: 0,
  },
};

test('Starter, Pro und Enterprise sind fail-closed als einzige Benchmark-Tiers definiert', () => {
  assert.equal(benchmarkEntitlementForTier('starter').label, 'Starter');
  assert.equal(benchmarkEntitlementForTier('pro').capabilities.regressionDetection, true);
  assert.equal(benchmarkEntitlementForTier('enterprise').capabilities.enforcedPrGate, true);
  assert.throws(() => benchmarkEntitlementForTier('team'), /UNSUPPORTED_BENCHMARK_TIER/);
});

test('Benchmark-Evidence kann niemals selbst Production-Freigabe erteilen', () => {
  const result = createBenchmarkEvidence(base);
  assert.equal(result.schemaVersion, BENCHMARK_SCHEMA_VERSION);
  assert.equal(result.decision.benchmarkValid, true);
  assert.equal(result.decision.productionEligible, false);
  assert.equal(result.decision.decisionEligible, false);
  assert.equal(result.decision.reason, 'BENCHMARK_EVIDENCE_ONLY');
});

test('Broker und Worker werden explizit statt implizit zugelassen', () => {
  assert.throws(
    () => createBenchmarkEvidence({...base, matrix:{broker:'unknown', worker:'node-typescript'}}),
    /UNSUPPORTED_BROKER/,
  );
  assert.throws(
    () => createBenchmarkEvidence({...base, matrix:{broker:'kafka', worker:'python'}}),
    /UNSUPPORTED_WORKER/,
  );
});

test('Evidence muss an exakte Git- und Image-Identitäten gebunden sein', () => {
  assert.throws(
    () => createBenchmarkEvidence({...base, source:{...base.source, commitSha:'main'}}),
    /40-char git SHA/,
  );
  assert.throws(
    () => createBenchmarkEvidence({...base, artifacts:{...base.artifacts, brokerImageDigest:'latest'}}),
    /sha256/,
  );
});
