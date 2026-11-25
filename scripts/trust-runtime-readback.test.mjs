import test from 'node:test';
import assert from 'node:assert/strict';
import { projectHealth, readHealth, readTinyFishConfig, healthReadbackSummary, safeHealthFailure } from './trust-runtime-readback.mjs';

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
    if (path === '/v1/services/srv-dau1rp893c1s73cdhm1g') return toResponse({ id: 'srv-dau1rp893c1s73cdhm1g', ownerId: 'tea-d90o4rj7uimc739i86ug' });
    if (path.startsWith('/v1/services/')) return toResponse({ error: 'not found' }, 404);
    if (path === '/v1/env-groups') return toResponse([
      { id: 'evg-aaa', ownerId: 'tea-d90o4rj7uimc739i86ug', serviceLinks: [{ id: 'srv-dau1rp893c1s73cdhm1g' }] },
      { id: 'evg-bbb', ownerId: 'tea-d90o4rj7uimc739i86ug', serviceLinks: [{ id: 'srv-dau1rp893c1s73cdhm1g' }] },
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
    if (path === '/v1/services/srv-dau1rp893c1s73cdhm1g') return toResponse({ id: 'srv-dau1rp893c1s73cdhm1g', ownerId: 'tea-d90o4rj7uimc739i86ug' });
    if (path.startsWith('/v1/services/')) return toResponse({}, 404);
    return toResponse([]);
  } });
  assert.deepEqual(missing, { status: 'NOT_PROVEN', enabled: null, reason: 'KEY_NOT_FOUND' });
  const failed = await readTinyFishConfig({ token: 'synthetic', fetchImpl: async () => toResponse({ error: 'denied' }, 403) });
  assert.deepEqual(failed, { status: 'NOT_PROVEN', enabled: null, reason: 'RENDER_HTTP_403', stage: 'SERVICE_FLAG' });
  const malformed = await readTinyFishConfig({ token: 'synthetic', fetchImpl: async () => toResponse({ secret: 'other' }) });
  assert.deepEqual(malformed, { status: 'NOT_PROVEN', enabled: null, reason: 'FLAG_SHAPE_INVALID', stage: 'SERVICE_FLAG' });
});

test('Render source SHA is reported separately and never promoted to attestation', () => {
  const body = { ...health(), renderGitBuildIdentity: {
    sourceSha: SHA, evidence: 'RENDER_GIT_BUILD_ARG_UNATTESTED'
  } };
  const report = projectHealth(200, body, SHA);
  assert.deepEqual(report.buildIdentity, { bound: false, sourceSha: null, builder: null });
  assert.deepEqual(report.renderGitBuildIdentity, {
    sourceSha: SHA, evidence: 'RENDER_GIT_BUILD_ARG_UNATTESTED', matchesRuntime: true
  });
  assert.equal(report.evidenceType, 'ANONYMOUS_HTTP_CLAIM_NOT_OCI_ATTESTATION');
  assert.equal('attestationVerified' in report, false);
});

test('Render source mismatch, invalid SHA, forged evidence or mixed builder fail closed', () => {
  const render = (sourceSha, evidence) => ({
    ...health(), renderGitBuildIdentity: { sourceSha, evidence }
  });
  const mismatch = projectHealth(200, render('b'.repeat(40), 'RENDER_GIT_BUILD_ARG_UNATTESTED'));
  assert.equal(mismatch.renderGitBuildIdentity.matchesRuntime, false);
  for (const bad of [
    render('x'.repeat(40), 'RENDER_GIT_BUILD_ARG_UNATTESTED'),
    render(SHA, 'GITHUB_ATTESTED'),
    render(null, 'RENDER_GIT_BUILD_ARG_UNATTESTED'),
    { ...render(SHA, 'RENDER_GIT_BUILD_ARG_UNATTESTED'),
      buildIdentity: { bound: true, sourceSha: SHA, builder: BUILDER } },
  ]) assert.throws(() => projectHealth(200, bad), Error);
});

