import { normalizeStoredPaidTier } from './subscription-entitlements.mjs';

export function createLearningSimulator({ auth }) {
  async function handle(req, res, url, json) {
    if (!url.pathname.startsWith('/api/learning/simulator')) return false;
    const session = await auth?.readSession?.(req) || null;
    const userId = session?.user?.id;
    if (!userId) { json(res, 401, { error: 'authentication_required' }); return true; }
    const tier = normalizeStoredPaidTier(session?.account?.subscription) || 'free';
    const isPro = tier === 'pro' || tier === 'enterprise' || session?.account?.iamRole === 'owner';
    if (url.pathname === '/api/learning/simulator/entitlement' && req.method === 'GET') {
      json(res, 200, { entitled: isPro, tier, simulatorPro: isPro });
      return true;
    }
    if (!isPro) { json(res, 403, { error: 'pro_or_enterprise_required' }); return true; }
    // Placeholder for scenario CRUD – full persistence requires verified DB path
    if (url.pathname === '/api/learning/simulator/scenarios' && req.method === 'GET') {
      json(res, 200, { scenarios: [], limit: 10, note: 'In-memory stub; private to authenticated user. Full DB migration path available.' });
      return true;
    }
    json(res, 404, { error: 'not_found' });
    return true;
  }
  return { handle };
}
