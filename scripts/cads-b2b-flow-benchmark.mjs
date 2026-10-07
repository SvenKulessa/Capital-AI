import { createHmac, generateKeyPairSync } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { performance } from 'node:perf_hooks';
import { Readable } from 'node:stream';
import { createCadsMarketplace } from '../server/cads-marketplace.mjs';

const ITERATIONS = 200;
const WARMUP = 20;
const SOURCE_SHA = /^[0-9a-f]{40}$/i.test(process.env.CADS_SOURCE_SHA || '')
  ? process.env.CADS_SOURCE_SHA.toLowerCase()
  : null;
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' });
const WEBHOOK_SECRET = 'cads-flow-benchmark-webhook-secret-'.padEnd(64, 'x');

const env = {
  CADS_GITHUB_APP_ID: '12345',
  CADS_GITHUB_APP_PRIVATE_KEY: PRIVATE_KEY,
  CADS_GITHUB_CLIENT_ID: 'Iv1.cadsbenchmark',
  CADS_GITHUB_CLIENT_SECRET: 'cads-client-secret-'.padEnd(64, 'x'),
  CADS_GITHUB_MARKETPLACE_WEBHOOK_SECRET: WEBHOOK_SECRET,
  CADS_GITHUB_OAUTH_STATE_KEY_B64: Buffer.from('cads-oauth-state-key-material-32b', 'utf8').subarray(0, 32).toString('base64url'),
  CADS_GITHUB_MARKETPLACE_OWNER_ORG: 'capital-ai-benchmark',
  CADS_GITHUB_MARKETPLACE_LISTING_SLUG: 'capital-ai-cads',
  CADS_GITHUB_MARKETPLACE_STARTER_PLAN_ID: '1001',
  CADS_GITHUB_MARKETPLACE_PRO_PLAN_ID: '1002',
  CADS_GITHUB_MARKETPLACE_ENTERPRISE_PLAN_ID: '1003',
  CADS_GITHUB_PUBLIC_URL: 'https://capital-ai.online',
  SUPABASE_URL: 'https://benchmark.supabase.co',
  SUPABASE_SECRET_KEY: 'sb_secret_' + 'x'.repeat(40),
};

function percentile(values, q) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q))];
}

function webhookRequest(action, planId, deliveryId) {
  const payload = {
    action,
    marketplace_purchase: {
      account: { id: 42, login: 'benchmark-org', type: 'Organization' },
      plan: { id: planId, name: planId === 1001 ? 'Starter' : planId === 1002 ? 'Pro' : 'Enterprise' },
    },
    effective_date: '2026-10-06T12:00:00Z',
  };
  const raw = Buffer.from(JSON.stringify(payload));
  const request = Readable.from([raw]);
  request.method = 'POST';
  request.headers = {
    'content-type': 'application/json',
    'x-github-event': 'marketplace_purchase',
    'x-github-delivery': deliveryId,
    'x-hub-signature-256': 'sha256=' + createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex'),
  };
  return request;
}

function responseHarness() {
  return {
    headers: new Map(),
    setHeader(name, value) { this.headers.set(name, value); },
    writeHead() {},
    end() {},
  };
}

function fetchForPlan(planId, action) {
  return async (url) => {
    const target = String(url);
    if (target.startsWith('https://api.github.com/marketplace_listing/accounts/42')) {
      return new Response(JSON.stringify({
        account: { id: 42, login: 'benchmark-org', type: 'Organization' },
        plan: { id: planId },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (target.includes('/rest/v1/rpc/capital_ai_apply_cads_marketplace_purchase')) {
      return new Response(JSON.stringify({
        duplicate: false,
        status: action === 'cancelled' ? 'CANCELLED' : 'ACTIVE',
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (target.includes('/rest/v1/rpc/capital_ai_purge_cads_marketplace_data')) {
      return new Response(JSON.stringify({ entitlementsDeleted: 0, eventsDeleted: 0 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    throw new Error('unexpected benchmark fetch ' + target);
  };
}

async function one(action, planId, iteration) {
  const marketplace = createCadsMarketplace({
    env,
    fetchImpl: fetchForPlan(planId, action),
    audit: () => {},
    now: () => new Date('2026-10-06T12:00:00Z'),
  });
  const req = webhookRequest(action, planId, 'bench-' + action + '-' + String(iteration).padStart(8, '0'));
  let status = 0;
  let payload = null;
  const handled = await marketplace.handle(
    req,
    responseHarness(),
    new URL('https://capital-ai.online/api/integrations/github/cads-marketplace'),
    (_res, nextStatus, nextPayload) => { status = nextStatus; payload = nextPayload; },
  );
  marketplace.close();
  if (!handled || status !== 200 || payload?.accepted !== true) {
    throw new Error('B2B_FLOW_BENCHMARK_FAILED_' + action + '_' + status);
  }
}

async function measure(action, planId, thresholdP95Ms) {
  for (let i = 0; i < WARMUP; i++) await one(action, planId, i);
  const samples = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const started = performance.now();
    await one(action, planId, WARMUP + i);
    samples.push(performance.now() - started);
  }
  const totalMs = samples.reduce((sum, value) => sum + value, 0);
  const p95Ms = percentile(samples, 0.95);
  return {
    action,
    iterations: ITERATIONS,
    totalMs: +totalMs.toFixed(3),
    opsPerSecond: +(ITERATIONS / (totalMs / 1000)).toFixed(2),
    latencyMs: {
      p50: +percentile(samples, 0.50).toFixed(6),
      p95: +p95Ms.toFixed(6),
      p99: +percentile(samples, 0.99).toFixed(6),
    },
    threshold: { p95Ms: thresholdP95Ms },
    status: p95Ms <= thresholdP95Ms ? 'PASS' : 'FAIL',
  };
}

const cases = [
  await measure('purchased', 1001, 25),
  await measure('changed', 1002, 25),
  await measure('cancelled', 1003, 10),
];

const report = {
  schemaVersion: 'CAPITAL_AI_CADS_B2B_FLOW_BENCHMARK@1',
  generatedAt: new Date().toISOString(),
  source: {
    repository: 'SvenKulessa/Capital-AI',
    sourceSha: SOURCE_SHA,
    node: process.version,
  },
  methodology: {
    network: 'mocked deterministic GitHub Marketplace + Supabase boundaries',
    applicationLogic: 'real server/cads-marketplace.mjs HMAC/JWT/plan/readback/store routing',
    warmupIterations: WARMUP,
    measuredIterationsPerAction: ITERATIONS,
    realExternalE2EStillRequired: true,
  },
  cases,
  authorityBoundary: {
    realMarketplacePurchaseVerified: false,
    productionEligible: false,
    marketplaceApproved: false,
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
