import { pathToFileURL } from 'node:url';
import { BILLING_CATALOG } from '../server/billing-catalog.mjs';
import { boundedJson } from '../server/http-security.mjs';

export const STRIPE_TEST_TIERS = Object.freeze(['starter', 'pro', 'enterprise']);

const LIVE_PRICE_IDS = new Set(
  Object.values(BILLING_CATALOG.tiers).flatMap(tier => [tier.monthlyPriceId, tier.annualPriceId]),
);

function required(env, name) {
  const value = String(env[name] || '').trim();
  if (!value) throw new Error(`MISSING_${name}`);
  return value;
}

function testPriceEnvName(tier) {
  return `STRIPE_TEST_${tier.toUpperCase()}_PRICE_ID`;
}

function testSessionEnvName(tier) {
  return `STRIPE_TEST_${tier.toUpperCase()}_SESSION_ID`;
}

function assertTestSecret(secret) {
  if (!/^sk_test_[A-Za-z0-9_]+$/.test(secret)) throw new Error('STRIPE_TEST_SECRET_REQUIRED');
}

function assertUuid(value) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error('STRIPE_TEST_USER_ID_INVALID');
  }
}

export function resolveStripeTestPurchaseConfig(env = process.env) {
  const secret = required(env, 'STRIPE_TEST_SECRET_KEY');
  assertTestSecret(secret);
  const userId = required(env, 'STRIPE_TEST_USER_ID');
  assertUuid(userId);
  const returnBaseUrl = String(env.STRIPE_TEST_RETURN_BASE_URL || 'https://capital-ai.online').replace(/\/$/, '');
  if (!/^https:\/\//.test(returnBaseUrl)) throw new Error('STRIPE_TEST_RETURN_BASE_URL_INVALID');

  const prices = {};
  for (const tier of STRIPE_TEST_TIERS) {
    const priceId = required(env, testPriceEnvName(tier));
    if (!/^price_[A-Za-z0-9]+$/.test(priceId)) throw new Error(`STRIPE_TEST_PRICE_ID_INVALID_${tier.toUpperCase()}`);
    if (LIVE_PRICE_IDS.has(priceId)) throw new Error(`LIVE_PRICE_ID_FORBIDDEN_IN_TEST_${tier.toUpperCase()}`);
    prices[tier] = priceId;
  }
  if (new Set(Object.values(prices)).size !== STRIPE_TEST_TIERS.length) {
    throw new Error('STRIPE_TEST_PRICE_IDS_MUST_BE_DISTINCT');
  }

  return { secret, userId, returnBaseUrl, prices };
}

export async function createStripeTestCheckoutSessions({ env = process.env, fetchImpl = fetch } = {}) {
  const config = resolveStripeTestPurchaseConfig(env);
  const sessions = [];
  for (const tier of STRIPE_TEST_TIERS) {
    const planId = tier.toUpperCase();
    const form = new URLSearchParams({
      mode: 'subscription',
      'line_items[0][price]': config.prices[tier],
      'line_items[0][quantity]': '1',
      success_url: `${config.returnBaseUrl}/profile?subscription=test-success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.returnBaseUrl}/pricing?subscription=test-cancelled`,
      client_reference_id: config.userId,
      'metadata[user_id]': config.userId,
      'metadata[plan_id]': planId,
      'metadata[billing_cycle]': 'monthly',
      'metadata[test_matrix]': 'CAPITAL_AI_STRIPE_3_PURCHASES@1',
      'subscription_data[metadata][user_id]': config.userId,
      'subscription_data[metadata][plan_id]': planId,
      'subscription_data[metadata][billing_cycle]': 'monthly',
      'subscription_data[metadata][test_matrix]': 'CAPITAL_AI_STRIPE_3_PURCHASES@1',
    });
    const response = await fetchImpl('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.secret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
      redirect: 'error',
      signal: AbortSignal.timeout(7000),
    });
    const payload = await boundedJson(response);
    if (!response.ok || payload?.livemode === true || !/^cs_test_/.test(String(payload?.id || '')) ||
        typeof payload?.url !== 'string' || !payload.url.startsWith('https://checkout.stripe.com/')) {
      throw new Error(`STRIPE_TEST_SESSION_CREATE_FAILED_${planId}`);
    }
    sessions.push({ tier, sessionId: payload.id, url: payload.url });
  }
  return sessions;
}

export async function verifyStripeTestPurchases({ env = process.env, fetchImpl = fetch } = {}) {
  const config = resolveStripeTestPurchaseConfig(env);
  const verified = [];
  for (const tier of STRIPE_TEST_TIERS) {
    const sessionId = required(env, testSessionEnvName(tier));
    if (!/^cs_test_[A-Za-z0-9_]+$/.test(sessionId)) throw new Error(`STRIPE_TEST_SESSION_ID_INVALID_${tier.toUpperCase()}`);
    const response = await fetchImpl(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=subscription`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${config.secret}` },
        redirect: 'error',
        signal: AbortSignal.timeout(7000),
      },
    );
    const payload = await boundedJson(response);
    const planId = tier.toUpperCase();
    const metadata = payload?.metadata || {};
    const subscription = payload?.subscription;
    const subscriptionMetadata = typeof subscription === 'object' && subscription ? subscription.metadata || {} : {};
    if (!response.ok ||
        payload?.livemode !== false ||
        payload?.mode !== 'subscription' ||
        payload?.payment_status !== 'paid' ||
        metadata.user_id !== config.userId ||
        metadata.plan_id !== planId ||
        metadata.test_matrix !== 'CAPITAL_AI_STRIPE_3_PURCHASES@1' ||
        subscriptionMetadata.user_id !== config.userId ||
        subscriptionMetadata.plan_id !== planId ||
        subscriptionMetadata.test_matrix !== 'CAPITAL_AI_STRIPE_3_PURCHASES@1') {
      throw new Error(`STRIPE_TEST_PURCHASE_VERIFY_FAILED_${planId}`);
    }
    verified.push({
      tier,
      sessionId,
      paymentStatus: payload.payment_status,
      subscriptionId: typeof subscription === 'object' && subscription ? subscription.id : String(subscription || ''),
    });
  }
  return verified;
}

async function main() {
  const mode = process.argv[2];
  if (mode === '--create') {
    const sessions = await createStripeTestCheckoutSessions();
    process.stdout.write(JSON.stringify({
      schema: 'CAPITAL_AI_STRIPE_TEST_PURCHASE_SESSIONS@1',
      mode: 'test',
      count: sessions.length,
      sessions,
    }, null, 2) + '\n');
    return;
  }
  if (mode === '--verify') {
    const purchases = await verifyStripeTestPurchases();
    process.stdout.write(JSON.stringify({
      schema: 'CAPITAL_AI_STRIPE_TEST_PURCHASE_EVIDENCE@1',
      mode: 'test',
      count: purchases.length,
      purchases,
    }, null, 2) + '\n');
    return;
  }
  throw new Error('Usage: node scripts/stripe-three-purchase-e2e.mjs --create|--verify');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : 'STRIPE_TEST_PURCHASE_E2E_FAILED');
    process.exit(1);
  });
}
