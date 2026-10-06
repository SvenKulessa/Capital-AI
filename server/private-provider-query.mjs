import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { connect } from '@nats-io/transport-node';

import { natsConnectionAuth } from './nats-auth.mjs';

const CONTRACT = Object.freeze(JSON.parse(readFileSync(
  new URL('../contracts/private-provider-query-operations.json', import.meta.url),
  'utf8',
)));
const QUERY_SUBJECT = CONTRACT.querySubject;
const EXECUTE_SUBJECT = CONTRACT.executeSubject;
const MAX_BODY_BYTES = Number(CONTRACT.maxRequestBytes || 65536);
const MAX_RESPONSE_BYTES = Number(CONTRACT.maxResponseBytes || 262144);
const MAX_TTL_MS = Number(CONTRACT.maxTtlMs || 30000);

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

function validateParamPolicy(params, policy) {
  for (const required of Array.isArray(policy.requiredParams) ? policy.requiredParams : []) {
    if (!Object.hasOwn(params, required)) throw new Error('REQUIRED_PARAM_MISSING');
  }
  for (const [key, rule] of Object.entries(policy.paramRules || {})) {
    if (!Object.hasOwn(params, key)) continue;
    const value = params[key];
    if (Array.isArray(rule.enum) && !rule.enum.includes(value)) throw new Error('INVALID_PARAM_VALUE');
    if (typeof value === 'number') {
      if (Number.isFinite(rule.min) && value < rule.min) throw new Error('INVALID_PARAM_VALUE');
      if (Number.isFinite(rule.max) && value > rule.max) throw new Error('INVALID_PARAM_VALUE');
    }
  }
  if (Number.isSafeInteger(policy.maxWindowMs) &&
      Number.isSafeInteger(params.startTime) && Number.isSafeInteger(params.endTime)) {
    if (params.endTime < params.startTime || params.endTime - params.startTime > policy.maxWindowMs) {
      throw new Error('QUERY_WINDOW_TOO_LARGE');
    }
  }
  return params;
}

