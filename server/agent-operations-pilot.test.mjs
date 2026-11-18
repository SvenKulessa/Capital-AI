import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createAgentOperationsPilot, simulateAgentPilotWorkflow } from './agent-operations-pilot.mjs';

const SHA = 'a'.repeat(40);
const fixtures = Object.freeze({
  'ci-evidence': { repository: 'SvenKulessa/Capital-AI', commitSha: SHA,
    checks: { dockerSecurityGate: 'success', domainGovernance: 'success' } },
  'credential-expiry': { entries: [{ provider: 'github', daysToExpiry: 14 }, { provider: 'stripe', daysToExpiry: 90 }] },
  'media-rights': { assets: [{ id: 'hero-orbit', commercialRights: 'ALLOWED',
    sourceVerified: true, attributionComplete: true }] },
});
const auth = {
  verify: async req => req.subject ? { userId: req.subject } : null,
  resolvePaidTier: async req => req.tier || null,
  sameOrigin: req => req.headers.origin === 'https://capital-ai.online',
};
function durableFakeStore() {
  const rows = new Map();
  const limits = { starter: 2, pro: 10, enterprise: 30 };
  return {
    async create(request) {
      // Simulates the single-transaction database RPC, not a real SQL test.
      const key = request.userId + ':' + request.idempotencyKey;
      const existing = rows.get(key);
      if (existing) return existing.requestHash !== request.requestHash ?
        { state: 'conflict' } :
        { state: 'replayed', receipt: existing.receipt, receiptSha256: existing.receipt.receiptSha256 };
      const consumed = [...rows.values()].filter(x => x.userId === request.userId).length;
      const dailyLimit = limits[request.tier];
      if (consumed >= dailyLimit) return { state: 'quota_exceeded', used: consumed, dailyLimit };
      const entry = structuredClone(request);
      rows.set(key, entry);
      return { state: 'created', receipt: entry.receipt,
        receiptSha256: entry.receipt.receiptSha256, used: consumed + 1, dailyLimit };
    },
    async getById(userId, id) {
      const row = [...rows.values()].find(x => x.userId === userId && x.id === id);
      return row ? { receipt: structuredClone(row.receipt),
        receiptSha256: row.receipt.receiptSha256 } : null;
    },
    _rows: rows,
  };
}
const make = (extra = {}) => createAgentOperationsPilot({
  auth, env: { AGENT_OPERATIONS_PILOT_ENABLED: 'true', ...extra.env },
  registryBound: extra.registryBound ?? true,
  byokResolver: extra.byokResolver ?? null,
  store: extra.store || durableFakeStore(),
  now: extra.now ?? (() => Date.UTC(2026, 10, 17, 9, 0)),
});

async function call(pilot, method, pathname, body, subject = 'alice', tier = 'pro',
    origin = 'https://capital-ai.online') {
  const req = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]);
  req.method = method;
  req.subject = subject;
  req.tier = tier;
  req.headers = { origin, 'content-type': 'application/json' };
  const headers = {};
  const res = { setHeader: (k, v) => { headers[k] = v; } };
  let status, payload;
  const handled = await pilot.handle(req, res, new URL(pathname, 'https://capital-ai.online'),
    (_res, s, data) => { status = s; payload = data; });
  return { handled, status, payload, headers };
}
function post(workflowId, input = fixtures[workflowId], extra = {}) {
  return { workflowId, input, idempotencyKey: 'generated-demo-001', ...extra };
}

test('three source-labelled workflows produce bounded synthetic decisions only', () => {
  const ci = simulateAgentPilotWorkflow('ci-evidence', fixtures['ci-evidence']);
  assert.equal(ci.assessment, 'SYNTHETIC_READY_FOR_REVIEW');
  const cred = simulateAgentPilotWorkflow('credential-expiry', fixtures['credential-expiry']);
  assert.equal(cred.reviewCount, 1);
  const media = simulateAgentPilotWorkflow('media-rights', fixtures['media-rights']);
  assert.equal(media.assets[0].status, 'REVIEW_REQUIRED');
  assert.equal(simulateAgentPilotWorkflow('unknown', {}), null);
  assert.equal(simulateAgentPilotWorkflow('ci-evidence', { ...fixtures['ci-evidence'], token: 'secret' }), null);
  assert.equal(simulateAgentPilotWorkflow('credential-expiry', { entries: [{ provider: 'github', daysToExpiry: 3, apiKey: 'secret' }] }), null);
  assert.equal(simulateAgentPilotWorkflow('media-rights', { assets: [{ ...fixtures['media-rights'].assets[0], sourceVerified: false }] }).assets[0].status, 'NOT_PROVEN');
  assert.equal(simulateAgentPilotWorkflow('media-rights', { assets: [{ ...fixtures['media-rights'].assets[0], commercialRights: 'DENIED' }] }).assets[0].status, 'BLOCKED');
});

