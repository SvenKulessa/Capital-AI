import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createLearningSimulator, validateSimulatorScenario } from './learning-simulator.mjs';

const scenario = () => ({
  name: 'Referenzfall',
  weights: { equity: 0.5, bonds: 0.3, cash: 0.2 },
  vols: { equity: 0.18, bonds: 0.06, cash: 0.005 },
  corrs: {
    equity: { equity: 1, bonds: 0.2, cash: 0.05 },
    bonds: { equity: 0.2, bonds: 1, cash: 0.1 },
    cash: { equity: 0.05, bonds: 0.1, cash: 1 },
  },
});
const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_' + 'x'.repeat(45) };

function setup({ userId = 'example-user', tier = null, owner = false, sameOrigin = true, rpcBody = [] } = {}) {
  const calls = [];
  const auth = {
    verify: async () => userId ? { userId } : null,
    resolvePaidTier: async () => tier,
    authorizeIamRole: async () => owner,
    sameOrigin: () => sameOrigin,
  };
  const simulator = createLearningSimulator({
    auth, env, fetchImpl: async (url, args) => {
      calls.push({ url: String(url), body: JSON.parse(args.body) });
      return new Response(JSON.stringify(rpcBody), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });
  const run = async (method, endpoint, data) => {
    const req = Readable.from(data === undefined ? [] : [JSON.stringify(data)]);
    req.method = method;
    req.headers = { origin: 'https://capital-ai.online', 'content-type': 'application/json' };
    const res = { setHeader() {} };
    let result;
    const handled = await simulator.handle(req, res,
      new URL(endpoint, 'https://capital-ai.online'),
      (_response, status, payload) => { result = { status, payload }; });
    assert.equal(handled, true);
    return result;
  };
  return { run, calls };
}

test('strict scenario contract accepts base and rejects non-PSD or missing values', () => {
  assert.ok(validateSimulatorScenario(scenario()));
  const broken = scenario();
  broken.corrs.equity.bonds = 0.9;
  broken.corrs.bonds.equity = 0.9;
  broken.corrs.equity.cash = 0.9;
  broken.corrs.cash.equity = 0.9;
  broken.corrs.bonds.cash = -0.9;
  broken.corrs.cash.bonds = -0.9;
  assert.equal(validateSimulatorScenario(broken), null);
  assert.equal(validateSimulatorScenario({ ...scenario(), weights: { equity: NaN, bonds: 0.3, cash: 0.2 } }), null);
});

test('unauthenticated cannot read entitlement or scenarios', async () => {
  const { run, calls } = setup({ userId: null, tier: 'pro' });
  assert.equal((await run('GET', '/api/learning/simulator/entitlement')).status, 401);
  assert.equal((await run('GET', '/api/learning/simulator/scenarios')).status, 401);
  assert.equal(calls.length, 0);
});

test('Free/Starter users cannot directly access saved scenarios', async () => {
  for (const tier of [null, 'starter']) {
    const { run, calls } = setup({ tier });
    assert.deepEqual((await run('GET', '/api/learning/simulator/entitlement')).payload.entitled, false);
    assert.equal((await run('GET', '/api/learning/simulator/scenarios')).status, 403);
    assert.equal((await run('POST', '/api/learning/simulator/scenarios', scenario())).status, 403);
    assert.equal(calls.length, 0);
  }
});

test('Pro, Enterprise and verified Owner are authorized', async () => {
  for (const config of [{ tier: 'pro' }, { tier: 'enterprise' }, { owner: true }]) {
    const { run } = setup(config);
    assert.equal((await run('GET', '/api/learning/simulator/entitlement')).payload.entitled, true);
  }
});

test('cross-site modifications are rejected before DB access', async () => {
  const { run, calls } = setup({ tier: 'pro', sameOrigin: false });
  assert.equal((await run('POST', '/api/learning/simulator/scenarios', scenario())).status, 403);
  assert.equal((await run('DELETE', '/api/learning/simulator/scenarios/123')).status, 403);
  assert.equal(calls.length, 0);
});

test('invalid scenario, malformed UUID and unsupported method are rejected', async () => {
  const { run, calls } = setup({ tier: 'pro' });
  assert.equal((await run('POST', '/api/learning/simulator/scenarios', {
    ...scenario(), weights: { equity: 1, bonds: 1, cash: 0 },
  })).status, 400);
  assert.equal((await run('DELETE', '/api/learning/simulator/scenarios/not-a-uuid')).status, 400);
  assert.equal((await run('PATCH', '/api/learning/simulator/scenarios')).status, 405);
  assert.equal(calls.length, 0);
});

test('RPC always receives server-verified user ID; scenario ID is server generated', async () => {
  const { run, calls } = setup({ tier: 'pro', userId: 'trusted-user', rpcBody: { saved: true } });
  const output = await run('POST', '/api/learning/simulator/scenarios', scenario());
  assert.equal(output.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].body._user_id, 'trusted-user');
  assert.match(calls[0].body._id, /^[0-9a-f]{8}-/);
  assert.equal(calls[0].body._action, 'create');
  assert.equal(calls[0].body._payload.name, 'Referenzfall');
});

test('live RPC list rows flatten for the UI without exposing other fields', async () => {
  const saved = [{ id: '7d251ba5-0e92-447b-aa98-54a639de899d', createdAt: '2026-10-13T00:00:00Z', scenario: scenario() }];
  const { run, calls } = setup({ tier: 'pro', rpcBody: { scenarios: saved, limit: 10 } });
  const result = await run('GET', '/api/learning/simulator/scenarios');
  assert.equal(result.status, 200);
  assert.equal(result.payload.scenarios[0].name, 'Referenzfall');
  assert.equal(result.payload.scenarios[0].id, saved[0].id);
  assert.equal(calls[0].body._action, 'list');
});

test('scenario limit is mapped to HTTP 409', async () => {
  const { run } = setup({ tier: 'pro', rpcBody: { error: 'limit_reached' } });
  const result = await run('POST', '/api/learning/simulator/scenarios', scenario());
  assert.equal(result.status, 409);
});
