import test from 'node:test';
import assert from 'node:assert/strict';
import { inventory, readZone, probeService } from './ionos-domain-inventory.mjs';

const web = { id: 'a1', name: 'capital-ai.online', type: 'A', content: '192.0.2.1', ttl: 3600, disabled: false };
test('rollback contains only authorized web records; mail and unrelated names stay private', () => {
  const report = inventory({ name: 'capital-ai.online', records: [web, { name: '_mta-sts.capital-ai.online', type: 'TXT', content: 'private-verification-value' }, { name: 'internal.capital-ai.online', type: 'A', content: '192.0.2.2' }] });
  assert.deepEqual(report.rollbackWebRecords, [web]);
  assert.equal(report.preservedRecordCount, 2);
  assert.equal(report.mutationEligible, false);
  assert.ok(!JSON.stringify(report).includes('private-verification-value'));
  assert.ok(!JSON.stringify(report).includes('internal.capital-ai.online'));
  assert.match(report.preservedDigest, /^[a-f0-9]{64}$/);
});
test('wrong zone and incomplete rollback records fail closed', () => {
  assert.throws(() => inventory({ name: 'other.example', records: [] }), /INVALID_TARGET_ZONE/);
  assert.throws(() => inventory({ name: 'capital-ai.online', records: [{ ...web, disabled: undefined }] }), /INVALID_WEB_RECORD_SCHEMA/);
});
test('credential goes only to two fixed GET endpoints with redirects forbidden', async () => {
  const calls = [];
  await readZone('prefix.secret', async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => calls.length === 1 ? [{ name: 'other.example', id: 'skip' }, { name: 'capital-ai.online', id: 'target' }] : { name: 'capital-ai.online', records: [web] } };
  });
  assert.deepEqual(calls.map(c => c.url), ['https://api.hosting.ionos.com/dns/v1/zones', 'https://api.hosting.ionos.com/dns/v1/zones/target']);
  for (const call of calls) { assert.equal(call.options.method, 'GET'); assert.equal(call.options.redirect, 'error'); }
});
test('malformed keys make no request and upstream errors cannot disclose secrets', async () => {
  let requests = 0;
  await assert.rejects(readZone('bad key', async () => { requests++; }), /INVALID_OR_MISSING/);
  assert.equal(requests, 0);
  await assert.rejects(readZone('prefix.secret', async () => { throw new Error('prefix.secret'); }), { message: 'IONOS_REQUEST_FAILED' });
  await assert.rejects(readZone('prefix.secret', async () => ({ ok: false, status: 401 })), { message: 'IONOS_HTTP_401' });
});
test('duplicate target zones prevent ambiguous inventory', async () => {
  await assert.rejects(readZone('prefix.secret', async () => ({ ok: true, json: async () => [{ name: 'capital-ai.online', id: '1' }, { name: 'capital-ai.online', id: '2' }] })), /TARGET_ZONE_NOT_UNIQUE/);
});
test('SPA fallback with HTTP 200 cannot satisfy the MTA-STS gate', async () => {
  const report = await probeService(async () => new Response('<html>login</html>', { headers: { 'content-type': 'text/html' } }));
  assert.equal(report.mtaSts.pass, false);
  assert.equal(report.health.pass, false);
});
