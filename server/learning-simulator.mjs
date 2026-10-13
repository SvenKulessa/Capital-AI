import { randomUUID } from 'node:crypto';
import { boundedJson, readJson, secureUrl } from './http-security.mjs';

const IDS = ['equity', 'bonds', 'cash'];
const MAX_SCENARIOS = 10;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ownKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const validNumber = (value, min, max) => typeof value === 'number' &&
  Number.isFinite(value) && value >= min && value <= max;

export function validateSimulatorScenario(value) {
  if (!ownKeys(value, ['name', 'weights', 'vols', 'corrs'])) return null;
  const { name, weights, vols, corrs } = value;
  if (typeof name !== 'string' || name.trim().length < 1 ||
    name.trim().length > 80 || /[\x00-\x1f\x7f]/.test(name)) return null;
  if (!ownKeys(weights, IDS) || !ownKeys(vols, IDS) || !ownKeys(corrs, IDS)) return null;
  if (IDS.some(id => !validNumber(weights[id], 0, 1) || !validNumber(vols[id], 0, 2) ||
    !ownKeys(corrs[id], IDS))) return null;
  if (Math.abs(IDS.reduce((s, id) => s + weights[id], 0) - 1) > 1e-4) return null;
  for (const i of IDS) for (const j of IDS) {
    const r = corrs[i][j];
    if (!validNumber(r, -1, 1) || (i === j && Math.abs(r - 1) > 1e-10) ||
      Math.abs(r - corrs[j][i]) > 1e-10) return null;
  }
  const x = corrs.equity.bonds, y = corrs.equity.cash, z = corrs.bonds.cash;
  if (1 + 2*x*y*z - x*x - y*y - z*z < -1e-10) return null;
  return { name: name.trim(), weights, vols, corrs };
}

function serverConfig(env) {
  try {
    const url = secureUrl(env.SUPABASE_URL || env.VITE_SUPABASE_URL);
    const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (url.href !== url.origin + '/' || key.length < 32) return null;
    return { origin: url.origin, key };
  } catch { return null; }
}

async function rpc(fetchImpl, config, action, userId, payload = null, id = null) {
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json', apikey: config.key };
  if (config.key.startsWith('eyJ')) headers.Authorization = 'Bearer ' + config.key;
  const response = await fetchImpl(new URL('/rest/v1/rpc/capital_ai_learning_simulator_scenarios', config.origin), {
    method: 'POST', headers, body: JSON.stringify({
      _user_id: userId, _action: action, _scenario_id: id, _payload: payload,
    }), redirect: 'error', signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) throw new Error('SIMULATOR_STORAGE_UNAVAILABLE');
  return response.status === 204 ? null : boundedJson(response, 32768);
}

export function createLearningSimulator({ auth, env = process.env, fetchImpl = fetch } = {}) {
  const config = serverConfig(env);
  async function handle(req, res, url, json) {
    const endpoint = '/api/learning/simulator';
    if (url.pathname !== endpoint && !url.pathname.startsWith(endpoint + '/')) return false;
    res.setHeader('Cache-Control', 'no-store');
    const target = url.pathname.slice(endpoint.length);
    const isEntitlement = target === '/entitlement' && req.method === 'GET';
    const isCollection = target === '/scenarios';
    const itemMatch = /^\/scenarios\/([^/]+)$/.exec(target);
    if (!isEntitlement && !isCollection && !itemMatch) {
      json(res, 404, { error: 'not_found' }); return true;
    }
    const allowed = isEntitlement || (isCollection && ['GET', 'POST'].includes(req.method)) ||
      (itemMatch && req.method === 'DELETE');
    if (!allowed) { json(res, 405, { error: 'method_not_allowed' }); return true; }
    const user = await auth?.verify?.(req, res);
    if (!user?.userId) { json(res, 401, { error: 'authentication_required' }); return true; }
    const tier = await auth?.resolvePaidTier?.(req, res);
    const entitled = tier === 'pro' || tier === 'enterprise' ||
      await auth?.authorizeIamRole?.(req, res, 'owner') === true;
    if (isEntitlement) {
      json(res, 200, { entitled, tier: tier || 'free', simulatorPro: entitled });
      return true;
    }
    if (!entitled) { json(res, 403, { error: 'pro_or_enterprise_required' }); return true; }
    if (req.method !== 'GET' && !auth?.sameOrigin?.(req)) {
      json(res, 403, { error: 'forbidden_origin' }); return true;
    }
    if (!config) { json(res, 503, { error: 'simulator_storage_not_configured' }); return true; }
    if (itemMatch && !UUID.test(itemMatch[1])) {
      json(res, 400, { error: 'invalid_scenario_id' }); return true;
    }
    let body = null;
    if (req.method === 'POST') {
      try { body = validateSimulatorScenario(await readJson(req, 4096)); } catch { /* Invalid JSON */ }
      if (!body) { json(res, 400, { error: 'invalid_scenario' }); return true; }
      body.id = randomUUID();
    }
    try {
      const result = await rpc(fetchImpl, config,
        req.method === 'GET' ? 'GET' : req.method === 'POST' ? 'POST' : 'DELETE',
        user.userId, body, itemMatch?.[1] || null);
      if (result?.error === 'LIMIT_REACHED') {
        json(res, 409, { error: 'scenario_limit_reached', limit: MAX_SCENARIOS }); return true;
      }
      json(res, 200, req.method === 'GET'
        ? { scenarios: Array.isArray(result) ? result : [], limit: MAX_SCENARIOS }
        : { result });
    } catch {
      json(res, 503, { error: 'simulator_storage_unavailable' });
    }
    return true;
  }
  return { handle };
}
