import { createHmac, timingSafeEqual } from 'node:crypto';

const DEFAULT_VOCABULARY_PRICE_ID = 'price_1UMiuIPKr4joNbEclpn8AwFW';
const DEFAULT_VOCABULARY_PRODUCT_ID = 'prod_VNTsrtlf2ZL8ja';
const SKU = 'market-vocabulary';

export function createVocabularyCheckout({ env = process.env, fetchImpl = fetch, auth } = {}) {
  const secret = env.STRIPE_SECRET_KEY || '';
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET || '';
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
    });
    const payload = await response.json();
    if (!response.ok) {
      const error = new Error('stripe_rejected');
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  return {
    async handle(req, res, url, json) {
      if (url.pathname === '/api/billing/stripe/webhook' && req.method === 'POST') {
        if (!webhookSecret) return json(res, 503, { error: 'webhook_unavailable' }), true;
        const raw = await readBody(req, 64 * 1024);
        if (!verifyStripeSignature(raw, req.headers['stripe-signature'], webhookSecret)) {
          return json(res, 400, { error: 'invalid_webhook_signature' }), true;
        }
        let event;
        try { event = JSON.parse(raw); } catch { return json(res, 400, { error: 'invalid_webhook_payload' }), true; }
        const handled = new Set([
          'checkout.session.completed',
          'checkout.session.async_payment_succeeded',
          'checkout.session.async_payment_failed',
        ]);
        if (handled.has(event?.type)) {
          const session = event?.data?.object || {};
          if (session?.metadata?.sku !== SKU) return json(res, 200, { received: true, ignored: true }), true;
        }
        return json(res, 200, { received: true }), true;
      }

      if (url.pathname === '/api/billing/vocabulary/offer' && req.method === 'GET') {
        json(res, 200, {
          sku: SKU,
          productId,
          priceId,
          amountCents: 1900,
          currency: 'eur',
          taxBehavior: 'inclusive',
          includedIn: ['pro', 'enterprise'],
        });
        return true;
      }

      if (url.pathname === '/api/billing/vocabulary/checkout' && req.method === 'POST') {
        if (!secret || !auth) return json(res, 503, { error: 'checkout_unavailable' }), true;
        if (!auth.sameOrigin(req)) return json(res, 403, { error: 'forbidden_origin' }), true;
        const user = await auth.verify(req, res);
        if (!user?.userId) return json(res, 401, { error: 'authentication_required' }), true;
        const raw = await readBody(req);
        let withdrawalWaived = false;
        try { withdrawalWaived = JSON.parse(raw || '{}').withdrawalWaived === true; } catch { return json(res, 400, { error: 'bad_request' }), true; }
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
        const sessionId = url.searchParams.get('session_id') || '';
        if (!secret || !auth || !sessionId.startsWith('cs_')) return json(res, 200, { entitled: false }), true;
        const user = await auth.verify(req, res);
        if (!user?.userId) return json(res, 200, { entitled: false }), true;
        try {
          const session = await stripe(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
          const entitled = session.payment_status === 'paid' && session.metadata?.sku === SKU && session.client_reference_id === user.userId && session.metadata?.user_id === user.userId;
          json(res, 200, { entitled, sessionId: entitled ? session.id : null });
        } catch {
          json(res, 200, { entitled: false });
        }
        return true;
      }

      return false;
    },
  };
}

function verifyStripeSignature(rawBody, header, secret) {
  if (typeof header !== 'string' || !secret) return false;
  const parts = header.split(',');
  const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2) || '';
  const signatures = parts.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3));
  if (!/^\d+$/.test(timestamp) || signatures.length === 0) return false;
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (age > 300) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest();
  return signatures.some((signature) => {
    let actual;
    try { actual = Buffer.from(signature, 'hex'); } catch { return false; }
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}

function readBody(req, maxBytes = 4096) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
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
