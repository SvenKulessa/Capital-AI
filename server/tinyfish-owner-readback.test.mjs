import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import {
  readbackConfig, tinyfishOwnerReadback, createTinyfishOwnerReadback,
} from './tinyfish-owner-readback.mjs';

const ownerId = '11111111-1111-4111-8111-111111111111';
const env = Object.freeze({
  CAPITAL_AI_TINYFISH_READBACK_ENABLED: 'true',
  CAPITAL_AI_RENDER_OWNER_USER_ID: ownerId,
  CAPITAL_AI_RENDER_OWNER_EMAIL: 'owner@example.test',
  TINYFISH_API_KEY: 'secret_mock_key_123456789',
  TINYFISH_PROFILE_ID: 'prof_testowner1234',
});
const runId = 'run_1234567890';
const result = {
  authenticated: true, username: 'public.handle', account_type: 'business',
  facebook_account_linked: 'yes', facebook_page_linked: 'yes',
  page_access: 'task', cookie: 'SECRET_MUST_NOT_LEAK',
};
const sse = (...events) => new Response(events.map(event => 'data: ' + JSON.stringify(event) + '\n\n').join(''), {
  headers: { 'Content-Type': 'text/event-stream' },
});

function harness({ vars = env, identity = { userId: ownerId, email: 'owner@example.test', emailVerified: true },
  role = true, sameOrigin = true, run = async () => ({ status: 'REPORTED', runId }), now = () => 600000 } = {}) {
  const calls = [];
  const api = createTinyfishOwnerReadback({
    env: vars, run, now,
    auth: {
      verify: async () => identity,
      authorizeIamRole: async (_req, _res, required) => { assert.equal(required, 'owner'); return role; },
      sameOrigin: () => sameOrigin,
    },
  });
  async function request(payload = { target: 'instagram' }, options = {}) {
    const { method = 'POST', path = '/api/profile/tinyfish-owner-readback',
      contentType = 'application/json', origin = 'https://capital-ai.online' } = options;
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const req = Object.assign(Readable.from([body]), {
      method, headers: { 'content-type': contentType, origin },
    });
    const headers = {};
    const res = { setHeader: (k, v) => { headers[k.toLowerCase()] = v; } };
    let outcome;
    const handled = await api.handle(req, res, new URL(path, 'https://capital-ai.online'),
      (_res, status, data) => { outcome = { status, body: data }; calls.push(outcome); });
    return { handled, headers, ...outcome };
  }
  return { api, request, calls };
}

test('disabled, target, key and profile misconfiguration reject before a paid call', () => {
  assert.throws(() => readbackConfig({}, 'instagram'), /TINYFISH_DISABLED/);
  assert.throws(() => readbackConfig(env, 'url'), /TINYFISH_TARGET_DENIED/);
  assert.throws(() => readbackConfig({ ...env, TINYFISH_PROFILE_ID: 'other' }), /TINYFISH_PROFILE_DENIED/);
  assert.throws(() => readbackConfig({ ...env, TINYFISH_API_KEY: '' }), /TINYFISH_KEY_MISSING/);
});

test('SSE COMPLETE returns sanitized agent report and immutable target/profile', async () => {
  let posts = 0;
  const report = await tinyfishOwnerReadback({
    env, pause: async () => {},
    fetchImpl: async (url, opts) => {
      assert.equal(String(url), 'https://agent.tinyfish.ai/v1/automation/run-sse');
      assert.equal(opts.method, 'POST');
      posts += 1;
      const body = JSON.parse(opts.body);
      assert.match(body.session_id, /^[a-f0-9-]{36}$/);
      assert.equal(body.url, 'https://www.instagram.com/');
      assert.equal(body.profile_id, env.TINYFISH_PROFILE_ID);
      assert.equal(body.use_vault, false);
      assert.match(body.goal, /STRICTLY READ ONLY/);
      assert.ok(!Object.hasOwn(body, 'credential_item_ids'));
      return sse(
        { type: 'STARTED', run_id: runId },
        { type: 'HEARTBEAT' },
        { type: 'PROGRESS', run_id: runId, purpose: 'SECRET_PROGRESS' },
        { type: 'COMPLETE', run_id: runId, status: 'COMPLETED', result },
      );
    },
  });
  assert.equal(posts, 1);
  assert.equal(report.status, 'REPORTED');
  assert.equal(report.username, 'public.handle');
  assert.equal(report.pageAccess, 'task');
  assert.doesNotMatch(JSON.stringify(report), /SECRET|cookie|goal|profile_id|streaming_url/i);
});

