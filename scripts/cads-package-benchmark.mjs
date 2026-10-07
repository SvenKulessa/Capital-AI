import { createSecretKey } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { performance } from 'node:perf_hooks';
import { benchmarkEntitlementForTier } from '../packages/benchmark-core/index.mjs';
import {
  createCadsMarketplaceOAuthState,
  tierForMarketplacePlanId,
  verifyCadsMarketplaceOAuthState,
} from '../server/cads-marketplace.mjs';

const ITERATIONS = 2000;
const WARMUP = 200;
const SOURCE_SHA = /^[0-9a-f]{40}$/i.test(process.env.CADS_SOURCE_SHA || '')
  ? process.env.CADS_SOURCE_SHA.toLowerCase()
  : null;

const benchmarkEnv = {
  CADS_GITHUB_MARKETPLACE_STARTER_PLAN_ID: '1001',
  CADS_GITHUB_MARKETPLACE_PRO_PLAN_ID: '1002',
  CADS_GITHUB_MARKETPLACE_ENTERPRISE_PLAN_ID: '1003',
};

function percentile(values, q) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q))];
}

function measure(name, fn, thresholdP95Ms) {
  for (let i = 0; i < WARMUP; i++) fn(i);
  const samples = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const started = performance.now();
    fn(i);
    samples.push(performance.now() - started);
  }
  const totalMs = samples.reduce((sum, value) => sum + value, 0);
  const p50Ms = percentile(samples, 0.50);
  const p95Ms = percentile(samples, 0.95);
  const p99Ms = percentile(samples, 0.99);
  return {
    name,
    iterations: ITERATIONS,
    totalMs: +totalMs.toFixed(3),
    opsPerSecond: +(ITERATIONS / (totalMs / 1000)).toFixed(2),
    latencyMs: {
      p50: +p50Ms.toFixed(6),
      p95: +p95Ms.toFixed(6),
      p99: +p99Ms.toFixed(6),
    },
    threshold: { p95Ms: thresholdP95Ms },
    status: p95Ms <= thresholdP95Ms ? 'PASS' : 'FAIL',
  };
}

const oauthStateKey = createSecretKey(Buffer.from('cads-benchmark-oauth-state-key!!', 'utf8').subarray(0, 32));
const fixedNow = Date.parse('2026-10-06T12:00:00.000Z');

const beforeHeap = process.memoryUsage().heapUsed;
const cases = [
  measure('tier-entitlement-lookup', (i) => {
    benchmarkEntitlementForTier(['starter','pro','enterprise'][i % 3]);
  }, 1),
  measure('marketplace-plan-mapping', (i) => {
    const planId = [1001, 1002, 1003][i % 3];
    const tier = tierForMarketplacePlanId(planId, benchmarkEnv);
    if (!tier) throw new Error('PLAN_MAPPING_FAILED');
  }, 1),
  measure('oauth-state-roundtrip', (i) => {
    const state = createCadsMarketplaceOAuthState({
      userId: 'benchmark-user-' + (i % 10),
      installationId: 42 + (i % 10),
      stateKey: oauthStateKey,
      now: fixedNow,
    });
    const verified = verifyCadsMarketplaceOAuthState(state, oauthStateKey, fixedNow + 1000);
    if (!verified) throw new Error('OAUTH_STATE_ROUNDTRIP_FAILED');
  }, 5),
];
const afterHeap = process.memoryUsage().heapUsed;

const report = {
  schemaVersion: 'CAPITAL_AI_CADS_PACKAGE_BENCHMARK@1',
  generatedAt: new Date().toISOString(),
  source: {
    repository: 'SvenKulessa/Capital-AI',
    sourceSha: SOURCE_SHA,
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  },
  methodology: {
    warmupIterations: WARMUP,
    measuredIterationsPerCase: ITERATIONS,
    timing: 'performance.now',
    workload: 'dependency-free deterministic CADS product-contract microbenchmark; no network, no event-backbone comparison and no runtime secrets',
    thresholdsAreReleaseRegressionGuardsNotSla: true,
  },
  memory: {
    heapBeforeBytes: beforeHeap,
    heapAfterBytes: afterHeap,
    deltaBytes: afterHeap - beforeHeap,
  },
  cases,
  authorityBoundary: {
    benchmarkPassMayGrantSecurityApproval: false,
    benchmarkPassMayGrantLicenseApproval: false,
    benchmarkPassMayGrantMarketplaceApproval: false,
    benchmarkPassMayGrantProductionApproval: false,
  },
  status: cases.every(item => item.status === 'PASS') ? 'PASS' : 'FAIL',
};

const writeIndex = process.argv.indexOf('--write');
if (writeIndex >= 0) {
  const target = process.argv[writeIndex + 1];
  if (!target) throw new Error('--write requires a path');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify(report, null, 2) + '\n');
}

process.stdout.write(JSON.stringify(report) + '\n');
if (report.status !== 'PASS') process.exitCode = 1;
