import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createStripeTestCheckoutSessions,
  resolveStripeTestPurchaseConfig,
  verifyStripeTestPurchases,
} from './stripe-three-purchase-e2e.mjs';

const baseEnv = {
  STRIPE_TEST_SECRET_KEY: 'sk_test_capital_ai_example',
  STRIPE_TEST_USER_ID: '00000000-0000-4000-8000-000000000001',
  STRIPE_TEST_STARTER_PRICE_ID: 'price_testStarter123',
  STRIPE_TEST_PRO_PRICE_ID: 'price_testPro123',
  STRIPE_TEST_ENTERPRISE_PRICE_ID: 'price_testEnterprise123',
  STRIPE_TEST_RETURN_BASE_URL: 'https://capital-ai.online',
};

test('three-purchase config requires test secret and three distinct non-live Price IDs', () => {
  const config = resolveStripeTestPurchaseConfig(baseEnv);
  assert.deepEqual(Object.keys(config.prices), ['starter', 'pro', 'enterprise']);
  assert.throws(
    () => resolveStripeTestPurchaseConfig({ ...baseEnv, STRIPE_TEST_SECRET_KEY: 'sk_live_wrong' }),
    /STRIPE_TEST_SECRET_REQUIRED/,
  );
  assert.throws(
    () => resolveStripeTestPurchaseConfig({
      ...baseEnv,
      STRIPE_TEST_STARTER_PRICE_ID: 'price_1UMA4qPKr4joNbEcvJXFWw45',
    }),
    /LIVE_PRICE_ID_FORBIDDEN_IN_TEST_STARTER/,
  );
  assert.throws(
    () => resolveStripeTestPurchaseConfig({ ...baseEnv, STRIPE_TEST_PRO_PRICE_ID: 'price_testStarter123' }),
    /STRIPE_TEST_PRICE_IDS_MUST_BE_DISTINCT/,
  );
});

test('create mode creates exactly three test Checkout sessions with server-owned tier metadata', async () => {
  const calls = [];
  const sessions = await createStripeTestCheckoutSessions({
    env: baseEnv,
    fetchImpl: async (url, options) => {
      const form = new URLSearchParams(String(options.body));
      calls.push({
        url,
        auth: options.headers.Authorization,
        price: form.get('line_items[0][price]'),
        plan: form.get('metadata[plan_id]'),
        matrix: form.get('metadata[test_matrix]'),
      });
      return Response.json({
        id: `cs_test_${calls.length}`,
        url: `https://checkout.stripe.com/c/pay/test-${calls.length}`,
        livemode: false,
      });
    },
  });
  assert.equal(sessions.length, 3);
  assert.deepEqual(calls.map(call => call.plan), ['STARTER', 'PRO', 'ENTERPRISE']);
  assert.deepEqual(calls.map(call => call.price), [
    'price_testStarter123',
    'price_testPro123',
    'price_testEnterprise123',
  ]);
  assert.ok(calls.every(call => call.auth.startsWith('Bearer sk_test_')));
  assert.ok(calls.every(call => call.matrix === 'CAPITAL_AI_STRIPE_3_PURCHASES@1'));
});

test('verify mode accepts only three paid non-live subscription sessions bound to the test matrix', async () => {
  const env = {
    ...baseEnv,
    STRIPE_TEST_STARTER_SESSION_ID: 'cs_test_starter',
    STRIPE_TEST_PRO_SESSION_ID: 'cs_test_pro',
    STRIPE_TEST_ENTERPRISE_SESSION_ID: 'cs_test_enterprise',
  };
  const expected = {
    cs_test_starter: 'STARTER',
    cs_test_pro: 'PRO',
    cs_test_enterprise: 'ENTERPRISE',
  };
  const result = await verifyStripeTestPurchases({
    env,
    fetchImpl: async url => {
      const id = String(url).match(/sessions\/([^?]+)/)?.[1];
      const planId = expected[id];
      return Response.json({
        id,
        livemode: false,
        mode: 'subscription',
        payment_status: 'paid',
        metadata: {
          user_id: baseEnv.STRIPE_TEST_USER_ID,
          plan_id: planId,
          test_matrix: 'CAPITAL_AI_STRIPE_3_PURCHASES@1',
        },
        subscription: {
          id: `sub_test_${planId.toLowerCase()}`,
          metadata: {
            user_id: baseEnv.STRIPE_TEST_USER_ID,
            plan_id: planId,
            test_matrix: 'CAPITAL_AI_STRIPE_3_PURCHASES@1',
          },
        },
      });
    },
  });
  assert.equal(result.length, 3);
  assert.ok(result.every(item => item.paymentStatus === 'paid'));
});
