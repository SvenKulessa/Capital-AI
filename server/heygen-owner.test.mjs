import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable } from 'node:stream';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { approvedJobs, createHeygenOwner, normalizeVideo } from './heygen-owner.mjs';

const job = { jobId: 'marketing-01', sourceSha: 'a'.repeat(40), expiresAt: '2030-01-01T00:00:00Z', estimatedCostUsd: 2,
  costApprovalRef: 'owner-cost-01', rightsApprovalRef: 'rights-01', brandApprovalRef: 'brand-01', personaConsentRef: 'consent-01',
  payload: { type: 'avatar', avatar_id: 'avatar_01', voice_id: 'voice_01', script: 'CAPITAL-AI bietet einen BYOK-Baukasten.', title: 'Produktentwurf', aspect_ratio: '16:9', output_format: 'mp4' } };
const settings = { HEYGEN_ENABLED: 'true', HEYGEN_API_KEY: 'test-key', HEYGEN_PAID_USAGE_APPROVED: 'true',
  HEYGEN_APPROVED_BATCH_USD: '2', HEYGEN_APPROVED_JOBS_JSON: JSON.stringify([job]) };
async function fixture(t, overrides = {}, provider = async () => Response.json({ data: { video_id: 'v_one', status: 'waiting' } })) {
  // Use a private test directory under cwd, because production explicitly rejects /tmp.
  const dir = await mkdtemp(path.join(process.cwd(), '.heygen-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  let calls = [];
  const env = { ...settings, HEYGEN_STATE_DIR: dir, ...overrides };
  const auth = { authorizeIamRole: async () => true, sameOrigin: () => true };
  const service = createHeygenOwner({ env, auth, fetchImpl: async (...args) => { calls.push(args); return provider(...args); } });
  const request = async (method = 'POST', suffix = '/videos', body = { jobId: job.jobId }) => {
    const req = Readable.from([JSON.stringify(body)]);
    req.method = method; req.headers = { 'content-type': 'application/json' };
    const res = { setHeader() {} }; let result;
    await service.handle(req, res, new URL('https://capital-ai.online/api/growth/heygen' + suffix), (_res, status, data) => { result = { status, data }; });
    return result;
  };
  return { request, calls, auth, env, dir };
}

test('approved batch enforces strict payload, rights, expiry and aggregate estimate', () => {
  assert.equal(approvedJobs(settings).size, 1);
  for (const changed of [{ ...job, personaConsentRef: '' }, { ...job, expiresAt: '2020-01-01' },
    { ...job, payload: { ...job.payload, callback_url: 'https://attacker.test' } }]) {
    assert.throws(() => approvedJobs({ ...settings, HEYGEN_APPROVED_JOBS_JSON: JSON.stringify([changed]) }));
  }
  assert.throws(() => approvedJobs({ ...settings, HEYGEN_APPROVED_BATCH_USD: '1' }), /budget_exceeded/);
});
test('unauthorized and cross-origin callers never reach provider', async t => {
  const f = await fixture(t);
  f.auth.authorizeIamRole = async () => false;
  assert.equal((await f.request()).status, 403);
  f.auth.authorizeIamRole = async () => true; f.auth.sameOrigin = () => false;
  assert.equal((await f.request()).status, 403); assert.equal(f.calls.length, 0);
});
test('disabled, unpaid and absent state block before network', async t => {
  for (const env of [{ HEYGEN_ENABLED: 'false' }, { HEYGEN_PAID_USAGE_APPROVED: 'false' }, { HEYGEN_STATE_DIR: '' }, { HEYGEN_API_KEY: '' }]) {
    const f = await fixture(t, env); assert.equal((await f.request()).status, 503); assert.equal(f.calls.length, 0);
  }
});
test('browser cannot provide payload, key or approval', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('POST', '/videos', { jobId: job.jobId, payload: job.payload })).status, 400);
  assert.equal(f.calls.length, 0);
});
test('v3 request and persisted deduplication survive service restart', async t => {
  const f = await fixture(t);
  assert.equal((await f.request()).status, 202);
  assert.equal((await f.request()).data.videoId, 'v_one'); assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0][0], 'https://api.heygen.com/v3/videos');
  assert.equal(f.calls[0][1].redirect, 'error');
  assert.equal(f.calls[0][1].headers['x-api-key'], 'test-key');
  assert.match(f.calls[0][1].headers['Idempotency-Key'], /^capital-ai:[a-f0-9]{64}$/);
  assert.deepEqual(JSON.parse(f.calls[0][1].body), job.payload);
  const persisted = JSON.parse(await readFile(path.join(f.dir, job.jobId + '.json'), 'utf8'));
  assert.equal(persisted.status, 'WAITING'); assert.equal(JSON.stringify(persisted).includes('test-key'), false);
  const restarted = createHeygenOwner({ env: f.env, auth: f.auth, fetchImpl: () => assert.fail('duplicate network call') });
  const req = Readable.from([JSON.stringify({ jobId: job.jobId })]); req.method = 'POST'; req.headers = { 'content-type': 'application/json' };
  await restarted.handle(req, { setHeader() {} }, new URL('https://capital-ai.online/api/growth/heygen/videos'), (_r, s) => assert.equal(s, 202));
});
test('timeout remains UNKNOWN without retries or leaked upstream details', async t => {
  const f = await fixture(t, {}, async () => { throw Error('test-key confidential'); });
  const result = await f.request(); assert.equal(result.status, 502); assert.equal(JSON.stringify(result).includes('test-key'), false);
  assert.equal((await f.request()).data.status, 'UNKNOWN'); assert.equal(f.calls.length, 1);
});
test('status polling binds the provider ID and distinguishes output from verified bytes', async t => {
  const f = await fixture(t, {}, async (_url, init) => init.method === 'POST'
    ? Response.json({ data: { video_id: 'v_one', status: 'waiting' } })
    : Response.json({ data: { id: 'v_one', status: 'completed', video_url: 'https://files.heygen.ai/one.mp4' } }));
  await f.request(); const r = await f.request('GET', '/videos/' + job.jobId);
  assert.equal(r.data.status, 'COMPLETED'); assert.equal(r.data.assetVerified, false);
  assert.equal(r.data.publicPublishAllowed, false); assert.equal(f.calls[1][0], 'https://api.heygen.com/v3/videos/v_one');
});
test('unknown statuses fail closed; mismatched IDs and insecure output rejected', () => {
  assert.equal(normalizeVideo({ id: 'v_one', status: 'new-state' }).status, 'UNKNOWN');
  assert.throws(() => normalizeVideo({ id: 'v_two', status: 'waiting' }, 'v_one'));
  assert.throws(() => normalizeVideo({ id: 'v_one', status: 'completed', video_url: 'http://bad.test' }));
});
test('readiness never calls HeyGen or returns secrets', async t => {
  const f = await fixture(t); const r = await f.request('GET', '/readiness');
  assert.equal(r.data.configured, true); assert.equal(r.data.liveVerified, false);
  assert.equal(f.calls.length, 0); assert.equal(JSON.stringify(r).includes('test-key'), false);
});
test('parallel submissions perform at most one mutation', async t => {
  const f = await fixture(t);
  await Promise.all([f.request(), f.request()]); assert.equal(f.calls.length, 1);
});
test('changed approval cannot reuse an attempted job ID', async t => {
  const f = await fixture(t); await f.request();
  f.env.HEYGEN_APPROVED_JOBS_JSON = JSON.stringify([{ ...job, payload: { ...job.payload, script: 'Different script' } }]);
  assert.equal((await f.request()).status, 409); assert.equal(f.calls.length, 1);
});
test('rate-limit response is not retried and invalid upstream ID is not accepted', async t => {
  const f = await fixture(t, {}, async () => new Response('confidential', { status: 429 }));
  assert.equal((await f.request()).status, 502); assert.equal((await f.request()).data.status, 'UNKNOWN');
  assert.equal(f.calls.length, 1);
  const invalid = await fixture(t, {}, async () => Response.json({ data: { video_id: '../escape', status: 'waiting' } }));
  assert.equal((await invalid.request()).status, 400);
});
test('unknown jobs and oversized requests fail before network', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('POST', '/videos', { jobId: 'unapproved' })).status, 404);
  assert.equal((await f.request('POST', '/videos', { jobId: 'x'.repeat(2000) })).status, 400);
  assert.equal(f.calls.length, 0);
});
test('state directory cannot expose approval records through the public root', async t => {
  const f = await fixture(t);
  const service = createHeygenOwner({ env: f.env, auth: f.auth, publicRoot: f.dir, fetchImpl: () => assert.fail('public state reached provider') });
  const req = Readable.from([JSON.stringify({ jobId: job.jobId })]); req.method = 'POST'; req.headers = { 'content-type': 'application/json' };
  await service.handle(req, { setHeader() {} }, new URL('https://capital-ai.online/api/growth/heygen/videos'), (_r, s, body) => {
    assert.equal(s, 503); assert.equal(body.error, 'heygen_state_unconfigured');
  });
});
