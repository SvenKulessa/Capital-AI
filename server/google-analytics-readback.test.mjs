import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import {
  GA4_MCP_ALLOWED_TOOLS,
  createGoogleAnalyticsMcpClient,
} from './google-analytics-mcp.mjs';
import {
  buildGoogleAnalyticsReadback,
  createGoogleAnalyticsReadback,
  safeGa4FailureReason,
  diagnoseGa4RuntimeConfig,
} from './google-analytics-readback.mjs';

const ownerId = '11111111-1111-4111-8111-111111111111';
const env = {
  CAPITAL_AI_RENDER_OWNER_USER_ID: ownerId,
  CAPITAL_AI_RENDER_OWNER_EMAIL: 'owner@example.test',
  GOOGLE_ANALYTICS_PROPERTY_NUMBER: '123456789',
};

function fakeClient(calls = []) {
  return {
    boundary() {
      return Object.freeze({
        provider: 'googleanalytics/google-analytics-mcp',
        package: 'analytics-mcp',
        version: '0.7.0',
        transport: 'stdio',
        command: '/opt/ga4-mcp/bin/analytics-mcp',
        allowedTools: GA4_MCP_ALLOWED_TOOLS,
        rawMcpEndpoint: false,
        mutationCapability: false,
      });
    },
    async listTools() { return GA4_MCP_ALLOWED_TOOLS; },
    async callTool(tool, args) {
      calls.push({ tool, args });
      if (tool === 'get_account_summaries') {
        return {
          account_summaries: [{
            account: 'accounts/secret-account-list-must-not-leak',
            property_summaries: [
              { property: 'properties/123456789' },
              { property: 'properties/999999999' },
            ],
          }],
        };
      }
      if (tool === 'get_property_details') {
        return {
          name: 'properties/123456789',
          display_name: 'Capital AI',
          time_zone: 'Europe/Berlin',
          currency_code: 'EUR',
        };
      }
      if (tool === 'run_realtime_report') {
        return {
          rows: [{
            dimension_values: [{ value: 'page_view' }],
            metric_values: [{ value: '2' }],
          }],
        };
      }
      return {
        rows: [
          { dimension_values: [{ value: 'page_view' }], metric_values: [{ value: '42' }] },
          { dimension_values: [{ value: 'login' }], metric_values: [{ value: '3' }] },
        ],
      };
    },
  };
}

function harness({
  identity = { userId: ownerId, email: 'owner@example.test', emailVerified: true },
  role = true,
  vars = env,
  client = fakeClient(),
  now = () => 1_800_000_000_000,
} = {}) {
  const readback = createGoogleAnalyticsReadback({
    env: vars,
    client,
    now,
    auth: {
      verify: async () => identity,
      authorizeIamRole: async () => role,
    },
  });

  async function request(method = 'GET', target = '/api/profile/google-analytics-readback') {
    const req = Object.assign(Readable.from([]), { method, headers: {} });
    const headers = {};
    const res = { setHeader: (key, value) => { headers[key.toLowerCase()] = value; } };
    let output;
    const handled = await readback.handle(
      req,
      res,
      new URL(target, 'https://capital-ai.online'),
      (_res, status, body) => { output = { status, body }; },
    );
    return { handled, headers, ...output };
  }

  return { request, readback };
}

test('GA4 MCP client exposes only the pinned read boundary before any process is started', async () => {
  let spawned = false;
  const client = createGoogleAnalyticsMcpClient({
    env: {},
    spawnImpl: () => { spawned = true; throw new Error('unexpected spawn'); },
  });
  assert.equal(client.boundary().version, '0.7.0');
  assert.deepEqual(client.boundary().allowedTools, GA4_MCP_ALLOWED_TOOLS);
  assert.equal(client.boundary().mutationCapability, false);
  await assert.rejects(() => client.callTool('delete_property', {}), /TOOL_NOT_ALLOWED/);
  assert.equal(spawned, false);
});