test('readback summary surfaces pending deploy drift without failing the immutable HTTP projection', () => {
  const currentMain = 'b'.repeat(40);
  const observed = projectHealth(200, health(), currentMain);
  const summary = healthReadbackSummary(observed);
  assert.match(summary, /NOT_PROVEN_RUNTIME_SHA_DRIFT/);
  assert.match(summary, /NOT_PROVEN_UNBOUND/);
  assert.match(summary, /OCI \/ Sigstore attestation: NOT_PROVEN/);
  assert.ok(summary.includes(currentMain));
  assert.ok(summary.includes(SHA));
  assert.equal(summary.includes('should-never-be-projected'), false);
  assert.equal(observed.runtimeMatchesExpectedMain, false);
});

test('matching HTTP runtime is only a source claim, never a proven OCI attestation', () => {
  const observed = projectHealth(200, { ...health(), renderGitBuildIdentity: {
    sourceSha: SHA, evidence: 'RENDER_GIT_BUILD_ARG_UNATTESTED'
  } }, SHA);
  const summary = healthReadbackSummary(observed);
  assert.match(summary, /HTTP_SHA_CLAIM_MATCH_ONLY/);
  assert.match(summary, /RENDER_GIT_SHA_CLAIM_MATCH_ONLY/);
  assert.match(summary, /NOT_PROVEN_UNBOUND/);
  assert.match(summary, /OCI \/ Sigstore attestation: NOT_PROVEN/);
});

test('bound HTTP builder claim does not self-authorize signed image provenance', () => {
  const bound = health();
  bound.buildIdentity = { bound: true, sourceSha: SHA, builder: BUILDER };
  const summary = healthReadbackSummary(projectHealth(200, bound, SHA));
  assert.match(summary, /HTTP_BOUND_BUILDER_CLAIM_NOT_ATTESTED/);
  assert.match(summary, /OCI \/ Sigstore attestation: NOT_PROVEN/);
  assert.throws(() => healthReadbackSummary({ schema: 'FORGED' }), /READBACK_REPORT_INVALID/);
});


test('coerced SHA values are rejected and baked/runtime drift is explicit', () => {
  for (const body of [
    { ...health(), runtimeIdentity: { sourceSha: [SHA] } },
    { ...health(), buildIdentity: { bound: true, sourceSha: [SHA], builder: BUILDER } },
    { ...health(), renderGitBuildIdentity: { sourceSha: [SHA], evidence: 'RENDER_GIT_BUILD_ARG_UNATTESTED' } },
  ]) assert.throws(() => projectHealth(200, body), /INVALID_SOURCE_SHA/);
  assert.throws(() => projectHealth(200, health(), [SHA]), /INVALID_SOURCE_SHA/);
  const drift = projectHealth(200, { ...health(), buildIdentity: { bound: true, sourceSha: 'b'.repeat(40), builder: BUILDER } }, SHA);
  assert.match(healthReadbackSummary(drift), /NOT_PROVEN_BAKED_RUNTIME_SHA_DRIFT/);
  assert.match(healthReadbackSummary(drift), /OCI \/ Sigstore attestation: NOT_PROVEN/);
});

test('health CLI diagnostics allow only bounded fixed reason codes, never exception content',()=>{
  assert.equal(safeHealthFailure(new Error('HEALTH_HTTP_503')),'HEALTH_HTTP_503');
  assert.equal(safeHealthFailure(new Error('RENDER_BUILD_PROVENANCE_CONFLICT')),'RENDER_BUILD_PROVENANCE_CONFLICT');
  assert.equal(safeHealthFailure(new Error('INVALID_JSON')),'INVALID_JSON');
  assert.equal(safeHealthFailure(new Error('HEALTH_HTTP_503 token=secret')),'HEALTH_FETCH_OR_IO_FAILED');
  assert.equal(safeHealthFailure(new Error('network secret')),'HEALTH_FETCH_OR_IO_FAILED');
  assert.equal(safeHealthFailure({message:'HEALTH_HTTP_503'}),'HEALTH_FETCH_OR_IO_FAILED');
  assert.equal(safeHealthFailure(Object.assign(new Error('secret'),{name:'TimeoutError'})),'HEALTH_FETCH_TIMEOUT');
});

