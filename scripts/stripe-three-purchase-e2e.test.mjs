import test from 'node:test';
import assert from 'node:assert/strict';
import { BILLING_CATALOG } from '../server/billing-catalog.mjs';
import { BENCHMARK_TIERS } from '../packages/benchmark-core/index.mjs';
import { STRIPE_TEST_VARIANTS, createStripeTestCheckoutSessions, resolveStripeTestPurchaseConfig, verifyStripeTestPurchases } from './stripe-three-purchase-e2e.mjs';
const env = { STRIPE_TEST_SECRET_KEY: 'sk_test_example', STRIPE_TEST_RETURN_BASE_URL: 'https://stripe-staging.example',
  STRIPE_TEST_SUPABASE_URL: 'https://stripe-db-test.example', STRIPE_TEST_SUPABASE_READ_KEY: 'fixture-read-key' };
for (const [i, v] of STRIPE_TEST_VARIANTS.entries()) {
  const prefix = `STRIPE_TEST_${v.key.toUpperCase()}`;
  Object.assign(env, { [`${prefix}_PRICE_ID`]: `price_fixture${i}`, [`${prefix}_USER_ID`]: `00000000-0000-4000-8000-00000000000${i + 1}`,
    [`${prefix}_SESSION_ID`]: `cs_test_fixture${i}`, [`${prefix}_EVENT_ID`]: `evt_fixture${i}`, [`${prefix}_COOKIE`]: `fixture-cookie-${i}` });
}
const cases = resolveStripeTestPurchaseConfig(env).variants;
function harness(mutator = () => {}) {
  const calls = [];
  const fetchImpl = async (input, options = {}) => {
    const url = new URL(input); calls.push({ url, options });
    let kind, v, data;
    if (url.pathname.startsWith('/v1/prices/')) {
      kind = 'price'; v = cases.find(c => url.pathname.endsWith(c.priceId));
      data = { id: v.priceId, livemode: false, active: true, currency: 'eur', recurring: { interval: v.cycle === 'annual' ? 'year' : 'month', interval_count: 1 } };
    } else if (options.method === 'POST') {
      kind = 'create'; const form = new URLSearchParams(options.body); v = cases.find(c => c.priceId === form.get('line_items[0][price]'));
      data = { id: `cs_test_${v.key}`, livemode: false, url: `https://checkout.stripe.com/c/pay/${v.key}` };
    } else if (url.pathname.startsWith('/v1/checkout/sessions/')) {
      kind = 'session'; v = cases.find(c => url.pathname.endsWith(env[`STRIPE_TEST_${c.key.toUpperCase()}_SESSION_ID`]));
      const metadata = { user_id: v.userId, plan_id: v.tier.toUpperCase(), billing_cycle: v.cycle, test_matrix: 'CAPITAL_AI_STRIPE_6_PURCHASES@1' };
      data = { id: env[`STRIPE_TEST_${v.key.toUpperCase()}_SESSION_ID`], client_reference_id: v.userId, livemode: false, mode: 'subscription', status: 'complete', payment_status: 'paid', metadata,
        subscription: { id: `sub_${v.key.replace('_', '')}`, livemode: false, status: 'active', metadata: { ...metadata }, items: { data: [{ price: { id: v.priceId } }] } } };
    } else if (url.pathname.startsWith('/v1/events/')) {
      kind = 'event'; v = cases.find(c => url.pathname.endsWith(env[`STRIPE_TEST_${c.key.toUpperCase()}_EVENT_ID`]));
      data = { id: env[`STRIPE_TEST_${v.key.toUpperCase()}_EVENT_ID`], type: 'customer.subscription.created', livemode: false,
        data: { object: { id: `sub_${v.key.replace('_', '')}`, metadata: { user_id: v.userId, plan_id: v.tier.toUpperCase(), billing_cycle: v.cycle, test_matrix: 'CAPITAL_AI_STRIPE_6_PURCHASES@1' } } } };
    } else if (url.pathname.endsWith('/stripe_event_inbox')) {
      kind = 'receipt'; v = cases.find(c => url.searchParams.get('event_id').endsWith(env[`STRIPE_TEST_${c.key.toUpperCase()}_EVENT_ID`]));
      data = [{ event_id: env[`STRIPE_TEST_${v.key.toUpperCase()}_EVENT_ID`], event_type: 'customer.subscription.created', livemode: false, status: 'processed', processed_at: '2026-10-09T11:00:00Z' }];
    } else if (url.pathname.endsWith('/subscriptions')) {
      kind = 'projection'; v = cases.find(c => url.searchParams.get('user_id') === `eq.${c.userId}`);
      data = [{ user_id: v.userId, stripe_subscription_id: `sub_${v.key.replace('_', '')}`, tier: v.tier, status: 'active' }];
    } else if (url.pathname === '/api/auth/session') {
      kind = 'identity'; v = cases.find(c => options.headers.Cookie === env[`STRIPE_TEST_${c.key.toUpperCase()}_COOKIE`]);
      data = { authenticated: true, mfaRequired: false, user: { id: v.userId } };
    } else if (options.headers?.Cookie) {
      kind = 'access'; v = cases.find(c => options.headers.Cookie === env[`STRIPE_TEST_${c.key.toUpperCase()}_COOKIE`]);
      data = { schema: 'CAPITAL_AI_CADS_ENTITLEMENT@2', tier: v.tier, websiteEntitlement: true, marketplaceEntitlement: false,
        billingAuthority: 'STRIPE_SUBSCRIPTION', capabilities: { ...BENCHMARK_TIERS[v.tier].capabilities } };
    } else {
      return Response.json({ error: 'authentication_required' }, { status: 401 });
    }
    mutator(kind, data, v);
    return Response.json(data);
  };
  return { calls, fetchImpl };
}
test('all six cycles are preflighted before any session; retries reuse idempotency keys', async () => {
  const h = harness();
  assert.equal((await createStripeTestCheckoutSessions({ env, fetchImpl: h.fetchImpl })).length, 6);
  assert.ok(h.calls.slice(0, 6).every(c => c.url.pathname.startsWith('/v1/prices/')));
  const posts = h.calls.filter(c => c.options.method === 'POST');
  assert.equal(new Set(posts.map(c => c.options.headers['Idempotency-Key'])).size, 6);
  assert.deepEqual(posts.map(c => new URLSearchParams(c.options.body).get('metadata[billing_cycle]')), ['monthly','annual','monthly','annual','monthly','annual']);
  await createStripeTestCheckoutSessions({ env, fetchImpl: h.fetchImpl });
  assert.deepEqual(h.calls.filter(c => c.options.method === 'POST').slice(6).map(c => c.options.headers['Idempotency-Key']), posts.map(c => c.options.headers['Idempotency-Key']));
});
test('six distinct users and prices; production origins and live keys rejected', () => {
  for (const overrides of [
    { STRIPE_TEST_SECRET_KEY: 'sk_live_wrong' }, { STRIPE_TEST_RETURN_BASE_URL: 'https://capital-ai.online' },
    { STRIPE_TEST_PRO_ANNUAL_USER_ID: env.STRIPE_TEST_STARTER_MONTHLY_USER_ID },
    { STRIPE_TEST_PRO_ANNUAL_PRICE_ID: env.STRIPE_TEST_STARTER_MONTHLY_PRICE_ID },
    { STRIPE_TEST_PRO_ANNUAL_PRICE_ID: BILLING_CATALOG.tiers.pro.annualPriceId },
  ]) assert.throws(() => resolveStripeTestPurchaseConfig({ ...env, ...overrides }));
});
test('a bad sixth price prevents every POST', async () => {
  const h = harness((kind, p, v) => { if (kind === 'price' && v.key === 'enterprise_annual') p.livemode = true; });
  await assert.rejects(createStripeTestCheckoutSessions({ env, fetchImpl: h.fetchImpl }), /MODE_OR_CYCLE/);
  assert.equal(h.calls.filter(c => c.options.method === 'POST').length, 0);
});
test('six complete evidence chains use GET only and omit cookies/keys from results', async () => {
  const h = harness(); const results = await verifyStripeTestPurchases({ env, fetchImpl: h.fetchImpl });
  assert.equal(results.length, 6);
  assert.ok(h.calls.every(c => !c.options.method || c.options.method === 'GET'));
  assert.ok(results.every(r => r.access === 'VERIFIED' && r.productionEvidence === 'NOT_PROVEN'));
  assert.equal(JSON.stringify(results).includes('fixture-cookie'), false);
  assert.equal(JSON.stringify(results).includes('fixture-read-key'), false);
});
for (const [name, mutate] of [
  ['live subscription', (k,p) => { if (k === 'session') p.subscription.livemode = true; }],
  ['wrong price', (k,p) => { if (k === 'session') p.subscription.items.data[0].price.id = 'price_wrong'; }],
  ['wrong billing cycle', (k,p) => { if (k === 'session') p.subscription.metadata.billing_cycle = 'wrong'; }],
  ['unpaid checkout', (k,p) => { if (k === 'session') p.payment_status = 'unpaid'; }],
  ['wrong event subscription', (k,p) => { if (k === 'event') p.data.object.id = 'sub_wrong'; }],
  ['missing processed receipt', (k,p) => { if (k === 'receipt') p[0].status = 'pending'; }],
  ['wrong session user', (k,p) => { if (k === 'identity') p.user.id = 'foreign-user'; }],
  ['wrong projected user', (k,p) => { if (k === 'projection') p[0].user_id = 'foreign-user'; }],
  ['duplicate projected entitlement', (k,p) => { if (k === 'projection') p.push({ ...p[0] }); }],
  ['marketplace masking Stripe', (k,p) => { if (k === 'access') p.marketplaceEntitlement = true; }],
  ['wrong capability', (k,p) => { if (k === 'access') p.capabilities = {}; }],
]) test(`evidence fails closed: ${name}`, async () => {
  const h = harness(mutate); await assert.rejects(verifyStripeTestPurchases({ env, fetchImpl: h.fetchImpl }));
});
