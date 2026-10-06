import { benchmarkEntitlementForTier } from '../packages/benchmark-core/index.mjs';

const MAX_BODY_BYTES = 8 * 1024;
const RUN_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REPOSITORY = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
const COMMIT_SHA = /^[0-9a-f]{40}$/i;
const EVIDENCE_ID = /^[A-Za-z0-9._:/-]{1,256}$/;
const STANDARD_PROFILE = 'CAPITAL_AI_EVENT_BACKBONE@1';

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

function normalizeCreateRequest(body) {
  const profileId = typeof body?.profileId === 'string' ? body.profileId.trim() : STANDARD_PROFILE;
  const repository = typeof body?.repository === 'string' ? body.repository.trim() : '';
  const commitSha = typeof body?.commitSha === 'string' ? body.commitSha.trim().toLowerCase() : '';
  if (profileId !== STANDARD_PROFILE) return null;
  if (!REPOSITORY.test(repository) || !COMMIT_SHA.test(commitSha)) return null;
  return { profileId, repository, commitSha };
}

function publicRun(run) {
  if (!run || typeof run !== 'object') return null;
  return {
    id: run.id,
    profileId: run.profileId,
    repository: run.repository,
    commitSha: run.commitSha,
    status: run.status,
    createdAt: run.createdAt,
    completedAt: run.completedAt ?? null,
    evidenceId: run.evidenceId ?? null,
    usage: run.usage ?? null,
    productionEligible: false,
    decisionEligible: false,
  };
}

export function createBenchmarkRuns({ env = process.env, auth, store } = {}) {
  const enabled = env.BENCHMARK_RUN_API_ENABLED === 'true';

  async function requirePaidUser(req, res, json) {
    const user = await auth?.verify?.(req, res);
    if (!user?.userId) {
      json(res, 401, { error: 'authentication_required' });
      return null;
    }
    const tier = await auth?.resolvePaidTier?.(req, res);
    if (!tier) {
      json(res, 403, { error: 'paid_benchmark_entitlement_required' });
      return null;
    }
    let entitlement;
    try {
      entitlement = benchmarkEntitlementForTier(tier);
    } catch {
      json(res, 403, { error: 'paid_benchmark_entitlement_required' });
      return null;
    }
    return { user, tier, entitlement };
  }

  async function handle(req, res, url, json) {
    if (!url.pathname.startsWith('/api/benchmark/')) return false;

    if (url.pathname === '/api/benchmark/readiness') {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      json(res, 200, {
        schema: 'CAPITAL_AI_BENCHMARK_API_READINESS@1',
        enabled: Boolean(enabled && store),
        profileId: STANDARD_PROFILE,
        persistenceBound: Boolean(store),
        executionBound: false,
        productionEligible: false,
        decisionEligible: false,
      });
      return true;
    }

    if (!enabled || !store) {
      json(res, 503, { error: 'benchmark_run_api_not_enabled' });
      return true;
    }

    const context = await requirePaidUser(req, res, json);
    if (!context) return true;

    if (url.pathname === '/api/benchmark/runs') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      if (!auth.sameOrigin(req)) {
        json(res, 403, { error: 'forbidden_origin' });
        return true;
      }
      if (!context.entitlement.capabilities.standardProfiles) {
        json(res, 403, { error: 'benchmark_profile_not_entitled' });
        return true;
      }

      let request;
      try {
        request = normalizeCreateRequest(await readJson(req));
      } catch (error) {
        json(res, error.message === 'REQUEST_TOO_LARGE' ? 413 : 400, { error: 'invalid_request' });
        return true;
      }
      if (!request) {
        json(res, 400, { error: 'invalid_benchmark_request' });
        return true;
      }

      try {
        const run = await store.create({
          userId: context.user.userId,
          tier: context.tier,
          ...request,
          status: 'QUEUED',
        });
        json(res, 202, { run: publicRun(run) });
      } catch {
        json(res, 503, { error: 'benchmark_store_unavailable' });
      }
      return true;
    }

    if (url.pathname === '/api/benchmark/history') {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      if (!context.entitlement.capabilities.history) {
        json(res, 403, { error: 'benchmark_history_not_entitled' });
        return true;
      }
      const requested = Number.parseInt(url.searchParams.get('limit') || '20', 10);
      const limit = Number.isInteger(requested) ? Math.max(1, Math.min(requested, 50)) : 20;
      try {
        const rows = await store.list(context.user.userId, limit);
        json(res, 200, { runs: Array.isArray(rows) ? rows.map(publicRun).filter(Boolean) : [] });
      } catch {
        json(res, 503, { error: 'benchmark_store_unavailable' });
      }
      return true;
    }

    const evidenceMatch = url.pathname.match(/^\/api\/benchmark\/runs\/([^/]+)\/evidence$/);
    if (evidenceMatch) {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      if (!context.entitlement.capabilities.evidenceExport) {
        json(res, 403, { error: 'benchmark_evidence_export_not_entitled' });
        return true;
      }
      const id = String(evidenceMatch[1] || '');
      if (!RUN_ID.test(id)) {
        json(res, 400, { error: 'invalid_benchmark_run_id' });
        return true;
      }
      try {
        const run = await store.getById(context.user.userId, id);
        if (!run) {
          json(res, 404, { error: 'benchmark_run_not_found' });
          return true;
        }
        const evidenceId = typeof run.evidenceId === 'string' ? run.evidenceId.trim() : '';
        if (!EVIDENCE_ID.test(evidenceId)) {
          json(res, 409, { error: 'benchmark_evidence_not_ready' });
          return true;
        }
        json(res, 200, {
          schemaVersion: 'CAPITAL_AI_BENCHMARK_EVIDENCE_EXPORT@1',
          benchmarkEvidenceSchema: 'CAPITAL_AI_BENCHMARK_EVIDENCE@1',
          evidenceId,
          run: publicRun(run),
          evidencePayloadIncluded: false,
          benchmarkEvidenceOnly: true,
          productionEligible: false,
          decisionEligible: false,
          reason: 'BENCHMARK_EVIDENCE_ONLY',
        });
      } catch {
        json(res, 503, { error: 'benchmark_store_unavailable' });
      }
      return true;
    }

    const match = url.pathname.match(/^\/api\/benchmark\/runs\/([^/]+)$/);
    if (match) {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      const id = String(match[1] || '');
      if (!RUN_ID.test(id)) {
        json(res, 400, { error: 'invalid_benchmark_run_id' });
        return true;
      }
      try {
        const run = await store.getById(context.user.userId, id);
        if (!run) {
          json(res, 404, { error: 'benchmark_run_not_found' });
          return true;
        }
        json(res, 200, { run: publicRun(run) });
      } catch {
        json(res, 503, { error: 'benchmark_store_unavailable' });
      }
      return true;
    }

    json(res, 404, { error: 'not_found' });
    return true;
  }

  return { handle };
}
