#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const UPSTREAM_PACKAGE = '@lukerent/google-search-console-mcp@0.1.0';
const DEFAULT_PROPERTY = 'sc-domain:capital-ai.online';
const BLOCKED_TOOL = 'submit_sitemap';

const child = spawn('npx', ['-y', UPSTREAM_PACKAGE], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    GSC_PROPERTY: process.env.GSC_PROPERTY ?? DEFAULT_PROPERTY,
  },
});

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
    child.stdin.write(`${line}\n`);
    return;
  }

  if (message?.method === 'tools/call' && message?.params?.name === BLOCKED_TOOL) {
    emit({
      jsonrpc: '2.0',
      id: message.id ?? null,
      error: {
        code: -32601,
        message: 'submit_sitemap is disabled by CAPITAL-AI TRUST policy; GSC access is read-only.',
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
    message.result.tools = message.result.tools.filter((tool) => tool?.name !== BLOCKED_TOOL);
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
