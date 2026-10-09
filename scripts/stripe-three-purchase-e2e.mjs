// Historical filename retained for existing npm/CI entry points; matrix is now six variants.
import { pathToFileURL } from 'node:url';
import { BILLING_CATALOG } from '../server/billing-catalog.mjs';
import { boundedJson } from '../server/http-security.mjs';
import { BENCHMARK_TIERS } from '../packages/benchmark-core/index.mjs';

export const STRIPE_TEST_TIERS = Object.freeze(['starter', 'pro', 'enterprise']);
export const STRIPE_TEST_VARIANTS = Object.freeze(STRIPE_TEST_TIERS.flatMap(tier =>
  ['monthly', 'annual'].map(cycle => Object.freeze({ tier, cycle, key: `${tier}_${cycle}` }))));
const MATRIX = 'CAPITAL_AI_STRIPE_6_PURCHASES@1';
const LIVE_IDS = new Set(Object.values(BILLING_CATALOG.tiers).flatMap(t => [t.monthlyPriceId, t.annualPriceId]));
const required = (env, name) => {
  const value = String(env[name] || '').trim();
  if (!value) throw new Error(`MISSING_${name}`);
  return value;
};
const field = (variant, suffix) => `STRIPE_TEST_${variant.key.toUpperCase()}_${suffix}`;
const check = (condition, code) => { if (!condition) throw new Error(code); };
function isolatedUrl(value) {
  const url = new URL(value);
  check(url.protocol === 'https:' && !url.username && !url.password &&
    !['capital-ai.online', 'www.capital-ai.online', 'ryzywoktpmyhwzxmstyu.supabase.co'].includes(url.hostname) &&
    url.pathname === '/' && !url.search && !url.hash, 'ISOLATED_TEST_ORIGIN_REQUIRED');
  return url.origin;
}
export function resolveStripeTestPurchaseConfig(env = process.env) {
  const secret = required(env, 'STRIPE_TEST_SECRET_KEY');
  check(/^sk_test_[A-Za-z0-9_]+$/.test(secret), 'STRIPE_TEST_SECRET_REQUIRED');
  const returnBaseUrl = isolatedUrl(required(env, 'STRIPE_TEST_RETURN_BASE_URL'));
  const variants = STRIPE_TEST_VARIANTS.map(v => {
    const priceId = required(env, field(v, 'PRICE_ID'));
    const userId = required(env, field(v, 'USER_ID'));
    check(/^price_[A-Za-z0-9]+$/.test(priceId) && !LIVE_IDS.has(priceId), `TEST_PRICE_REQUIRED_${v.key}`);
    check(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId), 'STRIPE_TEST_USER_ID_INVALID');
    return { ...v, priceId, userId };
  });
  check(new Set(variants.map(v => v.priceId)).size === 6, 'SIX_DISTINCT_TEST_PRICES_REQUIRED');
  check(new Set(variants.map(v => v.userId.toLowerCase())).size === 6, 'SIX_DISTINCT_TEST_USERS_REQUIRED');
  return { secret, returnBaseUrl, variants };
}
async function request(fetchImpl, url, options = {}) {
  const response = await fetchImpl(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(7000) });
  const payload = await boundedJson(response);
  check(response.ok, 'EVIDENCE_READ_OR_CREATE_FAILED');
  return payload;
}
const stripeHeaders = secret => ({ Authorization: `Bearer ${secret}` });
async function verifyPrices(config, fetchImpl) {
  // Preflight every variant before creating ANY session.
  for (const v of config.variants) {
    const p = await request(fetchImpl, `https://api.stripe.com/v1/prices/${v.priceId}`, { headers: stripeHeaders(config.secret) });
    check(p.id === v.priceId && p.livemode === false && p.active === true && p.currency === 'eur' &&
      p.recurring?.interval === (v.cycle === 'annual' ? 'year' : 'month') && p.recurring?.interval_count === 1,
    `TEST_PRICE_MODE_OR_CYCLE_MISMATCH_${v.key}`);
  }
}
export async function createStripeTestCheckoutSessions({ env = process.env, fetchImpl = fetch } = {}) {
  const config = resolveStripeTestPurchaseConfig(env);
  await verifyPrices(config, fetchImpl);
  const sessions = [];
  for (const v of config.variants) {
    const form = new URLSearchParams({ mode: 'subscription', 'line_items[0][price]': v.priceId,
      'line_items[0][quantity]': '1', success_url: `${config.returnBaseUrl}/profile?subscription=test-success`,
      cancel_url: `${config.returnBaseUrl}/pricing?subscription=test-cancelled`, client_reference_id: v.userId });
    for (const prefix of ['metadata', 'subscription_data[metadata]']) {
      for (const [key, value] of Object.entries({ user_id: v.userId, plan_id: v.tier.toUpperCase(), billing_cycle: v.cycle, test_matrix: MATRIX })) {
        form.set(`${prefix}[${key}]`, value);
      }
    }
    const p = await request(fetchImpl, 'https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST', headers: { ...stripeHeaders(config.secret), 'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': `capital-ai-six-${v.key}-${v.userId}` }, body: form });
    check(p.livemode === false && /^cs_test_[A-Za-z0-9_]+$/.test(p.id) &&
      typeof p.url === 'string' && new URL(p.url).origin === 'https://checkout.stripe.com', `TEST_SESSION_REJECTED_${v.key}`);
    sessions.push({ variant: v.key, sessionId: p.id, url: p.url });
  }
  return sessions;
}
export async function verifyStripeTestPurchases({ env = process.env, fetchImpl = fetch } = {}) {
  const config = resolveStripeTestPurchaseConfig(env);
  const dbOrigin = isolatedUrl(required(env, 'STRIPE_TEST_SUPABASE_URL'));
  const dbKey = required(env, 'STRIPE_TEST_SUPABASE_READ_KEY');
  const cases = config.variants.map(v => {
    const sessionId = required(env, field(v, 'SESSION_ID'));
    const eventId = required(env, field(v, 'EVENT_ID'));
    check(/^cs_test_[A-Za-z0-9_]+$/.test(sessionId) && /^evt_[A-Za-z0-9]+$/.test(eventId), 'TEST_EVIDENCE_ID_INVALID');
    return { ...v, sessionId, eventId, cookie: required(env, field(v, 'COOKIE')) };
  });
  check(new Set(cases.map(v => v.sessionId)).size === 6 && new Set(cases.map(v => v.eventId)).size === 6,
    'DISTINCT_SESSION_AND_EVENT_EVIDENCE_REQUIRED');
  await verifyPrices(config, fetchImpl);
  const purchases = [];
  for (const v of cases) {
    const session = await request(fetchImpl, `https://api.stripe.com/v1/checkout/sessions/${v.sessionId}?expand[]=subscription`, { headers: stripeHeaders(config.secret) });
    const sub = session.subscription;
    const bound = metadata => metadata?.user_id === v.userId && metadata?.plan_id === v.tier.toUpperCase() &&
      metadata?.billing_cycle === v.cycle && metadata?.test_matrix === MATRIX;
    check(session.id === v.sessionId && session.livemode === false && session.mode === 'subscription' &&
      session.status === 'complete' && session.payment_status === 'paid' && session.client_reference_id === v.userId && bound(session.metadata) &&
      sub?.livemode === false && /^sub_[A-Za-z0-9]+$/.test(sub.id) && ['active', 'trialing'].includes(sub.status) && bound(sub.metadata) &&
      sub.items?.data?.length === 1 && sub.items.data[0].price?.id === v.priceId, `PURCHASE_BINDING_FAILED_${v.key}`);
    const event = await request(fetchImpl, `https://api.stripe.com/v1/events/${v.eventId}`, { headers: stripeHeaders(config.secret) });
    check(event.id === v.eventId && event.livemode === false && event.type === 'customer.subscription.created' &&
      event.data?.object?.id === sub.id && bound(event.data.object.metadata), `EVENT_BINDING_FAILED_${v.key}`);
    const dbRead = async (table, params) => {
      const url = new URL(`/rest/v1/${table}`, dbOrigin);
      for (const [k, val] of Object.entries(params)) url.searchParams.set(k, val);
      return request(fetchImpl, url, { headers: { apikey: dbKey, Authorization: `Bearer ${dbKey}` } });
    };
    const receipts = await dbRead('stripe_event_inbox', { select: 'event_id,event_type,livemode,status,processed_at', event_id: `eq.${v.eventId}` });
    check(Array.isArray(receipts) && receipts.length === 1 && receipts[0].event_id === v.eventId &&
      receipts[0].event_type === event.type && receipts[0].livemode === false && receipts[0].status === 'processed' &&
      Number.isFinite(Date.parse(receipts[0].processed_at)), `WEBHOOK_RECEIPT_NOT_PROVEN_${v.key}`);
    const rows = await dbRead('subscriptions', { select: 'user_id,stripe_subscription_id,tier,status', user_id: `eq.${v.userId}` });
    check(Array.isArray(rows) && rows.length === 1 && rows[0].user_id === v.userId &&
      rows[0].stripe_subscription_id === sub.id && rows[0].tier.toLowerCase() === v.tier && rows[0].status === sub.status,
    `ENTITLEMENT_NOT_PROVEN_${v.key}`);
    const identity = await request(fetchImpl, `${config.returnBaseUrl}/api/auth/session`, { headers: { Cookie: v.cookie } });
    check(identity.authenticated === true && identity.mfaRequired === false && identity.user?.id === v.userId, `SESSION_IDENTITY_NOT_PROVEN_${v.key}`);
    const access = await request(fetchImpl, `${config.returnBaseUrl}/api/cads/commerce/entitlement`, { headers: { Cookie: v.cookie } });
    check(access.schema === 'CAPITAL_AI_CADS_ENTITLEMENT@2' && access.tier === v.tier && access.websiteEntitlement === true &&
      access.marketplaceEntitlement === false && access.billingAuthority === 'STRIPE_SUBSCRIPTION' &&
      Object.entries(BENCHMARK_TIERS[v.tier].capabilities).every(([k, val]) => access.capabilities?.[k] === val),
    `ACCESS_NOT_PROVEN_${v.key}`);
    const denied = await fetchImpl(`${config.returnBaseUrl}/api/cads/commerce/entitlement`, { redirect: 'error', signal: AbortSignal.timeout(7000) });
    check(denied.status === 401, `ANONYMOUS_DENIAL_NOT_PROVEN_${v.key}`);
    const denial = await boundedJson(new Response(denied.body, { status: 200 }));
    check(denial?.error === 'authentication_required', `ANONYMOUS_DENIAL_NOT_PROVEN_${v.key}`);
    purchases.push({ variant: v.key, sessionId: v.sessionId, subscriptionId: sub.id, eventId: v.eventId,
      checkout: 'VERIFIED', webhook: 'VERIFIED', entitlement: 'VERIFIED', access: 'VERIFIED', anonymousDenied: 'VERIFIED',
      accessAuthority: 'auth.resolvePaidTier (no subscription Access-RPC)', mode: 'test', productionEvidence: 'NOT_PROVEN' });
  }
  return purchases;
}
async function main() {
  const mode = process.argv[2];
  check(['--create', '--verify'].includes(mode), 'Usage: --create|--verify');
  const results = mode === '--create' ? await createStripeTestCheckoutSessions() : await verifyStripeTestPurchases();
  process.stdout.write(JSON.stringify({ schema: MATRIX, mode: 'test', count: results.length, results }, null, 2) + '\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(/^[A-Z][A-Za-z0-9_]+$/.test(error?.message || '') ? error.message : 'STRIPE_SIX_VARIANT_EVIDENCE_FAILED');
    process.exitCode = 1;
  });
}
