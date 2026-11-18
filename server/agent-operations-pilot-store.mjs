import { boundedJson, secureUrl } from './http-security.mjs';

// Same server-side Supabase credential conventions as benchmark-store.mjs.
// The secret is never exposed to the browser, receipts, or error diagnostics.
function serviceRoleJwt(key) {
  if (!key.startsWith('eyJ')) return false;
  const parts = key.split('.');
  if (parts.length !== 3) return false;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))?.role === 'service_role';
  } catch {
    return false;
  }
}

function configFromEnv(env) {
  try {
    const url = secureUrl(env.SUPABASE_URL || env.VITE_SUPABASE_URL);
    const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (url.href !== url.origin + '/' || !(key.startsWith('sb_secret_') || serviceRoleJwt(key))) return null;
    return { origin: url.origin, key };
  } catch {
    return null;
  }
}

async function rpc(fetchImpl, config, name, payload) {
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json', apikey: config.key };
  if (config.key.startsWith('eyJ')) headers.Authorization = 'Bearer ' + config.key;
  const response = await fetchImpl(new URL('/rest/v1/rpc/' + name, config.origin), {
    method: 'POST', headers, body: JSON.stringify(payload),
    redirect: 'error', signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) throw new Error('PILOT_LEDGER_UNAVAILABLE');
  try {
    return await boundedJson(response, 48 * 1024);
  } catch {
    throw new Error('PILOT_LEDGER_UNAVAILABLE');
  }
}

export function createAgentOperationsPilotStore({ env = process.env, fetchImpl = fetch } = {}) {
  const config = configFromEnv(env);
  if (!config) return null;
  return Object.freeze({
    async create(input) {
      return rpc(fetchImpl, config, 'capital_ai_create_agent_pilot_run', {
        _run_id: input.id, _user_id: input.userId,
        _tier: input.tier, _workflow_id: input.workflowId,
        _idempotency_key: input.idempotencyKey,
        _request_hash: input.requestHash, _receipt: input.receipt,
        _receipt_hash: input.receipt.receiptSha256,
      });
    },
    async getById(userId, id) {
      return rpc(fetchImpl, config, 'capital_ai_get_agent_pilot_run', {
        _user_id: userId, _run_id: id,
      });
    },
  });
}