test('disabled by default, readiness is accurate and does not execute', async () => {
  const p = createAgentOperationsPilot({ auth, env: {}, registryBound: true });
  const info = await call(p, 'GET', '/api/agent-operations-pilot/readiness');
  assert.equal(info.status, 200);
  assert.equal(info.payload.workflowCatalog.length, 3);
  assert.equal(info.payload.enabled, false);
  assert.equal(info.payload.langGraphRuntimeBound, false);
  assert.equal(info.payload.externalProviderCalls, false);
  const run = await call(p, 'POST', '/api/agent-operations-pilot/runs', post('ci-evidence'));
  assert.equal(run.status, 503);
});

test('fail closed for unauthenticated, unpaid, other-origin and wrong methods', async () => {
  const p = make();
  assert.equal((await call(p, 'POST', '/api/agent-operations-pilot/runs', post('ci-evidence'), null)).status, 401);
  assert.equal((await call(p, 'POST', '/api/agent-operations-pilot/runs', post('ci-evidence'), 'alice', null)).status, 403);
  assert.equal((await call(p, 'POST', '/api/agent-operations-pilot/runs', post('ci-evidence'), 'alice', 'pro', 'https://attacker.test')).status, 403);
  assert.equal((await call(p, 'GET', '/api/agent-operations-pilot/runs')).status, 405);
  assert.equal((await call(p, 'POST', '/api/agent-operations-pilot/readiness')).status, 405);
  assert.equal((await call(p, 'GET', '/api/agent-operations-pilot/random')).status, 404);
  assert.equal((await call(p, 'GET', '/api/not-the-pilot')).handled, false);
});

test('authenticated user can retrieve own hash-bound receipt, other tenant cannot', async () => {
  const p = make();
  const result = await call(p, 'POST', '/api/agent-operations-pilot/runs', post('ci-evidence'));
  assert.equal(result.status, 201);
  assert.match(result.payload.receipt.receiptSha256, /^[a-f0-9]{64}$/);
  assert.match(result.payload.receipt.inputSha256, /^[a-f0-9]{64}$/);
  assert.equal(result.payload.receipt.estimatedApiCostEur, 0);
  assert.equal(result.payload.receipt.productionEligible, false);
  assert.ok(!JSON.stringify(result.payload).includes('alice'));
  const uri = '/api/agent-operations-pilot/runs/' + result.payload.receipt.id;
  const same = await call(p, 'GET', uri);
  assert.equal(same.status, 200);
  assert.equal(same.payload.receipt.id, result.payload.receipt.id);
  assert.equal((await call(p, 'GET', uri, undefined, 'bob')).status, 404);
  assert.equal((await call(p, 'GET', uri, undefined, null)).status, 401);
});

test('per-user starter daily quota and idempotency are bounded, independent per tenant', async () => {
  const p = make();
  const first = await call(p, 'POST', '/api/agent-operations-pilot/runs',
    post('credential-expiry', fixtures['credential-expiry'], { idempotencyKey: 'client-run-0001' }), 'alice', 'starter');
  assert.equal(first.status, 201);
  const replay = await call(p, 'POST', '/api/agent-operations-pilot/runs',
    post('credential-expiry', fixtures['credential-expiry'], { idempotencyKey: 'client-run-0001' }), 'alice', 'starter');
  assert.equal(replay.status, 200);
  assert.equal(replay.payload.receipt.id, first.payload.receipt.id);
  assert.equal((await call(p, 'POST', '/api/agent-operations-pilot/runs',
    post('ci-evidence', fixtures['ci-evidence'], { idempotencyKey: 'client-run-0001' }), 'alice', 'starter')).status, 409);
  assert.equal((await call(p, 'POST', '/api/agent-operations-pilot/runs',
    post('media-rights'), 'alice', 'starter')).status, 201);
  assert.equal((await call(p, 'POST', '/api/agent-operations-pilot/runs',
    post('media-rights'), 'alice', 'starter')).status, 429);
  assert.equal((await call(p, 'POST', '/api/agent-operations-pilot/runs',
    post('media-rights'), 'bob', 'starter')).status, 201);
});

