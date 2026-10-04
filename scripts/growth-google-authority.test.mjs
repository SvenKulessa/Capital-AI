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

test('GA4 is explicitly separate and not claimed as LukeRenton capability', async () => {
  const config = JSON.parse(await read('config/growth-google-authority.json'));
  const evidence = JSON.parse(await read('docs/security/evidence/growth-gsc-oss-admission-20261004.json'));

  assert.equal(config.ga4.status, 'PLANNED_SEPARATE_ADAPTER');
  assert.equal(evidence.ga4.providedByThisComponent, false);
  assert.equal(evidence.component.license, 'MIT');
  assert.equal(evidence.component.upstreamCommit, EXPECTED_SHA);
});
