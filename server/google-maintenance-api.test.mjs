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
  const servicesUrl = new URL(calls.at(-1).url);
  assert.equal(servicesUrl.origin, 'https://serviceusage.googleapis.com');
  assert.equal(servicesUrl.pathname, '/v1/projects/542877602707/services');
  assert.equal(servicesUrl.searchParams.get('filter'), 'state:ENABLED');
  assert.equal(servicesUrl.searchParams.get('pageSize'), '200');
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
  assert.equal(response.result.tools.length, 23);
  for (const name of ['gsc_get_expected_site', 'gsc_inspect_search_configuration', 'gsc_resubmit_canonical_sitemap']) {
    assert.ok(response.result.tools.some(tool => tool.name === name && tool.inputSchema.additionalProperties === false));
  }
  assert.ok(response.result.tools.some(tool => tool.name === 'ga4_commerce_report' && tool.inputSchema.additionalProperties === false));
  assert.ok(response.result.tools.some(tool => tool.name === 'ga4_learning_lead_report' && tool.inputSchema.additionalProperties === false));
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


const adsEnv={GOOGLE_MAINTENANCE_ADS_READ_ENABLED:'true',GOOGLE_MAINTENANCE_ADS_CUSTOMER_ID:'1234567890',GOOGLE_MAINTENANCE_ADS_LOGIN_CUSTOMER_ID:'9876543210',GOOGLE_MAINTENANCE_ADS_ACCESS_TOKEN:'synthetic-ads-token'};
const kwInput={market:'DE',keywords:['terminal output','log viewer']};
test('keyword tools are default off and isolated from existing Google maintenance credentials',async()=>{
  let calls=0;
  const api=createGoogleMaintenance({env:{GOOGLE_MAINTENANCE_ACCESS_TOKEN:'synthetic-other-token'},fetchImpl:async()=>{calls++;throw Error('unexpected');}});
  assert.equal((await api.call('ads_keyword_status')).accessVerified,false);
  await assert.rejects(api.call('ads_keyword_history',kwInput),/ADS_READ_DISABLED/);
  const enabled=createGoogleMaintenance({env:{...adsEnv,GOOGLE_MAINTENANCE_ADS_ACCESS_TOKEN:undefined},tokenProvider:async()=>{throw Error('wrong token provider');},fetchImpl:async()=>{calls++;}});
  await assert.rejects(enabled.call('ads_keyword_history',kwInput),/ADS_IDENTITY_NOT_CONFIGURED/);
  assert.equal(calls,0);
});
test('keyword history binds direct endpoint, account, network and separate token; missing stays null',async()=>{
  const calls=[];
  const api=createGoogleMaintenance({env:adsEnv,now:()=>Date.parse('2026-11-27T00:00:00.000Z'),
    fetchImpl:async(url,opts)=>{
      calls.push({url:String(url),opts});
      return Response.json({results:[{text:'terminal output',closeVariants:['terminal outputs'],keywordMetrics:{avgMonthlySearches:'120',competition:'LOW',competitionIndex:'12',lowTopOfPageBidMicros:'1000',highTopOfPageBidMicros:'2000',monthlySearchVolumes:[{year:'2026',month:'OCTOBER',monthlySearches:'0'},{year:'2026',month:'SEPTEMBER'}]}},{text:'log viewer'}]});
    }});
  const report=await api.call('ads_keyword_history',kwInput);
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,'https://googleads.googleapis.com/v26/customers/1234567890:generateKeywordHistoricalMetrics');
  assert.equal(calls[0].opts.redirect,'error');
  assert.equal(calls[0].opts.headers.Authorization,'Bearer synthetic-ads-token');
  assert.equal(calls[0].opts.headers['login-customer-id'],'9876543210');
  assert.deepEqual(JSON.parse(calls[0].opts.body),{language:'languageConstants/1001',geoTargetConstants:['geoTargetConstants/2276'],keywordPlanNetwork:'GOOGLE_SEARCH',keywords:kwInput.keywords});
  assert.equal(report.rows[0].metrics.averageMonthlySearches,120);
  assert.equal(report.rows[0].metrics.monthly[0].searches,null);
  assert.equal(report.rows[0].metrics.monthly[1].searches,0);
  assert.equal(report.rows[1].metrics,null);
  assert.equal(report.publicationAllowed,false);
  assert.match(report.evidenceSha256,/^[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(report),/synthetic-ads-token|1234567890|9876543210/);
});
test('ideas first page is explicit, and no arbitrary account, URL, operation or malformed input passes',async()=>{
  let calls=0;
  const api=createGoogleMaintenance({env:adsEnv,fetchImpl:async(url,opts)=>{
    calls++;assert.match(String(url),/:generateKeywordIdeas$/);
    const body=JSON.parse(opts.body);assert.equal(body.pageSize,100);assert.equal(body.includeAdultKeywords,false);
    assert.deepEqual(body.geoTargetConstants,[]);assert.equal(body.language,'languageConstants/1000');
    return Response.json({results:[{text:'terminal copy',keywordIdeaMetrics:{}}],nextPageToken:'private-cursor'});
  }});
  const result=await api.call('ads_keyword_ideas',{...kwInput,market:'GLOBAL_EN'});
  assert.equal(result.truncated,true);assert.equal(result.status,'NOT_PROVEN_NO_VOLUME');
  assert.doesNotMatch(JSON.stringify(result),/private-cursor/);
  for(const input of [{...kwInput,customerId:'0000000000'},{...kwInput,url:'https://example.com'},{...kwInput,market:'__proto__'},{...kwInput,keywords:['a','A']},{...kwInput,keywords:['https://example.com']},{...kwInput,keywords:['a@b.example']}])await assert.rejects(api.call('ads_keyword_history',input));
  await assert.rejects(api.call('ads_campaign_mutate',{}),/TOOL_NOT_ALLOWED/);
  assert.equal(calls,1);
});
test('provider error and invalid metrics are rejected, never exposed as zeros or raw error bodies',async()=>{
  const api=createGoogleMaintenance({env:adsEnv,fetchImpl:async()=>new Response('synthetic-private-error',{status:403})});
  const result=await handleGoogleMaintenanceMessage({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'ads_keyword_history',arguments:kwInput}},api);
  assert.equal(result.result.isError,true);
  assert.doesNotMatch(JSON.stringify(result),/synthetic-private-error|synthetic-ads-token/);
  const malformed=createGoogleMaintenance({env:adsEnv,fetchImpl:async()=>Response.json({results:[{text:'terminal output',keywordMetrics:{avgMonthlySearches:'-1'}}]})});
  await assert.rejects(malformed.call('ads_keyword_history',kwInput),/ADS_INVALID_METRIC/);
});