test('GA4 readback binds the configured property and exposes only aggregated event evidence', async () => {
  const calls = [];
  const snapshot = await buildGoogleAnalyticsReadback({
    client: fakeClient(calls),
    propertyNumber: '123456789',
    now: () => 1_800_000_000_000,
  });
  assert.equal(snapshot.status, 'PROVIDER_READ_VERIFIED');
  assert.equal(snapshot.property.resourceName, 'properties/123456789');
  assert.equal(snapshot.property.displayName, 'Capital AI');
  assert.equal(snapshot.eventEvidence.status, 'PAGE_VIEW_OBSERVED');
  assert.equal(snapshot.eventEvidence.realtimePageView, true);
  assert.equal(snapshot.eventEvidence.sevenDayPageView, true);
  assert.deepEqual(calls.map(entry => entry.tool), [
    'get_account_summaries',
    'get_property_details',
    'run_realtime_report',
    'run_report',
  ]);
  const serialized = JSON.stringify(snapshot);
  assert.doesNotMatch(serialized, /secret-account-list-must-not-leak/);
  assert.doesNotMatch(serialized, /999999999/);
});

test('owner-only route is hidden from other identities and never calls GA4 when denied', async () => {
  const calls = [];
  const h = harness({
    identity: {
      userId: '22222222-2222-4222-8222-222222222222',
      email: 'other@example.test',
      emailVerified: true,
    },
    client: fakeClient(calls),
  });
  const response = await h.request();
  assert.equal(response.handled, true);
  assert.equal(response.status, 404);
  assert.equal(calls.length, 0);
});

test('owner-only route is GET-only, rejects query-driven reports and caches reads for five minutes', async () => {
  const calls = [];
  let closes = 0;
  let nowMs = 1_800_000_000_000;
  const client = fakeClient(calls);
  client.close = () => { closes++; };
  const h = harness({ client, now: () => nowMs });

  assert.equal((await h.request('POST')).status, 405);
  assert.equal((await h.request('GET', '/api/profile/google-analytics-readback?metric=users')).status, 400);

  const first = await h.request();
  assert.equal(first.status, 200);
  assert.equal(first.headers['cache-control'], 'private, no-store, max-age=0');
  assert.equal(calls.length, 4);
  assert.equal(closes, 1);

  nowMs += 299_999;
  assert.equal((await h.request()).status, 200);
  assert.equal(calls.length, 4);
  assert.equal(closes, 1);

  nowMs += 2;
  assert.equal((await h.request()).status, 200);
  assert.equal(calls.length, 8);
  assert.equal(closes, 2);
});

test('configured property mismatch fails closed before event reports', async () => {
  const calls = [];
  const client = fakeClient(calls);
  client.callTool = async (tool, args) => {
    calls.push({ tool, args });
    if (tool === 'get_account_summaries') {
      return { property_summaries: [{ property: 'properties/987654321' }] };
    }
    throw new Error('unexpected call');
  };
  await assert.rejects(
    () => buildGoogleAnalyticsReadback({ client, propertyNumber: '123456789' }),
    /PROPERTY_NOT_ACCESSIBLE/,
  );
  assert.deepEqual(calls.map(entry => entry.tool), ['get_account_summaries']);
});

test('GA4 property checks reject prefix collisions in account summaries', async () => {
  const calls = [];
  const client = fakeClient(calls);
  const original = client.callTool;
  client.callTool = async (tool, args) => {
    if (tool === 'get_account_summaries') {
      calls.push({ tool, args });
      return { account_summaries: [{ property_summaries: [{ property: 'properties/1234567890' }] }] };
    }
    return original(tool, args);
  };
  await assert.rejects(
    () => buildGoogleAnalyticsReadback({ client, propertyNumber: '123456789' }),
    /PROPERTY_NOT_ACCESSIBLE/,
  );
  assert.deepEqual(calls.map(entry => entry.tool), ['get_account_summaries']);
});

