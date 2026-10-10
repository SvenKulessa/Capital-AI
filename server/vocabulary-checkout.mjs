import { createHmac, timingSafeEqual } from 'node:crypto';
import { createEnterpriseTrial } from './enterprise-trial.mjs';
import { readFile } from 'node:fs/promises';
import { boundedJson, secureUrl } from './http-security.mjs';

const DEFAULT_VOCABULARY_PRODUCT_ID = 'prod_VNTsrtlf2ZL8ja';
const SKU = 'learning-portal';
const LEGACY_SKU = 'market-vocabulary';
const VOCABULARY_BADGE_PATH = new URL('../CAPITAL-AI-PRODUCT/badge.svg', import.meta.url);
const VOCABULARY_BADGE_LICENSE_PATH = new URL('../docs/licenses/CAPITAL-AI-VOCABULARY-BADGE-CUSTOMER-LICENSE-1.0.md', import.meta.url);

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
  const trialCampaign=createEnterpriseTrial({env,fetchImpl});
  const secret = env.STRIPE_SECRET_KEY || '';
  const supabase = adminConfig(env);
  const priceId = env.STRIPE_LEARNING_PORTAL_PRICE_ID || '';
  const learningProductId = env.STRIPE_LEARNING_PORTAL_PRODUCT_ID || '';
  const productId = env.STRIPE_VOCABULARY_PRODUCT_ID || DEFAULT_VOCABULARY_PRODUCT_ID;
  const webhookSecret=env.STRIPE_LEARNING_WEBHOOK_SECRET || '';
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
      ((session.metadata?.sku === SKU && Number(session.amount_total) === 2500) ||
       (session.metadata?.sku === LEGACY_SKU && Number(session.amount_total) === 1900)) &&
      session.client_reference_id === userId &&
      session.metadata?.user_id === userId &&
      session.currency === 'eur' && session.mode !== 'subscription';

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
      if(url.pathname==='/api/billing/learning/webhook' && req.method==='POST') {
        if(webhookSecret.length<16) return json(res,503,{error:'learning_webhook_not_configured'}),true;
        let raw,event;
        try {raw=await readBody(req,65536);if(!verifyLearningWebhookSignature(raw,req.headers['stripe-signature'],webhookSecret)) return json(res,400,{error:'invalid_webhook_signature'}),true;event=JSON.parse(raw);}
        catch {return json(res,400,{error:'invalid_webhook_payload'}),true;}
        if(!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)) return json(res,200,{received:true,ignored:true}),true;
        const session=event.data?.object;
        if(!session || !/^[a-f0-9-]{36}$/i.test(session.client_reference_id||'')) return json(res,200,{received:true,ignored:true}),true;
        try {
          if(session.metadata?.campaign==='enterprise-learning-3-days') await trialCampaign.activate(session.client_reference_id,session.id);
          else if([SKU,LEGACY_SKU].includes(session.metadata?.sku)) await validateAndGrant(session.client_reference_id,session.id);
          json(res,200,{received:true});
        } catch {json(res,503,{error:'learning_fulfillment_unavailable'});}
        return true;
      }

      if(url.pathname==='/api/billing/enterprise/trial' && req.method==='POST') {
        if(!auth?.sameOrigin?.(req)) return json(res,403,{error:'forbidden_origin'}),true;
        const user=await requireUser(req,res,json);if(!user) return true;
        try {const activated=await trialCampaign.activate(user.userId,url.searchParams.get('session_id'));json(res,activated?200:403,{activated});}
        catch {json(res,503,{error:'trial_activation_unavailable'});}
        return true;
      }

      if (url.pathname === '/api/billing/vocabulary/offer' && req.method === 'GET') {
        json(res, 200, {
          sku: SKU,
          productId: learningProductId || null,
          priceId: priceId || null,
          amountCents: 2500,
          currency: 'eur',
          taxBehavior: 'inclusive',
          quantProServerGated: true,
          freeQuizQuestionsPerDay: 1,
          name: 'Learning Portal',
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

      if (url.pathname === '/api/billing/vocabulary/badge' && req.method === 'GET') {
        const user = await requireUser(req, res, json);
        if (!user) return true;
        try {
          const state = await access(user.userId);
          if (!state?.quantProEntitled) {
            json(res, 403, { error: 'vocabulary_entitlement_required' });
            return true;
          }
          const badge = await readFile(VOCABULARY_BADGE_PATH);
          res.writeHead(200, {
            'Content-Type': 'image/svg+xml; charset=utf-8',
            'Content-Disposition': 'attachment; filename="capital-ai-market-vocabulary-badge.svg"',
            'Cache-Control': 'private, no-store',
            'X-Content-Type-Options': 'nosniff',
          });
          res.end(badge);
        } catch {
          json(res, 503, { error: 'vocabulary_badge_unavailable' });
        }
        return true;
      }

      if (url.pathname === '/api/billing/vocabulary/badge-license' && req.method === 'GET') {
        const user = await requireUser(req, res, json);
        if (!user) return true;
        try {
          const state = await access(user.userId);
          if (!state?.quantProEntitled) {
            json(res, 403, { error: 'vocabulary_entitlement_required' });
            return true;
          }
          const license = await readFile(VOCABULARY_BADGE_LICENSE_PATH);
          res.writeHead(200, {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Content-Disposition': 'attachment; filename="CAPITAL-AI-VOCABULARY-BADGE-LICENSE.md"',
            'Cache-Control': 'private, no-store',
            'X-Content-Type-Options': 'nosniff',
          });
          res.end(license);
        } catch {
          json(res, 503, { error: 'vocabulary_badge_license_unavailable' });
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

      if (url.pathname === '/api/learning/vocabulary/preview' && req.method === 'GET') {
        if (!supabase) return json(res, 503, { error: 'learning_unavailable' }), true;
        try {
          const terms = await rpc(fetchImpl, supabase, 'capital_ai_get_quant_pro_vocabulary', { _user_id: null });
          json(res, 200, { terms: Array.isArray(terms) ? terms.slice(0, 7) : [] });
        } catch { json(res, 503, { error: 'learning_unavailable' }); }
        return true;
      }

      if (url.pathname === '/api/learning/favorites' && ['GET', 'POST', 'DELETE'].includes(req.method)) {
        if (req.method !== 'GET' && !auth?.sameOrigin?.(req)) return json(res, 403, { error: 'forbidden_origin' }), true;
        const user = await requireUser(req, res, json);
        if (!user) return true;
        if (!supabase) return json(res, 503, { error: 'learning_unavailable' }), true;
        try {
          const id = url.searchParams.get('id');
          if (req.method !== 'GET' && (!id || !/^[a-z0-9-]{1,120}$/.test(id))) return json(res, 400, { error: 'invalid_term' }), true;
          const favorites = await rpc(fetchImpl, supabase, 'capital_ai_learning_favorites', { _user_id: user.userId, _term_id: id, _action: req.method });
          json(res, 200, { favorites });
        } catch { json(res, 503, { error: 'favorites_unavailable' }); }
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
        let withdrawalWaived = false;
        try {
          const raw = await readBody(req);
          withdrawalWaived = JSON.parse(raw || '{}').withdrawalWaived === true;
        } catch {
          return json(res, 400, { error: 'bad_request' }), true;
        }
        try {
          const existing = await access(user.userId);
          if(existing?.quantProEntitled && (!existing?.trialActive || existing?.entitlementSource === 'stripe_checkout')) return json(res,409,{error:'learning_already_entitled'}),true;
        } catch {return json(res,503,{error:'learning_access_unavailable'}),true;}
        if (!withdrawalWaived) return json(res, 400, { error: 'withdrawal_waiver_required' }), true;
        const form = new URLSearchParams({
          mode: 'payment',
          'line_items[0][quantity]': '1',
          success_url: `${baseUrl}/learning?vocabulary_session={CHECKOUT_SESSION_ID}`,
          cancel_url: `${baseUrl}/learning?vocabulary=cancelled`,
          client_reference_id: user.userId,
          'metadata[sku]': SKU,
          'metadata[user_id]': user.userId,
          'metadata[withdrawal_waived]': 'true',
          'payment_intent_data[statement_descriptor]': 'CAPITAL-AI LEARN',
        });
        if (priceId) {
          try {
            const price = await stripe(`/prices/${encodeURIComponent(priceId)}`);
            if (!price.active || price.currency !== 'eur' || price.unit_amount !== 2500 || price.recurring || !learningProductId || price.product !== learningProductId) throw new Error('price_mismatch');
          } catch { return json(res, 503, { error: 'learning_price_mismatch' }), true; }
          form.set('line_items[0][price]', priceId);
        } else {
          form.set('line_items[0][price_data][currency]', 'eur');
          form.set('line_items[0][price_data][unit_amount]', '2500');
          form.set('line_items[0][price_data][tax_behavior]', 'inclusive');
          form.set('line_items[0][price_data][product_data][name]', 'Learning Portal');
        }
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

function readBody(req, limit=4096) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
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

export function verifyLearningWebhookSignature(raw,header,secret,now=Date.now()) {
  if(typeof header!=='string'||typeof raw!=='string') return false;
  const parts=header.split(',').map(part=>part.split('='));
  const timestamp=Number(parts.find(([key])=>key==='t')?.[1]);
  if(!Number.isSafeInteger(timestamp)||Math.abs(now/1000-timestamp)>300) return false;
  const expected=createHmac('sha256',secret).update(`${timestamp}.${raw}`).digest();
  return parts.some(([key,value])=>key==='v1'&&/^[a-f0-9]{64}$/i.test(value||'')&&timingSafeEqual(expected,Buffer.from(value,'hex')));
}
