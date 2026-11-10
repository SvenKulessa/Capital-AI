/**
 * Negative cross-user isolation cases for Learning Portal private data (#388 WP-02).
 * Complements the broader coverage in vocabulary-checkout.test.mjs and learning-simulator.test.mjs.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createVocabularyCheckout } from './vocabulary-checkout.mjs';

function request({ method = 'GET', headers = {}, body = null } = {}) {
  return {
    method,
    headers,
    [Symbol.asyncIterator]: async function* () {
      if (body != null) yield Buffer.from(body);
    },
  };
}

function response() {
  return {
    status: null,
    payload: null,
    headers: new Map(),
    setHeader() {},
    writeHead(status) { this.status = status; },
    end(payload) { this.payload = payload; },
  };
}

function json(res, status, body) {
  res.status = status;
  res.payload = body;
}

const env = {
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_SECRET_KEY: 'sb_secret_' + 'x'.repeat(40),
};

function auth(userId) {
  return {
    sameOrigin: () => true,
    verify: async () => (userId ? { userId } : null),
  };
}

test('favorites are strictly isolated by verified session userId', async () => {
  const stores = new Map();
  const rpcUsers = [];
  const fetchImpl = async (url, options) => {
    const path = new URL(url).pathname;
    if (!path.endsWith('/capital_ai_learning_favorites')) throw new Error('unexpected');
    const body = JSON.parse(options.body);
    rpcUsers.push(body._user_id);
    const set = stores.get(body._user_id) ?? new Set();
    if (body._action === 'POST') set.add(body._term_id);
    if (body._action === 'DELETE') set.delete(body._term_id);
    stores.set(body._user_id, set);
    return Response.json([...set]);
  };

  async function call(userId, method, term = 'term-a') {
    const checkout = createVocabularyCheckout({ env, fetchImpl, auth: auth(userId) });
    const res = response();
    await checkout.handle(
      request({ method }),
      res,
      new URL(`https://capital-ai.online/api/learning/favorites?id=${term}&userId=attacker`),
      json,
    );
    return res;
  }

  assert.equal((await call('user-a', 'POST')).status, 200);
  assert.deepEqual((await call('user-a', 'GET')).payload.favorites, ['term-a']);
  assert.deepEqual((await call('user-b', 'GET')).payload.favorites, []);
  assert.equal((await call('user-b', 'DELETE', 'term-a')).status, 200);
  assert.deepEqual((await call('user-a', 'GET')).payload.favorites, ['term-a'], 'user-b must not delete user-a favorites');
  assert.ok(rpcUsers.every(id => id === 'user-a' || id === 'user-b'));
  assert.equal(rpcUsers.includes('attacker'), false);
});

test('quiz consume is isolated per user', async () => {
  const used = new Set();
  const fetchImpl = async (url, options) => {
    const path = new URL(url).pathname;
    if (path.endsWith('/capital_ai_get_vocabulary_access')) {
      const body = JSON.parse(options.body);
      return Response.json({ quizUsed: used.has(body._user_id), quantProEntitled: false });
    }
    if (path.endsWith('/capital_ai_consume_vocabulary_quiz')) {
      const body = JSON.parse(options.body);
      if (used.has(body._user_id)) return Response.json({ consumed: false, quizUsed: true });
      used.add(body._user_id);
      return Response.json({ consumed: true, quizUsed: true });
    }
    throw new Error('unexpected');
  };

  async function consume(userId) {
    const checkout = createVocabularyCheckout({ env, fetchImpl, auth: auth(userId) });
    const res = response();
    await checkout.handle(
      request({ method: 'POST', headers: { origin: 'https://capital-ai.online' } }),
      res,
      new URL('https://capital-ai.online/api/learning/vocabulary/quiz/consume'),
      json,
    );
    return res;
  }

  assert.equal((await consume('user-a')).status, 200);
  assert.equal((await consume('user-a')).status, 409);
  assert.equal((await consume('user-b')).status, 200, 'user-b still has a free quiz');
});

test('unauthenticated learning private endpoints never call storage', async () => {
  let calls = 0;
  const checkout = createVocabularyCheckout({
    env,
    auth: auth(null),
    fetchImpl: async () => { calls += 1; throw new Error('must not be called'); },
  });

  for (const [method, path] of [
    ['GET', '/api/learning/favorites'],
    ['POST', '/api/learning/favorites?id=term'],
    ['POST', '/api/learning/vocabulary/quiz/consume'],
  ]) {
    const res = response();
    await checkout.handle(
      request({ method, headers: { origin: 'https://capital-ai.online' } }),
      res,
      new URL(`https://capital-ai.online${path}`),
      json,
    );
    assert.equal(res.status, 401);
  }
  assert.equal(calls, 0);
});
