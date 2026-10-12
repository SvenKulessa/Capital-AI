import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { boundedJson, readJson, secureUrl } from './http-security.mjs';

const LICENSE_PATH = new URL('../docs/licenses/CAPITAL-AI-BLUEPRINT-COMPANY-LICENSE-1.0.md', import.meta.url);
const LICENSE_VERSION = '1.0.0';
const RELEASE_VERSION = '1.0.0';
const PRODUCTS = Object.freeze({
  'CAP-BP-001': Object.freeze({
    name: 'Market Integrity Gate', productId: 'prod_VQPRXoyoJLA17V',
    priceId: 'price_1UPoyMPKr4joNbEcbHllSBQ5',
  }),
  'CAP-BP-002': Object.freeze({
    name: 'Data Quality Scorer', productId: 'prod_VQPR1vMN76D6pf',
    priceId: 'price_1UPoyOPKr4joNbEcnxUWvnFK',
  }),
});
const SKU_VALUES = Object.keys(PRODUCTS);
const uuid = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const stripeId = (value, prefix) => typeof value === 'string' && new RegExp(`^${prefix}[A-Za-z0-9_]{4,240}$`).test(value);
const validLegalName = (value) => typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= 160 && !/[\u0000-\u001f<>]/.test(value);

export function verifyBlueprintWebhookSignature(raw, header, secret, now = Date.now()) {
  if (!Buffer.isBuffer(raw) || typeof header !== 'string' || typeof secret !== 'string' || secret.length < 16) return false;
  const fields = header.split(',').map((part) => part.trim().split('='));
  const timestamps = fields.filter(([key]) => key === 't');
  if (timestamps.length !== 1 || !/^\d{10,12}$/.test(timestamps[0][1] || '')) return false;
  const ts = Number(timestamps[0][1]);
  if (!Number.isSafeInteger(ts) || Math.abs(Math.floor(now / 1000) - ts) > 300) return false;
  const expected = createHmac('sha256', secret).update(String(ts)).update('.').update(raw).digest();
  return fields.some(([key, value]) => {
    if (key !== 'v1' || !/^[a-f0-9]{64}$/i.test(value || '')) return false;
    return timingSafeEqual(expected, Buffer.from(value, 'hex'));
  });
}

async function readRaw(req, maxBytes = 65536) {
  const parts = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new Error('webhook_body_too_large');
    parts.push(chunk);
  }
  return Buffer.concat(parts);
}

function adminConfig(env) {
  try {
    const url = secureUrl(env.SUPABASE_URL || env.VITE_SUPABASE_URL);
    const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (url.href !== `${url.origin}/` || key.length < 32) return null;
    return { url: url.origin, key };
  } catch { return null; }
}

function rpcHeaders(key) {
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json', apikey: key };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  return headers;
}

function safeCheckoutUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'checkout.stripe.com' && !url.port && !url.username && !url.password;
  } catch { return false; }
}

