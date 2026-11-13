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

import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  GA4_MCP_ALLOWED_TOOLS,
  createGoogleAnalyticsMcpClient,
} from '../server/google-analytics-mcp.mjs';

test('GA4 stdio child disables W3C trace-context propagation even if parent requests it', async () => {
  const tmp = await mkdtemp(join(tmpdir(), 'capital-ai-ga4-otel-'));
  let captured = null;
  const spawnImpl = (command, args, options) => {
    captured = { command, args, options };
    const child = new EventEmitter();
    child.stdin = new PassThrough();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.killed = false;
    child.exitCode = null;
    child.kill = () => {
      child.killed = true;
      child.exitCode = 0;
      child.emit('exit', 0);
    };
    child.stdin.on('data', chunk => {
      const message = JSON.parse(String(chunk));
      let result;
      if (message.method === 'initialize') {
        result = { capabilities: {} };
      } else if (message.method === 'tools/list') {
        result = { tools: GA4_MCP_ALLOWED_TOOLS.map(name => ({ name })) };
      } else {
        return;
      }
      child.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: message.id, result }) + '\n');
    });
    return child;
  };
  const client = createGoogleAnalyticsMcpClient({
    env: {
      PATH: '/usr/bin',
      TMPDIR: tmp,
      OTEL_PROPAGATORS: 'tracecontext,baggage',
      GOOGLE_ANALYTICS_CLOUD_PROJECT: 'ci-ga4-project',
      GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON: JSON.stringify({
        type: 'service_account',
        project_id: 'ci-ga4-project',
        client_email: 'unused@ci.example.invalid',
        private_key: 'not-a-key',
      }),
    },
    spawnImpl,
  });

  try {
    assert.deepEqual(await client.listTools(), GA4_MCP_ALLOWED_TOOLS);
    assert.equal(captured.command, '/opt/ga4-mcp/bin/analytics-mcp');
    assert.deepEqual(captured.args, []);
    assert.deepEqual(captured.options.stdio, ['pipe', 'pipe', 'pipe']);
    assert.equal(captured.options.env.OTEL_PROPAGATORS, 'none');
    assert.equal(captured.options.env.GOOGLE_CLOUD_PROJECT, 'ci-ga4-project');
    assert.equal(captured.options.env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON, undefined);
    assert.equal(client.boundary().mutationCapability, false);
  } finally {
    client.close();
    await rm(tmp, { recursive: true, force: true });
  }
});

test('GA4 MCP Docker image contract requires a resolver-consistent patched OTel family', async () => {
  const dockerfile = await readFile(new URL('../Dockerfile', import.meta.url), 'utf8');
  assert.match(dockerfile, /analytics-mcp==0\.7\.0 google-adk==2\.14\.0/);
  assert.match(dockerfile, /opentelemetry-api==1\.45\.2 opentelemetry-sdk==1\.45\.2/);
  assert.match(dockerfile, /\/opt\/ga4-mcp\/bin\/pip check/);
  assert.match(dockerfile, /version\('opentelemetry-api'\) == version\('opentelemetry-sdk'\) == '1\.45\.2'/);
  assert.doesNotMatch(dockerfile, /--no-deps/);
});

// Exercises the complete owner-only TinyFish readback fixture inside the existing security gate.
import './tinyfish-owner-readback.test.mjs';
