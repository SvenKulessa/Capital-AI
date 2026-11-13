import test from 'node:test';
import assert from 'node:assert/strict';
import { preflight } from './youtube-verification-preflight.mjs';

const digest = 'a'.repeat(64);
const options = { generation: '123', sha256: digest, approvedSha256: digest, token: 'synthetic-github-token', runId: '456' };
const reply = artifacts => async () => ({ ok: true, json: async () => ({ artifacts }) });

test('the approved digest and object generation are bound to the claim', async () => {
  const claim = await preflight({ ...options, fetchImpl: reply([]) });
  assert.equal(claim.generation, '123');
  assert.equal(claim.claimName, 'youtube-demo-claim-' + digest);
});

test('a previous claim forbids a duplicate insert', async () => {
  await assert.rejects(() => preflight({
    ...options, fetchImpl: reply([{ name: 'youtube-demo-claim-' + digest }]),
  }), /PRIOR_UPLOAD_CLAIM/);
});

test('unapproved media and input injection stop before any GitHub request', async () => {
  const fetchImpl = () => assert.fail('unexpected request');
  await assert.rejects(() => preflight({ ...options, approvedSha256: 'b'.repeat(64), fetchImpl }), /MEDIA_NOT_APPROVED/);
  await assert.rejects(() => preflight({ ...options, generation: '123\nx=2', fetchImpl }), /INPUT_INVALID/);
});
