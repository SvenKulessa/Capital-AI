import { boundedJson, secureUrl } from './http-security.mjs';

const DENIALS = new Set(['QUERY_REPLAY_REJECTED', 'PROVIDER_QUERY_RATE_LIMITED', 'PROVIDER_QUERY_COST_THROTTLED', 'INVALID_QUERY_PROOF']);

function unavailable() {
  const error = new Error('PROVIDER_STATE_UNAVAILABLE');
  error.code = error.message;
  return error;
}

export function createSupabaseProviderState({ env = process.env, fetchImpl = fetch } = {}) {
  let config;
  try {
    const url = secureUrl(env.SUPABASE_URL || env.VITE_SUPABASE_URL);
    const key = String(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '');
    let admin = key.startsWith('sb_secret_') && key.length > 10;
    if (key.startsWith('eyJ')) {
      const parts = key.split('.');
      admin = parts.length === 3 && JSON.parse(Buffer.from(parts[1], 'base64url')).role === 'service_role';
    }
    if (admin && url.href === url.origin + '/') config = { url: url.origin, key };
  } catch { /* Fail closed when configuration is invalid. */ }

  async function claimProviderQuery({ envelope, rateLimit, scopes }) {
    if (!config) throw unavailable();
    let result;
    try {
      const headers = { 'Content-Type': 'application/json', Accept: 'application/json', apikey: config.key };
      if (config.key.startsWith('eyJ')) headers.Authorization = `Bearer ${config.key}`;
      const response = await fetchImpl(`${config.url}/rest/v1/rpc/capital_ai_claim_provider_query`, {
        method: 'POST', headers, redirect: 'error', signal: AbortSignal.timeout(2500),
        body: JSON.stringify({ _user_id: envelope.userRef, _request_id: envelope.requestId,
          _expires_at_ms: envelope.expiresAt, _rate_limit: rateLimit, _cost_scopes: scopes }),
      });
      result = await boundedJson(response, 4096);
    } catch { throw unavailable(); }
    if (result?.allowed === true) return true;
    if (result?.allowed !== false || !DENIALS.has(result.code)) throw unavailable();
    const error = new Error(result.code);
    error.code = result.code;
    error.retryAfterSeconds = Number.isSafeInteger(result.retryAfterSeconds) && result.retryAfterSeconds > 0
      ? Math.min(result.retryAfterSeconds, 3600) : 60;
    throw error;
  }

  return { claimProviderQuery };
}
