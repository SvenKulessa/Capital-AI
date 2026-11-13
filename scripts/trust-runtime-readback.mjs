// Read-only runtime evidence. Never project response bodies, credentials, or unlisted fields.
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const SHA = /^[0-9a-f]{40}$/;
const BUILDER = 'SvenKulessa/Capital-AI/.github/workflows/build-security.yml';
const SERVICE_ID = 'srv-dau1rp893c1s73cdhm1g';
const OWNER_ID = 'tea-d90o4rj7uimc739i86ug';
const FLAG = 'CAPITAL_AI_TINYFISH_READBACK_ENABLED';
const ORIGINS = new Set(['https://capital-ai.online', 'https://capital-ai-uvsl.onrender.com']);
const MAX_BODY_BYTES = 64 * 1024;

function requireSha(value, nullable = false) {
  if (nullable && value == null) return null;
  if (!SHA.test(value || '')) throw new Error('INVALID_SOURCE_SHA');
  return value;
}

async function limitedJson(response) {
  if (!response.body) throw new Error('BODY_MISSING');
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) throw new Error('BODY_TOO_LARGE');
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new Error('INVALID_JSON'); }
}

export function projectHealth(httpStatus, body, expectedMainSha = null) {
  if (httpStatus !== 200) throw new Error('HTTP_STATUS_NOT_200');
  if (!body || typeof body !== 'object' || !body.buildIdentity || !body.runtimeIdentity) {
    throw new Error('HEALTH_IDENTITY_MISSING');
  }
  const status = body.status;
  if (typeof status !== 'string' || !/^[a-z][a-z_-]{0,31}$/.test(status)) {
    throw new Error('HEALTH_STATUS_INVALID');
  }
  const bound = body.buildIdentity.bound;
  if (typeof bound !== 'boolean') throw new Error('BUILD_BOUND_INVALID');
  const buildSha = requireSha(body.buildIdentity.sourceSha, !bound);
  const builder = body.buildIdentity.builder == null ? null : body.buildIdentity.builder;
  if (bound && (buildSha == null || builder !== BUILDER)) throw new Error('BUILD_IDENTITY_INCONSISTENT');
  if (!bound && (buildSha !== null || builder !== null)) throw new Error('UNBOUND_IDENTITY_INCONSISTENT');
  const runtimeSha = requireSha(body.runtimeIdentity.sourceSha, true);
  const expected = expectedMainSha == null ? null : requireSha(expectedMainSha);
  return {
    schema: 'CAPITAL_AI_RUNTIME_HTTP_READBACK@1',
    evidenceType: 'ANONYMOUS_HTTP_CLAIM_NOT_OCI_ATTESTATION',
    httpStatus,
    status,
    runtimeIdentity: { sourceSha: runtimeSha },
    buildIdentity: { bound, sourceSha: buildSha, builder: builder === BUILDER ? BUILDER : null },
    expectedMainSha: expected,
    runtimeMatchesExpectedMain: expected == null ? null : runtimeSha === expected,
  };
}

function originUrl(origin) {
  const url = new URL(origin);
  if (!ORIGINS.has(url.origin) || url.href !== url.origin + '/') throw new Error('ORIGIN_NOT_ALLOWLISTED');
  return url.origin;
}

export async function readHealth({ origin = 'https://capital-ai-uvsl.onrender.com', fetchImpl = fetch,
  expectedMainSha = null } = {}) {
  const safeOrigin = originUrl(origin);
  const response = await fetchImpl(safeOrigin + '/healthz', {
    method: 'GET', redirect: 'manual',
    signal: AbortSignal.timeout(15000),
    headers: { Accept: 'application/json', 'User-Agent': 'CAPITAL-AI-TRUST-Readback/1.0' },
  });
  if (response.status !== 200) {
    await response.body?.cancel().catch(() => {});
    throw new Error('HEALTH_HTTP_' + response.status);
  }
  return projectHealth(response.status, await limitedJson(response), expectedMainSha);
}

function flagValue(json) {
  const variable = json?.envVar || json;
  if (variable?.key !== FLAG || typeof variable?.value !== 'string') throw new Error('FLAG_SHAPE_INVALID');
  // Application semantics: only the exact string "true" enables a run.
  return variable.value === 'true';
}

