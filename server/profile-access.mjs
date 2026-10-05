import { boundedJson, secureUrl } from './http-security.mjs';

function adminConfig(env) {
  try {
    const url = secureUrl(env.SUPABASE_URL || env.VITE_SUPABASE_URL);
    const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (url.href !== url.origin + '/' || key.length < 32) return null;
    return { url: url.origin, key };
  } catch {
    return null;
  }
}

function adminHeaders(key) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    apikey: key,
  };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  return headers;
}

function normalizedTier(value) {
  const candidate = String(value || '').trim().toLowerCase();
  if (candidate === 'enterprise') return 'Enterprise';
  if (candidate === 'pro') return 'Pro';
  if (candidate === 'starter') return 'Starter';
  return 'Free';
}

function activeSubscription(status) {
  return status === 'active' || status === 'trialing';
}

async function readOwnRow(fetchImpl, credentials, table, filter, select) {
  const target = new URL(`/rest/v1/${table}`, credentials.url);
  target.searchParams.set('select', select);
  target.searchParams.set(filter.column, `eq.${filter.value}`);
  target.searchParams.set('limit', '1');
  const response = await fetchImpl(target, {
    headers: {
      Accept: 'application/json',
      apikey: credentials.publishableKey,
      Authorization: `Bearer ${credentials.accessToken}`,
    },
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
  });
  const payload = await boundedJson(response);
  if (!response.ok) throw new Error(`SUPABASE_${table.toUpperCase()}_${response.status}`);
  return Array.isArray(payload) ? payload[0] || null : null;
}

async function readVocabularyAccess(fetchImpl, admin, userId) {
  if (!admin) return null;
  try {
    const response = await fetchImpl(new URL('/rest/v1/rpc/capital_ai_get_vocabulary_access', admin.url), {
      method: 'POST',
      headers: adminHeaders(admin.key),
      body: JSON.stringify({ _user_id: userId }),
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const payload = await boundedJson(response);
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
}

export function createProfileAccess({ env = process.env, fetchImpl = fetch, auth } = {}) {
  const admin = adminConfig(env);

  async function handle(req, res, url, json) {
    if (url.pathname !== '/api/profile/access') return false;
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      json(res, 405, { error: 'method_not_allowed' });
      return true;
    }

    const credentials = await auth?.credentials?.(req, res);
    if (!credentials?.userId || !credentials?.accessToken) {
      json(res, 401, { error: 'authentication_required' });
      return true;
    }

    try {
      const [profile, subscription, vocabulary] = await Promise.all([
        readOwnRow(fetchImpl, credentials, 'profiles', { column: 'id', value: credentials.userId }, 'iam_role,role'),
        readOwnRow(fetchImpl, credentials, 'subscriptions', { column: 'user_id', value: credentials.userId }, 'tier,status,current_period_end'),
        readVocabularyAccess(fetchImpl, admin, credentials.userId),
      ]);

      const owner = profile?.iam_role === 'owner';
      const subscriptionIsActive = activeSubscription(subscription?.status);
      const tier = owner
        ? 'Enterprise'
        : subscriptionIsActive
          ? normalizedTier(subscription?.tier)
          : normalizedTier(profile?.role);

      const products = [];
      const vocabularyPurchased = Boolean(vocabulary?.quantProEntitled);
      const vocabularyIncluded = owner || tier === 'Enterprise' || tier === 'Pro';
      if (vocabularyPurchased || vocabularyIncluded) {
        products.push({
          id: 'market-vocabulary',
          label: 'Vocabulary',
          entitled: true,
          source: owner ? 'owner' : vocabularyPurchased ? 'purchase' : 'tier',
        });
      }

      json(res, 200, {
        authenticated: true,
        authority: 'SUPABASE_SUBJECT',
        owner,
        allAccess: owner,
        iamRole: profile?.iam_role || 'user',
        tier,
        subscription: {
          status: subscriptionIsActive ? subscription.status : 'inactive',
          currentPeriodEnd: subscriptionIsActive ? subscription.current_period_end || null : null,
        },
        products,
      });
    } catch {
      json(res, 503, { error: 'profile_access_unavailable' });
    }
    return true;
  }

  return { handle };
}
