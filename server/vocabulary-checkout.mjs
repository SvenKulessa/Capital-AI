const DEFAULT_VOCABULARY_PRICE_ID = 'price_1UMiuIPKr4joNbEclpn8AwFW';
const DEFAULT_VOCABULARY_PRODUCT_ID = 'prod_VNTsrtlf2ZL8ja';
const SKU = 'market-vocabulary';

export function createVocabularyCheckout({ env = process.env, fetchImpl = fetch, auth } = {}) {
  const secret = env.STRIPE_SECRET_KEY || '';
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
