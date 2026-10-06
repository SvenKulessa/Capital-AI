import { randomUUID } from 'node:crypto';
import { boundedJson, secureUrl } from './http-security.mjs';

function serviceRoleJwt(key) {
  if (!key.startsWith('eyJ')) return false;
  const parts = key.split('.');
  if (parts.length !== 3) return false;
  try {
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return claims?.role === 'service_role';
  } catch {
    return false;
  }
}

function adminConfig(env) {
  try {
    const url = secureUrl(env.SUPABASE_URL || env.VITE_SUPABASE_URL);
    const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supported = key.startsWith('sb_secret_') || serviceRoleJwt(key);
    if (url.href !== url.origin + '/' || !supported) return null;
    return { url: url.origin, key };
  } catch {
    return null;
  }
}

function rpcHeaders(key) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    apikey: key,
  };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  return headers;
}

async function rpc(fetchImpl, config, name, body) {
  const response = await fetchImpl(new URL(`/rest/v1/rpc/${name}`, config.url), {
    method: 'POST',
    headers: rpcHeaders(config.key),
    body: JSON.stringify(body),
    redirect: 'error',
    signal: AbortSignal.timeout(7000),
  });
  let payload = null;
  if (response.status !== 204) {
    try { payload = await boundedJson(response, 256 * 1024); } catch { payload = null; }
  }
  if (!response.ok) {
    const error = new Error('BENCHMARK_STORE_RPC_FAILED');
    error.status = response.status;
    throw error;
  }
  return payload;
}

export function createBenchmarkStore({
  env = process.env,
  fetchImpl = fetch,
  randomUUIDImpl = randomUUID,
} = {}) {
  const config = adminConfig(env);
  if (!config) return null;

  return Object.freeze({
    async create(input) {
      return rpc(fetchImpl, config, 'capital_ai_create_benchmark_run', {
        _run_id: randomUUIDImpl(),
        _user_id: input.userId,
        _tier: input.tier,
        _profile_id: input.profileId,
        _repository: input.repository,
        _commit_sha: input.commitSha,
      });
    },

    async getById(userId, id) {
      return rpc(fetchImpl, config, 'capital_ai_get_benchmark_run', {
        _user_id: userId,
        _run_id: id,
      });
    },

    async list(userId, limit) {
      const payload = await rpc(fetchImpl, config, 'capital_ai_list_benchmark_runs', {
        _user_id: userId,
        _limit: limit,
      });
      return Array.isArray(payload) ? payload : [];
    },

    async recordUsage(input) {
      return rpc(fetchImpl, config, 'capital_ai_record_benchmark_usage', {
        _run_id: input.runId,
        _status: input.status,
        _wall_time_ms: input.resources.wallTimeMs,
        _cpu_time_ms: input.resources.cpuTimeMs,
        _peak_memory_mib: input.resources.peakMemoryMiB,
        _disk_bytes_written: input.resources.diskBytesWritten,
        _network_bytes: input.resources.networkBytes,
        _compute_eur: input.cost?.computeEur ?? null,
        _storage_eur: input.cost?.storageEur ?? null,
        _network_eur: input.cost?.networkEur ?? null,
        _total_eur: input.cost?.totalEur ?? null,
        _pricing_evidence_refs: input.cost?.pricingEvidenceRefs ?? [],
        _credits_calibrated: input.credits?.calibrated === true,
        _units_charged: input.credits?.calibrated === true ? (input.credits.unitsCharged ?? 0) : null,
        _evidence_id: input.evidenceId ?? null,
      });
    },
  });
}
