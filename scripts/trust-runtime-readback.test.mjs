import test from 'node:test';
import assert from 'node:assert/strict';
import { projectHealth, readHealth, readTinyFishConfig } from './trust-runtime-readback.mjs';

const SHA = 'a'.repeat(40);
const BUILDER = 'SvenKulessa/Capital-AI/.github/workflows/build-security.yml';
const health = () => ({ status: 'ok', runtimeIdentity: { sourceSha: SHA },
  buildIdentity: { bound: false, sourceSha: null }, unrelatedSecret: 'should-never-be-projected' });

const toResponse = (body, status = 200) => new Response(JSON.stringify(body), { status,
  headers: { 'content-type': 'application/json' } });

test('anonymous health evidence emits only allowlisted identity fields, not server secrets', async () => {
  const report = await readHealth({ expectedMainSha: SHA, fetchImpl: async (url, options) => {
    assert.equal(url, 'https://capital-ai-uvsl.onrender.com/healthz');
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'manual');
    assert.equal(options.headers.Authorization, undefined);
    return toResponse(health());
  } });
  assert.equal(report.httpStatus, 200);
  assert.equal(report.status, 'ok');
  assert.equal(report.runtimeIdentity.sourceSha, SHA);
  assert.deepEqual(report.buildIdentity, { bound: false, sourceSha: null, builder: null });
  assert.equal(report.runtimeMatchesExpectedMain, true);
  assert.equal(JSON.stringify(report).includes('should-never-be-projected'), false);
  assert.equal(report.evidenceType, 'ANONYMOUS_HTTP_CLAIM_NOT_OCI_ATTESTATION');
  assert.equal('verifiedOciAttestation' in report, false);
});

test('synthetic claimed bound image is not promoted to verified OCI attestation', () => {
  const body = health();
  body.buildIdentity = { bound: true, sourceSha: SHA, builder: BUILDER };
  const report = projectHealth(200, body, SHA);
  assert.equal(report.buildIdentity.bound, true);
  assert.equal(report.evidenceType, 'ANONYMOUS_HTTP_CLAIM_NOT_OCI_ATTESTATION');
  assert.equal('ociDigest' in report, false);
});

test('missing, foreign, oversized, redirected, and invalid health evidence fail closed', async () => {
  for (const input of [
    null,
    { status: 'ok', runtimeIdentity: { sourceSha: SHA } },
    { ...health(), runtimeIdentity: { sourceSha: 'x'.repeat(40) } },
    { ...health(), buildIdentity: { bound: true, sourceSha: SHA, builder: 'RENDER_DEPLOYMENT_ENVIRONMENT' } },
    { ...health(), buildIdentity: { bound: false, sourceSha: SHA } },
    { ...health(), status: 'SECRET\nINJECTION' },
  ]) assert.throws(() => projectHealth(200, input), Error);
  assert.throws(() => projectHealth(302, health()), Error);
  await assert.rejects(() => readHealth({ origin: 'https://evil.example', fetchImpl: async () => toResponse(health()) }));
  await assert.rejects(() => readHealth({ fetchImpl: async () => toResponse(health(), 302) }));
  await assert.rejects(() => readHealth({ fetchImpl: async () => new Response('x'.repeat(65537)) }));
  await assert.rejects(() => readHealth({ fetchImpl: async () => new Response('{secret') }));
});

test('without Render token no other provider calls occur', async () => {
  const result = await readTinyFishConfig({ fetchImpl: async () => { throw new Error('Unexpected'); } });
  assert.deepEqual(result, { status: 'NOT_PROVEN', enabled: null, reason: 'READ_TOKEN_NOT_AVAILABLE' });
});

test('only the direct TinyFish flag is read, and false is not activated', async () => {
  const visited = [];
  const result = await readTinyFishConfig({ token: 'synthetic', fetchImpl: async (url, options) => {
    visited.push(String(url));
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, 'Bearer synthetic');
    return toResponse({ envVar: { key: 'CAPITAL_AI_TINYFISH_READBACK_ENABLED', value: 'false' },
      unexpectedSecret: 'redacted' });
  } });
  assert.deepEqual(result, { status: 'VERIFIED_CONFIG', enabled: false, source: 'SERVICE_DIRECT', runtimeValidated: false });
  assert.equal(visited.length, 1);
  assert.ok(visited[0].endsWith('/env-vars/CAPITAL_AI_TINYFISH_READBACK_ENABLED'));
  assert.equal(JSON.stringify(result).includes('redacted'), false);
});

test('linked groups are considered only after direct key 404; collisions fail closed', async () => {
  const fake = (values) => async (url, options) => {
    const path = new URL(url).pathname;
    assert.equal(options.method, 'GET');
    if (path.startsWith('/v1/services/')) return toResponse({ error: 'not found' }, 404);
    if (path === '/v1/env-groups') return toResponse([
      { id: 'evg-aaa', serviceLinks: [{ id: 'srv-dau1rp893c1s73cdhm1g' }] },
      { id: 'evg-bbb', serviceLinks: [{ id: 'srv-dau1rp893c1s73cdhm1g' }] },
      { id: 'evg-foreign', serviceLinks: [{ id: 'srv-other' }] },
    ]);
    if (path.includes('evg-aaa')) return toResponse({ key: 'CAPITAL_AI_TINYFISH_READBACK_ENABLED', value: values[0] });
    if (path.includes('evg-bbb')) return toResponse({ key: 'CAPITAL_AI_TINYFISH_READBACK_ENABLED', value: values[1] });
    throw new Error('Unexpected URL');
  };
  assert.deepEqual(await readTinyFishConfig({ token: 'synthetic', fetchImpl: fake(['true', 'false']) }),
    { status: 'NOT_PROVEN', enabled: null, reason: 'GROUP_COLLISION' });
  assert.deepEqual(await readTinyFishConfig({ token: 'synthetic', fetchImpl: fake(['true', 'true']) }),
    { status: 'VERIFIED_CONFIG', enabled: true, source: 'LINKED_ENV_GROUP', runtimeValidated: false });
});

test('missing flag, unreadable API, and arbitrary provider responses never claim verified state', async () => {
  const missing = await readTinyFishConfig({ token: 'synthetic', fetchImpl: async (url) => {
    const path = new URL(url).pathname;
    if (path.startsWith('/v1/services/')) return toResponse({}, 404);
    return toResponse([]);
  } });
  assert.deepEqual(missing, { status: 'NOT_PROVEN', enabled: null, reason: 'KEY_NOT_FOUND' });
  const failed = await readTinyFishConfig({ token: 'synthetic', fetchImpl: async () => toResponse({ error: 'denied' }, 403) });
  assert.deepEqual(failed, { status: 'NOT_PROVEN', enabled: null, reason: 'RENDER_READ_FAILED' });
  const malformed = await readTinyFishConfig({ token: 'synthetic', fetchImpl: async () => toResponse({ secret: 'other' }) });
  assert.deepEqual(malformed, { status: 'NOT_PROVEN', enabled: null, reason: 'RENDER_READ_FAILED' });
});
