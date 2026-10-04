const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 8_000;
const PROXY_HOP_HEADER = 'x-capital-ai-scorer-proxy-hop';

function privateFinanceOrigin(value) {
  try {
    const url = new URL(String(value || ''));
    const validHost = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(url.hostname);
    const valid =
      url.protocol === 'http:' &&
      validHost &&
      url.port === '10000' &&
      url.username === '' &&
      url.password === '' &&
      url.pathname === '/' &&
      url.search === '' &&
      url.hash === '';
    return valid ? url.origin : null;
  } catch {
    return null;
  }
}

function admittedSourceCount(policy) {
  return (policy?.admittedSources || []).filter(
    source => source?.eligible === true && source?.decision === 'OPEN_SOURCE_OPEN_DATA_ADMITTED',
  ).length;
}

async function readRequestJson(req) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > MAX_REQUEST_BYTES) throw new Error('REQUEST_TOO_LARGE');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks);
  let parsed;
  try {
    parsed = raw.length ? JSON.parse(raw.toString('utf8')) : {};
  } catch {
    throw new Error('INVALID_JSON');
  }
  return { raw: Buffer.from(JSON.stringify(parsed)), parsed };
}

async function readResponseJson(response) {
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > MAX_RESPONSE_BYTES) throw new Error('UPSTREAM_RESPONSE_TOO_LARGE');
  if (!String(response.headers.get('content-type') || '').toLowerCase().includes('application/json')) {
    throw new Error('UPSTREAM_CONTENT_TYPE_INVALID');
  }
  if (!response.body) throw new Error('UPSTREAM_BODY_MISSING');

  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) throw new Error('UPSTREAM_RESPONSE_TOO_LARGE');
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('UPSTREAM_JSON_INVALID');
  }
}

function bearerAuthorization(value) {
  if (typeof value !== 'string' || value.length > 8192) return null;
  return /^Bearer [^\s,]+$/i.test(value) ? value : null;
}

export function createScorerProxy({
  env = process.env,
  fetchImpl = fetch,
  sourcePolicy = { admittedSources: [] },
} = {}) {
  const upstreamOrigin = privateFinanceOrigin(env.CAPITAL_AI_FINANCE_SCORER_PRIVATE_ORIGIN);

  async function handle(req, res, url, json, requestId = null) {
    if (url.pathname !== '/api/crypto/score') return false;

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      json(res, 405, { error: 'method_not_allowed' });
      return true;
    }

    if (String(req.headers[PROXY_HOP_HEADER] || '') !== '') {
      json(res, 502, { error: 'scorer_proxy_loop_detected' });
      return true;
    }

    if (admittedSourceCount(sourcePolicy) === 0) {
      json(res, 503, {
        error: 'market_source_not_admitted',
        sourcePolicy: 'OPEN_SOURCE_AND_OPEN_DATA_ONLY',
      });
      return true;
    }

    if (!upstreamOrigin) {
      json(res, 503, { error: 'scorer_upstream_not_configured' });
      return true;
    }

    if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
      json(res, 415, { error: 'content_type_must_be_application_json' });
      return true;
    }

    let body;
    try {
      body = await readRequestJson(req);
    } catch (error) {
      const code = error?.message === 'REQUEST_TOO_LARGE' ? 413 : 400;
      json(res, code, { error: error?.message === 'REQUEST_TOO_LARGE' ? 'request_too_large' : 'invalid_json' });
      return true;
    }

    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      [PROXY_HOP_HEADER]: '1',
    };
    const auth = bearerAuthorization(req.headers.authorization);
    if (auth) headers.Authorization = auth;
    if (requestId) headers['x-correlation-id'] = String(requestId).slice(0, 128);

    try {
      const target = new URL('/api/crypto/score', upstreamOrigin);
      const response = await fetchImpl(target, {
        method: 'POST',
        headers,
        body: body.raw,
        redirect: 'error',
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      const payload = await readResponseJson(response);
      const correlationId = response.headers.get('x-correlation-id');
      if (correlationId && /^[A-Za-z0-9._:-]{1,128}$/.test(correlationId)) {
        res.setHeader('x-correlation-id', correlationId);
      }
      json(res, response.status, payload);
      return true;
    } catch {
      json(res, 503, { error: 'canonical_scorer_unavailable' });
      return true;
    }
  }

  return {
    handle,
    configured: Boolean(upstreamOrigin),
    upstreamOrigin,
  };
}