test('GA4 property detail checks reject a longer numeric property identifier', async () => {
  const calls = [];
  const client = fakeClient(calls);
  const original = client.callTool;
  client.callTool = async (tool, args) => {
    if (tool === 'get_property_details') {
      calls.push({ tool, args });
      return { name: 'properties/1234567890' };
    }
    return original(tool, args);
  };
  await assert.rejects(
    () => buildGoogleAnalyticsReadback({ client, propertyNumber: '123456789' }),
    /PROPERTY_DETAILS_NOT_BOUND/,
  );
  assert.deepEqual(calls.map(entry => entry.tool), ['get_account_summaries', 'get_property_details']);
});

test('GA4 readback does not invent event counts from malformed numeric values', async () => {
  const client = fakeClient();
  const original = client.callTool;
  client.callTool = async (tool, args) => {
    if (tool === 'run_report' || tool === 'run_realtime_report') {
      return {
        rows: [{
          dimension_values: [{ value: 'page_view' }],
          metric_values: [{ value: '2invalid' }],
        }],
      };
    }
    return original(tool, args);
  };
  await assert.rejects(
    () => buildGoogleAnalyticsReadback({ client, propertyNumber: '123456789' }),
    /GA4_INVALID_EVENT_COUNT/,
  );
});


test('GA4 readback fails closed when provider omits an event count', async () => {
  const client = fakeClient();
  const original = client.callTool;
  client.callTool = async (tool, args) => {
    if (tool === 'run_realtime_report') return { rows: [{ dimension_values: [{ value: 'page_view' }], metric_values: [] }] };
    return original(tool, args);
  };
  await assert.rejects(
    () => buildGoogleAnalyticsReadback({ client, propertyNumber: '123456789' }),
    /GA4_INVALID_EVENT_COUNT/,
  );
});

test('owner-safe GA4 reasons never disclose raw provider errors or user content', async () => {
  assert.equal(safeGa4FailureReason(new Error('GA4_PROPERTY_NOT_ACCESSIBLE')), 'GA4_PROPERTY_NOT_ACCESSIBLE');
  assert.equal(safeGa4FailureReason(new Error('GA4_MCP_TIMEOUT_tools/call')), 'GA4_MCP_REQUEST_TIMEOUT');
  assert.equal(safeGa4FailureReason(new Error('GA4_MCP_REQUIRED_TOOL_MISSING_run_report')), 'GA4_REQUIRED_TOOL_MISSING');
  assert.equal(safeGa4FailureReason(new Error('GA4_MCP_SERVICE_ACCOUNT_NOT_CONFIGURED')), 'GA4_MCP_SERVICE_ACCOUNT_NOT_CONFIGURED');
  assert.equal(safeGa4FailureReason(new Error('GA4_MCP_SERVICE_ACCOUNT_JSON_KEY=private')), 'GA4_READBACK_FAILED');
  assert.equal(safeGa4FailureReason(new Error('contact owner@example.test')), 'GA4_READBACK_FAILED');
  assert.equal(safeGa4FailureReason({ message:'GA4_PROPERTY_NOT_ACCESSIBLE' }), 'GA4_READBACK_FAILED');
});

test('authenticated GA4 503 returns only the safe reason code', async () => {
  const h = harness({ vars: { ...env, GOOGLE_ANALYTICS_PROPERTY_NUMBER: '' } });
  const result = await h.request();
  assert.equal(result.status, 503);
  assert.equal(result.body.reason, 'GA4_PROPERTY_NUMBER_NOT_CONFIGURED');
  assert.equal(result.body.status, 'EVIDENCE_UNAVAILABLE');
  assert.doesNotMatch(JSON.stringify(result.body), /owner@example.test|123456789/);
});

test('unauthorized requests never expose GA4 diagnostics or start the provider', async () => {
  const calls = [];
  const h = harness({ identity: null, client: fakeClient(calls), vars: { ...env, GOOGLE_ANALYTICS_PROPERTY_NUMBER: '' } });
  const result = await h.request();
  assert.equal(result.status, 404);
  assert.equal(result.body.reason, undefined);
  assert.equal(calls.length, 0);
});

