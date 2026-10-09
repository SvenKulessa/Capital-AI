import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');

const EXPECTED_PACKAGE = '@lukerent/google-search-console-mcp@0.1.0';
const EXPECTED_SHA = 'a701813f030c7b343302b2eb84474add1697c42f';
const READONLY_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

test('GSC MCP is pinned to LukeRenton 0.1.0 and the Capital-AI property', async () => {
  const mcp = JSON.parse(await read('.mcp.json'));
  const config = JSON.parse(await read('config/growth-google-authority.json'));
  const guard = await read('scripts/gsc-mcp-guard.mjs');

  assert.equal(mcp.mcpServers['capital-ai-gsc'].command, 'node');
  assert.deepEqual(mcp.mcpServers['capital-ai-gsc'].args, ['scripts/gsc-mcp-guard.mjs']);
  assert.equal(mcp.mcpServers['capital-ai-gsc'].env.GSC_PROPERTY, 'sc-domain:capital-ai.online');
  assert.equal(config.gsc.version, '0.1.0');
  assert.equal(config.gsc.upstreamCommit, EXPECTED_SHA);
  assert.equal(config.gsc.mode, 'READ_ONLY');
  assert.ok(guard.includes(EXPECTED_PACKAGE));
});

test('Capital-AI GSC auth requests only the readonly Search Console scope', async () => {
  const auth = await read('scripts/gsc-auth-readonly.mjs');
  const config = JSON.parse(await read('config/growth-google-authority.json'));

  assert.equal(config.gsc.oauthScope, READONLY_SCOPE);
  assert.match(auth, /webmasters\.readonly/);
  assert.doesNotMatch(auth, /auth\/webmasters['"`]/);
  assert.match(auth, /0o600/);
});

test('submit_sitemap is excluded from the default MCP surface', async () => {
  const guard = await read('scripts/gsc-mcp-guard.mjs');
  const config = JSON.parse(await read('config/growth-google-authority.json'));

  assert.deepEqual(config.gsc.blockedTools, ['submit_sitemap']);
  assert.match(guard, /BLOCKED_TOOL = 'submit_sitemap'/);
  assert.match(guard, /message\.result\.tools\.filter/);
  assert.match(guard, /GSC access is read-only/);
});

test('GA4 is a separately pinned read-only Render authority and not a LukeRenton capability', async () => {
  const config = JSON.parse(await read('config/growth-google-authority.json'));
  const evidence = JSON.parse(await read('docs/security/evidence/growth-gsc-oss-admission-20261004.json'));
  const client = await read('server/google-analytics-mcp.mjs');
  const readback = await read('server/google-analytics-readback.mjs');

  assert.equal(config.ga4.provider, 'googleanalytics/google-analytics-mcp');
  assert.equal(config.ga4.package, 'analytics-mcp');
  assert.equal(config.ga4.version, '0.7.0');
  assert.equal(config.ga4.upstreamReleaseCommit, '10ba60a');
  assert.equal(config.ga4.license, 'Apache-2.0');
  assert.equal(config.ga4.status, 'RENDER_READ_ADAPTER_IMPLEMENTED');
  assert.equal(config.ga4.mode, 'READ_ONLY');
  assert.equal(config.ga4.executionHost, 'RENDER_CAPITAL_AI_WEB');
  assert.equal(config.ga4.browserMeasurement, 'DISABLED_PENDING_CONSENT');
  assert.deepEqual(config.ga4.capabilities, [
    'get_account_summaries',
    'get_property_details',
    'run_realtime_report',
    'run_report',
  ]);
  assert.match(client, /analytics-mcp/);
  assert.match(client, /rawMcpEndpoint: false/);
  assert.match(readback, /GOOGLE_ANALYTICS_PROPERTY_NUMBER/);
  assert.match(readback, /browserMeasurementAuthority: 'SEPARATE'/);
  assert.equal(evidence.ga4.providedByThisComponent, false);
  assert.equal(evidence.component.license, 'MIT');
  assert.equal(evidence.component.upstreamCommit, EXPECTED_SHA);
});