async function renderGet(fetchImpl, path, token) {
  const url = new URL(path, 'https://api.render.com');
  if (url.origin !== 'https://api.render.com') throw new Error('RENDER_HOST_INVALID');
  const response = await fetchImpl(url, {
    method: 'GET', redirect: 'error',
    signal: AbortSignal.timeout(12000),
    headers: { Accept: 'application/json', Authorization: 'Bearer ' + token },
  });
  if (response.status === 404) { await response.body?.cancel().catch(() => {}); return null; }
  if (response.status !== 200) {
    await response.body?.cancel().catch(() => {});
    throw new Error('RENDER_HTTP_' + response.status);
  }
  return limitedJson(response);
}

// Only call this from a trusted main-branch workflow (never from pull_request).
export async function readTinyFishConfig({ token, fetchImpl = fetch } = {}) {
  if (!token) return { status: 'NOT_PROVEN', enabled: null, reason: 'READ_TOKEN_NOT_AVAILABLE' };
  try {
    const direct = await renderGet(fetchImpl, `/v1/services/${SERVICE_ID}/env-vars/${FLAG}`, token);
    if (direct) return { status: 'VERIFIED_CONFIG', enabled: flagValue(direct), source: 'SERVICE_DIRECT',
      runtimeValidated: false };

    // Only group metadata and the one requested key are read. Never enumerate group values.
    const candidates = [];
    const seen = new Set();
    let cursor = null;
    for (let page = 0; page < 10; page++) {
      const url = new URL('/v1/env-groups', 'https://api.render.com');
      url.searchParams.append('ownerId[]', OWNER_ID);
      url.searchParams.set('limit', '100');
      if (cursor) url.searchParams.set('cursor', cursor);
      const groups = await renderGet(fetchImpl, url.pathname + url.search, token);
      if (!Array.isArray(groups)) throw new Error('GROUP_LIST_INVALID');
      for (const item of groups) {
        const group = item?.envGroup || item;
        if (group?.id && Array.isArray(group.serviceLinks) &&
            group.serviceLinks.some(link => link.id === SERVICE_ID) && !seen.has(group.id)) {
          seen.add(group.id);
          candidates.push(group.id);
        }
      }
      if (groups.length < 100) break;
      const next = groups.at(-1)?.cursor;
      if (typeof next !== 'string' || !next || next === cursor) throw new Error('GROUP_PAGING_INCOMPLETE');
      cursor = next;
      if (page === 9) throw new Error('GROUP_PAGING_EXCEEDED');
    }
    const values = [];
    for (const id of candidates) {
      if (!/^evg-[a-z0-9]+$/.test(id)) throw new Error('GROUP_ID_INVALID');
      const response = await renderGet(fetchImpl, `/v1/env-groups/${id}/env-vars/${FLAG}`, token);
      if (response !== null) values.push(flagValue(response));
    }
    if (values.length && values.every(v => v === values[0])) {
      return { status: 'VERIFIED_CONFIG', enabled: values[0], source: 'LINKED_ENV_GROUP',
        runtimeValidated: false };
    }
    return { status: 'NOT_PROVEN', enabled: null, reason: values.length ? 'GROUP_COLLISION' : 'KEY_NOT_FOUND' };
  } catch {
    // Do not emit provider response bodies, variable values, or exception text.
    return { status: 'NOT_PROVEN', enabled: null, reason: 'RENDER_READ_FAILED' };
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--health')) {
    try {
      const report = await readHealth({
        origin: process.env.CAPITAL_RUNTIME_ORIGIN || 'https://capital-ai-uvsl.onrender.com',
        expectedMainSha: process.env.CAPITAL_EXPECTED_MAIN_SHA || null,
      });
      console.log('HEALTHZ_IDENTITY_EVIDENCE ' + JSON.stringify(report));
    } catch {
      console.error('HEALTHZ_IDENTITY_NOT_PROVEN');
      process.exitCode = 1;
    }
  } else if (process.argv.includes('--flag')) {
    const report = await readTinyFishConfig({ token: process.env.RENDER_API_KEY_TEST });
    console.log('TINYFISH_FLAG_CONFIG_EVIDENCE ' + JSON.stringify(report));
  } else {
    console.error('USAGE: --health or --flag');
    process.exitCode = 2;
  }
}
