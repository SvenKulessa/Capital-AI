import { setTimeout as delay } from 'node:timers/promises';

const base = 'https://api.openai.com/v1/';
const path = '/api/profile/growth-intelligence/openai-status';
const modelPattern = /^[A-Za-z0-9._-]{3,80}$/;
const outputTokens = 550;
const inputTokens = 16000;

function positiveInteger(value) {
  const n = Number(value);
  return /^[1-9]\d{0,8}$/.test(value ?? '') ? n : null;
}

export function openAiConfiguration(env) {
  const key = env.OPENAI_API_KEY;
  const model = env.SOCIAL_CONTENT_OPENAI_MODEL;
  const cap = positiveInteger(env.SOCIAL_CONTENT_OPENAI_MAX_REQUEST_MICROUSD);
  const inputRate = positiveInteger(env.SOCIAL_CONTENT_OPENAI_INPUT_MICROUSD_PER_MTOKEN);
  const outputRate = positiveInteger(env.SOCIAL_CONTENT_OPENAI_OUTPUT_MICROUSD_PER_MTOKEN);
  const maximumMicroUsd = inputRate && outputRate
    ? Math.ceil((inputRate * inputTokens + outputRate * outputTokens) / 1_000_000)
    : null;
  return {
    key: typeof key === 'string' && /^[!-~]{1,512}$/.test(key) ? key : null,
    model: modelPattern.test(model ?? '') && !/^sk-/i.test(model) ? model : null,
    budget: {
      inputTokens, outputTokens, capMicroUsd: cap, maximumMicroUsd,
      permitsRequest: Boolean(env.SOCIAL_BATCH_EXTERNAL_WORKERS === 'enabled' &&
        cap && maximumMicroUsd && maximumMicroUsd <= cap),
    },
  };
}

export async function readOpenAiJson(response, maxBytes) {
  const reader = response.body?.getReader();
  if (!reader) throw Error('OPENAI_RESPONSE_INVALID');
  const chunks = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw Error('OPENAI_RESPONSE_INVALID');
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Error('OPENAI_RESPONSE_INVALID');
  } finally {
    reader.releaseLock();
  }
}

export async function requestOpenAi(endpoint, key, fetchImpl, body) {
  try {
    return await fetchImpl(base + endpoint, {
      method: body ? 'POST' : 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(body ? 15000 : 3500),
      headers: {
        Authorization: 'Bearer ' + key,
        Accept: 'application/json',
        ...(body && { 'Content-Type': 'application/json' }),
      },
      ...(body && { body: JSON.stringify(body) }),
    });
  } catch {
    throw Error('OPENAI_TRANSPORT_FAILURE');
  }
}

export function redactOpenAiOutput(value, key) {
  return value.replaceAll(key, '[redacted]').replace(/\bsk-[A-Za-z0-9_-]{8,}/g, '[redacted]');
}

async function probeModel({ key, model }, fetchImpl, sleep) {
  if (!key) return { connection: 'NOT_CONFIGURED', modelAvailable: null };
  let response;
  try {
    // A failed target lookup may be scoped to the model. Check authentication separately in that case.
    const endpoint = model ? 'models/' + encodeURIComponent(model) : 'models';
    response = await requestOpenAi(endpoint, key, fetchImpl);
    if ([502, 503, 504].includes(response.status) && !response.headers.has('retry-after')) {
      await response.body?.cancel();
      await sleep(250);
      response = await requestOpenAi(endpoint, key, fetchImpl);
    }
    if (model && [403, 404].includes(response.status)) {
      await response.body?.cancel();
      const status = await probeModel({ key, model: null }, fetchImpl, sleep);
      return { ...status, modelAvailable: status.connection === 'CONNECTED' ? false : null };
    }
    if (response.status === 401) return { connection: 'AUTH_REJECTED', modelAvailable: null };
    if (response.status === 403) return { connection: 'ACCESS_DENIED', modelAvailable: null };
    if (response.status === 429) return { connection: 'RATE_LIMITED', modelAvailable: null };
    if (response.ok) {
      const data = await readOpenAiJson(response, model ? 8192 : 262144);
      if (model ? data?.object === 'model' && data.id === model : data?.object === 'list' && Array.isArray(data.data)) {
        return { connection: 'CONNECTED', modelAvailable: model ? true : null };
      }
    }
  } catch {
    // Provider errors may contain credentials or other sensitive data.
  } finally {
    if (response?.body && !response.bodyUsed) await response.body.cancel().catch(() => {});
  }
  return { connection: 'NOT_PROVEN', modelAvailable: null };
}

export function createOpenAiStatus({ authorized, env = process.env, fetchImpl = fetch, now = Date.now, sleep = delay } = {}) {
  let cached;
  let inFlight;
  return {
    async handle(req, res, url, json) {
      if (url.pathname !== path) return false;
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('Vary', 'Cookie');
      if (!await authorized?.(req, res)) {
        json(res, 404, { error: 'not_found' });
      } else if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        json(res, 405, { error: 'method_not_allowed' });
      } else {
        if (!cached || now() >= cached.expiresAt) {
          const config = openAiConfiguration(env);
          inFlight ??= probeModel(config, fetchImpl, sleep).then(status => {
            cached = { expiresAt: now() + 60000, value: {
              ...status,
              productionKeyPresent: Boolean(env.OPENAI_API_KEY?.trim()),
              personalKeyPresent: Boolean(env.OPENAI_API_KEY_PERSONAL?.trim()),
              modelConfigured: Boolean(config.model),
              budget: config.budget,
              checkedAt: new Date(now()).toISOString(),
            } };
          }).finally(() => { inFlight = undefined; });
          await inFlight;
        }
        json(res, 200, cached.value);
      }
      return true;
    },
  };
}
