#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const UPSTREAM_PACKAGE = '@lukerent/google-search-console-mcp@0.1.0';
const DEFAULT_PROPERTY = 'sc-domain:capital-ai.online';
const BLOCKED_TOOL = 'submit_sitemap';
const ALLOWED_TOOLS = new Set(['list_properties', 'query_search_analytics', 'inspect_url', 'list_sitemaps']);
// Pass only values needed for npm execution and the owner-authorized read-only GSC
// token file. Unrelated Render/Stripe/GitHub/OAuth secrets must not reach the child.
const FORWARDED_ENV = Object.freeze(['PATH', 'HOME', 'TMPDIR', 'XDG_CONFIG_HOME', 'XDG_CACHE_HOME', 'LANG', 'GSC_TOKEN_FILE']);
function scopedChildEnv(env) {
  const result = Object.fromEntries(FORWARDED_ENV
    .filter(key => typeof env[key] === 'string' && env[key].length > 0)
    .map(key => [key, env[key]]));
  result.GSC_PROPERTY = DEFAULT_PROPERTY; // do not accept an untrusted property override
  return result;
}

const child = spawn('npx', ['-y', UPSTREAM_PACKAGE], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: scopedChildEnv(process.env),
});
child.stderr.on('data', () => undefined); // upstream stderr may contain credentials; never forward it


const pendingMethods = new Map();
const parentInput = createInterface({ input: process.stdin, crlfDelay: Infinity });
const childOutput = createInterface({ input: child.stdout, crlfDelay: Infinity });

function emit(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

parentInput.on('line', (line) => {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    emit({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Invalid JSON-RPC request.' } });
    return;
  }

  if (message?.method === 'tools/call' && !ALLOWED_TOOLS.has(message?.params?.name)) {
    emit({
      jsonrpc: '2.0',
      id: message.id ?? null,
      error: {
        code: -32601,
        message: 'Tool not admitted by CAPITAL-AI TRUST policy; GSC access is read-only.',
      },
    });
    return;
  }

  if (message?.id !== undefined && message?.method) pendingMethods.set(String(message.id), message.method);
  child.stdin.write(`${JSON.stringify(message)}\n`);
});

childOutput.on('line', (line) => {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    process.stdout.write(`${line}\n`);
    return;
  }

  const key = message?.id !== undefined ? String(message.id) : null;
  const method = key === null ? null : pendingMethods.get(key);
  if (key !== null && message?.id !== undefined) pendingMethods.delete(key);

  if (method === 'tools/list' && Array.isArray(message?.result?.tools)) {
    message.result.tools = message.result.tools.filter((tool) => ALLOWED_TOOLS.has(tool?.name));
  }
  emit(message);
});

process.stdin.on('end', () => child.stdin.end());
child.on('error', (error) => {
  console.error(`Failed to start ${UPSTREAM_PACKAGE}: ${error.message}`);
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  if (signal) console.error(`GSC MCP upstream exited via signal ${signal}.`);
  process.exit(code ?? 1);
});
