import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleMaintenance } from './google-maintenance-api.mjs';
import { handleGoogleMaintenanceMessage } from '../scripts/google-maintenance-mcp.mjs';

const property = 'properties/548187678';
function harness({ writes = false, failStatus, identityMismatch = false } = {}) {
  const calls = [];
  let ms = 1000;
  let settings = { name: property, displayName: 'Capital-AI', timeZone: 'Europe/Berlin', currencyCode: 'EUR' };
  const api = createGoogleMaintenance({
    env: { GOOGLE_MAINTENANCE_GA4_WRITES_ENABLED: String(writes) }, now: () => ms,
    tokenProvider: async () => 'private-token',
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), method: options.method, body: options.body });
      assert.equal(options.headers.Authorization, 'Bearer private-token');
      assert.equal(options.redirect, 'error');
      if (failStatus) return new Response('private-provider-error', { status: failStatus });
      if (options.method === 'PATCH') settings = { ...settings, ...JSON.parse(options.body) };
      let data = settings;
      if (url.hostname === 'cloudresourcemanager.googleapis.com') data = { name: 'projects/542877602707', projectId: 'aifinancial-500208', state: 'ACTIVE' };
      if (url.hostname === 'serviceusage.googleapis.com') data = { services: [{ config: { name: 'analyticsdata.googleapis.com' }, state: 'ENABLED' }] };
      if (url.hostname === 'analyticsdata.googleapis.com') data = { rows: [] };
      if (identityMismatch) data = { ...data, name: 'properties/999999999', projectId: 'other-project' };
      return Response.json(data);
    },
  });
  return { api, calls, advance: value => { ms += value; }, alter: value => { settings = { ...settings, ...value }; } };
}

test('tools bind exact property/project and do not accept arbitrary resources', async () => {
  const { api, calls } = harness();
  assert.equal((await api.call('ga4_get_property')).name, property);
  assert.equal((await api.call('gcp_get_project')).projectId, 'aifinancial-500208');
  await api.call('gcp_list_enabled_services');
  assert.match(calls.at(-1).url, /serviceusage.googleapis.com\/v1\/projects\/542877602707\/services/);
  const count = calls.length;
  await assert.rejects(api.call('ga4_get_property', { propertyId: '999' }), /UNSUPPORTED_ARGUMENT/);
  await assert.rejects(api.call('arbitrary_http', { url: 'https://other.test' }), /TOOL_NOT_ALLOWED/);
  assert.equal(calls.length, count);
});

test('missing identity and disabled mutation fail before provider activity', async () => {
  await assert.rejects(createGoogleMaintenance({ env: {} }).call('ga4_get_property'), /IDENTITY_NOT_CONFIGURED/);
  const { api, calls } = harness();
  await assert.rejects(api.call('ga4_plan_property_update', { patch: { displayName: 'New' } }), /WRITES_DISABLED/);
  await assert.rejects(api.call('ga4_apply_property_update', { planId: 'made-up' }), /WRITES_DISABLED/);
  assert.equal(calls.length, 0);
});

test('country report is aggregated, bounded and restricted to five target markets', async () => {
  const { api, calls } = harness();
  await api.call('ga4_country_report', { days: 28 });
  const body = JSON.parse(calls[0].body);
  assert.deepEqual(body.dimensions, [{ name: 'country' }]);
  assert.equal(body.dateRanges[0].endDate, 'yesterday');
  assert.deepEqual(body.dimensionFilter.filter.inListFilter.values, ['Germany', 'Italy', 'Spain', 'Portugal', 'United Kingdom']);
  await assert.rejects(api.call('ga4_country_report', { days: 365 }), /INVALID_REPORT_WINDOW/);
});

test('planned updates use fixed property, exact mask, one attempt and verified readback', async () => {
  const { api, calls } = harness({ writes: true });
  const plan = await api.call('ga4_plan_property_update', { patch: { displayName: 'Capital-AI Online' } });
  assert.equal(calls.some(call => call.method === 'PATCH'), false);
  const result = await api.call('ga4_apply_property_update', { planId: plan.id });
  assert.equal(result.status, 'UPDATE_VERIFIED');
  assert.equal(result.after.displayName, 'Capital-AI Online');
  const patch = calls.find(call => call.method === 'PATCH');
  assert.match(patch.url, /properties\/548187678\?updateMask=displayName/);
  assert.deepEqual(JSON.parse(patch.body), { name: property, displayName: 'Capital-AI Online' });
  await assert.rejects(api.call('ga4_apply_property_update', { planId: plan.id }), /PLAN_MISSING_OR_EXPIRED/);
});

test('expired plans and concurrent setting changes never issue a PATCH', async () => {
  const h = harness({ writes: true });
  let plan = await h.api.call('ga4_plan_property_update', { patch: { timeZone: 'Europe/Rome' } });
  h.advance(300000);
  await assert.rejects(h.api.call('ga4_apply_property_update', { planId: plan.id }), /PLAN_MISSING_OR_EXPIRED/);
  plan = await h.api.call('ga4_plan_property_update', { patch: { displayName: 'New' } });
  h.alter({ displayName: 'Someone else changed it' });
  await assert.rejects(h.api.call('ga4_apply_property_update', { planId: plan.id }), /PROPERTY_CHANGED_REPLAN/);
  assert.equal(h.calls.some(call => call.method === 'PATCH'), false);
});

