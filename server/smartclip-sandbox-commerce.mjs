// CAPITAL-AI SmartClip: sandbox-only, fail-closed extension of existing commerce contracts.
// No live key can activate this handler; no success-page fulfillment or synthetic receipts.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { boundedJson, readJson, secureUrl } from './http-security.mjs';

// Same Stripe v1 timestamp/HMAC contract as Blueprint Commerce. Keep this leaf module
// independent of the Blueprint email transporter during pre-install security CI.
export function verifySmartclipWebhookSignature(raw, header, secret, now = Date.now()) {
  if (!Buffer.isBuffer(raw) || typeof header !== 'string' ||
      typeof secret !== 'string' || secret.length < 16) return false;
  const fields = header.split(',').map(part => part.trim().split('='));
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

export const SMARTCLIP_SKU = 'SMARTCLIP_PERSONAL';
export const SMARTCLIP_RELEASE = 'acode-bridge-v2';
export const SMARTCLIP_LICENSE = 'draft-v3'; // NOT a legally approved consumer EULA.
export const SMARTCLIP_PINNED_SHA256 = '8c2683d641f28bf466026dff1f4adb0c073bc81564bc0afd4b758a33d7b76512';
const SHA = /^[a-f0-9]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SID = /^cs_test_[A-Za-z0-9_]{8,240}$/;
const PID = /^pi_[A-Za-z0-9_]{8,240}$/;
const CHARGE = /^ch_[A-Za-z0-9_]{8,240}$/;
const INVOICE = /^in_[A-Za-z0-9_]{8,240}$/;
const CUSTOMER = /^cus_[A-Za-z0-9_]{8,240}$/;
const PRICE = /^price_[A-Za-z0-9_]{6,240}$/;
const PRODUCT = /^prod_[A-Za-z0-9_]{6,240}$/;
const REQ_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IS_TEST_KEY = /^(rk|sk)_test_[A-Za-z0-9_]{10,}$/;
const FORM_PRICE_CENTS = 249;
// TEST-ONLY owner-approved downloadable non-recreational personal-use software.
// Scope: technical Stripe TEST catalog classification, NOT commercial tax approval.
// Enforce this exact tax code even if the provider catalog offers alternatives.
// An active registration in the isolated TEST account remains mandatory.
const SMARTCLIP_TEST_TAX_CODE = 'txcd_10202001';

async function rawBody(req, limit = 65536) {
  const parts = []; let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > limit) throw Error('body_size');
    parts.push(chunk);
  }
  return Buffer.concat(parts);
}

function dbConfig(env) {
  try {
    const url = secureUrl(env.SMARTCLIP_SANDBOX_DB_URL);
    const key = env.SMARTCLIP_SANDBOX_DB_SERVICE_KEY || '';
    if (url.href !== url.origin + '/' || key.length < 32) return null;
    // Isolation cannot be proven when there is no known production reference to compare.
    const primaries = [env.SUPABASE_URL, env.VITE_SUPABASE_URL].filter(Boolean);
    if (primaries.length === 0) return null;
    for (const primary of primaries) {
      if (secureUrl(primary).origin === url.origin) return null;
    }
    return { origin: url.origin, key };
  } catch { return null; }
}

function safeStripeUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && u.hostname === 'checkout.stripe.com' &&
      u.port === '' && !u.username && !u.password;
  } catch { return false; }
}

const stripeObjectId = (v) => typeof v === 'string' ? v : v?.id;
function letters(requestKey) {
  // Identical requestId must produce identical Stripe POST parameters under idempotent retries.
  return [...Buffer.from(requestKey.slice(0, 16), 'hex')].map(n => String.fromCharCode(97 + (n % 26))).join('');
}

