// Read-only runtime evidence. Never project response bodies, credentials, or unlisted fields.
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { appendFileSync } from 'node:fs';

const SHA = /^[0-9a-f]{40}$/;
const BUILDER = 'SvenKulessa/Capital-AI/.github/workflows/build-security.yml';
const SERVICE_ID = 'srv-dau1rp893c1s73cdhm1g';
const OWNER_ID = 'tea-d90o4rj7uimc739i86ug';
const FLAG = 'CAPITAL_AI_TINYFISH_READBACK_ENABLED';
const ORIGINS = new Set(['https://capital-ai.online', 'https://capital-ai-uvsl.onrender.com']);
const MAX_BODY_BYTES = 64 * 1024;

function requireSha(value, nullable = false) {
  if (nullable && value == null) return null;
  if (typeof value !== 'string' || !SHA.test(value)) throw new Error('INVALID_SOURCE_SHA');
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
  // Unattested Render source evidence is separate from GitHub builder proof.
  const renderBuild = body.renderGitBuildIdentity;
  let renderBuildSha = null;
  if (renderBuild !== undefined) {
    if (!renderBuild || typeof renderBuild !== 'object') throw new Error('RENDER_BUILD_SHAPE_INVALID');
    renderBuildSha = requireSha(renderBuild.sourceSha, true);
    const kind = renderBuildSha === null ? 'NOT_PROVEN' : 'RENDER_GIT_BUILD_ARG_UNATTESTED';
    if (renderBuild.evidence !== kind || (bound && renderBuildSha !== null)) {
      throw new Error('RENDER_BUILD_PROVENANCE_CONFLICT');
    }
  }
  const runtimeSha = requireSha(body.runtimeIdentity.sourceSha, true);
  const expected = expectedMainSha == null ? null : requireSha(expectedMainSha);
  return {
    schema: 'CAPITAL_AI_RUNTIME_HTTP_READBACK@1',
    evidenceType: 'ANONYMOUS_HTTP_CLAIM_NOT_OCI_ATTESTATION',
    httpStatus,
    status,
    runtimeIdentity: { sourceSha: runtimeSha },
    ...(renderBuild === undefined ? {} : { renderGitBuildIdentity: {
      sourceSha: renderBuildSha,
      evidence: renderBuildSha === null ? 'NOT_PROVEN' : 'RENDER_GIT_BUILD_ARG_UNATTESTED',
      matchesRuntime: renderBuildSha === null || runtimeSha === null ? null : renderBuildSha === runtimeSha,
    } }),
    buildIdentity: { bound, sourceSha: buildSha, builder: builder === BUILDER ? BUILDER : null },
    expectedMainSha: expected,
    runtimeMatchesExpectedMain: expected == null ? null : runtimeSha === expected,
  };
}