export function validateProviderQueryRequest(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('INVALID_REQUEST');
  const provider = String(raw.provider || '').trim().toLowerCase();
  const operation = String(raw.operation || '').trim();
  const operationPolicy = CONTRACT.providers?.[provider]?.operations?.[operation];
  if (!operationPolicy) throw new Error('OPERATION_NOT_ADMITTED');
  const allowedParams = new Set(Array.isArray(operationPolicy.params) ? operationPolicy.params : []);
  const params = validateParamPolicy(normalizeParams(raw.params, allowedParams), operationPolicy);
  return { provider, operation, params };
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

export function executorNatsConnectionAuth(env = process.env) {
  const user = String(env.NATS_EXECUTOR_USER || '').trim();
  const pass = String(env.NATS_EXECUTOR_PASSWORD || '');
  if (!user || pass.length < 24) throw new Error('NATS_EXECUTOR_CREDENTIALS_REQUIRED');
  return { user, pass, mode: 'scoped_executor' };
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

export function assertNotReplayed(state, envelope, now = Date.now()) {
  if (!(state instanceof Map) || !safeIdentifier(envelope?.requestId) || !Number.isSafeInteger(envelope?.expiresAt)) {
    throw new Error('INVALID_REPLAY_STATE');
  }
  for (const [requestId, expiresAt] of state) {
    if (expiresAt < now) state.delete(requestId);
  }
  if (state.has(envelope.requestId)) {
    const error = new Error('QUERY_REPLAY_REJECTED');
    error.code = 'QUERY_REPLAY_REJECTED';
    throw error;
  }
  if (state.size >= 8192) throw new Error('REPLAY_WINDOW_CAPACITY_EXCEEDED');
  state.set(envelope.requestId, envelope.expiresAt);
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

export function createPrivateProviderQuery({ env = process.env, auth, vault, state } = {}) {
  let requestNc = null;
  let executorNc = null;
  let subscription = null;
  let executorLoop = null;
  let opening = null;

  function enabled() {
    return env.PRIVATE_PROVIDER_BRIDGE_ENABLED === 'true';
  }

  async function respond(message, payload) {
    if (!message.reply || !executorNc || executorNc.isClosed()) return;
    await executorNc.publish(message.reply, Buffer.from(JSON.stringify(payload), 'utf8'));
  }

  async function enforceRequestRate(userRef) {
    const configured = Number(env.PRIVATE_PROVIDER_QUERY_RATE_LIMIT_PER_MINUTE || 30);
    const limit = Number.isSafeInteger(configured) && configured >= 1 && configured <= 120 ? configured : 30;
    if (!state?.consumeProviderRate) throw new Error('PROVIDER_STATE_UNAVAILABLE');
    return state.consumeProviderRate(userRef, limit, 60_000);
  }

  async function enforceCostGate(userRef, input) {
    const policy = CONTRACT.providers?.[input.provider]?.operations?.[input.operation] || {};
    const minIntervalMs = Number(policy.minIntervalMs || 0);
    const globalMinIntervalMs = Number(policy.globalMinIntervalMs || 0);
    const costUnits = Number(policy.costUnits || 1);
    if (!Number.isSafeInteger(minIntervalMs) || minIntervalMs < 0 ||
        !Number.isSafeInteger(globalMinIntervalMs) || globalMinIntervalMs < 0 ||
        !Number.isSafeInteger(costUnits) || costUnits < 1) {
      throw new Error('INVALID_OPERATION_COST_POLICY');
    }
    if (minIntervalMs === 0 && globalMinIntervalMs === 0) return { costUnits, retryAfterSeconds: 0 };
    if (!state?.claimProviderCostScopes) throw new Error('PROVIDER_STATE_UNAVAILABLE');

    const scopes = [
      { key: `user:${userRef}:${input.provider}:${input.operation}`, intervalMs: minIntervalMs },
      { key: `global:${input.provider}:${input.operation}`, intervalMs: globalMinIntervalMs },
    ].filter(scope => scope.intervalMs > 0);

    try {
      await state.claimProviderCostScopes(scopes);
    } catch (error) {
      if (error?.code === 'PROVIDER_QUERY_COST_THROTTLED') error.costUnits = costUnits;
      throw error;
    }
    return { costUnits, retryAfterSeconds: 0 };
  }

  async function executor(message) {
    let envelope;
    try {
      if (message.data.length > MAX_BODY_BYTES) throw new Error('REQUEST_TOO_LARGE');
      envelope = JSON.parse(new TextDecoder().decode(message.data));
      if (!verifyProviderQueryEnvelope(envelope, env)) throw new Error('INVALID_QUERY_PROOF');
      if (!state?.claimProviderReplay) throw new Error('PROVIDER_STATE_UNAVAILABLE');
      await state.claimProviderReplay(envelope.requestId, envelope.expiresAt);
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

  async function start() {
    if (!enabled()) return false;
    if (requestNc && !requestNc.isClosed() && executorNc && !executorNc.isClosed()) return true;
    if (opening) return opening;
    opening = (async () => {
      const appAuth = natsConnectionAuth(env);
      const { mode: _appMode, ...appCredentials } = appAuth;
      const executorAuth = executorNatsConnectionAuth(env);
      const { mode: _executorMode, ...executorCredentials } = executorAuth;

      requestNc = await connect({
        servers: env.NATS_URL,
        ...appCredentials,
        timeout: 3000,
        maxReconnectAttempts: 3,
        reconnectTimeWait: 1000,
      });
      executorNc = await connect({
        servers: env.NATS_URL,
        ...executorCredentials,
        timeout: 3000,
        maxReconnectAttempts: 3,
        reconnectTimeWait: 1000,
      });
      subscription = executorNc.subscribe(EXECUTE_SUBJECT, { queue: 'capital-private-provider-executor' });
      executorLoop = (async () => {
        for await (const message of subscription) await executor(message);
      })().catch(() => {});
      return true;
    })().finally(() => { opening = null; });
    return opening;
  }

  async function handle(req, res, url, json, requestId) {
    if (url.pathname !== '/api/profile/provider-query') return false;
    res.setHeader('Cache-Control', 'no-store');
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
      try {
        await enforceRequestRate(user.userId);
      } catch (error) {
        res.setHeader('Retry-After', String(error.retryAfterSeconds || 60));
        json(res, 429, { error: 'private_provider_rate_limited' });
        return true;
      }
      input = validateProviderQueryRequest(await readJson(req));
      let costGate;
      try {
        costGate = await enforceCostGate(user.userId, input);
      } catch (error) {
        if (error?.code === 'PROVIDER_QUERY_COST_THROTTLED') {
          res.setHeader('Retry-After', String(error.retryAfterSeconds || 60));
          json(res, 429, {
            error: 'provider_query_cost_throttled',
            provider: input.provider,
            operation: input.operation,
            costUnits: error.costUnits || null,
          });
          return true;
        }
        throw error;
      }
      await start();
      if (!requestNc || requestNc.isClosed() || !executorNc || executorNc.isClosed()) {
        throw new Error('PRIVATE_PROVIDER_BRIDGE_UNAVAILABLE');
      }
      const envelope = createProviderQueryEnvelope({
        userRef: user.userId,
        requestId,
        ...input,
      }, env);
      const response = await requestNc.request(
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
        costUnits: costGate.costUnits,
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
    try { await requestNc?.close(); } catch {}
    try { await executorNc?.close(); } catch {}
    requestNc = null;
    executorNc = null;
    await Promise.resolve(executorLoop).catch(() => {});
    executorLoop = null;
  }

  return { start, handle, close };
}
