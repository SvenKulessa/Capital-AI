import test from 'node:test';
import assert from 'node:assert/strict';
import { createEvidenceDashboardReadback } from './evidence-dashboard-readback.mjs';

const sha = 'a'.repeat(40);
const other = 'b'.repeat(40);
const origin = 'https://capital-ai.online';
const env = { GITHUB_TOKEN: 'github-private-fixture', RENDER_API_KEY: 'render-private-fixture' };
const serviceId = 'srv-dau1rp893c1s73cdhm1g';
const ownerId = 'tea-d90o4rj7uimc739i86ug';
function fixture(url) {
  const s = String(url);
  if (s.endsWith('/commits/main')) return { sha };
  if (s.includes('/pulls?')) return [{ number: 7, state: 'open', title: '[CAPITAL-AI-PLATFORM] Evidence', draft: false, head: { sha }, updated_at: '2026-11-19T03:30:00Z' }];
  if (s.includes('/check-runs?')) return { total_count: 2, check_runs: [
    { name: 'Docker Security Gate', head_sha: sha, status: 'completed', conclusion: 'success' },
    { name: 'Domain Governance', head_sha: sha, status: 'completed', conclusion: 'success' },
  ] };
  if (s.endsWith(`/services/${serviceId}`)) return { id: serviceId, ownerId };
  if (s.endsWith('/deploys?limit=5')) return [{ deploy: { id: 'dep-test', status: 'live', commit: { id: sha }, finishedAt: '2026-11-19T03:30:00Z' } }];
  throw Error('unexpected path');
}
function setup({ allowed = true, role = true, ga4Broken = false, ga4FailureCode = null, invalidRealtime = false, vars = env, provider = fixture, now = () => 1800000000000 } = {}) {
  const calls = [];
  let ga4Calls = 0;
  const ga4Readback = {
    authorized: async () => allowed && role,
    load: async () => {
      ga4Calls++;
      if (ga4FailureCode) throw Error(ga4FailureCode);
      if (ga4Broken) throw Error('confidential_ga4_password');
      return { status: 'PROVIDER_READ_VERIFIED', property: { resourceName: 'properties/123456789' }, realtime: { events: [
        { eventName: 'page_view', eventCount: invalidRealtime ? 'INVALID' : 2 },
        { eventName: 'private-user-id', eventCount: 1 },
      ] }, sevenDay: { events: [
        { eventName: 'page_view', eventCount: 13 },
        { eventName: 'purchase', eventCount: 0 },
        { eventName: 'user@example.test', eventCount: 10 },
      ] } };
    },
  };
  const adapter = createEvidenceDashboardReadback({
    env: vars, ga4Readback, now,
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      const payload = await provider(url, options);
      if (payload instanceof Response) return payload;
      return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });
  async function request(method = 'GET', path = '/api/profile/evidence-dashboard-readback') {
    const headers = {};
    const res = { setHeader: (name, value) => { headers[name.toLowerCase()] = value; } };
    let output;
    const handled = await adapter.handle({ method }, res, new URL(path, origin), (_, status, body) => { output = { status, body }; });
    return { handled, headers, ...output };
  }
  return { request, calls, ga4Calls: () => ga4Calls };
}

test('rejects unauthorized identities before any provider data is read', async () => {
  for (const values of [{ allowed: false }, { role: false }]) {
    const h = setup(values);
    const response = await h.request();
    assert.equal(response.status, 404);
    assert.equal(response.body.error, 'not_found');
    assert.equal(h.calls.length, 0);
    assert.equal(h.ga4Calls(), 0);
  }
});

test('allows only GET without query parameters and sets private no-store response headers', async () => {
  const h = setup();
  assert.equal((await h.request('POST')).status, 405);
  assert.equal((await h.request('GET', '/api/profile/evidence-dashboard-readback?repo=other')).status, 400);
  assert.equal(h.calls.length, 0);
  assert.equal((await h.request('GET', '/some-other-route')).handled, false);
  const result = await h.request();
  assert.equal(result.status, 200);
  assert.equal(result.headers['cache-control'], 'private, no-store, max-age=0');
  assert.equal(result.headers.vary, 'Cookie');
  assert.equal(result.body.private, true);
  assert.equal(result.body.syntheticDataUsed, false);
});

