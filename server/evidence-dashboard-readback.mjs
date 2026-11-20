import { safeGa4FailureReason } from './google-analytics-readback.mjs';
// CAPITAL_AI_EVIDENCE_DASHBOARD_READBACK@1
// Owner-only, server-side, read-only projections. Historical snapshot is a schema reference,
// never a fallback for missing live data. No browser credentials or provider URLs.
import { ACODEX_P1_V2_ARCHIVE } from './acodex-p1-v2-archive.mjs';
const PATH = '/api/profile/evidence-dashboard-readback';
const REPOSITORY = 'SvenKulessa/Capital-AI';
const SERVICE_ID = 'srv-dau1rp893c1s73cdhm1g';
const WORKSPACE_ID = 'tea-d90o4rj7uimc739i86ug';
const SHA = /^[a-f0-9]{40}$/;
const MAX_BYTES = 128 * 1024;
const CACHE_MS = 5 * 60 * 1000;
const ERROR_CACHE_MS = 30_000;
const TIMEOUT_MS = 7_000;
const EVENTS = new Set(['page_view', 'session_start', 'first_visit', 'view_item', 'user_engagement', 'generate_lead', 'purchase']);
const N = v => Number.isSafeInteger(v) && v >= 0 ? v : null;

async function readJson(fetchImpl, address, token, signal) {
  const url = new URL(address);
  if (url.protocol !== 'https:' || !['api.github.com', 'api.render.com'].includes(url.hostname)) throw Error('INVALID_PROVIDER_HOST');
  const headers = { Accept: 'application/json' };
  if (url.hostname === 'api.github.com') {
    headers.Accept = 'application/vnd.github+json';
    headers['X-GitHub-Api-Version'] = '2022-11-28';
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetchImpl(url, { method: 'GET', headers, redirect: 'error', cache: 'no-store', signal });
  if (!response?.ok) throw Error('PROVIDER_UNAVAILABLE');
  const declared = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BYTES) throw Error('RESPONSE_OVERSIZED');
  let raw = '';
  if (response.body?.getReader) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) throw Error('RESPONSE_OVERSIZED');
        raw += decoder.decode(value, { stream: true });
      }
      raw += decoder.decode();
    } finally { reader.releaseLock(); }
  } else {
    raw = await response.text();
    if (Buffer.byteLength(raw) > MAX_BYTES) throw Error('RESPONSE_OVERSIZED');
  }
  return JSON.parse(raw);
}

