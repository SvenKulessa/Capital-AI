import { BILLING_CATALOG } from './billing-catalog.mjs';
import { boundedJson, readJson, secureUrl } from './http-security.mjs';

// This is an owner-only experiment boundary. It never changes public checkout,
// live Stripe prices, Supabase subscriptions, or real user entitlements.
const SKUS = Object.freeze([
  { id: 'starter-monthly', label: 'Starter · Monat', kind: 'subscription', livePriceId: BILLING_CATALOG.tiers.starter.monthlyPriceId, liveProductId: BILLING_CATALOG.tiers.starter.productId, interval: 'month' },
  { id: 'starter-annual', label: 'Starter · Jahr', kind: 'subscription', livePriceId: BILLING_CATALOG.tiers.starter.annualPriceId, liveProductId: BILLING_CATALOG.tiers.starter.productId, interval: 'year' },
  { id: 'pro-monthly', label: 'Pro · Monat', kind: 'subscription', livePriceId: BILLING_CATALOG.tiers.pro.monthlyPriceId, liveProductId: BILLING_CATALOG.tiers.pro.productId, interval: 'month' },
  { id: 'pro-annual', label: 'Pro · Jahr', kind: 'subscription', livePriceId: BILLING_CATALOG.tiers.pro.annualPriceId, liveProductId: BILLING_CATALOG.tiers.pro.productId, interval: 'year' },
  { id: 'enterprise-monthly', label: 'Enterprise · Monat', kind: 'subscription', livePriceId: BILLING_CATALOG.tiers.enterprise.monthlyPriceId, liveProductId: BILLING_CATALOG.tiers.enterprise.productId, interval: 'month' },
  { id: 'enterprise-annual', label: 'Enterprise · Jahr', kind: 'subscription', livePriceId: BILLING_CATALOG.tiers.enterprise.annualPriceId, liveProductId: BILLING_CATALOG.tiers.enterprise.productId, interval: 'year' },
  { id: 'vocabulary', label: 'Vocabulary · Einmalkauf', kind: 'payment', livePriceId: BILLING_CATALOG.addons.vocabulary.priceId, liveProductId: BILLING_CATALOG.addons.vocabulary.productId },
]);
const IDS = new Set(SKUS.map(item => item.id));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRICE_ID = /^price_[A-Za-z0-9]{12,100}$/;
const SESSION_ID = /^cs_test_[A-Za-z0-9_]{8,180}$/;
const INITIAL_REPLICAS = Object.freeze({
  'starter-monthly': 'price_1TnF2FPKr4joNbEczpUiGcAQ',
  'pro-monthly': 'price_1TnF4dPKr4joNbEcxVW7h7q9',
  'enterprise-monthly': 'price_1TnF3VPKr4joNbEcEzeQHxX1',
});
const plain = value => value && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys) => plain(value) &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const safeSelected = value => Array.isArray(value) && value.length <= SKUS.length &&
  value.every(item => typeof item === 'string' && IDS.has(item)) &&
  new Set(value).size === value.length;
const jsonError = message => { throw new Error(message); };

function configure(env) {
  try {
    const store = secureUrl(env.SUPABASE_URL || env.VITE_SUPABASE_URL);
    const origin = secureUrl(env.PUBLIC_BASE_URL || env.PUBLIC_APP_ORIGIN);
    const serviceRole = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (store.href !== store.origin + '/' || origin.href !== origin.origin + '/' ||
      serviceRole.length < 32 || !origin.hostname) return null;
    const testKey = String(env.STRIPE_TEST_SECRET_KEY || '');
    const liveKey = String(env.STRIPE_SECRET_KEY || '');
    return {
      store: store.origin, origin: origin.origin, serviceRole,
      testKey: /^(sk|rk)_test_[A-Za-z0-9]{8,}$/.test(testKey) ? testKey : null,
      liveKey: /^(sk|rk)_live_[A-Za-z0-9]{8,}$/.test(liveKey) ? liveKey : null,
    };
  } catch { return null; }
}

