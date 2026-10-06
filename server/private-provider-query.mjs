import { spawn } from 'node:child_process';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { connect } from '@nats-io/transport-node';

import { natsConnectionAuth } from './infrastructure.mjs';

const CONTRACT = Object.freeze(JSON.parse(readFileSync(
  new URL('../contracts/private-provider-query-operations.json', import.meta.url),
  'utf8',
)));
const QUERY_SUBJECT = CONTRACT.querySubject;
const EXECUTE_SUBJECT = CONTRACT.executeSubject;
const MAX_BODY_BYTES = Number(CONTRACT.maxRequestBytes || 65536);
const MAX_RESPONSE_BYTES = Number(CONTRACT.maxResponseBytes || 262144);
const MAX_TTL_MS = Number(CONTRACT.maxTtlMs || 30000);
const DEFAULT_BRIDGE_BINARY = '/app/bin/capital-ai-provider-bridge';

function canonicalJson(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalJson(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function safeIdentifier(value, max = 96) {
  return typeof value === 'string' && value.length > 0 && value.length <= max &&
    /^[A-Za-z0-9_.:-]+$/.test(value);
}

function normalizeParams(raw, allowed) {
  if (raw == null) return {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('INVALID_PARAMS');
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!allowed.has(key)) throw new Error('PARAM_NOT_ADMITTED');
    if (!['string', 'number', 'boolean'].includes(typeof value) || (typeof value === 'string' && value.length > 256)) {
      throw new Error('INVALID_PARAM_VALUE');
    }
    if (typeof value === 'number' && !Number.isSafeInteger(value)) throw new Error('INVALID_PARAM_VALUE');
    out[key] = value;
  }
  if (Buffer.byteLength(JSON.stringify(out), 'utf8') > 32 * 1024) throw new Error('PARAMS_TOO_LARGE');
  return out;
}

export function validateProviderQueryRequest(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('INVALID_REQUEST');
  const provider = String(raw.provider || '').trim().toLowerCase();
  const operation = String(raw.operation || '').trim();
  const operationPolicy = CONTRACT.providers?.[provider]?.operations?.[operation];
  if (!operationPolicy) throw new Error('OPERATION_NOT_ADMITTED');
  const allowedParams = new Set(Array.isArray(operationPolicy.params) ? operationPolicy.params : []);
  return {
    provider,
    operation,
    params: normalizeParams(raw.params, allowedParams),
  };
}

function proofMaterial(envelope) {
  return [
    envelope.schema,
    envelope.requestId,
    envelope.userRef,
    envelope.provider,
    envelope.operation,
    String(envelope.expiresAt),
    canonicalJson(envelope.params),
  ].join('\n');
}

function signingSecret(env) {
  const secret = String(env.PRIVATE_PROVIDER_QUERY_SIGNING_SECRET || '');
  if (Buffer.byteLength(secret, 'utf8') < 32) throw new Error('PRIVATE_PROVIDER_QUERY_SIGNING_SECRET_REQUIRED');
  return secret;
}

export function createProviderQueryEnvelope({ userRef, requestId, provider, operation, params }, env = process.env, now = Date.now()) {
  if (!safeIdentifier(userRef) || !safeIdentifier(requestId)) throw new Error('INVALID_QUERY_IDENTITY');
  const envelope = {
    schema: CONTRACT.requestSchema,
    requestId,
    userRef,
    provider,
    operation,
    expiresAt: now + Math.min(10_000, MAX_TTL_MS),
    params,
  };
  const proof = createHmac('sha256', signingSecret(env)).update(proofMaterial(envelope)).digest('hex');
  return Object.freeze({ ...envelope, proof });
}

export function verifyProviderQueryEnvelope(envelope, env = process.env, now = Date.now()) {
  if (!envelope || envelope.schema !== CONTRACT.requestSchema ||
      !safeIdentifier(envelope.requestId) || !safeIdentifier(envelope.userRef) ||
      !safeIdentifier(envelope.provider, 32) || !safeIdentifier(envelope.operation, 80) ||
      !Number.isSafeInteger(envelope.expiresAt) || envelope.expiresAt < now ||
      envelope.expiresAt > now + MAX_TTL_MS || !/^[0-9a-f]{64}$/.test(String(envelope.proof || ''))) {
    return false;
  }
  try {
    validateProviderQueryRequest(envelope);
    const expected = createHmac('sha256', signingSecret(env)).update(proofMaterial(envelope)).digest();
    const actual = Buffer.from(envelope.proof, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function containsSecretMaterial(value) {
  if (Array.isArray(value)) return value.some(containsSecretMaterial);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) => {
    const normalized = key.toLowerCase().replace(/[_-]/g, '');
    const forbidden = ['apikey', 'apisecret', 'secret', 'password', 'privatekey', 'authorization', 'credential']
      .some(token => normalized.includes(token));
    return forbidden || containsSecretMaterial(child);
  });
}

export function safeProviderResult(value) {
  if (containsSecretMaterial(value)) throw new Error('SECRET_MATERIAL_IN_PROVIDER_RESULT');
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_RESPONSE_BYTES) throw new Error('PROVIDER_RESULT_TOO_LARGE');
  return value;
}

async function readJson(req) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > MAX_BODY_BYTES) throw new Error('REQUEST_TOO_LARGE');
    chunks.push(chunk);
  }
  try {
    return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
  } catch {
    throw new Error('INVALID_JSON');
  }
}