async function readGitHub(fetchImpl, env, signal, now) {
  const origin = `https://api.github.com/repos/${REPOSITORY}`;
  const token = typeof env.GITHUB_TOKEN === 'string' ? env.GITHUB_TOKEN.trim() : '';
  const commit = await readJson(fetchImpl, `${origin}/commits/main`, token, signal);
  if (!SHA.test(commit?.sha)) throw Error('INVALID_GITHUB_SHA');
  const prs = await readJson(fetchImpl, `${origin}/pulls?state=open&per_page=100`, token, signal);
  if (!Array.isArray(prs)) throw Error('INVALID_PR_COLLECTION');
  const valid = prs.every(pr => Number.isSafeInteger(pr?.number) && pr.number > 0 && pr?.state === 'open');
  if (!valid) throw Error('INVALID_PR_ENTRY');
  const prItems = prs.length < 100 ? prs.slice(0, 50).map(pr => ({
    number: pr.number,
    title: typeof pr.title === 'string' ? pr.title.slice(0, 160) : 'Unbenannter PR',
    draft: pr.draft === true,
    headSha: SHA.test(pr.head?.sha || '') ? pr.head.sha : null,
    updatedAt: Number.isFinite(Date.parse(pr.updated_at)) ? new Date(pr.updated_at).toISOString() : null,
  })) : [];
  let ci = { status: 'NOT_PROVEN', reason: 'CHECK_RUN_READ_UNAVAILABLE', runs: [] };
  try {
    const checks = await readJson(fetchImpl, origin + '/commits/' + commit.sha + '/check-runs?per_page=100', token, signal);
    if (Number.isSafeInteger(checks?.total_count) && checks.total_count <= 100 && Array.isArray(checks.check_runs)) {
      const matched = checks.check_runs.filter(row => row?.head_sha === commit.sha &&
        typeof row.name === 'string' && row.name.length < 160 &&
        ['completed','queued','in_progress','pending','waiting','requested'].includes(row.status));
      ci = {
        status: matched.length > 0 ? 'VERIFIED_PROVIDER_READ' : 'NOT_PROVEN',
        reason: matched.length > 0 ? null : 'NO_MATCHING_MAIN_CHECK_RUNS',
        scope: 'MAIN_COMMIT_CHECK_RUNS_NOT_PR_MERGE_AUTHORIZATION',
        runs: matched.slice(0, 30).map(row => ({
          name: row.name,
          status: row.status,
          conclusion: row.status === 'completed' && typeof row.conclusion === 'string' ? row.conclusion.slice(0, 40) : null,
          requiredByRootPolicy: row.name === 'Docker Security Gate' || row.name === 'Domain Governance',
        })),
      };
    } else ci = { status: 'NOT_PROVEN', reason: 'CHECK_RUNS_TRUNCATED_OR_INVALID', runs: [] };
  } catch { /* A failed check-run read must not erase independently verified GitHub metadata. */ }
  return {
    status: 'VERIFIED_PROVIDER_READ', observedAt: new Date(now()).toISOString(),
    repository: REPOSITORY, mainSha: commit.sha,
    openPrCount: prs.length < 100 ? prs.length : null,
    openPrCountStatus: prs.length < 100 ? 'VERIFIED' : 'NOT_PROVEN_TRUNCATED',
    pullRequests: prItems,
    pullRequestsStatus: prs.length >= 100 ? 'NOT_PROVEN_TRUNCATED' : prs.length > 50 ? 'PARTIAL_FIRST_50' : 'VERIFIED',
    ci,
    evidence: 'https://github.com/' + REPOSITORY + '/commit/' + commit.sha,
  };
}

async function readRender(fetchImpl, env, signal, now) {
  const token = typeof env.RENDER_API_KEY === 'string' ? env.RENDER_API_KEY.trim() : '';
  if (!token) return { status: 'NOT_PROVEN', reason: 'RENDER_CREDENTIAL_NOT_CONFIGURED' };
  const origin = `https://api.render.com/v1/services/${SERVICE_ID}`;
  const serviceRaw = await readJson(fetchImpl, origin, token, signal);
  const service = serviceRaw?.service || serviceRaw;
  if (service?.id !== SERVICE_ID || service?.ownerId !== WORKSPACE_ID) throw Error('RENDER_IDENTITY_MISMATCH');
  const deploys = await readJson(fetchImpl, origin + '/deploys?limit=5', token, signal);
  if (!Array.isArray(deploys) || deploys.length === 0 || deploys.length > 5) throw Error('RENDER_DEPLOY_MISSING');
  const deployments = deploys.map(entry => {
    const deploy = entry?.deploy || entry;
    const sourceSha = deploy?.commit?.id;
    if (!SHA.test(sourceSha) || !/^[a-z_]{3,40}$/.test(deploy?.status || '')) throw Error('INVALID_RENDER_DEPLOY');
    return {
      deployId: typeof deploy.id === 'string' ? deploy.id.slice(0, 100) : null,
      deployStatus: deploy.status, sourceCommitSha: sourceSha,
      finishedAt: Number.isFinite(Date.parse(deploy.finishedAt)) ? new Date(deploy.finishedAt).toISOString() : null,
    };
  });
  const first = deployments[0];
  return {
    status: 'VERIFIED_PROVIDER_READ', observedAt: new Date(now()).toISOString(),
    serviceId: SERVICE_ID, workspaceId: WORKSPACE_ID,
    deployId: first.deployId, deployStatus: first.deployStatus, sourceCommitSha: first.sourceCommitSha,
    deployments,
    deploymentIdentityStatus: 'NOT_PROVEN_INDEPENDENT_HEALTH',
  };
}

