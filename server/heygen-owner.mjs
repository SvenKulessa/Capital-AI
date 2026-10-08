import { createHash } from 'node:crypto';
import { open, readFile, rename, realpath } from 'node:fs/promises';
import path from 'node:path';
import { boundedJson, createLimiter, readJson } from './http-security.mjs';

const API = 'https://api.heygen.com/v3/videos';
const ID = /^[A-Za-z0-9_-]{1,100}$/;
const validId = value => typeof value === 'string' && ID.test(value);
const STATES = new Set(['waiting', 'pending', 'processing', 'completed', 'failed']);
const fail = code => { throw new Error(code); };
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const text = (value, max = 200) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const money = value => typeof value === 'number' && Number.isFinite(value) && value > 0;

// Jobs are server-side owner configuration, never approval assertions from HTTP clients.
export function approvedJobs(env, now = Date.now()) {
  let jobs;
  try { jobs = JSON.parse(env.HEYGEN_APPROVED_JOBS_JSON || '[]'); } catch { fail('heygen_configuration_invalid'); }
  const budget = Number(env.HEYGEN_APPROVED_BATCH_USD);
  if (!Array.isArray(jobs) || jobs.length < 1 || jobs.length > 20 || !money(budget)) fail('heygen_budget_unconfigured');
  const result = new Map();
  let total = 0;
  for (const job of jobs) {
    const keys = ['jobId', 'sourceSha', 'expiresAt', 'estimatedCostUsd', 'costApprovalRef', 'rightsApprovalRef', 'brandApprovalRef', 'personaConsentRef', 'payload'];
    if (!job || Object.keys(job).some(key => !keys.includes(key)) || !validId(job.jobId) || result.has(job.jobId) ||
        !/^[a-f0-9]{40}$/.test(job.sourceSha || '') || !money(job.estimatedCostUsd) ||
        !['costApprovalRef', 'rightsApprovalRef', 'brandApprovalRef', 'personaConsentRef'].every(key => text(job[key], 500)) ||
        !Number.isFinite(Date.parse(job.expiresAt)) || Date.parse(job.expiresAt) <= now) fail('heygen_job_invalid');
    const p = job.payload;
    if (!p || Object.keys(p).some(key => !['type', 'avatar_id', 'voice_id', 'script', 'title', 'aspect_ratio', 'output_format'].includes(key)) ||
        p.type !== 'avatar' || !validId(p.avatar_id) || !validId(p.voice_id) || !text(p.script, 4000) ||
        !text(p.title, 200) || !['16:9', '9:16', '1:1'].includes(p.aspect_ratio) || p.output_format !== 'mp4') fail('heygen_job_invalid');
    total += job.estimatedCostUsd;
    result.set(job.jobId, { ...job, requestHash: hash(job) });
  }
  if (total > budget) fail('heygen_batch_budget_exceeded');
  return result;
}

export function normalizeVideo(data, expectedId) {
  if (!data || !validId(data.id || data.video_id) || (expectedId && data.id !== expectedId)) fail('heygen_response_invalid');
  const status = STATES.has(data.status) ? data.status.toUpperCase() : 'UNKNOWN';
  let videoUrl = null;
  if (status === 'COMPLETED') {
    try {
      const url = new URL(data.video_url);
      if (url.protocol !== 'https:' || url.username || url.password) fail('heygen_response_invalid');
      videoUrl = url.href;
    } catch { fail('heygen_response_invalid'); }
  }
  return { videoId: data.id || data.video_id, status, videoUrl, draftOnly: true, publicPublishAllowed: false,
    assetHash: null, assetVerified: false };
}