async function parse(response) {
  return boundedJson(response, 32768);
}
async function queryStore(fetchImpl, config, userId, row = null) {
  const url = new URL('/rest/v1/capital_ai_owner_product_lab', config.store);
  if (row) url.searchParams.set('on_conflict', 'owner_id');
  else {
    url.searchParams.set('owner_id', 'eq.' + userId);
    url.searchParams.set('select', 'owner_id,mode,selected_skus,replica_price_ids');
    url.searchParams.set('limit', '1');
  }
  const headers = {
    apikey: config.serviceRole, 'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (config.serviceRole.startsWith('eyJ')) headers.Authorization = 'Bearer ' + config.serviceRole;
  if (row) headers.Prefer = 'resolution=merge-duplicates,return=representation';
  const response = await fetchImpl(url, {
    method: row ? 'POST' : 'GET',
    headers, ...(row ? { body: JSON.stringify({ owner_id: userId, ...row }) } : {}),
    redirect: 'error', signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) jsonError('owner_testlab_storage_unavailable');
  const list = await parse(response);
  if (!Array.isArray(list) || list.length > 1) jsonError('owner_testlab_storage_contract');
  if (list.length && list[0].owner_id !== userId) jsonError('owner_testlab_identity_mismatch');
  return list[0] || null;
}
function normalize(row) {
  const mode = row?.mode === 'test' ? 'test' : 'production';
  const selected = safeSelected(row?.selected_skus) ? row.selected_skus : [];
  const replicas = plain(row?.replica_price_ids) ? row.replica_price_ids : {};
  return { mode, selected, replicas };
}
async function stripe(fetchImpl, key, path, form = null, idempotencyKey = null) {
  const response = await fetchImpl('https://api.stripe.com/v1/' + path, {
    method: form ? 'POST' : 'GET',
    headers: {
      Authorization: 'Bearer ' + key,
      ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    ...(form ? { body: form.toString() } : {}),
    redirect: 'error', signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) jsonError('stripe_testlab_unavailable');
  return parse(response);
}
function priceMatches(price, sku, mode, livePrice = null) {
  return price?.active === true && price?.livemode === mode &&
    price?.id && typeof price.id === 'string' && PRICE_ID.test(price.id) &&
    price.product === (mode ? sku.liveProductId : price.product) &&
    price.currency === 'eur' && Number.isInteger(price.unit_amount) &&
    price.unit_amount > 0 && price.billing_scheme === 'per_unit' &&
    (sku.kind === 'subscription' ? price.type === 'recurring' &&
      price.recurring?.interval === sku.interval : price.type === 'one_time') &&
    (!livePrice || price.unit_amount === livePrice.unit_amount);
}
function out(row, config) {
  const state = normalize(row);
  return {
    mode: state.mode, selected: state.selected,
    stripeTestConfigured: Boolean(config?.testKey), stripeLiveReadConfigured: Boolean(config?.liveKey),
    products: SKUS.map(item => ({
      id: item.id, label: item.label, kind: item.kind,
      replicaAvailable: PRICE_ID.test(state.replicas[item.id] || INITIAL_REPLICAS[item.id] || ''),
      selected: state.selected.includes(item.id),
    })),
    isolation: 'owner-only; production checkout and paid entitlements unchanged',
  };
}

export function createOwnerProductLab({ auth, env = process.env, fetchImpl = fetch } = {}) {
  const config = configure(env);
  async function handle(req, res, url, json) {
    const base = '/api/owner/product-lab';
    if (url.pathname !== base && !url.pathname.startsWith(base + '/')) return false;
    res.setHeader('Cache-Control', 'private, no-store');
    const route = url.pathname.slice(base.length);
    const actions = {
      'GET /': true, 'POST /configuration': true, 'POST /replica': true,
      'POST /checkout': true, 'GET /checkout-result': true,
    };
    if (!Object.hasOwn(actions, req.method + ' ' + (route || '/'))) {
      json(res, 405, { error: 'method_not_allowed' }); return true;
    }
    const user = await auth?.verify?.(req, res);
    if (!user?.userId || !UUID.test(user.userId)) {
      json(res, 401, { error: 'authentication_required' }); return true;
    }
    if (await auth?.authorizeIamRole?.(req, res, 'owner') !== true) {
      json(res, 403, { error: 'owner_required' }); return true;
    }
    if (req.method !== 'GET' && !auth?.sameOrigin?.(req)) {
      json(res, 403, { error: 'forbidden_origin' }); return true;
    }
    if (!config) { json(res, 503, { error: 'owner_testlab_storage_not_configured' }); return true; }
    try {
      const original = normalize(await queryStore(fetchImpl, config, user.userId));
      if (req.method === 'GET' && !route) {
        json(res, 200, out(original, config)); return true;
      }
      if (route === '/configuration' && req.method === 'POST') {
        const body = await readJson(req, 2048);
        if (!exactKeys(body, ['mode', 'selected']) ||
            !['production', 'test'].includes(body.mode) || !safeSelected(body.selected)) {
          json(res, 400, { error: 'invalid_testlab_configuration' }); return true;
        }
        const updated = await queryStore(fetchImpl, config, user.userId, {
          mode: body.mode, selected_skus: body.selected, replica_price_ids: original.replicas,
        });
        json(res, 200, out(updated, config)); return true;
      }
      if (route === '/replica' && req.method === 'POST') {
        const body = await readJson(req, 512);
        if (!exactKeys(body, ['sku']) || !IDS.has(body.sku)) {
          json(res, 400, { error: 'invalid_product' }); return true;
        }
        const sku = SKUS.find(item => item.id === body.sku);
        if (original.mode !== 'test' || !original.selected.includes(sku.id)) {
          json(res, 409, { error: 'test_mode_selection_required' }); return true;
        }
        if (!config.testKey || !config.liveKey) {
          json(res, 503, { error: 'stripe_test_keys_not_configured' }); return true;
        }
        if (PRICE_ID.test(original.replicas[sku.id] || INITIAL_REPLICAS[sku.id] || '')) {
          json(res, 200, out(original, config)); return true;
        }
        const originalPrice = await stripe(fetchImpl, config.liveKey,
          'prices/' + encodeURIComponent(sku.livePriceId));
        if (originalPrice.id !== sku.livePriceId || !priceMatches(originalPrice, sku, true)) {
          json(res, 502, { error: 'live_catalog_mismatch' }); return true;
        }
        const productForm = new URLSearchParams({
          name: 'CAPITAL-AI Test – ' + sku.label,
          'metadata[capital_ai_original_price_id]': sku.livePriceId,
          'metadata[capital_ai_testlab]': 'true',
        });
        const product = await stripe(fetchImpl, config.testKey, 'products', productForm,
          'capital-ai-ownerlab-product-v1-' + sku.id);
        if (product.livemode !== false || !/^prod_[A-Za-z0-9]{8,100}$/.test(product.id || '')) {
          json(res, 502, { error: 'stripe_test_product_mismatch' }); return true;
        }
        const priceForm = new URLSearchParams({
          product: product.id, currency: 'eur', unit_amount: String(originalPrice.unit_amount),
          'metadata[capital_ai_original_price_id]': sku.livePriceId,
          'metadata[capital_ai_testlab]': 'true',
        });
        if (sku.kind === 'subscription') priceForm.set('recurring[interval]', sku.interval);
        const clone = await stripe(fetchImpl, config.testKey, 'prices', priceForm,
          'capital-ai-ownerlab-price-v1-' + sku.id);
        if (!priceMatches(clone, sku, false, originalPrice)) {
          json(res, 502, { error: 'stripe_test_price_mismatch' }); return true;
        }
        const next = await queryStore(fetchImpl, config, user.userId, {
          mode: original.mode, selected_skus: original.selected,
          replica_price_ids: { ...original.replicas, [sku.id]: clone.id },
        });
        json(res, 200, out(next, config)); return true;
      }
      if (route === '/checkout' && req.method === 'POST') {
        const body = await readJson(req, 512);
        if (!exactKeys(body, ['sku']) || !IDS.has(body.sku)) {
          json(res, 400, { error: 'invalid_product' }); return true;
        }
        const sku = SKUS.find(item => item.id === body.sku);
        if (original.mode !== 'test' || !original.selected.includes(sku.id)) {
          json(res, 409, { error: 'test_mode_selection_required' }); return true;
        }
        if (!config.testKey) {
          json(res, 503, { error: 'stripe_test_keys_not_configured' }); return true;
        }
        const testPriceId = original.replicas[sku.id] || INITIAL_REPLICAS[sku.id];
        if (!PRICE_ID.test(testPriceId || '')) {
          json(res, 409, { error: 'test_replica_missing' }); return true;
        }
        const testPrice = await stripe(fetchImpl, config.testKey,
          'prices/' + encodeURIComponent(testPriceId));
        const livePrice = config.liveKey ? await stripe(fetchImpl, config.liveKey,
          'prices/' + encodeURIComponent(sku.livePriceId)) : null;
        // Never sell stale, inactive or price-mismatched test replicas.
        if (!livePrice || livePrice.id !== sku.livePriceId ||
            !priceMatches(livePrice, sku, true) ||
            testPrice.id !== testPriceId || !priceMatches(testPrice, sku, false, livePrice)) {
          json(res, 502, { error: 'test_replica_price_mismatch' }); return true;
        }
        const form = new URLSearchParams({
          mode: sku.kind, client_reference_id: user.userId,
          'line_items[0][price]': testPriceId, 'line_items[0][quantity]': '1',
          success_url: config.origin + '/profile?testlab=success&session_id={CHECKOUT_SESSION_ID}',
          cancel_url: config.origin + '/profile?testlab=cancelled',
          'metadata[capital_ai_owner_testlab]': 'true',
          'metadata[user_id]': user.userId, 'metadata[sku]': sku.id,
        });
        if (sku.kind === 'subscription') {
          form.set('subscription_data[metadata][capital_ai_owner_testlab]', 'true');
          form.set('subscription_data[metadata][user_id]', user.userId);
          form.set('subscription_data[metadata][sku]', sku.id);
        }
        const session = await stripe(fetchImpl, config.testKey, 'checkout/sessions', form);
        const redirect = new URL(String(session.url || ''));
        if (session.livemode !== false ||
          redirect.protocol !== 'https:' || redirect.hostname !== 'checkout.stripe.com' ||
          !SESSION_ID.test(session.id || '')) {
          json(res, 502, { error: 'stripe_test_checkout_mismatch' }); return true;
        }
        json(res, 200, { url: redirect.href, sessionId: session.id, mode: 'test' }); return true;
      }
      if (route === '/checkout-result' && req.method === 'GET') {
        const sid = url.searchParams.get('session_id') || '';
        if (!SESSION_ID.test(sid)) {
          json(res, 400, { error: 'invalid_session_id' }); return true;
        }
        if (!config.testKey) {
          json(res, 503, { error: 'stripe_test_keys_not_configured' }); return true;
        }
        const session = await stripe(fetchImpl, config.testKey,
          'checkout/sessions/' + encodeURIComponent(sid));
        if (session.id !== sid || session.livemode !== false ||
            session.client_reference_id !== user.userId ||
            session.metadata?.user_id !== user.userId ||
            session.metadata?.capital_ai_owner_testlab !== 'true' ||
            !IDS.has(session.metadata?.sku)) {
          json(res, 403, { error: 'not_your_test_session' }); return true;
        }
        json(res, 200, {
          mode: 'test', sku: session.metadata.sku,
          completed: session.status === 'complete' &&
            ['paid', 'no_payment_required'].includes(session.payment_status),
          status: session.status === 'complete' ? 'complete' : 'incomplete',
          productionEntitlementGranted: false,
        }); return true;
      }
      json(res, 405, { error: 'method_not_allowed' });
    } catch {
      json(res, 503, { error: 'owner_testlab_upstream_unavailable' });
    }
    return true;
  }
  return { handle };
}
export { SKUS };
