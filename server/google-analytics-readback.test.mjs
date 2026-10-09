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
  let nowMs = 1_800_000_000_000;
  const h = harness({ client: fakeClient(calls), now: () => nowMs });

  assert.equal((await h.request('POST')).status, 405);
  assert.equal((await h.request('GET', '/api/profile/google-analytics-readback?metric=users')).status, 400);

  const first = await h.request();
  assert.equal(first.status, 200);
  assert.equal(first.headers['cache-control'], 'private, no-store, max-age=0');
  assert.equal(calls.length, 4);

  nowMs += 299_999;
  assert.equal((await h.request()).status, 200);
  assert.equal(calls.length, 4);

  nowMs += 2;
  assert.equal((await h.request()).status, 200);
  assert.equal(calls.length, 8);
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
