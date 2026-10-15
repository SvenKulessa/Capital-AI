import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('auto-discovered MCP config contains no external HTTP vendors', async () => {
  const value = JSON.parse(await readFile(new URL('../.mcp.json', import.meta.url), 'utf8'));
  assert.equal(value.mcpServers.metricool, undefined);
  assert.equal(value.mcpServers.metricduck, undefined);
  for (const entry of Object.values(value.mcpServers)) {
    assert.equal(typeof entry.command, 'string');
    assert.ok(!entry.url && entry.type !== 'http');
  }
});