test('IAM, access bindings and invalid settings are rejected before Google requests', async () => {
  const { api, calls } = harness({ writes: true });
  for (const patch of [{ owner: 'agent' }, { displayName: '' }, { timeZone: 'invalid-zone' }, { currencyCode: 'eur' }, {}]) {
    await assert.rejects(api.call('ga4_plan_property_update', { patch }));
  }
  assert.equal(calls.length, 0);
});

test('provider identities and HTTP failures fail closed without response-body disclosure', async () => {
  await assert.rejects(harness({ identityMismatch: true }).api.call('ga4_get_property'), /PROPERTY_MISMATCH/);
  await assert.rejects(harness({ identityMismatch: true }).api.call('gcp_get_project'), /PROJECT_MISMATCH/);
  const response = await handleGoogleMaintenanceMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'ga4_get_property' } }, harness({ failStatus: 403 }).api);
  assert.equal(response.result.isError, true);
  assert.equal(response.result.content[0].text, 'GOOGLE_HTTP_403');
  assert.doesNotMatch(JSON.stringify(response), /private-token|private-provider-error/);
});

test('MCP exposes only named maintenance tools and handles initialization and notifications', async () => {
  const { api, calls } = harness();
  const response = await handleGoogleMaintenanceMessage({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, api);
  assert.equal(response.result.tools.length, 10);
  assert.equal(response.result.tools.some(tool => /delete|iam|shell|browser/.test(tool.name)), false);
  const init = await handleGoogleMaintenanceMessage({ jsonrpc: '2.0', id: 2, method: 'initialize' }, api);
  assert.equal(init.result.serverInfo.name, 'capital-ai-google-maintenance');
  assert.equal(await handleGoogleMaintenanceMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }, api), null);
  const blocked = await handleGoogleMaintenanceMessage({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'delete_project' } }, api);
  assert.equal(blocked.error.code, -32602);
  assert.equal(calls.length, 0);
});

test('MCP negotiates supported older versions and rejects invalid IDs before calls', async () => {
  const h = harness();
  const response = await handleGoogleMaintenanceMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05' } }, h.api);
  assert.equal(response.result.protocolVersion, '2024-11-05');
  for (const id of [null, {}, []]) {
    const invalid = await handleGoogleMaintenanceMessage({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'ga4_get_property' } }, h.api);
    assert.equal(invalid.error.code, -32600);
  }
  assert.equal(h.calls.length, 0);
});

test('stream association requires exact HTTPS capital-ai.online hostname', async () => {
  const api = createGoogleMaintenance({
    tokenProvider: async () => 'private-token', env: {},
    fetchImpl: async () => Response.json({ dataStreams: [
      { name: property + '/dataStreams/1', webStreamData: { defaultUri: 'https://capital-ai.online/' } },
      { name: property + '/dataStreams/2', webStreamData: { defaultUri: 'https://capital-ai.online.other.test/' } },
      { name: property + '/dataStreams/3', webStreamData: { defaultUri: 'http://capital-ai.online/' } },
    ] }),
  });
  assert.deepEqual((await api.call('ga4_list_data_streams')).streams.map(stream => stream.associatedDomainVerified), [true, false, false]);
});

test('GSC queries use exact property, target countries and bounded readonly reports', async () => {
  const h = harness();
  await h.api.call('gsc_country_report', { days: 28 });
  assert.equal(h.calls.length, 5);
  for (const call of h.calls) {
    assert.ok(call.url.includes('/sites/sc-domain%3Acapital-ai.online/searchAnalytics/query'));
    assert.equal(JSON.parse(call.body).rowLimit, 20);
    assert.equal(JSON.parse(call.body).dataState, 'final');
  }
  assert.deepEqual(h.calls.map(call => JSON.parse(call.body).dimensionFilterGroups[0].filters[0].expression), ['deu', 'ita', 'esp', 'prt', 'gbr']);
});

test('oversized responses and transport failures do not expose token material', async () => {
  let api = createGoogleMaintenance({ env: {}, tokenProvider: async () => 'private-token', fetchImpl: async () => new Response('{}', { headers: { 'content-length': '1048577' } }) });
  await assert.rejects(api.call('ga4_get_property'), /RESPONSE_TOO_LARGE/);
  api = createGoogleMaintenance({ env: {}, tokenProvider: async () => 'private-token', fetchImpl: async () => { throw new Error('private-token'); } });
  const result = await handleGoogleMaintenanceMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'ga4_get_property' } }, api);
  assert.equal(result.result.content[0].text, 'GOOGLE_TRANSPORT_UNAVAILABLE');
  assert.doesNotMatch(JSON.stringify(result), /private-token/);
});
