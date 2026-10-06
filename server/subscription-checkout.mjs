import { boundedJson } from './http-security.mjs';
import { BILLING_CATALOG } from './billing-catalog.mjs';

const ALLOWED_TIERS = new Set(['starter', 'pro', 'enterprise']);
const ALLOWED_CYCLES = new Set(['monthly', 'annual']);

function normalizeRequest(payload) {
  const tier = String(payload?.tier || '').toLowerCase();
  const cycle = String(payload?.cycle || '').toLowerCase();
  if (!ALLOWED_TIERS.has(tier) || !ALLOWED_CYCLES.has(cycle)) return null;
  const catalog = BILLING_CATALOG.tiers[tier];
  const priceId = cycle === 'annual' ? catalog?.annualPriceId : catalog?.monthlyPriceId;
  if (!priceId || !priceId.startsWith('price_')) return null;
  return { tier, cycle, priceId };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 4096) {
        reject(new Error('body_too_large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(new Error('invalid_json'));
      }
    });
    req.on('error', reject);
  });
}

export function createSubscriptionCheckout({ env = process.env, fetchImpl = fetch, auth } = {}) {
  const secret = env.STRIPE_SECRET_KEY || '';
  const enabled = env.STRIPE_SUBSCRIPTION_CHECKOUT_ENABLED !== 'false';
  const baseUrl = String(env.PUBLIC_BASE_URL || 'https://capital-ai.online').replace(/\/$/, '');

  async function stripeCreateSession(form) {
    const response = await fetchImpl('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
      redirect: 'error',
      signal: AbortSignal.timeout(7000),
    });
    const payload = await boundedJson(response);
    if (!response.ok || typeof payload?.url !== 'string' || !payload.url.startsWith('https://checkout.stripe.com/')) {
      throw new Error('stripe_checkout_rejected');
    }
    return payload;
  }

  return {
    async handle(req, res, url, json) {
      if (url.pathname === '/api/billing/subscriptions/readiness' && req.method === 'GET') {
        json(res, 200, {
          schema: 'CAPITAL_AI_SUBSCRIPTION_COMMERCE_READINESS@1',
          enabled: Boolean(enabled && secret),
          tiers: ['starter', 'pro', 'enterprise'],
          cycles: ['monthly', 'annual'],
          priceAuthority: 'server/billing-catalog.mjs',
          entitlementAuthority: 'public.subscriptions via Stripe-managed subscription sync',
        });
        return true;
      }

      if (url.pathname !== '/api/billing/subscriptions/checkout') return false;
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        json(res, 405, { error: 'method_not_allowed' });
        return true;
      }
      if (!enabled || !secret || !auth) {
        json(res, 503, { error: 'subscription_checkout_not_enabled' });
        return true;
      }
      if (!auth.sameOrigin(req)) {
        json(res, 403, { error: 'forbidden_origin' });
        return true;
      }

      const user = await auth.verify(req, res);
      if (!user?.userId) {
        json(res, 401, { error: 'authentication_required' });
        return true;
      }

      let request;
      try {
        request = normalizeRequest(await readBody(req));
      } catch {
        json(res, 400, { error: 'bad_request' });
        return true;
      }
      if (!request) {
        json(res, 400, { error: 'invalid_subscription_selection' });
        return true;
      }

      const planId = request.tier.toUpperCase();
      const form = new URLSearchParams({
        mode: 'subscription',
        'line_items[0][price]': request.priceId,
        'line_items[0][quantity]': '1',
        success_url: `${baseUrl}/profile?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/pricing?subscription=cancelled`,
        client_reference_id: user.userId,
        'metadata[user_id]': user.userId,
        'metadata[plan_id]': planId,
        'metadata[billing_cycle]': request.cycle,
        'subscription_data[metadata][user_id]': user.userId,
        'subscription_data[metadata][plan_id]': planId,
        'subscription_data[metadata][billing_cycle]': request.cycle,
      });

      try {
        const session = await stripeCreateSession(form);
        json(res, 200, { url: session.url, sessionId: session.id });
      } catch {
        json(res, 502, { error: 'subscription_checkout_rejected' });
      }
      return true;
    },
  };
}