export function createPrivateProviderQuery({ env = process.env, auth, vault } = {}) {
  let nc = null;
  let subscription = null;
  let executorLoop = null;
  let bridge = null;
  let opening = null;

  function enabled() {
    return env.PRIVATE_PROVIDER_BRIDGE_ENABLED === 'true';
  }

  async function respond(message, payload) {
    if (!message.reply || !nc || nc.isClosed()) return;
    await nc.publish(message.reply, Buffer.from(JSON.stringify(payload), 'utf8'));
  }

  async function executor(message) {
    let envelope;
    try {
      if (message.data.length > MAX_BODY_BYTES) throw new Error('REQUEST_TOO_LARGE');
      envelope = JSON.parse(new TextDecoder().decode(message.data));
      if (!verifyProviderQueryEnvelope(envelope, env)) throw new Error('INVALID_QUERY_PROOF');
      const data = safeProviderResult(await vault.executePrivateQuery(
        envelope.userRef,
        envelope.provider,
        envelope.operation,
        envelope.params,
      ));
      await respond(message, {
        schema: CONTRACT.resultSchema,
        requestId: envelope.requestId,
        provider: envelope.provider,
        operation: envelope.operation,
        ok: true,
        data,
      });
    } catch (error) {
      await respond(message, {
        schema: CONTRACT.resultSchema,
        requestId: envelope?.requestId || null,
        ok: false,
        error: String(error?.code || error?.message || 'PRIVATE_PROVIDER_QUERY_FAILED').slice(0, 120),
      }).catch(() => {});
    }
  }

  function startBridgeProcess() {
    if (bridge && bridge.exitCode == null) return;
    const user = String(env.NATS_BRIDGE_USER || '').trim();
    const password = String(env.NATS_BRIDGE_PASSWORD || '');
    const natsUrl = String(env.NATS_URL || '').trim();
    if (!user || password.length < 24 || !natsUrl) throw new Error('PRIVATE_PROVIDER_BRIDGE_CREDENTIALS_REQUIRED');
    const binary = String(env.PRIVATE_PROVIDER_BRIDGE_BINARY || DEFAULT_BRIDGE_BINARY);
    bridge = spawn(binary, [], {
      env: {
        PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
        NATS_URL: natsUrl,
        NATS_BRIDGE_USER: user,
        NATS_BRIDGE_PASSWORD: password,
      },
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    bridge.once('exit', () => { bridge = null; });
    bridge.once('error', () => { bridge = null; });
  }

  async function start() {
    if (!enabled()) return false;
    if (nc && !nc.isClosed() && bridge) return true;
    if (opening) return opening;
    opening = (async () => {
      const natsAuth = natsConnectionAuth(env);
      const { mode: _mode, ...credentials } = natsAuth;
      nc = await connect({
        servers: env.NATS_URL,
        ...credentials,
        timeout: 3000,
        maxReconnectAttempts: 3,
        reconnectTimeWait: 1000,
      });
      subscription = nc.subscribe(EXECUTE_SUBJECT, { queue: 'capital-private-provider-executor' });
      executorLoop = (async () => {
        for await (const message of subscription) await executor(message);
      })().catch(() => {});
      startBridgeProcess();
      await new Promise(resolve => setTimeout(resolve, 200));
      return true;
    })().finally(() => { opening = null; });
    return opening;
  }

  async function handle(req, res, url, json, requestId) {
    if (url.pathname !== '/api/profile/provider-query') return false;
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      json(res, 405, { error: 'method_not_allowed' });
      return true;
    }
    if (!enabled()) {
      json(res, 503, { error: 'private_provider_bridge_disabled' });
      return true;
    }
    if (!auth?.sameOrigin?.(req)) {
      json(res, 403, { error: 'forbidden_origin' });
      return true;
    }
    const user = await auth.verify(req, res);
    if (!user?.userId) {
      json(res, 401, { error: 'authentication_required' });
      return true;
    }

    let input;
    try {
      input = validateProviderQueryRequest(await readJson(req));
      await start();
      if (!nc || nc.isClosed() || !bridge) throw new Error('PRIVATE_PROVIDER_BRIDGE_UNAVAILABLE');
      const envelope = createProviderQueryEnvelope({
        userRef: user.userId,
        requestId,
        ...input,
      }, env);
      const response = await nc.request(
        QUERY_SUBJECT,
        Buffer.from(JSON.stringify(envelope), 'utf8'),
        { timeout: 9500 },
      );
      if (response.data.length > MAX_RESPONSE_BYTES) throw new Error('PROVIDER_RESULT_TOO_LARGE');
      const result = JSON.parse(new TextDecoder().decode(response.data));
      if (result?.schema !== CONTRACT.resultSchema || result?.requestId !== requestId || result?.ok !== true) {
        json(res, 503, { error: 'private_provider_query_failed', code: String(result?.error || 'INVALID_RESULT').slice(0, 120) });
        return true;
      }
      safeProviderResult(result.data);
      json(res, 200, {
        provider: input.provider,
        operation: input.operation,
        dataScope: CONTRACT.dataPolicy.scope,
        redistributionAllowed: false,
        publicDisplayAllowed: false,
        sharedCacheAllowed: false,
        jetStreamPublicationAllowed: false,
        executionEnabled: false,
        data: result.data,
      });
    } catch (error) {
      const code = String(error?.code || error?.message || 'PRIVATE_PROVIDER_QUERY_UNAVAILABLE').slice(0, 120);
      json(res, code === 'REQUEST_TOO_LARGE' ? 413 : code.startsWith('INVALID_') || code === 'OPERATION_NOT_ADMITTED' || code === 'PARAM_NOT_ADMITTED' ? 400 : 503, {
        error: 'private_provider_query_unavailable',
        code,
      });
    }
    return true;
  }

  async function close() {
    try { subscription?.unsubscribe(); } catch {}
    subscription = null;
    if (bridge && bridge.exitCode == null) bridge.kill('SIGTERM');
    bridge = null;
    try { await nc?.close(); } catch {}
    nc = null;
    await Promise.resolve(executorLoop).catch(() => {});
    executorLoop = null;
  }

  return { start, handle, close };
}