export function createBlueprintCommerce({ env = process.env, fetchImpl = fetch, auth } = {}) {
  const stripeKey = String(env.STRIPE_SECRET_KEY || '');
  const webhookSecret = String(env.STRIPE_BLUEPRINT_WEBHOOK_SECRET || '');
  const db = adminConfig(env);
  const enabled = env.STRIPE_BLUEPRINT_CHECKOUT_ENABLED === 'true' &&
    env.STRIPE_BLUEPRINT_TAX_ENABLED === 'true' && Boolean(db && auth && stripeKey && webhookSecret.length >= 16);
  const base = String(env.PUBLIC_BASE_URL || 'https://capital-ai.online').replace(/\/$/, '');

  async function stripe(path, body) {
    if (!stripeKey) throw new Error('stripe_not_configured');
    const response = await fetchImpl(`https://api.stripe.com/v1${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${stripeKey}`, ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
      body, redirect: 'error', signal: AbortSignal.timeout(7000),
    });
    return boundedJson(response, 131072);
  }

  async function rpc(action, params = {}) {
    if (!db) throw new Error('blueprint_store_unavailable');
    const response = await fetchImpl(`${db.url}/rest/v1/rpc/capital_ai_blueprint_commerce`, {
      method: 'POST', headers: rpcHeaders(db.key),
      body: JSON.stringify({ _action: action, ...params }), redirect: 'error', signal: AbortSignal.timeout(7000),
    });
    return boundedJson(response, 196608);
  }

  async function userSession(req, res, json) {
    const user = await auth?.verify?.(req, res);
    if (!user?.userId || !uuid(user.userId)) {
      json(res, 401, { error: 'authentication_required' });
      return null;
    }
    return user;
  }

  async function priceReady(item) {
    const [price, product] = await Promise.all([
      stripe(`/prices/${encodeURIComponent(item.priceId)}`),
      stripe(`/products/${encodeURIComponent(item.productId)}`),
    ]);
    return Boolean(price.active && product.active && product.default_price === item.priceId &&
      price.product === item.productId && price.currency === 'eur' && price.unit_amount === 5000 &&
      price.type === 'one_time' && !price.recurring && price.tax_behavior === 'exclusive' &&
      product.tax_code === 'txcd_10503000' && product.metadata?.license_version === LICENSE_VERSION);
  }

  async function fulfilledSession(sessionId) {
    if (!stripeId(sessionId, 'cs_')) return false;
    const session = await stripe(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
    const sku = session.metadata?.sku;
    const item = PRODUCTS[sku];
    if (!item || !uuid(session.client_reference_id) || session.metadata?.user_id !== session.client_reference_id ||
      session.metadata?.release_version !== RELEASE_VERSION || session.metadata?.license_version !== LICENSE_VERSION ||
      session.metadata?.license_accepted !== 'true' || session.metadata?.immediate_delivery_consent !== 'true' ||
      session.metadata?.withdrawal_loss_acknowledged !== 'true' || !validLegalName(session.metadata?.licensee_name) ||
      session.status !== 'complete' || session.mode !== 'payment' || session.payment_status !== 'paid' ||
      session.currency !== 'eur' || session.amount_subtotal !== 5000 ||
      !Number.isInteger(session.amount_total) || session.amount_total < 5000 ||
      session.livemode !== (stripeKey.startsWith('rk_live_') || stripeKey.startsWith('sk_live_')) ||
      !stripeId(session.payment_intent, 'pi_') ||
      session.automatic_tax?.enabled !== true || session.automatic_tax?.status !== 'complete') return false;
    // A delayed webhook must not revive a previously refunded or disputed purchase.
    const intent = await stripe(`/payment_intents/${encodeURIComponent(session.payment_intent)}`);
    if (intent.status !== 'succeeded' || intent.currency !== 'eur' ||
        intent.amount_received !== session.amount_total || !stripeId(intent.latest_charge, 'ch_')) return false;
    const charge = await stripe(`/charges/${encodeURIComponent(intent.latest_charge)}`);
    if (charge.paid !== true || charge.refunded === true || charge.disputed === true ||
        charge.amount_refunded !== 0 || charge.payment_intent !== session.payment_intent) return false;
    const lineItems = await stripe(`/checkout/sessions/${encodeURIComponent(sessionId)}/line_items?limit=2`);
    if (lineItems.has_more || !Array.isArray(lineItems.data) || lineItems.data.length !== 1) return false;
    const line = lineItems.data[0];
    if (line.quantity !== 1 || line.price?.id !== item.priceId || line.price?.product !== item.productId ||
      line.price?.currency !== 'eur' || line.price?.unit_amount !== 5000 ||
      line.price?.tax_behavior !== 'exclusive') return false;
    return rpc('fulfill', {
      _user_id: session.client_reference_id, _sku: sku, _version: RELEASE_VERSION,
      _session_id: session.id, _price_id: item.priceId,
      _payment_intent_id: session.payment_intent,
      _customer_id: stripeId(session.customer, 'cus_') ? session.customer : null,
      _licensee_name: session.metadata.licensee_name.trim(), _license_version: LICENSE_VERSION,
    });
  }

  return {
    async handle(req, res, url, json) {
      if (!url.pathname.startsWith('/api/billing/blueprints/')) return false;
      res.setHeader('Cache-Control', 'private, no-store');

      if (url.pathname === '/api/billing/blueprints/license' && req.method === 'GET') {
        try {
          const data = await readFile(LICENSE_PATH);
          res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' });
          res.end(data);
        } catch { json(res, 503, { error: 'license_unavailable' }); }
        return true;
      }
      if (url.pathname === '/api/billing/blueprints/offer' && req.method === 'GET') {
        json(res, 200, {
          licenseVersion: LICENSE_VERSION, checkoutEnabled: enabled,
          products: SKU_VALUES.map(sku => ({ sku, name: PRODUCTS[sku].name, amountCents: 5000,
            currency: 'eur', taxBehavior: 'exclusive', version: RELEASE_VERSION, fulfillment: 'authenticated_download' })),
        });
        return true;
      }
      if (url.pathname === '/api/billing/blueprints/webhook' && req.method === 'POST') {
        if (!webhookSecret || !db || !stripeKey) { json(res, 503, { error: 'webhook_unavailable' }); return true; }
        let event;
        try {
          const raw = await readRaw(req);
          if (!verifyBlueprintWebhookSignature(raw, req.headers['stripe-signature'], webhookSecret)) {
            json(res, 400, { error: 'invalid_webhook_signature' }); return true;
          }
          event = JSON.parse(raw.toString('utf8'));
          if (!event?.livemode || typeof event.id !== 'string') throw new Error('invalid_event');
        } catch { json(res, 400, { error: 'invalid_webhook' }); return true; }
        try {
          if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
            const sessionId = event.data?.object?.id;
            if (!stripeId(sessionId, 'cs_')) { json(res, 400, { error: 'invalid_session' }); return true; }
            const granted = await fulfilledSession(sessionId);
            if (!granted) { json(res, 200, { received: true, ignored: true }); return true; }
            json(res, 200, { received: true }); return true;
          }
          if (event.type === 'charge.refunded' || event.type === 'charge.dispute.created') {
            const chargeId = event.type === 'charge.refunded' ? event.data?.object?.id : event.data?.object?.charge;
            if (!stripeId(chargeId, 'ch_')) { json(res, 400, { error: 'invalid_charge' }); return true; }
            const charge = await stripe(`/charges/${encodeURIComponent(chargeId)}`);
            if (!stripeId(charge.payment_intent, 'pi_')) { json(res, 200, { received: true, ignored: true }); return true; }
            if (event.type === 'charge.refunded' && charge.refunded === true && charge.amount_refunded >= charge.amount) {
              await rpc('revoke', { _payment_intent_id: charge.payment_intent, _reason: 'refunded' });
            }
            if (event.type === 'charge.dispute.created' && charge.disputed === true) {
              await rpc('revoke', { _payment_intent_id: charge.payment_intent, _reason: 'disputed' });
            }
            json(res, 200, { received: true }); return true;
          }
          json(res, 200, { received: true, ignored: true });
        } catch { json(res, 503, { error: 'blueprint_fulfillment_unavailable' }); }
        return true;
      }
      if (url.pathname === '/api/billing/blueprints/access' && req.method === 'GET') {
        const user = await userSession(req, res, json);
        if (!user) return true;
        try {
          const rows = await rpc('access', { _user_id: user.userId });
          json(res, 200, { purchases: Array.isArray(rows) ? rows : [] });
        } catch { json(res, 503, { error: 'access_unavailable' }); }
        return true;
      }
      if (url.pathname.startsWith('/api/billing/blueprints/download/') && req.method === 'GET') {
        const sku = url.pathname.slice('/api/billing/blueprints/download/'.length);
        if (!PRODUCTS[sku]) { json(res, 404, { error: 'not_found' }); return true; }
        const user = await userSession(req, res, json);
        if (!user) return true;
        try {
          const result = await rpc('download', { _user_id: user.userId, _sku: sku });
          if (!result?.entitled) { json(res, 403, { error: 'entitlement_required' }); return true; }
          const content = Buffer.from(result.dataBase64, 'base64');
          if (result.sku !== sku || result.version !== RELEASE_VERSION ||
              !/^[a-f0-9]{64}$/.test(result.sha256 || '') ||
              !/^CAP-BP-00[12]-[A-Za-z0-9.-]+\.md$/.test(result.fileName || '') ||
              !Number.isInteger(result.bytes) || result.bytes !== content.length || content.length > 1048576 ||
              createHash('sha256').update(content).digest('hex') !== result.sha256) throw new Error('artifact_mismatch');
          res.writeHead(200, {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Content-Disposition': `attachment; filename="${result.fileName}"`,
            'Content-Length': content.length, 'Cache-Control': 'private, no-store',
            'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': 'sandbox',
          });
          res.end(content);
        } catch { json(res, 503, { error: 'blueprint_download_unavailable' }); }
        return true;
      }
      if (url.pathname === '/api/billing/blueprints/checkout' && req.method === 'POST') {
        if (!enabled) { json(res, 503, { error: 'checkout_not_released' }); return true; }
        if (!auth?.sameOrigin?.(req)) { json(res, 403, { error: 'forbidden_origin' }); return true; }
        const user = await userSession(req, res, json);
        if (!user) return true;
        let input;
        try { input = await readJson(req, 4096); }
        catch { json(res, 400, { error: 'invalid_request' }); return true; }
        const item = PRODUCTS[input?.sku];
        if (!item || !validLegalName(input?.licenseeName) || input?.licenseVersion !== LICENSE_VERSION ||
            input?.licenseAccepted !== true || input?.immediateDeliveryConsent !== true ||
            input?.withdrawalLossAcknowledged !== true) {
          json(res, 400, { error: 'checkout_terms_required' }); return true;
        }
        try {
          if (!(await priceReady(item))) throw new Error('price_mismatch');
          const released = await rpc('readiness', { _sku: input.sku });
          if (!released?.ready) throw new Error('asset_unavailable');
          const purchases = await rpc('access', { _user_id: user.userId });
          if (Array.isArray(purchases) && purchases.some(p => p.sku === input.sku && p.version === RELEASE_VERSION)) {
            json(res, 409, { error: 'already_purchased' }); return true;
          }
        } catch { json(res, 503, { error: 'checkout_not_ready' }); return true; }
        const form = new URLSearchParams({
          mode: 'payment',
          'line_items[0][price]': item.priceId,
          'line_items[0][quantity]': '1',
          'automatic_tax[enabled]': 'true',
          'billing_address_collection': 'required',
          'tax_id_collection[enabled]': 'true',
          success_url: `${base}/studio?tab=blueprints&blueprint_payment=success`,
          cancel_url: `${base}/studio?tab=blueprints&blueprint_payment=cancel`,
          client_reference_id: user.userId,
          'metadata[sku]': input.sku,
          'metadata[user_id]': user.userId,
          'metadata[release_version]': RELEASE_VERSION,
          'metadata[license_version]': LICENSE_VERSION,
          'metadata[licensee_name]': input.licenseeName.trim(),
          'metadata[license_accepted]': 'true',
          'metadata[immediate_delivery_consent]': 'true',
          'metadata[withdrawal_loss_acknowledged]': 'true',
        });
        try {
          const session = await stripe('/checkout/sessions', form);
          if (!stripeId(session.id, 'cs_') || !safeCheckoutUrl(session.url) ||
              session.mode !== 'payment' || session.livemode !== (stripeKey.startsWith('sk_live_') || stripeKey.startsWith('rk_live_'))) throw new Error('session_mismatch');
          json(res, 200, { checkoutUrl: session.url });
        } catch { json(res, 502, { error: 'stripe_checkout_unavailable' }); }
        return true;
      }
      res.setHeader('Allow', 'GET, POST');
      json(res, 405, { error: 'method_not_allowed' });
      return true;
    },
  };
}
