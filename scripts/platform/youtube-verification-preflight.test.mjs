import test from 'node:test';
import assert from 'node:assert/strict';
import { preflight } from './youtube-verification-preflight.mjs';

const digest = 'a'.repeat(64);
const options = { generation: '123', sha256: digest, token: 'synthetic-github-token', runId: '456' };
const reply = artifacts => async () => ({ ok: true, json: async () => ({ artifacts }) });

test('the public claim omits the approved digest and object generation', async () => {
  const claim = await preflight({ ...options, fetchImpl: reply([]) });
  assert.deepEqual(claim, { claimName: 'youtube-verification-demo-claim-v1', runId: '456', status: 'CLAIMED_NO_AUTOMATIC_RETRY' });
});

test('a previous claim forbids a duplicate insert', async () => {
  await assert.rejects(() => preflight({
    ...options, fetchImpl: reply([{ name: 'youtube-verification-demo-claim-v1' }]),
  }), /PRIOR_UPLOAD_CLAIM/);
});

test('missing media digest and input injection stop before any GitHub request', async () => {
  const fetchImpl = () => assert.fail('unexpected request');
  await assert.rejects(() => preflight({ ...options, sha256: '', fetchImpl }), /INPUT_INVALID/);
  await assert.rejects(() => preflight({ ...options, generation: '123\nx=2', fetchImpl }), /INPUT_INVALID/);
});