export function createSmartclipSandboxCommerce({ env = process.env, fetchImpl = fetch, auth } = {}) {
  const key = String(env.STRIPE_SMARTCLIP_TEST_KEY || '');
  const hook = String(env.STRIPE_SMARTCLIP_TEST_WEBHOOK_SECRET || '');
  const priceId = String(env.STRIPE_SMARTCLIP_TEST_PRICE_ID || '');
  const productId = String(env.STRIPE_SMARTCLIP_TEST_PRODUCT_ID || '');
  const digest = String(env.SMARTCLIP_SANDBOX_RELEASE_SHA256 || '');
  const taxCode = String(env.SMARTCLIP_SANDBOX_TAX_CODE || '');
  const db = dbConfig(env);
  const configured = env.SMARTCLIP_SANDBOX_ENABLED === 'true' && IS_TEST_KEY.test(key) &&
    hook.length >= 16 && PRICE.test(priceId) && PRODUCT.test(productId) &&
    SHA.test(digest) && digest === SMARTCLIP_PINNED_SHA256 && taxCode === SMARTCLIP_TEST_TAX_CODE &&
    env.SMARTCLIP_SANDBOX_TAX_ATTESTED === 'true' && Boolean(db && auth);
  const base = String(env.PUBLIC_BASE_URL || 'https://capital-ai.online').replace(/\/$/, '');

  async function stripe(path, body, idem) {
    const reply = await fetchImpl('https://api.stripe.com/v1' + path, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: 'Bearer ' + key,
        'Stripe-Version': '2026-11-18.endive',
        ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
        ...(idem ? { 'Idempotency-Key': idem } : {}),
      },
      ...(body ? { body } : {}),
      redirect: 'error', signal: AbortSignal.timeout(7000),
    });
    if (!reply.ok) throw Error('stripe_unavailable');
    return boundedJson(reply, 65536);
  }

  async function rpc(action, params = {}) {
    if (!db) throw Error('store_unavailable');
    const headers = { apikey: db.key, 'Content-Type': 'application/json' };
    if (db.key.startsWith('eyJ')) headers.Authorization = 'Bearer ' + db.key;
    const reply = await fetchImpl(db.origin + '/rest/v1/rpc/capital_ai_smartclip_sandbox', {
      method: 'POST', headers, body: JSON.stringify({ _action: action, ...params }),
      redirect: 'error', signal: AbortSignal.timeout(7000),
    });
    if (!reply.ok) throw Error('store_unavailable');
    return boundedJson(reply, 4096);
  }

  async function paymentReady() {
    const [tax, registrations, price, product] = await Promise.all([
      stripe('/tax/settings'),
      stripe('/tax/registrations?limit=100'),
      stripe('/prices/' + encodeURIComponent(priceId)),
      stripe('/products/' + encodeURIComponent(productId)),
    ]);
    // Provider-readback proof, not merely an enabled boolean or a nonzero tax amount.
    // A live tax registration never authorizes this isolated test-only checkout.
    // Missing, mixed-mode or incomplete provider readbacks fail closed.
    const isolatedRegistrations = registrations.has_more === false &&
      Array.isArray(registrations.data) &&
      registrations.data.every(x => x?.livemode === false);
    // Restrict this TEST pilot to a documented domestic standard VAT registration.
    // inbound_goods is physical-goods-only; small_seller is a distinct EU place-of-
    // supply regime and needs separate owner/legal confirmation before use here.
    // An active DE registration alone must not authorize digital software checkout.
    const collectingDE = isolatedRegistrations &&
      registrations.data.some(x => x?.country === 'DE' && x.status === 'active' &&
        x.country_options?.de?.type === 'standard' &&
        x.country_options?.de?.standard?.place_of_supply_scheme === 'standard');
    return tax.status === 'active' && tax.livemode === false && collectingDE &&
      price.id === priceId && price.livemode === false && price.active === true &&
      product.id === productId && product.livemode === false && product.active === true &&
      stripeObjectId(price.product) === productId &&
      stripeObjectId(product.default_price) === priceId &&
      price.type === 'one_time' && !price.recurring && price.currency === 'eur' &&
      price.unit_amount === FORM_PRICE_CENTS && price.tax_behavior === 'inclusive' &&
      product.tax_code === taxCode &&
      product.metadata?.sku === SMARTCLIP_SKU &&
      product.metadata?.release_sha256 === digest &&
      product.metadata?.license_version === SMARTCLIP_LICENSE;
  }

  async function authenticated(req, res, json) {
    const user = await auth?.verify?.(req, res);
    if (!user?.userId || !UUID.test(user.userId) || user.emailVerified !== true ||
      typeof user.email !== 'string' || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(user.email) ||
      user.email.length > 254) {
      json(res, 401, { error: 'authentication_required' }); return null;
    }
    return user;
  }

  async function grantFromProvider(sessionId) {
    if (!SID.test(sessionId)) return false;
    const session = await stripe('/checkout/sessions/' + encodeURIComponent(sessionId));
    const meta = session.metadata || {};
    if (session.id !== sessionId || session.livemode !== false ||
      session.status !== 'complete' || session.mode !== 'payment' ||
      session.payment_status !== 'paid' || session.currency !== 'eur' ||
      session.amount_subtotal !== FORM_PRICE_CENTS ||
      session.amount_total !== FORM_PRICE_CENTS || !UUID.test(session.client_reference_id || '') ||
      meta.channel !== 'homepage_sandbox' || meta.sku !== SMARTCLIP_SKU ||
      meta.release_sha256 !== digest || meta.release_id !== SMARTCLIP_RELEASE ||
      meta.license_version !== SMARTCLIP_LICENSE ||
      meta.user_id !== session.client_reference_id ||
      meta.license_accepted !== 'true' || meta.immediate_delivery_consent !== 'true' ||
      meta.withdrawal_loss_acknowledged !== 'true' ||
      session.automatic_tax?.enabled !== true || session.automatic_tax?.status !== 'complete' ||
      session.invoice_creation?.enabled !== true ||
      !PID.test(session.payment_intent || '')) return false;
    const [lines, intent] = await Promise.all([
      stripe('/checkout/sessions/' + encodeURIComponent(sessionId) + '/line_items?limit=2'),
      stripe('/payment_intents/' + encodeURIComponent(session.payment_intent)),
    ]);
    const line = lines.data?.[0];
    if (lines.has_more !== false || lines.data?.length !== 1 ||
      line?.quantity !== 1 || line?.amount_subtotal !== FORM_PRICE_CENTS ||
      line.price?.id !== priceId || line.price?.livemode !== false ||
      stripeObjectId(line.price?.product) !== productId ||
      line.price?.currency !== 'eur' || line.price?.unit_amount !== FORM_PRICE_CENTS ||
      line.price?.tax_behavior !== 'inclusive' || line.price?.recurring ||
      intent.id !== session.payment_intent || intent.livemode !== false ||
      intent.status !== 'succeeded' || intent.currency !== 'eur' ||
      intent.amount_received !== FORM_PRICE_CENTS || !CHARGE.test(intent.latest_charge || '') ||
      intent.metadata?.channel !== 'homepage_sandbox' ||
      intent.metadata?.sku !== SMARTCLIP_SKU || intent.metadata?.user_id !== meta.user_id ||
      intent.metadata?.release_sha256 !== digest) return false;
    const charge = await stripe('/charges/' + encodeURIComponent(intent.latest_charge));
    if (charge.id !== intent.latest_charge || charge.payment_intent !== intent.id ||
      charge.livemode !== false || charge.status !== 'succeeded' ||
      charge.currency !== 'eur' || charge.paid !== true || charge.refunded !== false ||
      charge.disputed !== false || charge.amount_refunded !== 0 ||
      charge.amount !== FORM_PRICE_CENTS) return false;
    // Checkout can complete before Stripe finalizes its paid invoice.
    // Return a retryable webhook error instead of acknowledging an unfulfilled sale.
    // An invoice flag or self-reported browser receipt is never sufficient.
    if (!INVOICE.test(stripeObjectId(session.invoice) || '') ||
        !CUSTOMER.test(stripeObjectId(session.customer) || '')) {
      throw Error('smartclip_invoice_pending');
    }
    const invoiceId = stripeObjectId(session.invoice);
    const invoice = await stripe('/invoices/' + encodeURIComponent(invoiceId));
    if (invoice.id !== invoiceId || invoice.livemode !== false ||
        stripeObjectId(invoice.customer) !== stripeObjectId(session.customer) ||
        invoice.currency !== 'eur' || invoice.total !== FORM_PRICE_CENTS ||
        invoice.amount_paid !== FORM_PRICE_CENTS || invoice.amount_remaining !== 0 ||
        invoice.paid_out_of_band !== false ||
        invoice.metadata?.sku !== SMARTCLIP_SKU ||
        invoice.metadata?.release_sha256 !== digest ||
        invoice.metadata?.license_version !== SMARTCLIP_LICENSE) return false;
    if (invoice.status !== 'paid' || invoice.paid !== true) {
      if (invoice.status === 'draft' || invoice.status === 'open') {
        throw Error('smartclip_invoice_pending');
      }
      return false;
    }
    const result = await rpc('grant', { _user_id: session.client_reference_id,
      _session_id: session.id, _payment_intent_id: intent.id, _release_sha256: digest });
    return result?.granted === true;
  }

  async function revokeFromProvider(chargeId) {
    if (!CHARGE.test(chargeId)) return false;
    const charge = await stripe('/charges/' + encodeURIComponent(chargeId));
    if (charge.id !== chargeId || charge.livemode !== false ||
      charge.currency !== 'eur' || charge.amount !== FORM_PRICE_CENTS ||
      !PID.test(charge.payment_intent || '')) return false;
    const intent = await stripe('/payment_intents/' + encodeURIComponent(charge.payment_intent));
    if (intent.id !== charge.payment_intent || intent.livemode !== false ||
      intent.metadata?.channel !== 'homepage_sandbox' ||
      intent.metadata?.sku !== SMARTCLIP_SKU ||
      intent.metadata?.release_sha256 !== digest ||
      !UUID.test(intent.metadata?.user_id || '')) return false;
    if (!(charge.disputed === true ||
      (Number.isInteger(charge.amount) && charge.amount > 0 &&
       Number.isInteger(charge.amount_refunded) && charge.amount_refunded >= charge.amount))) return false;
    const result = await rpc('revoke', { _payment_intent_id: intent.id,
      _release_sha256: digest, _reason: charge.disputed === true ? 'disputed' : 'refunded' });
    return result?.revoked === true;
  }

  return { async handle(req, res, url, json) {
    if (!url.pathname.startsWith('/api/billing/smartclip-sandbox/')) return false;
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    if (!configured) { json(res, 503, { error: 'smartclip_sandbox_unavailable' }); return true; }
    const action = url.pathname.slice('/api/billing/smartclip-sandbox/'.length);
    if (url.search) { json(res, 400, { error: 'invalid_request' }); return true; }
    if (action === 'webhook' && req.method === 'POST') {
      let event;
      try {
        const raw = await rawBody(req);
        if (!verifySmartclipWebhookSignature(raw, req.headers['stripe-signature'], hook)) {
          json(res, 400, { error: 'invalid_webhook_signature' }); return true;
        }
        event = JSON.parse(raw.toString('utf8'));
        if (event.livemode !== false || typeof event.type !== 'string' || typeof event.id !== 'string') {
          json(res, 400, { error: 'invalid_event' }); return true;
        }
      } catch { json(res, 400, { error: 'invalid_event' }); return true; }
      try {
        if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
          const id = event.data?.object?.id;
          if (!SID.test(id || '')) { json(res, 200, { received: true, ignored: true }); return true; }
          const granted = await grantFromProvider(id);
          // Unpaid, invalid or refunded events are ignored. Stripe can resend later success events.
          json(res, 200, { received: true, granted }); return true;
        }
        if (['charge.refunded', 'charge.dispute.created'].includes(event.type)) {
          const charge = event.type === 'charge.refunded' ? event.data?.object?.id : event.data?.object?.charge;
          if (!CHARGE.test(charge || '')) { json(res, 200, { received: true, ignored: true }); return true; }
          const revoked = await revokeFromProvider(charge);
          json(res, 200, { received: true, revoked }); return true;
        }
        json(res, 200, { received: true, ignored: true }); return true;
      } catch {
        json(res, 503, { error: 'fulfillment_unavailable' }); return true;
      }
    }
    if (!['checkout', 'access'].includes(action)) {
      json(res, 404, { error: 'not_found' }); return true;
    }
    if (req.method !== (action === 'checkout' ? 'POST' : 'GET')) {
      res.setHeader('Allow', action === 'checkout' ? 'POST' : 'GET');
      json(res, 405, { error: 'method_not_allowed' }); return true;
    }
    if (!auth?.sameOrigin?.(req)) { json(res, 403, { error: 'forbidden_origin' }); return true; }
    const user = await authenticated(req, res, json);
    if (!user) return true;
    if (action === 'access') {
      try {
        const state = await rpc('access', { _user_id: user.userId });
        json(res, 200, { entitled: state?.entitled === true, releaseSha256: state?.entitled === true ? digest : null });
      } catch { json(res, 503, { error: 'license_unavailable' }); }
      return true;
    }
    let body;
    try { body = await readJson(req, 1024); } catch { json(res, 400, { error: 'invalid_request' }); return true; }
    if (!body || Object.keys(body).sort().join(',') !==
      'immediateDeliveryConsent,licenseAccepted,requestId,sku,withdrawalLossAcknowledged' ||
      body.sku !== SMARTCLIP_SKU || !REQ_ID.test(body.requestId || '') ||
      body.licenseAccepted !== true || body.immediateDeliveryConsent !== true ||
      body.withdrawalLossAcknowledged !== true) {
      json(res, 400, { error: 'invalid_checkout' }); return true;
    }
    try {
      if (!(await paymentReady())) { json(res, 503, { error: 'checkout_not_ready' }); return true; }
      const requestKey = createHash('sha256').update('smartclip-sandbox:' + user.userId +
        ':' + digest + ':' + body.requestId).digest('hex');
      const form = new URLSearchParams({
        mode: 'payment', 'line_items[0][price]': priceId, 'line_items[0][quantity]': '1',
        'automatic_tax[enabled]': 'true', billing_address_collection: 'required',
        'invoice_creation[enabled]': 'true',
        'invoice_creation[invoice_data][metadata][sku]': SMARTCLIP_SKU,
        'invoice_creation[invoice_data][metadata][release_sha256]': digest,
        'invoice_creation[invoice_data][metadata][license_version]': SMARTCLIP_LICENSE,
        client_reference_id: user.userId, customer_email: user.email,
        success_url: base + '/profile?smartclip=test-complete',
        cancel_url: base + '/profile?smartclip=test-cancelled',
        integration_identifier: 'capitalaisc' + letters(requestKey),
        'metadata[channel]': 'homepage_sandbox', 'metadata[sku]': SMARTCLIP_SKU,
        'metadata[user_id]': user.userId, 'metadata[release_id]': SMARTCLIP_RELEASE,
        'metadata[release_sha256]': digest, 'metadata[license_version]': SMARTCLIP_LICENSE,
        'metadata[license_accepted]': 'true',
        'metadata[immediate_delivery_consent]': 'true',
        'metadata[withdrawal_loss_acknowledged]': 'true',
        'payment_intent_data[metadata][channel]': 'homepage_sandbox',
        'payment_intent_data[metadata][sku]': SMARTCLIP_SKU,
        'payment_intent_data[metadata][user_id]': user.userId,
        'payment_intent_data[metadata][release_sha256]': digest,
      });
      const s = await stripe('/checkout/sessions', form.toString(), requestKey);
      if (!SID.test(s.id || '') || s.livemode !== false || s.mode !== 'payment' ||
          s.invoice_creation?.enabled !== true || !safeStripeUrl(s.url)) {
        throw Error('invalid_checkout_response');
      }
      json(res, 200, { checkoutUrl: s.url, testOnly: true });
    } catch { json(res, 503, { error: 'checkout_not_ready' }); }
    return true;
  } };
}