test('binds provider URLs, identity and properties; produces only verified projections', async () => {
  const h = setup();
  const { body } = await h.request();
  assert.equal(h.calls.length, 5);
  assert.ok(h.calls.every(c => c.options.method === 'GET' && c.options.redirect === 'error' && c.options.cache === 'no-store'));
  assert.ok(h.calls.every(c => c.url.startsWith('https://api.github.com/repos/SvenKulessa/Capital-AI/') || c.url.startsWith(`https://api.render.com/v1/services/${serviceId}`)));
  assert.equal(body.github.mainSha, sha);
  assert.equal(body.github.openPrCount, 1);
  assert.equal(body.github.pullRequests[0].headSha, sha);
  assert.equal(body.github.ci.status, 'VERIFIED_PROVIDER_READ');
  assert.equal(body.github.ci.runs.length, 2);
  assert.equal(body.render.sourceCommitSha, sha);
  assert.equal(body.comparison.mainVsDeploy, 'MATCH_PROVIDER_CLAIMS_ONLY');
  assert.equal(body.ga4.events.length, 2);
  assert.equal(body.ga4.period, 'LAST_7_CALENDAR_DAYS_INCLUDING_TODAY');
  assert.equal(body.ga4.realtimeStatus, 'VERIFIED_PROVIDER_READ');
  assert.deepEqual(body.ga4.realtimeEvents, [{ eventName: 'page_view', eventCount: 2 }]);
  assert.equal(body.ga4.revenue, null);
  assert.equal(body.ga4.revenueStatus, 'NOT_PROVEN_NOT_QUERIED');
  assert.equal(body.baseline.status, 'HISTORICAL_REFERENCE_ONLY');
  assert.equal(body.baseline.valuesImported, false);
  assert.doesNotMatch(JSON.stringify(body), /fixture|user@example.test|github-private|render-private|6998|3525|private-user-id/);
});

test('uses five-minute cache and deduplicates concurrent reads', async () => {
  let time = 1800000000000;
  const h = setup({ now: () => time });
  await Promise.all([h.request(), h.request()]);
  assert.equal(h.calls.length, 5);
  time += 299_999;
  await h.request();
  assert.equal(h.calls.length, 5);
  time += 2;
  await h.request();
  assert.equal(h.calls.length, 10);
});

test('does not let missing Render credential erase independently verified GitHub/GA4 evidence', async () => {
  const h = setup({ vars: { GITHUB_TOKEN: 'fixture' } });
  const { body } = await h.request();
  assert.equal(body.github.status, 'VERIFIED_PROVIDER_READ');
  assert.equal(body.ga4.status, 'VERIFIED_PROVIDER_READ');
  assert.deepEqual(body.render, { status: 'NOT_PROVEN', reason: 'RENDER_CREDENTIAL_NOT_CONFIGURED' });
  assert.equal(body.comparison.mainVsDeploy, 'NOT_PROVEN');
  assert.equal(h.calls.length, 3);
});

test('rejects wrong Render workspace and keeps raw errors/secrets private', async () => {
  const h = setup({ provider: (url) => String(url).includes(`/services/${serviceId}`) && !String(url).includes('deploys') ? { id: serviceId, ownerId: 'tea-incorrect' } : fixture(url) });
  const { body } = await h.request();
  assert.equal(body.render.status, 'NOT_PROVEN');
  assert.equal(body.render.reason, 'PROVIDER_READ_FAILED');
  assert.equal(body.github.status, 'VERIFIED_PROVIDER_READ');
});

test('rejects unknown GitHub SHA, truncated PR listing, GA4 failure and incomplete history', async () => {
  const invalid = setup({ provider: url => String(url).endsWith('/commits/main') ? { sha: 'not-sha' } : fixture(url), ga4Broken: true });
  const { body } = await invalid.request();
  assert.equal(body.github.status, 'NOT_PROVEN');
  assert.equal(body.ga4.status, 'NOT_PROVEN');
  assert.equal(body.ga4.reason, 'PROVIDER_READ_FAILED');
  const truncated = setup({ provider: url => String(url).includes('/pulls?') ? Array.from({ length: 100 }, (_, i) => ({ number: i + 1, state: 'open' })) : fixture(url) });
  const res = await truncated.request();
  assert.equal(res.body.github.openPrCount, null);
  assert.equal(res.body.github.openPrCountStatus, 'NOT_PROVEN_TRUNCATED');
});

test('rejects large responses even when content-length is missing', async () => {
  const h = setup({ provider: url => String(url).endsWith('/commits/main')
    ? new Response(JSON.stringify({ sha, huge: 'x'.repeat(150000) }), { status: 200 }) : fixture(url) });
  const { body } = await h.request();
  assert.equal(body.github.status, 'NOT_PROVEN');
  assert.equal(body.render.status, 'VERIFIED_PROVIDER_READ');
});

