import test from 'node:test';
import assert from 'node:assert/strict';
import { readbackConfig, tinyfishOwnerReadback } from '../server/tinyfish-owner-readback.mjs';

const ENV = Object.freeze({
  CAPITAL_AI_TINYFISH_READBACK_ENABLED: 'true',
  TINYFISH_API_KEY: 'synthetic-tinyfish-key-000000',
  TINYFISH_PROFILE_ID: 'prof_testowner123456'
});
const RUN = 'run_12345678';
const data = obj => `data: ${JSON.stringify(obj)}\n\n`;
const complete = result => data({ type: 'COMPLETE', run_id: RUN, status: 'COMPLETED', result });
const stream = chunks => new ReadableStream({
  start(controller) { for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk)); controller.close(); }
});
const sseResponse = chunks => new Response(stream(chunks), { status: 200, headers: { 'Content-Type': 'text/event-stream' } });

test('TinyFish owner CLI is disabled without explicit operator gate, valid key and approved profile', async () => {
  assert.throws(() => readbackConfig({}, 'instagram'), /TINYFISH_DISABLED/);
  assert.throws(() => readbackConfig({ ...ENV, TINYFISH_API_KEY: '' }), /TINYFISH_KEY_MISSING/);
  assert.throws(() => readbackConfig({ ...ENV, TINYFISH_PROFILE_ID: 'default' }), /TINYFISH_PROFILE_DENIED/);
  assert.throws(() => readbackConfig(ENV, 'https://evil.invalid/'), /TINYFISH_TARGET_DENIED/);
  let called = false;
  await assert.rejects(tinyfishOwnerReadback({ env: {}, fetchImpl: () => { called = true; } }), /TINYFISH_DISABLED/);
  assert.equal(called, false);
});

test('TinyFish SSE parses fragmented CRLF and multiline chunks, projects only safe fields', async () => {
  const payload = data({ type: 'STARTED', run_id: RUN }) + data({ type: 'PROGRESS', run_id: RUN, purpose: 'sensitive text not allowed in output' }) + complete({
    authenticated: true, username: 'svenkulessa', account_type: 'creator', facebook_account_linked: 'yes', facebook_page_linked: 'unknown', page_access: 'unknown', token: 'sensitive-value'
  });
  const pieces = [payload.slice(0, 13).replace(/\n/g, '\r\n'), payload.slice(13, 44), payload.slice(44)];
  const calls = [];
  const result = await tinyfishOwnerReadback({ env: ENV, fetchImpl: async (url, options) => {
    calls.push({ url, options }); return sseResponse(pieces);
  } });
  assert.deepEqual(result, { status: 'REPORTED', runId: RUN, username: 'svenkulessa', accountType: 'creator', facebookAccountLinked: 'yes', facebookPageLinked: 'unknown', pageAccess: 'unknown' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers['X-API-Key'], ENV.TINYFISH_API_KEY);
  const posted = JSON.parse(calls[0].options.body);
  assert.deepEqual({ profile_id: posted.profile_id, use_profile: posted.use_profile, use_vault: posted.use_vault }, { profile_id: ENV.TINYFISH_PROFILE_ID, use_profile: true, use_vault: false });
  assert.equal(posted.url, 'https://www.instagram.com/');
  assert.ok(!JSON.stringify(result).includes('sensitive-value'));
});

test('TinyFish incomplete stream recovers via GET with the same run ID without duplicate POST', async () => {
  const calls = [];
  const result = await tinyfishOwnerReadback({ env: ENV, pause: async () => {}, fetchImpl: async (url, options) => {
    calls.push({ url, method: options.method });
    if (options.method === 'POST') return sseResponse([data({ type: 'STARTED', run_id: RUN })]);
    if (calls.length === 2) return Response.json({ run_id: RUN, status: 'RUNNING' });
    return Response.json({ run_id: RUN, status: 'COMPLETED', result: { authenticated: true, account_type: 'business' } });
  } });
  assert.equal(result.status, 'REPORTED');
  assert.equal(result.accountType, 'business');
  assert.deepEqual(calls.map(x => x.method), ['POST', 'GET', 'GET']);
  assert.equal(calls[1].url, `https://agent.tinyfish.ai/v1/runs/${RUN}`);
});

test('TinyFish login wall is blocked even when upstream says COMPLETED', async () => {
  const result = await tinyfishOwnerReadback({ env: ENV, fetchImpl: async () => sseResponse([data({ type: 'STARTED', run_id: RUN }), complete({ authenticated: false, reason: 'enter account password' })]) });
  assert.deepEqual(result, { status: 'BLOCKED', reason: 'TINYFISH_AUTH_NOT_PROVEN', runId: RUN });
});

test('TinyFish STREAM COMPLETE failure cannot become a success', async () => {
  const result = await tinyfishOwnerReadback({ env: ENV, fetchImpl: async () => sseResponse([data({ type: 'STARTED', run_id: RUN }), data({ type: 'COMPLETE', run_id: RUN, status: 'FAILED', error: { message: 'token-should-not-appear' } })]) });
  assert.deepEqual(result, { status: 'BLOCKED', reason: 'TINYFISH_RUN_NOT_COMPLETED', runId: RUN });
});

test('TinyFish rejects mismatched run IDs and never starts a second paid run', async () => {
  const calls = [];
  const result = await tinyfishOwnerReadback({ env: ENV, pause: async () => {}, fetchImpl: async (url, options) => {
    calls.push(options.method);
    if (options.method === 'POST') return sseResponse([data({ type: 'STARTED', run_id: RUN }), data({ type: 'COMPLETE', run_id: 'run_other999', status: 'COMPLETED', result: { authenticated: true } })]);
    return Response.json({ run_id: RUN, status: 'FAILED' });
  } });
  // Reject an untrusted SSE run identity immediately: never recover or POST again.
  assert.deepEqual(result, { status: 'BLOCKED', reason: 'TINYFISH_STREAM_UNTRUSTED', runId: RUN });
  assert.deepEqual(calls, ['POST']);
});

test('TinyFish start failure masks upstream contents and never silently retries', async () => {
  const calls = [];
  const result = await tinyfishOwnerReadback({ env: ENV, fetchImpl: async (_url, options) => { calls.push(options.method); return new Response('secret stack trace', { status: 429 }); } });
  assert.deepEqual(result, { status: 'BLOCKED', reason: 'TINYFISH_RUN_ID_UNAVAILABLE' });
  assert.deepEqual(calls, ['POST']);
});

test('TinyFish result never relays invalid fields or an arbitrary account identifier', async () => {
  const result = await tinyfishOwnerReadback({ env: ENV, target: 'facebook', fetchImpl: async () => sseResponse([data({ type: 'STARTED', run_id: RUN }), complete({ authenticated: true, username: 'person@example.com', account_type: 'admin', page_access: 'superadmin', facebook_page_linked: 'maybe' })]) });
  assert.deepEqual(result, { status: 'REPORTED', runId: RUN, username: null, accountType: 'unknown', facebookAccountLinked: 'unknown', facebookPageLinked: 'unknown', pageAccess: 'unknown' });
});