async function readGa4(ga4Readback, now) {
  const source = await ga4Readback.load();
  if (source?.status !== 'PROVIDER_READ_VERIFIED' || !/^properties\/[1-9]\d{0,19}$/.test(source?.property?.resourceName || '')) throw Error('GA4_NOT_VERIFIED');
  if (!Array.isArray(source?.sevenDay?.events)) throw Error('INVALID_GA4_EVENTS');
  const filtered = source.sevenDay.events.filter(row => EVENTS.has(row?.eventName));
  if (filtered.some(row => N(row.eventCount) === null)) throw Error('INVALID_GA4_VALUE');
  return {
    status: 'VERIFIED_PROVIDER_READ', observedAt: new Date(now()).toISOString(),
    property: source.property.resourceName,
    period: 'LAST_7_DAYS_INCLUDING_TODAY',
    events: filtered.map(({ eventName, eventCount }) => ({ eventName, eventCount })),
    eventCoverage: 'ALLOWLIST_ONLY_NOT_ALL_EVENTS',
    revenue: null, revenueStatus: 'NOT_PROVEN_NOT_QUERIED',
    historical30DayValues: null,
  };
}

export function createEvidenceDashboardReadback({ env = process.env, auth, ga4Readback, fetchImpl = fetch, now = Date.now } = {}) {
  if (!ga4Readback?.authorized || !ga4Readback?.load) throw Error('GA4_READBACK_BOUNDARY_REQUIRED');
  let cached = null;
  let inflight = null;
  async function getSnapshot() {
    const ts = now();
    if (cached && ts < cached.until) return cached.value;
    if (inflight) return inflight;
    const attempt = async (producer, classify = () => 'PROVIDER_READ_FAILED') => {
      try { return await producer(); }
      catch (error) { return { status: 'NOT_PROVEN', reason: classify(error) }; }
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    timeout.unref?.();
    inflight = Promise.all([
      attempt(() => readGitHub(fetchImpl, env, controller.signal, now)),
      attempt(() => readRender(fetchImpl, env, controller.signal, now)),
      attempt(() => readGa4(ga4Readback, now), safeGa4FailureReason),
    ]).then(([github, render, ga4]) => {
      const value = Object.freeze({
        schema: 'CAPITAL_AI_EVIDENCE_DASHBOARD_READBACK@1',
        readOnly: true, private: true, syntheticDataUsed: false,
        generatedAt: new Date(ts).toISOString(),
        baseline: { schema: 'CAPITAL_AI_EVIDENCE_SNAPSHOT_V1', date: '2026-11-19', status: 'HISTORICAL_REFERENCE_ONLY', valuesImported: false },
        github, render, ga4,
        // Historical device evidence only. No live Android/Drive fetch or current health claim.
        acodex: ACODEX_P1_V2_ARCHIVE,
        comparison: {
          mainVsDeploy: github.status === 'VERIFIED_PROVIDER_READ' && render.status === 'VERIFIED_PROVIDER_READ'
            ? (github.mainSha === render.sourceCommitSha ? 'MATCH_PROVIDER_CLAIMS_ONLY' : 'DRIFT_PROVIDER_CLAIMS')
            : 'NOT_PROVEN',
          runtimeBuildIdentity: 'NOT_PROVEN_INDEPENDENT_READBACK',
        },
      });
      cached = { until: ts + (github.status === 'VERIFIED_PROVIDER_READ' && render.status === 'VERIFIED_PROVIDER_READ' && ga4.status === 'VERIFIED_PROVIDER_READ' ? CACHE_MS : ERROR_CACHE_MS), value };
      return value;
    }).finally(() => { clearTimeout(timeout); inflight = null; });
    return inflight;
  }
  async function handle(req, res, url, json) {
    if (url.pathname !== PATH) return false;
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Vary', 'Cookie');
    if (!await ga4Readback.authorized(req, res)) { json(res, 404, { error: 'not_found' }); return true; }
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); json(res, 405, { error: 'method_not_allowed' }); return true; }
    if (url.search) { json(res, 400, { error: 'unexpected_query' }); return true; }
    json(res, 200, await getSnapshot());
    return true;
  }
  return Object.freeze({ handle });
}