test('classifies different main and deploy claims as drift, never as independently attested identity', async () => {
  const h = setup({ provider: url => String(url).includes('/deploys?')
    ? [{ deploy: { id: 'dep-test', status: 'live', commit: { id: other } } }] : fixture(url) });
  const { body } = await h.request();
  assert.equal(body.comparison.mainVsDeploy, 'DRIFT_PROVIDER_CLAIMS');
  assert.equal(body.comparison.runtimeBuildIdentity, 'NOT_PROVEN_INDEPENDENT_READBACK');
});

test('missing check-run access cannot invent passing security gates', async () => {
  const h = setup({ provider: url => String(url).includes('/check-runs?') ?
    new Response('not authorized', { status: 403 }) : fixture(url) });
  const { body } = await h.request();
  assert.equal(body.github.status, 'VERIFIED_PROVIDER_READ');
  assert.equal(body.github.ci.status, 'NOT_PROVEN');
  assert.deepEqual(body.github.ci.runs, []);
});

test('cross-commit check-runs never count as verified CI', async () => {
  const h = setup({ provider: url => String(url).includes('/check-runs?') ? {
    total_count: 1, check_runs: [{ name: 'Docker Security Gate', head_sha: other, status: 'completed', conclusion: 'success' }],
  } : fixture(url) });
  const { body } = await h.request();
  assert.equal(body.github.ci.status, 'NOT_PROVEN');
  assert.equal(body.github.ci.reason, 'NO_MATCHING_MAIN_CHECK_RUNS');
});

test('bounded PR and deployment projections exclude credentials and user data', async () => {
  const h = setup();
  const { body } = await h.request();
  assert.equal(body.github.pullRequests.length, 1);
  assert.equal(body.render.deployments.length, 1);
  assert.equal(body.render.deployments[0].finishedAt, '2026-11-19T03:30:00.000Z');
  assert.doesNotMatch(JSON.stringify(body), /github-private-fixture|render-private-fixture|owner@example.test/);
});

test('rejects malformed realtime counts without inventing GA4 events or breaking other providers', async () => {
  const h = setup({ invalidRealtime: true });
  const { body } = await h.request();
  assert.equal(body.ga4.status, 'NOT_PROVEN');
  assert.equal(body.ga4.reason, 'PROVIDER_READ_FAILED');
  assert.equal(body.github.status, 'VERIFIED_PROVIDER_READ');
  assert.equal(body.render.status, 'VERIFIED_PROVIDER_READ');
  assert.doesNotMatch(JSON.stringify(body), /INVALID|private-user-id/);
});

test('owner-only GA4 diagnostics identify known boundary failures without exposing raw errors', async () => {
  const allowed = [
    ['GA4_PROPERTY_NUMBER_NOT_CONFIGURED', 'GA4_PROPERTY_CONFIG_MISSING'],
    ['GA4_MCP_SERVICE_ACCOUNT_NOT_CONFIGURED', 'GA4_CREDENTIAL_CONFIG_MISSING'],
    ['GA4_MCP_PROJECT_MISMATCH', 'GA4_PROJECT_BINDING_MISMATCH'],
    ['GA4_MCP_PROCESS_START_FAILED', 'GA4_MCP_RUNTIME_UNAVAILABLE'],
    ['GA4_MCP_TIMEOUT_tools/call', 'GA4_MCP_RUNTIME_TIMEOUT'],
    ['GA4_PROPERTY_NOT_ACCESSIBLE', 'GA4_PROPERTY_ACCESS_NOT_PROVEN'],
    ['GA4_PROPERTY_DETAILS_NOT_BOUND', 'GA4_PROPERTY_BINDING_NOT_PROVEN'],
    ['GA4_READBACK_TIMEOUT', 'GA4_READBACK_TIMEOUT'],
    ['GA4_EVENT_COUNT_INVALID', 'GA4_PROVIDER_RESPONSE_INVALID'],
  ];
  for (const [input, expected] of allowed) {
    const h = setup({ ga4FailureCode: input });
    const { body } = await h.request();
    assert.deepEqual(body.ga4, { status: 'NOT_PROVEN', reason: expected });
    assert.equal(body.github.status, 'VERIFIED_PROVIDER_READ');
    assert.equal(body.render.status, 'VERIFIED_PROVIDER_READ');
    assert.equal((await setup({ allowed: false, ga4FailureCode: input }).request()).status, 404);
  }
  const secret = 'GA4_MCP_SERVICE_ACCOUNT_NOT_CONFIGURED token=confidential-live-token';
  const { body } = await setup({ ga4FailureCode: secret }).request();
  assert.deepEqual(body.ga4, { status: 'NOT_PROVEN', reason: 'PROVIDER_READ_FAILED' });
  assert.doesNotMatch(JSON.stringify(body), /confidential-live-token|SERVICE_ACCOUNT_NOT_CONFIGURED/);
});