test('rejects injected identities and raw secrets; accepts only preverified BYOK vault metadata', async () => {
  const p = make();
  const path = '/api/agent-operations-pilot/runs';
  assert.equal((await call(p, 'POST', path, { ...post('ci-evidence'), tenantId: 'bob' })).status, 400);
  assert.equal((await call(p, 'POST', path, { ...post('ci-evidence'), apiKey: 'sk-secret' })).status, 400);
  assert.equal((await call(p, 'POST', path, post('ci-evidence', fixtures['ci-evidence'], {
    byok: { mode: 'vault_reference', provider: 'openai', credentialRef: 'slot-1' } }))).status, 403);
  assert.equal((await call(p, 'POST', path, post('ci-evidence', fixtures['ci-evidence'], {
    byok: { mode: 'vault_reference', provider: 'openai', credentialRef: 'slot-1', secret: 'x' } }))).status, 400);
  const bound = make({ env: { AGENT_OPERATIONS_PILOT_BYOK_METADATA_ENABLED: 'true' },
    byokResolver: async (user, provider, ref) => user === 'alice' && provider === 'openai' && ref === 'slot-1' });
  const ok = await call(bound, 'POST', path, post('ci-evidence', fixtures['ci-evidence'], {
    byok: { mode: 'vault_reference', provider: 'openai', credentialRef: 'slot-1' } }));
  assert.equal(ok.status, 201);
  assert.deepEqual(ok.payload.receipt.byok, { mode: 'vault_reference', provider: 'openai', bound: true, calls: 0 });
  assert.equal(ok.payload.receipt.modelCalls, 0);
});

test('registry mismatch blocks every run and payloads are whitelisted', async () => {
  const p = make({ registryBound: false });
  assert.equal((await call(p, 'GET', '/api/agent-operations-pilot/readiness')).payload.enabled, false);
  assert.equal((await call(p, 'POST', '/api/agent-operations-pilot/runs', post('ci-evidence'))).status, 503);
  const x = make();
  assert.equal((await call(x, 'POST', '/api/agent-operations-pilot/runs', post('ci-evidence', { unknown: true }))).status, 400);
});

test('durable ledger survives recreated API instances and denies cross-tenant replay', async () => {
  const store = durableFakeStore();
  const path = '/api/agent-operations-pilot/runs';
  const a = make({ store });
  const first = await call(a, 'POST', path, post('ci-evidence', fixtures['ci-evidence'], {
    idempotencyKey: 'restart-resume-001',
  }), 'alice', 'starter');
  assert.equal(first.status, 201);
  const b = make({ store }); // no shared in-memory maps in the API
  const receiptPath = path + '/' + first.payload.receipt.id;
  assert.equal((await call(b, 'GET', receiptPath, undefined, 'alice', 'starter')).status, 200);
  assert.equal((await call(b, 'GET', receiptPath, undefined, 'bob', 'starter')).status, 404);
  assert.equal((await call(b, 'POST', path, post('ci-evidence', fixtures['ci-evidence'], {
    idempotencyKey: 'restart-resume-001',
  }), 'alice', 'starter')).status, 200);
  assert.equal((await call(b, 'POST', path, post('ci-evidence', fixtures['ci-evidence'], {
    idempotencyKey: 'restart-resume-001',
  }), 'bob', 'starter')).status, 201);
  assert.equal(store._rows.size, 2);
});

test('parallel requests across independent servers cannot exceed shared ledger quota', async () => {
  const store = durableFakeStore();
  const servers = Array.from({ length: 5 }, () => make({ store }));
  const outcomes = await Promise.all(Array.from({ length: 20 }, (_, i) =>
    call(servers[i % servers.length], 'POST', '/api/agent-operations-pilot/runs',
      post('credential-expiry', fixtures['credential-expiry'], {
        idempotencyKey: 'quota-race-' + String(i).padStart(12, '0'),
      }), 'alice', 'starter')));
  assert.equal(outcomes.filter(x => x.status === 201).length, 2);
  assert.equal(outcomes.filter(x => x.status === 429).length, 18);
  assert.equal(store._rows.size, 2);
});

test('unavailable or tampered durable storage fails closed, never returns a receipt', async () => {
  const unavailable = make({ store: { create: async () => { throw Error('secret-in-provider-body'); },
    getById: async () => { throw Error('secret-in-provider-body'); } } });
  const p = '/api/agent-operations-pilot/runs';
  const failure = await call(unavailable, 'POST', p, post('media-rights'));
  assert.equal(failure.status, 503);
  assert.equal(failure.payload.retryWithSameIdempotencyKey, true);
  assert.ok(!JSON.stringify(failure.payload).includes('secret-in-provider-body'));
  const store = durableFakeStore();
  const ok = await call(make({ store }), 'POST', p, post('media-rights'));
  const id = ok.payload.receipt.id;
  store._rows.values().next().value.receipt.result.candidateCount = 500;
  assert.equal((await call(make({ store }), 'GET', p + '/' + id)).status, 503);
  assert.equal((await call(make({ store }), 'POST', p, post('media-rights'))).status, 503);
});

test('server rejects missing idempotency key before using persistent ledger', async () => {
  const result = await call(make(), 'POST', '/api/agent-operations-pilot/runs',
    { workflowId: 'ci-evidence', input: fixtures['ci-evidence'] });
  assert.equal(result.status, 400);
});

