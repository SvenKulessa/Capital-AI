// CAPITAL_AI_GOOGLE_ANALYTICS_MCP_CLIENT@1
// Internal read-only stdio adapter for googleanalytics/google-analytics-mcp.
// No raw MCP endpoint is exposed by the public web runtime.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmod, mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const GA4_MCP_ALLOWED_TOOLS = Object.freeze([
  'get_account_summaries',
  'get_property_details',
  'run_realtime_report',
  'run_report',
]);

const MCP_COMMAND = '/opt/ga4-mcp/bin/analytics-mcp';
const MCP_PROTOCOL_VERSION = '2025-11-25';
const REQUEST_TIMEOUT_MS = 15_000;

function required(value, label) {
  const normalized = String(value || '').trim();
  if (!normalized) throw new Error(`GA4_MCP_${label}_NOT_CONFIGURED`);
  return normalized;
}

function parseServiceAccount(raw, expectedProject) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('GA4_MCP_SERVICE_ACCOUNT_INVALID_JSON');
  }
  if (
    !parsed ||
    parsed.type !== 'service_account' ||
    typeof parsed.client_email !== 'string' ||
    typeof parsed.private_key !== 'string' ||
    typeof parsed.project_id !== 'string'
  ) {
    throw new Error('GA4_MCP_SERVICE_ACCOUNT_INVALID');
  }
  if (String(parsed.project_id).trim() !== expectedProject) {
    throw new Error('GA4_MCP_PROJECT_MISMATCH');
  }
  return parsed;
}

let credentialCache = null;

async function materializeCredentials(env) {
  const raw = required(env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON, 'SERVICE_ACCOUNT');
  const project = required(env.GOOGLE_ANALYTICS_CLOUD_PROJECT, 'CLOUD_PROJECT');
  const parsed = parseServiceAccount(raw, project);
  const fingerprint = createHash('sha256').update(raw).digest('hex');

  if (credentialCache?.fingerprint === fingerprint) return credentialCache.path;

  const tmpRoot = String(env.TMPDIR || '/tmp');
  const directory = path.join(tmpRoot, 'capital-ai-ga4');
  const target = path.join(directory, 'service-account.json');
  const temporary = path.join(directory, `.service-account.${process.pid}.tmp`);

  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  await writeFile(temporary, JSON.stringify(parsed), { mode: 0o600, flag: 'w' });
  await chmod(temporary, 0o600);
  await rename(temporary, target);
  await chmod(target, 0o600);

  credentialCache = Object.freeze({ fingerprint, path: target });
  return target;
}

function normalizeToolResult(result) {
  if (!result || typeof result !== 'object') return result;
  if (result.isError === true) throw new Error('GA4_MCP_TOOL_ERROR');

  if (result.structuredContent && typeof result.structuredContent === 'object') {
    return result.structuredContent;
  }

  if (!Array.isArray(result.content)) return result;
  const values = result.content
    .filter(part => part?.type === 'text' && typeof part.text === 'string')
    .map(part => {
      try { return JSON.parse(part.text); }
      catch { return part.text; }
    });

  for (const value of values) {
    if (value && typeof value === 'object' && Object.hasOwn(value, 'error')) {
      throw new Error('GA4_MCP_TOOL_ERROR_PAYLOAD');
    }
  }
  return values.length === 1 ? values[0] : values;
}