test('owner-only runtime config diagnostic returns only fixed codes and booleans without MCP calls', async () => {
  let calls = 0;
  const h = harness({
    vars: {
      ...env,
      GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON: '{"broken":"SECRET_VALUE"',
      GOOGLE_ANALYTICS_CLOUD_PROJECT: 'test-project',
      RENDER_API_KEY: 'SENSITIVE_RENDER_API_KEY',
    },
    client: {
      listTools: async () => { calls++; throw Error('must not run MCP'); },
      close: () => { calls++; },
    },
  });
  const result = await h.request('GET', '/api/profile/google-analytics-config-diagnostic');
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    schema: 'CAPITAL_AI_GA4_OWNER_CONFIG_DIAGNOSTIC@1',
    status: 'CONFIG_DIAGNOSTIC_ONLY',
    JSON_VALID: false,
    PROJECT_MATCH: null,
    reason: 'GA4_MCP_SERVICE_ACCOUNT_INVALID_JSON',
  });
  assert.equal(result.headers['cache-control'], 'private, no-store, max-age=0');
  assert.equal(calls, 0);
  assert.doesNotMatch(JSON.stringify(result.body), /SECRET_VALUE|RENDER_API_KEY|test-project|email|private_key/);
});

test('owner config diagnostic fails closed for unauthorized, unverified, wrong role, unsafe method and query', async () => {
  const route = '/api/profile/google-analytics-config-diagnostic';
  assert.equal((await harness({identity: null}).request('GET', route)).status, 404);
  assert.equal((await harness({identity: {userId: ownerId, email: 'owner@example.test', emailVerified: false}}).request('GET', route)).status, 404);
  assert.equal((await harness({role: false}).request('GET', route)).status, 404);
  assert.equal((await harness().request('POST', route)).status, 405);
  assert.equal((await harness().request('GET', route + '?include=private_key')).status, 400);
  assert.equal((await harness().request('GET', '/api/profile/ga4-config-diagnostic')).handled, false);
});

test('GA4 config diagnostic checks JSON syntax, shape, and project binding without leaking any values', () => {
  const secret = 'SYNTHETIC_PRIVATE_KEY_NEVER_OUTPUT';
  const account = JSON.stringify({
    type: 'service_account', project_id: 'test-project',
    client_email: 'secret@example.invalid', private_key: secret,
  });
  assert.deepEqual(diagnoseGa4RuntimeConfig({
    GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON: account,
    GOOGLE_ANALYTICS_CLOUD_PROJECT: 'test-project',
  }), {JSON_VALID:true, PROJECT_MATCH:true, reason:'GA4_CONFIG_VALID'});
  assert.deepEqual(diagnoseGa4RuntimeConfig({
    GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON: account,
    GOOGLE_ANALYTICS_CLOUD_PROJECT: 'wrong-project',
  }), {JSON_VALID:true, PROJECT_MATCH:false, reason:'GA4_MCP_PROJECT_MISMATCH'});
  const tests = [
    [{}, 'GA4_MCP_SERVICE_ACCOUNT_NOT_CONFIGURED'],
    [{GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON: '{invalid'}, 'GA4_MCP_SERVICE_ACCOUNT_INVALID_JSON'],
    [{GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON: JSON.stringify(account)}, 'GA4_MCP_SERVICE_ACCOUNT_INVALID'],
    [{GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON: JSON.stringify({type:'authorized_user'})}, 'GA4_MCP_SERVICE_ACCOUNT_INVALID'],
    [{GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON: account}, 'GA4_MCP_CLOUD_PROJECT_NOT_CONFIGURED'],
  ];
  for (const [values, reason] of tests) {
    const output = diagnoseGa4RuntimeConfig(values);
    assert.equal(output.reason, reason);
    assert.deepEqual(Object.keys(output).sort(), ['JSON_VALID', 'PROJECT_MATCH', 'reason'].sort());
    assert.doesNotMatch(JSON.stringify(output), /SYNTHETIC_PRIVATE_KEY|secret@example|test-project|private_key/);
  }
});
