import { boundedJson, secureUrl } from './http-security.mjs';

const DEFAULT_VOCABULARY_PRICE_ID = 'price_1UMiuIPKr4joNbEclpn8AwFW';
const DEFAULT_VOCABULARY_PRODUCT_ID = 'prod_VNTsrtlf2ZL8ja';
const SKU = 'market-vocabulary';

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
    try {
      payload = await boundedJson(response);
    } catch {
      payload = null;
    }
  }
  if (!response.ok) throw new Error(`SUPABASE_RPC_${response.status}`);
  return payload;
}

function stripeId(value, prefix) {
  return typeof value === 'string' && value.startsWith(prefix) && value.length <= 255 ? value : '';
}

export function createVocabularyCheckout({ env = process.env, fetchImpl = fetch, auth } = {}) {
  const secret = env.STRIPE_SECRET_KEY || '';
  const supabase = adminConfig(env);
  const priceId = env.STRIPE_VOCABULARY_PRICE_ID || DEFAULT_VOCABULARY_PRICE_ID;
  const productId = env.STRIPE_VOCABULARY_PRODUCT_ID || DEFAULT_VOCABULARY_PRODUCT_ID;
  const baseUrl = (env.PUBLIC_BASE_URL || 'https://capital-ai.online').replace(/\/$/, '');

  async function stripe(path, body) {
    const response = await fetchImpl(`https://api.stripe.com/v1${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${secret}`,
        ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      },
      body,
      redirect: 'error',
      signal: AbortSignal.timeout(7000),
    });
    const payload = await boundedJson(response);
    if (!response.ok) {
      const error = new Error('stripe_rejected');
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  async function requireUser(req, res, json) {
    const user = await auth?.verify?.(req, res);
    if (!user?.userId) {
      json(res, 401, { error: 'authentication_required' });
      return null;
    }
    return user;
  }

  async function access(userId) {
    if (!supabase) throw new Error('VOCABULARY_ACCESS_NOT_CONFIGURED');
    return rpc(fetchImpl, supabase, 'capital_ai_get_vocabulary_access', { _user_id: userId });
  }

  async function validateAndGrant(userId, sessionId) {
    if (!secret || !supabase || !sessionId.startsWith('cs_')) return null;
    const session = await stripe(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
    const valid =
      session.payment_status === 'paid' &&
      session.metadata?.sku === SKU &&
      session.client_reference_id === userId &&
      session.metadata?.user_id === userId &&
      session.currency === 'eur' &&
      Number(session.amount_total) === 1900;

    if (!valid) return null;

    await rpc(fetchImpl, supabase, 'capital_ai_grant_vocabulary_entitlement', {
      _user_id: userId,
      _stripe_checkout_session_id: session.id,
      _stripe_customer_id: stripeId(session.customer, 'cus_') || null,
      _stripe_payment_intent_id: stripeId(session.payment_intent, 'pi_') || null,
    });
    return session.id;
  }

  return {
    async handle(req, res, url, json) {
      if (url.pathname === '/api/billing/vocabulary/offer' && req.method === 'GET') {
        json(res, 200, {
          sku: SKU,
          productId,
          priceId,
          amountCents: 1900,
          currency: 'eur',
          taxBehavior: 'inclusive',
          includedIn: ['pro', 'enterprise'],
          quantProServerGated: true,
          freeQuizAttempts: 1,
        });
        return true;
      }

      if (url.pathname === '/api/billing/vocabulary/access' && req.method === 'GET') {
        const user = await requireUser(req, res, json);
        if (!user) return true;
        try {
          const state = await access(user.userId);
          json(res, 200, { authenticated: true, ...state });
        } catch {
          json(res, 503, { error: 'vocabulary_access_unavailable' });
        }
        return true;
      }

      if (url.pathname === '/api/learning/vocabulary/quiz/consume' && req.method === 'POST') {
        if (!auth?.sameOrigin?.(req)) return json(res, 403, { error: 'forbidden_origin' }), true;
        const user = await requireUser(req, res, json);
        if (!user) return true;
        if (!supabase) return json(res, 503, { error: 'vocabulary_access_unavailable' }), true;
        try {
          const state = await access(user.userId);
          if (state?.quantProEntitled) {
            json(res, 200, { allowed: true, entitled: true, quizUsed: Boolean(state.quizUsed) });
            return true;
          }
          const consumed = await rpc(fetchImpl, supabase, 'capital_ai_consume_vocabulary_quiz', {
            _user_id: user.userId,
          });
          if (!consumed?.consumed) {
            json(res, 409, { error: 'quiz_already_used', allowed: false, quizUsed: true });
            return true;
          }
          json(res, 200, { allowed: true, entitled: false, quizUsed: true, quizConsumedAt: consumed.quizConsumedAt });
        } catch {
          json(res, 503, { error: 'quiz_access_unavailable' });
        }
        return true;
      }

      if (url.pathname === '/api/learning/vocabulary/quant-pro' && req.method === 'GET') {
        const user = await requireUser(req, res, json);
        if (!user) return true;
        try {
          const state = await access(user.userId);
          if (!state?.quantProEntitled) {
            json(res, 403, { error: 'vocabulary_entitlement_required' });
            return true;
          }
          const terms = await rpc(fetchImpl, supabase, 'capital_ai_get_quant_pro_vocabulary', {
            _user_id: user.userId,
          });
          if (!Array.isArray(terms)) {
            json(res, 403, { error: 'vocabulary_entitlement_required' });
            return true;
          }
          json(res, 200, {
            schema: 'CAPITAL_AI_QUANT_PRO_VOCABULARY@1',
            count: terms.length,
            terms,
          });
        } catch {
          json(res, 503, { error: 'vocabulary_access_unavailable' });
        }
        return true;
      }

      if (url.pathname === '/api/billing/vocabulary/checkout' && req.method === 'POST') {
        if (!secret || !auth || !supabase) return json(res, 503, { error: 'checkout_unavailable' }), true;
        if (!auth.sameOrigin(req)) return json(res, 403, { error: 'forbidden_origin' }), true;
        const user = await requireUser(req, res, json);
        if (!user) return true;
        const raw = await readBody(req);
        let withdrawalWaived = false;
        try {
          withdrawalWaived = JSON.parse(raw || '{}').withdrawalWaived === true;
        } catch {
          return json(res, 400, { error: 'bad_request' }), true;
        }
        if (!withdrawalWaived) return json(res, 400, { error: 'withdrawal_waiver_required' }), true;
        const form = new URLSearchParams({
          mode: 'payment',
          'line_items[0][price]': priceId,
          'line_items[0][quantity]': '1',
          success_url: `${baseUrl}/vocabulary?vocabulary_session={CHECKOUT_SESSION_ID}`,
          cancel_url: `${baseUrl}/vocabulary?vocabulary=cancelled`,
          client_reference_id: user.userId,
          'metadata[sku]': SKU,
          'metadata[user_id]': user.userId,
          'metadata[withdrawal_waived]': 'true',
          'payment_intent_data[statement_descriptor]': 'CAPITAL-AI VOCAB',
        });
        try {
          const session = await stripe('/checkout/sessions', form);
          json(res, 200, { url: session.url, sessionId: session.id });
        } catch {
          json(res, 502, { error: 'checkout_rejected' });
        }
        return true;
      }

      if (url.pathname === '/api/billing/vocabulary/entitlement' && req.method === 'GET') {
        const user = await requireUser(req, res, json);
        if (!user) return true;
        const sessionId = url.searchParams.get('session_id') || '';
        try {
          let grantedSessionId = null;
          if (sessionId) grantedSessionId = await validateAndGrant(user.userId, sessionId);
          const state = await access(user.userId);
          json(res, 200, {
            entitled: Boolean(state?.quantProEntitled),
            quizUsed: Boolean(state?.quizUsed),
            sessionId: grantedSessionId,
            entitlementSource: state?.entitlementSource || null,
          });
        } catch {
          json(res, 503, { error: 'vocabulary_entitlement_unavailable' });
        }
        return true;
      }

      return false;
    },
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 4096) {
        reject(new Error('body_too_large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