export function createGoogleAnalyticsMcpClient({
  env = process.env,
  spawnImpl = spawn,
} = {}) {
  let child = null;
  let initializing = null;
  let stdoutBuffer = '';
  let nextId = 1;
  let toolNames = Object.freeze([]);
  const pending = new Map();

  function boundary() {
    return Object.freeze({
      provider: 'googleanalytics/google-analytics-mcp',
      package: 'analytics-mcp',
      version: '0.7.0',
      transport: 'stdio',
      command: MCP_COMMAND,
      allowedTools: GA4_MCP_ALLOWED_TOOLS,
      rawMcpEndpoint: false,
      mutationCapability: false,
    });
  }

  function failSession(error, kill = true) {
    const current = child;
    child = null;
    toolNames = Object.freeze([]);
    stdoutBuffer = '';
    for (const pendingRequest of pending.values()) {
      clearTimeout(pendingRequest.timer);
      pendingRequest.reject(error);
    }
    pending.clear();
    if (kill && current && current.exitCode === null && !current.killed) current.kill('SIGTERM');
  }

  function handleStdout(chunk) {
    stdoutBuffer += chunk;
    while (true) {
      const newline = stdoutBuffer.indexOf('\n');
      if (newline < 0) return;
      const line = stdoutBuffer.slice(0, newline).trim();
      stdoutBuffer = stdoutBuffer.slice(newline + 1);
      if (!line) continue;

      let message;
      try { message = JSON.parse(line); }
      catch { continue; }

      if (!Number.isInteger(message?.id)) continue;
      const request = pending.get(message.id);
      if (!request) continue;
      clearTimeout(request.timer);
      pending.delete(message.id);

      if (message.error) request.reject(new Error('GA4_MCP_JSONRPC_ERROR'));
      else request.resolve(message.result);
    }
  }

  function request(method, params = {}) {
    if (!child || child.killed || !child.stdin?.writable) {
      return Promise.reject(new Error('GA4_MCP_NOT_CONNECTED'));
    }
    const id = nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (!pending.has(id)) return;
        failSession(new Error(`GA4_MCP_TIMEOUT_${method}`));
      }, REQUEST_TIMEOUT_MS);
      timer.unref?.();
      pending.set(id, { resolve, reject, timer });
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n', error => {
        if (!error || !pending.has(id)) return;
        clearTimeout(timer);
        pending.delete(id);
        reject(new Error('GA4_MCP_WRITE_FAILED'));
      });
    });
  }

  function notify(method, params = {}) {
    if (!child || child.killed || !child.stdin?.writable) return;
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
  }

  async function start() {
    const project = required(env.GOOGLE_ANALYTICS_CLOUD_PROJECT, 'CLOUD_PROJECT');
    const credentialsPath = await materializeCredentials(env);
    const childEnv = {
      PATH: env.PATH || '/usr/local/bin:/usr/bin:/bin',
      HOME: env.HOME || '/tmp',
      TMPDIR: env.TMPDIR || '/tmp',
      LANG: env.LANG || 'C.UTF-8',
      GOOGLE_APPLICATION_CREDENTIALS: credentialsPath,
      GOOGLE_CLOUD_PROJECT: project,
      PYTHONUNBUFFERED: '1',
    };

    const processHandle = spawnImpl(MCP_COMMAND, [], {
      env: childEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    child = processHandle;
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => handleStdout(String(chunk)));
    child.stderr.on('data', () => undefined);
    child.once('error', () => failSession(new Error('GA4_MCP_PROCESS_START_FAILED'), false));
    child.once('exit', () => failSession(new Error('GA4_MCP_PROCESS_EXITED'), false));

    await request('initialize', {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'capital-ai-render-ga4-readback', version: '1.0.0' },
    });
    notify('notifications/initialized');

    const listed = await request('tools/list');
    const names = Array.isArray(listed?.tools)
      ? listed.tools.map(tool => String(tool?.name || '').trim()).filter(Boolean)
      : [];
    for (const tool of GA4_MCP_ALLOWED_TOOLS) {
      if (!names.includes(tool)) {
        failSession(new Error(`GA4_MCP_REQUIRED_TOOL_MISSING_${tool}`));
        throw new Error(`GA4_MCP_REQUIRED_TOOL_MISSING_${tool}`);
      }
    }
    toolNames = Object.freeze(names);
  }

  async function ensureInitialized() {
    if (child && toolNames.length) return;
    if (!initializing) initializing = start().finally(() => { initializing = null; });
    await initializing;
  }

  async function listTools() {
    await ensureInitialized();
    return toolNames;
  }

  async function callTool(tool, args = {}) {
    if (!GA4_MCP_ALLOWED_TOOLS.includes(tool)) throw new Error('GA4_MCP_TOOL_NOT_ALLOWED');
    await ensureInitialized();
    return normalizeToolResult(await request('tools/call', { name: tool, arguments: args }));
  }

  return Object.freeze({ boundary, listTools, callTool });
}

export function resetGoogleAnalyticsMcpCredentialCacheForTests() {
  credentialCache = null;
}
