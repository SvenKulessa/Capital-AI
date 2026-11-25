import test from 'node:test';
import assert from 'node:assert/strict';
import { createB2BEvidenceOfflineFixture } from './b2b-evidence-leads-offline.mjs';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const body = tenantId => ({ tenantId, organization: 'Fixture Consulting GmbH', email: 'contact@fixture.test', repository: 'fixture/example', consent: true, privacyVersion: '2026-11-19', purpose: 'b2b_evidence_audit_contact' });
const session = userId => ({ req: { session: userId }, res: {} });
const auth = { verify: async req => ({ userId: req.session, subject: req.session }) };
const make = opts => createB2BEvidenceOfflineFixture({ mode: 'ISOLATED_OFFLINE_TEST', auth, ...opts });
const send = (fixture, tenant = A, requestId = 'fixture-001', override = {}) => fixture.submit({ ...session(tenant), body: body(tenant), requestId, ...override });

test('explicit offline test mode and injected authentication are mandatory', () => {
  assert.throws(() => createB2BEvidenceOfflineFixture({ auth }), /explicit test mode/);
  assert.throws(() => createB2BEvidenceOfflineFixture({ mode: 'ISOLATED_OFFLINE_TEST' }), /auth verifier/);
});
test('verified tenant UUID and subject binding produce a synthetic consent digest only', async () => {
  const fixture = make({ now: () => Date.parse('2026-11-23T12:00:00Z') });
  const accepted = await send(fixture);
  assert.equal(accepted.status, 202);
  const read = await fixture.read({ ...session(A), leadId: accepted.leadId });
  assert.equal(read.status, 200);
  assert.equal(read.tenantId, A);
  assert.deepEqual(read.consent, { version: '2026-11-19', purpose: 'b2b_evidence_audit_contact', at: '2026-11-23T12:00:00.000Z' });
  assert.equal(read.evidence.kind, 'SYNTHETIC_OFFLINE_ONLY');
  assert.match(read.evidence.sha256, /^[a-f0-9]{64}$/);
  assert(!('email' in read));
});
test('missing, forged, unverified and exception-throwing auth fail closed', async () => {
  const fixture = make();
  for (const identity of [undefined, 'tenant-a', ['x'], A.toUpperCase() + 'spoof']) {
    const res = await send(fixture, A, 'attempt-1', { req: { session: identity } });
    assert.equal(res.status, 401);
  }
  const lying = make({ auth: { verify: async () => ({ userId: A, subject: B }) } });
  assert.equal((await send(lying)).status, 401);
  const broken = make({ auth: { verify: async () => { throw new Error('secret-leak'); } } });
  const rejected = await send(broken);
  assert.equal(rejected.status, 401);
  assert(!JSON.stringify(rejected).includes('secret-leak'));
});
test('client-supplied tenant cannot override verified session tenant', async () => {
  const fixture = make();
  const result = await send(fixture, A, 'tenant-spoof', { body: body(B) });
  assert.deepEqual(result, { status: 403, code: 'TENANT_MISMATCH' });
});
test('cross-tenant read denies another user and never leaks contacts', async () => {
  const fixture = make();
  const accepted = await send(fixture);
  assert.equal((await fixture.read({ ...session(B), leadId: accepted.leadId })).status, 403);
  assert.equal((await fixture.read({ ...session(A), leadId: accepted.leadId })).status, 200);
});
test('same-tenant request replay is denied even when payload changes', async () => {
  const fixture = make();
  const accepted = await send(fixture);
  assert.equal(accepted.status, 202);
  assert.deepEqual(await send(fixture), { status: 409, code: 'REPLAY_DENIED' });
  assert.deepEqual(await send(fixture, A, 'fixture-001', { body: { ...body(A), organization: 'Other Fixture' } }), { status: 409, code: 'REPLAY_DENIED' });
});
test('concurrent identical requests result in one admission and one denial', async () => {
  const fixture = make();
  const responses = await Promise.all([send(fixture), send(fixture)]);
  assert.deepEqual(responses.map(x => x.status).sort(), [202, 409]);
});
test('same request ID is isolated between distinct authenticated tenants', async () => {
  const fixture = make();
  assert.equal((await send(fixture, A, 'same')).status, 202);
  assert.equal((await send(fixture, B, 'same')).status, 202);
});
test('missing or outdated consent is rejected before any persisted receipt', async () => {
  const fixture = make();
  for (const changes of [{ consent: false }, { privacyVersion: 'old' }, { purpose: 'publish_marketing' }]) {
    const r = await send(fixture, A, 'bad-consent', { body: { ...body(A), ...changes } });
    assert.equal(r.status, 422);
  }
  assert.equal((await send(fixture, A, 'bad-consent')).status, 202);
});
test('real-looking contact domains never enter the isolated test store', async () => {
  const fixture = make();
  assert.deepEqual(await send(fixture, A, 'real', { body: { ...body(A), email: 'client@company.com' } }), { status: 422, code: 'FIXTURE_SCOPE_DENIED' });
  assert.equal((await send(fixture, A, 'real')).status, 202);
});
test('missing or malformed request IDs reject before auth or storage', async () => {
  let calls = 0;
  const fixture = make({ auth: { verify: async req => { calls++; return { userId: req.session, subject: req.session }; } } });
  for (const requestId of [undefined, '', 'spoof\nheader', '<script>', 42]) {
    assert.equal((await fixture.submit({ ...session(A), body: body(A), requestId })).status, 400);
  }
  assert.equal(calls, 0);
});
test('fixture reset clears tenant data, replay guard and rate limit for a new test session', async () => {
  const fixture = make();
  const accepted = await send(fixture);
  assert.equal(accepted.status, 202);
  fixture.reset();
  assert.equal((await fixture.read({ ...session(A), leadId: accepted.leadId })).status, 404);
  assert.equal((await send(fixture)).status, 202);
});
test('separate fixture instances share no tenant data or request records', async () => {
  const first = make(), second = make();
  const accepted = await send(first);
  assert.equal((await second.read({ ...session(A), leadId: accepted.leadId })).status, 404);
  assert.equal((await send(second)).status, 202);
});