test('Render auth, rate-limit and server errors are distinct and sanitized, with no fallback', async () => {
  for (const status of [401, 403, 429, 500, 503]) {
    let calls = 0;
    const result = await readTinyFishConfig({ token: 'synthetic', fetchImpl: async () => {
      calls++; return toResponse({ error: 'private-provider-body' }, status);
    } });
    assert.deepEqual(result, { status: 'NOT_PROVEN', enabled: null, reason: 'RENDER_HTTP_' + status, stage: 'SERVICE_FLAG' });
    assert.equal(calls, 1);
    assert.ok(!JSON.stringify(result).includes('private-provider-body'));
  }
  const timeout = await readTinyFishConfig({ token: 'synthetic', fetchImpl: async () => {
    throw Object.assign(new Error('private URL or token'), { name: 'TimeoutError' });
  } });
  assert.equal(timeout.reason, 'RENDER_FETCH_TIMEOUT');
  const invalid = await readTinyFishConfig({ token: 'synthetic\n', fetchImpl: async () => { throw new Error('unexpected'); } });
  assert.equal(invalid.reason, 'READ_TOKEN_FORMAT_INVALID');
});

test('direct 404 does not imply key absence for a hidden or foreign service', async () => {
  for (const [metadata, code] of [[null, 'SERVICE_NOT_FOUND_OR_HIDDEN'], [{ id: 'srv-dau1rp893c1s73cdhm1g', ownerId: 'foreign' }, 'SERVICE_IDENTITY_MISMATCH']]) {
    let calls = 0;
    const result = await readTinyFishConfig({ token: 'synthetic', fetchImpl: async () => {
      calls++; return calls === 1 || metadata === null ? toResponse({}, 404) : toResponse(metadata);
    } });
    assert.equal(result.reason, code);
    assert.equal(result.stage, 'SERVICE_METADATA');
    assert.equal(calls, 2);
  }
});

test('group metadata filter uses ownerId and follows a short cursor page', async () => {
  const group = { id: 'evg-aaa', ownerId: 'tea-d90o4rj7uimc739i86ug', serviceLinks: [{ id: 'srv-dau1rp893c1s73cdhm1g' }] };
  const paths = [];
  const result = await readTinyFishConfig({ token: 'synthetic', fetchImpl: async (url) => {
    const u = new URL(url); paths.push(u.pathname);
    if (u.pathname === '/v1/services/srv-dau1rp893c1s73cdhm1g') return toResponse({ id: 'srv-dau1rp893c1s73cdhm1g', ownerId: 'tea-d90o4rj7uimc739i86ug' });
    if (u.pathname.startsWith('/v1/services/')) return toResponse({}, 404);
    if (u.pathname === '/v1/env-groups') {
      assert.equal(u.searchParams.get('ownerId'), 'tea-d90o4rj7uimc739i86ug');
      assert.equal(u.searchParams.has('ownerId[]'), false);
      return toResponse(u.searchParams.has('cursor') ? [] : [{ envGroup: group, cursor: 'next' }]);
    }
    return toResponse({ key: 'CAPITAL_AI_TINYFISH_READBACK_ENABLED', value: 'true' });
  } });
  assert.equal(result.status, 'VERIFIED_CONFIG');
  assert.equal(result.enabled, true);
  assert.equal(paths.filter(p => p === '/v1/env-groups').length, 2);
});

test('foreign linked group and malformed metadata stop before any group value read', async () => {
  for (const [metadata, code] of [
    [[{ id: 'evg-aaa', ownerId: 'foreign', serviceLinks: [{ id: 'srv-dau1rp893c1s73cdhm1g' }] }], 'GROUP_OWNER_MISMATCH'],
    [[{ id: 'evg-aaa' }], 'GROUP_LIST_INVALID'],
  ]) {
    let calls = 0;
    const result = await readTinyFishConfig({ token: 'synthetic', fetchImpl: async () => {
      calls++;
      if (calls === 1) return toResponse({}, 404);
      if (calls === 2) return toResponse({ id: 'srv-dau1rp893c1s73cdhm1g', ownerId: 'tea-d90o4rj7uimc739i86ug' });
      return toResponse(metadata);
    } });
    assert.equal(result.reason, code);
    assert.equal(result.stage, 'GROUP_METADATA');
    assert.equal(calls, 3);
  }
});