test('SSE disconnect recovers by bounded GET of the same run without a second POST', async () => {
  const calls = [];
  const report = await tinyfishOwnerReadback({
    env, pause: async () => {},
    fetchImpl: async (url, opts) => {
      calls.push([opts.method, String(url)]);
      if (opts.method === 'POST') return sse({ type: 'STARTED', run_id: runId });
      return Response.json({ run_id: runId, status: 'COMPLETED', result });
    },
  });
  assert.equal(report.status, 'REPORTED');
  assert.deepEqual(calls.map(c => c[0]), ['POST', 'GET']);
  assert.equal(calls[1][1], 'https://agent.tinyfish.ai/v1/runs/' + runId);
});

test('mismatched SSE run ID fails closed without attempting recovery', async () => {
  let calls = 0;
  const report = await tinyfishOwnerReadback({
    env, fetchImpl: async () => {
      calls++;
      return sse({ type: 'STARTED', run_id: runId }, { type: 'PROGRESS', run_id: 'other_1234567890' });
    },
  });
  assert.equal(report.status, 'BLOCKED');
  assert.equal(report.reason, 'TINYFISH_STREAM_UNTRUSTED');
  assert.equal(calls, 1);
});

test('provider 429, FAILED, login wall and invalid payload remain non-verified', async () => {
  const limited = await tinyfishOwnerReadback({ env, fetchImpl: async () => Response.json({ token: 'DO_NOT_EXPOSE' }, { status: 429 }) });
  assert.equal(limited.status, 'BLOCKED');
  assert.doesNotMatch(JSON.stringify(limited), /DO_NOT_EXPOSE/);
  const failed = await tinyfishOwnerReadback({ env, fetchImpl: async () => sse({ type: 'COMPLETE', run_id: runId, status: 'FAILED', error: { token: 'SECRET' } }) });
  assert.equal(failed.status, 'BLOCKED');
  const login = await tinyfishOwnerReadback({ env, fetchImpl: async () => sse({ type: 'COMPLETE', run_id: runId, status: 'COMPLETED', result: { authenticated: false } }) });
  assert.equal(login.status, 'BLOCKED');
  const invalid = await tinyfishOwnerReadback({ env, fetchImpl: async () => sse({ type: 'COMPLETE', run_id: runId, status: 'COMPLETED', result: [] }) });
  assert.equal(invalid.status, 'NOT_PROVEN');
});

test('cross-user, role, email verification, MFA-denied, and disabled flags never execute agent', async () => {
  let runs = 0;
  const run = async () => { runs++; return { status: 'REPORTED', runId }; };
  for (const input of [
    { identity: { userId: 'other', email: 'owner@example.test', emailVerified: true } },
    { identity: { userId: ownerId, email: 'different@example.test', emailVerified: true } },
    { identity: { userId: ownerId, email: 'owner@example.test', emailVerified: false } },
    { identity: null }, // auth.verify returns null for an AAL1 user with verified TOTP
    { role: false },
    { vars: { ...env, CAPITAL_AI_TINYFISH_READBACK_ENABLED: 'false' } },
  ]) {
    const response = await harness({ ...input, run }).request();
    assert.equal(response.status, 404);
    assert.equal(response.body.error, 'not_found');
  }
  assert.equal(runs, 0);
});

test('owner-only route rejects method, cross-site origin, mutated target and unexpected fields before run', async () => {
  let runs = 0;
  const h = harness({ run: async () => { runs++; return { status: 'REPORTED', runId }; } });
  assert.equal((await h.request({}, { method: 'GET' })).status, 405);
  assert.equal((await h.request({}, { path: '/api/profile/tinyfish-owner-readback?goal=delete' })).status, 400);
  assert.equal((await harness({ sameOrigin: false, run: async () => { runs++; } }).request()).status, 403);
  assert.equal((await h.request({}, { contentType: 'text/plain' })).status, 415);
  assert.equal((await h.request({ target: 'https://evil.example/' })).status, 422);
  assert.equal((await h.request({ target: 'instagram', goal: 'post' })).status, 422);
  assert.equal((await h.request({ target: 'instagram', profile_id: 'attacker' })).status, 422);
  assert.equal((await h.request({ target: 'instagram', url: 'https://evil.example/' })).status, 422);
  assert.equal((await h.request({ target: 'instagram', runId: 'foreign_123456789' })).status, 422);
  assert.equal((await h.request('{"target":"instagram","padding":"' + 'x'.repeat(400) + '"}')).status, 400);
  assert.equal(runs, 0);
});

test('one owner run succeeds, concurrent and cooldown requests are rate-limited', async () => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  let runs = 0;
  const h = harness({ run: async () => { runs++; await pending; return { status: 'REPORTED', runId }; } });
  const first = h.request();
  // The test intentionally allows the first request to enter the provider before its concurrent request.
  await new Promise(resolve => setImmediate(resolve));
  const busy = await h.request();
  assert.equal(busy.status, 429);
  release();
  assert.equal((await first).status, 200);
  assert.equal((await h.request()).status, 429);
  assert.equal(runs, 1);
});