// Evidence classification is deliberately non-authorizing: an HTTP response
// can corroborate a source SHA but cannot attest the OCI image or GitHub builder.
export function healthReadbackSummary(report) {
  if (!report || report.schema !== 'CAPITAL_AI_RUNTIME_HTTP_READBACK@1') {
    throw new Error('READBACK_REPORT_INVALID');
  }
  const runtimeState = report.runtimeMatchesExpectedMain === true
    ? 'HTTP_SHA_CLAIM_MATCH_ONLY'
    : report.runtimeMatchesExpectedMain === false
      ? 'NOT_PROVEN_RUNTIME_SHA_DRIFT' : 'NOT_PROVEN_EXPECTED_MAIN_MISSING';
  const buildState = report.buildIdentity?.bound === true
    ? (report.runtimeIdentity?.sourceSha && report.buildIdentity.sourceSha !== report.runtimeIdentity.sourceSha
      ? 'NOT_PROVEN_BAKED_RUNTIME_SHA_DRIFT'
      : 'HTTP_BOUND_BUILDER_CLAIM_NOT_ATTESTED') : 'NOT_PROVEN_UNBOUND';
  const renderState = report.renderGitBuildIdentity?.matchesRuntime === true
    ? 'RENDER_GIT_SHA_CLAIM_MATCH_ONLY'
    : report.renderGitBuildIdentity?.matchesRuntime === false
      ? 'NOT_PROVEN_RENDER_SHA_DRIFT' : 'NOT_PROVEN_RENDER_GIT_SHA';
  const value = sha => /^[0-9a-f]{40}$/.test(sha || '') ? sha : 'NOT_PROVEN';
  return [
    '### TRUST Runtime Readback – HTTP evidence only',
    '- Runtime source SHA: ' + value(report.runtimeIdentity?.sourceSha),
    '- Expected main SHA: ' + value(report.expectedMainSha),
    '- Runtime/Main: ' + runtimeState,
    '- Render Git/Runtime: ' + renderState,
    '- Baked BuildIdentity: ' + buildState,
    '- OCI / Sigstore attestation: NOT_PROVEN',
    '- This is a read-only snapshot, not a merge gate or deployment admission.',
    '',
  ].join('\n');
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

const RENDER_FAILURE_CODES = new Set([
  'FLAG_SHAPE_INVALID', 'GROUP_LIST_INVALID', 'GROUP_ID_INVALID', 'GROUP_OWNER_MISMATCH',
  'GROUP_PAGING_INCOMPLETE', 'GROUP_PAGING_EXCEEDED', 'SERVICE_IDENTITY_MISMATCH',
  'BODY_MISSING', 'BODY_TOO_LARGE', 'INVALID_JSON', 'RENDER_HOST_INVALID',
]);

function safeRenderFailure(error) {
  const message = error instanceof Error ? error.message : '';
  if (RENDER_FAILURE_CODES.has(message) || /^RENDER_HTTP_[1-5][0-9]{2}$/.test(message)) return message;
  if (error instanceof Error && error.name === 'TimeoutError') return 'RENDER_FETCH_TIMEOUT';
  return 'RENDER_FETCH_OR_IO_FAILED';
}

function unproven(reason, stage) {
  return { status: 'NOT_PROVEN', enabled: null, reason, stage };
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
  const json = await limitedJson(response);
  if (json === null) throw new Error('INVALID_JSON');
  return json;
}

// Only call this from a trusted main-branch workflow (never from pull_request).
export async function readTinyFishConfig({ token, fetchImpl = fetch } = {}) {
  if (!token) return { status: 'NOT_PROVEN', enabled: null, reason: 'READ_TOKEN_NOT_AVAILABLE' };
  if (typeof token !== 'string' || /\s/.test(token)) return unproven('READ_TOKEN_FORMAT_INVALID', 'TOKEN');
  let stage = 'SERVICE_FLAG';
  try {
    const direct = await renderGet(fetchImpl, `/v1/services/${SERVICE_ID}/env-vars/${FLAG}`, token);
    if (direct) return { status: 'VERIFIED_CONFIG', enabled: flagValue(direct), source: 'SERVICE_DIRECT',
      runtimeValidated: false };

    // A 404 can mean an inaccessible service, not only an absent key.
    stage = 'SERVICE_METADATA';
    const service = await renderGet(fetchImpl, `/v1/services/${SERVICE_ID}`, token);
    if (!service) return unproven('SERVICE_NOT_FOUND_OR_HIDDEN', stage);
    if (service.id !== SERVICE_ID || service.ownerId !== OWNER_ID) throw new Error('SERVICE_IDENTITY_MISMATCH');

    // Only group metadata and the one requested key are read. Never enumerate group values.
    stage = 'GROUP_METADATA';
    const candidates = [];
    const seen = new Set();
    const cursors = new Set();
    let cursor = null;
    for (let page = 0; page < 10; page++) {
      const url = new URL('/v1/env-groups', 'https://api.render.com');
      url.searchParams.append('ownerId', OWNER_ID);
      url.searchParams.set('limit', '100');
      if (cursor) url.searchParams.set('cursor', cursor);
      const groups = await renderGet(fetchImpl, url.pathname + url.search, token);
      if (!Array.isArray(groups) || groups.length > 100) throw new Error('GROUP_LIST_INVALID');
      for (const item of groups) {
        const group = item?.envGroup || item;
        if (!group || typeof group.id !== 'string' || !Array.isArray(group.serviceLinks) ||
            group.serviceLinks.some(link => !link || typeof link.id !== 'string')) throw new Error('GROUP_LIST_INVALID');
        if (!group.serviceLinks.some(link => link.id === SERVICE_ID)) continue;
        if (group.ownerId !== OWNER_ID) throw new Error('GROUP_OWNER_MISMATCH');
        if (!/^evg-[a-z0-9]+$/.test(group.id)) throw new Error('GROUP_ID_INVALID');
        if (!seen.has(group.id)) {
          seen.add(group.id);
          candidates.push(group.id);
        }
      }
      // Cursor wrappers may have short pages; do not truncate a supplied cursor.
      const next = groups.at(-1)?.cursor;
      if (!groups.length || (next == null && groups.length < 100)) break;
      if (typeof next !== 'string' || !next || cursors.has(next)) throw new Error('GROUP_PAGING_INCOMPLETE');
      if (page === 9) throw new Error('GROUP_PAGING_EXCEEDED');
      cursors.add(next);
      cursor = next;
    }
    stage = 'GROUP_FLAG';
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
  } catch (error) {
    // Fixed stage and reason only: no response bodies, raw values or exception text.
    return unproven(safeRenderFailure(error), stage);
  }
}

// Diagnostic codes only; never print raw exceptions, URLs, headers or response bodies.
export function safeHealthFailure(error) {
  const message=error instanceof Error?error.message:'';
  const allowed=new Set(['BODY_MISSING','BODY_TOO_LARGE','INVALID_JSON','HTTP_STATUS_NOT_200','HEALTH_IDENTITY_MISSING',
    'HEALTH_STATUS_INVALID','BUILD_BOUND_INVALID','INVALID_SOURCE_SHA','BUILD_IDENTITY_INCONSISTENT',
    'UNBOUND_IDENTITY_INCONSISTENT','RENDER_BUILD_SHAPE_INVALID','RENDER_BUILD_PROVENANCE_CONFLICT','ORIGIN_NOT_ALLOWLISTED']);
  if(allowed.has(message)||/^HEALTH_HTTP_[1-5][0-9]{2}$/.test(message))return message;
  if(error instanceof Error&&error.name==='TimeoutError')return 'HEALTH_FETCH_TIMEOUT';
  return 'HEALTH_FETCH_OR_IO_FAILED';
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--health')) {
    try {
      const report = await readHealth({
        origin: process.env.CAPITAL_RUNTIME_ORIGIN || 'https://capital-ai-uvsl.onrender.com',
        expectedMainSha: process.env.CAPITAL_EXPECTED_MAIN_SHA || null,
      });
      console.log('HEALTHZ_IDENTITY_EVIDENCE ' + JSON.stringify(report));
      if (process.env.GITHUB_STEP_SUMMARY) {
        appendFileSync(process.env.GITHUB_STEP_SUMMARY, healthReadbackSummary(report));
      }
    } catch (error) {
      console.error('HEALTHZ_IDENTITY_NOT_PROVEN ' + safeHealthFailure(error));
      process.exitCode = 1;
    }
  } else if (process.argv.includes('--flag')) {
    const report = await readTinyFishConfig({ token: process.env.RENDER_API_KEY_TEST });
    console.log('TINYFISH_FLAG_CONFIG_EVIDENCE ' + JSON.stringify(report));
    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, '### TRUST Render flag – configuration only\n```json\n' + JSON.stringify(report) + '\n```\n');
    }
  } else {
    console.error('USAGE: --health or --flag');
    process.exitCode = 2;
  }
}
