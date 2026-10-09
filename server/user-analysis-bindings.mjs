import { secureUrl, boundedJson } from './http-security.mjs';

const MAX_BODY_BYTES = 4096;
export const ANALYSIS_MODULES = Object.freeze([
  'enterprise_scorer','buffett_value_check','market_screener',
  'market_sentiment','sector_rotation','whale_radar','ai_newsfeed',
]);
const PROVIDERS = new Set(['kraken','binance','massive']);
const MODELS = new Set(['openai','anthropic','google','ollama','custom']);
const MODULES = new Set(ANALYSIS_MODULES);

function serviceRoleKey(value) {
  if (value.startsWith('sb_secret_') && value.length >= 34) return true;
  if (!value.startsWith('eyJ')) return false;
  try {
    const pieces = value.split('.');
    if (pieces.length !== 3) return false;
    return JSON.parse(Buffer.from(pieces[1], 'base64url').toString('utf8'))?.role === 'service_role';
  } catch { return false; }
}

function adminConfig(env) {
  try {
    const url = secureUrl(env.SUPABASE_URL || env.VITE_SUPABASE_URL);
    const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (url.href !== url.origin + '/' || !serviceRoleKey(key)) return null;
    return { origin: url.origin, key };
  } catch { return null; }
}

async function rpc(fetchImpl, config, method, args) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    apikey: config.key,
  };
  if (config.key.startsWith('eyJ')) headers.Authorization = 'Bearer ' + config.key;
  const response = await fetchImpl(new URL('/rest/v1/rpc/' + method, config.origin), {
    method: 'POST',
    headers,
    body: JSON.stringify(args),
    redirect: 'error',
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) {
    const error = new Error('ANALYSIS_BINDING_RPC_FAILED');
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  return boundedJson(response);
}

async function bodyJson(req) {
  let count = 0;
  const chunks = [];
  for await (const chunk of req) {
    count += chunk.length;
    if (count > MAX_BODY_BYTES) throw new Error('BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch { throw new Error('BAD_JSON'); }
}

export function validateAnalysisBinding(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const allowed = new Set(['moduleId','provider','modelProvider','modelId','bindingEnabled']);
  if (Object.keys(body).some(key => !allowed.has(key))) return null;
  const moduleId = body.moduleId;
  const provider = body.provider ?? null;
  const modelProvider = body.modelProvider ?? null;
  const modelId = body.modelId ?? null;
  const bindingEnabled = body.bindingEnabled ?? true;
  if (!MODULES.has(moduleId)) return null;
  if (provider !== null && !PROVIDERS.has(provider)) return null;
  if (modelProvider !== null && !MODELS.has(modelProvider)) return null;
  if ((modelProvider === null) !== (modelId === null)) return null;
  if (modelId !== null && (typeof modelId !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,100}$/.test(modelId))) return null;
  if (provider === null && modelProvider === null) return null;
  if (typeof bindingEnabled !== 'boolean') return null;
  return { _module_id: moduleId, _provider: provider,
    _model_provider: modelProvider, _model_id: modelId,
    _binding_enabled: bindingEnabled };
}

export function createUserAnalysisBindings({ env = process.env, fetchImpl = fetch, auth } = {}) {
  const config = adminConfig(env);

  async function handle(req, res, url, json) {
    const endpoint = '/api/profile/analysis-bindings';
    if (url.pathname !== endpoint && !url.pathname.startsWith(endpoint + '/')) return false;
    res.setHeader('Cache-Control', 'no-store');
    if (!config) {
      json(res, 503, { error: 'analysis_workspace_not_configured' });
      return true;
    }
    const verified = await auth?.verify?.(req, res);
    if (!verified?.userId) {
      json(res, 401, { error: 'authentication_required' });
      return true;
    }
    if (req.method !== 'GET' && !auth?.sameOrigin?.(req)) {
      json(res, 403, { error: 'forbidden_origin' });
      return true;
    }
    if (url.pathname === endpoint && req.method === 'GET') {
      try {
        const bindings = await rpc(fetchImpl, config, 'capital_ai_list_user_analysis_bindings',
          { _user_id: verified.userId });
        json(res, 200, { bindings: Array.isArray(bindings) ? bindings : [] });
      } catch {
        json(res, 503, { error: 'analysis_workspace_unavailable' });
      }
      return true;
    }
    if (url.pathname === endpoint && req.method === 'PUT') {
      let input;
      try { input = await bodyJson(req); }
      catch (error) {
        json(res, error.message === 'BODY_TOO_LARGE' ? 413 : 400, { error: 'invalid_request' });
        return true;
      }
      const validated = validateAnalysisBinding(input);
      if (!validated) {
        json(res, 422, { error: 'invalid_analysis_binding' }); return true;
      }
      try {
        const binding = await rpc(fetchImpl, config, 'capital_ai_upsert_user_analysis_binding',
          { _user_id: verified.userId, ...validated });
        json(res, 200, { binding, executionEnabled: false });
      } catch {
        json(res, 422, { error: 'binding_not_saved_verify_private_provider_and_database' });
      }
      return true;
    }
    if (req.method === 'DELETE' && url.pathname.startsWith(endpoint + '/')) {
      const moduleId = url.pathname.slice(endpoint.length + 1);
      if (!MODULES.has(moduleId)) {
        json(res, 404, { error: 'not_found' }); return true;
      }
      try {
        await rpc(fetchImpl, config, 'capital_ai_delete_user_analysis_binding',
          { _user_id: verified.userId, _module_id: moduleId });
        json(res, 200, { deleted: true, moduleId });
      } catch {
        json(res, 503, { error: 'analysis_binding_delete_failed' });
      }
      return true;
    }
    res.setHeader('Allow', url.pathname === endpoint ? 'GET, PUT' : 'DELETE');
    json(res, 405, { error: 'method_not_allowed' });
    return true;
  }
  return { handle, configured: Boolean(config) };
}
