#!/usr/bin/env node
// CAPITAL_AI_GA4_RENDER_CONFIG_DIAGNOSTIC@1
// Owner-initiated local/Acode/Federation read-only probe. No secret values cross stdout/stderr.
const SERVICE = 'srv-dau1rp893c1s73cdhm1g';
const PROJECT = 'aifinancial-500208';
const ALLOWED = new Set(['GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON', 'GOOGLE_ANALYTICS_CLOUD_PROJECT']);

export function assessGa4Config(serviceAccount, configuredProject, expectedProject = PROJECT) {
  if (typeof serviceAccount !== 'string' || serviceAccount.length === 0)
    return { JSON_VALID: false, PROJECT_MATCH: null, reason: 'GA4_MCP_SERVICE_ACCOUNT_NOT_CONFIGURED' };
  let json;
  try { json = JSON.parse(serviceAccount); }
  catch { return { JSON_VALID: false, PROJECT_MATCH: null, reason: 'GA4_MCP_SERVICE_ACCOUNT_INVALID_JSON' }; }
  if (!json || Array.isArray(json) || json.type !== 'service_account' ||
      typeof json.project_id !== 'string' || typeof json.client_email !== 'string' ||
      typeof json.private_key !== 'string' || !json.private_key ||
      !json.client_email || !json.project_id)
    return { JSON_VALID: true, PROJECT_MATCH: null, reason: 'GA4_MCP_SERVICE_ACCOUNT_INVALID' };
  if (typeof configuredProject !== 'string' || !configuredProject.trim())
    return { JSON_VALID: true, PROJECT_MATCH: null, reason: 'GA4_MCP_CLOUD_PROJECT_NOT_CONFIGURED' };
  const match = json.project_id === configuredProject.trim() && json.project_id === expectedProject;
  return { JSON_VALID: true, PROJECT_MATCH: match, reason: match ? 'GA4_CONFIG_VALID' : 'GA4_MCP_PROJECT_MISMATCH' };
}

function fail(reason) {
  return { JSON_VALID: null, PROJECT_MATCH: null, reason };
}

// Requests are fixed GETs to one trusted host, one known service, and two allowlisted keys.
// Never interpolate arbitrary URLs or include the response body in exceptions.
export async function fetchRenderVariable(key, token, fetchImpl = fetch) {
  if (!ALLOWED.has(key)) throw new Error('RENDER_VARIABLE_NOT_ALLOWED');
  const url = 'https://api.render.com/v1/services/' + SERVICE + '/env-vars/' + key;
  let response;
  try {
    response = await fetchImpl(url, {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    });
  } catch { throw new Error('RENDER_API_UNAVAILABLE'); }
  if (response.status === 401) throw new Error('RENDER_API_UNAUTHORIZED');
  if (response.status === 403) throw new Error('RENDER_API_FORBIDDEN');
  if (response.status === 404) throw new Error('RENDER_VAR_UNAVAILABLE');
  if (response.status === 429) throw new Error('RENDER_API_RATE_LIMITED');
  if (!response.ok) throw new Error('RENDER_API_UNAVAILABLE');
  const declared = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(declared) && declared > 65536) throw new Error('RENDER_RESPONSE_INVALID');
  let size = 0, data = '';
  try {
    if (!response.body?.getReader) throw Error();
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 65536) throw Error();
        data += decoder.decode(value, { stream: true });
      }
      data += decoder.decode();
    } finally { reader.releaseLock(); }
  } catch { throw new Error('RENDER_RESPONSE_INVALID'); }
  let parsed;
  try { parsed = JSON.parse(data); }
  catch { throw new Error('RENDER_RESPONSE_INVALID'); }
  const entry = parsed?.envVar ?? parsed;
  if (entry?.key !== key || typeof entry.value !== 'string') throw new Error('RENDER_RESPONSE_INVALID');
  return entry.value;
}

const SAFE_CODES = new Set([
  'RENDER_VARIABLE_NOT_ALLOWED','RENDER_API_UNAUTHORIZED','RENDER_API_FORBIDDEN',
  'RENDER_VAR_UNAVAILABLE','RENDER_API_RATE_LIMITED','RENDER_API_UNAVAILABLE','RENDER_RESPONSE_INVALID',
]);

export async function runGa4Probe(env = process.env, fetchImpl = fetch) {
  const token = env.RENDER_API_KEY || env.RENDER_API_TOKEN || env.RENDER_API;
  if (typeof token !== 'string' || !token.trim()) return fail('RENDER_API_NOT_CONFIGURED');
  try {
    const secret = await fetchRenderVariable('GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON', token.trim(), fetchImpl);
    const project = await fetchRenderVariable('GOOGLE_ANALYTICS_CLOUD_PROJECT', token.trim(), fetchImpl);
    return assessGa4Config(secret, project);
  } catch (error) {
    return fail(SAFE_CODES.has(error?.message) ? error.message : 'RENDER_API_UNAVAILABLE');
  }
}

// Do not use CLI arguments for credentials and do not enable verbose/debug output.
if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const result = await runGa4Probe();
  process.stdout.write(JSON.stringify(result) + '\n');
  if (result.reason !== 'GA4_CONFIG_VALID') process.exitCode = 1;
}