export function createHeygenOwner({ env = process.env, fetchImpl = fetch, auth, now = Date.now, publicRoot = path.resolve('dist') } = {}) {
  const limit = createLimiter(10);
  async function stateDirectory() {
    if (!path.isAbsolute(env.HEYGEN_STATE_DIR || '')) fail('heygen_state_unconfigured');
    const dir = await realpath(env.HEYGEN_STATE_DIR);
    let root;
    try { root = await realpath(publicRoot); } catch { root = path.resolve(publicRoot); }
    const relative = path.relative(root, dir);
    if (dir === '/tmp' || dir.startsWith('/tmp/') || relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) fail('heygen_state_unconfigured');
    return dir;
  }
  async function config() {
    if (env.HEYGEN_ENABLED !== 'true') fail('heygen_disabled');
    if (!text(env.HEYGEN_API_KEY, 4096) || /[\r\n]/.test(env.HEYGEN_API_KEY)) fail('heygen_key_unconfigured');
    if (env.HEYGEN_PAID_USAGE_APPROVED !== 'true') fail('heygen_paid_usage_unapproved');
    const dir = await stateDirectory();
    return { jobs: approvedJobs(env, now()), dir };
  }
  async function call(method, suffix = '', body, key) {
    let response;
    try {
      response = await fetchImpl(API + suffix, {
        method, redirect: 'error', signal: AbortSignal.timeout(8000),
        headers: { Accept: 'application/json', 'x-api-key': env.HEYGEN_API_KEY,
          ...(body ? { 'Content-Type': 'application/json', 'Idempotency-Key': key } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!response.ok) { await response.body?.cancel(); fail('heygen_upstream_unavailable'); }
      const result = await boundedJson(response, 65536);
      if (result.error) fail('heygen_upstream_unavailable');
      return result.data;
    } catch { fail('heygen_upstream_unavailable'); }
  }
  async function record(file) {
    try { return JSON.parse(await readFile(file, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return null; fail('heygen_state_unavailable'); }
  }
  async function create(job, dir) {
    const file = path.join(dir, job.jobId + '.json');
    const existing = await record(file);
    if (existing) {
      if (existing.requestHash !== job.requestHash) fail('heygen_job_binding_conflict');
      return existing; // UNKNOWN is never silently resubmitted, even after the 24-hour upstream window.
    }
    const pending = { contract: 'CAPITAL_AI_HEYGEN_OWNER@1', jobId: job.jobId, sourceSha: job.sourceSha,
      requestHash: job.requestHash, estimatedCostUsd: job.estimatedCostUsd, costApprovalRef: job.costApprovalRef,
      rightsApprovalRef: job.rightsApprovalRef, brandApprovalRef: job.brandApprovalRef, personaConsentRef: job.personaConsentRef,
      attemptedAt: new Date(now()).toISOString(), status: 'UNKNOWN', videoId: null, videoUrl: null,
      draftOnly: true, publicPublishAllowed: false, assetHash: null, assetVerified: false };
    let handle;
    try { handle = await open(file, 'wx', 0o600); }
    catch (error) { if (error.code === 'EEXIST') fail('heygen_job_in_progress'); fail('heygen_state_unavailable'); }
    try { await handle.writeFile(JSON.stringify(pending)); await handle.sync(); } finally { await handle.close(); }
    const directory = await open(dir, 'r');
    try { await directory.sync(); } finally { await directory.close(); }
    const data = await call('POST', '', job.payload, 'capital-ai:' + job.requestHash);
    const result = { ...pending, ...normalizeVideo(data) };
    const temporary = file + '.result';
    await readFile(file); // Ledger must remain accessible before writing the accepted result.
    const output = await open(temporary, 'wx', 0o600);
    try { await output.writeFile(JSON.stringify(result)); await output.sync(); } finally { await output.close(); }
    await rename(temporary, file);
    const completedDirectory = await open(dir, 'r');
    try { await completedDirectory.sync(); } finally { await completedDirectory.close(); }
    return result;
  }
  async function handle(req, res, url, json) {
    const prefix = '/api/growth/heygen';
    if (url.pathname !== prefix && !url.pathname.startsWith(prefix + '/')) return false;
    res.setHeader('Cache-Control', 'no-store');
    if (!await auth?.authorizeIamRole?.(req, res, 'owner')) { json(res, 403, { error: 'owner_required' }); return true; }
    if (!limit()) { json(res, 429, { error: 'rate_limited' }); return true; }
    try {
      if (req.method === 'GET' && url.pathname === prefix + '/readiness') {
        let ready = false;
        try { await config(); ready = true; } catch {}
        json(res, 200, { provider: 'HEYGEN', apiVersion: 'v3', ownerOnly: true, configured: ready,
          liveVerified: false, draftOnly: true, publicPublishAllowed: false });
        return true;
      }
      if (req.method === 'POST' && url.pathname === prefix + '/videos') {
        if (!auth.sameOrigin(req)) { json(res, 403, { error: 'forbidden_origin' }); return true; }
        const body = await readJson(req, 1024);
        if (!body || Object.keys(body).length !== 1 || !validId(body.jobId)) fail('heygen_request_invalid');
        const { jobs, dir } = await config();
        const job = jobs.get(body.jobId);
        if (!job) fail('heygen_job_unknown');
        json(res, 202, await create(job, dir));
        return true;
      }
      const match = url.pathname.match(/^\/api\/growth\/heygen\/videos\/([A-Za-z0-9_-]{1,100})$/);
      if (req.method === 'GET' && match) {
        // Poll submitted jobs after the generation approval expires; no creation or budget consumption.
        if (env.HEYGEN_ENABLED !== 'true' || !text(env.HEYGEN_API_KEY, 4096) || /[\r\n]/.test(env.HEYGEN_API_KEY)) fail('heygen_disabled');
        const dir = await stateDirectory();
        const existing = await record(path.join(dir, match[1] + '.json'));
        if (!existing) fail('heygen_job_unknown');
        if (!existing.videoId) { json(res, 200, existing); return true; }
        const result = normalizeVideo(await call('GET', '/' + encodeURIComponent(existing.videoId)), existing.videoId);
        json(res, 200, { ...existing, ...result, observedAt: new Date(now()).toISOString() });
        return true;
      }
      json(res, 405, { error: 'method_not_allowed' });
    } catch (error) {
      const code = String(error.message);
      const allowed = /^heygen_[a-z_]+$/.test(code) || ['invalid_json', 'body_too_large', 'body_timeout'].includes(code);
      const status = code === 'heygen_upstream_unavailable' ? 502 : /conflict|in_progress/.test(code) ? 409 : /unknown/.test(code) ? 404 : /invalid|body_/.test(code) ? 400 : 503;
      json(res, status, { error: allowed ? code : 'heygen_unavailable' });
    }
    return true;
  }
  return { handle };
}
