import { createEnterpriseTrial, ENTERPRISE_TRIAL_CODE, ENTERPRISE_TRIAL_CAMPAIGN } from './enterprise-trial.mjs';
import { boundedJson, secureUrl } from './http-security.mjs';
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
  const promotion=String(payload?.promotion||'').trim().toUpperCase();
  if(promotion && (promotion!==ENTERPRISE_TRIAL_CODE || tier!=='enterprise' || cycle!=='monthly')) return null;
  return { tier, cycle, priceId, trial: promotion===ENTERPRISE_TRIAL_CODE };
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
  const trialCampaign=createEnterpriseTrial({env,fetchImpl});
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
    if (!response.ok || payload?.livemode !== secret.startsWith('sk_live_') || typeof payload?.url !== 'string' || !payload.url.startsWith('https://checkout.stripe.com/')) {
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
          catalogVersion: BILLING_CATALOG.version,
          catalogEvidence: 'docs/security/evidence/stripe-catalog-readback-20261006.json',
          testPurchaseRequirement: {
            count: 6,
            tiers: ['starter', 'pro', 'enterprise'],
            cycles: ['monthly', 'annual'],
            stripeMode: 'test',
            livePriceIdsAllowed: false,
          },
        });
        return true;
      }

      if (url.pathname === '/api/billing/subscriptions/portal') {
        if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); json(res,405,{error:'method_not_allowed'}); return true; }
        if (!secret || !auth) { json(res,503,{error:'billing_unavailable'}); return true; }
        if (!auth.sameOrigin(req)) { json(res,403,{error:'forbidden_origin'}); return true; }
        const user = await auth.verify(req,res);
        if (!user?.userId) { json(res,401,{error:'authentication_required'}); return true; }
        try {
          // Never accept a customer ID from the browser. Resolve the user's persisted subscription.
          const store = secureUrl(env.SUPABASE_URL || env.VITE_SUPABASE_URL);
          if (store.pathname !== '/' || store.search) throw new Error('invalid_store');
          const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
          if (key.length < 32) throw new Error('store_unavailable');
          const target = new URL('/rest/v1/subscriptions',store);
          target.searchParams.set('select','user_id,stripe_subscription_id');
          target.searchParams.set('user_id',`eq.${user.userId}`);
          target.searchParams.set('limit','2');
          const headers = {Accept:'application/json',apikey:key,...(key.startsWith('eyJ') ? {Authorization:`Bearer ${key}`} : {})};
          const rows = await boundedJson(await fetchImpl(target,{headers,redirect:'error',signal:AbortSignal.timeout(7000)}));
          if (!Array.isArray(rows) || rows.length !== 1 || rows[0].user_id !== user.userId || !/^sub_[A-Za-z0-9]+$/.test(rows[0].stripe_subscription_id || '')) {
            json(res,409,{error:'no_subscription'}); return true;
          }
          const stripeHeaders = {Authorization:`Bearer ${secret}`};
          const subscription = await boundedJson(await fetchImpl(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(rows[0].stripe_subscription_id)}`,{headers:stripeHeaders,redirect:'error',signal:AbortSignal.timeout(7000)}));
          if (subscription.id !== rows[0].stripe_subscription_id || subscription.metadata?.user_id !== user.userId || subscription.livemode !== secret.startsWith('sk_live_') || !/^cus_[A-Za-z0-9]+$/.test(subscription.customer || '')) throw new Error('identity_mismatch');
          // A portal shows the whole customer. Reject customers shared with other account identities.
          const peers = await boundedJson(await fetchImpl(`https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(subscription.customer)}&status=all&limit=100`,{headers:stripeHeaders,redirect:'error',signal:AbortSignal.timeout(7000)}));
          if (peers.has_more !== false || !Array.isArray(peers.data) || !peers.data.length || peers.data.some(row => row.metadata?.user_id !== user.userId)) throw new Error('customer_identity_mismatch');
          const portal = await boundedJson(await fetchImpl('https://api.stripe.com/v1/billing_portal/sessions',{method:'POST',headers:{...stripeHeaders,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({customer:subscription.customer,return_url:`${baseUrl}/profile/subscription`}),redirect:'error',signal:AbortSignal.timeout(7000)}));
          const portalUrl = secureUrl(portal.url);
          if (portalUrl.hostname !== 'billing.stripe.com') throw new Error('invalid_portal');
          json(res,200,{url:portalUrl.href});
        } catch { json(res,502,{error:'billing_portal_unavailable'}); }
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

      if(request.trial) {
        try {
          if(!(await trialCampaign.state(user.userId,'reserve'))?.reserved) {
            const session = await trialCampaign.resume(user.userId);
            if (session) return json(res,200,{url:session.url,sessionId:session.id}),true;
            return json(res,409,{error:'trial_already_claimed'}),true;
          }
        } catch {return json(res,503,{error:'trial_unavailable'}),true;}
      }
      const planId = request.tier.toUpperCase();
      const form = new URLSearchParams({
        mode: 'subscription',
        allow_promotion_codes: 'true',
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

      if(request.trial) {
        form.set('subscription_data[trial_period_days]','3');
        form.set('payment_method_collection','always');
        form.set('metadata[campaign]',ENTERPRISE_TRIAL_CAMPAIGN);
        form.set('subscription_data[metadata][campaign]',ENTERPRISE_TRIAL_CAMPAIGN);
        form.set('success_url',`${baseUrl}/learning?enterprise_trial_session={CHECKOUT_SESSION_ID}`);
        // Trial campaign cannot stack invoice discounts; standard checkouts keep Stripe's promo field.
        form.delete('allow_promotion_codes');
      }
      try {
        const session = await stripeCreateSession(form);
        if(request.trial && !(await trialCampaign.state(user.userId,'attach',session.id))?.attached) throw new Error('trial_attach_rejected');
        json(res, 200, { url: session.url, sessionId: session.id });
      } catch {
        // A created (or timed-out) Stripe session may still be payable. Keep the
        // reservation rather than allowing a second concurrent trial checkout.
        json(res, 502, { error: 'subscription_checkout_rejected' });
      }
      return true;
    },
  };
}
