import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOpenAiStatus, openAiConfiguration, redactOpenAiOutput } from './openai-provider.mjs';

const url = new URL('https://example.com/api/profile/growth-intelligence/openai-status');
const production = 'sk-test-production';
const personal = 'sk-test-personal-should-never-be-used';

async function read(handler, method = 'GET') {
  const headers = {};
  let result;
  await handler.handle({ method }, { setHeader(name, value) { headers[name] = value; } },
    url, (_res, code, body) => { result = { code, body, headers }; });
  return result;
}

test('only the configured owner can cause a provider request, using a GET', async () => {
  const fetchImpl = () => assert.fail('Unexpected provider request');
  const env = { OPENAI_API_KEY: production };
  assert.equal((await read(createOpenAiStatus({ authorized: () => false, env, fetchImpl }))).code, 404);
  assert.equal((await read(createOpenAiStatus({ authorized: () => true, env, fetchImpl }), 'POST')).code, 405);
});

test('owner status verifies model metadata once per cache window and discloses only presence', async () => {
  const calls = [];
  let clock = 0;
  const handler = createOpenAiStatus({
    authorized: () => true,
    now: () => clock,
    env: { OPENAI_API_KEY: production, OPENAI_API_KEY_PERSONAL: personal, SOCIAL_CONTENT_OPENAI_MODEL: 'configured-model' },
    async fetchImpl(target, init) {
      calls.push(target);
      assert.equal(init.method, 'GET');
      assert.equal(init.headers.Authorization, 'Bearer ' + production);
      assert.equal(init.redirect, 'error');
      return Response.json({ object: 'model', id: 'configured-model', ignored: production });
    },
  });
  const [first, second] = await Promise.all([read(handler), read(handler)]);
  assert.deepEqual(first, second);
  assert.equal(first.headers['Cache-Control'], 'private, no-store');
  assert.equal(first.body.connection, 'CONNECTED');
  assert.equal(first.body.modelAvailable, true);
  assert.equal(first.body.personalKeyPresent, true);
  assert.equal(first.body.budget.permitsRequest, false);
  assert.ok(!JSON.stringify(first).includes(production));
  assert.ok(!JSON.stringify(first).includes(personal));
  clock = 60000;
  await read(handler);
  assert.deepEqual(calls, Array(2).fill('https://api.openai.com/v1/models/configured-model'));
});

test('personal key cannot authenticate a request and provider failures are projected safely', async () => {
  const personalOnly = createOpenAiStatus({
    authorized: () => true, env: { OPENAI_API_KEY_PERSONAL: personal },
    fetchImpl: () => assert.fail('Unexpected provider request'),
  });
  assert.equal((await read(personalOnly)).body.connection, 'NOT_CONFIGURED');
  for (const [status, connection] of [[401, 'AUTH_REJECTED'], [403, 'ACCESS_DENIED'], [429, 'RATE_LIMITED']]) {
    let calls = 0;
    const handler = createOpenAiStatus({
      authorized: () => true, env: { OPENAI_API_KEY: production },
      fetchImpl: async () => { calls++; return Response.json({ error: production }, { status }); },
    });
    const result = await read(handler);
    assert.equal(result.body.connection, connection);
    assert.ok(!JSON.stringify(result).includes(production));
    assert.equal(calls, 1);
  }
});

test('transient model metadata retry is bounded and model absence does not imply bad authentication', async () => {
  const replies = [
    new Response(null, { status: 503 }),
    new Response(null, { status: 404 }),
    Response.json({ object: 'list', data: [] }),
  ];
  const handler = createOpenAiStatus({
    authorized: () => true,
    env: { OPENAI_API_KEY: production, SOCIAL_CONTENT_OPENAI_MODEL: 'missing-model' },
    fetchImpl: async () => replies.shift(),
    sleep: async ms => assert.equal(ms, 250),
  });
  const { body } = await read(handler);
  assert.equal(body.connection, 'CONNECTED');
  assert.equal(body.modelAvailable, false);
  assert.equal(replies.length, 0);
});

test('per-request cost ceiling fails closed and credentials are redacted from generated text', () => {
  const env = {
    SOCIAL_BATCH_EXTERNAL_WORKERS: 'enabled',
    SOCIAL_CONTENT_OPENAI_MAX_REQUEST_MICROUSD: '17100',
    SOCIAL_CONTENT_OPENAI_INPUT_MICROUSD_PER_MTOKEN: '1000000',
    SOCIAL_CONTENT_OPENAI_OUTPUT_MICROUSD_PER_MTOKEN: '2000000',
  };
  assert.equal(openAiConfiguration(env).budget.maximumMicroUsd, 17100);
  assert.equal(openAiConfiguration(env).budget.permitsRequest, true);
  assert.equal(openAiConfiguration({ ...env, SOCIAL_CONTENT_OPENAI_MAX_REQUEST_MICROUSD: '17099' }).budget.permitsRequest, false);
  assert.equal(openAiConfiguration({ ...env, SOCIAL_CONTENT_OPENAI_INPUT_MICROUSD_PER_MTOKEN: '' }).budget.permitsRequest, false);
  assert.equal(redactOpenAiOutput(production + ' ' + personal, production), '[redacted] [redacted]');
});
